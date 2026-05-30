export interface SmtpConfig {
  host: string
  port: number
  username: string
  password: string
  from_email: string
  from_name?: string
  secure?: boolean
}

export interface IdentityOverride {
  from_email?: string
  from_name?: string
  reply_to?: string
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export function cleanHeader(value: string) {
  return String(value || '').replace(/[\r\n]+/g, ' ').trim()
}

function dotStuff(value: string) {
  return String(value || '').replace(/\r?\n\./g, '\r\n..')
}

async function readSmtpResponse(conn: Deno.Conn): Promise<{ code: number; text: string }> {
  const chunks: string[] = []
  const buf = new Uint8Array(2048)
  while (true) {
    const n = await conn.read(buf)
    if (n === null) throw new Error('SMTP connection closed unexpectedly')
    chunks.push(decoder.decode(buf.subarray(0, n)))
    const text = chunks.join('')
    const lines = text.split(/\r?\n/).filter(Boolean)
    const last = lines[lines.length - 1] || ''
    const match = last.match(/^(\d{3})\s/)
    if (match) return { code: Number(match[1]), text: lines.join('\n') }
  }
}

async function writeSmtpCommand(conn: Deno.Conn, command: string) {
  await conn.write(encoder.encode(`${command}\r\n`))
}

async function expectSmtp(conn: Deno.Conn, expected: number | number[], label: string) {
  const res = await readSmtpResponse(conn)
  const ok = Array.isArray(expected) ? expected.includes(res.code) : res.code === expected
  if (!ok) throw new Error(`${label} failed: ${res.text}`)
  return res
}

export async function smtpCommand(conn: Deno.Conn, command: string, expected: number | number[], label: string) {
  await writeSmtpCommand(conn, command)
  return expectSmtp(conn, expected, label)
}

export async function openSmtpConnection(cfg: SmtpConfig): Promise<Deno.Conn> {
  let conn: Deno.Conn = cfg.secure
    ? await Deno.connectTls({ hostname: cfg.host, port: cfg.port })
    : await Deno.connect({ hostname: cfg.host, port: cfg.port })

  try {
    await expectSmtp(conn, 220, 'SMTP greeting')
    const ehlo = await smtpCommand(conn, `EHLO ${cfg.host}`, 250, 'SMTP EHLO')
    const supportsStartTls = /(^|\n)250[-\s]STARTTLS\b/i.test(ehlo.text)

    if (!cfg.secure && supportsStartTls) {
      await smtpCommand(conn, 'STARTTLS', 220, 'SMTP STARTTLS')
      conn = await Deno.startTls(conn, { hostname: cfg.host })
      await smtpCommand(conn, `EHLO ${cfg.host}`, 250, 'SMTP secure EHLO')
    }

    if (cfg.username) {
      if (!cfg.secure && !supportsStartTls) {
        throw new Error('SMTP server does not offer STARTTLS; credentials were not sent over an insecure connection')
      }
      await smtpCommand(conn, 'AUTH LOGIN', 334, 'SMTP auth start')
      await smtpCommand(conn, btoa(cfg.username), 334, 'SMTP username')
      await smtpCommand(conn, btoa(cfg.password || ''), 235, 'SMTP password')
    }

    return conn
  } catch (err) {
    try { conn.close() } catch { /* noop */ }
    throw err
  }
}

export async function sendViaSmtp(
  cfg: SmtpConfig,
  to: string,
  subject: string,
  html: string,
  text: string,
  messageId: string,
  identity?: IdentityOverride | null,
) {
  const conn = await openSmtpConnection(cfg)
  try {
    const visibleFromEmail = identity?.from_email || cfg.from_email
    const visibleFromName = (identity?.from_name ?? cfg.from_name ?? '').trim()
    const fromHeader = visibleFromName
      ? `${cleanHeader(visibleFromName)} <${visibleFromEmail}>`
      : `<${visibleFromEmail}>`
    const replyToEmail = identity?.reply_to || visibleFromEmail
    const replyToHeader = visibleFromName
      ? `${cleanHeader(visibleFromName)} <${replyToEmail}>`
      : `<${replyToEmail}>`
    const envelopeFrom = cfg.from_email
    const fromDomain = visibleFromEmail.split('@')[1] || 'localhost'
    const boundary = `dynime-${crypto.randomUUID()}`
    const rfcMessageId = `<${messageId}@${fromDomain}>`
    const dateHeader = new Date().toUTCString().replace(/GMT$/, '+0000')
    const unsubscribeUrl = `https://${fromDomain}/unsubscribe?email=${encodeURIComponent(to)}`

    await smtpCommand(conn, `MAIL FROM:<${envelopeFrom}>`, 250, 'SMTP MAIL FROM')
    await smtpCommand(conn, `RCPT TO:<${to}>`, [250, 251], 'SMTP RCPT TO')
    await smtpCommand(conn, 'DATA', 354, 'SMTP DATA')

    const message = [
      `From: ${fromHeader}`,
      `Reply-To: ${replyToHeader}`,
      `To: <${to}>`,
      `Subject: ${cleanHeader(subject)}`,
      `Date: ${dateHeader}`,
      `Message-ID: ${rfcMessageId}`,
      `List-Unsubscribe: <${unsubscribeUrl}>, <mailto:${replyToEmail}?subject=unsubscribe>`,
      'List-Unsubscribe-Post: List-Unsubscribe=One-Click',
      'Auto-Submitted: auto-generated',
      'X-Mailer: Dynime-Mailer/1.0',
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: 8bit',
      '',
      dotStuff(text),
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      'Content-Transfer-Encoding: 8bit',
      '',
      dotStuff(html),
      '',
      `--${boundary}--`,
    ].join('\r\n')

    await conn.write(encoder.encode(`${message}\r\n.\r\n`))
    await expectSmtp(conn, 250, 'SMTP message send')
    await smtpCommand(conn, 'QUIT', 221, 'SMTP quit')
  } finally {
    try { conn.close() } catch { /* noop */ }
  }
}

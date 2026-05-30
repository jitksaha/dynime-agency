import { jsonResponse } from './_cors.ts'
import { openSmtpConnection, smtpCommand, type SmtpConfig } from './_smtp.ts'

export async function handleTestSmtp(params: {
  supabase: any
  smtp: SmtpConfig | null
  isAdmin: boolean
  recipientEmail: string
  messageId: string
}): Promise<Response> {
  const { supabase, smtp, isAdmin, recipientEmail, messageId } = params
  if (!isAdmin) return jsonResponse({ error: 'Admin only' }, 403)
  if (!smtp) return jsonResponse({ error: 'SMTP is not configured. Save SMTP settings first.' }, 503)
  try {
    const conn = await openSmtpConnection(smtp)
    try { await smtpCommand(conn, 'QUIT', 221, 'SMTP quit') } catch { /* noop */ }
    try { conn.close() } catch { /* noop */ }
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'smtp-connection-test',
      recipient_email: recipientEmail || smtp.from_email,
      status: 'sent',
      metadata: { action: 'test-smtp', host: smtp.host, port: smtp.port, secure: smtp.secure },
    })
    return jsonResponse({ success: true, connected: true, messageId })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'smtp-connection-test',
      recipient_email: recipientEmail || smtp.from_email,
      status: 'failed',
      error_message: `SMTP connection: ${msg}`.slice(0, 500),
      metadata: { action: 'test-smtp', host: smtp.host, port: smtp.port, secure: smtp.secure },
    })
    return jsonResponse({ error: 'SMTP connection failed', detail: msg, messageId }, 502)
  }
}

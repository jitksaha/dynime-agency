// IMAP poller — fetches new messages from the configured mailbox and
// inserts them into public.inbound_emails. Uses a minimal native IMAP
// client (TLS + tagged commands) so it runs cleanly under Deno.
import { createClient } from "npm:@supabase/supabase-js@2";
import { simpleParser } from "npm:mailparser@3.7.1";
import { Buffer } from "node:buffer";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

interface ImapConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  mailbox?: string;
}

async function loadImapConfig(supabase: any): Promise<ImapConfig | null> {
  const { data: imapRow } = await supabase
    .from("notification_settings").select("value").eq("key", "imap_config").maybeSingle();
  const imap = imapRow?.value as Partial<ImapConfig> | undefined;
  if (imap?.host && imap?.username && imap?.password) {
    return {
      host: imap.host, port: Number(imap.port ?? 993), secure: imap.secure ?? true,
      username: imap.username, password: imap.password, mailbox: imap.mailbox ?? "INBOX",
    };
  }
  const { data: smtpRow } = await supabase
    .from("notification_settings").select("value").eq("key", "smtp_config").maybeSingle();
  const smtp = smtpRow?.value as any | undefined;
  if (!smtp?.host || !smtp?.username || !smtp?.password) return null;
  return {
    host: String(smtp.host).replace(/^smtp\./i, "imap."),
    port: 993, secure: true,
    username: smtp.username, password: smtp.password, mailbox: "INBOX",
  };
}

const snippet = (s: string | null | undefined, max = 240) =>
  !s ? "" : s.replace(/\s+/g, " ").trim().slice(0, max);

// ---------- Minimal IMAP client ----------
class ImapClient {
  private conn!: Deno.TlsConn;
  private decoder = new TextDecoder();
  private encoder = new TextEncoder();
  private buffer = "";
  private tag = 0;

  async connect(host: string, port: number) {
    this.conn = await Deno.connectTls({ hostname: host, port });
    await this.readUntil((l) => /^\* OK/i.test(l));
  }

  private async readChunk(): Promise<string> {
    const buf = new Uint8Array(64 * 1024);
    const n = await this.conn.read(buf);
    if (n === null) throw new Error("IMAP connection closed");
    return this.decoder.decode(buf.subarray(0, n));
  }

  // Read until a predicate matches a complete line, returns all accumulated text
  private async readUntil(predicate: (line: string) => boolean): Promise<string> {
    let collected = "";
    while (true) {
      const nlIdx = this.buffer.indexOf("\n");
      if (nlIdx >= 0) {
        const line = this.buffer.slice(0, nlIdx + 1);
        this.buffer = this.buffer.slice(nlIdx + 1);
        collected += line;
        if (predicate(line.trimEnd())) return collected;
      } else {
        this.buffer += await this.readChunk();
      }
    }
  }

  // Read until tagged completion line is encountered. Handles {N} literals.
  private async readResponse(tag: string): Promise<string> {
    let collected = "";
    while (true) {
      const nlIdx = this.buffer.indexOf("\n");
      if (nlIdx < 0) {
        this.buffer += await this.readChunk();
        continue;
      }
      const line = this.buffer.slice(0, nlIdx + 1);
      this.buffer = this.buffer.slice(nlIdx + 1);
      collected += line;
      // literal: {N} at end of line means N more bytes follow
      const litMatch = line.match(/\{(\d+)\}\r?\n$/);
      if (litMatch) {
        const need = parseInt(litMatch[1], 10);
        while (this.buffer.length < need) {
          this.buffer += await this.readChunk();
        }
        collected += this.buffer.slice(0, need);
        this.buffer = this.buffer.slice(need);
        continue;
      }
      const trimmed = line.trimEnd();
      if (trimmed.startsWith(`${tag} `)) {
        if (!/^\S+ OK/i.test(trimmed)) {
          throw new Error(`IMAP command failed: ${trimmed}`);
        }
        return collected;
      }
    }
  }

  private async send(cmd: string): Promise<string> {
    const tag = `A${++this.tag}`;
    await this.conn.write(this.encoder.encode(`${tag} ${cmd}\r\n`));
    return await this.readResponse(tag);
  }

  async login(user: string, pass: string) {
    const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    await this.send(`LOGIN "${esc(user)}" "${esc(pass)}"`);
  }

  async select(mailbox: string) {
    await this.send(`SELECT "${mailbox}"`);
  }

  async searchUidsAfter(lastUid: number): Promise<number[]> {
    const range = lastUid > 0 ? `${lastUid + 1}:*` : "1:*";
    const resp = await this.send(`UID SEARCH UID ${range}`);
    console.log("[imap] SEARCH response:", resp.slice(0, 500));
    const m = resp.match(/^\* SEARCH([^\r\n]*)/m);
    if (!m) return [];
    return m[1].trim().split(/\s+/).filter(Boolean).map(Number).filter((u) => u > lastUid);
  }

  async fetchRaw(uid: number): Promise<Uint8Array | null> {
    const resp = await this.send(`UID FETCH ${uid} BODY.PEEK[]`);
    const litMatch = resp.match(/BODY\[\]\s*\{(\d+)\}\r?\n/);
    if (!litMatch) {
      console.log(`[imap] FETCH uid ${uid}: no literal in response (head):`, resp.slice(0, 300));
      return null;
    }
    const startIdx = resp.indexOf(litMatch[0]) + litMatch[0].length;
    const len = parseInt(litMatch[1], 10);
    return this.encoder.encode(resp.slice(startIdx, startIdx + len));
  }

  async logout() {
    try { await this.send("LOGOUT"); } catch (_) {}
    try { this.conn.close(); } catch (_) {}
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const cronSecret = Deno.env.get("CRON_SECRET");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const provided = req.headers.get("x-cron-secret") ??
    (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let authorized = false;
  if (cronSecret && provided === cronSecret) authorized = true;
  if (provided === serviceRole) authorized = true;
  if (!authorized && provided) {
    const { data: tokenRow } = await supabase
      .from("notification_settings").select("value").eq("key", "imap_poll_token").maybeSingle();
    const dbToken = (tokenRow?.value as any)?.token;
    if (dbToken && provided === dbToken) authorized = true;
  }
  if (!authorized && provided) {
    try {
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: `Bearer ${provided}` } } },
      );
      const { data: userData } = await userClient.auth.getUser();
      if (userData?.user) {
        const { data: roleRow } = await userClient
          .from("user_roles").select("role").eq("user_id", userData.user.id)
          .in("role", ["super_admin", "manager", "support"]);
        if (roleRow && roleRow.length > 0) authorized = true;
      }
    } catch (_) { /* ignore */ }
  }
  if (!authorized) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let inserted = 0, skipped = 0;
  const errors: string[] = [];
  const debug: any = {};

  try {
    const cfg = await loadImapConfig(supabase);
    if (!cfg) throw new Error("No IMAP/SMTP configuration found in notification_settings");

    const { data: stateRow } = await supabase
      .from("imap_poll_state").select("last_uid, folder").eq("id", 1).maybeSingle();
    const folder = cfg.mailbox || stateRow?.folder || "INBOX";
    const lastUid = Number(stateRow?.last_uid ?? 0);

    const client = new ImapClient();
    await client.connect(cfg.host, cfg.port);
    let highestUid = lastUid;
    try {
      await client.login(cfg.username, cfg.password);
      await client.select(folder);
      const uids = await client.searchUidsAfter(lastUid);
      debug.folder = folder; debug.lastUid = lastUid; debug.foundUids = uids;
      // limit per run to avoid timeouts
      const slice = uids.slice(0, 50);
      for (const uid of slice) {
        try {
          const raw = await client.fetchRaw(uid);
          if (!raw) {
            console.log(`[imap-poll] uid ${uid}: empty/null fetch — skipping but advancing cursor`);
            if (uid > highestUid) highestUid = uid;
            continue;
          }
          const parsed = await simpleParser(Buffer.from(raw));
          const fromAddr = parsed.from?.value?.[0];
          const toList = (parsed.to as any)?.value?.map((a: any) => a.address).filter(Boolean).join(", ");
          const ccList = (parsed.cc as any)?.value?.map((a: any) => a.address).filter(Boolean).join(", ");
          const messageId = parsed.messageId || `imap-${cfg.username}-${uid}`;
          const refs = Array.isArray(parsed.references) ? parsed.references
            : parsed.references ? [parsed.references] : [];

          // Upload attachments to private storage and collect descriptors.
          const attachmentDescriptors: Array<{
            filename: string; contentType: string; size: number;
            path: string; contentId?: string;
          }> = [];
          const safeMid = messageId.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
          for (let i = 0; i < (parsed.attachments || []).length; i++) {
            const a = parsed.attachments[i];
            if (!a?.content) continue;
            const safeName = (a.filename || `attachment-${i + 1}`)
              .replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
            const path = `${folder}/${uid}-${safeMid}/${i}-${safeName}`;
            const { error: upErr } = await supabase.storage
              .from("email-attachments")
              .upload(path, a.content, {
                contentType: a.contentType || "application/octet-stream",
                upsert: true,
              });
            if (upErr) {
              errors.push(`uid ${uid} attachment ${safeName}: ${upErr.message}`);
              continue;
            }
            attachmentDescriptors.push({
              filename: a.filename || safeName,
              contentType: a.contentType || "application/octet-stream",
              size: a.size ?? (a.content as Uint8Array).byteLength ?? 0,
              path,
              contentId: a.cid,
            });
          }

          const { error: insertErr } = await supabase.from("inbound_emails").insert({
            message_id: messageId, uid, folder,
            from_email: fromAddr?.address ?? "unknown@unknown",
            from_name: fromAddr?.name ?? null,
            to_email: toList ?? null, cc_email: ccList ?? null,
            subject: parsed.subject ?? null,
            in_reply_to: parsed.inReplyTo ?? null,
            reference_ids: refs,
            snippet: snippet(parsed.text || parsed.html || ""),
            body_text: parsed.text ?? null,
            body_html: (parsed.html as string) || null,
            received_at: (parsed.date ?? new Date()).toISOString(),
            raw_size: raw.byteLength,
            metadata: { attachments: attachmentDescriptors },
          });
          if (insertErr) {
            console.log(`[imap-poll] uid ${uid} insert error:`, insertErr);
            if ((insertErr as any).code === "23505") skipped += 1;
            else errors.push(`uid ${uid}: ${insertErr.message}`);
          } else {
            console.log(`[imap-poll] uid ${uid} inserted from=${fromAddr?.address} subject=${parsed.subject}`);
            inserted += 1;
          }
        } catch (e) {
          console.log(`[imap-poll] uid ${uid} threw:`, (e as Error).message);
          errors.push(`uid ${uid}: ${(e as Error).message}`);
        }
        if (uid > highestUid) highestUid = uid;
      }
    } finally {
      await client.logout();
    }

    await supabase.from("imap_poll_state").update({
      last_uid: highestUid, folder,
      last_run_at: new Date().toISOString(),
      last_status: errors.length ? "partial" : "ok",
      last_error: errors.length ? errors.slice(0, 5).join(" | ") : null,
      updated_at: new Date().toISOString(),
    }).eq("id", 1);

    return new Response(JSON.stringify({
      ok: true, inserted, skipped, last_uid: highestUid, errors: errors.slice(0, 10), debug,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const message = (e as Error).message ?? String(e);
    await supabase.from("imap_poll_state").update({
      last_run_at: new Date().toISOString(),
      last_status: "error", last_error: message.slice(0, 500),
      updated_at: new Date().toISOString(),
    }).eq("id", 1);
    console.error("imap-poll error:", message);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

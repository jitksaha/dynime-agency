// Bulk-sync local newsletter_subscribers to the configured 3rd-party provider
// (Mailchimp / SendGrid / Resend). Admin-only.
//
// POST { provider?: "mailchimp"|"sendgrid"|"resend" }  (defaults to configured)
// Responds with { synced, skipped, failed, errors[] }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function getSetting(
  supabase: ReturnType<typeof createClient>,
  key: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (!data) return null;
  let v: unknown = data.value;
  while (typeof v === "string") {
    try { v = JSON.parse(v); } catch { break; }
  }
  return typeof v === "string" ? v : v == null ? null : JSON.stringify(v);
}

async function pushMailchimp(emails: string[], apiKey: string, listId: string) {
  const dc = apiKey.split("-").pop();
  if (!dc) throw new Error("Invalid Mailchimp API key (missing datacenter suffix)");
  const url = `https://${dc}.api.mailchimp.com/3.0/lists/${listId}`;
  const body = {
    members: emails.map((email) => ({
      email_address: email,
      status: "subscribed",
    })),
    update_existing: true,
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`anystring:${apiKey}`)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Mailchimp ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

async function pushSendgrid(emails: string[], apiKey: string, listId?: string) {
  const res = await fetch("https://api.sendgrid.com/v3/marketing/contacts", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      list_ids: listId ? [listId] : [],
      contacts: emails.map((email) => ({ email })),
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`SendGrid ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

async function pushResendOne(email: string, apiKey: string, audienceId: string) {
  const res = await fetch(
    `https://api.resend.com/audiences/${audienceId}/contacts`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, unsubscribed: false }),
    },
  );
  if (!res.ok && res.status !== 409) {
    const text = await res.text();
    throw new Error(`Resend ${res.status}: ${text.slice(0, 200)}`);
  }
}

async function pushSenderOne(email: string, apiKey: string, groupId?: string) {
  const res = await fetch("https://api.sender.net/v2/subscribers", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      email,
      groups: groupId ? [groupId] : undefined,
      trigger_automation: false,
    }),
  });
  if (!res.ok && res.status !== 422) {
    const text = await res.text();
    throw new Error(`Sender.net ${res.status}: ${text.slice(0, 200)}`);
  }
}

async function pushKitOne(email: string, apiKey: string, formId?: string) {
  const url = formId
    ? `https://api.kit.com/v4/forms/${formId}/subscribers`
    : "https://api.kit.com/v4/subscribers";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "X-Kit-Api-Key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ email_address: email }),
  });
  if (!res.ok && res.status !== 409 && res.status !== 422) {
    const text = await res.text();
    throw new Error(`Kit ${res.status}: ${text.slice(0, 200)}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Auth: must be a signed-in admin
  const authHeader = req.headers.get("Authorization") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return json({ error: "Unauthorized" }, 401);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
  const { data: isAdminData } = await admin.rpc("is_admin", {
    _user_id: userData.user.id,
  });
  if (!isAdminData) return json({ error: "Forbidden — admin only" }, 403);

  // Determine provider
  let body: { provider?: string } = {};
  try { body = await req.json(); } catch { /* empty body ok */ }
  const provider = (body.provider || (await getSetting(admin, "newsletter_provider")) || "builtin").toLowerCase();

  if (provider === "builtin") {
    return json({ error: "No external provider configured. Set one in Header & Footer settings first." }, 400);
  }

  // Pull subscribed emails (batched in pages of 1000 to handle large lists)
  const emails: string[] = [];
  let from = 0;
  const PAGE = 1000;
  // Cap at 50k to avoid runaway timeouts
  while (emails.length < 50000) {
    const { data, error } = await admin
      .from("newsletter_subscribers")
      .select("email")
      .eq("status", "subscribed")
      .order("subscribed_at", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) return json({ error: error.message }, 500);
    if (!data?.length) break;
    for (const row of data) emails.push((row as any).email);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  if (emails.length === 0) {
    return json({ synced: 0, skipped: 0, failed: 0, message: "No subscribers to sync." });
  }

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  try {
    if (provider === "mailchimp") {
      const apiKey = (await getSetting(admin, "mailchimp_api_key")) || Deno.env.get("MAILCHIMP_API_KEY");
      const listId = await getSetting(admin, "mailchimp_list_id");
      if (!apiKey || !listId) return json({ error: "Mailchimp not fully configured (API key or list ID missing)." }, 400);
      const CHUNK = 500;
      for (let i = 0; i < emails.length; i += CHUNK) {
        const chunk = emails.slice(i, i + CHUNK);
        try {
          const result = await pushMailchimp(chunk, apiKey, listId);
          synced += (result?.total_created ?? 0) + (result?.total_updated ?? 0);
          if (Array.isArray(result?.errors)) {
            failed += result.errors.length;
            for (const e of result.errors.slice(0, 5)) errors.push(e?.error || JSON.stringify(e));
          }
        } catch (e) {
          failed += chunk.length;
          errors.push(e instanceof Error ? e.message : String(e));
        }
      }
    } else if (provider === "sendgrid") {
      const apiKey = (await getSetting(admin, "sendgrid_api_key")) || Deno.env.get("SENDGRID_API_KEY");
      const listId = (await getSetting(admin, "sendgrid_list_id")) || undefined;
      if (!apiKey) return json({ error: "SendGrid not configured (API key missing)." }, 400);
      const CHUNK = 1000;
      for (let i = 0; i < emails.length; i += CHUNK) {
        const chunk = emails.slice(i, i + CHUNK);
        try {
          await pushSendgrid(chunk, apiKey, listId);
          synced += chunk.length;
        } catch (e) {
          failed += chunk.length;
          errors.push(e instanceof Error ? e.message : String(e));
        }
      }
    } else if (provider === "resend") {
      const apiKey = (await getSetting(admin, "resend_api_key")) || Deno.env.get("RESEND_API_KEY");
      const audienceId = await getSetting(admin, "resend_audience_id");
      if (!apiKey || !audienceId) return json({ error: "Resend not fully configured (API key or audience ID missing)." }, 400);
      const CONC = 5;
      for (let i = 0; i < emails.length; i += CONC) {
        const batch = emails.slice(i, i + CONC);
        const results = await Promise.allSettled(batch.map((e) => pushResendOne(e, apiKey, audienceId)));
        for (const r of results) {
          if (r.status === "fulfilled") synced++;
          else { failed++; if (errors.length < 10) errors.push(r.reason instanceof Error ? r.reason.message : String(r.reason)); }
        }
      }
    } else if (provider === "sender") {
      const apiKey = await getSetting(admin, "sender_api_key");
      const groupId = (await getSetting(admin, "sender_group_id")) || undefined;
      if (!apiKey) return json({ error: "Sender.net not configured (API key missing)." }, 400);
      const CONC = 5;
      for (let i = 0; i < emails.length; i += CONC) {
        const batch = emails.slice(i, i + CONC);
        const results = await Promise.allSettled(batch.map((e) => pushSenderOne(e, apiKey, groupId)));
        for (const r of results) {
          if (r.status === "fulfilled") synced++;
          else { failed++; if (errors.length < 10) errors.push(r.reason instanceof Error ? r.reason.message : String(r.reason)); }
        }
      }
    } else if (provider === "kit") {
      const apiKey = await getSetting(admin, "kit_api_key");
      const formId = (await getSetting(admin, "kit_form_id")) || undefined;
      if (!apiKey) return json({ error: "Kit not configured (API key missing)." }, 400);
      const CONC = 5;
      for (let i = 0; i < emails.length; i += CONC) {
        const batch = emails.slice(i, i + CONC);
        const results = await Promise.allSettled(batch.map((e) => pushKitOne(e, apiKey, formId)));
        for (const r of results) {
          if (r.status === "fulfilled") synced++;
          else { failed++; if (errors.length < 10) errors.push(r.reason instanceof Error ? r.reason.message : String(r.reason)); }
        }
      }
    } else {
      return json({ error: `Unknown provider: ${provider}` }, 400);
    }
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }

  // Record last sync time
  await admin.from("site_settings").upsert(
    { key: "newsletter_last_sync", value: JSON.stringify({ at: new Date().toISOString(), provider, synced, failed }) },
    { onConflict: "key" },
  );

  return json({
    success: true,
    provider,
    total: emails.length,
    synced,
    failed,
    skipped: Math.max(0, emails.length - synced - failed),
    errors: errors.slice(0, 10),
  });
});

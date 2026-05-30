// Newsletter subscription edge function.
// Stores the subscriber in `newsletter_subscribers` AND optionally forwards
// the contact to a 3rd-party provider configured in `site_settings`:
//   newsletter_provider: "builtin" | "mailchimp" | "sendgrid" | "resend"
// Provider credentials live in Supabase secrets (MAILCHIMP_API_KEY, etc.).

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

const EMAIL_RX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

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

async function forwardMailchimp(email: string, apiKey: string, listId: string) {
  // Mailchimp API keys end with "-usX" — that's the datacenter.
  const dc = apiKey.split("-").pop();
  if (!dc) throw new Error("Invalid Mailchimp API key");
  const url = `https://${dc}.api.mailchimp.com/3.0/lists/${listId}/members`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`anystring:${apiKey}`)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email_address: email, status: "subscribed" }),
  });
  if (!res.ok && res.status !== 400) {
    // 400 usually means "Member Exists" — treat as success
    const text = await res.text();
    throw new Error(`Mailchimp ${res.status}: ${text}`);
  }
}

async function forwardSendgrid(email: string, apiKey: string, listId?: string) {
  const res = await fetch("https://api.sendgrid.com/v3/marketing/contacts", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      list_ids: listId ? [listId] : [],
      contacts: [{ email }],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SendGrid ${res.status}: ${text}`);
  }
}

async function forwardSender(email: string, apiKey: string, groupId?: string) {
  // Sender.net v2 — Bearer token auth
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
      trigger_automation: true,
    }),
  });
  if (!res.ok && res.status !== 422) {
    // 422 typically means subscriber already exists — treat as success
    const text = await res.text();
    throw new Error(`Sender.net ${res.status}: ${text}`);
  }
}

async function forwardKit(email: string, apiKey: string, formId?: string) {
  // Kit (formerly ConvertKit) v4 — X-Kit-Api-Key header
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
    throw new Error(`Kit ${res.status}: ${text}`);
  }
}

async function forwardResend(email: string, apiKey: string, audienceId: string) {
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
    throw new Error(`Resend ${res.status}: ${text}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: { email?: string; source?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const email = (body.email || "").trim().toLowerCase();
  const source = (body.source || "footer").toString().slice(0, 100);

  if (!email || !EMAIL_RX.test(email) || email.length > 320) {
    return json({ error: "Please enter a valid email address." }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  // 1. Always store locally (idempotent on email)
  const { error: dbError } = await supabase
    .from("newsletter_subscribers")
    .upsert(
      { email, source, status: "subscribed", subscribed_at: new Date().toISOString() },
      { onConflict: "email" },
    );
  if (dbError) {
    console.error("DB error:", dbError);
    return json({ error: "Could not save subscription. Please try again." }, 500);
  }

  // 2. Optionally forward to configured provider
  const provider = (await getSetting(supabase, "newsletter_provider")) || "builtin";
  let providerStatus: "ok" | "skipped" | "error" = "skipped";
  let providerError: string | null = null;

  try {
    if (provider === "mailchimp") {
      const apiKey = (await getSetting(supabase, "mailchimp_api_key")) || Deno.env.get("MAILCHIMP_API_KEY");
      const listId = await getSetting(supabase, "mailchimp_list_id");
      if (!apiKey || !listId) {
        providerError = "Mailchimp not fully configured";
      } else {
        await forwardMailchimp(email, apiKey, listId);
        providerStatus = "ok";
      }
    } else if (provider === "sendgrid") {
      const apiKey = (await getSetting(supabase, "sendgrid_api_key")) || Deno.env.get("SENDGRID_API_KEY");
      const listId = (await getSetting(supabase, "sendgrid_list_id")) || undefined;
      if (!apiKey) providerError = "SendGrid not configured";
      else {
        await forwardSendgrid(email, apiKey, listId);
        providerStatus = "ok";
      }
    } else if (provider === "resend") {
      const apiKey = (await getSetting(supabase, "resend_api_key")) || Deno.env.get("RESEND_API_KEY");
      const audienceId = await getSetting(supabase, "resend_audience_id");
      if (!apiKey || !audienceId) {
        providerError = "Resend not fully configured";
      } else {
        await forwardResend(email, apiKey, audienceId);
        providerStatus = "ok";
      }
    } else if (provider === "sender") {
      const apiKey = await getSetting(supabase, "sender_api_key");
      const groupId = (await getSetting(supabase, "sender_group_id")) || undefined;
      if (!apiKey) providerError = "Sender.net not configured (API key missing)";
      else {
        await forwardSender(email, apiKey, groupId);
        providerStatus = "ok";
      }
    } else if (provider === "kit") {
      const apiKey = await getSetting(supabase, "kit_api_key");
      const formId = (await getSetting(supabase, "kit_form_id")) || undefined;
      if (!apiKey) providerError = "Kit not configured (API key missing)";
      else {
        await forwardKit(email, apiKey, formId);
        providerStatus = "ok";
      }
    }
  } catch (e) {
    console.error("Provider forward failed:", e);
    providerError = e instanceof Error ? e.message : String(e);
    providerStatus = "error";
  }

  if (providerError) {
    console.error(`[subscribe-newsletter] provider=${provider} status=${providerStatus} error:`, providerError);
  }
  return json({
    success: true,
    message: "Thanks for subscribing!",
  });
});

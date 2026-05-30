import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Accepted Didit event types
const ACCEPTED_EVENTS = new Set([
  "status.updated",
  "user.status.updated",
  "user.data.updated",
  "business.status.updated",
  "business.data.updated",
]);

const mapStatus = (s: string | undefined | null): string => {
  if (!s) return "pending";
  const v = String(s).toLowerCase();
  if (["approved", "verified", "complete", "completed", "success", "confirmed"].includes(v)) return "verified";
  if (["declined", "rejected", "failed"].includes(v)) return "rejected";
  if (["in_review", "review", "manual_review", "kyc_review"].includes(v)) return "in_review";
  if (["expired", "abandoned", "timeout"].includes(v)) return "expired";
  if (["pending", "not_started", "initiated", "started", "in_progress"].includes(v)) return "pending";
  return v;
};

const hex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");

const verifySignature = async (secret: string, rawBody: string, signature: string | null): Promise<boolean> => {
  if (!signature) return false;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const computed = hex(sig);
  const provided = signature.replace(/^sha256=/, "").toLowerCase().trim();
  if (computed.length !== provided.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ provided.charCodeAt(i);
  return diff === 0;
};

// Optional Didit timestamp freshness check (5 min window)
const timestampFresh = (ts: string | null): boolean => {
  if (!ts) return true;
  const n = Number(ts);
  if (!Number.isFinite(n)) return true;
  return Math.abs(Date.now() / 1000 - n) < 300;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const secret = Deno.env.get("DIDIT_WEBHOOK_SECRET") || "";
  const admin = createClient(url, service);

  const rawBody = await req.text();
  const sigHeader =
    req.headers.get("x-signature") ||
    req.headers.get("x-didit-signature") ||
    req.headers.get("x-webhook-signature");
  const tsHeader = req.headers.get("x-timestamp") || req.headers.get("x-didit-timestamp");

  const valid = secret ? await verifySignature(secret, rawBody, sigHeader) : false;
  const fresh = timestampFresh(tsHeader);

  let payload: any = {};
  try { payload = JSON.parse(rawBody); } catch { /* ignore */ }

  const eventType: string = payload?.event || payload?.event_type || payload?.type || "unknown";
  const sessionId: string =
    payload?.session_id || payload?.data?.session_id || payload?.id || payload?.data?.id || "";

  // Always log the raw event first
  const { data: logRow } = await admin.from("didit_webhook_events").insert({
    event_type: eventType,
    session_id: sessionId,
    payload,
    signature_valid: valid,
  }).select("id").single();

  if (secret && !valid) {
    await admin.from("didit_webhook_events").update({ error: "invalid_signature" }).eq("id", logRow?.id);
    return new Response(JSON.stringify({ error: "invalid signature" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!fresh) {
    await admin.from("didit_webhook_events").update({ error: "stale_timestamp" }).eq("id", logRow?.id);
    return new Response(JSON.stringify({ error: "stale timestamp" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Only process whitelisted event types (still logged above)
  if (!ACCEPTED_EVENTS.has(eventType)) {
    await admin.from("didit_webhook_events").update({
      processed: true, error: "event_type_ignored",
    }).eq("id", logRow?.id);
    return new Response(JSON.stringify({ ok: true, ignored: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const statusRaw =
    payload?.status || payload?.data?.status || payload?.decision || payload?.data?.decision;
  const workflowId: string | undefined =
    payload?.workflow_id || payload?.data?.workflow_id;
  const KYB_WORKFLOW = Deno.env.get("DIDIT_KYB_WORKFLOW_ID");

  // Routing rules:
  // business.* -> KYB table
  // user.*     -> KYC table
  // status.updated -> route by session lookup (KYC first, then KYB), with workflow_id hint
  const routeTarget: "kyc" | "kyb" | "auto" =
    eventType.startsWith("business.") ? "kyb" :
    eventType.startsWith("user.") ? "kyc" : "auto";

  try {
    if (sessionId) {
      let target = routeTarget;
      if (target === "auto" && workflowId && KYB_WORKFLOW && workflowId === KYB_WORKFLOW) {
        target = "kyb";
      }

      const tryUpdate = async (table: "kyc_verifications" | "kyb_verifications") => {
        const { data: row } = await admin.from(table)
          .select("id").eq("didit_session_id", sessionId).maybeSingle();
        if (!row) return false;
        const update: Record<string, unknown> = { raw_data: payload };
        if (eventType.endsWith("status.updated") && statusRaw) {
          const newStatus = mapStatus(statusRaw);
          update.status = newStatus;
          if (newStatus === "verified") update.verification_date = new Date().toISOString();
        }
        await admin.from(table).update(update).eq("id", row.id);
        return true;
      };

      if (target === "kyb") {
        if (!(await tryUpdate("kyb_verifications"))) await tryUpdate("kyc_verifications");
      } else if (target === "kyc") {
        if (!(await tryUpdate("kyc_verifications"))) await tryUpdate("kyb_verifications");
      } else {
        if (!(await tryUpdate("kyc_verifications"))) await tryUpdate("kyb_verifications");
      }
    }

    await admin.from("didit_webhook_events").update({ processed: true }).eq("id", logRow?.id);
  } catch (e) {
    await admin.from("didit_webhook_events").update({ error: String(e) }).eq("id", logRow?.id);
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

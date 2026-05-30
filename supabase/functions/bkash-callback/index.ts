// bKash Tokenized Checkout — payment callback handler.
//
// bKash redirects the customer's browser here after they complete (or cancel)
// the payment on bKash's hosted checkout. We:
//   1. Read paymentID + status from the query string.
//   2. If status is "success", grant a fresh token and call /execute to capture.
//   3. Update the matching order row in Supabase.
//   4. 302-redirect the customer back to the storefront with a friendly status.
//
// This function MUST be public (no JWT). Configured in supabase/config.toml.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type BkashSettings = {
  app_key: string;
  app_secret: string;
  username: string;
  password: string;
  sandbox: boolean;
};

const bkashBase = (sandbox: boolean) =>
  sandbox
    ? "https://tokenized.sandbox.bka.sh/v1.2.0-beta"
    : "https://tokenized.pay.bka.sh/v1.2.0-beta";

// deno-lint-ignore no-explicit-any
async function loadBkashSettings(admin: any): Promise<BkashSettings | null> {
  const { data } = await admin
    .from("site_settings")
    .select("key, value")
    .in("key", ["bkash_app_key", "bkash_app_secret", "bkash_username", "bkash_password", "bkash_sandbox"]);
  const m: Record<string, string> = {};
  data?.forEach((row: { key: string; value: unknown }) => {
    const v = row.value;
    m[row.key] = typeof v === "string" ? v.replace(/^"|"$/g, "") : String(v);
  });
  if (!m.bkash_app_key || !m.bkash_app_secret || !m.bkash_username || !m.bkash_password) return null;
  return {
    app_key: m.bkash_app_key,
    app_secret: m.bkash_app_secret,
    username: m.bkash_username,
    password: m.bkash_password,
    sandbox: m.bkash_sandbox === "true",
  };
}

async function grantToken(s: BkashSettings): Promise<string> {
  const res = await fetch(`${bkashBase(s.sandbox)}/tokenized/checkout/token/grant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      username: s.username,
      password: s.password,
    },
    body: JSON.stringify({ app_key: s.app_key, app_secret: s.app_secret }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.id_token) {
    throw new Error(`Token grant failed: ${data?.statusMessage || res.status}`);
  }
  return data.id_token as string;
}

async function executePayment(s: BkashSettings, token: string, paymentID: string) {
  const res = await fetch(`${bkashBase(s.sandbox)}/tokenized/checkout/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: token,
      "X-APP-Key": s.app_key,
    },
    body: JSON.stringify({ paymentID }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function redirectTo(url: string): Response {
  return new Response(null, { status: 302, headers: { Location: url } });
}

// Validate origin against an allowlist from site_settings (`allowed_origins`,
// JSON array or comma-separated string). Falls back to the public site URL.
async function resolveSafeBase(
  // deno-lint-ignore no-explicit-any
  admin: any,
  requestedOrigin: string,
  fallback: string,
): Promise<string> {
  let allowed: string[] = [];
  try {
    const { data } = await admin
      .from("site_settings")
      .select("value")
      .in("key", ["allowed_origins", "site_url", "public_site_url"]);
    for (const row of data || []) {
      const v = (row as { value: unknown }).value;
      if (Array.isArray(v)) {
        allowed.push(...v.filter((x) => typeof x === "string"));
      } else if (typeof v === "string") {
        const cleaned = v.replace(/^"|"$/g, "");
        if (cleaned.includes(",")) allowed.push(...cleaned.split(",").map((s) => s.trim()));
        else allowed.push(cleaned);
      }
    }
  } catch (_) { /* ignore */ }
  allowed = allowed.filter(Boolean);

  const normalize = (u: string): string | null => {
    try { return new URL(u).origin; } catch { return null; }
  };
  const reqOrigin = normalize(requestedOrigin);
  if (reqOrigin && allowed.some((a) => normalize(a) === reqOrigin)) return reqOrigin;
  // Trust the first configured allowed origin, else fallback host.
  for (const a of allowed) {
    const o = normalize(a);
    if (o) return o;
  }
  return fallback;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const orderId = url.searchParams.get("order") || "";
  const requestedOrigin = url.searchParams.get("origin") || "";

  // bKash sends paymentID + status either in query (GET redirect) or body (POST).
  let paymentID = url.searchParams.get("paymentID") || "";
  let bkashStatus = url.searchParams.get("status") || "";
  if (req.method === "POST") {
    try {
      const ct = req.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const body = await req.json();
        paymentID = body.paymentID || paymentID;
        bkashStatus = body.status || bkashStatus;
      } else {
        const form = await req.formData();
        paymentID = (form.get("paymentID") as string) || paymentID;
        bkashStatus = (form.get("status") as string) || bkashStatus;
      }
    } catch { /* ignore body parse errors */ }
  }

  // Admin client used for status writes when we know the orderId.
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const fallbackBase = await resolveSafeBase(admin, requestedOrigin, `${url.protocol}//${url.host}`);
  const failRedirect = `${fallbackBase}/payment/status/${encodeURIComponent(orderId)}?bkash=fail`;
  const cancelRedirect = `${fallbackBase}/payment/status/${encodeURIComponent(orderId)}?bkash=cancel`;
  const successRedirect = `${fallbackBase}/payment/status/${encodeURIComponent(orderId)}?bkash=success`;
  const missingRedirect = `${fallbackBase}/payment/status/${encodeURIComponent(orderId)}?bkash=fail&reason=missing_callback`;

  // (admin client created above for safe-base resolution)

  // Helper: persist a terminal status with a structured failure reason so the
  // status page can render an accurate message.
  const recordFailure = async (
    status: "failed" | "cancelled",
    reason: string,
    extra: Record<string, unknown> = {},
  ) => {
    if (!orderId) return;
    try {
      await admin
        .from("orders")
        .update({
          status,
          payment_verification: {
            provider: "bkash",
            paymentID: paymentID || null,
            verified_at: new Date().toISOString(),
            notes: reason,
            ...extra,
          },
        })
        .eq("id", orderId);
    } catch (e) {
      console.error("[bkash-callback] failed to record failure", e);
    }
  };

  if (!orderId || !paymentID) {
    console.warn("[bkash-callback] missing order or paymentID", { orderId, paymentID });
    await recordFailure("failed", "Missing callback parameters from bKash (paymentID or order reference).");
    return redirectTo(missingRedirect);
  }
  if (bkashStatus && bkashStatus.toLowerCase() === "cancel") {
    await recordFailure("cancelled", "Customer cancelled the bKash checkout.");
    return redirectTo(cancelRedirect);
  }
  if (bkashStatus && bkashStatus.toLowerCase() === "failure") {
    await recordFailure("failed", "bKash reported the transaction as failed.");
    return redirectTo(failRedirect);
  }

  // (admin client already created above)

  try {
    const settings = await loadBkashSettings(admin);
    if (!settings) throw new Error("bKash not configured");

    const token = await grantToken(settings);
    const exec = await executePayment(settings, token, paymentID);
    const data = exec.data || {};

    const transactionStatus = (data.transactionStatus || "").toLowerCase();
    const isCompleted = exec.ok && transactionStatus === "completed";

    if (!isCompleted) {
      console.warn("[bkash-callback] execute did not complete", {
        paymentID,
        orderId,
        status: exec.status,
        transactionStatus,
        statusMessage: data.statusMessage,
      });
      await admin
        .from("orders")
        .update({
          status: "failed",
          payment_verification: {
            provider: "bkash",
            paymentID,
            transactionStatus,
            statusMessage: data.statusMessage,
            verified_at: new Date().toISOString(),
            notes: `bKash execute did not complete (transactionStatus="${transactionStatus || "unknown"}").`,
          },
        })
        .eq("id", orderId);
      return redirectTo(`${failRedirect}&reason=execute_incomplete`);
    }

    await admin
      .from("orders")
      .update({
        status: "paid",
        payment_verification: {
          provider: "bkash",
          paymentID,
          trxID: data.trxID,
          amount: data.amount,
          merchantInvoiceNumber: data.merchantInvoiceNumber,
          transactionStatus,
          verified_at: new Date().toISOString(),
        },
      })
      .eq("id", orderId);

    return redirectTo(successRedirect);
  } catch (err) {
    console.error("[bkash-callback] error", err);
    const msg = err instanceof Error ? err.message : "Unexpected error during bKash execute.";
    await recordFailure("failed", msg);
    return redirectTo(failRedirect);
  }
});

import { fetchWithTimeout, timed, type Result } from "./_shared.ts";

export async function testStripe(c: Record<string, string>): Promise<Result> {
  const secret = (c.secret_key || "").trim();
  const pub = (c.publishable_key || "").trim();
  const errors: string[] = [];

  if (!secret) errors.push("Secret key is required");
  if (secret && !/^sk_(test|live)_[A-Za-z0-9]+/.test(secret))
    errors.push("Secret key must start with sk_test_ or sk_live_");
  if (pub && !/^pk_(test|live)_[A-Za-z0-9]+/.test(pub))
    errors.push("Publishable key must start with pk_test_ or pk_live_");
  if (secret && pub) {
    const sMode = secret.startsWith("sk_live_") ? "live" : "test";
    const pMode = pub.startsWith("pk_live_") ? "live" : "test";
    if (sMode !== pMode) errors.push(`Mode mismatch — secret is ${sMode} but publishable is ${pMode}`);
  }
  if (errors.length) return { ok: false, status: "fail", summary: errors[0], details: { errors }, latency_ms: 0 };

  const probe = await timed(async () => {
    const res = await fetchWithTimeout("https://api.stripe.com/v1/balance", {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const body = await res.json().catch(() => ({}));
    return { res, body };
  });
  if (probe.error) {
    return { ok: false, status: "fail", summary: `Network error contacting Stripe: ${probe.error.message}`, latency_ms: probe.ms };
  }
  const { res, body } = probe.value!;
  if (res.status === 401) {
    return { ok: false, status: "fail", summary: "Stripe rejected the secret key (401 Unauthorized).", details: { stripe_error: body?.error?.message }, latency_ms: probe.ms };
  }
  if (!res.ok) {
    return { ok: false, status: "fail", summary: `Stripe returned HTTP ${res.status}.`, details: { stripe_error: body?.error?.message }, latency_ms: probe.ms };
  }
  const mode = secret.startsWith("sk_live_") ? "live" : "test";
  return {
    ok: true, status: "pass", summary: `Stripe key is valid (${mode} mode).`,
    details: { mode, account_currency: Array.isArray(body?.available) ? body.available[0]?.currency : undefined },
    latency_ms: probe.ms,
  };
}

export async function testBkash(c: Record<string, string>): Promise<Result> {
  const required = ["app_key", "app_secret", "username", "password"] as const;
  const missing = required.filter((k) => !(c[k] || "").trim());
  if (missing.length) return { ok: false, status: "fail", summary: `Missing required fields: ${missing.join(", ")}.`, latency_ms: 0 };

  const sandbox = String(c.sandbox).toLowerCase() === "true";
  const base = sandbox ? "https://tokenized.sandbox.bka.sh/v1.2.0-beta" : "https://tokenized.pay.bka.sh/v1.2.0-beta";

  const probe = await timed(async () => {
    const res = await fetchWithTimeout(`${base}/tokenized/checkout/token/grant`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", username: c.username, password: c.password },
      body: JSON.stringify({ app_key: c.app_key, app_secret: c.app_secret }),
    });
    const body = await res.json().catch(() => ({}));
    return { res, body };
  });
  if (probe.error) return { ok: false, status: "fail", summary: `Network error contacting bKash: ${probe.error.message}`, latency_ms: probe.ms };
  const { res, body } = probe.value!;
  if (!res.ok || !body?.id_token) {
    return { ok: false, status: "fail", summary: `bKash rejected credentials: ${body?.statusMessage || `HTTP ${res.status}`}`, details: { status_code: body?.statusCode, env: sandbox ? "sandbox" : "live" }, latency_ms: probe.ms };
  }
  return { ok: true, status: "pass", summary: `bKash credentials valid (${sandbox ? "sandbox" : "live"}). Token granted.`, details: { token_expires_in: body?.expires_in, env: sandbox ? "sandbox" : "live" }, latency_ms: probe.ms };
}

export async function testSSLCommerz(c: Record<string, string>): Promise<Result> {
  const store_id = (c.store_id || "").trim();
  const store_passwd = (c.store_password || "").trim();
  if (!store_id || !store_passwd) return { ok: false, status: "fail", summary: "Store ID and Store Password are required.", latency_ms: 0 };

  const sandbox = String(c.sandbox).toLowerCase() === "true";
  const url = sandbox ? "https://sandbox.sslcommerz.com/gwprocess/v4/api.php" : "https://securepay.sslcommerz.com/gwprocess/v4/api.php";

  const tranId = `lov-test-${Date.now()}`;
  const form = new URLSearchParams({
    store_id, store_passwd, total_amount: "10.00", currency: "BDT", tran_id: tranId,
    success_url: "https://example.com/s", fail_url: "https://example.com/f", cancel_url: "https://example.com/c",
    cus_name: "Lovable Diagnostic", cus_email: "test@example.com",
    cus_add1: "test", cus_city: "test", cus_country: "Bangladesh", cus_phone: "01700000000",
    shipping_method: "NO", product_name: "Diagnostic", product_category: "Diagnostic", product_profile: "general",
  });

  const probe = await timed(async () => {
    const res = await fetchWithTimeout(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form.toString() });
    const body = await res.json().catch(() => ({}));
    return { res, body };
  });
  if (probe.error) return { ok: false, status: "fail", summary: `Network error contacting SSLCommerz: ${probe.error.message}`, latency_ms: probe.ms };
  const { res, body } = probe.value!;
  const status = body?.status || `HTTP ${res.status}`;
  if (status === "SUCCESS" && body?.sessionkey) {
    return { ok: true, status: "pass", summary: `SSLCommerz credentials valid (${sandbox ? "sandbox" : "live"}).`, details: { gateway_methods: body?.gw, env: sandbox ? "sandbox" : "live" }, latency_ms: probe.ms };
  }
  return { ok: false, status: "fail", summary: `SSLCommerz rejected credentials: ${body?.failedreason || status}`, details: { raw_status: status }, latency_ms: probe.ms };
}

export async function testDodo(c: Record<string, string>): Promise<Result> {
  const apiKey = (c.api_key || "").trim();
  if (!apiKey) return { ok: false, status: "fail", summary: "API key is required.", latency_ms: 0 };

  const sandbox = String(c.sandbox).toLowerCase() === "true";
  const base = sandbox ? "https://test.dodopayments.com" : "https://live.dodopayments.com";

  const probe = await timed(async () => {
    const res = await fetchWithTimeout(`${base}/products?page_size=1`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    });
    const body = await res.json().catch(() => ({}));
    return { res, body };
  });
  if (probe.error) return { ok: false, status: "fail", summary: `Network error contacting DodoPayments: ${probe.error.message}`, latency_ms: probe.ms };
  const { res, body } = probe.value!;
  if (res.status === 401 || res.status === 403) {
    return { ok: false, status: "fail", summary: `DodoPayments rejected the API key (HTTP ${res.status}).`, details: { error: body?.message || body?.error }, latency_ms: probe.ms };
  }
  if (!res.ok) {
    return { ok: false, status: "fail", summary: `DodoPayments returned HTTP ${res.status}.`, details: { error: body?.message || body?.error }, latency_ms: probe.ms };
  }
  return { ok: true, status: "pass", summary: `DodoPayments API key valid (${sandbox ? "test" : "live"}).`, details: { env: sandbox ? "test" : "live" }, latency_ms: probe.ms };
}

export function testBankTransfer(c: Record<string, unknown>): Result {
  const accountsRaw = c.accounts;
  let accounts: Array<Record<string, string>> = [];
  if (Array.isArray(accountsRaw)) accounts = accountsRaw as Array<Record<string, string>>;
  else if (typeof accountsRaw === "string") {
    try { const parsed = JSON.parse(accountsRaw); if (Array.isArray(parsed)) accounts = parsed; } catch { /* ignore */ }
  }
  if (!accounts.length) {
    return { ok: false, status: "fail", summary: "Add at least one bank account so customers know where to send funds.", latency_ms: 0 };
  }
  const incomplete = accounts.filter((a) => !a.bank_name?.trim() || !a.account_name?.trim() || !a.account_number?.trim());
  if (incomplete.length) {
    return { ok: false, status: "fail", summary: `${incomplete.length} of ${accounts.length} account(s) are missing bank name, account holder, or account number.`, latency_ms: 0 };
  }
  return { ok: true, status: "pass", summary: `${accounts.length} bank account(s) configured. Customers will see all required details.`, details: { accounts: accounts.length }, latency_ms: 0 };
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature, x-dodo-signature, x-sslcz-signature, x-bkash-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// deno-lint-ignore no-explicit-any
export type Admin = any;

export async function getSetting(admin: Admin, key: string): Promise<string | null> {
  const { data } = await admin.from("site_settings").select("value").eq("key", key).maybeSingle();
  if (!data) return null;
  const v = (data as { value: unknown }).value;
  return typeof v === "string" ? v.replace(/^"|"$/g, "") : v == null ? null : String(v);
}

export type RetryPolicy = { maxAttempts: number; baseDelayMs: number; maxDelayMs: number };

export async function loadRetryPolicy(admin: Admin, prefix: string): Promise<RetryPolicy> {
  const [maxA, base, max] = await Promise.all([
    getSetting(admin, `${prefix}_retry_max_attempts`),
    getSetting(admin, `${prefix}_retry_base_delay_ms`),
    getSetting(admin, `${prefix}_retry_max_delay_ms`),
  ]);
  const clampInt = (v: string | null, def: number, lo: number, hi: number) => {
    const n = v ? parseInt(v, 10) : NaN;
    if (!Number.isFinite(n)) return def;
    return Math.min(hi, Math.max(lo, Math.trunc(n)));
  };
  return {
    maxAttempts: clampInt(maxA, 3, 1, 10),
    baseDelayMs: clampInt(base, 400, 50, 10_000),
    maxDelayMs: clampInt(max, 2500, 100, 30_000),
  };
}

export type VerificationMeta = {
  provider: string;
  verified_at: string;
  signature_valid: boolean | null;
  server_query_used: boolean;
  invoice_mismatch: boolean | null;
  authoritative_status: string | null;
  retry_attempts?: number;
  retry_exhausted?: boolean;
  notes?: string;
};

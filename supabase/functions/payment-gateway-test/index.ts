// Live credential validator for payment gateways. Admin-only.
// POST /payment-gateway-test  body: { gateway, credentials }

import { corsHeaders, json, type Result } from "./_shared.ts";
import { requireAdmin } from "./_auth.ts";
import { testStripe, testBkash, testSSLCommerz, testDodo, testBankTransfer } from "./_probes.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = await requireAdmin(req);
  if (!auth.admin) return json({ error: auth.reason || "Forbidden" }, 401);

  let payload: { gateway?: string; credentials?: Record<string, unknown> };
  try { payload = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }

  const gateway = String(payload?.gateway || "").toLowerCase();
  const creds = (payload?.credentials || {}) as Record<string, string>;

  let result: Result;
  try {
    switch (gateway) {
      case "stripe": result = await testStripe(creds); break;
      case "bkash": result = await testBkash(creds); break;
      case "sslcommerz": result = await testSSLCommerz(creds); break;
      case "dodopayment": result = await testDodo(creds); break;
      case "bank_transfer": result = testBankTransfer(payload?.credentials || {}); break;
      default: return json({ error: `Unknown gateway: ${gateway}` }, 400);
    }
  } catch (e) {
    console.error("[payment-gateway-test] crash", e);
    return json({ ok: false, status: "fail", summary: `Unexpected error: ${(e as Error).message}`, latency_ms: 0 } satisfies Result, 200);
  }

  console.log(`[payment-gateway-test] ${gateway} → ${result.status} (${result.latency_ms}ms)`);
  return json(result);
});

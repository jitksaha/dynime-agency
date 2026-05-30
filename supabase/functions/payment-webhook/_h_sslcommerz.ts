import { json, getSetting, type Admin, type VerificationMeta } from "./_shared.ts";
import { updateOrder } from "./_orders.ts";

export async function handleSslcommerz(req: Request, admin: Admin) {
  const form = await req.formData();
  const tranId = String(form.get("tran_id") || "");
  const valId = String(form.get("val_id") || "");
  const status = String(form.get("status") || "").toUpperCase();

  if (!tranId) return json({ error: "Missing tran_id" }, 400);

  let signatureValid: boolean | null = null;
  let authoritativeStatus: string | null = status || null;
  let internal = "pending";

  const storeId = await getSetting(admin, "sslcommerz_store_id");
  const storePasswd = await getSetting(admin, "sslcommerz_store_passwd");
  const sandbox = (await getSetting(admin, "sslcommerz_sandbox")) === "true";

  if (valId && storeId && storePasswd) {
    const base = sandbox ? "https://sandbox.sslcommerz.com" : "https://securepay.sslcommerz.com";
    const validatorUrl = `${base}/validator/api/validationserverAPI.php?val_id=${encodeURIComponent(valId)}&store_id=${encodeURIComponent(storeId)}&store_passwd=${encodeURIComponent(storePasswd)}&v=1&format=json`;
    try {
      const vRes = await fetch(validatorUrl);
      const vData = await vRes.json().catch(() => ({}));
      authoritativeStatus = (vData?.status || status || null) as string | null;
      const ok = vRes.ok && (vData?.status === "VALID" || vData?.status === "VALIDATED");
      signatureValid = ok;
      if (!ok) return json({ error: "SSLCommerz validation failed", status: vData?.status || null }, 401);
      internal = "paid";
    } catch (err) {
      console.error("[payment-webhook] sslcommerz validator failed:", err);
      return json({ error: "Validator unreachable" }, 502);
    }
  } else {
    console.warn("[payment-webhook] sslcommerz validator credentials missing; rejecting unverified IPN");
    return json({ error: "SSLCommerz validator not configured" }, 401);
  }

  const verification: VerificationMeta = {
    provider: "sslcommerz",
    verified_at: new Date().toISOString(),
    signature_valid: signatureValid,
    server_query_used: true,
    invoice_mismatch: null,
    authoritative_status: authoritativeStatus,
    notes: "IPN verified via SSLCommerz validator API.",
  };

  const updated = await updateOrder(admin, { stripe_session_id: tranId }, internal, verification);
  return json({ received: true, status: internal, updated, verification });
}

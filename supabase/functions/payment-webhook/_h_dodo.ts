import { json, getSetting, type Admin, type VerificationMeta } from "./_shared.ts";
import { verifyHmac } from "./_crypto.ts";
import { updateOrder } from "./_orders.ts";

export async function handleDodo(req: Request, admin: Admin) {
  const raw = await req.text();
  const secret = await getSetting(admin, "dodopayment_webhook_secret");
  if (!secret) return json({ error: "DodoPayment webhook secret not configured" }, 503);
  const signatureValid = await verifyHmac(raw, req.headers.get("x-dodo-signature"), secret);
  if (!signatureValid) return json({ error: "Invalid dodo signature" }, 401);

  let body: { event?: string; order_id?: string; status?: string };
  try { body = JSON.parse(raw); } catch { return json({ error: "Invalid JSON" }, 400); }

  const orderId = body.order_id;
  if (!orderId) return json({ error: "Missing order_id" }, 400);

  let internal = "pending";
  switch ((body.status || body.event || "").toLowerCase()) {
    case "succeeded":
    case "paid":
    case "completed":
      internal = "paid"; break;
    case "failed": internal = "failed"; break;
    case "refunded": internal = "refunded"; break;
    case "cancelled": internal = "cancelled"; break;
    default:
      return json({ received: true, ignored: body.event || body.status });
  }

  const verification: VerificationMeta = {
    provider: "dodopayment",
    verified_at: new Date().toISOString(),
    signature_valid: signatureValid,
    server_query_used: false,
    invoice_mismatch: null,
    authoritative_status: (body.status || body.event || null) as string | null,
  };

  const updated = await updateOrder(admin, { id: orderId }, internal, verification);
  return json({ received: true, status: internal, updated, verification });
}

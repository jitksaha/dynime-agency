import { json, getSetting, type Admin, type VerificationMeta } from "./_shared.ts";
import { verifyStripeSignature } from "./_crypto.ts";
import { updateOrder } from "./_orders.ts";

export async function handleStripe(req: Request, admin: Admin) {
  const raw = await req.text();
  const sigHeader = req.headers.get("stripe-signature");
  const webhookSecret = await getSetting(admin, "stripe_webhook_secret");

  if (!webhookSecret) return json({ error: "Stripe webhook secret not configured" }, 503);
  const signatureValid = await verifyStripeSignature(raw, sigHeader, webhookSecret);
  if (!signatureValid) return json({ error: "Invalid stripe signature" }, 401);

  let event: { type?: string; data?: { object?: Record<string, unknown> } };
  try { event = JSON.parse(raw); } catch { return json({ error: "Invalid JSON" }, 400); }

  const obj = event.data?.object ?? {};
  const sessionId = (obj.id as string) || (obj.payment_intent as string) || "";

  let status: string | null = null;
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
    case "payment_intent.succeeded":
      status = "paid"; break;
    case "checkout.session.async_payment_failed":
    case "payment_intent.payment_failed":
      status = "failed"; break;
    case "charge.refunded":
    case "checkout.session.expired":
      status = event.type === "charge.refunded" ? "refunded" : "expired"; break;
    default:
      return json({ received: true, ignored: event.type });
  }

  const verification: VerificationMeta = {
    provider: "stripe",
    verified_at: new Date().toISOString(),
    signature_valid: signatureValid,
    server_query_used: false,
    invoice_mismatch: null,
    authoritative_status: event.type ?? null,
  };

  const updated = await updateOrder(admin, { stripe_session_id: sessionId }, status, verification);
  return json({ received: true, type: event.type, updated, status, verification });
}

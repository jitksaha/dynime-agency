import type { CheckoutRequest, GlobalUrls, GatewayResult } from "./_types.ts";
import { pickUrl } from "./_utils.ts";

export async function processStripe(
  settings: Record<string, string>,
  req: CheckoutRequest,
  globals: GlobalUrls,
): Promise<GatewayResult> {
  const secretKey = settings.stripe_secret_key;
  if (!secretKey) throw new Error("Stripe secret key not configured. Go to Super Admin → Settings → Payment Gateways.");

  const currency = settings.stripe_currency || "usd";
  const lineItems = req.items.map((item) => ({
    price_data: {
      currency,
      product_data: { name: item.name },
      unit_amount: Math.round(item.price * 100),
    },
    quantity: item.quantity,
  }));

  const successUrl = pickUrl(req.success_url, globals.success_url);
  const cancelUrl = pickUrl(req.cancel_url, globals.cancel_url);

  const params = new URLSearchParams();
  params.append("mode", "payment");
  params.append("customer_email", req.customer_email);
  params.append("success_url", successUrl);
  params.append("cancel_url", cancelUrl);

  lineItems.forEach((li, i) => {
    params.append(`line_items[${i}][price_data][currency]`, li.price_data.currency);
    params.append(`line_items[${i}][price_data][product_data][name]`, li.price_data.product_data.name);
    params.append(`line_items[${i}][price_data][unit_amount]`, String(li.price_data.unit_amount));
    params.append(`line_items[${i}][quantity]`, String(li.quantity));
  });

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const session = await response.json();
  if (!response.ok) throw new Error(`Stripe error: ${session.error?.message || JSON.stringify(session)}`);

  return { checkout_url: session.url, session_id: session.id, gateway: "stripe" };
}

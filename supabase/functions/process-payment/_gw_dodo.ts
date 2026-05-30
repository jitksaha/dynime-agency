import type { CheckoutRequest, GlobalUrls, GatewayResult } from "./_types.ts";
import { pickUrl } from "./_utils.ts";

export async function processDodoPayment(
  settings: Record<string, string>,
  req: CheckoutRequest,
  globals: GlobalUrls,
): Promise<GatewayResult> {
  const apiKey = settings.dodopayment_api_key;
  if (!apiKey) throw new Error("DodoPayment API key not configured. Go to Super Admin → Settings → Payment Gateways.");

  const isSandbox = settings.dodopayment_sandbox === "true";
  const baseUrl = isSandbox ? "https://test.dodopayments.com" : "https://live.dodopayments.com";
  const currency = (settings.dodopayment_currency || "USD").toUpperCase();

  const dodoFetch = async (path: string, body: unknown) => {
    const res = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`DodoPayment error [${res.status}] on ${path}: ${JSON.stringify(data)}`);
    return data;
  };

  const productCart: Array<{ product_id: string; quantity: number }> = [];
  for (const item of req.items) {
    const product = await dodoFetch("/products", {
      name: item.name?.slice(0, 100) || "Order item",
      tax_category: "digital_products",
      price: {
        currency,
        price: Math.round(Number(item.price) * 100),
        discount: 0,
        purchasing_power_parity: false,
        type: "one_time_price",
      },
    });
    if (!product.product_id) throw new Error(`DodoPayment: product creation returned no product_id`);
    productCart.push({ product_id: product.product_id, quantity: item.quantity });
  }

  const payment = await dodoFetch("/payments", {
    payment_link: true,
    billing: {
      country: settings.dodopayment_default_country || "US",
      city: "N/A",
      state: "N/A",
      street: "N/A",
      zipcode: "00000",
    },
    customer: {
      email: req.customer_email,
      name: req.customer_name || req.customer_email,
    },
    product_cart: productCart,
    return_url: pickUrl(req.success_url, globals.success_url),
  });

  if (!payment.payment_link) throw new Error(`DodoPayment: no payment_link in response: ${JSON.stringify(payment)}`);

  return {
    checkout_url: payment.payment_link,
    session_id: payment.payment_id,
    gateway: "dodopayment",
  };
}

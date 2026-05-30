import type { CheckoutRequest, GlobalUrls, GatewayResult } from "./_types.ts";
import { pickUrl } from "./_utils.ts";

export async function processSSLCommerz(
  settings: Record<string, string>,
  req: CheckoutRequest,
  globals: GlobalUrls,
): Promise<GatewayResult> {
  const storeId = settings.sslcommerz_store_id;
  const storePassword = settings.sslcommerz_store_password;
  if (!storeId || !storePassword) throw new Error("SSLCommerz credentials not configured. Go to Super Admin → Settings → Payment Gateways.");

  const isSandbox = settings.sslcommerz_sandbox === "true";
  const baseUrl = isSandbox
    ? "https://sandbox.sslcommerz.com/gwprocess/v4/api.php"
    : "https://securepay.sslcommerz.com/gwprocess/v4/api.php";

  const tranId = `TXN_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const params = new URLSearchParams({
    store_id: storeId,
    store_passwd: storePassword,
    total_amount: String(req.total),
    currency: "USD",
    multi_card_name: "mastercard,visacard,amexcard",
    tran_id: tranId,
    success_url: pickUrl(req.success_url, globals.success_url),
    fail_url: pickUrl(globals.fail_url),
    cancel_url: pickUrl(req.cancel_url, globals.cancel_url),
    cus_name: req.customer_name,
    cus_email: req.customer_email,
    cus_add1: "N/A",
    cus_city: "N/A",
    cus_country: "Bangladesh",
    cus_phone: "N/A",
    shipping_method: "NO",
    product_name: req.items.map((i) => i.name).join(", "),
    product_category: "Digital",
    product_profile: "non-physical-goods",
  });

  const response = await fetch(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = await response.json();
  if (data.status !== "SUCCESS") throw new Error(`SSLCommerz error: ${data.failedreason || JSON.stringify(data)}`);

  return { checkout_url: data.GatewayPageURL, session_id: tranId, gateway: "sslcommerz" };
}

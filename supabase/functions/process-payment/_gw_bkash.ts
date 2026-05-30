import type { CheckoutRequest, GatewayResult } from "./_types.ts";

const bkashBase = (sandbox: boolean) =>
  sandbox
    ? "https://tokenized.sandbox.bka.sh/v1.2.0-beta"
    : "https://tokenized.pay.bka.sh/v1.2.0-beta";

async function bkashGrantToken(s: Record<string, string>, sandbox: boolean): Promise<string> {
  const res = await fetch(`${bkashBase(sandbox)}/tokenized/checkout/token/grant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      username: s.bkash_username,
      password: s.bkash_password,
    },
    body: JSON.stringify({ app_key: s.bkash_app_key, app_secret: s.bkash_app_secret }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.id_token) {
    throw new Error(`bKash token grant failed: ${data?.statusMessage || data?.errorMessage || res.status}`);
  }
  return data.id_token as string;
}

async function fetchUsdToBdt(): Promise<number> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    if (!res.ok) throw new Error(`FX HTTP ${res.status}`);
    const json = await res.json();
    const r = Number(json?.rates?.BDT);
    if (!isFinite(r) || r <= 0) throw new Error("Bad BDT rate");
    return r;
  } catch (e) {
    console.warn("USD->BDT FX fallback used:", e);
    return 110;
  }
}

export async function processBkash(
  supabaseAdmin: any,
  settings: Record<string, string>,
  req: CheckoutRequest,
  origin: string,
): Promise<GatewayResult> {
  if (!settings.bkash_app_key || !settings.bkash_app_secret || !settings.bkash_username || !settings.bkash_password) {
    throw new Error("bKash credentials missing. Configure App Key, App Secret, Username and Password in Super Admin → Payment Gateways.");
  }
  const sandbox = settings.bkash_sandbox === "true";

  const fxRate = await fetchUsdToBdt();
  const usdTotal = Number(req.total);
  const bdtTotal = Math.round(usdTotal * fxRate * 100) / 100;

  let orderId: string | null = req.existing_order_id || null;
  if (!orderId) {
    const { data: order, error: orderErr } = await supabaseAdmin.from("orders").insert({
      customer_name: req.customer_name,
      customer_email: req.customer_email,
      items: req.items.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
      total: usdTotal,
      status: "pending",
      currency: "USD",
      notes: `bKash charge: ৳${bdtTotal.toFixed(2)} BDT (rate 1 USD = ${fxRate.toFixed(4)} BDT). ${req.notes || ""}`.trim(),
    }).select("id").single();
    if (orderErr || !order?.id) throw new Error(`Failed to create bKash order: ${orderErr?.message || "no id"}`);
    orderId = order.id as string;
  }
  const merchantInvoiceNumber = String(orderId);

  const token = await bkashGrantToken(settings, sandbox);

  const projectRef = (Deno.env.get("SUPABASE_URL") || "").match(/https:\/\/([^.]+)/)?.[1];
  const callbackURL = `https://${projectRef}.functions.supabase.co/bkash-callback?order=${encodeURIComponent(merchantInvoiceNumber)}&origin=${encodeURIComponent(origin)}`;

  const amount = bdtTotal.toFixed(2);
  const createRes = await fetch(`${bkashBase(sandbox)}/tokenized/checkout/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: token,
      "X-APP-Key": settings.bkash_app_key,
    },
    body: JSON.stringify({
      mode: "0011",
      payerReference: req.customer_email || "customer",
      callbackURL,
      amount,
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber,
    }),
  });
  const createData = await createRes.json().catch(() => ({}));
  if (!createRes.ok || !createData?.bkashURL || !createData?.paymentID) {
    throw new Error(
      `bKash create payment failed: ${createData?.statusMessage || createData?.errorMessage || createRes.status}`,
    );
  }

  await supabaseAdmin
    .from("orders")
    .update({ stripe_session_id: createData.paymentID, payment_gateway: "bkash" })
    .eq("id", orderId);

  return {
    checkout_url: createData.bkashURL,
    session_id: merchantInvoiceNumber,
    payment_id: createData.paymentID,
    gateway: "bkash",
    sandbox,
    fx_rate: fxRate,
    bdt_amount: bdtTotal,
    usd_amount: usdTotal,
    _skip_order_insert: true,
  };
}

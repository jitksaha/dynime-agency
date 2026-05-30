import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "./_cors.ts";
import type { CartItem, CheckoutRequest, BillingAddress, MilestoneStage, GatewayResult } from "./_types.ts";
import { roundMoney, normalizeMilestoneStages, deriveDefaultUrls } from "./_utils.ts";
import { getPaymentSettings, getGlobalUrls } from "./_settings.ts";
import { processStripe } from "./_gw_stripe.ts";
import { processSSLCommerz } from "./_gw_sslcommerz.ts";
import { processDodoPayment } from "./_gw_dodo.ts";
import { processBkash } from "./_gw_bkash.ts";
import { processBankTransfer } from "./_gw_bank.ts";

type ExistingOrder = {
  id: string;
  items: CartItem[];
  total: number;
  subtotal: number | null;
  customer_email: string;
  customer_name: string | null;
  currency: string | null;
  service_brief: Record<string, unknown> | null;
  billing_address: Record<string, unknown> | null;
  notes: string | null;
  coupon_code: string | null;
  discount_amount: number | null;
  status: string;
};

async function loadExistingOrder(
  supabaseAdmin: any,
  id: string,
): Promise<ExistingOrder | { error: string; status: number }> {
  const { data: row, error } = await supabaseAdmin
    .from("orders")
    .select("id, items, total, subtotal, customer_email, customer_name, currency, service_brief, billing_address, notes, coupon_code, discount_amount, status")
    .eq("id", id)
    .maybeSingle();
  if (error || !row) return { error: "Invoice not found", status: 404 };
  if (["paid", "completed", "refunded"].includes(row.status)) {
    return { error: "This invoice is already paid.", status: 400 };
  }
  return row as ExistingOrder;
}

async function applyTrustedPricing(
  supabaseAdmin: any,
  items: CartItem[],
): Promise<{ trustedItems: CartItem[]; subtotal: number }> {
  const productIds = items.map((i) => i.id).filter((x) => typeof x === "string" && x.length > 0);
  let priceMap: Record<string, number> = {};
  if (productIds.length > 0) {
    const { data: dbProducts } = await supabaseAdmin
      .from("products")
      .select("id, price, is_active")
      .in("id", productIds);
    priceMap = Object.fromEntries(
      (dbProducts || [])
        .filter((p: { is_active: boolean }) => p.is_active)
        .map((p: { id: string; price: number }) => [p.id, Number(p.price)]),
    );
  }
  const trustedItems = items.map((it) => {
    const trusted = priceMap[it.id];
    return trusted != null ? { ...it, price: trusted } : it;
  });
  const subtotal = trustedItems.reduce((s, it) => s + Number(it.price) * Number(it.quantity), 0);
  return { trustedItems, subtotal };
}

async function applyCoupon(
  supabaseAdmin: any,
  code: string,
  subtotal: number,
): Promise<
  | { ok: true; discount: number; appliedCoupon: string; stages: MilestoneStage[]; mode: string | null }
  | { ok: false; error: string }
> {
  const { data: validation, error: vErr } = await supabaseAdmin.rpc("validate_coupon", {
    _code: code.trim(),
    _order_total: subtotal,
  });
  if (vErr) return { ok: false, error: `Coupon error: ${vErr.message}` };
  const v = validation as {
    valid: boolean; error?: string; discount_amount?: number; code?: string;
    is_milestone?: boolean; milestone_mode?: string | null;
    milestone_stages?: MilestoneStage[];
  };
  if (!v?.valid) return { ok: false, error: v?.error || "Invalid coupon" };
  return {
    ok: true,
    discount: Number(v.discount_amount || 0),
    appliedCoupon: v.code || code.trim().toUpperCase(),
    stages: v.is_milestone && Array.isArray(v.milestone_stages) ? v.milestone_stages : [],
    mode: v.is_milestone ? (v.milestone_mode || null) : null,
  };
}

async function resolveUserId(req: Request, supabaseUrl: string): Promise<string | null> {
  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return null;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data } = await userClient.auth.getUser();
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}

async function persistOrder(params: {
  supabaseAdmin: any;
  existingOrder: ExistingOrder | null;
  result: GatewayResult;
  body: CheckoutRequest;
  customer_name: string;
  customer_email: string;
  orderItems: CartItem[];
  orderTotal: number;
  orderSubtotal: number;
  orderDiscount: number;
  applied_coupon: string | null;
  milestoneServiceBrief: Record<string, unknown>;
  user_id: string | null;
  gateway: string;
}): Promise<string | null> {
  const {
    supabaseAdmin, existingOrder, result, body, customer_name, customer_email,
    orderItems, orderTotal, orderSubtotal, orderDiscount, applied_coupon,
    milestoneServiceBrief, user_id, gateway,
  } = params;

  if (existingOrder) {
    const patch: Record<string, unknown> = { payment_gateway: gateway, status: "pending" };
    if (gateway !== "bkash" && result.session_id) patch.stripe_session_id = result.session_id;
    if (user_id) patch.user_id = user_id;
    await supabaseAdmin.from("orders").update(patch).eq("id", existingOrder.id);
    return existingOrder.id;
  }

  if (!result._skip_order_insert) {
    const taxFields = body.tax ? {
      tax_amount: Number(body.tax.amount) || 0,
      tax_percent: Number(body.tax.percent) || 0,
      tax_mode: body.tax.mode,
      tax_label: body.tax.label,
    } : {};
    const { data: inserted, error: orderError } = await supabaseAdmin.from("orders").insert({
      customer_name, customer_email,
      items: orderItems,
      subtotal: orderSubtotal, total: orderTotal,
      status: "pending",
      stripe_session_id: result.session_id,
      payment_gateway: gateway,
      coupon_code: applied_coupon,
      discount_amount: orderDiscount,
      service_brief: { ...(body.service_brief || {}), ...milestoneServiceBrief },
      billing_address: body.billing_address || {},
      notes: body.notes || null,
      currency: body.currency || "USD",
      user_id,
      ...taxFields,
    }).select("id").single();
    if (orderError) console.error("Order insert error:", orderError);
    return inserted?.id || null;
  }

  // bKash inserted a stub; patch in extras.
  const taxFields = body.tax ? {
    tax_amount: Number(body.tax.amount) || 0,
    tax_percent: Number(body.tax.percent) || 0,
    tax_mode: body.tax.mode,
    tax_label: body.tax.label,
  } : {};
  const { data: patched } = await supabaseAdmin
    .from("orders")
    .update({
      coupon_code: applied_coupon,
      discount_amount: orderDiscount,
      total: orderTotal,
      subtotal: orderSubtotal,
      items: orderItems,
      service_brief: { ...(body.service_brief || {}), ...milestoneServiceBrief },
      billing_address: body.billing_address || {},
      notes: body.notes || null,
      currency: body.currency || "USD",
      payment_gateway: gateway,
      user_id,
      ...taxFields,
    })
    .eq("stripe_session_id", result.payment_id || result.session_id)
    .select("id")
    .single();
  return patched?.id || null;
}

async function seedMilestones(
  supabaseAdmin: any,
  parentOrderId: string,
  stages: MilestoneStage[],
  currency: string,
) {
  const rows = stages.map((s, i) => ({
    parent_order_id: parentOrderId,
    child_order_id: i === 0 ? parentOrderId : null,
    sequence: i + 1,
    label: s.label,
    percent: s.percent,
    amount: s.amount,
    currency,
    status: i === 0 ? "invoiced" : "pending",
    invoiced_at: i === 0 ? new Date().toISOString() : null,
  }));
  const { error } = await supabaseAdmin.from("order_milestones").insert(rows);
  if (error) console.error("Milestone seed error:", error);
}

async function dispatchGateway(
  gateway: CheckoutRequest["gateway"],
  supabaseAdmin: any,
  settings: Record<string, string>,
  body: CheckoutRequest,
  globals: ReturnType<typeof deriveDefaultUrls>,
  origin: string,
): Promise<GatewayResult> {
  switch (gateway) {
    case "stripe": return processStripe(settings, body, globals);
    case "sslcommerz": return processSSLCommerz(settings, body, globals);
    case "dodopayment": return processDodoPayment(settings, body, globals);
    case "bkash": return processBkash(supabaseAdmin, settings, body, origin);
    case "bank_transfer": return processBankTransfer(supabaseAdmin, body);
    default: throw new Error(`Unsupported gateway: ${gateway}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const body: CheckoutRequest = await req.json();
    const { gateway, coupon_code } = body;
    let { customer_name, customer_email, items, total } = body;

    let existingOrder: ExistingOrder | null = null;
    if (body.existing_order_id) {
      const loaded = await loadExistingOrder(supabaseAdmin, body.existing_order_id);
      if ("error" in loaded) return jsonResponse({ error: loaded.error }, loaded.status);
      existingOrder = loaded;
      items = (loaded.items || []) as CartItem[];
      total = Number(loaded.total) || 0;
      customer_email = loaded.customer_email;
      customer_name = loaded.customer_name || customer_name;
      body.items = items;
      body.total = total;
      body.customer_email = customer_email;
      body.customer_name = customer_name;
      body.currency = loaded.currency || body.currency || "USD";
      body.billing_address = (loaded.billing_address || body.billing_address) as BillingAddress | null;
      body.service_brief = (loaded.service_brief || body.service_brief) as Record<string, unknown> | null;
      body.notes = loaded.notes ?? body.notes ?? null;
    }

    if (!gateway || !customer_email || !items?.length || !total) {
      return jsonResponse({ error: "Missing required fields: gateway, customer_email, items, total" }, 400);
    }

    let trustedItems: CartItem[] = items;
    let subtotal: number;
    if (existingOrder) {
      subtotal = Number(existingOrder.subtotal ?? total);
    } else {
      const priced = await applyTrustedPricing(supabaseAdmin, items);
      trustedItems = priced.trustedItems;
      body.items = trustedItems;
      subtotal = priced.subtotal;
    }

    let discount_amount = 0;
    let applied_coupon: string | null = null;
    let milestoneStages: MilestoneStage[] = [];
    let milestoneMode: string | null = null;

    if (existingOrder) {
      discount_amount = Number(existingOrder.discount_amount || 0);
      applied_coupon = existingOrder.coupon_code || null;
      total = Number(existingOrder.total) || 0;
    } else if (coupon_code && typeof coupon_code === "string" && coupon_code.trim()) {
      const c = await applyCoupon(supabaseAdmin, coupon_code, subtotal);
      if (!c.ok) return jsonResponse({ error: c.error }, 400);
      discount_amount = c.discount;
      applied_coupon = c.appliedCoupon;
      milestoneStages = c.stages;
      milestoneMode = c.mode;
    }

    if (!existingOrder) total = Math.max(0, roundMoney(subtotal - discount_amount));

    const isMilestone = milestoneStages.length > 0;
    const computedStages = isMilestone ? normalizeMilestoneStages(total, milestoneStages) : [];
    if (isMilestone && computedStages.length < 2) {
      return jsonResponse({ error: "Milestone coupon needs at least 2 payment stages" }, 400);
    }
    const chargeNow = isMilestone ? computedStages[0].amount! : total;

    if (isMilestone) {
      body.items = [{
        id: "milestone-advance",
        name: `${computedStages[0].label} (${computedStages[0].percent}% of $${total.toFixed(2)})`,
        price: chargeNow,
        quantity: 1,
      }];
    }
    body.total = chargeNow;

    const settings = await getPaymentSettings(supabaseAdmin, gateway);
    const adminGlobals = await getGlobalUrls(supabaseAdmin);
    const derived = deriveDefaultUrls(req);
    const globals = {
      success_url: adminGlobals.success_url || derived.success_url,
      fail_url: adminGlobals.fail_url || derived.fail_url,
      cancel_url: adminGlobals.cancel_url || derived.cancel_url,
    };

    if (settings[`${gateway}_enabled`] !== "true") {
      return jsonResponse({ error: `${gateway} is not enabled. Enable it in Super Admin → Settings → Payment Gateways.` }, 400);
    }

    const result = await dispatchGateway(gateway, supabaseAdmin, settings, body, globals, req.headers.get("origin") || "");

    const user_id = await resolveUserId(req, supabaseUrl);

    const orderTotal = isMilestone ? chargeNow : total;
    const orderSubtotal = isMilestone ? chargeNow : subtotal;
    const orderDiscount = isMilestone ? 0 : discount_amount;
    const orderItems = isMilestone
      ? body.items
      : trustedItems.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity }));
    const milestoneServiceBrief = isMilestone ? {
      milestone_root: true,
      milestone_mode: milestoneMode,
      milestone_stages: computedStages,
      milestone_project_total: total,
      milestone_advance_amount: chargeNow,
      milestone_coupon: applied_coupon,
    } : {};

    const parentOrderId = await persistOrder({
      supabaseAdmin, existingOrder, result, body,
      customer_name, customer_email,
      orderItems, orderTotal, orderSubtotal, orderDiscount,
      applied_coupon, milestoneServiceBrief, user_id, gateway,
    });

    if (isMilestone && parentOrderId) {
      await seedMilestones(supabaseAdmin, parentOrderId, computedStages, body.currency || "USD");
    }

    if (applied_coupon && !existingOrder) {
      try { await supabaseAdmin.rpc("redeem_coupon", { _code: applied_coupon }); } catch (_) { /* non-fatal */ }
    }

    return jsonResponse(result);
  } catch (error: unknown) {
    console.error("Payment processing error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: msg }, 500);
  }
});

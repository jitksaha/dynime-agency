import type { Admin } from "./_shared.ts";

export type BillingCycle = "weekly" | "monthly" | "quarterly" | "yearly";

export const detectBillingCycle = (period?: string | null): BillingCycle | null => {
  if (!period) return null;
  const p = String(period).toLowerCase().trim();
  if (p.startsWith("one-time") || p.includes("per project") || p === "/hour" || p.startsWith("+ ")) return null;
  if (/(^|\W)\/?week(ly|s)?\b/.test(p)) return "weekly";
  if (/(^|\W)\/?month(ly|s)?\b/.test(p)) return "monthly";
  if (/(^|\W)\/?quarter(ly|s)?\b/.test(p)) return "quarterly";
  if (/(^|\W)\/?(year(ly|s)?|yr|annual(ly)?)\b/.test(p)) return "yearly";
  return null;
};

const addCycle = (date: Date, cycle: BillingCycle): Date => {
  const d = new Date(date);
  if (cycle === "weekly") d.setDate(d.getDate() + 7);
  else if (cycle === "monthly") d.setMonth(d.getMonth() + 1);
  else if (cycle === "quarterly") d.setMonth(d.getMonth() + 3);
  else if (cycle === "yearly") d.setFullYear(d.getFullYear() + 1);
  return d;
};

type LineItem = {
  id?: string;
  name?: string;
  price?: number;
  quantity?: number;
  period?: string;
  slug?: string;
  category?: string;
};

type OrderForRecurring = {
  id: string;
  customer_email: string;
  user_id: string | null;
  invoice_number: string | null;
  currency: string | null;
  items: unknown;
};

/**
 * After an order is marked paid, scan its line items for any tier with a recurring period
 * (e.g. "/month", "/year") and upsert a matching row in customer_services so the
 * recurring-renewal cron + the customer/admin dashboards pick it up.
 *
 * Idempotent: keyed on (order_id, service_slug-or-name) so re-deliveries don't duplicate.
 */
export async function ensureRecurringServicesForOrder(
  admin: Admin,
  order: OrderForRecurring,
) {
  const items: LineItem[] = Array.isArray(order.items) ? (order.items as LineItem[]) : [];
  if (!items.length) return;

  const recurring = items
    .map((it) => ({ it, cycle: detectBillingCycle(it.period) }))
    .filter((x): x is { it: LineItem; cycle: BillingCycle } => x.cycle !== null);
  if (!recurring.length) return;

  // Find existing recurring services for this order so we don't duplicate.
  const { data: existing } = await admin
    .from("customer_services")
    .select("id, service_slug, service_name")
    .eq("order_id", order.id)
    .eq("type", "recurring");
  const seen = new Set((existing || []).map((r: { service_slug: string | null; service_name: string }) => `${r.service_slug || ""}::${r.service_name}`));

  const now = new Date();
  const rows = recurring
    .filter(({ it }) => !seen.has(`${it.slug || ""}::${it.name || ""}`))
    .map(({ it, cycle }) => ({
      user_id: order.user_id,
      customer_email: order.customer_email,
      order_id: order.id,
      invoice_number: order.invoice_number,
      service_name: it.name || "Recurring service",
      service_slug: it.slug || null,
      category: it.category || "other",
      type: "recurring" as const,
      status: "active",
      billing_cycle: cycle,
      price: Number(it.price) || 0,
      currency: order.currency || "USD",
      quantity: Number(it.quantity) || 1,
      started_at: now.toISOString(),
      current_period_end: addCycle(now, cycle).toISOString(),
      auto_renew: true,
      metadata: { source: "auto-from-order", period: it.period ?? null },
    }));

  if (!rows.length) return;
  const { error } = await admin.from("customer_services").insert(rows);
  if (error) console.error("[payment-webhook] ensureRecurringServicesForOrder insert error:", error.message);
}

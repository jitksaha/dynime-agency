import type { Admin, VerificationMeta } from "./_shared.ts";
import { ensureRecurringServicesForOrder } from "./_recurring.ts";

export async function updateOrder(
  admin: Admin,
  match: { stripe_session_id?: string; id?: string },
  status: string,
  verification?: VerificationMeta,
) {
  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (verification) patch.payment_verification = verification;
  const query = admin.from("orders").update(patch);
  const { error, data } = match.stripe_session_id
    ? await query.eq("stripe_session_id", match.stripe_session_id).select("id, customer_email, customer_name, invoice_number, user_id, total, currency, items, service_brief")
    : await query.eq("id", match.id!).select("id, customer_email, customer_name, invoice_number, user_id, total, currency, items, service_brief");
  if (error) throw new Error(`order update failed: ${error.message}`);

  if (data && data[0]) {
    const order = data[0] as { id: string; customer_email: string; customer_name: string | null; invoice_number: string | null; user_id: string | null; total: number | null; currency: string | null; items: unknown; service_brief: unknown };
    const brief = (order.service_brief || {}) as { flexpay_installment_id?: string };

    if (status === "paid") {
      try {
        if (brief?.flexpay_installment_id) {
          const { error: rpcErr } = await admin.rpc("flexpay_pay_installment", {
            _installment_id: brief.flexpay_installment_id,
            _order_id: order.id,
          });
          if (rpcErr) console.error("[payment-webhook] flexpay_pay_installment failed:", rpcErr);
        }
      } catch (err) {
        console.error("[payment-webhook] flexpay installment finalize failed:", err);
      }
      try { await ensureAccountAndSendMagicLink(admin, order); } catch (err) { console.error("[payment-webhook] post-payment account/magic link failed:", err); }
      try { await sendOrderStatusEmail(admin, order, "received"); } catch (err) { console.error("[payment-webhook] order-received email failed:", err); }
      try { await ensureRecurringServicesForOrder(admin, order); } catch (err) { console.error("[payment-webhook] ensureRecurringServicesForOrder failed:", err); }
    } else if (status === "failed" || status === "cancelled") {
      try {
        if (brief?.flexpay_installment_id) {
          const { error: rpcErr } = await admin.rpc("flexpay_mark_installment_failed", {
            _installment_id: brief.flexpay_installment_id,
            _reason: `Payment ${status}`,
            _order_id: order.id,
          });
          if (rpcErr) console.error("[payment-webhook] flexpay_mark_installment_failed failed:", rpcErr);
        }
      } catch (err) {
        console.error("[payment-webhook] flexpay installment fail-mark failed:", err);
      }
    }
  }
  return data?.length ?? 0;
}

export async function sendOrderStatusEmail(
  admin: Admin,
  order: { id: string; customer_email: string; customer_name: string | null; invoice_number: string | null; total: number | null; currency: string | null; items: unknown; service_brief: unknown },
  status: "received" | "in_progress" | "completed",
  note?: string,
) {
  const email = order.customer_email?.trim().toLowerCase();
  if (!email) return;
  const items = Array.isArray(order.items) ? order.items as Array<{ name?: string }> : [];
  const primaryService = items[0]?.name || (order.service_brief as { primary_service?: string } | null)?.primary_service || undefined;
  const total = order.total != null ? `${order.currency || "USD"} ${Number(order.total).toFixed(2)}` : undefined;
  await admin.functions.invoke("send-transactional-email", {
    body: {
      templateName: "order-status-update",
      recipientEmail: email,
      idempotencyKey: `order-${order.id}-${status}`,
      templateData: {
        name: order.customer_name || undefined,
        status,
        orderNumber: order.id,
        invoiceNumber: order.invoice_number || undefined,
        primaryService,
        total,
        note,
      },
    },
  });
}

export async function ensureAccountAndSendMagicLink(
  admin: Admin,
  order: { id: string; customer_email: string; customer_name: string | null; invoice_number: string | null; user_id: string | null },
) {
  const email = order.customer_email?.trim().toLowerCase();
  if (!email) return;
  const siteUrl = Deno.env.get("SITE_URL") || "";
  const redirectTo = `${siteUrl || ""}/invoice/${order.invoice_number || order.id}`.replace(/^\/+/, siteUrl ? "" : "");

  let userId = order.user_id;
  if (!userId) {
    try {
      // @ts-ignore admin api
      const { data: list } = await (admin as any).auth.admin.listUsers({ page: 1, perPage: 1, email });
      const existing = list?.users?.[0];
      if (existing) userId = existing.id;
    } catch (_) { /* ignore */ }
  }

  if (!userId) {
    try {
      // @ts-ignore admin api
      const { data: created, error: cErr } = await (admin as any).auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: order.customer_name || "" },
      });
      if (cErr) console.warn("[webhook] createUser:", cErr.message);
      if (created?.user) userId = created.user.id;
    } catch (err) {
      console.warn("[webhook] createUser exception:", err);
    }
  }

  if (userId && !order.user_id) {
    await admin.from("orders").update({ user_id: userId }).eq("id", order.id);
  }

  try {
    // @ts-ignore admin api
    await (admin as any).auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: redirectTo || undefined },
    });
  } catch (err) {
    console.warn("[webhook] generateLink:", err);
  }
}

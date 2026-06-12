import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/integrations/db/client";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Package,
  Pencil,
  RefreshCw,
  ServerCog,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Link2,
  RotateCcw,
} from "lucide-react";

const PUBLIC_INVOICE_HOST = "https://dynime.com";
const buildPublicInvoiceUrl = (ref: string) => `${PUBLIC_INVOICE_HOST}/invoice/${ref}`;
import { format } from "date-fns";
import BookingStatusCard from "@/components/orders/BookingStatusCard";
import OrderMilestones from "@/components/orders/OrderMilestones";
import { useOrdersRealtime } from "@/hooks/useOrdersRealtime";
import { apiGet, apiPatch } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";

type VerificationMeta = {
  provider?: string;
  verified_at?: string;
  signature_valid?: boolean | null;
  server_query_used?: boolean;
  invoice_mismatch?: boolean | null;
  authoritative_status?: string | null;
  retry_attempts?: number;
  retry_exhausted?: boolean;
  notes?: string;
};

type OrderRow = {
  id: string;
  status: string;
  total: number;
  items: Array<{ id?: string; name: string; price: number; quantity: number }>;
  customer_name: string | null;
  customer_email: string;
  stripe_session_id: string | null;
  created_at: string;
  updated_at: string;
  payment_verification: VerificationMeta | null;
  coupon_code?: string | null;
  discount_amount?: number | null;
  service_brief?: Record<string, any> | null;
};

const STATUS_OPTIONS = [
  "pending",
  "confirmed",
  "processing",
  "completed",
  "cancelled",
  "refunded",
];

const statusColor: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20 font-semibold",
  confirmed: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  processing: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  paid: "bg-green-500/10 text-green-600 border-green-500/20",
  completed: "bg-green-500/10 text-green-600 border-green-500/20",
  cancelled: "bg-muted text-muted-foreground border-border",
  refunded: "bg-red-500/10 text-red-600 border-red-500/20",
  failed: "bg-destructive/10 text-destructive border-destructive/30",
};

const toneClass = (tone: "good" | "warn" | "bad" | "neutral") =>
  tone === "good"
    ? "text-green-600 dark:text-green-500"
    : tone === "warn"
      ? "text-yellow-600 dark:text-yellow-500"
      : tone === "bad"
        ? "text-destructive"
        : "text-muted-foreground";

const copy = async (value: string, label = "Copied") => {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(label);
  } catch {
    toast.error("Copy failed");
  }
};

const AdminOrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useOrdersRealtime(`admin-order-detail-${id ?? "none"}`, [
    ["admin-order", id],
    ["admin-orders"],
  ]);

  const { data: order, isLoading, error } = useQuery({
    queryKey: ["admin-order", id],
    queryFn: async () => {
      return apiGet<OrderRow>(`/orders/${id}`);
    },
    enabled: !!id,
    refetchInterval: 4000,
  });

  const verification = order?.payment_verification ?? null;

  const updateStatus = async (newStatus: string) => {
    if (!order) return;
    const prevStatus = order.status;
    try {
      await apiPatch(`/orders/${order.id}`, { status: newStatus });
    } catch (err: any) {
      toast.error(err?.message || "Failed to update status");
      return;
    }
    toast.success(`Status set to ${newStatus}`);

    // Send a customer email when the order moves into work or is delivered.
    // Skip if the status hasn't actually changed.
    const emailStatus =
      newStatus === "processing"
        ? "in_progress"
        : newStatus === "completed"
          ? "completed"
          : null;
    if (emailStatus && newStatus !== prevStatus) {
      const items = Array.isArray(order.items) ? order.items : [];
      const primaryService = items[0]?.name;
      const total =
        order.total != null
          ? formatCurrency(Number(order.total), (order as any).currency || "USD")
          : undefined;
      try {
        await db.functions.invoke("send-transactional-email", {
          body: {
            templateName: "order-status-update",
            recipientEmail: order.customer_email,
            idempotencyKey: `order-${order.id}-${emailStatus}`,
            templateData: {
              name: order.customer_name || undefined,
              status: emailStatus,
              orderNumber: order.id,
              invoiceNumber: (order as any).invoice_number || undefined,
              primaryService,
              total,
            },
          },
        });
      } catch (err) {
        console.error("status email failed", err);
      }
    }

    qc.invalidateQueries({ queryKey: ["admin-order", order.id] });
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
  };

  const handleRefund = async () => {
    if (!order) return;
    const o: any = order;
    const totalPaid = Number(o.total || 0);
    const alreadyRefunded = Number(o.refunded_amount || 0);
    const remaining = Math.max(0, Math.round((totalPaid - alreadyRefunded) * 100) / 100);
    if (remaining <= 0) {
      toast.error("Nothing left to refund on this order.");
      return;
    }
    const input = window.prompt(
      `Refund amount (max $${remaining.toFixed(2)}).\nEnter the dollar amount to refund, or leave blank for full refund.`,
      remaining.toFixed(2),
    );
    if (input === null) return;
    const amount = Math.round((parseFloat(input) || remaining) * 100) / 100;
    if (!(amount > 0) || amount > remaining + 0.001) {
      toast.error(`Amount must be between $0.01 and $${remaining.toFixed(2)}`);
      return;
    }
    const reason = window.prompt("Reason (optional, shown in admin logs):", o.refund_reason || "") || null;

    // Proportional VAT refund based on share of total.
    const orderTax = Number(o.tax_amount || 0);
    const taxShare = totalPaid > 0 ? amount / totalPaid : 0;
    const taxRefund = Math.round(orderTax * taxShare * 100) / 100;
    const newRefundedAmount = Math.round((alreadyRefunded + amount) * 100) / 100;
    const newRefundedTax = Math.round((Number(o.refunded_tax_amount || 0) + taxRefund) * 100) / 100;
    const isFull = newRefundedAmount >= totalPaid - 0.005;

    try {
      await apiPatch(`/orders/${order.id}`, {
        refunded_amount: newRefundedAmount,
        refunded_tax_amount: newRefundedTax,
        refunded_at: new Date().toISOString(),
        refund_reason: reason,
        ...(isFull ? { status: "refunded" } : {}),
      });
    } catch (err: any) {
      toast.error(err?.message || "Refund failed");
      return;
    }
    toast.success(
      isFull
        ? `Fully refunded $${amount.toFixed(2)} (incl. $${taxRefund.toFixed(2)} VAT)`
        : `Partial refund $${amount.toFixed(2)} recorded (VAT $${taxRefund.toFixed(2)})`,
    );
    qc.invalidateQueries({ queryKey: ["admin-order", order.id] });
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
    qc.invalidateQueries({ queryKey: ["dash-orders"] });
  };



  if (isLoading) {
    return (
      <SuperAdminLayout>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading order…
        </div>
      </SuperAdminLayout>
    );
  }

  if (error || !order) {
    return (
      <SuperAdminLayout>
        <div className="max-w-md mx-auto text-center py-12">
          <Package className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <h1 className="text-lg font-semibold text-foreground mb-1">Order not found</h1>
          <p className="text-sm text-muted-foreground mb-4">
            We couldn't find an order with that ID.
          </p>
          <Button variant="outline" onClick={() => navigate("/superadmin/orders")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to orders
          </Button>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="min-w-0">
          <Link
            to="/superadmin/orders"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to orders
          </Link>
          <h1 className="font-heading text-2xl font-bold text-foreground truncate">
            Order details
          </h1>
          <button
            onClick={() => copy((order as any).invoice_number || order.id, "Invoice ID copied")}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground mt-1"
            title="Copy invoice ID"
          >
            {(order as any).invoice_number || order.id}
            <Copy className="w-3 h-3" />
          </button>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${
              statusColor[order.status] || ""
            }`}
          >
            {order.status === "pending" ? "Dont Miss It" : order.status}
          </span>
          <Select value={order.status} onValueChange={updateStatus}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link to={`/superadmin/orders/${order.id}/edit`}>
              <Pencil className="w-4 h-4" /> Edit
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <a href={`/invoice/${(order as any).invoice_number || order.id}`} target="_blank" rel="noopener noreferrer">
              <FileText className="w-4 h-4" /> Invoice
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={async () => {
              const url = buildPublicInvoiceUrl((order as any).invoice_number || order.id);
              try {
                await navigator.clipboard.writeText(url);
                toast.success("Public invoice link copied", { description: url });
              } catch {
                toast.error("Could not copy link");
              }
            }}
            title="Copy public invoice link to send to client"
          >
            <Link2 className="w-4 h-4" /> Copy link
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
            onClick={handleRefund}
            disabled={Number((order as any).refunded_amount || 0) >= Number(order.total || 0) - 0.005}
            title="Refund or void this order (full or partial)"
          >
            <RotateCcw className="w-4 h-4" /> Refund
          </Button>
          <Button asChild variant="hero" size="sm" className="gap-1.5">
            <a href={`/invoice/${(order as any).invoice_number || order.id}?print=1`} target="_blank" rel="noopener noreferrer">
              <Download className="w-4 h-4" /> PDF
            </a>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Order summary */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer & meta */}
          <div className="glass-card p-5 grid grid-cols-2 gap-4 text-sm">
            <Field label="Customer" value={order.customer_name || "—"} />
            <Field label="Email" value={order.customer_email} />
            <Field
              label="Created"
              value={format(new Date(order.created_at), "MMM d, yyyy h:mm a")}
            />
            <Field
              label="Last updated"
              value={format(new Date(order.updated_at), "MMM d, yyyy h:mm a")}
            />
            <div className="col-span-2">
              <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">
                Payment reference
              </p>
              {order.stripe_session_id ? (
                <button
                  onClick={() => copy(order.stripe_session_id!, "Reference copied")}
                  className="inline-flex items-center gap-1.5 text-xs font-mono text-foreground hover:text-primary"
                >
                  {order.stripe_session_id}
                  <Copy className="w-3 h-3" />
                </button>
              ) : (
                <p className="text-muted-foreground text-sm">—</p>
              )}
            </div>
          </div>

          {/* Booking (consultancy) */}
          {order.service_brief?.booking && (
            <BookingStatusCard
              orderId={order.id}
              serviceBrief={order.service_brief}
              editable
              onUpdated={() => qc.invalidateQueries({ queryKey: ["admin-order", order.id] })}
            />
          )}

          {/* Milestone payments */}
          <OrderMilestones orderId={order.id} admin />
          {/* Items */}
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Items</h2>
              <span className="text-xs text-muted-foreground">
                {(order.items?.length ?? 0)} line
                {order.items?.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="divide-y divide-border">
              {(Array.isArray(order.items) ? order.items : []).map((item, i) => (
                <div
                  key={item.id ?? i}
                  className="flex justify-between items-center p-4 text-sm"
                >
                  <div>
                    <div className="text-foreground font-medium">{item.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {formatCurrency(Number(item.price), (order as any).currency || "USD")} × {item.quantity}
                    </div>
                  </div>
                  <span className="font-medium text-foreground">
                    {formatCurrency(Number(item.price) * Number(item.quantity), (order as any).currency || "USD")}
                  </span>
                </div>
              ))}
              <div className="flex justify-between items-center p-4 bg-secondary/30">
                <span className="font-bold text-foreground">Total</span>
                <span className="font-heading font-bold text-lg text-foreground">
                  {formatCurrency(Number(order.total), (order as any).currency || "USD")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Verification */}
        <div className="lg:col-span-1">
          <VerificationCard meta={verification} order={order} />
        </div>
      </div>
    </SuperAdminLayout>
  );
};

const Field = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">{label}</p>
    <p className="text-foreground">{value}</p>
  </div>
);

const VerificationCard = ({
  meta,
  order,
}: {
  meta: VerificationMeta | null;
  order: OrderRow;
}) => {
  const sigTone: "good" | "warn" | "bad" | "neutral" =
    meta?.signature_valid === true
      ? "good"
      : meta?.signature_valid === false
        ? "bad"
        : "neutral";
  const sigLabel =
    meta?.signature_valid === true
      ? "Valid"
      : meta?.signature_valid === false
        ? "Invalid"
        : "Not configured";
  const SigIcon =
    meta?.signature_valid === false
      ? ShieldAlert
      : meta?.signature_valid === true
        ? ShieldCheck
        : ShieldQuestion;

  const queryTone: "good" | "warn" = meta?.server_query_used ? "good" : "warn";
  const queryLabel = meta?.server_query_used
    ? "Confirmed via provider API"
    : "Not used (trusting webhook payload)";

  const mismatchTone: "good" | "warn" | "bad" | "neutral" =
    meta?.invoice_mismatch === true
      ? "bad"
      : meta?.invoice_mismatch === false
        ? "good"
        : "neutral";
  const mismatchLabel =
    meta?.invoice_mismatch === true
      ? "Mismatch detected"
      : meta?.invoice_mismatch === false
        ? "Matches order"
        : "Not applicable";
  const MismatchIcon = meta?.invoice_mismatch === true ? ShieldAlert : ShieldCheck;

  const verifiedAt = meta?.verified_at
    ? new Date(meta.verified_at).toLocaleString()
    : null;

  const isWebhookPayment = order.payment_gateway !== "manual" && order.payment_gateway !== "bank_transfer";
  const webhookTone = isWebhookPayment ? "good" : "neutral";
  const webhookLabel = isWebhookPayment ? "Webhook Payment" : "Not Webhook Payment";
  const webhookHint = isWebhookPayment
    ? "Automated verification via provider callback webhooks."
    : "Offline payment method. No automated webhooks are used.";

  return (
    <div className="glass-card p-5 space-y-4 sticky top-6">
      <div className="flex items-center justify-between border-b border-border pb-2.5">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payment verification</span>
        </div>
        {meta?.provider && (
          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
            {meta.provider}
          </Badge>
        )}
      </div>

      <VerificationBlock
        Icon={ServerCog}
        label="Webhook Integration"
        value={webhookLabel}
        tone={webhookTone}
        hint={webhookHint}
      />

      {!meta ? (
        <div className="rounded-lg border border-dashed border-border p-4 text-center">
          <ShieldQuestion className="w-6 h-6 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-xs text-muted-foreground">
            No verification record yet. The webhook hasn't reported on this order.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <VerificationBlock
            Icon={SigIcon}
            label="Signature validity"
            value={sigLabel}
            tone={sigTone}
            hint="HMAC of the callback payload, checked against the configured signing secret."
          />
          <VerificationBlock
            Icon={ServerCog}
            label="Server-to-server query"
            value={queryLabel}
            tone={queryTone}
            hint="Whether we re-fetched the authoritative status directly from the provider's API."
          />
          <VerificationBlock
            Icon={MismatchIcon}
            label="Invoice mismatch"
            value={mismatchLabel}
            tone={mismatchTone}
            hint="True if the invoice number returned by the provider doesn't match this order."
          />
          <VerificationBlock
            Icon={ShieldCheck}
            label="Authoritative status"
            value={meta.authoritative_status || "—"}
            tone="neutral"
            hint="The raw status reported by the provider after server-side verification."
          />
          {typeof meta.retry_attempts === "number" && meta.retry_attempts > 0 && (
            <VerificationBlock
              Icon={meta.retry_exhausted ? ShieldAlert : RefreshCw}
              label="Provider API attempts"
              value={
                meta.retry_exhausted
                  ? `${meta.retry_attempts} (retries exhausted)`
                  : `${meta.retry_attempts}${meta.retry_attempts > 1 ? " (auto-retried)" : ""}`
              }
              tone={
                meta.retry_exhausted ? "warn" : meta.retry_attempts > 1 ? "warn" : "good"
              }
              hint="Total calls to the provider's API for this order, including automatic retries on transient failures."
            />
          )}
          {verifiedAt && (
            <VerificationBlock
              Icon={Clock}
              label="Verified at"
              value={verifiedAt}
              tone="neutral"
            />
          )}
          {meta.notes && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 text-xs leading-relaxed text-yellow-700 dark:text-yellow-500">
              <p className="font-medium mb-1">Notes</p>
              {meta.notes}
            </div>
          )}
        </div>
      )}

      {order.stripe_session_id && (
        <div className="pt-3 border-t border-border">
          <Link
            to={`/payment/status/${encodeURIComponent(order.stripe_session_id)}`}
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            View customer-facing status page
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      )}
    </div>
  );
};

const VerificationBlock = ({
  Icon,
  label,
  value,
  tone,
  hint,
}: {
  Icon: typeof ShieldCheck;
  label: string;
  value: string;
  tone: "good" | "warn" | "bad" | "neutral";
  hint?: string;
}) => (
  <div className="rounded-lg border border-border bg-muted/30 p-3">
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-2 min-w-0">
        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${toneClass(tone)}`} />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`text-sm font-medium ${toneClass(tone)} truncate`}>{value}</p>
        </div>
      </div>
    </div>
    {hint && (
      <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">{hint}</p>
    )}
  </div>
);

export default AdminOrderDetail;

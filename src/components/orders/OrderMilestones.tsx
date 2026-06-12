import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/integrations/db/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, FileText, Loader2, Receipt, Truck, Send } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useState } from "react";

type Milestone = {
  id: string;
  parent_order_id: string;
  child_order_id: string | null;
  sequence: number;
  label: string;
  percent: number;
  amount: number;
  currency: string;
  status: "pending" | "invoiced" | "paid" | "cancelled";
  invoiced_at: string | null;
  paid_at: string | null;
  metadata: Record<string, any> | null;
};

interface Props {
  orderId: string;
  /** When true, show admin actions (mark delivered, generate next invoice, send reminder). */
  admin?: boolean;
}

const statusBadge = (s: Milestone["status"]) => {
  switch (s) {
    case "paid":
      return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Paid</Badge>;
    case "invoiced":
      return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30">Invoiced</Badge>;
    case "cancelled":
      return <Badge variant="secondary">Cancelled</Badge>;
    default:
      return <Badge variant="outline">Pending</Badge>;
  }
};

const OrderMilestones = ({ orderId, admin }: Props) => {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: parentOrder } = useQuery({
    queryKey: ["order-milestones-parent", orderId],
    queryFn: async () => {
      const { data, error } = await db
        .from("orders")
        .select("id, customer_email, customer_name, invoice_number")
        .eq("id", orderId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["order-milestones", orderId],
    queryFn: async () => {
      const { data, error } = await db
        .from("order_milestones")
        .select("*")
        .eq("parent_order_id", orderId)
        .order("sequence", { ascending: true });
      if (error) throw error;
      return (data || []) as Milestone[];
    },
  });

  const sendMilestoneEmail = async (
    kind: "invoice" | "reminder",
    milestone: Milestone,
    childInvoiceNumber?: string | null,
    childOrderId?: string | null
  ) => {
    if (!parentOrder?.customer_email) return;
    const ref = childInvoiceNumber || childOrderId;
    if (!ref) return;
    const payUrl = `${window.location.origin}/invoice/${ref}`;
    try {
      await db.functions.invoke("send-transactional-email", {
        body: {
          templateName: "order-status-update",
          recipientEmail: parentOrder.customer_email,
          idempotencyKey: `milestone-${milestone.id}-${kind}-${Date.now()}`,
          templateData: {
            name: parentOrder.customer_name || undefined,
            status:
              kind === "invoice"
                ? `Milestone ${milestone.sequence} (${milestone.label}) ready for payment`
                : `Reminder: Milestone ${milestone.sequence} (${milestone.label}) awaiting payment`,
            orderNumber: parentOrder.invoice_number || parentOrder.id,
            invoiceNumber: childInvoiceNumber || undefined,
            primaryService: `${milestone.label} — ${milestone.percent}%`,
            total: `${milestone.currency} ${Number(milestone.amount).toFixed(2)}`,
            ctaUrl: payUrl,
          },
        },
      });
    } catch (err) {
      console.error("milestone email failed", err);
    }
  };

  const generateNext = async (m: Milestone, opts?: { silent?: boolean }) => {
    const { data: newId, error } = await db.rpc("generate_next_milestone_invoice", {
      _milestone_id: m.id,
    });
    if (error) {
      toast.error(error.message);
      return null;
    }
    let childInvoice: string | null = null;
    if (newId) {
      const { data: child } = await db
        .from("orders")
        .select("invoice_number")
        .eq("id", newId)
        .maybeSingle();
      childInvoice = child?.invoice_number || null;
    }
    await sendMilestoneEmail("invoice", m, childInvoice, newId as string);
    if (!opts?.silent) {
      toast.success(`Stage ${m.sequence} invoice created and emailed`);
    }
    return { newOrderId: newId as string, invoiceNumber: childInvoice };
  };

  const markDeliveredAndInvoice = async (m: Milestone) => {
    setBusyId(m.id);
    try {
      // 1) record delivered timestamp in metadata
      const meta = { ...(m.metadata || {}), delivered_at: new Date().toISOString() };
      const { error: upErr } = await db
        .from("order_milestones")
        .update({ metadata: meta })
        .eq("id", m.id);
      if (upErr) throw upErr;

      // 2) find next pending milestone and invoice it
      const next = (data || []).find((x) => x.sequence > m.sequence && x.status === "pending");
      if (next) {
        const result = await generateNext(next, { silent: true });
        toast.success(
          `Stage ${m.sequence} marked delivered. Stage ${next.sequence} invoice sent to customer.`
        );
        qc.invalidateQueries({ queryKey: ["order-milestones", orderId] });
        return result;
      } else {
        toast.success(`Stage ${m.sequence} marked delivered. No further stages remain.`);
        qc.invalidateQueries({ queryKey: ["order-milestones", orderId] });
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to mark delivered");
    } finally {
      setBusyId(null);
    }
  };

  const sendReminder = async (m: Milestone) => {
    if (!m.child_order_id) return;
    setBusyId(m.id);
    try {
      const { data: child } = await db
        .from("orders")
        .select("invoice_number")
        .eq("id", m.child_order_id)
        .maybeSingle();
      await sendMilestoneEmail("reminder", m, child?.invoice_number, m.child_order_id);
      toast.success(`Reminder sent for stage ${m.sequence}`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to send reminder");
    } finally {
      setBusyId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="glass-card p-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading milestones…
      </div>
    );
  }
  if (!data || data.length === 0) return null;

  const totalProject = data.reduce((s, m) => s + Number(m.amount), 0);
  const paid = data.filter((m) => m.status === "paid").reduce((s, m) => s + Number(m.amount), 0);
  const progress = totalProject > 0 ? Math.round((paid / totalProject) * 100) : 0;

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" /> Milestone payments
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            ${paid.toFixed(2)} of ${totalProject.toFixed(2)} paid · {progress}% complete
          </p>
        </div>
        <div className="w-28 h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="divide-y divide-border">
        {data.map((m) => {
          const delivered = !!(m.metadata as any)?.delivered_at;
          const isBusy = busyId === m.id;
          return (
            <div key={m.id} className="p-4 flex items-center justify-between gap-3 text-sm">
              <div className="flex items-start gap-3">
                {m.status === "paid" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground mt-0.5" />
                )}
                <div>
                  <div className="font-medium text-foreground">
                    {m.sequence}. {m.label}{" "}
                    <span className="text-xs text-muted-foreground">({m.percent}%)</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                    {statusBadge(m.status)}
                    {delivered && (
                      <Badge variant="outline" className="border-emerald-500/30 text-emerald-600">
                        <Truck className="w-3 h-3 mr-1" />Delivered
                      </Badge>
                    )}
                    {m.invoiced_at && (
                      <span>Invoiced {new Date(m.invoiced_at).toLocaleDateString()}</span>
                    )}
                    {m.paid_at && <span>· Paid {new Date(m.paid_at).toLocaleDateString()}</span>}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <div className="font-semibold text-foreground">
                  ${Number(m.amount).toFixed(2)}
                </div>

                {/* Admin actions */}
                {admin && m.status === "paid" && !delivered && (
                  <Button
                    size="sm"
                    variant="hero"
                    disabled={isBusy}
                    onClick={() => markDeliveredAndInvoice(m)}
                  >
                    {isBusy ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <Truck className="w-3 h-3 mr-1" />
                    )}
                    Mark delivered & invoice next
                  </Button>
                )}
                {admin && m.status === "pending" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isBusy}
                    onClick={async () => {
                      setBusyId(m.id);
                      try {
                        await generateNext(m);
                        qc.invalidateQueries({ queryKey: ["order-milestones", orderId] });
                      } finally {
                        setBusyId(null);
                      }
                    }}
                  >
                    <FileText className="w-3 h-3 mr-1" /> Generate & email invoice
                  </Button>
                )}
                {admin && m.status === "invoiced" && m.child_order_id && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isBusy}
                    onClick={() => sendReminder(m)}
                  >
                    {isBusy ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <Send className="w-3 h-3 mr-1" />
                    )}
                    Send reminder
                  </Button>
                )}

                {/* Customer action */}
                {!admin && m.status === "invoiced" && m.child_order_id && (
                  <Button asChild size="sm" variant="hero">
                    <Link to={`/checkout?retry=${m.child_order_id}`}>Pay now</Link>
                  </Button>
                )}

                {admin && m.child_order_id && m.child_order_id !== m.parent_order_id && (
                  <Link
                    to={`/superadmin/orders/${m.child_order_id}`}
                    className="text-xs text-primary hover:underline"
                  >
                    View child order →
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderMilestones;

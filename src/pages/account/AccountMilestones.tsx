import { Link } from "react-router-dom";
import AccountLayout from "@/components/account/AccountLayout";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/integrations/db/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Layers, CheckCircle2, Clock, FileText } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";

type Milestone = {
  id: string;
  parent_order_id: string;
  child_order_id: string | null;
  sequence: number;
  label: string;
  percent: number;
  amount: number;
  currency: string;
  status: string;
  paid_at: string | null;
  invoiced_at: string | null;
};

type ParentOrder = {
  id: string;
  invoice_number: string | null;
  total: number;
  currency: string | null;
  created_at: string;
  status: string;
};

type ChildOrder = {
  id: string;
  invoice_number: string | null;
  status: string;
};

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    paid: "bg-green-500/10 text-green-600 border-green-500/20",
    invoiced: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  };
  return map[s] || "bg-muted text-muted-foreground border-border";
};

const fmt = (n: number, c = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(Number(n || 0));

const AccountMilestones = () => {
  usePageTitle("Milestone Payments");
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["account-milestones", user?.email],
    queryFn: async () => {
      // 1) parent orders for this customer
      const { data: parents, error: pErr } = await db
        .from("orders")
        .select("id, invoice_number, total, currency, created_at, status")
        .eq("customer_email", user!.email!)
        .order("created_at", { ascending: false });
      if (pErr) throw pErr;
      const parentIds = (parents || []).map((o) => o.id);
      if (parentIds.length === 0) return { groups: [] as any[] };

      // 2) milestones referencing those parents
      const { data: milestones, error: mErr } = await db
        .from("order_milestones")
        .select("*")
        .in("parent_order_id", parentIds)
        .order("sequence", { ascending: true });
      if (mErr) throw mErr;
      const ms = (milestones || []) as Milestone[];

      // 3) child orders for "pay now" links
      const childIds = ms.map((m) => m.child_order_id).filter(Boolean) as string[];
      let children: ChildOrder[] = [];
      if (childIds.length) {
        const { data: c } = await db
          .from("orders")
          .select("id, invoice_number, status")
          .in("id", childIds);
        children = (c || []) as ChildOrder[];
      }
      const childMap = new Map(children.map((c) => [c.id, c]));

      // group by parent
      const byParent = new Map<string, Milestone[]>();
      ms.forEach((m) => {
        if (!byParent.has(m.parent_order_id)) byParent.set(m.parent_order_id, []);
        byParent.get(m.parent_order_id)!.push(m);
      });

      const groups = (parents || [])
        .filter((p) => byParent.has(p.id))
        .map((p) => ({
          parent: p as ParentOrder,
          milestones: byParent.get(p.id) || [],
          childMap,
        }));

      return { groups };
    },
    enabled: !!user?.email,
  });

  return (
    <AccountLayout
      title="Milestone Payments"
      description="Track each stage of your milestone-based orders and pay the next installment when ready."
    >
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : !data?.groups.length ? (
        <div className="rounded-2xl border border-border bg-card text-center py-12">
          <Layers className="w-14 h-14 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="font-heading text-lg font-semibold mb-1">No milestone orders</h3>
          <p className="text-sm text-muted-foreground">
            Orders placed with a milestone coupon will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {data.groups.map(({ parent, milestones, childMap }) => {
            const currency = milestones[0]?.currency || parent.currency || "USD";
            const paid = milestones
              .filter((m) => m.status === "paid")
              .reduce((s, m) => s + Number(m.amount || 0), 0);
            const remaining = milestones
              .filter((m) => m.status !== "paid")
              .reduce((s, m) => s + Number(m.amount || 0), 0);
            const nextPayable = milestones.find((m) => m.status === "invoiced" && m.child_order_id);

            return (
              <div key={parent.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 border-b border-border flex flex-wrap items-center justify-between gap-3 bg-secondary/20">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <Link
                        to={`/invoice/${parent.invoice_number || parent.id}`}
                        className="font-heading font-semibold hover:text-primary"
                      >
                        {parent.invoice_number || parent.id.slice(0, 8)}
                      </Link>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Total {fmt(parent.total, currency)} · placed{" "}
                      {new Date(parent.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Paid</div>
                      <div className="font-semibold text-green-600">{fmt(paid, currency)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Remaining</div>
                      <div className="font-semibold">{fmt(remaining, currency)}</div>
                    </div>
                    {nextPayable && (
                      <Button asChild size="sm">
                        <Link
                          to={`/invoice/${
                            childMap.get(nextPayable.child_order_id!)?.invoice_number ||
                            nextPayable.child_order_id
                          }`}
                        >
                          Pay next ({fmt(nextPayable.amount, currency)})
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Stages */}
                <ol className="divide-y divide-border">
                  {milestones.map((m) => {
                    const child = m.child_order_id ? childMap.get(m.child_order_id) : null;
                    const isPaid = m.status === "paid";
                    const isInvoiced = m.status === "invoiced";
                    return (
                      <li
                        key={m.id}
                        className="px-5 py-4 flex flex-wrap items-center gap-3 justify-between"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                              isPaid
                                ? "bg-green-500/10 text-green-600"
                                : isInvoiced
                                ? "bg-blue-500/10 text-blue-600"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {isPaid ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium truncate">
                              Stage {m.sequence} · {m.label}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {Number(m.percent)}% · {fmt(m.amount, m.currency)}
                              {m.paid_at && ` · paid ${new Date(m.paid_at).toLocaleDateString()}`}
                              {!m.paid_at && m.invoiced_at &&
                                ` · invoiced ${new Date(m.invoiced_at).toLocaleDateString()}`}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={statusBadge(m.status)}>
                            {m.status}
                          </Badge>
                          {isInvoiced && child && (
                            <Button asChild size="sm" variant="outline">
                              <Link to={`/invoice/${child.invoice_number || child.id}`}>
                                Pay now
                              </Link>
                            </Button>
                          )}
                          {m.status === "pending" && (
                            <span className="text-xs text-muted-foreground">
                              Awaiting delivery
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            );
          })}
        </div>
      )}
    </AccountLayout>
  );
};

export default AccountMilestones;

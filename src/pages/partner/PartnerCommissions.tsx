import { useState, useEffect, useCallback } from "react";
import { NavLink } from "react-router-dom";
import { usePageTitle } from "@/hooks/use-page-title";
import { useSEO } from "@/hooks/use-seo";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { useSocket } from "@/hooks/useSocket";
import AccountLayout from "@/components/account/AccountLayout";
import { ReferralTabs } from "./PartnerDashboard";
import {
  AlertCircle,
  PackageOpen,
  HandCoins,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Commission {
  id: string;
  serviceName: string;
  orderAmount: number;
  commission: number;
  status: "pending" | "approved" | "paid";
  createdAt: string;
  invoiceNumber?: string | null;
  referralCoolingPeriodDays: number;
}

const getTimeUntilApproved = (createdAt: string, coolingDays: number, status: string) => {
  if (status === "approved" || status === "paid") {
    return <span className="text-emerald-500 font-medium">Approved</span>;
  }
  const createdDate = new Date(createdAt);
  const approvalDate = new Date(createdDate.getTime() + coolingDays * 24 * 60 * 60 * 1000);
  const now = new Date();
  
  const diffTime = approvalDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 0) {
    return <span className="text-blue-500 font-medium">Processing</span>;
  }
  return (
    <span className="text-muted-foreground font-medium">
      {diffDays} {diffDays === 1 ? "day" : "days"} left
    </span>
  );
};

// ─── Status badge ─────────────────────────────────────────────────────────────

type CommissionStatus = Commission["status"];

const STATUS_STYLES: Record<CommissionStatus, string> = {
  pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  approved: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  paid: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
};

const StatusBadge = ({ status }: { status: CommissionStatus }) => (
  <span
    className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border",
      STATUS_STYLES[status]
    )}
  >
    {status}
  </span>
);

// ─── Main component ───────────────────────────────────────────────────────────

const PartnerCommissions = () => {
  usePageTitle("Referral Program");
  useSEO({ title: "Referral Program - Commissions", noIndex: true });

  const { user } = useAuth();
  const { socket } = useSocket();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<any[]>("/referrals/partner/commissions");
      
      // Map NestJS snake_case schema to camelCase typescript frontend models
      const mapped = (data ?? []).map((c: any) => ({
        id: c.id,
        serviceName: c.service_name,
        orderAmount: Number(c.order_amount),
        commission: Number(c.commission_amount),
        status: c.status,
        createdAt: c.created_at,
        invoiceNumber: c.invoice_number,
        referralCoolingPeriodDays: Number(c.referral_cooling_period_days || 14),
      }));
      setCommissions(mapped);
    } catch (e: any) {
      if (e?.message === "Partner profile not found") {
        window.location.href = "/partner"; // Redirect to register
        return;
      }
      setError(e?.message ?? "Failed to load commissions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handleReferralUpdated = (data: any) => {
      console.log("[PartnerCommissions] Real-time referral update received:", data);
      if (data?.userId === user?.id || !data?.userId) {
        load();
      }
    };

    socket.on("referral-updated", handleReferralUpdated);

    return () => {
      socket.off("referral-updated", handleReferralUpdated);
    };
  }, [socket, user, load]);

  // Summary tallies
  const totals = commissions.reduce(
    (acc, c) => {
      acc.total += c.commission;
      if (c.status === "pending") acc.pending += c.commission;
      if (c.status === "approved") acc.approved += c.commission;
      if (c.status === "paid") acc.paid += c.commission;
      return acc;
    },
    { total: 0, pending: 0, approved: 0, paid: 0 }
  );

  return (
    <AccountLayout
      title="Referral Program"
      description="Full record of every commission earned through your referrals."
    >
      <ReferralTabs />

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl bg-muted/40" />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-foreground font-semibold text-lg mb-2">
            Failed to load commissions
          </h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-xs">{error}</p>
          <button
            onClick={load}
            className="px-5 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium border border-primary/20 hover:bg-primary/20 transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <div className="space-y-6">
          {/* Summary row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[
              {
                label: "Total Earned",
                value: `$${totals.total.toFixed(2)}`,
                cls: "from-primary/10 to-primary/5 text-primary",
              },
              {
                label: "Pending",
                value: `$${totals.pending.toFixed(2)}`,
                cls: "from-amber-500/10 to-amber-500/5 text-amber-500",
              },
              {
                label: "Approved",
                value: `$${totals.approved.toFixed(2)}`,
                cls: "from-blue-500/10 to-blue-500/5 text-blue-500",
              },
              {
                label: "Paid Out",
                value: `$${totals.paid.toFixed(2)}`,
                cls: "from-emerald-500/10 to-emerald-500/5 text-emerald-500",
              },
            ].map((s) => (
              <div
                key={s.label}
                className={cn(
                  "rounded-2xl border border-border bg-gradient-to-br p-4",
                  s.cls.split(" ").slice(0, 2).join(" ")
                )}
              >
                <div
                  className={cn(
                    "text-xl font-bold font-heading",
                    s.cls.split(" ")[2]
                  )}
                >
                  {s.value}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            {commissions.length === 0 ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center py-24 text-center px-6">
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <PackageOpen className="w-9 h-9 text-muted-foreground/35" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-background border border-border flex items-center justify-center">
                    <span className="text-muted-foreground text-[10px] font-bold">0</span>
                  </div>
                </div>
                <h3 className="text-foreground font-semibold text-lg mb-2">
                  No commissions yet
                </h3>
                <p className="text-muted-foreground text-sm max-w-xs">
                  Once a referred user makes a purchase, your commission
                  will appear here.
                </p>
                <NavLink
                  to="/partner"
                  className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-medium border border-primary/20 hover:bg-primary/20 transition-colors"
                >
                  Get your referral link
                </NavLink>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="text-left px-5 py-3.5 text-muted-foreground text-xs font-medium uppercase tracking-wider">
                        Service
                      </th>
                      <th className="text-left px-5 py-3.5 text-muted-foreground text-xs font-medium uppercase tracking-wider">
                        Time until approved
                      </th>
                      <th className="text-left px-5 py-3.5 text-muted-foreground text-xs font-medium uppercase tracking-wider">
                        Invoice Number
                      </th>
                      <th className="text-right px-5 py-3.5 text-muted-foreground text-xs font-medium uppercase tracking-wider">
                        Order Amount
                      </th>
                      <th className="text-right px-5 py-3.5 text-muted-foreground text-xs font-medium uppercase tracking-wider">
                        Commission
                      </th>
                      <th className="text-center px-5 py-3.5 text-muted-foreground text-xs font-medium uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-right px-5 py-3.5 text-muted-foreground text-xs font-medium uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {commissions.map((c) => (
                      <tr
                        key={c.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-5 py-4">
                          <span className="text-foreground font-medium">
                            {c.serviceName}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs">
                          {getTimeUntilApproved(c.createdAt, c.referralCoolingPeriodDays, c.status)}
                        </td>
                        <td className="px-5 py-4 text-muted-foreground font-mono text-xs">
                          {c.invoiceNumber || "-"}
                        </td>
                        <td className="px-5 py-4 text-muted-foreground text-right tabular-nums">
                          ${Number(c.orderAmount).toFixed(2)}
                        </td>
                        <td className="px-5 py-4 text-right tabular-nums">
                          <span className="text-emerald-500 font-semibold">
                            +${Number(c.commission).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <StatusBadge status={c.status} />
                        </td>
                        <td className="px-5 py-4 text-muted-foreground text-right text-xs tabular-nums">
                          {new Date(c.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </AccountLayout>
  );
};

export default PartnerCommissions;

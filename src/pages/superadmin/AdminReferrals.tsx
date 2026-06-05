import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { toast } from "sonner";
import {
  Users, MousePointerClick, TrendingUp, DollarSign,
  Banknote, CreditCard, Clock, AlertTriangle, RefreshCw,
  ChevronRight, ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiGet } from "@/lib/api";

interface SelfReferral {
  partner_id: string;
  partner_name: string;
  referral_code: string;
  count: number;
}

interface IpClash {
  ip: string;
  partner_codes: string[];
  count: number;
}

interface FraudAlerts {
  count: number;
  self_referrals: SelfReferral[];
  ip_clashes: IpClash[];
}

interface ReferralStats {
  total_partners: number;
  total_clicks: number;
  total_conversions: number;
  conversion_rate: number;
  total_revenue: number;
  total_commission: number;
  total_paid: number;
  pending_payouts: number;
  fraud_alerts: FraudAlerts;
}

const AdminReferrals = () => {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const data = await apiGet<ReferralStats>("/referrals/admin/stats");
      setStats(data);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load referral stats");
      toast.error("Failed to load referral stats");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchStats();
  }, []);

  const fmt = (n: number) =>
    n?.toLocaleString("en-US", { maximumFractionDigits: 2 }) ?? "—";

  const fmtCurrency = (n: number) =>
    `$${(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const kpiCards = stats
    ? [
        {
          label: "Total Partners",
          value: fmt(stats.total_partners),
          icon: Users,
          accent: "text-violet-400",
          bg: "from-violet-500/10 to-violet-500/5",
          border: "border-violet-500/20",
        },
        {
          label: "Total Clicks",
          value: fmt(stats.total_clicks),
          icon: MousePointerClick,
          accent: "text-sky-400",
          bg: "from-sky-500/10 to-sky-500/5",
          border: "border-sky-500/20",
        },
        {
          label: "Total Conversions",
          value: fmt(stats.total_conversions),
          icon: TrendingUp,
          accent: "text-emerald-400",
          bg: "from-emerald-500/10 to-emerald-500/5",
          border: "border-emerald-500/20",
        },
        {
          label: "Conversion Rate",
          value: `${(stats.conversion_rate ?? 0).toFixed(1)}%`,
          icon: TrendingUp,
          accent: "text-teal-400",
          bg: "from-teal-500/10 to-teal-500/5",
          border: "border-teal-500/20",
        },
        {
          label: "Total Revenue",
          value: fmtCurrency(stats.total_revenue),
          icon: DollarSign,
          accent: "text-amber-400",
          bg: "from-amber-500/10 to-amber-500/5",
          border: "border-amber-500/20",
        },
        {
          label: "Total Commission",
          value: fmtCurrency(stats.total_commission),
          icon: Banknote,
          accent: "text-orange-400",
          bg: "from-orange-500/10 to-orange-500/5",
          border: "border-orange-500/20",
        },
        {
          label: "Total Paid",
          value: fmtCurrency(stats.total_paid),
          icon: CreditCard,
          accent: "text-green-400",
          bg: "from-green-500/10 to-green-500/5",
          border: "border-green-500/20",
        },
        {
          label: "Pending Payouts",
          value: fmtCurrency(stats.pending_payouts),
          icon: Clock,
          accent: "text-rose-400",
          bg: "from-rose-500/10 to-rose-500/5",
          border: "border-rose-500/20",
        },
      ]
    : [];

  return (
    <SuperAdminLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Referral Program</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Global overview of all referral activity</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => void fetchStats(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link to="/superadmin/referrals/partners">
              Partners <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
          <Button asChild variant="hero" size="sm" className="gap-1.5">
            <Link to="/superadmin/referrals/payouts">
              Payouts <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="glass-card p-12 text-center">
          <RefreshCw className="w-8 h-8 mx-auto mb-3 text-muted-foreground animate-spin" />
          <p className="text-sm text-muted-foreground">Loading referral stats…</p>
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="glass-card p-8 text-center border-destructive/30">
          <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-destructive" />
          <p className="text-sm text-destructive font-medium">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => void fetchStats()}>
            Try again
          </Button>
        </div>
      )}

      {/* KPI Cards */}
      {!isLoading && !error && stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {kpiCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className={`glass-card p-4 bg-gradient-to-br ${card.bg} border ${card.border} transition-all hover:-translate-y-0.5 hover:shadow-md`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-muted-foreground">{card.label}</p>
                    <div className={`p-1.5 rounded-md bg-background/40`}>
                      <Icon className={`w-3.5 h-3.5 ${card.accent}`} />
                    </div>
                  </div>
                  <p className={`text-xl font-heading font-bold ${card.accent}`}>{card.value}</p>
                </div>
              );
            })}
          </div>

          {/* Fraud Alerts */}
          {stats.fraud_alerts?.count > 0 && (
            <div className="glass-card border-amber-500/30 bg-amber-500/5 mb-6 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-amber-500/20 bg-amber-500/10">
                <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-amber-400 text-sm">
                    Fraud Alerts — {stats.fraud_alerts.count} issue{stats.fraud_alerts.count !== 1 ? "s" : ""} detected
                  </p>
                  <p className="text-xs text-amber-500/70">Review self-referrals and IP conflicts below</p>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* Self-referrals */}
                {stats.fraud_alerts.self_referrals?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Self-referrals ({stats.fraud_alerts.self_referrals.length})
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/50">
                            <th className="text-left p-2 text-muted-foreground font-medium text-xs">Partner</th>
                            <th className="text-left p-2 text-muted-foreground font-medium text-xs">Referral Code</th>
                            <th className="text-left p-2 text-muted-foreground font-medium text-xs">Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.fraud_alerts.self_referrals.map((item, i) => (
                            <tr key={i} className="border-b border-border/30 hover:bg-secondary/20 transition-colors">
                              <td className="p-2">
                                <div className="font-medium text-foreground">{item.partner_name}</div>
                                <div className="text-xs text-muted-foreground font-mono">{item.partner_id}</div>
                              </td>
                              <td className="p-2 font-mono text-xs text-amber-400">{item.referral_code}</td>
                              <td className="p-2">
                                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                  {item.count}×
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* IP Clashes */}
                {stats.fraud_alerts.ip_clashes?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      IP Clashes ({stats.fraud_alerts.ip_clashes.length})
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/50">
                            <th className="text-left p-2 text-muted-foreground font-medium text-xs">IP Address</th>
                            <th className="text-left p-2 text-muted-foreground font-medium text-xs">Referral Codes</th>
                            <th className="text-left p-2 text-muted-foreground font-medium text-xs">Hits</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.fraud_alerts.ip_clashes.map((item, i) => (
                            <tr key={i} className="border-b border-border/30 hover:bg-secondary/20 transition-colors">
                              <td className="p-2 font-mono text-xs text-foreground">{item.ip}</td>
                              <td className="p-2">
                                <div className="flex flex-wrap gap-1">
                                  {item.partner_codes.map((code) => (
                                    <span
                                      key={code}
                                      className="inline-block px-2 py-0.5 rounded text-xs font-mono bg-secondary text-muted-foreground"
                                    >
                                      {code}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="p-2">
                                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                  {item.count}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* No fraud alerts */}
          {stats.fraud_alerts?.count === 0 && (
            <div className="glass-card p-4 border-green-500/20 bg-green-500/5 flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-sm text-green-400 font-medium">No fraud alerts detected. All referral activity looks clean.</p>
            </div>
          )}

          {/* Quick Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              to="/superadmin/referrals/partners"
              className="glass-card p-5 flex items-center justify-between group hover:-translate-y-0.5 transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Manage Partners</p>
                  <p className="text-xs text-muted-foreground">Edit tiers, status, commission multipliers</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Link>

            <Link
              to="/superadmin/referrals/payouts"
              className="glass-card p-5 flex items-center justify-between group hover:-translate-y-0.5 transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Banknote className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Payout Requests</p>
                  <p className="text-xs text-muted-foreground">Approve or reject pending payouts</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Link>
          </div>
        </>
      )}
    </SuperAdminLayout>
  );
};

export default AdminReferrals;

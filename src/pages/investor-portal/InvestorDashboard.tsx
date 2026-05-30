import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import InvestorPortalLayout from "@/components/investor/InvestorPortalLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign, TrendingUp, Wallet, CalendarClock, ArrowRight,
  FileSignature, FileText, Banknote,
} from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { useSEO } from "@/hooks/use-seo";

const fmt = (n: number, cur = "USD") =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n || 0);

const InvestorDashboard = () => {
  usePageTitle("Investor Dashboard");
  useSEO({ title: "Investor Dashboard", noIndex: true });
  const { user } = useAuth();

  const { data: investments, isLoading: invLoading } = useQuery({
    queryKey: ["investor-investments", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investments" as any)
        .select("*")
        .eq("investor_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data: payouts } = useQuery({
    queryKey: ["investor-payouts", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investment_payouts" as any)
        .select("*")
        .eq("investor_id", user!.id)
        .order("period_end", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const adjustmentTypes = new Set(["adjustment", "fee", "penalty", "loss"]);
  const totalInvested = (investments ?? [])
    .filter((i) => i.status === "active" || i.status === "completed")
    .reduce((s, i) => s + Number(i.amount || 0), 0);
  const paidRows = (payouts ?? []).filter((p) => p.status === "paid");
  const totalEarned = paidRows
    .filter((p) => !adjustmentTypes.has(p.payout_type) && Number(p.amount) > 0)
    .reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalAdjustments = paidRows
    .filter((p) => adjustmentTypes.has(p.payout_type) || Number(p.amount) < 0)
    .reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalPaid = totalEarned + totalAdjustments;
  const upcoming = (payouts ?? [])
    .filter((p) => p.status === "scheduled")
    .sort((a, b) => String(a.period_end).localeCompare(String(b.period_end)))[0];
  const activeCount = (investments ?? []).filter((i) => i.status === "active").length;

  const stats = [
    { label: "Total invested", value: fmt(totalInvested), icon: DollarSign, tone: "from-emerald-500/15 to-emerald-500/5" },
    {
      label: "Net P&L",
      value: fmt(totalPaid),
      sub: totalAdjustments !== 0 ? `Adjustments: ${fmt(totalAdjustments)}` : `Earned: ${fmt(totalEarned)}`,
      icon: TrendingUp,
      tone: totalPaid >= 0 ? "from-blue-500/15 to-blue-500/5" : "from-red-500/15 to-red-500/5",
    },
    {
      label: "Next payout",
      value: upcoming ? fmt(Number(upcoming.amount), upcoming.currency || "USD") : "—",
      sub: upcoming?.period_end ? new Date(upcoming.period_end).toLocaleDateString() : "Nothing scheduled",
      icon: CalendarClock,
      tone: "from-purple-500/15 to-purple-500/5",
    },
    { label: "Active plans", value: String(activeCount), icon: Wallet, tone: "from-orange-500/15 to-orange-500/5" },
  ];

  return (
    <InvestorPortalLayout
      title={`Welcome${user?.user_metadata?.full_name ? `, ${String(user.user_metadata.full_name).split(" ")[0]}` : ""}`}
      description="Quick overview of your investments, returns and upcoming payouts."
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className={`bg-gradient-to-br ${s.tone} border`}>
              <CardContent className="p-4 md:p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</span>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">{s.value}</div>
                {s.sub && <div className="text-xs text-muted-foreground mt-0.5">{s.sub}</div>}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold">Your investments</h2>
            <Button size="sm" variant="outline" asChild>
              <Link to="/invest">New investment <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
            </Button>
          </div>

          {invLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : !investments?.length ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No investments yet — <Link to="/invest" className="text-primary hover:underline">browse plans</Link>.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground border-b">
                  <tr>
                    <th className="text-left py-2 pr-2">Plan</th>
                    <th className="text-right py-2 px-2">Amount</th>
                    <th className="text-left py-2 px-2">Started</th>
                    <th className="text-left py-2 px-2">Principal back</th>
                    <th className="text-left py-2 px-2">Status</th>
                    <th className="text-left py-2 px-2">Agreement</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {investments.map((i: any) => (
                    <tr key={i.id} className="hover:bg-muted/30">
                      <td className="py-3 pr-2 font-medium">{i.plan_name}</td>
                      <td className="py-3 px-2 text-right">{fmt(Number(i.amount), i.currency)}</td>
                      <td className="py-3 px-2 text-muted-foreground">
                        {i.started_at ? new Date(i.started_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-3 px-2 text-muted-foreground">
                        {i.principal_return_at ? new Date(i.principal_return_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant={i.status === "active" ? "default" : "secondary"} className="capitalize">{i.status}</Badge>
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant={i.agreement_status === "signed" ? "default" : "outline"}>
                          {i.agreement_status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-3 mt-6">
        {[
          { to: "/investor/agreements", label: "View agreements", icon: FileSignature },
          { to: "/investor/statements", label: "Download statements", icon: FileText },
          { to: "/investor/withdrawals", label: "Request withdrawal", icon: Banknote },
        ].map((q) => {
          const Icon = q.icon;
          return (
            <Link key={q.to} to={q.to} className="group">
              <Card className="hover:border-primary/40 hover:shadow-md transition-all">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="font-medium text-sm">{q.label}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </InvestorPortalLayout>
  );
};

export default InvestorDashboard;

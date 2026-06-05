import { Link } from "react-router-dom";
import AccountLayout from "@/components/account/AccountLayout";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { useCustomerServices, daysUntil } from "@/hooks/use-customer-services";
import { ShoppingBag, Package, FileText, DollarSign, ArrowRight, RotateCw, Clock, Building2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { usePageTitle } from "@/hooks/use-page-title";
import { useSEO } from "@/hooks/use-seo";
import { useOrdersRealtime } from "@/hooks/useOrdersRealtime";

const AccountDashboard = () => {
  usePageTitle("Account Dashboard");
  useSEO({ title: "Account Dashboard", noIndex: true });
  const { user } = useAuth();

  useOrdersRealtime(`account-dash-${user?.id ?? "anon"}`, [
    ["account-orders", user?.email],
    ["account-orders-full", user?.email],
  ]);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["account-orders", user?.email],
    queryFn: async () => {
      return apiGet<any[]>("/orders/mine");
    },
    enabled: !!user?.email,
  });

  const { data: services } = useCustomerServices();

  const paidOrders = (orders || []).filter((o) => o.status === "paid" || o.status === "completed");
  const totalSpent = paidOrders.reduce((s, o) => s + Number(o.total || 0), 0);
  const recurring = (services || []).filter((s) => s.type === "recurring" && s.status !== "cancelled" && s.status !== "expired");
  const inProgress = (services || []).filter((s) => s.status === "in_progress");
  const upcoming = recurring
    .filter((s) => {
      const d = daysUntil(s.current_period_end);
      return d !== null && d <= 30;
    })
    .sort((a, b) => (daysUntil(a.current_period_end) ?? 99) - (daysUntil(b.current_period_end) ?? 99));

  const stats = [
    { label: "Total Spent", value: `$${totalSpent.toFixed(2)}`, icon: DollarSign, tone: "from-emerald-500/15 to-emerald-500/5" },
    { label: "Active Services", value: (services || []).filter((s) => s.status === "active" || s.status === "in_progress").length, icon: Package, tone: "from-blue-500/15 to-blue-500/5" },
    { label: "Recurring", value: recurring.length, icon: RotateCw, tone: "from-purple-500/15 to-purple-500/5" },
    { label: "In Progress", value: inProgress.length, icon: Clock, tone: "from-orange-500/15 to-orange-500/5" },
  ];

  return (
    <AccountLayout title={`Welcome back${user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name.split(" ")[0]}` : ""}`} description="Quick overview of your orders, services, and upcoming renewals.">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`rounded-2xl border border-border bg-gradient-to-br ${s.tone} p-4`}>
              <Icon className="w-5 h-5 text-foreground/70 mb-3" />
              <div className="text-2xl font-bold text-foreground">{isLoading ? <Skeleton className="h-7 w-16" /> : s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          );
        })}
      </div>

      {upcoming.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 md:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
              <RotateCw className="w-4 h-4 text-primary" /> Upcoming Renewals
            </h2>
            <Link to="/account/services/recurring" className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1">
              Manage all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {upcoming.slice(0, 4).map((s) => {
              const d = daysUntil(s.current_period_end);
              const tone = d !== null && d <= 3 ? "bg-destructive/15 text-destructive border-destructive/30"
                : d !== null && d <= 14 ? "bg-yellow-500/15 text-yellow-700 border-yellow-500/30"
                : "bg-emerald-500/15 text-emerald-700 border-emerald-500/30";
              return (
                <div key={s.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.service_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Renews {s.current_period_end ? new Date(s.current_period_end).toLocaleDateString() : "—"} · {s.billing_cycle}
                    </p>
                  </div>
                  <Badge variant="outline" className={tone}>{d !== null ? `${d}d left` : "—"}</Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg font-semibold">Recent Orders</h2>
          <Link to="/account/orders" className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
        ) : (orders || []).length === 0 ? (
          <div className="text-center py-9">
            <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground mb-4">No orders yet</p>
            <Link to="/services" className="text-sm font-semibold text-primary hover:underline">Explore services →</Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {(orders || []).slice(0, 5).map((o: any) => (
              <Link key={o.id} to={`/invoice/${o.invoice_number || o.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-secondary/40 -mx-2 px-2 rounded-lg">
                <div className="min-w-0 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><FileText className="w-4 h-4" /></div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{o.invoice_number || `#${o.id.slice(0,8)}`}</p>
                    <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="capitalize">{o.status}</Badge>
                  <p className="text-sm font-bold mt-1">${Number(o.total).toFixed(2)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AccountLayout>
  );
};

export default AccountDashboard;

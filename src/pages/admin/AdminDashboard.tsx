import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import RecurringHealthWidget from "@/components/admin/RecurringHealthWidget";
import { useFormSubmissions, useChatSessions } from "@/hooks/use-data";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrdersRealtime } from "@/hooks/useOrdersRealtime";
import { useExchangeRates } from "@/hooks/use-exchange-rates";
import {
  Inbox, MessageSquare, FileText, TrendingUp, TrendingDown, Mail,
  ShoppingBag, ClipboardList, Users, ArrowUpRight, Activity, DollarSign,
  Plus, Briefcase, Tag, Sparkles, ExternalLink, CheckCircle2,
  UserCog, Target, Wallet, CalendarRange, ChevronDown, Receipt,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, Legend,
} from "recharts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

// Helpers
const fmt = (n: number) => new Intl.NumberFormat().format(n);
const money = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const moneyCcy = (n: number, ccy: string) =>
  `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${ccy}`;

const useCount = (table: any, filter?: (q: any) => any) =>
  useQuery({
    queryKey: ["dash-count", table, filter?.toString()],
    queryFn: async () => {
      let q: any = supabase.from(table).select("*", { count: "exact", head: true });
      if (filter) q = filter(q);
      const { count } = await q;
      return count || 0;
    },
    staleTime: 30000,
  });

const useOrders = () =>
  useQuery({
    queryKey: ["dash-orders"],
    queryFn: async () => {
      const pageSize = 1000;
      const allOrders: any[] = [];

      for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabase
          .from("orders")
          .select("id, total, status, customer_name, customer_email, created_at, tax_amount, tax_percent, tax_mode, tax_label, refunded_amount, refunded_tax_amount, refunded_at")
          .order("created_at", { ascending: false })
          .range(from, from + pageSize - 1);

        if (error) throw error;
        allOrders.push(...(data || []));
        if (!data || data.length < pageSize) break;
      }

      return allOrders;
    },
    staleTime: 30000,
  });

const useSubscribers = () =>
  useQuery({
    queryKey: ["dash-subs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("newsletter_subscribers")
        .select("id, email, status, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      return data || [];
    },
    staleTime: 30000,
  });

const useFxOrders = () =>
  useQuery({
    queryKey: ["dash-fx-totals"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fx_orders" as any)
        .select("status, base_currency, base_amount, revenue_usd, cost_usd, profit_usd, fee_usd, order_date")
        .order("order_date", { ascending: false })
        .limit(2000);
      return (data || []) as any[];
    },
    staleTime: 30000,
  });

const useEmployees = () =>
  useQuery({
    queryKey: ["dash-employees"],
    queryFn: async () => {
      const { data } = await supabase
        .from("dynime_employees")
        .select("employee_id, full_name, department, designation, status, monthly_gross_usd, annual_salary_usd");
      return data || [];
    },
    staleTime: 60000,
  });

const useKpiMonthly = () =>
  useQuery({
    queryKey: ["dash-kpi"],
    queryFn: async () => {
      const { data } = await supabase
        .from("dynime_kpi_monthly")
        .select("period, revenue_usd, net_income_usd, mrr_usd, headcount, churn_rate_pct, nps_score")
        .order("period", { ascending: true });
      return data || [];
    },
    staleTime: 60000,
  });


const StatCard = ({
  label, value, icon: Icon, trend, hint, accent = "primary",
}: {
  label: string; value: string | number; icon: any; trend?: number; hint?: string;
  accent?: "primary" | "accent" | "success" | "warning";
}) => {
  const accentMap: Record<string, string> = {
    primary: "from-primary/20 to-primary/0 text-primary",
    accent: "from-accent/20 to-accent/0 text-accent",
    success: "from-emerald-500/20 to-emerald-500/0 text-emerald-500",
    warning: "from-amber-500/20 to-amber-500/0 text-amber-500",
  };
  const positive = (trend ?? 0) >= 0;
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 hover:border-primary/30 transition-colors">
      <div className={`absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gradient-to-br ${accentMap[accent]} blur-2xl opacity-60 group-hover:opacity-90 transition-opacity`} />
      <div className="relative flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accentMap[accent]} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
        {typeof trend === "number" && (
          <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${
            positive ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"
          }`}>
            {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="relative mt-4">
        <div className="text-3xl font-bold tracking-tight text-foreground font-heading">{value}</div>
        <div className="text-sm text-muted-foreground mt-1">{label}</div>
        {hint && <div className="text-[11px] text-muted-foreground/70 mt-1">{hint}</div>}
      </div>
    </div>
  );
};

const Card = ({ title, action, children, className = "" }: any) => (
  <div className={`rounded-2xl border border-border bg-card p-5 ${className}`}>
    {(title || action) && (
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {action}
      </div>
    )}
    {children}
  </div>
);

const AdminDashboard = () => {
  const { data: submissionsAll = [] } = useFormSubmissions();
  const { data: sessions = [] } = useChatSessions();
  const { data: ordersAll = [] } = useOrders();
  const { data: subscribersAll = [] } = useSubscribers();
  const { data: employees = [] } = useEmployees();
  const { data: kpiMonthlyAll = [] } = useKpiMonthly();
  const { data: fxOrdersAll = [] } = useFxOrders();
  const { rateFor } = useExchangeRates();
  

  useOrdersRealtime("admin-dashboard-orders", [["dash-orders"], ["dash-count", "orders"]]);

  const { data: portfolioCount = 0 } = useCount("portfolio_projects");

  // ─── Date range filter ──────────────────────────────────────────────
  type Preset = "7d" | "30d" | "90d" | "12m" | "ytd" | "all" | "custom";
  const [preset, setPreset] = useState<Preset>("30d");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [pendingRange, setPendingRange] = useState<DateRange | undefined>(undefined);

  const { from, to } = useMemo(() => {
    const now = new Date(); now.setHours(23, 59, 59, 999);
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    if (preset === "custom" && customFrom && customTo) {
      return { from: new Date(customFrom + "T00:00:00"), to: new Date(customTo + "T23:59:59") };
    }
    if (preset === "all") return { from: new Date(2000, 0, 1), to: now };
    if (preset === "ytd") { start.setMonth(0, 1); return { from: start, to: now }; }
    if (preset === "12m") { start.setFullYear(start.getFullYear() - 1); return { from: start, to: now }; }
    const days = preset === "7d" ? 6 : preset === "30d" ? 29 : preset === "90d" ? 89 : 29;
    start.setDate(start.getDate() - days);
    return { from: start, to: now };
  }, [preset, customFrom, customTo]);

  const inRange = (iso?: string | null) => {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    return t >= from.getTime() && t <= to.getTime();
  };
  const periodInRange = (period?: string | null) => {
    if (!period) return false;
    const d = new Date(period + "-01T00:00:00");
    const monthStart = new Date(from.getFullYear(), from.getMonth(), 1);
    const monthEnd = new Date(to.getFullYear(), to.getMonth() + 1, 0, 23, 59, 59);
    return d >= monthStart && d <= monthEnd;
  };

  const orders = useMemo(() => ordersAll.filter((o: any) => inRange(o.created_at)), [ordersAll, from, to]);
  const submissions = useMemo(() => submissionsAll.filter((s: any) => inRange(s.created_at)), [submissionsAll, from, to]);
  const subscribers = useMemo(() => subscribersAll.filter((s: any) => inRange(s.created_at)), [subscribersAll, from, to]);
  const kpiMonthly = useMemo(() => kpiMonthlyAll.filter((k: any) => periodInRange(k.period)), [kpiMonthlyAll, from, to]);
  

  const newSubmissions = submissions.filter((s: any) => s.status === "new").length;
  const totalSubmissions = submissions.length;
  const unreadChats = sessions.reduce((sum: number, s: any) => sum + (s.unread || 0), 0);
  const activeSubs = subscribers.filter((s) => s.status === "subscribed").length;

  // Net revenue = paid/completed totals MINUS refunded portions (full or partial).
  // Refunds on cancelled/refunded-status orders are also subtracted so net stays accurate.
  const revenue = orders.reduce((sum, o: any) => {
    const isCounted = o.status === "paid" || o.status === "completed";
    const gross = isCounted ? Number(o.total || 0) : 0;
    const refunded = Number(o.refunded_amount || 0);
    return sum + gross - refunded;
  }, 0);
  const pendingOrders = orders.filter((o) => o.status === "pending").length;

  // FX Order POS — completed exchanges within range roll into total revenue
  const fxOrders = useMemo(
    () => fxOrdersAll.filter((f: any) => inRange(f.order_date) && f.status === "completed"),
    [fxOrdersAll, from, to],
  );
  // revenue_usd is stored in the receive (base) currency — convert each order to
  // USD using live FX rates so the dashboard total is in one comparable currency.
  const fxRevenue = fxOrders.reduce((s: number, f: any) => {
    const amt = Number(f.revenue_usd || 0);
    const ccy = f.base_currency || "USD";
    const rate = rateFor(ccy as any); // USD-based: 1 USD = rate units of ccy
    const usd = ccy === "USD" || !rate ? amt : amt / rate;
    return s + usd;
  }, 0);
  const totalRevenue = revenue + fxRevenue;

  // Total FX sales grouped by receive (base) currency
  const fxSalesByCurrency = useMemo(() => {
    const map: Record<string, number> = {};
    fxOrders.forEach((f: any) => {
      const ccy = f.base_currency || "USD";
      map[ccy] = (map[ccy] || 0) + Number(f.base_amount || 0);
    });
    return map;
  }, [fxOrders]);

  // Daily timeseries spanning the active range (bucketed if > 60 days)
  const timeseries = useMemo(() => {
    const dayMs = 86_400_000;
    const startDay = new Date(from); startDay.setHours(0, 0, 0, 0);
    const endDay = new Date(to); endDay.setHours(0, 0, 0, 0);
    const totalDays = Math.max(1, Math.round((endDay.getTime() - startDay.getTime()) / dayMs) + 1);
    const bucketDays = totalDays > 60 ? Math.ceil(totalDays / 60) : 1;
    const buckets: { date: string; label: string; orders: number; subs: number; leads: number }[] = [];
    for (let i = 0; i < totalDays; i += bucketDays) {
      const d = new Date(startDay.getTime() + i * dayMs);
      buckets.push({
        date: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        orders: 0, subs: 0, leads: 0,
      });
    }
    const bucketIdx = (iso: string) => {
      const t = new Date(iso).getTime();
      const i = Math.floor((t - startDay.getTime()) / dayMs / bucketDays);
      return i >= 0 && i < buckets.length ? i : -1;
    };
    orders.forEach((o: any) => { const i = bucketIdx(o.created_at); if (i >= 0) buckets[i].orders++; });
    subscribers.forEach((s: any) => { const i = bucketIdx(s.created_at); if (i >= 0) buckets[i].subs++; });
    submissions.forEach((s: any) => { const i = bucketIdx(s.created_at); if (i >= 0) buckets[i].leads++; });
    return buckets;
  }, [orders, subscribers, submissions, from, to]);

  // Pie: order status
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach((o) => { counts[o.status] = (counts[o.status] || 0) + 1; });
    const palette = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(45 100% 55%)", "hsl(160 70% 45%)", "hsl(var(--destructive))"];
    return Object.entries(counts).map(([name, value], i) => ({ name, value, color: palette[i % palette.length] }));
  }, [orders]);

  // Trend calculations (this week vs last week)
  const trend = (key: "orders" | "subs" | "leads") => {
    const last7 = timeseries.slice(-7).reduce((s, d) => s + d[key], 0);
    const prev7 = timeseries.slice(0, 7).reduce((s, d) => s + d[key], 0);
    if (!prev7) return last7 ? 100 : 0;
    return Math.round(((last7 - prev7) / prev7) * 100);
  };

  const quickActions = [
    { label: "New Page", to: "/superadmin/pages", icon: FileText },
    { label: "New Coupon", to: "/superadmin/coupons", icon: Tag },
    { label: "Portfolio Item", to: "/superadmin/portfolio", icon: Briefcase },
  ];

  return (
    <SuperAdminLayout>
      {/* Header — title left, quick actions right on one line */}
      <div className="mb-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3 h-3" /> Live overview
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground tracking-tight">
            Welcome back
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here's what's happening across your business right now.
          </p>
        </div>

        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto lg:overflow-visible -mx-1 px-1 pb-1 lg:pb-0 lg:shrink-0">
          {quickActions.map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="group inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-secondary/60 text-xs font-medium text-foreground hover:bg-secondary hover:border-primary/40 hover:text-primary hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
            >
              <a.icon className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" />
              {a.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Date range filter — segmented pill + calendar popover */}
      {(() => {
        const presets: { id: typeof preset; label: string }[] = [
          { id: "7d", label: "7D" },
          { id: "30d", label: "30D" },
          { id: "90d", label: "90D" },
          { id: "12m", label: "12M" },
          { id: "ytd", label: "YTD" },
          { id: "all", label: "All" },
        ];
        const range: DateRange | undefined =
          customFrom && customTo
            ? { from: new Date(customFrom + "T00:00:00"), to: new Date(customTo + "T00:00:00") }
            : undefined;
        const label =
          preset === "custom" && range?.from && range?.to
            ? `${format(range.from, "MMM d, yyyy")} – ${format(range.to, "MMM d, yyyy")}`
            : `${format(from, "MMM d, yyyy")} – ${format(to, "MMM d, yyyy")}`;

        return (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            {/* Segmented pill */}
            <div className="inline-flex items-center gap-0.5 p-1 rounded-full border border-border bg-card shadow-sm">
              {presets.map((p) => {
                const active = preset === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPreset(p.id)}
                    className={cn(
                      "px-3.5 h-8 rounded-full text-xs font-semibold transition-all duration-200",
                      active
                        ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-[0_4px_14px_-4px_hsl(var(--primary)/0.5)]"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/70"
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Calendar trigger */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-10 px-3 gap-2 rounded-xl border-border bg-card text-foreground hover:bg-primary/10 hover:border-primary hover:text-primary hover:shadow-[0_4px_14px_-4px_hsl(var(--primary)/0.35)] transition-all",
                    preset === "custom" && "border-primary/50 text-primary bg-primary/5"
                  )}
                >
                  <CalendarRange className="w-4 h-4" />
                  <span className="text-xs font-medium">{label}</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto p-0">
                <div className="p-3 border-b border-border">
                  <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">
                    Custom range
                  </div>
                  <Calendar
                    mode="range"
                    numberOfMonths={2}
                    defaultMonth={range?.from ?? new Date()}
                    selected={pendingRange ?? range}
                    onSelect={(r) => {
                      setPendingRange(r);
                      if (r?.from && r?.to) {
                        setCustomFrom(format(r.from, "yyyy-MM-dd"));
                        setCustomTo(format(r.to, "yyyy-MM-dd"));
                        setPreset("custom");
                      }
                    }}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </div>
                <div className="flex items-center justify-between p-3 gap-2">
                  <button
                    onClick={() => { setCustomFrom(""); setCustomTo(""); setPendingRange(undefined); setPreset("30d"); }}
                    className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Reset
                  </button>
                  <div className="text-[11px] text-muted-foreground">
                    {(pendingRange?.from && pendingRange?.to) || (range?.from && range?.to)
                      ? `${Math.round((((pendingRange?.to ?? range!.to)!.getTime()) - ((pendingRange?.from ?? range!.from)!.getTime())) / 86400000) + 1} days selected`
                      : pendingRange?.from
                        ? "Pick an end date"
                        : "Pick a start & end date"}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        );
      })()}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Revenue"
          value={money(totalRevenue)}
          icon={DollarSign}
          trend={trend("orders")}
          hint={`Services ${money(revenue)} · FX ${money(fxRevenue)}`}
          accent="success"
        />
        <StatCard
          label="New Leads"
          value={fmt(newSubmissions)}
          icon={Inbox}
          trend={trend("leads")}
          hint={`${totalSubmissions} total submissions`}
          accent="primary"
        />
        <StatCard
          label="Subscribers"
          value={fmt(activeSubs)}
          icon={Mail}
          trend={trend("subs")}
          hint={`${subscribers.length - activeSubs} unsubscribed`}
          accent="accent"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card
          className="lg:col-span-2"
          title="Activity (last 14 days)"
          action={
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> Orders</span>
              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent" /> Subscribers</span>
              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Leads</span>
            </div>
          }
        >
          <div className="h-64 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeseries}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(160 70% 45%)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(160 70% 45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={28} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12, fontSize: 12,
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Area type="monotone" dataKey="orders" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#g1)" />
                <Area type="monotone" dataKey="subs" stroke="hsl(var(--accent))" strokeWidth={2} fill="url(#g2)" />
                <Area type="monotone" dataKey="leads" stroke="hsl(160 70% 45%)" strokeWidth={2} fill="url(#g3)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Order status">
          {statusData.length ? (
            <>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={70} paddingAngle={3}>
                      {statusData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} stroke="hsl(var(--card))" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 12, fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 mt-2">
                {statusData.map((s) => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                      <span className="capitalize text-muted-foreground">{s.name}</span>
                    </div>
                    <span className="font-medium text-foreground">{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-44 flex flex-col items-center justify-center text-center">
              <ShoppingBag className="w-8 h-8 text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">No orders yet</p>
            </div>
          )}
        </Card>
      </div>

      {/* VAT / Tax collected widget */}
      {(() => {
        // Include every order that had VAT collected, even if its status was later
        // changed to "refunded" — the refund is subtracted in its own month so totals stay accurate.
        const vatOrders = ordersAll.filter((o: any) =>
          o.status === "paid" || o.status === "completed" || o.status === "refunded",
        );
        const now = new Date();
        const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const thisMonth = monthKey(now);
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonth = monthKey(lastMonthDate);

        // 12-month series — `vat` is NET (collected minus refunded VAT).
        const series: { label: string; key: string; vat: number }[] = [];
        for (let i = 11; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          series.push({
            key: monthKey(d),
            label: d.toLocaleDateString(undefined, { month: "short" }),
            vat: 0,
          });
        }
        const byKey = new Map(series.map((s) => [s.key, s]));
        const addToBucket = (k: string, amount: number) => {
          const bucket = byKey.get(k);
          if (bucket) bucket.vat = Math.round((bucket.vat + amount) * 100) / 100;
        };

        let totalAll = 0;
        let totalRefunded = 0;
        let totalThisMonth = 0;
        let totalLastMonth = 0;
        let taxedOrders = 0;
        vatOrders.forEach((o: any) => {
          const tax = Number(o.tax_amount || 0);
          const refundedTax = Number(o.refunded_tax_amount || 0);
          if (!tax && !refundedTax) return;
          if (tax) taxedOrders++;
          // Collected VAT — attributed to order's created month.
          if (tax) {
            totalAll += tax;
            const k = monthKey(new Date(o.created_at));
            if (k === thisMonth) totalThisMonth += tax;
            if (k === lastMonth) totalLastMonth += tax;
            addToBucket(k, tax);
          }
          // Refunded VAT — subtracted in the month the refund happened.
          if (refundedTax) {
            totalRefunded += refundedTax;
            const refundDate = o.refunded_at ? new Date(o.refunded_at) : new Date(o.created_at);
            const rk = monthKey(refundDate);
            if (rk === thisMonth) totalThisMonth -= refundedTax;
            if (rk === lastMonth) totalLastMonth -= refundedTax;
            addToBucket(rk, -refundedTax);
          }
        });
        const totalNet = Math.round((totalAll - totalRefunded) * 100) / 100;
        totalThisMonth = Math.round(totalThisMonth * 100) / 100;
        totalLastMonth = Math.round(totalLastMonth * 100) / 100;
        const yoy = totalLastMonth
          ? Math.round(((totalThisMonth - totalLastMonth) / totalLastMonth) * 100)
          : totalThisMonth > 0 ? 100 : 0;
        const yoyUp = yoy >= 0;

        const exportCsv = () => {
          const rows = [["Month", "Net VAT (USD)"], ...series.map((s) => [s.key, s.vat.toFixed(2)])];
          const csv = rows.map((r) => r.join(",")).join("\n");
          const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `vat-collected-${thisMonth}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        };

        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <Card
              className="lg:col-span-2"
              title={
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-primary" />
                  <span>VAT collected — last 12 months</span>
                </div>
              }
              action={
                <button
                  onClick={exportCsv}
                  className="text-[11px] font-medium text-primary hover:underline"
                >
                  Export CSV
                </button>
              }
            >
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={series} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 12, fontSize: 12,
                      }}
                      formatter={(v: any) => [`$${Number(v).toFixed(2)}`, "VAT"]}
                    />
                    <Bar dataKey="vat" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="VAT this month">
              <div className="space-y-4">
                <div>
                  <div className="text-3xl font-heading font-bold text-foreground">
                    ${totalThisMonth.toFixed(2)}
                  </div>
                  <div className={cn(
                    "inline-flex items-center gap-1 mt-1 text-[11px] font-semibold",
                    yoyUp ? "text-emerald-500" : "text-destructive",
                  )}>
                    {yoyUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {yoyUp ? "+" : ""}{yoy}% vs last month
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Last month</div>
                    <div className="text-sm font-semibold text-foreground mt-0.5">${totalLastMonth.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Net (all time)</div>
                    <div className="text-sm font-semibold text-foreground mt-0.5">${totalNet.toFixed(2)}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      ${totalAll.toFixed(2)} collected
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Refunded</div>
                    <div className="text-sm font-semibold text-destructive mt-0.5">−${totalRefunded.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Taxed orders</div>
                    <div className="text-sm font-semibold text-foreground mt-0.5">{taxedOrders}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Avg / order</div>
                    <div className="text-sm font-semibold text-foreground mt-0.5">
                      ${taxedOrders ? (totalNet / taxedOrders).toFixed(2) : "0.00"}
                    </div>
                  </div>
                </div>
                <Link
                  to="/superadmin/tax-settings"
                  className="block w-full text-center text-[11px] font-semibold text-primary hover:underline pt-2"
                >
                  Manage tax settings →
                </Link>
              </div>
            </Card>
          </div>
        );
      })()}



      {/* HR / KPI / Payroll widgets */}
      {(() => {
        // Derive: employee headcount & department breakdown
        const activeEmp = employees.filter((e: any) => e.status === "active");
        const monthlyPayrollCost = activeEmp.reduce((s: number, e: any) => s + Number(e.monthly_gross_usd || 0), 0);
        const deptMap: Record<string, number> = {};
        activeEmp.forEach((e: any) => { deptMap[e.department || "Other"] = (deptMap[e.department || "Other"] || 0) + 1; });
        const deptData = Object.entries(deptMap).map(([name, value]) => ({ name, value }));
        const deptColors = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(160 70% 45%)", "hsl(45 100% 55%)", "hsl(280 70% 60%)", "hsl(var(--destructive))"];

        // KPI series — last 12 periods
        const kpiSeries = kpiMonthly.slice(-12).map((k: any) => ({
          label: k.period?.slice(5) || "",
          revenue: Number(k.revenue_usd || 0),
          net: Number(k.net_income_usd || 0),
          mrr: Number(k.mrr_usd || 0),
          nps: Number(k.nps_score || 0),
          churn: Number(k.churn_rate_pct || 0),
          headcount: Number(k.headcount || 0),
        }));
        const latestKpi = kpiSeries[kpiSeries.length - 1];


        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {/* Employees */}
            <Card
              title="Employees"
              action={
                <Link to="/superadmin/employees" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                  Manage <ArrowUpRight className="w-3 h-3" />
                </Link>
              }
            >
              <div className="flex items-end justify-between mb-3">
                <div>
                  <div className="text-3xl font-bold font-heading text-foreground">{activeEmp.length}</div>
                  <div className="text-xs text-muted-foreground">Active headcount</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <UserCog className="w-5 h-5" />
                </div>
              </div>
              {deptData.length ? (
                <div className="h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={deptData} dataKey="value" nameKey="name" innerRadius={36} outerRadius={58} paddingAngle={2}>
                        {deptData.map((_, i) => <Cell key={i} fill={deptColors[i % deptColors.length]} stroke="hsl(var(--card))" strokeWidth={2} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-36 flex items-center justify-center text-xs text-muted-foreground">No employees</div>
              )}
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {deptData.slice(0, 6).map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-[11px]">
                    <span className="w-2 h-2 rounded-full" style={{ background: deptColors[i % deptColors.length] }} />
                    <span className="text-muted-foreground truncate">{d.name}</span>
                    <span className="ml-auto font-medium text-foreground">{d.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* KPI */}
            <Card
              title="Business KPIs"
              action={
                <span className="text-[11px] text-muted-foreground">Last 12 months</span>
              }
            >
              <div className="flex items-end justify-between mb-3">
                <div>
                  <div className="text-3xl font-bold font-heading text-foreground">
                    {latestKpi ? money(latestKpi.mrr) : "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    MRR · NPS {latestKpi?.nps ?? "—"} · Churn {latestKpi?.churn ?? "—"}%
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                  <Target className="w-5 h-5" />
                </div>
              </div>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={kpiSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                    <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="net" stroke="hsl(160 70% 45%)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="mrr" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1">
                <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" />Revenue</span>
                <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Net</span>
                <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent" />MRR</span>
              </div>
            </Card>

            {/* Recurring orders health */}
            <RecurringHealthWidget />
          </div>
        );
      })()}


      {/* Bottom: recent submissions + recent orders + catalog */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card
          className="lg:col-span-2"
          title="Recent activity"
          action={
            <Link to="/superadmin/submissions" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          }
        >
          {submissions.length ? (
            <div className="space-y-2">
              {submissions.slice(0, 6).map((sub: any) => {
                const data = sub.data as any;
                return (
                  <div key={sub.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground truncate">
                        {data?.name || data?.email || "New submission"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {data?.email || data?.message || "—"}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                        sub.status === "new" ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
                      }`}>
                        {sub.status}
                      </span>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {new Date(sub.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-10 text-center">
              <Inbox className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No submissions yet.</p>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card
            title="Recent orders"
            action={
              <Link to="/superadmin/orders" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                All <ArrowUpRight className="w-3 h-3" />
              </Link>
            }
          >
            {orders.length ? (
              <div className="space-y-2">
                {orders.slice(0, 4).map((o) => (
                  <Link
                    key={o.id}
                    to={`/superadmin/orders/${o.id}`}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-secondary/60 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-foreground truncate">
                        {o.customer_name || o.customer_email || "Customer"}
                      </div>
                      <div className="text-[10px] text-muted-foreground capitalize">{o.status}</div>
                    </div>
                    <div className="text-xs font-semibold text-foreground shrink-0">{money(Number(o.total || 0))}</div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center">No orders yet.</p>
            )}
          </Card>

          <Card title="Catalog snapshot">
            <div className="grid grid-cols-2 gap-2">
              <Link to="/superadmin/portfolio" className="p-3 rounded-xl bg-secondary/40 hover:bg-secondary/70 transition">
                <Briefcase className="w-4 h-4 text-accent mb-2" />
                <div className="text-lg font-bold text-foreground">{portfolioCount}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Projects</div>
              </Link>
              <Link to="/superadmin/orders" className="p-3 rounded-xl bg-secondary/40 hover:bg-secondary/70 transition">
                <ClipboardList className="w-4 h-4 text-amber-500 mb-2" />
                <div className="text-lg font-bold text-foreground">{pendingOrders}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Pending</div>
              </Link>
              <Link to="/superadmin/subscribers" className="p-3 rounded-xl bg-secondary/40 hover:bg-secondary/70 transition">
                <Users className="w-4 h-4 text-emerald-500 mb-2" />
                <div className="text-lg font-bold text-foreground">{activeSubs}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Active subs</div>
              </Link>
            </div>
          </Card>

          <Card title="System status">
            <div className="space-y-2">
              {[
                { label: "Database", ok: true },
                { label: "Edge functions", ok: true },
                { label: "Storage", ok: true },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="inline-flex items-center gap-1 text-emerald-500 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Operational
                  </span>
                </div>
              ))}
              <Link
                to="/supabase-status"
                className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 pt-1"
              >
                Open status page <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </SuperAdminLayout>
  );
};

export default AdminDashboard;

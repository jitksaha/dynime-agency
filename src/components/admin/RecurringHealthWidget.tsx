import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Repeat, ArrowUpRight, AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Svc = {
  id: string;
  service_name: string;
  customer_email: string;
  status: string;
  billing_cycle: string | null;
  current_period_end: string | null;
  auto_renew: boolean;
  price: number;
  currency: string;
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "due", label: "Due ≤7d" },
  { key: "overdue", label: "Overdue" },
  { key: "not_paying", label: "Not paying" },
  { key: "healthy", label: "Healthy" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

const daysUntil = (iso: string | null) =>
  iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000) : null;

const RecurringHealthWidget = () => {
  const [filter, setFilter] = useState<FilterKey>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["dash-recurring-services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_services")
        .select("id, service_name, customer_email, status, billing_cycle, current_period_end, auto_renew, price, currency")
        .eq("type", "recurring")
        .order("current_period_end", { ascending: true, nullsFirst: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as unknown as Svc[];
    },
    staleTime: 30000,
  });

  const buckets = useMemo(() => {
    const list = data || [];
    const overdue: Svc[] = [];
    const due: Svc[] = [];
    const notPaying: Svc[] = [];
    const healthy: Svc[] = [];
    for (const s of list) {
      const d = daysUntil(s.current_period_end);
      if (s.status === "expired" || s.status === "cancelled") notPaying.push(s);
      else if (d !== null && d < 0) overdue.push(s);
      else if (!s.auto_renew && d !== null && d <= 14) notPaying.push(s);
      else if (d !== null && d <= 7) due.push(s);
      else healthy.push(s);
    }
    return { overdue, due, notPaying, healthy, total: list.length };
  }, [data]);

  const visible = useMemo(() => {
    const list = data || [];
    if (filter === "all") return list;
    if (filter === "due") return buckets.due;
    if (filter === "overdue") return buckets.overdue;
    if (filter === "not_paying") return buckets.notPaying;
    if (filter === "healthy") return buckets.healthy;
    return list;
  }, [data, buckets, filter]);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Repeat className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-none">Recurring services</h3>
            <p className="text-[10px] text-muted-foreground mt-1">Auto-billed subscriptions health</p>
          </div>
        </div>
        <Link
          to="/superadmin/customer-services"
          className="text-xs text-primary hover:underline inline-flex items-center gap-1"
        >
          Manage <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <Stat label="Total" value={buckets.total} icon={Repeat} tone="default" loading={isLoading} />
        <Stat label="Healthy" value={buckets.healthy.length} icon={CheckCircle2} tone="emerald" loading={isLoading} />
        <Stat label="Due ≤7d" value={buckets.due.length} icon={Clock} tone="amber" loading={isLoading} />
        <Stat label="At risk" value={buckets.overdue.length + buckets.notPaying.length} icon={AlertTriangle} tone="rose" loading={isLoading} />
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "text-[11px] px-2.5 py-1 rounded-full border transition-colors",
              filter === f.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary/40 text-muted-foreground border-border hover:bg-secondary",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted-foreground">
          {buckets.total === 0 ? "No recurring services yet." : "Nothing in this filter."}
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
          {visible.slice(0, 8).map((s) => {
            const d = daysUntil(s.current_period_end);
            const isOverdue = (d !== null && d < 0) || s.status === "expired";
            const isCancelled = s.status === "cancelled";
            const isDueSoon = d !== null && d >= 0 && d <= 7;
            const tone = isOverdue || isCancelled
              ? "text-rose-600"
              : isDueSoon
              ? "text-amber-600"
              : "text-emerald-600";
            const Icon = isOverdue ? AlertTriangle : isCancelled ? XCircle : isDueSoon ? Clock : CheckCircle2;
            return (
              <Link
                key={s.id}
                to="/superadmin/customer-services"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/60 transition-colors"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-xs font-medium truncate">{s.service_name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {s.customer_email} · {s.billing_cycle} · {s.currency} {Number(s.price).toFixed(0)}
                  </p>
                </div>
                <div className={cn("flex items-center gap-1 text-[11px] font-medium shrink-0", tone)}>
                  <Icon className="w-3 h-3" />
                  {isCancelled
                    ? "cancelled"
                    : isOverdue
                    ? `${Math.abs(d || 0)}d overdue`
                    : d !== null
                    ? `${d}d`
                    : "—"}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

const TONE: Record<string, string> = {
  default: "bg-primary/10 text-primary",
  emerald: "bg-emerald-500/10 text-emerald-600",
  amber: "bg-amber-500/10 text-amber-600",
  rose: "bg-rose-500/10 text-rose-600",
};

const Stat = ({
  label, value, icon: Icon, tone, loading,
}: { label: string; value: number; icon: any; tone: keyof typeof TONE | string; loading?: boolean }) => (
  <div className="rounded-lg bg-secondary/40 p-2">
    <div className="flex items-center justify-between">
      <span className="text-[9px] uppercase tracking-wide text-muted-foreground font-medium">{label}</span>
      <div className={cn("w-5 h-5 rounded-md flex items-center justify-center", TONE[tone] || TONE.default)}>
        <Icon className="w-3 h-3" />
      </div>
    </div>
    {loading ? <Skeleton className="h-5 w-8 mt-1" /> : <p className="text-base font-bold mt-0.5 tabular-nums">{value}</p>}
  </div>
);

export default RecurringHealthWidget;

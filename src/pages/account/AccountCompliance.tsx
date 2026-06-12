import { useMemo, useState } from "react";
import AccountLayout from "@/components/account/AccountLayout";
import { useCustomerServices, daysUntil, CustomerService } from "@/hooks/use-customer-services";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  CalendarDays, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2,
  Clock, Bell, RotateCw, Sparkles, Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { db } from "@/integrations/db/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEKDAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const toneFor = (d: number | null) => {
  if (d === null) return { bg: "bg-muted", text: "text-muted-foreground", label: "no date" };
  if (d < 0) return { bg: "bg-rose-500", text: "text-rose-600", label: "Overdue" };
  if (d <= 7) return { bg: "bg-rose-500", text: "text-rose-600", label: "Critical" };
  if (d <= 30) return { bg: "bg-amber-500", text: "text-amber-600", label: "Soon" };
  if (d <= 90) return { bg: "bg-blue-500", text: "text-blue-600", label: "Upcoming" };
  return { bg: "bg-emerald-500", text: "text-emerald-600", label: "Healthy" };
};

const AccountCompliance = () => {
  usePageTitle("Compliance Calendar");
  const { data, isLoading } = useCustomerServices({ type: "recurring" });
  const qc = useQueryClient();
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [tab, setTab] = useState<"all" | "30" | "90" | "overdue">("all");

  const services = data || [];

  const stats = useMemo(() => {
    const overdue = services.filter((s) => {
      const d = daysUntil(s.current_period_end);
      return d !== null && d < 0;
    }).length;
    const within30 = services.filter((s) => {
      const d = daysUntil(s.current_period_end);
      return d !== null && d >= 0 && d <= 30;
    }).length;
    const within90 = services.filter((s) => {
      const d = daysUntil(s.current_period_end);
      return d !== null && d > 30 && d <= 90;
    }).length;
    const autoOn = services.filter((s) => s.auto_renew).length;
    return { overdue, within30, within90, autoOn, total: services.length };
  }, [services]);

  const eventsByDay = useMemo(() => {
    const map: Record<string, CustomerService[]> = {};
    services.forEach((s) => {
      if (!s.current_period_end) return;
      const d = new Date(s.current_period_end);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      (map[key] ||= []).push(s);
    });
    return map;
  }, [services]);

  const upcoming = useMemo(() => {
    const list = services
      .filter((s) => s.current_period_end)
      .map((s) => ({ s, d: daysUntil(s.current_period_end)! }))
      .sort((a, b) => a.d - b.d);
    return list.filter(({ d }) => {
      if (tab === "overdue") return d < 0;
      if (tab === "30") return d >= 0 && d <= 30;
      if (tab === "90") return d >= 0 && d <= 90;
      return true;
    });
  }, [services, tab]);

  const toggleAutoRenew = async (id: string, value: boolean) => {
    const { error } = await db.functions.invoke("cancel-recurring", {
      body: { service_id: id, auto_renew: value },
    });
    if (error) toast.error(error.message);
    else {
      toast.success(value ? "Auto-renew enabled" : "Auto-renew cancelled");
      qc.invalidateQueries({ queryKey: ["customer-services"] });
    }
  };

  const sendReminder = async (s: CustomerService) => {
    const { error } = await db.functions.invoke("send-transactional-email", {
      body: {
        templateName: "service-renewal-reminder",
        recipientEmail: s.customer_email,
        templateData: {
          name: s.customer_email.split("@")[0],
          serviceName: s.service_name,
          renewalDate: s.current_period_end ? new Date(s.current_period_end).toLocaleDateString() : "",
          daysRemaining: daysUntil(s.current_period_end) ?? 7,
          amount: `${s.currency} ${Number(s.price).toFixed(2)}`,
          cycle: s.billing_cycle,
        },
      },
    });
    if (error) toast.error(error.message);
    else toast.success("Reminder email sent");
  };

  // calendar grid
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ day: number | null; date?: Date; events: CustomerService[] }> = [];
  for (let i = 0; i < firstDay; i++) cells.push({ day: null, events: [] });
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${month}-${d}`;
    cells.push({ day: d, date: new Date(year, month, d), events: eventsByDay[key] || [] });
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, events: [] });

  return (
    <AccountLayout
      title="Compliance Calendar"
      description="Track upcoming renewals, send reminders, and check out in one click."
      actions={
        <Button variant="outline" className="rounded-full" onClick={() => qc.invalidateQueries({ queryKey: ["customer-services"] })}>
          <RotateCw className="w-4 h-4 mr-1.5" /> Refresh
        </Button>
      }
    >
      {/* Stat strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard icon={AlertTriangle} label="Overdue" value={stats.overdue} tone="rose" loading={isLoading} />
        <StatCard icon={Clock} label="Due ≤ 30 days" value={stats.within30} tone="amber" loading={isLoading} />
        <StatCard icon={CalendarDays} label="Due 31–90 days" value={stats.within90} tone="blue" loading={isLoading} />
        <StatCard icon={CheckCircle2} label="Auto-renew on" value={`${stats.autoOn}/${stats.total}`} tone="emerald" loading={isLoading} />
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5">
        {/* Calendar */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              <h2 className="font-heading font-semibold text-lg">
                {MONTHS[month]} {year}
              </h2>
            </div>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="rounded-full h-9 w-9" onClick={() => setCursor(new Date(year, month - 1, 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" className="rounded-full h-9" onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}>
                Today
              </Button>
              <Button size="icon" variant="ghost" className="rounded-full h-9 w-9" onClick={() => setCursor(new Date(year, month + 1, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 text-[11px] font-semibold uppercase text-muted-foreground border-b border-border">
            {WEEKDAYS.map((w) => (
              <div key={w} className="px-2 py-2 text-center">{w}</div>
            ))}
          </div>

          {isLoading ? (
            <div className="p-4"><Skeleton className="h-80 w-full rounded-lg" /></div>
          ) : (
            <div className="grid grid-cols-7">
              {cells.map((c, i) => {
                const isToday = c.date && c.date.toDateString() === today.toDateString();
                const hasEvents = c.events.length > 0;
                const tone = hasEvents ? toneFor(daysUntil(c.events[0].current_period_end!)) : null;
                return (
                  <div
                    key={i}
                    className={cn(
                      "min-h-[88px] border-r border-b border-border p-1.5 text-xs relative",
                      !c.day && "bg-muted/20",
                      isToday && "bg-primary/5"
                    )}
                  >
                    {c.day && (
                      <>
                        <div className={cn(
                          "inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-medium mb-1",
                          isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                        )}>
                          {c.day}
                        </div>
                        <div className="space-y-1">
                          {c.events.slice(0, 2).map((e) => {
                            const t = toneFor(daysUntil(e.current_period_end));
                            return (
                              <Link
                                key={e.id}
                                to={`/checkout?renew=${e.id}`}
                                className={cn(
                                  "block truncate rounded px-1.5 py-0.5 text-[10px] font-medium text-white hover:opacity-90 transition",
                                  t.bg
                                )}
                                title={`${e.service_name} — Renew now`}
                              >
                                {e.service_name}
                              </Link>
                            );
                          })}
                          {c.events.length > 2 && (
                            <p className="text-[10px] text-muted-foreground px-1">+{c.events.length - 2} more</p>
                          )}
                        </div>
                        {tone && !c.events.length && <span className={cn("absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full", tone.bg)} />}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* legend */}
          <div className="flex flex-wrap gap-3 p-3 border-t border-border text-[11px] text-muted-foreground">
            <LegendDot color="bg-rose-500" label="Overdue / ≤7d" />
            <LegendDot color="bg-amber-500" label="≤30 days" />
            <LegendDot color="bg-blue-500" label="≤90 days" />
            <LegendDot color="bg-emerald-500" label="Healthy" />
          </div>
        </div>

        {/* Upcoming list */}
        <div className="rounded-2xl border border-border bg-card flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-heading font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> Upcoming renewals
              </h2>
            </div>
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList className="bg-secondary/50 h-auto p-1 w-full grid grid-cols-4">
                <TabsTrigger value="all" className="rounded-full text-xs">All</TabsTrigger>
                <TabsTrigger value="overdue" className="rounded-full text-xs">Overdue</TabsTrigger>
                <TabsTrigger value="30" className="rounded-full text-xs">≤30d</TabsTrigger>
                <TabsTrigger value="90" className="rounded-full text-xs">≤90d</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[520px] divide-y divide-border">
            {isLoading ? (
              <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
            ) : upcoming.length === 0 ? (
              <div className="p-10 text-center">
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500/50 mb-2" />
                <p className="font-medium">All clear!</p>
                <p className="text-xs text-muted-foreground mt-1">No renewals in this window.</p>
              </div>
            ) : (
              upcoming.map(({ s, d }) => {
                const t = toneFor(d);
                return (
                  <div key={s.id} className="p-4 hover:bg-secondary/30 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={cn("w-1 self-stretch rounded-full", t.bg)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{s.service_name}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {s.billing_cycle} · {s.category.replace("_", " ")}
                            </p>
                          </div>
                          <Badge variant="outline" className={cn("shrink-0 capitalize", t.text, "border-current/20")}>
                            {t.label}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between mt-2 text-xs">
                          <span className="text-muted-foreground">
                            {s.current_period_end ? new Date(s.current_period_end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                          </span>
                          <span className={cn("font-semibold", t.text)}>
                            {d < 0 ? `${Math.abs(d)}d overdue` : `in ${d}d`}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                          <Link to={`/checkout?renew=${s.id}`}>
                            <Button size="sm" variant="hero" className="rounded-full h-8 px-3">
                              <Zap className="w-3.5 h-3.5 mr-1" /> Renew · ${Number(s.price).toFixed(2)}
                            </Button>
                          </Link>
                          <Button size="sm" variant="outline" className="rounded-full h-8 px-3" onClick={() => sendReminder(s)}>
                            <Bell className="w-3.5 h-3.5 mr-1" /> Remind me
                          </Button>
                          <div className="ml-auto flex items-center gap-1.5">
                            <span className="text-[11px] text-muted-foreground">Auto</span>
                            <Switch checked={s.auto_renew} onCheckedChange={(v) => toggleAutoRenew(s.id, v)} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </AccountLayout>
  );
};

const StatCard = ({ icon: Icon, label, value, tone, loading }: { icon: any; label: string; value: number | string; tone: string; loading?: boolean }) => {
  const map: Record<string, string> = {
    rose: "bg-rose-500/10 text-rose-600",
    amber: "bg-amber-500/10 text-amber-600",
    blue: "bg-blue-500/10 text-blue-600",
    emerald: "bg-emerald-500/10 text-emerald-600",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", map[tone])}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-2">
        {loading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold tabular-nums">{value}</p>}
      </div>
    </div>
  );
};

const LegendDot = ({ color, label }: { color: string; label: string }) => (
  <span className="inline-flex items-center gap-1.5">
    <span className={cn("w-2.5 h-2.5 rounded-full", color)} />
    {label}
  </span>
);

export default AccountCompliance;

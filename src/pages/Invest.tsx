import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  TrendingUp, Shield, Vote, FileText, Users, Gift, Sparkles, ArrowRight,
  CheckCircle2, Lock, BarChart3, Globe, Loader2, LogIn, UserPlus, MessageCircle,
} from "lucide-react";
import { useInvestmentPlans, useInvestSettings, type InvestmentPlan } from "@/hooks/use-invest";
import ProfitCalculator from "@/components/invest/ProfitCalculator";
import InvestLeadForm from "@/components/invest/InvestLeadForm";
import DOMPurify from "isomorphic-dompurify";
import ChartExportButtons from "@/components/invest/ChartExportButtons";
import InteractiveLegend from "@/components/invest/InteractiveLegend";
import ModernFaq from "@/components/shared/ModernFaq";
import CurrencySwitcher from "@/components/shared/CurrencySwitcher";
import { useExchangeRates } from "@/hooks/use-exchange-rates";
import {
  detectDefaultCurrency,
  formatCurrency as fmtCur,
  FALLBACK_RATES,
  type CurrencyCode,
} from "@/lib/currency";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList,
} from "recharts";
import { usePageSEO } from "@/hooks/use-page-seo";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--primary) / 0.75)",
  "hsl(var(--primary) / 0.55)",
  "hsl(var(--primary) / 0.4)",
  "hsl(var(--primary) / 0.28)",
  "hsl(var(--primary) / 0.18)",
];

type TooltipRow = { label: string; value: string; muted?: boolean };
const ChartTooltipCard = ({
  active, color, rows,
}: { active?: boolean; color?: string; rows: TooltipRow[] }) => {
  if (!active || !rows.length) return null;
  return (
    <div className="rounded-md border bg-popover text-popover-foreground shadow-md px-3 py-2 text-xs min-w-[140px]">
      {rows.map((r, i) => (
        <div
          key={i}
          className={
            "flex items-center justify-between gap-3 " +
            (i === 0 ? "font-semibold" : r.muted ? "text-muted-foreground" : "")
          }
        >
          {i === 0 && color ? (
            <span className="flex items-center gap-1.5 min-w-0">
              <span className="h-2 w-2 rounded-sm shrink-0" style={{ background: color }} />
              <span className="truncate">{r.label}</span>
            </span>
          ) : (
            <span className="truncate">{r.label}</span>
          )}
          <span className="tabular-nums">{r.value}</span>
        </div>
      ))}
    </div>
  );
};

const convertAmount = (
  amount: number,
  from: string,
  to: CurrencyCode,
  rates: Record<string, number>,
) => {
  const rFrom = rates[from] ?? FALLBACK_RATES[from as CurrencyCode] ?? 1;
  const rTo = rates[to] ?? FALLBACK_RATES[to] ?? 1;
  return (amount / rFrom) * rTo;
};

const benefitIcons: Record<string, any> = {
  "trending-up": TrendingUp,
  shield: Shield,
  vote: Vote,
  "file-text": FileText,
  users: Users,
  gift: Gift,
};


const PlanCard = ({
  plan,
  isAuthed,
  displayCurrency,
  rates,
}: {
  plan: InvestmentPlan;
  isAuthed: boolean;
  displayCurrency: CurrencyCode;
  rates: Record<string, number>;
}) => {
  const allocatedPct = plan.capacity ? Math.min(100, (plan.allocated / plan.capacity) * 100) : null;
  const conv = (n: number) => fmtCur(convertAmount(n, plan.currency, displayCurrency, rates), displayCurrency);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
    >
      <Card
        className={`relative h-full flex flex-col ${
          plan.is_featured ? "border-primary shadow-lg shadow-primary/10" : ""
        }`}
      >
        {plan.is_featured && (
          <Badge className="absolute -top-3 left-6 bg-primary text-primary-foreground">
            <Sparkles className="h-3 w-3 mr-1" /> Most popular
          </Badge>
        )}
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">{plan.name}</CardTitle>
            <Badge variant="outline" className="capitalize">{plan.tier}</Badge>
          </div>
          {plan.tagline && <p className="text-sm text-muted-foreground">{plan.tagline}</p>}
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4">
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold tabular-nums">{plan.roi_percent}%</span>
            <span className="text-sm text-muted-foreground pb-1">target annual ROI</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <Meta label="Min" value={conv(plan.min_amount)} />
            <Meta
              label="Max"
              value={plan.max_amount ? conv(plan.max_amount) : "Unlimited"}
            />
            <Meta label="Lock-in" value={`${plan.lock_period_days} days`} />
            <Meta label="Payouts" value={plan.payout_frequency} />
            <Meta label="Profit share" value={`${plan.profit_share_percent}%`} />
            <Meta label="Risk" value={plan.risk_level} />
          </div>

          <ul className="space-y-1.5 text-sm">
            {plan.highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span>{h}</span>
              </li>
            ))}
          </ul>

          {allocatedPct != null && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Allocated</span>
                <span>{allocatedPct.toFixed(0)}% of capacity</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${allocatedPct}%` }} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mt-auto">
            <Button asChild variant={plan.is_featured ? "default" : "outline"}>
              <Link to={`/investor/login?next=${encodeURIComponent(`/investor?plan=${plan.slug}`)}`}>
                {isAuthed ? "Invest now" : "Apply"} <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={`/invest?plan=${plan.slug}#contact`}>
                <MessageCircle className="mr-1 h-4 w-4" /> Consult
              </Link>
            </Button>
          </div>
          {!isAuthed && (
            <Link
              to={`/investor/login?next=${encodeURIComponent(`/invest?plan=${plan.slug}#contact`)}`}
              className="text-xs text-center text-muted-foreground hover:text-primary inline-flex items-center justify-center gap-1"
            >
              <LogIn className="h-3 w-3" /> Sign in to reserve this plan
            </Link>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

const Meta = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border bg-muted/30 px-2.5 py-1.5">
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="text-sm font-medium capitalize">{value}</div>
  </div>
);

const StatusDot = ({ status }: { status: string }) => {
  const cls =
    status === "done"
      ? "bg-emerald-500"
      : status === "in_progress"
      ? "bg-amber-500 animate-pulse"
      : "bg-muted-foreground/40";
  return <span className={`h-2.5 w-2.5 rounded-full ${cls}`} />;
};

const AllocationCard = ({
  title,
  items,
  exportName,
}: {
  title: string;
  items: { label: string; percent: number }[];
  exportName: string;
}) => {
  const data = items.filter((i) => Number(i.percent) > 0);
  const totalPercent = data.reduce((s, r) => s + (Number(r.percent) || 0), 0) || 100;
  const cardRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const toggle = (i: number) => setActiveIndex((cur) => (cur === i ? null : i));
  return (
    <Card ref={cardRef}>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">{title}</CardTitle>
        <ChartExportButtons targetRef={cardRef} filename={exportName} />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="percent"
                  nameKey="label"
                  innerRadius="55%"
                  outerRadius="90%"
                  paddingAngle={2}
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                  onClick={(_, idx) => toggle(idx)}
                  className="cursor-pointer outline-none"
                >
                  {data.map((_, i) => (
                    <Cell
                      key={i}
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                      fillOpacity={activeIndex === null || activeIndex === i ? 1 : 0.25}
                      stroke={activeIndex === i ? "hsl(var(--primary))" : "hsl(var(--background))"}
                      strokeWidth={activeIndex === i ? 2 : 2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                  content={({ active, payload }: any) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0];
                    const idx = data.findIndex((d) => d.label === p?.payload?.label);
                    const color = CHART_COLORS[(idx >= 0 ? idx : 0) % CHART_COLORS.length];
                    const pct = Number(p.value) || 0;
                    const share = Math.round((pct / totalPercent) * 1000) / 10;
                    return (
                      <ChartTooltipCard
                        active
                        color={color}
                        rows={[
                          { label: p.payload?.label ?? "", value: `${pct}%` },
                          { label: "Share of total", value: `${share}%`, muted: true },
                        ]}
                      />
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <InteractiveLegend
            items={data.map((it) => ({ label: it.label, value: `${it.percent}%` }))}
            colors={CHART_COLORS}
            activeIndex={activeIndex}
            onToggle={toggle}
          />
        </div>
      </CardContent>
    </Card>
  );
};

type ValueMode = "amount" | "percent";

const InvestorDistributionCard = ({
  items,
  goal,
  cardRef,
  mode,
}: {
  items: { label: string; amount: number }[];
  goal: number;
  cardRef: React.RefObject<HTMLDivElement>;
  mode: ValueMode;
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const toggle = (i: number) => setActiveIndex((cur) => (cur === i ? null : i));
  const data = items.map((d) => ({
    ...d,
    percent: goal ? Math.round((d.amount / goal) * 1000) / 10 : 0,
  }));
  const dataKey = mode === "amount" ? "amount" : "percent";
  return (
    <Card ref={cardRef}>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">Investor collection distribution</CardTitle>
        <ChartExportButtons targetRef={cardRef} filename="investor-distribution" />
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2 items-center">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey={dataKey}
                nameKey="label"
                innerRadius="50%"
                outerRadius="90%"
                paddingAngle={2}
                stroke="hsl(var(--background))"
                strokeWidth={2}
                onClick={(_, idx) => toggle(idx)}
                className="cursor-pointer outline-none"
              >
                {data.map((_, i) => (
                  <Cell
                    key={i}
                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                    fillOpacity={activeIndex === null || activeIndex === i ? 1 : 0.25}
                  />
                ))}
              </Pie>
              <Tooltip
                cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0]?.payload ?? {};
                  const idx = data.findIndex((d) => d.label === row.label);
                  const color = CHART_COLORS[(idx >= 0 ? idx : 0) % CHART_COLORS.length];
                  const amount = Number(row.amount) || 0;
                  const pct = goal ? Math.round((amount / goal) * 1000) / 10 : 0;
                  const primary: TooltipRow = mode === "amount"
                    ? { label: row.label ?? "", value: `$${amount.toLocaleString()}` }
                    : { label: row.label ?? "", value: `${pct}%` };
                  const secondary: TooltipRow = mode === "amount"
                    ? { label: "% of goal", value: `${pct}%`, muted: true }
                    : { label: "Amount", value: `$${amount.toLocaleString()}`, muted: true };
                  return (
                    <ChartTooltipCard
                      active
                      color={color}
                      rows={[
                        primary,
                        secondary,
                        ...(goal ? [{ label: "Goal", value: `$${goal.toLocaleString()}`, muted: true }] : []),
                      ]}
                    />
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <InteractiveLegend
          items={data.map((d) => ({
            label: d.label,
            value: mode === "amount"
              ? `$${d.amount.toLocaleString()}`
              : `${d.percent}%`,
          }))}
          colors={CHART_COLORS}
          activeIndex={activeIndex}
          onToggle={toggle}
        />
      </CardContent>
    </Card>
  );
};

const EquityStructureCard = ({
  items,
  goal,
  note,
  cardRef,
  mode,
}: {
  items: { amount: number; equity: string }[];
  goal: number;
  note?: string;
  cardRef: React.RefObject<HTMLDivElement>;
  mode: ValueMode;
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const toggle = (i: number) => setActiveIndex((cur) => (cur === i ? null : i));
  const data = items.map((e) => {
    const pct = goal ? Math.round((e.amount / goal) * 1000) / 10 : 0;
    return {
      label: mode === "amount" ? `$${e.amount.toLocaleString()}` : `${pct}%`,
      amount: e.amount,
      percent: pct,
      equity: e.equity,
    };
  });
  const barKey = mode === "amount" ? "amount" : "percent";
  return (
    <Card ref={cardRef}>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">Equity structure (strategic only)</CardTitle>
        <ChartExportButtons targetRef={cardRef} filename="equity-structure" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 16, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0]?.payload ?? {};
                  const idx = items.findIndex((e) => e.amount === row.amount && e.equity === row.equity);
                  const color = CHART_COLORS[(idx >= 0 ? idx : 0) % CHART_COLORS.length];
                  const amount = Number(row.amount) || 0;
                  const pct = goal ? Math.round((amount / goal) * 1000) / 10 : 0;
                  return (
                    <ChartTooltipCard
                      active
                      color={color}
                      rows={[
                        { label: `Tier ${idx + 1}`, value: mode === "amount" ? `$${amount.toLocaleString()}` : `${pct}%` },
                        { label: "Equity", value: String(row.equity ?? "—") },
                        mode === "amount"
                          ? { label: "% of goal", value: `${pct}%`, muted: true }
                          : { label: "Amount", value: `$${amount.toLocaleString()}`, muted: true },
                      ]}
                    />
                  );
                }}
              />
              <Bar
                dataKey={barKey}
                radius={[6, 6, 0, 0]}
                onClick={(_, idx) => toggle(idx)}
                className="cursor-pointer"
              >
                {items.map((_, i) => (
                  <Cell
                    key={i}
                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                    fillOpacity={activeIndex === null || activeIndex === i ? 1 : 0.25}
                  />
                ))}
                <LabelList
                  dataKey="equity"
                  position="top"
                  style={{ fill: "hsl(var(--foreground))", fontSize: 11, fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <InteractiveLegend
          variant="compact"
          items={items.map((e, i) => {
            const pct = goal ? Math.round((e.amount / goal) * 1000) / 10 : 0;
            return {
              label: `Tier ${i + 1} · ${mode === "amount" ? `$${e.amount.toLocaleString()}` : `${pct}%`}`,
              value: e.equity,
            };
          })}
          colors={CHART_COLORS}
          activeIndex={activeIndex}
          onToggle={toggle}
        />
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
      </CardContent>
    </Card>
  );
};

const Invest = () => {
  const { data: plans, isLoading: plansLoading } = useInvestmentPlans();
  const { data: settings, isLoading: setLoading } = useInvestSettings();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const presetPlan = searchParams.get("plan") ?? "";
  const investorDistRef = useRef<HTMLDivElement>(null);
  const equityRef = useRef<HTMLDivElement>(null);
  const [chartValueMode, setChartValueMode] = useState<ValueMode>("amount");

  const hero = settings?.hero;
  const stats = settings?.stats?.items ?? [];
  const benefits = settings?.benefits?.items ?? [];
  const roadmap = settings?.roadmap?.items ?? [];
  const faq = settings?.faq?.items ?? [];
  const policy = settings?.policy?.html ?? "";
  const safePolicy = DOMPurify.sanitize(policy, { USE_PROFILES: { html: true } });

  usePageSEO("invest", {
    jsonLd: faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map((f: { q: string; a: string }) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : undefined,
  });
  const fundraising = (settings as any)?.fundraising as
    | {
        goal_amount?: number;
        currency?: string;
        goal_title?: string;
        goal_subtitle?: string;
        goal_uses?: string[];
        investor_distribution?: { label: string; amount: number }[];
        profit_allocation?: { label: string; percent: number }[];
        monthly_revenue_allocation?: { label: string; percent: number }[];
        equity_structure?: { amount: number; equity: string }[];
        equity_cap_note?: string;
        return_targets?: { risk: string; return: string }[];
        phases?: { name: string; items: string[] }[];
        messaging_note?: string;
      }
    | undefined;

  const loading = plansLoading || setLoading;
  const queryClient = useQueryClient();
  const { rates } = useExchangeRates();
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>(() => detectDefaultCurrency("invest"));

  // Realtime updates: re-fetch plans whenever the table changes
  useEffect(() => {
    const channel = supabase
      .channel("invest-plans-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "investment_plans" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["investment-plans", "active"] });
          queryClient.invalidateQueries({ queryKey: ["investment-plans", "all"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "invest_settings" },
        () => queryClient.invalidateQueries({ queryKey: ["invest-settings"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  useEffect(() => {
    if (!presetPlan || loading) return;
    const t = window.setTimeout(() => {
      document.getElementById("contact")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 250);
    return () => window.clearTimeout(t);
  }, [presetPlan, loading]);

  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Invest in Dynime Inc. — Shareholder Portal";
    const meta = document.querySelector('meta[name="description"]');
    const prevDesc = meta?.getAttribute("content") ?? "";
    meta?.setAttribute(
      "content",
      "Become a Dynime Inc. shareholder. Transparent revenue-sharing plans, monthly or quarterly payouts, lock-in protection, and full reporting.",
    );
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FinancialProduct",
      name: "Dynime Investment & Shareholder Portal",
      provider: { "@type": "Organization", name: "Dynime Inc." },
      description: "Revenue-sharing investment plans for Dynime Inc. shareholders.",
    });
    document.head.appendChild(ld);
    return () => {
      document.title = prevTitle;
      if (prevDesc) meta?.setAttribute("content", prevDesc);
      document.head.removeChild(ld);
    };
  }, []);

  return (
    <Layout>

      {/* HERO */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.18),transparent_60%)] pointer-events-none" />
        <div className="container mx-auto px-4 py-20 md:py-28 relative">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <Badge variant="secondary" className="mx-auto">
              <Sparkles className="h-3 w-3 mr-1" />
              {hero?.eyebrow ?? "Dynime Investment Portal"}
            </Badge>
            <h1 className="font-heading text-4xl md:text-6xl font-bold leading-tight">
              {hero?.title ?? "Invest in Dynime Inc. Share the upside."}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {hero?.subtitle ??
                "Become a revenue-sharing shareholder in a profitable, multi-vertical technology company."}
            </p>
            <div className="flex flex-col items-center gap-3 pt-2">
              <div className="flex flex-wrap justify-center gap-3">
                <Button size="lg" asChild>
                  <Link to={`/investor/login?next=${encodeURIComponent("/investor")}`}>{hero?.primary_cta ?? "Start Investing"} <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                {(() => {
                  const secondary = (hero?.secondary_cta ?? "Calculate Returns").trim();
                  if (/investor\s*portal/i.test(secondary)) return null; // dedupe with the dedicated portal button below
                  return (
                    <Button size="lg" variant="outline" asChild>
                      <a href="#calculator">{secondary}</a>
                    </Button>
                  );
                })()}
                {user ? (
                  <Button size="lg" variant="outline" asChild>
                    <Link to="/investor">
                      <LogIn className="mr-2 h-4 w-4" /> Open investor portal
                    </Link>
                  </Button>
                ) : (
                  <Button size="lg" variant="outline" asChild>
                    <Link
                      to={`/investor/login?next=${encodeURIComponent(`/invest${presetPlan ? `?plan=${presetPlan}` : ""}#contact`)}`}
                    >
                      <LogIn className="mr-2 h-4 w-4" /> Investor portal
                    </Link>
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                <a href="#policy" className="inline-flex items-center gap-1 hover:text-primary transition-colors">
                  Investment policy <ArrowRight className="h-3 w-3" />
                </a>
                {!user && (
                  <Link
                    to={`/investor/login?next=${encodeURIComponent(`/invest${presetPlan ? `?plan=${presetPlan}` : ""}#contact`)}`}
                    className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    <UserPlus className="h-3.5 w-3.5" /> Create investor account
                  </Link>
                )}
              </div>
            </div>
            {hero?.trust_line && (
              <p className="text-sm text-muted-foreground pt-2">{hero.trust_line}</p>
            )}
          </div>

          {/* Stats strip */}
          {stats.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-14 max-w-5xl mx-auto">
              {stats.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl border bg-card/60 backdrop-blur p-4 text-center"
                >
                  <div className="text-2xl md:text-3xl font-bold tabular-nums">{s.value}</div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mt-1">
                    {s.label}
                  </div>
                  {s.sub && <div className="text-[11px] text-muted-foreground mt-0.5">{s.sub}</div>}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* PLANS */}
      <section id="plans" className="container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto text-center mb-8 space-y-3">
          <Badge variant="outline">Investment plans</Badge>
          <h2 className="font-heading text-3xl md:text-4xl font-bold">Choose your shareholder tier</h2>
          <p className="text-muted-foreground">
            Every plan is revenue-sharing. Higher tiers unlock larger share, faster payouts, and strategic access.
          </p>
        </div>
        <div className="flex justify-center mb-10">
          <CurrencySwitcher
            value={displayCurrency}
            onChange={(c) => setDisplayCurrency(c)}
          />
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (plans?.length ?? 0) === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No plans published yet.</CardContent></Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {plans!.map((p) => (
              <PlanCard key={p.id} plan={p} isAuthed={!!user} displayCurrency={displayCurrency} rates={rates} />
            ))}
          </div>
        )}
      </section>

      {/* FUNDRAISING PLAN */}
      {fundraising && (
        <section id="fundraising" className="border-y bg-gradient-to-b from-background via-primary/5 to-background">
          <div className="container mx-auto px-4 py-20 space-y-12">
            <div className="flex flex-col items-center gap-4">
              <div className="max-w-2xl mx-auto text-center space-y-3">
                <Badge variant="outline"><BarChart3 className="h-3 w-3 mr-1" /> Fundraising plan</Badge>
                <h2 className="font-heading text-3xl md:text-4xl font-bold">
                  {fundraising.goal_title ?? "Our fundraising plan"}
                </h2>
                {fundraising.goal_subtitle && (
                  <p className="text-muted-foreground">{fundraising.goal_subtitle}</p>
                )}
              </div>
              <div
                role="tablist"
                aria-label="Chart value mode"
                className="inline-flex rounded-full border bg-muted/30 p-0.5 text-xs"
              >
                {(["amount", "percent"] as ValueMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={chartValueMode === m}
                    onClick={() => setChartValueMode(m)}
                    className={`px-3 py-1.5 rounded-full transition-colors ${
                      chartValueMode === m
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m === "amount" ? "Amounts ($)" : "% of goal"}
                  </button>
                ))}
              </div>
            </div>

            {/* Goal + uses */}
            <div className="grid gap-5 lg:grid-cols-3">
              <Card className="lg:col-span-1 border-primary/40">
                <CardContent className="p-6 space-y-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Fundraising goal</p>
                  <p className="font-heading text-4xl font-bold text-primary">
                    ${(fundraising.goal_amount ?? 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Hybrid structure — small, medium and strategic investors.
                  </p>
                </CardContent>
              </Card>
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle className="text-base">What we&apos;ll use it for</CardTitle></CardHeader>
                <CardContent>
                  <ul className="grid sm:grid-cols-2 gap-2 text-sm">
                    {(fundraising.goal_uses ?? []).map((u, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> {u}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Investor distribution */}
            {fundraising.investor_distribution?.length ? (
              <InvestorDistributionCard
                items={fundraising.investor_distribution}
                goal={fundraising.goal_amount ?? 0}
                cardRef={investorDistRef}
                mode={chartValueMode}
              />
            ) : null}

            {/* Profit & revenue allocation side by side */}
            <div className="grid gap-5 md:grid-cols-2">
              <AllocationCard title="Recommended profit allocation" items={fundraising.profit_allocation ?? []} exportName="profit-allocation" />
              <AllocationCard title="Monthly revenue allocation" items={fundraising.monthly_revenue_allocation ?? []} exportName="monthly-revenue-allocation" />
            </div>

            {/* Equity + return targets */}
            <div className="grid gap-5 md:grid-cols-2">
              {fundraising.equity_structure?.length ? (
                <EquityStructureCard
                  items={fundraising.equity_structure}
                  goal={fundraising.goal_amount ?? 0}
                  note={fundraising.equity_cap_note}
                  cardRef={equityRef}
                  mode={chartValueMode}
                />
              ) : null}

              {fundraising.return_targets?.length ? (
                <Card>
                  <CardHeader><CardTitle className="text-base">Investor return targets</CardTitle></CardHeader>
                  <CardContent>
                    <div className="rounded-md border divide-y text-sm">
                      <div className="grid grid-cols-2 px-3 py-2 font-medium text-muted-foreground">
                        <span>Risk level</span><span>Annual return</span>
                      </div>
                      {fundraising.return_targets.map((r, i) => (
                        <div key={i} className="grid grid-cols-2 px-3 py-2">
                          <span>{r.risk}</span>
                          <span className="font-semibold text-primary">{r.return}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </div>

            {/* Phases */}
            {fundraising.phases?.length ? (
              <div className="grid gap-5 md:grid-cols-3">
                {fundraising.phases.map((p, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Badge variant="secondary" className="w-fit">{p.name}</Badge>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        {p.items.map((it, j) => (
                          <li key={j} className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> {it}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : null}

            {fundraising.messaging_note && (
              <p className="text-center text-xs text-muted-foreground max-w-2xl mx-auto">
                {fundraising.messaging_note}
              </p>
            )}
          </div>
        </section>
      )}

      {/* CALCULATOR */}
      <section id="calculator" className="border-y section-tint-a">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-2xl mx-auto text-center mb-10 space-y-3">
            <Badge variant="outline"><BarChart3 className="h-3 w-3 mr-1" /> Live calculator</Badge>
            <h2 className="font-heading text-3xl md:text-4xl font-bold">Project your returns</h2>
            <p className="text-muted-foreground">
              All values update instantly. Adjust amount, duration, and reinvestment to model your outcome.
            </p>
          </div>
          {!loading && plans && settings && (
            <ProfitCalculator
              plans={plans}
              settings={settings}
              displayCurrency={displayCurrency}
              onChangeCurrency={setDisplayCurrency}
              rates={rates}
            />
          )}
        </div>
      </section>

      {/* BENEFITS */}
      {benefits.length > 0 && (
        <section className="container mx-auto px-4 py-20">
          <div className="max-w-2xl mx-auto text-center mb-12 space-y-3">
            <Badge variant="outline">Shareholder benefits</Badge>
            <h2 className="font-heading text-3xl md:text-4xl font-bold">More than just returns</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((b, i) => {
              const Icon = benefitIcons[b.icon] ?? Sparkles;
              return (
                <Card key={i} className="hover:border-primary/40 transition-colors">
                  <CardContent className="p-6 space-y-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold">{b.title}</h3>
                    <p className="text-sm text-muted-foreground">{b.body}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* ROADMAP */}
      {roadmap.length > 0 && (
        <section className="border-y section-tint-a">
          <div className="container mx-auto px-4 py-20">
            <div className="max-w-2xl mx-auto text-center mb-12 space-y-3">
              <Badge variant="outline">Investment roadmap</Badge>
              <h2 className="font-heading text-3xl md:text-4xl font-bold">Where your capital is going</h2>
            </div>
            <div className="max-w-3xl mx-auto relative">
              <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />
              <div className="space-y-6">
                {roadmap.map((r, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="relative pl-10"
                  >
                    <div className="absolute left-0 top-1.5 flex items-center justify-center h-6 w-6 rounded-full bg-background border-2 border-border">
                      <StatusDot status={r.status} />
                    </div>
                    <div className="rounded-lg border bg-card p-4">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-[10px]">{r.period}</Badge>
                        <h3 className="font-semibold">{r.title}</h3>
                        <Badge
                          variant="outline"
                          className={`capitalize text-[10px] ${
                            r.status === "done" ? "border-emerald-500/40 text-emerald-600" :
                            r.status === "in_progress" ? "border-amber-500/40 text-amber-600" :
                            ""
                          }`}
                        >
                          {r.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{r.body}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* POLICY */}
      <section id="policy" className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10 space-y-3">
            <Badge variant="outline"><Lock className="h-3 w-3 mr-1" /> Profit & risk policy</Badge>
            <h2 className="font-heading text-3xl md:text-4xl font-bold">How profit, loss & withdrawals work</h2>
          </div>
          <ModernFaq
            items={[
              {
                q: "Profit-sharing & loss policy",
                a: <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: safePolicy }} />,
              },
              ...faq.map((f) => ({ q: f.q, a: f.a })),
            ]}
          />
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="border-t section-tint-a">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8 space-y-3">
              <Badge variant="outline"><Globe className="h-3 w-3 mr-1" /> Investor relations</Badge>
              <h2 className="font-heading text-3xl md:text-4xl font-bold">Ready to talk?</h2>
              <p className="text-muted-foreground">
                A real person from our investor relations team will reach out — no automated funnel.
              </p>
            </div>
            {plans && (
              <InvestLeadForm
                plans={plans}
                targets={(settings?.targets?.items ?? []).filter((t) => t.enabled !== false)}
                initialPlanSlug={presetPlan}
                initialEmail={user?.email ?? ""}
                initialName={(user?.user_metadata as any)?.full_name ?? ""}
              />
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Invest;

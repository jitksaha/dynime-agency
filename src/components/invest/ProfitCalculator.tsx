import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { InvestmentPlan, InvestSettings, InvestmentTarget } from "@/hooks/use-invest";
import {
  calculateInvestment,
  formatCurrency,
  type CompoundingMode,
} from "@/lib/invest-math";

import { FALLBACK_RATES, type CurrencyCode } from "@/lib/currency";
import CurrencySwitcher from "@/components/shared/CurrencySwitcher";

interface Props {
  plans: InvestmentPlan[];
  settings: InvestSettings;
  displayCurrency?: CurrencyCode;
  onChangeCurrency?: (c: CurrencyCode) => void;
  rates?: Record<string, number>;
}

const convert = (amount: number, from: string, to: string, rates: Record<string, number>) => {
  const rFrom = rates[from] ?? (FALLBACK_RATES as any)[from] ?? 1;
  const rTo = rates[to] ?? (FALLBACK_RATES as any)[to] ?? 1;
  return (amount / rFrom) * rTo;
};

const ProfitCalculator = ({ plans, settings, displayCurrency, onChangeCurrency, rates }: Props) => {
  const calc = settings.calculator;
  const defaultPlan =
    plans.find((p) => p.slug === (calc?.default_plan_slug ?? "growth")) ?? plans[0];

  const fxRates = rates ?? (FALLBACK_RATES as Record<string, number>);
  const planCurrency = defaultPlan?.currency || "USD";
  const currency: CurrencyCode = (displayCurrency ?? (planCurrency as CurrencyCode));

  const targets: InvestmentTarget[] = (settings.targets?.items ?? []).filter((t) => t.enabled !== false);
  const [planSlug, setPlanSlug] = useState<string>(defaultPlan?.slug ?? "");
  const [targetSlug, setTargetSlug] = useState<string>(targets[0]?.slug ?? "");
  const initialAmount = convert(calc?.default_amount ?? 10000, planCurrency, currency, fxRates);
  const [amount, setAmount] = useState<number>(Math.round(initialAmount));
  const [duration, setDuration] = useState<number>(calc?.default_duration_months ?? 12);
  const [compounding, setCompounding] = useState<CompoundingMode>("none");
  const [reinvest, setReinvest] = useState<boolean>(false);

  // Tier 3 profit-share simulator inputs (monthly revenue per category, in display currency)
  const [webRevenue, setWebRevenue] = useState<number>(Math.round(convert(20000, "USD", currency, fxRates)));
  const [marketingRevenue, setMarketingRevenue] = useState<number>(Math.round(convert(15000, "USD", currency, fxRates)));
  const [consultingRevenue, setConsultingRevenue] = useState<number>(Math.round(convert(8000, "USD", currency, fxRates)));

  const plan = plans.find((p) => p.slug === planSlug) ?? defaultPlan;
  const target = targets.find((t) => t.slug === targetSlug);
  const roiMult = target?.roi_multiplier ?? 1;
  const shareMult = target?.profit_share_multiplier ?? 1;
  const feePercent = calc?.platform_fee_percent ?? 0;
  const planMinDisp = plan ? convert(plan.min_amount, plan.currency, currency, fxRates) : 0;
  const planMaxDisp = plan?.max_amount ? convert(plan.max_amount, plan.currency, currency, fxRates) : null;

  const result = useMemo(() => {
    if (!plan) return null;
    return calculateInvestment({
      plan: {
        slug: plan.slug,
        name: plan.name,
        roi_percent: (plan.roi_percent ?? 0) * roiMult,
        profit_share_percent: (plan.profit_share_percent ?? 0) * shareMult,
        lock_period_days: plan.lock_period_days ?? 365,
        payout_frequency: plan.payout_frequency ?? "monthly",
        min_amount: plan.min_amount ?? 0,
        max_amount: plan.max_amount ?? null,
        currency,
      },
      amount,
      durationMonths: duration,
      compounding,
      reinvest,
      profitShareInput: {
        webRevenue: webRevenue * shareMult,
        marketingRevenue: marketingRevenue * shareMult,
        consultingRevenue: consultingRevenue * shareMult,
      },
    });
  }, [plan, amount, duration, compounding, reinvest, webRevenue, marketingRevenue, consultingRevenue, currency, roiMult, shareMult]);

  if (!plan || !result) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          No active investment plans yet. Add one from the admin panel to enable the calculator.
        </CardContent>
      </Card>
    );
  }

  const platformFee = result.totalProfit * (feePercent / 100);
  const netEarnings = result.netProfit - platformFee;
  const sharePoints = result.points.map((p) => ({
    month: p.month,
    value: p.balance,
    cumulative: p.cumulativeReturn,
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Inputs */}
      <Card className="lg:col-span-2">
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-lg">Calculate your returns</CardTitle>
          {onChangeCurrency && (
            <CurrencySwitcher value={currency} onChange={onChangeCurrency} compact />
          )}
        </CardHeader>
        <CardContent className="space-y-5">
          {targets.length > 0 && (
            <div className="space-y-2">
              <Label>Where do you want to invest?</Label>
              <div role="radiogroup" aria-label="Investment target" className="grid gap-2">
                {targets.map((t) => {
                  const selected = t.slug === targetSlug;
                  const boost = Math.round(((t.roi_multiplier ?? 1) - 1) * 100);
                  return (
                    <button
                      key={t.slug}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setTargetSlug(t.slug)}
                      className={`flex items-start gap-2.5 rounded-lg border p-3 text-left transition-all ${
                        selected
                          ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                          : "border-border hover:border-primary/50 hover:bg-accent/30"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                          selected ? "border-primary" : "border-muted-foreground/40"
                        }`}
                      >
                        {selected && <span className="h-2 w-2 rounded-full bg-primary" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{t.name}</span>
                          {boost !== 0 && (
                            <Badge variant="outline" className="border-primary/40 text-primary text-[10px]">
                              {boost > 0 ? `+${boost}% ROI boost` : `${boost}% ROI`}
                            </Badge>
                          )}
                        </span>
                        {t.description && (
                          <span className="block text-xs text-muted-foreground mt-0.5">{t.description}</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Investment plan</Label>
            <div role="radiogroup" aria-label="Investment plan" className="grid gap-2 sm:grid-cols-2">
              {plans.map((p) => {
                const selected = p.slug === planSlug;
                const meta = p.roi_percent ? `${p.roi_percent}% / yr` : "Profit share";
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setPlanSlug(p.slug)}
                    className={`flex items-start gap-2.5 rounded-lg border p-3 text-left transition-all ${
                      selected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                        : "border-border hover:border-primary/50 hover:bg-accent/30"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                        selected ? "border-primary" : "border-muted-foreground/40"
                      }`}
                    >
                      {selected && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-foreground">{p.name}</span>
                      <span className="block text-xs text-muted-foreground">{meta}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Investment amount</Label>
              <span className="text-sm font-semibold">{formatCurrency(amount, currency)}</span>
            </div>
            <Input
              type="number"
              min={planMinDisp}
              max={planMaxDisp ?? undefined}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
            />
            <Slider
              min={planMinDisp}
              max={planMaxDisp ?? planMinDisp * 50}
              step={Math.max(100, Math.round((planMinDisp || 100) / 10))}
              value={[amount]}
              onValueChange={([v]) => setAmount(v)}
            />
            <p className="text-xs text-muted-foreground">
              Min {formatCurrency(planMinDisp, currency)}
              {planMaxDisp ? ` · Max ${formatCurrency(planMaxDisp, currency)}` : ""}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Duration</Label>
              <span className="text-sm font-semibold">{duration} months</span>
            </div>
            <Slider min={3} max={60} step={1} value={[duration]} onValueChange={([v]) => setDuration(v)} />
          </div>

          <div className="space-y-2">
            <Label>Compounding</Label>
            <Select value={compounding} onValueChange={(v) => setCompounding(v as CompoundingMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(calc?.compounding_options ?? ["none", "monthly", "quarterly"]).map((c) => (
                  <SelectItem key={c} value={c}>
                    {c === "none" ? "Simple (no compounding)" : c.charAt(0).toUpperCase() + c.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label className="text-sm">Reinvest profits</Label>
              <p className="text-xs text-muted-foreground">Roll payouts back into the plan</p>
            </div>
            <Switch checked={reinvest} onCheckedChange={setReinvest} />
          </div>

          {result.isProfitShare && (
            <div className="space-y-3 rounded-md border border-primary/30 bg-primary/5 p-3">
              <div>
                <Label className="text-sm font-semibold">Profit-share simulator</Label>
                <p className="text-xs text-muted-foreground">
                  Estimate your monthly cut from each business unit (Web 30% · Marketing 20% · Consulting 10%).
                </p>
              </div>
              <div className="grid gap-2">
                <RevenueInput label="Web dev monthly revenue" value={webRevenue} onChange={setWebRevenue} currency={currency} />
                <RevenueInput label="Marketing monthly revenue" value={marketingRevenue} onChange={setMarketingRevenue} currency={currency} />
                <RevenueInput label="Consulting monthly revenue" value={consultingRevenue} onChange={setConsultingRevenue} currency={currency} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      <Card className="lg:col-span-3">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-lg">Projected outcome</CardTitle>
          <Badge variant="secondary">{plan.name}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Stat label="Monthly return" value={formatCurrency(result.monthlyReturn, currency)} />
            <Stat label="Biannual bonus" value={formatCurrency(result.totalBonus, currency)} />
            <Stat label="Total profit" value={formatCurrency(result.totalProfit, currency)} accent />
            {result.isProfitShare && (
              <Stat label="Profit share" value={formatCurrency(result.totalProfitShare, currency)} accent />
            )}
            {feePercent > 0 && (
              <Stat label={`Platform fee (${feePercent}%)`} value={`-${formatCurrency(platformFee, currency)}`} muted />
            )}
            <Stat label="Net earnings" value={formatCurrency(netEarnings, currency)} accent />
          </div>

          <div className="h-56 rounded-lg border bg-card/40 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sharePoints}>
                <defs>
                  <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tickFormatter={(v) => `M${v}`} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    color: "hsl(var(--foreground))",
                  }}
                  formatter={(v: any, name: string) => [formatCurrency(Number(v), currency), name === "value" ? "Balance" : "Cumulative profit"]}
                />
                <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#invGrad)" />
                <Area type="monotone" dataKey="cumulative" stroke="hsl(var(--accent))" strokeWidth={1.5} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <Stat label="Final value" value={formatCurrency(result.finalValue + result.totalProfitShare, currency)} />
            <Stat label="Effective ROI" value={`${result.effectiveAnnualRoi.toFixed(1)}% / yr`} />
            <Stat label="Principal returned" value={`Month ${result.principalReturnedAt}`} />
          </div>

          <p className="text-xs text-muted-foreground">
            Projections are illustrative. {plan.roi_percent ? `Base monthly return ${(plan.roi_percent / 12).toFixed(2)}%, ` : ""}
            biannual +1% bonus on principal. Lock-in: {Math.round((plan.lock_period_days ?? 0) / 30)} months · Payouts: {plan.payout_frequency}.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

const RevenueInput = ({
  label,
  value,
  onChange,
  currency,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  currency: string;
}) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between">
      <Label className="text-xs">{label}</Label>
      <span className="text-xs font-semibold tabular-nums">{formatCurrency(value, currency)}</span>
    </div>
    <Input
      type="number"
      min={0}
      value={value}
      onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
      className="h-8 text-sm"
    />
  </div>
);

const Stat = ({
  label,
  value,
  accent,
  muted,
}: {
  label: string;
  value: string;
  accent?: boolean;
  muted?: boolean;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    className={`rounded-lg border p-3 ${accent ? "bg-primary/5 border-primary/30" : "bg-card"}`}
  >
    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div
      className={`text-base font-semibold tabular-nums ${
        muted ? "text-muted-foreground" : accent ? "text-primary" : "text-foreground"
      }`}
    >
      {value}
    </div>
  </motion.div>
);

export default ProfitCalculator;

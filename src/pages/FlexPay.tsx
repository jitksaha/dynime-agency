import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { db } from "@/integrations/db/client";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck, CreditCard, Clock, Globe, Sparkles, CheckCircle2, ArrowRight, Calculator, Wallet,
  Lock, Zap, TrendingUp, Star, Wifi, Info,
} from "lucide-react";
import { usePageSEO } from "@/hooks/use-page-seo";
import { cn } from "@/lib/utils";

type TenureFeeTier = { tenure: number; fee_percent: number };

type Settings = {
  enabled: boolean;
  emi_enabled: boolean;
  paylater_enabled: boolean;
  allowed_tenures: number[];
  paylater_terms: number[];
  processing_fee_percent: number;
  down_payment_percent: number;
  min_order_amount: number;
  max_credit_limit: number;
  default_currency: string;
  tenure_fee_tiers?: TenureFeeTier[] | null;
};

const DEFAULT_TIERS: TenureFeeTier[] = [
  { tenure: 3, fee_percent: 0 },
  { tenure: 6, fee_percent: 0 },
  { tenure: 9, fee_percent: 1 },
  { tenure: 12, fee_percent: 2 },
  { tenure: 18, fee_percent: 2 },
  { tenure: 24, fee_percent: 3 },
  { tenure: 36, fee_percent: 5 },
];

export const getFeePercentForTenure = (
  tenure: number,
  tiers: TenureFeeTier[] | null | undefined,
  fallback = 0,
): number => {
  const list = (tiers && tiers.length ? tiers : DEFAULT_TIERS);
  const exact = list.find((t) => Number(t.tenure) === Number(tenure));
  if (exact) return Number(exact.fee_percent) || 0;
  // pick closest lower tenure
  const sorted = [...list].sort((a, b) => a.tenure - b.tenure);
  let chosen = sorted[0]?.fee_percent ?? fallback;
  for (const t of sorted) if (t.tenure <= tenure) chosen = Number(t.fee_percent) || 0;
  return chosen;
};

const FlexPay = () => {
  usePageSEO("flexpay");

  const { data: settings } = useQuery<Settings | null>({
    queryKey: ["flexpay-settings-public"],
    queryFn: async () => {
      const { data } = await db.from("flexpay_settings").select("*").eq("id", 1).maybeSingle();
      return data as unknown as Settings | null;
    },
  });

  const tenures = settings?.allowed_tenures?.length ? settings.allowed_tenures : [3, 6, 9, 12, 24, 36];
  const tiers: TenureFeeTier[] = (settings?.tenure_fee_tiers as TenureFeeTier[]) || DEFAULT_TIERS;
  const dpPct = Number(settings?.down_payment_percent ?? 0);
  const minOrder = Number(settings?.min_order_amount ?? 500);
  const maxLimit = Number(settings?.max_credit_limit ?? 10000);
  const currency = settings?.default_currency || "USD";

  const [amount, setAmount] = useState<number>(2000);
  const [tenure, setTenure] = useState<number>(12);
  const [downPayment, setDownPayment] = useState<number>(0);

  useEffect(() => {
    if (tenures.length && !tenures.includes(tenure)) setTenure(tenures[Math.floor(tenures.length / 2)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.allowed_tenures?.join(",")]);

  const feePct = useMemo(
    () => getFeePercentForTenure(tenure, tiers, Number(settings?.processing_fee_percent ?? 0)),
    [tenure, tiers, settings?.processing_fee_percent],
  );

  const calc = useMemo(() => {
    const principal = Math.max(0, Number(amount) || 0);
    const fee = +(principal * (feePct / 100)).toFixed(2);
    const dp = Math.max(Number(downPayment) || 0, +(principal * (dpPct / 100)).toFixed(2));
    const financed = Math.max(0, principal + fee - dp);
    const monthly = tenure > 0 ? +(financed / tenure).toFixed(2) : 0;
    const total = +(monthly * tenure + dp).toFixed(2);
    return { principal, fee, dp, financed, monthly, total };
  }, [amount, tenure, downPayment, feePct, dpPct]);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n || 0);

  const benefits = [
    { icon: CreditCard, title: "No credit card required", desc: "Get approved with KYC — no plastic, no traditional credit lines." },
    { icon: Clock, title: "Flexible monthly payments", desc: "Choose from 3 to 36 months that fit your cashflow." },
    { icon: ShieldCheck, title: "Bank-grade verification", desc: "Identity verified by global KYC partners." },
    { icon: Globe, title: "Available worldwide", desc: "Customers in 100+ countries can apply for FlexPay limits." },
    { icon: Zap, title: "Instant decisions", desc: "Most applications reviewed within one business day." },
    { icon: Wallet, title: "Pay Later options", desc: "Net 30 / 60 / 90 terms for qualified customers." },
  ];

  return (
    <Layout>
      {/* ============== HERO ============== */}
      <section className="relative overflow-hidden border-b border-border/50 bg-background">
        {/* Premium ambient background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.18),transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(var(--primary)/0.12),transparent_60%)]" />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
              maskImage:
                "radial-gradient(ellipse at center, black 30%, transparent 75%)",
            }}
          />
        </div>

        <div className="container mx-auto px-4 py-20 md:py-28 grid lg:grid-cols-2 gap-12 items-center">
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 backdrop-blur px-3 py-1 text-xs font-medium text-primary mb-6">
              <Sparkles className="w-3.5 h-3.5" /> Introducing Dynime FlexPay
            </div>
            <h1 className="font-heading text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
              Buy Now.<br />
              Pay <span className="relative inline-block">
                <span className="bg-gradient-to-r from-primary via-primary to-primary/60 bg-clip-text text-transparent">
                  Beautifully
                </span>
                <span className="absolute -bottom-2 left-0 right-0 h-1 rounded-full bg-gradient-to-r from-primary/0 via-primary to-primary/0" />
              </span>
              <br />
              Later.
            </h1>
            <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-xl leading-relaxed">
              Premium financing for premium services. Split payments across <strong className="text-foreground">3–36 months</strong> with
              <strong className="text-foreground"> 0% fees on short tenures</strong>. No credit card. No friction.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full shadow-lg shadow-primary/25 group">
                <Link to="/flexpay/apply">
                  Apply for credit limit
                  <ArrowRight className="ml-1.5 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full backdrop-blur bg-background/40">
                <a href="#calculator"><Calculator className="w-4 h-4 mr-1.5" /> Calculate EMI</a>
              </Button>
            </div>

            {/* Trust strip */}
            <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
              <Trust icon={Lock} label="Bank-grade" sub="security" />
              <Trust icon={Globe} label="100+" sub="countries" />
              <Trust icon={Star} label="0% fees" sub="up to 6 mo" />
            </div>
          </div>

          {/* Floating premium card */}
          <div className="relative lg:pl-8">
            <div className="absolute -inset-10 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent blur-3xl rounded-[3rem] -z-10" aria-hidden />

            {/* Stacked decorative cards */}
            <div className="absolute -top-6 -right-4 w-full h-full rounded-3xl border border-border/40 bg-card/40 backdrop-blur-sm rotate-3 -z-10" />
            <div className="absolute -bottom-4 -left-4 w-full h-full rounded-3xl border border-border/40 bg-card/30 backdrop-blur-sm -rotate-2 -z-10" />

            <Card className="relative shadow-2xl border-border/60 backdrop-blur-xl bg-card/80 rounded-3xl overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-md shadow-primary/30">
                      <Wallet className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Dynime FlexPay</div>
                      <div className="text-[11px] text-muted-foreground/80">Live preview</div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="rounded-full">{feePct}% fee</Badge>
                </div>
                <div className="pt-4">
                  <div className="text-xs text-muted-foreground">Monthly installment</div>
                  <CardTitle className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                    {fmt(calc.monthly)}
                    <span className="text-base font-normal text-muted-foreground"> / mo</span>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2.5 text-sm">
                <EditableRow
                  label="Service amount"
                  value={calc.principal}
                  currency={currency}
                  onChange={(v) => setAmount(v)}
                />
                <Row label={`Processing fee (${feePct}%)`} value={fmt(calc.fee)} accent={feePct === 0} />
                <EditableRow
                  label="Down payment"
                  value={calc.dp}
                  currency={currency}
                  onChange={(v) => setDownPayment(v)}
                />
                <EditableRow
                  label="Financed amount"
                  value={calc.financed}
                  currency={currency}
                  onChange={(v) => {
                    const newAmount = (Math.max(0, v) + (Number(downPayment) || 0)) / (1 + feePct / 100);
                    setAmount(+newAmount.toFixed(2));
                  }}
                />
                <EditableRow
                  label="Tenure"
                  value={tenure}
                  suffix=" months"
                  min={1}
                  max={60}
                  step={1}
                  onChange={(v) => setTenure(Math.max(1, Math.min(60, Math.round(v))))}
                />
                <div className="border-t border-border/60 mt-4 pt-4">
                  <Row label="Total payable" value={fmt(calc.total)} bold />
                </div>
                <div className="mt-4 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                    Fee adjusts automatically by tenure
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground/80">
                    <Lock className="w-3 h-3" /> Dynime services only
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ============== FEE TIERS ============== */}
      <section className="border-b border-border/50 bg-muted/20">
        <div className="container mx-auto px-4 py-16 md:py-20">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <Badge variant="secondary" className="rounded-full mb-3"><TrendingUp className="w-3 h-3 mr-1" /> Transparent pricing</Badge>
            <h2 className="font-heading text-3xl md:text-4xl font-bold">Pay only what's fair</h2>
            <p className="text-muted-foreground mt-3">Shorter plans are free. Longer plans have a small processing fee — no hidden interest.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
            {tiers.map((t) => {
              const free = Number(t.fee_percent) === 0;
              return (
                <div
                  key={t.tenure}
                  className={
                    "relative rounded-2xl border p-5 text-center transition-all hover:-translate-y-0.5 hover:shadow-lg " +
                    (free
                      ? "border-primary/40 bg-gradient-to-br from-primary/10 to-primary/0 shadow-md shadow-primary/10"
                      : "border-border/60 bg-card/60 backdrop-blur-sm")
                  }
                >
                  {free && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary text-primary-foreground shadow">
                      Free
                    </span>
                  )}
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Tenure</div>
                  <div className="text-2xl font-bold mt-0.5">{t.tenure}<span className="text-sm font-normal text-muted-foreground"> mo</span></div>
                  <div className={"mt-3 text-sm font-semibold " + (free ? "text-primary" : "text-foreground")}>
                    {Number(t.fee_percent)}% fee
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============== BENEFITS ============== */}
      <section className="container mx-auto px-4 py-20 md:py-24">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <Badge variant="secondary" className="rounded-full mb-3">Why FlexPay</Badge>
          <h2 className="font-heading text-3xl md:text-5xl font-bold tracking-tight">A premium financing layer</h2>
          <p className="text-muted-foreground mt-4 text-lg">Built into Dynime checkout. Designed for modern global customers.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="group relative rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-6 transition-all hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-0.5"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary flex items-center justify-center mb-5 ring-1 ring-primary/20">
                <b.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base mb-1.5">{b.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============== VIRTUAL CARD SHOWCASE ============== */}
      <section className="relative border-b border-border/50 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-muted/30 to-background" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.12),transparent_60%)]" />
        <div className="container mx-auto px-4 py-20 md:py-24">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Badge variant="secondary" className="rounded-full mb-3">
              <CreditCard className="w-3 h-3 mr-1" /> Your virtual card
            </Badge>
            <h2 className="font-heading text-3xl md:text-5xl font-bold tracking-tight">
              A card that's only yours — and only ours
            </h2>
            <p className="text-muted-foreground mt-4 text-base md:text-lg leading-relaxed">
              Every approved customer gets a beautifully designed virtual FlexPay card. Use it at Dynime checkout
              to split any service into easy monthly installments. <strong className="text-foreground">It can't be
              used anywhere outside Dynime</strong> — keeping your limit safe and focused on what matters.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
            <MockFlexCard tier="silver" name="Aria Kapoor" last4="4821" exp="08/29" />
            <MockFlexCard tier="gold"   name="Jordan Lee"  last4="9032" exp="11/30" featured />
            <MockFlexCard tier="platinum" name="Mei Tanaka" last4="1147" exp="04/31" />
          </div>

          <p className="text-center text-xs text-muted-foreground mt-8 inline-flex items-center gap-1.5 justify-center w-full">
            <Info className="w-3.5 h-3.5" />
            Designs above are illustrative — your real card is issued after KYC approval.
          </p>
        </div>
      </section>

      {/* ============== CALCULATOR ============== */}
      <section id="calculator" className="relative border-y border-border/50 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-background" />
        <div className="container mx-auto px-4 py-20 md:py-24 grid lg:grid-cols-5 gap-10 items-center">
          <div className="lg:col-span-2">
            <Badge variant="secondary" className="rounded-full mb-3"><Calculator className="w-3 h-3 mr-1" /> EMI Calculator</Badge>
            <h2 className="font-heading text-3xl md:text-5xl font-bold tracking-tight">See your plan, instantly</h2>
            <p className="text-muted-foreground mt-4 text-base md:text-lg leading-relaxed">
              Slide the amount and tenure. Your processing fee adjusts automatically — <strong className="text-foreground">0% on 3 & 6 month plans</strong>.
            </p>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Min. {fmt(minOrder)}</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Up to {fmt(maxLimit)} limit</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> No prepayment penalty</span>
            </div>
            <p className="text-xs text-muted-foreground mt-8">
              Final plan and approval depend on KYC verification and credit review.
            </p>
          </div>
          <Card className="lg:col-span-3 rounded-3xl border-border/60 shadow-2xl backdrop-blur-xl bg-card/80 overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
            <CardContent className="p-7 md:p-8 grid md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="fp-amount" className="text-xs uppercase tracking-wider text-muted-foreground">Purchase amount ({currency})</Label>
                <Input id="fp-amount" type="number" min={0} value={amount}
                  className="h-12 text-lg font-semibold rounded-xl"
                  onChange={(e) => setAmount(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fp-dp" className="text-xs uppercase tracking-wider text-muted-foreground">Down payment ({currency})</Label>
                <Input id="fp-dp" type="number" min={0} value={downPayment}
                  className="h-12 text-lg font-semibold rounded-xl"
                  onChange={(e) => setDownPayment(Number(e.target.value))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tenure</Label>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {tenures.map((m) => {
                    const tierFee = getFeePercentForTenure(m, tiers);
                    const active = tenure === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setTenure(m)}
                        className={
                          "relative rounded-xl border px-2 py-2.5 text-center transition-all " +
                          (active
                            ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/30"
                            : "border-border bg-background hover:border-primary/50 hover:bg-primary/5")
                        }
                      >
                        <div className="font-bold text-sm">{m}m</div>
                        <div className={"text-[10px] mt-0.5 " + (active ? "text-primary-foreground/80" : "text-muted-foreground")}>
                          {tierFee}% fee
                        </div>
                      </button>
                    );
                  })}
                </div>
                {/* fallback select for very small screens already covered by grid */}
                <Select value={String(tenure)} onValueChange={(v) => setTenure(Number(v))}>
                  <SelectTrigger className="sr-only"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {tenures.map((m) => <SelectItem key={m} value={String(m)}>{m} months</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 grid grid-cols-2 gap-3 pt-2">
                <Stat label="Monthly" value={fmt(calc.monthly)} highlight />
                <Stat label="Total payable" value={fmt(calc.total)} />
                <Stat label={`Processing fee (${feePct}%)`} value={fmt(calc.fee)} />
                <Stat label="Financed" value={fmt(calc.financed)} />
              </div>
              <div className="md:col-span-2 flex flex-wrap gap-3 pt-2">
                <Button asChild className="flex-1 rounded-xl h-12 shadow-lg shadow-primary/20">
                  <Link to="/flexpay/apply">Apply now <ArrowRight className="w-4 h-4 ml-1.5" /></Link>
                </Button>
                <Button asChild variant="outline" className="rounded-xl h-12"><Link to="/services">Browse services</Link></Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ============== HOW IT WORKS ============== */}
      <section className="container mx-auto px-4 py-20 md:py-24">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <Badge variant="secondary" className="rounded-full mb-3">How it works</Badge>
          <h2 className="font-heading text-3xl md:text-5xl font-bold tracking-tight">From apply to approved in a day</h2>
          <p className="text-muted-foreground mt-4 text-lg">Four steps. No paperwork. No physical visits.</p>
        </div>
        <div className="grid md:grid-cols-4 gap-4 relative">
          <div className="hidden md:block absolute top-12 left-[12%] right-[12%] h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          {[
            { n: 1, t: "Apply", d: "Submit a quick credit limit application with your details." },
            { n: 2, t: "Verify", d: "Complete KYC — identity, address and a live selfie." },
            { n: 3, t: "Get approved", d: "We assign your credit limit and supported tenures." },
            { n: 4, t: "Shop & pay monthly", d: "Use FlexPay at checkout, pay over time." },
          ].map((s) => (
            <div key={s.n} className="relative rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-6 hover:border-primary/40 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold flex items-center justify-center mb-4 shadow-lg shadow-primary/30 text-lg">{s.n}</div>
              <h3 className="font-semibold text-lg">{s.t}</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>

        {/* Final CTA */}
        <div className="relative mt-16 rounded-3xl overflow-hidden border border-primary/30">
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/20 via-primary/5 to-background" />
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.25),transparent_70%)]" />
          <div className="p-10 md:p-14 text-center">
            <h3 className="font-heading text-3xl md:text-4xl font-bold tracking-tight">Ready to upgrade your checkout?</h3>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">Get approved for a Dynime FlexPay limit and start splitting payments today.</p>
            <div className="mt-7 flex flex-wrap gap-3 justify-center">
              <Button asChild size="lg" className="rounded-full shadow-lg shadow-primary/30">
                <Link to="/flexpay/apply">Get started <ArrowRight className="w-4 h-4 ml-1.5" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full">
                <Link to="/services">Browse services</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

const Row = ({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) => (
  <div className={"flex items-center justify-between " + (bold ? "font-semibold text-base" : "")}>
    <span className="text-muted-foreground">{label}</span>
    <span className={accent ? "text-primary font-semibold" : "text-foreground"}>{value}</span>
  </div>
);

const EditableRow = ({
  label, value, currency, suffix, min = 0, max, step = 0.01, onChange,
}: {
  label: string;
  value: number;
  currency?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(String(value ?? 0));

  useEffect(() => {
    if (!editing) setDraft(String(+(value || 0).toFixed(currency ? 2 : 0)));
  }, [value, editing, currency]);

  const display = currency
    ? new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value || 0)
    : `${value}${suffix ?? ""}`;

  const commit = () => {
    const n = parseFloat(draft);
    if (!isNaN(n)) onChange(n);
    setEditing(false);
  };

  return (
    <div className="group flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      {editing ? (
        <input
          autoFocus
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") setEditing(false);
          }}
          className="w-28 bg-transparent text-right text-foreground font-medium outline-none border-b border-primary/60 focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-foreground hover:text-primary transition-colors border-b border-dashed border-transparent hover:border-primary/40 cursor-text"
          title="Click to edit"
        >
          {display}
        </button>
      )}
    </div>
  );
};

const Stat = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <div className={"rounded-xl border p-4 transition-all " + (highlight ? "border-primary/50 bg-gradient-to-br from-primary/10 to-primary/0 shadow-md shadow-primary/10" : "border-border bg-background/60")}>
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
    <div className={"text-xl font-bold mt-1 " + (highlight ? "text-primary" : "")}>{value}</div>
  </div>
);

const Trust = ({ icon: Icon, label, sub }: any) => (
  <div className="flex flex-col items-start gap-1 rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm p-3">
    <Icon className="w-4 h-4 text-primary" />
    <div className="text-sm font-bold leading-none">{label}</div>
    <div className="text-[11px] text-muted-foreground leading-none">{sub}</div>
  </div>
);

// Presentation-only mock of the FlexPay virtual card, used on the marketing page.
// Three tiers with distinct gradient treatments, all carrying the same
// "Dynime services only" microbadge that mirrors the real issued card.
type MockTier = "silver" | "gold" | "platinum";
const MockFlexCard = ({
  tier, name, last4, exp, featured,
}: { tier: MockTier; name: string; last4: string; exp: string; featured?: boolean }) => {
  const tierMeta: Record<MockTier, { label: string; bg: string; ring: string; chip: string; accent: string }> = {
    silver: {
      label: "Silver",
      bg: "bg-[linear-gradient(135deg,hsl(220_15%_22%)_0%,hsl(220_12%_38%)_55%,hsl(220_10%_28%)_100%)]",
      ring: "ring-white/10",
      chip: "from-[hsl(45_70%_70%)] to-[hsl(38_55%_45%)]",
      accent: "text-white/85",
    },
    gold: {
      label: "Gold",
      bg: "bg-[linear-gradient(135deg,hsl(35_55%_28%)_0%,hsl(38_70%_50%)_50%,hsl(28_60%_22%)_100%)]",
      ring: "ring-amber-200/20",
      chip: "from-[hsl(48_92%_75%)] to-[hsl(38_85%_50%)]",
      accent: "text-amber-50",
    },
    platinum: {
      label: "Platinum",
      bg: "bg-[linear-gradient(135deg,hsl(240_30%_10%)_0%,hsl(260_45%_20%)_45%,hsl(220_35%_8%)_100%)]",
      ring: "ring-white/15",
      chip: "from-[hsl(210_25%_88%)] to-[hsl(220_15%_55%)]",
      accent: "text-white/90",
    },
  };
  const m = tierMeta[tier];

  return (
    <div className={cn("group relative", featured && "md:-translate-y-3")}>
      {featured && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40">
          Most popular
        </span>
      )}
      <div
        className={cn(
          "relative aspect-[1.586/1] rounded-2xl p-5 shadow-2xl ring-1 overflow-hidden transition-transform duration-500 group-hover:-translate-y-1 group-hover:rotate-[0.4deg]",
          m.bg, m.ring,
        )}
      >
        {/* Holographic sheen */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.18),transparent_55%)]" />
        <div className="pointer-events-none absolute -inset-x-10 -top-10 h-24 bg-gradient-to-r from-transparent via-white/10 to-transparent rotate-12" />

        {/* Top row */}
        <div className="relative flex items-start justify-between">
          <div>
            <div className={cn("text-[9px] font-bold uppercase tracking-[0.2em]", m.accent)}>Dynime</div>
            <div className="text-white font-heading text-lg font-bold leading-tight">FlexPay {m.label}</div>
          </div>
          <Wifi className="w-5 h-5 text-white/70 rotate-90" />
        </div>

        {/* EMV chip */}
        <div className={cn("mt-5 w-11 h-8 rounded-md bg-gradient-to-br shadow-inner", m.chip)} />

        {/* Number */}
        <div className="mt-4 text-white font-mono text-[15px] md:text-base tracking-[0.18em] tabular-nums drop-shadow-sm">
          •••• &nbsp;•••• &nbsp;•••• &nbsp;{last4}
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-end justify-between">
          <div>
            <div className={cn("text-[8px] uppercase tracking-wider", m.accent, "opacity-70")}>Cardholder</div>
            <div className="text-white text-xs font-semibold tracking-wide uppercase">{name}</div>
          </div>
          <div className="text-right">
            <div className={cn("text-[8px] uppercase tracking-wider", m.accent, "opacity-70")}>Expires</div>
            <div className="text-white text-xs font-semibold tabular-nums">{exp}</div>
          </div>
        </div>

        {/* Bottom-left "Dynime services only" microbadge */}
        <div className="absolute bottom-2 left-5 inline-flex items-center gap-1 text-[8px] uppercase tracking-[0.15em] text-white/55">
          <Lock className="w-2.5 h-2.5" /> Usable only on Dynime services
        </div>
      </div>

      <div className="mt-3 text-center">
        <div className="text-sm font-semibold">{m.label} tier</div>
        <div className="text-xs text-muted-foreground">
          {tier === "silver" ? "Entry limits, 3–6 month plans" : tier === "gold" ? "Higher limits, 3–24 month plans" : "Top-tier limits, up to 36 months"}
        </div>
      </div>
    </div>
  );
};

export default FlexPay;

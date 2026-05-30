import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { usePageSEO } from "@/hooks/use-page-seo";
import ScrollReveal from "@/components/shared/ScrollReveal";
import {
  STATES as STATIC_STATES,
  ENTITY_TYPES,
  TIER_BADGE,
  type EntityTypeId,
  type StateRecord,
  type CostTier,
} from "@/data/usa-formation";
import { useUsaStatePricing } from "@/hooks/use-usa-state-pricing";
import USCompanyNameChecker from "@/components/services/USCompanyNameChecker";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  DollarSign,
  Flag,
  Globe,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  Trophy,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TIERS: (CostTier | "All")[] = ["All", "Low", "Medium", "High", "Very High"];

const fmtUsd = (n: number) =>
  n === 0 ? "$0" : `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const computeYearly = (s: StateRecord, entity: EntityTypeId) => {
  const isCorp = entity === "c-corp" || entity === "s-corp";
  const stateAnnual = isCorp ? s.corpAnnual : s.llcAnnual;
  const meta = ENTITY_TYPES.find((e) => e.id === entity)!;
  const cpaAvg = (meta.cpaLow + meta.cpaHigh) / 2;
  const registeredAgent = 100;
  return {
    stateAnnual,
    registeredAgent,
    cpaAvg,
    total: stateAnnual + registeredAgent + cpaAvg,
  };
};

interface Recommendation {
  state: StateRecord;
  yearly: number;
  score: number;
  reasons: string[];
}

const recommendStates = (
  entity: EntityTypeId,
  goal: "lowest-cost" | "tax-friendly" | "investor-friendly" | "remote-friendly",
  states: StateRecord[] = STATIC_STATES,
): Recommendation[] => {
  const scored = states.map((s): Recommendation => {
    const y = computeYearly(s, entity);
    let score = 100 - Math.min(80, y.total / 20);
    const reasons: string[] = [];

    if (goal === "tax-friendly") {
      if (!s.stateIncomeTax) { score += 25; reasons.push("No state income tax"); }
      if (!s.corporateTax) { score += 15; reasons.push("No corporate tax"); }
      if (s.franchiseTax === "No") { score += 8; reasons.push("No franchise tax"); }
    }
    if (goal === "lowest-cost") {
      if (s.costTier === "Low") { score += 25; reasons.push("Low cost tier"); }
      if (y.stateAnnual <= 25) { score += 15; reasons.push("Minimal annual fee"); }
    }
    if (goal === "investor-friendly") {
      if (s.abbr === "DE") { score += 60; reasons.push("Standard for VC funding"); }
      if (s.abbr === "CA") { score += 10; reasons.push("Largest tech market"); }
    }
    if (goal === "remote-friendly") {
      if (s.abbr === "WY") { score += 40; reasons.push("Top non-resident LLC"); }
      if (s.abbr === "DE") { score += 25; reasons.push("Privacy & remote-friendly"); }
      if (s.abbr === "NM") { score += 20; reasons.push("No annual fee"); }
      if (!s.stateIncomeTax) { score += 10; reasons.push("No state income tax"); }
    }
    if (s.popular) { score += 4; reasons.push("Popular choice"); }
    return { state: s, yearly: y.total, score, reasons: [...new Set(reasons)].slice(0, 3) };
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, 3);
};

const USAFormation = () => {
  const { data: dynamicStates } = useUsaStatePricing();
  const STATES = dynamicStates && dynamicStates.length > 0 ? dynamicStates : STATIC_STATES;
  usePageSEO("usa-formation", {
    title: "USA Company Formation Cost — All 50 States Compared",
    description:
      "Compare LLC and Corporation formation fees, recurring annual costs, franchise tax, and state taxes across all 50 US states. Free recommendation engine for the best state for your business.",
    keywords: [
      "USA company formation",
      "LLC formation cost",
      "Delaware LLC",
      "Wyoming LLC",
      "incorporation cost USA",
      "best state to form LLC",
    ],
  });

  const [search, setSearch] = useState("");
  const [tier, setTier] = useState<(typeof TIERS)[number]>("All");

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Calculator state
  const [calcEntity, setCalcEntity] = useState<EntityTypeId>("single-llc");
  const [calcGoal, setCalcGoal] =
    useState<"lowest-cost" | "tax-friendly" | "investor-friendly" | "remote-friendly">("remote-friendly");

  const recommendations = useMemo(
    () => recommendStates(calcEntity, calcGoal, STATES),
    [calcEntity, calcGoal, STATES],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return STATES.filter((s) => {
      if (tier !== "All" && s.costTier !== tier) return false;
      if (!q) return true;
      return (
        s.state.toLowerCase().includes(q) ||
        s.abbr.toLowerCase().includes(q) ||
        s.bestFor.toLowerCase().includes(q)
      );
    });
  }, [search, tier]);

  const popular = STATES.filter((s) => s.popular);

  const chartData = STATES
    .map((s) => ({
      name: s.abbr,
      Formation: s.llcFormation,
      Annual: s.llcAnnual,
    }))
    .sort((a, b) => a.Formation + a.Annual - (b.Formation + b.Annual));

  return (
    <Layout>
      {/* Hero */}
      <section className="relative py-12 md:py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />
        <div className="container-custom relative z-10">
          <ScrollReveal>
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm font-medium mb-6">
                <Flag className="w-4 h-4" /> USA Business Formation
              </div>
              <h1 className="font-heading text-4xl md:text-6xl font-bold mb-5 tracking-tight">
                Form Your <span className="gradient-text">US Company</span> the Smart Way
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Compare formation cost, yearly maintenance, franchise tax, and tax structure across{" "}
                <strong className="text-foreground">all 50 states</strong>. Get an instant,
                personalised recommendation in seconds.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button size="lg" onClick={() => scrollTo("calculator")} className="gap-2">
                  <Sparkles className="w-4 h-4" /> Open Recommendation Engine
                </Button>
                <Button size="lg" variant="outline" onClick={() => scrollTo("all-states")}>
                  Browse All 50 States
                </Button>
              </div>
            </div>
          </ScrollReveal>

          {/* Quick stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-14 max-w-5xl mx-auto">
            {[
              { icon: Building2, label: "States covered", value: "50" },
              { icon: DollarSign, label: "Cheapest LLC", value: "$35" },
              { icon: TrendingDown, label: "Lowest annual", value: "$0" },
              { icon: ShieldCheck, label: "Tax-free states", value: "9" },
            ].map((s) => (
              <Card key={s.label} className="border-border/60 bg-card/60 backdrop-blur">
                <CardContent className="p-5 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <s.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xl font-bold">{s.value}</div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Live US company name availability checker (OpenCorporates) */}
          <div className="mt-14">
            <USCompanyNameChecker />
          </div>
        </div>
      </section>

      {/* Sticky in-page nav */}
      <div className="sticky top-16 z-30 border-y border-border bg-background/85 backdrop-blur">
        <div className="container-custom flex gap-2 overflow-x-auto py-3 text-sm">
          {[
            { id: "overview", label: "Overview" },
            { id: "popular", label: "Popular states" },
            { id: "all-states", label: "All 50 states" },
            { id: "calculator", label: "Recommendation" },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className="px-3 py-1.5 rounded-full border border-border hover:border-primary/60 hover:text-primary whitespace-nowrap transition-colors"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* OVERVIEW */}
      <section id="overview" className="pt-12 pb-8 scroll-mt-32">
        <div className="container-custom space-y-12">
              <Card>
                <CardHeader>
                  <CardTitle>LLC formation + annual cost — all states</CardTitle>
                  <CardDescription>
                    Sorted from lowest to highest combined cost. Hover bars for details.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[460px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-60} textAnchor="end" height={60} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <RTooltip
                          contentStyle={{
                            background: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                          formatter={(v: number) => fmtUsd(v)}
                        />
                        <Legend />
                        <Bar dataKey="Formation" stackId="a" fill="hsl(var(--primary))" />
                        <Bar dataKey="Annual" stackId="a" fill="hsl(var(--accent))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-3 gap-6">
                {[
                  {
                    icon: Trophy,
                    title: "Cheapest setup",
                    items: ["Kentucky — $40", "Arkansas — $45", "Iowa — $50", "Mississippi — $53"],
                    accent: "text-emerald-500",
                  },
                  {
                    icon: Globe,
                    title: "Best for non-residents",
                    items: [
                      "Wyoming — Privacy + low cost",
                      "Delaware — Investor standard",
                      "New Mexico — No annual fee",
                      "Florida — E-commerce friendly",
                    ],
                    accent: "text-primary",
                  },
                  {
                    icon: AlertTriangle,
                    title: "Hidden costs to know",
                    items: [
                      "Registered agent: $50–$150/yr",
                      "CPA filing: $150–$2,000/yr",
                      "NY publication: $200–$1,500",
                      "California $800 minimum tax",
                    ],
                    accent: "text-amber-500",
                  },
                ].map((c) => (
                  <Card key={c.title}>
                    <CardHeader>
                      <CardTitle className={cn("text-lg flex items-center gap-2", c.accent)}>
                        <c.icon className="w-5 h-5" />
                        {c.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        {c.items.map((i) => (
                          <li key={i} className="flex gap-2">
                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            {i}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
        </div>
      </section>

      {/* POPULAR */}
      <section id="popular" className="py-12 bg-muted/30 scroll-mt-32">
        <div className="container-custom">
          <div className="max-w-3xl mb-10">
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-3">Popular states for incorporation</h2>
            <p className="text-muted-foreground">The most-chosen states for non-residents, startups, and online businesses.</p>
          </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {popular.map((s) => (
                  <Card key={s.abbr} className="overflow-hidden border-primary/30">
                    <div className="h-1.5 bg-gradient-to-r from-primary to-accent" />
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>{s.state}</CardTitle>
                        <Badge variant="outline" className={TIER_BADGE[s.costTier]}>
                          {s.costTier}
                        </Badge>
                      </div>
                      <CardDescription>{s.bestFor}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <Row label="LLC formation" value={fmtUsd(s.llcFormation)} />
                      <Row label="Corp formation" value={fmtUsd(s.corpFormation)} />
                      <Row label="LLC annual" value={s.llcAnnualLabel} />
                      <Row label="Corp annual" value={s.corpAnnualLabel} />
                      <Row label="Franchise tax" value={s.franchiseTax} />
                      <div className="grid grid-cols-3 gap-2 pt-2">
                        <TaxPill ok={!s.stateIncomeTax} label="Income" />
                        <TaxPill ok={!s.corporateTax} label="Corp" />
                        <TaxPill ok={!s.salesTax} label="Sales" />
                      </div>
                      <p className="text-xs text-muted-foreground pt-2 border-t border-border">{s.notes}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
        </div>
      </section>

      {/* ALL STATES */}
      <section id="all-states" className="py-12 scroll-mt-32">
        <div className="container-custom">
          <div className="max-w-3xl mb-8">
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-3">All 50 states — full cost &amp; tax breakdown</h2>
            <p className="text-muted-foreground">
              Filter by cost tier or search by state name. Includes formation fees, recurring annual fees,
              franchise tax, and state-level income / corporate / sales tax indicators.
            </p>
          </div>
              <div className="flex flex-col md:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search states (e.g. Texas, WY, Remote)"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={tier} onValueChange={(v) => setTier(v as typeof tier)}>
                  <SelectTrigger className="w-full md:w-52">
                    <SelectValue placeholder="Cost tier" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIERS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t === "All" ? "All cost tiers" : t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[150px]">State</TableHead>
                        <TableHead>LLC formation</TableHead>
                        <TableHead>Corp formation</TableHead>
                        <TableHead>LLC annual</TableHead>
                        <TableHead>Corp annual</TableHead>
                        <TableHead>Franchise</TableHead>
                        <TableHead>Income / Corp / Sales</TableHead>
                        <TableHead>Tier</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((s) => (
                        <TableRow key={s.abbr}>
                          <TableCell>
                            <div className="font-medium">{s.state}</div>
                            <div className="text-xs text-muted-foreground">{s.bestFor}</div>
                          </TableCell>
                          <TableCell>{fmtUsd(s.llcFormation)}</TableCell>
                          <TableCell>{fmtUsd(s.corpFormation)}</TableCell>
                          <TableCell>{s.llcAnnualLabel}</TableCell>
                          <TableCell>{s.corpAnnualLabel}</TableCell>
                          <TableCell>
                            <span className="text-xs">{s.franchiseTax}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <TaxDot active={s.stateIncomeTax} />
                              <TaxDot active={s.corporateTax} />
                              <TaxDot active={s.salesTax} />
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={TIER_BADGE[s.costTier]}>
                              {s.costTier}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filtered.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-9">
                            No states match your filter.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <p className="text-xs text-muted-foreground mt-4">
                Income / Corp / Sales: filled dot = state levies that tax. Fees are approximate;
                always verify with the relevant Secretary of State office.
              </p>
        </div>
      </section>

      {/* CALCULATOR */}
      <section id="calculator" className="py-12 bg-muted/30 scroll-mt-32">
        <div className="container-custom">
          <div className="max-w-3xl mb-10">
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-3 flex items-center gap-2">
              <Sparkles className="w-7 h-7 text-primary" /> Smart state recommender
            </h2>
            <p className="text-muted-foreground">
              Pick your entity type and primary goal — we'll match the top 3 states with estimated yearly cost.
            </p>
          </div>
              <div className="grid lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary" /> Tell us about you
                    </CardTitle>
                    <CardDescription>
                      We'll instantly recommend the best 3 states for your situation.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div>
                      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Entity type
                      </label>
                      <Select value={calcEntity} onValueChange={(v) => setCalcEntity(v as EntityTypeId)}>
                        <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ENTITY_TYPES.map((e) => (
                            <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Primary goal
                      </label>
                      <Select value={calcGoal} onValueChange={(v) => setCalcGoal(v as typeof calcGoal)}>
                        <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lowest-cost">Lowest total cost</SelectItem>
                          <SelectItem value="tax-friendly">Most tax-friendly</SelectItem>
                          <SelectItem value="investor-friendly">Investor / VC ready</SelectItem>
                          <SelectItem value="remote-friendly">Non-resident / remote</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="rounded-lg border border-border bg-secondary/50 p-3 text-xs text-muted-foreground">
                      Estimates include state annual fee + registered agent (~$100) + average CPA cost
                      for the chosen entity. Excludes state-specific publication or license fees.
                    </div>
                  </CardContent>
                </Card>

                <div className="lg:col-span-2 space-y-4">
                  {recommendations.map((r, i) => {
                    const y = computeYearly(r.state, calcEntity);
                    return (
                      <Card
                        key={r.state.abbr}
                        className={cn(
                          "border-border/60 transition-shadow hover:shadow-lg",
                          i === 0 && "border-primary/50 bg-gradient-to-br from-primary/5 to-transparent",
                        )}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="flex items-start gap-4">
                              <div
                                className={cn(
                                  "h-14 w-14 rounded-xl flex items-center justify-center font-bold text-lg shrink-0",
                                  i === 0
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-secondary text-foreground",
                                )}
                              >
                                #{i + 1}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-xl font-bold">{r.state.state}</h3>
                                  <Badge variant="outline" className={TIER_BADGE[r.state.costTier]}>
                                    {r.state.costTier}
                                  </Badge>
                                  {i === 0 && (
                                    <Badge className="bg-primary/15 text-primary border-primary/30" variant="outline">
                                      Best match
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">{r.state.bestFor} · {r.state.notes}</p>
                                <ul className="flex flex-wrap gap-2 mt-3">
                                  {r.reasons.map((reason) => (
                                    <li
                                      key={reason}
                                      className="text-xs px-2 py-1 rounded bg-secondary text-foreground"
                                    >
                                      {reason}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                                Estimated yearly
                              </div>
                              <div className="text-3xl font-bold gradient-text">
                                {fmtUsd(Math.round(r.yearly))}
                              </div>
                              <div className="text-[11px] text-muted-foreground mt-1">
                                State {fmtUsd(y.stateAnnual)} · Agent {fmtUsd(y.registeredAgent)} · CPA ~{fmtUsd(Math.round(y.cpaAvg))}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  <Card className="bg-gradient-to-br from-primary/10 to-accent/5 border-primary/30">
                    <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">Need help filing?</h3>
                        <p className="text-sm text-muted-foreground">
                          Our team handles formation, EIN, registered agent, and ongoing compliance for you.
                        </p>
                      </div>
                      <Button asChild size="lg">
                        <Link to="/contact">Talk to a specialist</Link>
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
          <p className="text-center text-xs text-muted-foreground mt-12 max-w-2xl mx-auto">
            Disclaimer: Fees and tax rules are summarised from publicly available 2025–2026 data and
            change frequently. This page is for informational purposes only and does not constitute
            legal, tax, or financial advice.
          </p>
        </div>
      </section>
    </Layout>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between border-b border-border/40 pb-1.5">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

const TaxPill = ({ ok, label }: { ok: boolean; label: string }) => (
  <div
    className={cn(
      "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] border",
      ok
        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
        : "bg-muted text-muted-foreground border-border",
    )}
  >
    {ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
    {label}
  </div>
);

const TaxDot = ({ active }: { active: boolean }) => (
  <span
    className={cn(
      "h-2.5 w-2.5 rounded-full",
      active ? "bg-destructive/70" : "bg-emerald-500/70",
    )}
  />
);

export default USAFormation;

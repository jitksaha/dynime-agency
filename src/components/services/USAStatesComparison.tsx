import { useMemo, useState } from "react";
import { STATES as STATIC_STATES, TIER_BADGE, TOP_5_STATES, type CostTier } from "@/data/usa-formation";
import { useUsaStatePricing } from "@/hooks/use-usa-state-pricing";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { CheckCircle2, Download, Search, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const csvEscape = (v: string | number) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const downloadStatesCSV = (rows: typeof STATIC_STATES) => {
  const headers = [
    "State", "Abbr", "LLC Formation Fee (USD)", "Corp Formation Fee (USD)",
    "LLC Annual", "Corp Annual", "Franchise Tax",
    "State Income Tax", "Corporate Tax", "Sales Tax",
    "Cost Tier", "Best For", "Notes",
  ];
  const lines = [headers.join(",")];
  for (const s of rows) {
    lines.push([
      s.state, s.abbr, s.llcFormation, s.corpFormation,
      s.llcAnnualLabel, s.corpAnnualLabel, s.franchiseTax,
      s.stateIncomeTax ? "Yes" : "No",
      s.corporateTax ? "Yes" : "No",
      s.salesTax ? "Yes" : "No",
      s.costTier, s.bestFor, s.notes,
    ].map(csvEscape).join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `usa-state-formation-costs-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const TIERS: (CostTier | "All")[] = ["All", "Low", "Medium", "High", "Very High"];

const fmtUsd = (n: number) =>
  n === 0 ? "$0" : `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

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

type Entity = "Both" | "LLC" | "Corp";
type Goal = "Any" | "Tax-friendly" | "Low cost";

const ENTITIES: Entity[] = ["Both", "LLC", "Corp"];
const GOALS: Goal[] = ["Any", "Tax-friendly", "Low cost"];

const USAStatesComparison = () => {
  const { data: dynamicStates } = useUsaStatePricing();
  const STATES = dynamicStates && dynamicStates.length > 0 ? dynamicStates : STATIC_STATES;
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState<(typeof TIERS)[number]>("All");
  const [entity, setEntity] = useState<Entity>("Both");
  const [goal, setGoal] = useState<Goal>("Any");
  const [selectedAbbr, setSelectedAbbr] = useState<string>("WY");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = STATES.filter((s) => {
      if (tier !== "All" && s.costTier !== tier) return false;
      if (goal === "Tax-friendly" && (s.stateIncomeTax || s.corporateTax)) return false;
      if (goal === "Low cost" && !(s.costTier === "Low" || s.costTier === "Medium")) return false;
      if (!q) return true;
      return (
        s.state.toLowerCase().includes(q) ||
        s.abbr.toLowerCase().includes(q) ||
        s.bestFor.toLowerCase().includes(q)
      );
    });
    if (goal === "Low cost") {
      const key = entity === "Corp" ? "corpFormation" : "llcFormation";
      list = [...list].sort((a, b) => (a[key] as number) - (b[key] as number));
    }
    return list;
  }, [search, tier, entity, goal]);

  const showLLC = entity !== "Corp";
  const showCorp = entity !== "LLC";

  const popular = TOP_5_STATES;

  const bestPopular = useMemo(() => {
    if (!popular.length) return null;
    const min = (key: "llcFormation" | "corpFormation" | "llcAnnual" | "corpAnnual") =>
      Math.min(...popular.map((s) => s[key] as number));
    const taxScore = (s: typeof popular[number]) =>
      (s.stateIncomeTax ? 0 : 1) + (s.corporateTax ? 0 : 1) + (s.salesTax ? 0 : 1);
    const maxTax = Math.max(...popular.map(taxScore));
    return {
      llcFormation: min("llcFormation"),
      corpFormation: min("corpFormation"),
      llcAnnual: min("llcAnnual"),
      corpAnnual: min("corpAnnual"),
      taxScore: maxTax,
      isTaxFriendly: (s: typeof popular[number]) => taxScore(s) === maxTax,
    };
  }, [popular]);

  const bestCellCls = "bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/40 font-semibold text-emerald-600 dark:text-emerald-400";
  const BestBadge = () => (
    <div className="text-[9px] uppercase tracking-wider mt-0.5 text-emerald-600 dark:text-emerald-400 font-bold">
      ★ Best
    </div>
  );

  return (
    <>
      {/* Popular states */}
      <section className="section-padding bg-card/30">
        <div className="container-custom">
          <div className="max-w-3xl mb-10">
            <span className="text-primary text-sm font-semibold uppercase tracking-wider">
              Popular states
            </span>
            <h2 className="font-heading text-3xl md:text-4xl font-bold mt-3 mb-3">
              Most-chosen states for incorporation
            </h2>
            <p className="text-muted-foreground">
              Top picks for non-residents, startups, and online businesses.
            </p>
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
                  <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                    {s.notes}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Top 5 side-by-side comparison */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="max-w-3xl mb-8">
            <span className="text-primary text-sm font-semibold uppercase tracking-wider">
              Top 5 comparison
            </span>
            <h2 className="font-heading text-3xl md:text-4xl font-bold mt-3 mb-3">
              Side-by-side: most popular states
            </h2>
            <p className="text-muted-foreground">
              Quick head-to-head view of formation cost, recurring annual fees, franchise tax, and
              the major state taxes for the five states most non-residents and founders choose.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
            <span className="inline-block h-3 w-3 rounded ring-1 ring-emerald-500/40 bg-emerald-500/10" />
            Highlighted cells = lowest cost or most tax-friendly option
          </div>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px] sticky left-0 bg-card z-10">Metric</TableHead>
                    {popular.map((s) => {
                      const active = s.abbr === selectedAbbr;
                      return (
                        <TableHead
                          key={s.abbr}
                          onClick={() => {
                            setSelectedAbbr(s.abbr);
                            if (typeof document !== "undefined") {
                              document
                                .getElementById("selected-state-summary")
                                ?.scrollIntoView({ behavior: "smooth", block: "start" });
                            }
                          }}
                          className={cn(
                            "text-center min-w-[140px] cursor-pointer select-none transition-colors",
                            active ? "bg-primary/10 ring-1 ring-inset ring-primary/40" : "hover:bg-muted/40",
                          )}
                          title={`View ${s.state} summary`}
                        >
                          <div className={cn("font-semibold", active ? "text-primary" : "text-foreground")}>
                            {s.state}
                          </div>
                          <Badge variant="outline" className={cn("mt-1", TIER_BADGE[s.costTier])}>
                            {s.costTier}
                          </Badge>
                          <div className="text-[10px] uppercase tracking-wider mt-1 text-muted-foreground">
                            {active ? "✓ Selected" : "Click to view"}
                          </div>
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium sticky left-0 bg-card">Best for</TableCell>
                    {popular.map((s) => (
                      <TableCell key={s.abbr} className="text-center text-xs text-muted-foreground">{s.bestFor}</TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium sticky left-0 bg-card">LLC formation fee</TableCell>
                    {popular.map((s) => {
                      const best = bestPopular?.llcFormation === s.llcFormation;
                      return (
                        <TableCell key={s.abbr} className={cn("text-center", best && bestCellCls)}>
                          {fmtUsd(s.llcFormation)}
                          {best && <BestBadge />}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium sticky left-0 bg-card">Corp formation fee</TableCell>
                    {popular.map((s) => {
                      const best = bestPopular?.corpFormation === s.corpFormation;
                      return (
                        <TableCell key={s.abbr} className={cn("text-center", best && bestCellCls)}>
                          {fmtUsd(s.corpFormation)}
                          {best && <BestBadge />}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium sticky left-0 bg-card">LLC annual cost</TableCell>
                    {popular.map((s) => {
                      const best = bestPopular?.llcAnnual === s.llcAnnual;
                      return (
                        <TableCell key={s.abbr} className={cn("text-center", best && bestCellCls)}>
                          {s.llcAnnualLabel}
                          {best && <BestBadge />}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium sticky left-0 bg-card">Corp annual cost</TableCell>
                    {popular.map((s) => {
                      const best = bestPopular?.corpAnnual === s.corpAnnual;
                      return (
                        <TableCell key={s.abbr} className={cn("text-center", best && bestCellCls)}>
                          {s.corpAnnualLabel}
                          {best && <BestBadge />}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium sticky left-0 bg-card">Franchise tax</TableCell>
                    {popular.map((s) => {
                      const best = s.franchiseTax === "No";
                      return (
                        <TableCell key={s.abbr} className={cn("text-center text-xs", best && bestCellCls)}>
                          {s.franchiseTax}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium sticky left-0 bg-card">State income tax</TableCell>
                    {popular.map((s) => (
                      <TableCell key={s.abbr} className={cn("text-center", !s.stateIncomeTax && bestCellCls)}>
                        <div className="flex justify-center">
                          <TaxPill ok={!s.stateIncomeTax} label={s.stateIncomeTax ? "Yes" : "None"} />
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium sticky left-0 bg-card">Corporate tax</TableCell>
                    {popular.map((s) => (
                      <TableCell key={s.abbr} className={cn("text-center", !s.corporateTax && bestCellCls)}>
                        <div className="flex justify-center">
                          <TaxPill ok={!s.corporateTax} label={s.corporateTax ? "Yes" : "None"} />
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium sticky left-0 bg-card">Sales tax</TableCell>
                    {popular.map((s) => (
                      <TableCell key={s.abbr} className={cn("text-center", !s.salesTax && bestCellCls)}>
                        <div className="flex justify-center">
                          <TaxPill ok={!s.salesTax} label={s.salesTax ? "Yes" : "None"} />
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow className="bg-muted/30">
                    <TableCell className="font-medium sticky left-0 bg-muted/30">Most tax-friendly</TableCell>
                    {popular.map((s) => {
                      const best = bestPopular?.isTaxFriendly(s);
                      return (
                        <TableCell key={s.abbr} className={cn("text-center", best && bestCellCls)}>
                          {best ? "★ Yes" : "—"}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium sticky left-0 bg-card">Notes</TableCell>
                    {popular.map((s) => (
                      <TableCell key={s.abbr} className="text-center text-xs text-muted-foreground">{s.notes}</TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* All 50 states */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div className="max-w-3xl">
              <span className="text-primary text-sm font-semibold uppercase tracking-wider">
                All 50 states
              </span>
              <h2 className="font-heading text-3xl md:text-4xl font-bold mt-3 mb-3">
                Full cost &amp; tax breakdown
              </h2>
              <p className="text-muted-foreground">
                Filter by cost tier or search by state name. Includes formation fees, recurring
                annual fees, franchise tax, and state-level income / corporate / sales tax indicators.
              </p>
            </div>
            <div className="flex flex-col items-start md:items-end gap-2">
              <Button
                variant="outline"
                onClick={() => downloadStatesCSV(filtered.length ? filtered : STATES)}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Download CSV ({filtered.length || STATES.length})
              </Button>
              <span className="text-xs text-muted-foreground">
                Exports current filtered view
              </span>
            </div>
          </div>

          {(() => {
            const selected = STATES.find((s) => s.abbr === selectedAbbr) ?? STATES[0];
            const formation = entity === "Corp" ? selected.corpFormation : selected.llcFormation;
            const annualLabel = entity === "Corp" ? selected.corpAnnualLabel : selected.llcAnnualLabel;
            return (
              <Card id="selected-state-summary" className="mb-6 border-primary/40 bg-gradient-to-br from-primary/5 to-accent/5 scroll-mt-24">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <CardDescription className="uppercase tracking-wider text-xs">
                        Selected state summary
                      </CardDescription>
                      <CardTitle className="text-2xl">
                        {selected.state}{" "}
                        <span className="text-muted-foreground text-base font-normal">
                          ({selected.abbr})
                        </span>
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={TIER_BADGE[selected.costTier]}>
                        {selected.costTier} cost
                      </Badge>
                      <Select value={selectedAbbr} onValueChange={setSelectedAbbr}>
                        <SelectTrigger className="w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {STATES.map((s) => (
                            <SelectItem key={s.abbr} value={s.abbr}>
                              {s.state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="rounded-lg border border-border bg-background/60 p-4">
                    <div className="text-xs text-muted-foreground">
                      {entity === "Corp" ? "Corp" : "LLC"} formation fee
                    </div>
                    <div className="text-2xl font-bold mt-1">{fmtUsd(formation)}</div>
                    <div className="text-xs text-muted-foreground mt-1">One-time state fee</div>
                  </div>
                  <div className="rounded-lg border border-border bg-background/60 p-4">
                    <div className="text-xs text-muted-foreground">Annual recurring</div>
                    <div className="text-2xl font-bold mt-1">{annualLabel}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Report / renewal fees
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-background/60 p-4">
                    <div className="text-xs text-muted-foreground">Franchise tax</div>
                    <div className="text-base font-semibold mt-1 leading-tight">
                      {selected.franchiseTax}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-background/60 p-4">
                    <div className="text-xs text-muted-foreground mb-2">Key state taxes</div>
                    <div className="space-y-1.5">
                      <TaxPill ok={!selected.stateIncomeTax} label={selected.stateIncomeTax ? "Has personal income tax" : "No personal income tax"} />
                      <TaxPill ok={!selected.corporateTax} label={selected.corporateTax ? "Has corporate tax" : "No corporate tax"} />
                      <TaxPill ok={!selected.salesTax} label={selected.salesTax ? "Has sales tax" : "No sales tax"} />
                    </div>
                  </div>
                </CardContent>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground border-t border-border pt-3">
                    <span className="font-medium text-foreground">Best for:</span> {selected.bestFor}
                    {" — "}{selected.notes}
                  </p>
                </CardContent>
              </Card>
            );
          })()}


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
            <Select value={entity} onValueChange={(v) => setEntity(v as Entity)}>
              <SelectTrigger className="w-full md:w-44">
                <SelectValue placeholder="Entity type" />
              </SelectTrigger>
              <SelectContent>
                {ENTITIES.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e === "Both" ? "LLC & Corp" : e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={goal} onValueChange={(v) => setGoal(v as Goal)}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Goal" />
              </SelectTrigger>
              <SelectContent>
                {GOALS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g === "Any" ? "Any goal" : g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tier} onValueChange={(v) => setTier(v as typeof tier)}>
              <SelectTrigger className="w-full md:w-44">
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

          {(entity !== "Both" || goal !== "Any" || tier !== "All" || search) && (
            <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Showing {filtered.length} states</span>
              {entity !== "Both" && <Badge variant="secondary">{entity} only</Badge>}
              {goal !== "Any" && <Badge variant="secondary">{goal}</Badge>}
              {tier !== "All" && <Badge variant="secondary">{tier} cost</Badge>}
              <button
                onClick={() => {
                  setSearch("");
                  setTier("All");
                  setEntity("Both");
                  setGoal("Any");
                }}
                className="ml-auto text-primary hover:underline"
              >
                Clear filters
              </button>
            </div>
          )}

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">State</TableHead>
                    {showLLC && <TableHead>LLC formation</TableHead>}
                    {showCorp && <TableHead>Corp formation</TableHead>}
                    {showLLC && <TableHead>LLC annual</TableHead>}
                    {showCorp && <TableHead>Corp annual</TableHead>}
                    <TableHead>Franchise</TableHead>
                    <TableHead>Income / Corp / Sales</TableHead>
                    <TableHead>Tier</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => (
                    <TableRow
                      key={s.abbr}
                      onClick={() => setSelectedAbbr(s.abbr)}
                      className={cn(
                        "cursor-pointer",
                        s.abbr === selectedAbbr && "bg-primary/5",
                      )}
                    >
                      <TableCell>
                        <div className="font-medium">{s.state}</div>
                        <div className="text-xs text-muted-foreground">{s.bestFor}</div>
                      </TableCell>
                      {showLLC && <TableCell>{fmtUsd(s.llcFormation)}</TableCell>}
                      {showCorp && <TableCell>{fmtUsd(s.corpFormation)}</TableCell>}
                      {showLLC && <TableCell>{s.llcAnnualLabel}</TableCell>}
                      {showCorp && <TableCell>{s.corpAnnualLabel}</TableCell>}
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
    </>
  );
};

export default USAStatesComparison;

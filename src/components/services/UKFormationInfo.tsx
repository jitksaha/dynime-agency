import { useMemo, useState } from "react";
import {
  UK_ENTITIES,
  UK_OPERATIONAL_COSTS,
  UK_TIER_BADGE,
  UK_COMPLEXITY_BADGE,
  type UKEntityRecord,
} from "@/data/uk-formation";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Crown,
  Info,
  PoundSterling,
  Sparkles,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";

const fmtGbp = (n: number) =>
  n === 0 ? "£0" : `£${n.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;

const range = (min: number, max: number) =>
  min === max ? fmtGbp(min) : `${fmtGbp(min)} – ${fmtGbp(max)}${max >= 1000 ? "+" : ""}`;

type FounderType = "solo" | "multiple" | "freelancer" | "scaling" | "social" | "charity";

const recommendEntity = (founder: FounderType): string => {
  switch (founder) {
    case "solo":
    case "scaling":
      return "ltd";
    case "multiple":
      return "llp";
    case "freelancer":
      return "sole";
    case "social":
      return "cic";
    case "charity":
      return "charity";
  }
};

const calcCorporateTax = (profit: number) => (profit < 50000 ? 0.19 : 0.25);

const UKFormationInfo = () => {
  const [founder, setFounder] = useState<FounderType>("solo");
  const [revenue, setRevenue] = useState<number>(120000);
  const [profit, setProfit] = useState<number>(40000);

  const recommendedId = useMemo(() => recommendEntity(founder), [founder]);
  const recommended = UK_ENTITIES.find((e) => e.id === recommendedId)!;

  const vatRequired = revenue > 90000;
  const corporateRate = calcCorporateTax(profit);
  const corporateTaxDue = Math.max(0, Math.round(profit * corporateRate));

  const popular = UK_ENTITIES.filter((e) => e.popular || ["ltd", "llp", "sole"].includes(e.id));

  return (
    <>
      {/* Quick stats */}
      <section className="section-padding bg-card/30">
        <div className="container-custom">
          <div className="max-w-3xl mb-10">
            <span className="text-primary text-sm font-semibold uppercase tracking-wider">
              UK Company Formation
            </span>
            <h2 className="font-heading text-3xl md:text-4xl font-bold mt-3 mb-3">
              Understand UK formation in 60 seconds
            </h2>
            <p className="text-muted-foreground">
              Compare every UK entity type, see real formation &amp; recurring costs, taxes, VAT
              rules, and get an instant entity recommendation for your business.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Building2, label: "Entity types", value: "6" },
              { icon: PoundSterling, label: "Cheapest setup", value: "£12-50" },
              { icon: Crown, label: "Most popular", value: "Ltd" },
              { icon: AlertTriangle, label: "VAT threshold", value: "£90k" },
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
        </div>
      </section>

      {/* Popular entity cards */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="max-w-3xl mb-10">
            <span className="text-primary text-sm font-semibold uppercase tracking-wider">
              Top picks
            </span>
            <h2 className="font-heading text-3xl md:text-4xl font-bold mt-3 mb-3">
              Most-chosen UK entity types
            </h2>
            <p className="text-muted-foreground">
              90% of our clients choose a <strong className="text-foreground">Private Limited
              Company (Ltd)</strong> — cheapest, globally accepted, perfect for SaaS and online
              businesses.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {popular.map((e) => (
              <Card key={e.id} className={cn("overflow-hidden", e.popular && "border-primary/40")}>
                {e.popular && <div className="h-1.5 bg-gradient-to-r from-primary to-accent" />}
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg">{e.type}</CardTitle>
                    {e.popular && (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                        ★ Popular
                      </Badge>
                    )}
                  </div>
                  <CardDescription>{e.bestFor}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2.5 text-sm">
                  <Row label="Formation fee" value={range(e.formationFeeMin, e.formationFeeMax)} />
                  <Row label="Yearly compliance" value={fmtGbp(e.annualComplianceFee)} />
                  <Row label="Accounting / yr" value={range(e.accountingMin, e.accountingMax)} />
                  <Row label="Corporate tax" value={e.corporateTax} />
                  <Row label="VAT rate" value={e.vatRate} />
                  <div className="flex gap-2 pt-2">
                    <Badge variant="outline" className={UK_COMPLEXITY_BADGE[e.complexity]}>
                      {e.complexity} complexity
                    </Badge>
                    <Badge variant="outline" className={UK_TIER_BADGE[e.costTier]}>
                      {e.costTier} cost
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                    {e.notes}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Full entity comparison table */}
      <section className="section-padding bg-card/30">
        <div className="container-custom">
          <div className="max-w-3xl mb-8">
            <span className="text-primary text-sm font-semibold uppercase tracking-wider">
              Full comparison
            </span>
            <h2 className="font-heading text-3xl md:text-4xl font-bold mt-3 mb-3">
              All UK entity types — costs &amp; taxes
            </h2>
            <p className="text-muted-foreground">
              Formation fee, recurring compliance, accounting, corporate tax, dividend tax and VAT
              rules side-by-side.
            </p>
          </div>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[220px] sticky left-0 bg-card z-10">Entity</TableHead>
                    <TableHead>Formation</TableHead>
                    <TableHead>Yearly compliance</TableHead>
                    <TableHead>Accounting</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Corporate tax</TableHead>
                    <TableHead>Dividend tax</TableHead>
                    <TableHead>VAT</TableHead>
                    <TableHead>Best for</TableHead>
                    <TableHead>Complexity</TableHead>
                    <TableHead>Cost tier</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {UK_ENTITIES.map((e) => (
                    <TableRow key={e.id} className={cn(e.popular && "bg-primary/5")}>
                      <TableCell className="sticky left-0 bg-card font-medium">
                        <div className="flex items-center gap-2">
                          {e.type}
                          {e.popular && (
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px]">
                              ★
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{range(e.formationFeeMin, e.formationFeeMax)}</TableCell>
                      <TableCell>{fmtGbp(e.annualComplianceFee)}</TableCell>
                      <TableCell>{range(e.accountingMin, e.accountingMax)}</TableCell>
                      <TableCell>{range(e.registeredAddressMin, e.registeredAddressMax)}</TableCell>
                      <TableCell className="text-xs">{e.corporateTax}</TableCell>
                      <TableCell className="text-xs">{e.dividendTax}</TableCell>
                      <TableCell className="text-xs">{e.vatRate} • {e.vatThreshold}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{e.bestFor}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={UK_COMPLEXITY_BADGE[e.complexity]}>
                          {e.complexity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={UK_TIER_BADGE[e.costTier]}>
                          {e.costTier}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Operational / recurring costs */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="max-w-3xl mb-8">
            <span className="text-primary text-sm font-semibold uppercase tracking-wider">
              Operational costs
            </span>
            <h2 className="font-heading text-3xl md:text-4xl font-bold mt-3 mb-3">
              Recurring UK costs you should know
            </h2>
            <p className="text-muted-foreground">
              Beyond formation, every UK company has yearly filings and possible add-ons. Here is
              the full picture.
            </p>
          </div>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cost</TableHead>
                    <TableHead>Range</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Applies to</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {UK_OPERATIONAL_COSTS.map((c) => (
                    <TableRow key={c.type}>
                      <TableCell className="font-medium">{c.type}</TableCell>
                      <TableCell>{range(c.min, c.max)}{c.frequency === "Monthly" ? "/mo" : ""}</TableCell>
                      <TableCell>{c.frequency}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.appliesTo}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            c.required === "Yes" && "bg-rose-500/10 text-rose-500 border-rose-500/30",
                            c.required === "No" && "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
                            c.required === "Conditional" && "bg-amber-500/10 text-amber-500 border-amber-500/30",
                          )}
                        >
                          {c.required}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Calculator / Recommendation engine */}
      <section className="section-padding bg-card/30">
        <div className="container-custom">
          <div className="max-w-3xl mb-8">
            <span className="text-primary text-sm font-semibold uppercase tracking-wider">
              Recommendation engine
            </span>
            <h2 className="font-heading text-3xl md:text-4xl font-bold mt-3 mb-3">
              Find your perfect UK entity
            </h2>
            <p className="text-muted-foreground">
              Tell us about your situation and we will instantly recommend the right entity, VAT
              status and corporate tax rate.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" /> Your situation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label>Founder type</Label>
                  <Select value={founder} onValueChange={(v) => setFounder(v as FounderType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solo">Solo founder</SelectItem>
                      <SelectItem value="multiple">Multiple founders / partners</SelectItem>
                      <SelectItem value="freelancer">Freelancer / self-employed</SelectItem>
                      <SelectItem value="scaling">Scaling startup / SaaS</SelectItem>
                      <SelectItem value="social">Social enterprise</SelectItem>
                      <SelectItem value="charity">Charity / non-profit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Expected yearly revenue (£)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={revenue}
                      onChange={(e) => setRevenue(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Expected yearly profit (£)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={profit}
                      onChange={(e) => setProfit(Number(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm space-y-2">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                    <div>
                      <strong>VAT status:</strong>{" "}
                      {vatRequired ? (
                        <span className="text-rose-500">
                          Required — revenue exceeds £90,000 threshold
                        </span>
                      ) : (
                        <span className="text-emerald-500">
                          Optional — below £90,000 threshold
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                    <div>
                      <strong>Corporate tax rate:</strong>{" "}
                      {(corporateRate * 100).toFixed(0)}% — estimated tax due{" "}
                      <strong className="text-foreground">{fmtGbp(corporateTaxDue)}</strong>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/40">
              <div className="h-1.5 bg-gradient-to-r from-primary to-accent" />
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-primary" /> Recommended entity
                  </CardTitle>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                    Best match
                  </Badge>
                </div>
                <CardDescription>{recommended.bestFor}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="text-2xl font-bold">{recommended.type}</div>
                <Row label="Formation fee" value={range(recommended.formationFeeMin, recommended.formationFeeMax)} />
                <Row label="Yearly compliance" value={fmtGbp(recommended.annualComplianceFee)} />
                <Row label="Accounting / yr" value={range(recommended.accountingMin, recommended.accountingMax)} />
                <Row label="Address / yr" value={range(recommended.registeredAddressMin, recommended.registeredAddressMax)} />
                <Row label="Corporate tax" value={recommended.corporateTax} />
                <Row label="Dividend tax" value={recommended.dividendTax} />
                <Row label="VAT" value={`${recommended.vatRate} above ${recommended.vatThreshold}`} />
                <p className="text-xs text-muted-foreground pt-3 border-t border-border">
                  {recommended.notes}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Reality check */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: CheckCircle2,
                title: "What's great about UK",
                tone: "text-emerald-500",
                items: [
                  "Cheap to start — from £12",
                  "Globally accepted Ltd structure",
                  "Non-residents can own 100%",
                  "Fast online registration (24h)",
                ],
              },
              {
                icon: AlertTriangle,
                title: "Reality you should know",
                tone: "text-amber-500",
                items: [
                  "Annual accounting is mandatory",
                  "VAT adds complexity above £90k",
                  "Bank account is the biggest hurdle for non-residents",
                  "Confirmation statement filed yearly",
                ],
              },
              {
                icon: Crown,
                title: "Our straight recommendation",
                tone: "text-primary",
                items: [
                  "90% of clients pick a Ltd company",
                  "Cheapest, simplest, globally accepted",
                  "Perfect for SaaS / online business",
                  "We handle Companies House + HMRC end-to-end",
                ],
              },
            ].map((c) => (
              <Card key={c.title}>
                <CardHeader>
                  <CardTitle className={cn("text-lg flex items-center gap-2", c.tone)}>
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
    </>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between border-b border-border/40 pb-1.5">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-right">{value}</span>
  </div>
);

export default UKFormationInfo;

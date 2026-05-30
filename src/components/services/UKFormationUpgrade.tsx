import { useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, CheckCircle2, XCircle, ShieldCheck,
  Clock, Globe2, Languages, ArrowRight,
} from "lucide-react";

type CheckStatus = "available" | "unavailable" | "manual_review";
interface CheckResult {
  status: CheckStatus;
  query: string;
  message: string;
  matches: { title: string; status: string; number?: string; date?: string }[];
  suggestions: string[];
}

const FAQS = [
  { q: "How long does UK company registration take?", a: "Companies House same-day incorporation is available for filings submitted before 3pm GMT. Standard processing is 24–48 hours." },
  { q: "Can non-UK residents register a UK company?", a: "Yes. There are no residency or nationality restrictions on UK company directors or shareholders." },
  { q: "Do I need a UK address?", a: "Companies House requires a UK registered office address — included in our package." },
  { q: "Can Dynime help with VAT registration?", a: "Yes. We handle VAT registration with HMRC once your company is incorporated." },
  { q: "Can Dynime help open a business bank account?", a: "Yes. We make introductions to Tide, Wise Business, Revolut Business and Mercury." },
];

const SUGGESTION_HEADER = "Alternative names you could try";
const checkSchema = z.string().trim().min(2).max(160);


const UKFormationUpgrade = () => {
  const [name, setName] = useState("");
  const [suffix, setSuffix] = useState<"Ltd" | "Limited">("Ltd");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stripSuffix = (s: string) =>
    s.replace(/\s+(ltd\.?|limited)\s*$/i, "").trim();

  const buildFullName = (val?: string) => {
    const base = stripSuffix((val ?? name).trim());
    return base ? `${base} ${suffix}` : "";
  };

  const runCheck = async (val?: string) => {
    const q = buildFullName(val);
    const parsed = checkSchema.safeParse(q);
    if (!parsed.success) {
      setError("Enter a name between 2 and 160 characters.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const url = `https://isweduliawwjqwhyvwhp.supabase.co/functions/v1/companies-house-search?q=${encodeURIComponent(q)}`;
      const r = await fetch(url, { headers: { Accept: "application/json" } });
      const payload = await r.json();
      if (!r.ok) {
        setError(payload?.error || "Lookup failed. Try again.");
        setResult(null);
        return;
      }
      setResult(payload as CheckResult);
      try {
        window.dispatchEvent(new CustomEvent("dynime:uk-name-check", { detail: { q, status: payload.status } }));
      } catch { /* noop */ }
    } catch {
      setError("Could not reach Companies House. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  // Inject FAQ JSON-LD for SEO
  useEffect(() => {
    const id = "uk-formation-faq-jsonld";
    document.getElementById(id)?.remove();
    const node = document.createElement("script");
    node.type = "application/ld+json";
    node.id = id;
    node.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
    document.head.appendChild(node);

    const sid = "uk-formation-service-jsonld";
    document.getElementById(sid)?.remove();
    const s = document.createElement("script");
    s.type = "application/ld+json";
    s.id = sid;
    s.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Service",
      name: "UK Company Formation",
      provider: { "@type": "Organization", name: "Dynime Inc.", url: "https://dynime.com" },
      areaServed: "Worldwide",
      serviceType: "UK Limited Company Registration",
      description:
        "Register a UK Limited company from anywhere in the world. Companies House filing, registered office, VAT, and bank account assistance.",
      offers: { "@type": "Offer", priceCurrency: "GBP", url: "https://dynime.com/uk-company" },
    });
    document.head.appendChild(s);

    return () => {
      document.getElementById(id)?.remove();
      document.getElementById(sid)?.remove();
    };
  }, []);

  return (
    <>
      {/* HERO with name checker */}
      <section className="section-padding bg-gradient-to-br from-primary/10 via-background to-background border-b border-border">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4">
              <Languages className="w-3.5 h-3.5 mr-1" /> International founders welcome
            </Badge>
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
              Register Your UK Company <span className="text-primary">from Anywhere</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Check your company name availability and launch your UK business with expert support.
            </p>

            <form
              onSubmit={(e) => { e.preventDefault(); runCheck(); }}
              className="flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto"
              aria-label="Check UK company name availability"
            >
              <div className="relative flex-1 flex items-stretch rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 140))}
                  placeholder="e.g. Atlas Robotics"
                  maxLength={140}
                  className="h-12 pl-9 pr-2 text-base border-0 shadow-none focus-visible:ring-0 bg-transparent flex-1"
                  aria-label="Proposed company name (without suffix)"
                />
                <Select value={suffix} onValueChange={(v) => setSuffix(v as "Ltd" | "Limited")}>
                  <SelectTrigger
                    className="h-12 w-[110px] border-0 border-l border-input rounded-none rounded-r-md bg-muted/40 font-medium focus:ring-0"
                    aria-label="Company name suffix"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ltd">Ltd</SelectItem>
                    <SelectItem value="Limited">Limited</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" size="lg" disabled={loading} className="h-12 px-6">
                {loading ? "Checking…" : (<>Check Availability <ArrowRight className="w-4 h-4 ml-1" /></>)}
              </Button>
            </form>
            {name.trim() && (
              <p className="text-xs text-muted-foreground mt-2">
                Checking: <span className="font-medium text-foreground">{buildFullName()}</span> — every UK private company name must end with “Ltd” or “Limited”.
              </p>
            )}
            {error && <p className="text-sm text-destructive mt-3" role="alert">{error}</p>}

            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-6 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-primary" /> Live Companies House data</span>
              <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-primary" /> Same-day incorporation</span>
              <span className="inline-flex items-center gap-1.5"><Globe2 className="w-3.5 h-3.5 text-primary" /> Open to all nationalities</span>
            </div>
          </div>

          {/* RESULTS */}
          {(loading || result) && (
            <div className="max-w-3xl mx-auto mt-10">
              {loading && (
                <Card><CardContent className="p-6 space-y-3">
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </CardContent></Card>
              )}

              {!loading && result && (
                <Card
                  className={
                    result.status === "unavailable"
                      ? "border-destructive/40 bg-destructive/5"
                      : "border-green-500/40 bg-green-500/5"
                  }
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3">
                      {result.status === "available" && <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />}
                      {result.status === "unavailable" && <XCircle className="w-6 h-6 text-destructive shrink-0" />}
                      {result.status === "manual_review" && <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />}
                      <div className="flex-1">
                        <h3 className="font-heading text-xl font-semibold mb-1">
                          {result.status === "available" && `“${result.query}” looks available`}
                          {result.status === "unavailable" && `“${result.query}” is not available`}
                          {result.status === "manual_review" && `“${result.query}” looks available`}
                        </h3>
                        <p className="text-sm text-muted-foreground">{result.message}</p>
                        {result.status !== "unavailable" && (
                          <p className="text-xs text-muted-foreground mt-2">
                            This name appears available based on Companies House search results. Final approval is subject to Companies House registration rules.
                          </p>
                        )}

                        {result.matches?.length > 0 && (
                          <div className="mt-4">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Similar existing companies</p>
                            <ul className="space-y-1.5">
                              {result.matches.slice(0, 4).map((m) => (
                                <li key={m.number} className="text-sm flex items-center justify-between gap-2 border-b border-border/40 pb-1.5">
                                  <span className="truncate">{m.title}</span>
                                  <Badge variant="outline" className="capitalize text-[10px]">{m.status}</Badge>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {result.suggestions?.length > 0 && (
                          <div className="mt-4">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{SUGGESTION_HEADER}</p>
                            <div className="flex flex-wrap gap-2">
                              {result.suggestions.map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => { setName(s); void runCheck(s); }}
                                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-background hover:bg-muted transition"
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="mt-5 flex flex-wrap gap-2">
                          <Button asChild size="sm">
                            <a href="/contact">Register this company <ArrowRight className="w-4 h-4 ml-1" /></a>
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <a href="#pricing">See pricing</a>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default UKFormationUpgrade;




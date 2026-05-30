import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, ExternalLink, ShieldCheck, Globe2, Flag } from "lucide-react";

type Suffix = "LLC" | "Inc" | "Corp" | "Ltd";
const SUFFIXES: Suffix[] = ["LLC", "Inc", "Corp", "Ltd"];

const stripSuffix = (s: string) =>
  s.replace(/\s+(llc|l\.l\.c\.?|inc\.?|corp\.?|corporation|ltd\.?|limited)\s*$/i, "").trim();

// Match OpenCorporates' own search form exactly — this URL shape returns
// the standard "Found N companies" results page across all US jurisdictions.
const buildOcUrl = (query: string) =>
  `https://opencorporates.com/companies?${new URLSearchParams({
    utf8: "\u2713",
    q: query,
    jurisdiction_code: "",
    type: "companies",
  }).toString()}`;

const openSearch = (url: string) => {
  const win = window.open(
    url, "dynime-us-search",
    "width=1200,height=820,resizable=yes,scrollbars=yes,noopener,noreferrer",
  );
  if (!win) window.open(url, "_blank", "noopener,noreferrer");
};

const USFormationHero = () => {
  const [name, setName] = useState("");
  const [suffix, setSuffix] = useState<Suffix>("LLC");
  const [error, setError] = useState<string | null>(null);

  const buildFullName = () => {
    const base = stripSuffix(name.trim());
    return base ? `${base} ${suffix}` : "";
  };

  const onCheck = () => {
    const q = buildFullName();
    if (q.length < 2) { setError("Enter a company name (at least 2 characters)."); return; }
    setError(null);
    openSearch(buildOcUrl(q));
  };

  const fullName = buildFullName();

  return (
    <section className="section-padding bg-gradient-to-br from-primary/10 via-background to-background border-b border-border">
      <div className="container-custom">
        <div className="max-w-3xl mx-auto text-center">
          <Badge variant="secondary" className="mb-4">
            <Flag className="w-3.5 h-3.5 mr-1" /> Open to founders worldwide
          </Badge>
          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
            Register Your US Company <span className="text-primary">from Anywhere</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Check your LLC or Corporation name across all 50 US Secretary of State registries — then launch with expert support.
          </p>

          <form
            onSubmit={(e) => { e.preventDefault(); onCheck(); }}
            className="flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto"
            aria-label="Check US company name availability"
          >
            <div className="relative flex-1 flex items-stretch rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 140))}
                placeholder="e.g. Atlas Robotics"
                maxLength={140}
                className="h-12 pl-9 pr-2 text-base border-0 shadow-none focus-visible:ring-0 bg-transparent flex-1 min-w-0"
                aria-label="Proposed company name (without suffix)"
              />
              <Select value={suffix} onValueChange={(v) => setSuffix(v as Suffix)}>
                <SelectTrigger
                  className="h-12 w-[100px] border-0 border-l border-input rounded-none rounded-r-md bg-muted/40 font-medium focus:ring-0"
                  aria-label="Entity suffix"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUFFIXES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" size="lg" className="h-12 px-6 gap-2">
              Check Availability <ExternalLink className="w-4 h-4" />
            </Button>
          </form>

          {fullName && (
            <p className="text-xs text-muted-foreground mt-2">
              Checking: <span className="font-medium text-foreground">{fullName}</span>
              {" "}— results open from OpenCorporates across all US states.
            </p>
          )}
          {error && <p className="text-sm text-destructive mt-3" role="alert">{error}</p>}

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-6 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-primary" /> Powered by OpenCorporates registry</span>
            <span className="inline-flex items-center gap-1.5"><Globe2 className="w-3.5 h-3.5 text-primary" /> All 50 US states supported</span>
            <span className="inline-flex items-center gap-1.5"><Flag className="w-3.5 h-3.5 text-primary" /> LLC, C-Corp, S-Corp & EIN</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default USFormationHero;


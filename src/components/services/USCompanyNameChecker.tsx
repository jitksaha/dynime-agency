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

// OpenCorporates jurisdiction codes for the most popular formation states.
const STATES: { code: string; name: string; flag?: string }[] = [
  { code: "", name: "All US States" },
  { code: "us_de", name: "Delaware" },
  { code: "us_wy", name: "Wyoming" },
  { code: "us_fl", name: "Florida" },
  { code: "us_tx", name: "Texas" },
  { code: "us_ny", name: "New York" },
  { code: "us_ca", name: "California" },
  { code: "us_nv", name: "Nevada" },
  { code: "us_nm", name: "New Mexico" },
];

const stripSuffix = (s: string) =>
  s.replace(/\s+(llc|l\.l\.c\.?|inc\.?|corp\.?|corporation|ltd\.?|limited)\s*$/i, "").trim();

const buildOcUrl = (query: string, jurisdiction: string) => {
  const params = new URLSearchParams({ q: query, type: "companies" });
  if (jurisdiction) params.set("jurisdiction_code", jurisdiction);
  return `https://opencorporates.com/companies?${params.toString()}`;
};

const openSearch = (url: string) => {
  // Popup window so users stay anchored to Dynime in the original tab.
  const win = window.open(
    url,
    "dynime-us-search",
    "width=1200,height=820,resizable=yes,scrollbars=yes,noopener,noreferrer",
  );
  if (!win) {
    // Popup blocked — fall back to a new tab.
    window.open(url, "_blank", "noopener,noreferrer");
  }
};

const USCompanyNameChecker = () => {
  const [name, setName] = useState("");
  const [suffix, setSuffix] = useState<Suffix>("LLC");
  const [jurisdiction, setJurisdiction] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const buildFullName = (val?: string) => {
    const base = stripSuffix((val ?? name).trim());
    return base ? `${base} ${suffix}` : "";
  };

  const onCheck = () => {
    const q = buildFullName();
    if (q.length < 2) {
      setError("Enter a company name (at least 2 characters).");
      return;
    }
    setError(null);
    openSearch(buildOcUrl(q, jurisdiction));
    try {
      window.dispatchEvent(
        new CustomEvent("dynime:us-name-check", { detail: { q, jurisdiction } }),
      );
    } catch { /* noop */ }
  };

  const fullName = buildFullName();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-5">
        <Badge variant="secondary" className="mb-3">
          <Flag className="w-3.5 h-3.5 mr-1" /> Live US company name check
        </Badge>
        <h2 className="font-heading text-2xl md:text-3xl font-bold mb-2">
          Check your <span className="gradient-text">US company name</span> availability
        </h2>
        <p className="text-sm md:text-base text-muted-foreground">
          We search the OpenCorporates registry across US Secretary of State filings — pick a state
          or check all 50.
        </p>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); onCheck(); }}
        className="flex flex-col gap-2 sm:flex-row"
        aria-label="Check US company name availability"
      >
        <div className="relative flex-1 flex items-stretch rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 140))}
            placeholder="e.g. Atlas Robotics"
            maxLength={140}
            className="h-12 pl-9 pr-2 text-base border-0 shadow-none focus-visible:ring-0 bg-transparent flex-1"
            aria-label="Proposed company name (without suffix)"
          />
          <Select value={suffix} onValueChange={(v) => setSuffix(v as Suffix)}>
            <SelectTrigger
              className="h-12 w-[100px] border-0 border-l border-input rounded-none bg-muted/40 font-medium focus:ring-0"
              aria-label="Entity suffix"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUFFIXES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={jurisdiction || "all"} onValueChange={(v) => setJurisdiction(v === "all" ? "" : v)}>
            <SelectTrigger
              className="h-12 w-[150px] border-0 border-l border-input rounded-none rounded-r-md bg-muted/40 font-medium focus:ring-0"
              aria-label="Jurisdiction"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATES.map((s) => (
                <SelectItem key={s.code || "all"} value={s.code || "all"}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" size="lg" className="h-12 px-6 gap-2">
          Check Availability <ExternalLink className="w-4 h-4" />
        </Button>
      </form>

      {fullName && (
        <p className="text-xs text-muted-foreground mt-2 text-center sm:text-left">
          Checking:{" "}
          <span className="font-medium text-foreground">{fullName}</span>
          {jurisdiction && (
            <> in <span className="font-medium text-foreground">{
              STATES.find((s) => s.code === jurisdiction)?.name
            }</span></>
          )}
          {" "}— results open in a secure window from OpenCorporates.
        </p>
      )}
      {error && <p className="text-sm text-destructive mt-2" role="alert">{error}</p>}

      {/* Quick state shortcuts */}
      <div className="mt-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 text-center sm:text-left">
          Or check a popular state directly
        </p>
        <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
          {STATES.filter((s) => s.code).slice(0, 7).map((s) => (
            <Button
              key={s.code}
              type="button"
              variant="outline"
              size="sm"
              disabled={!buildFullName()}
              onClick={() => {
                const q = buildFullName();
                if (!q) { setError("Enter a company name first."); return; }
                setError(null);
                openSearch(buildOcUrl(q, s.code));
              }}
              className="h-8"
            >
              {s.name}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-6 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Powered by OpenCorporates public registry
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Globe2 className="w-3.5 h-3.5 text-primary" /> All 50 US states supported
        </span>
      </div>
    </div>
  );
};

export default USCompanyNameChecker;

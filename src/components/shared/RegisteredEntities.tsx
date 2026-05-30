import { useMemo } from "react";
import { useSiteSettings } from "@/hooks/use-data";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { Building2, ShieldCheck, MapPin, Globe2 } from "lucide-react";

export type RegisteredEntity = {
  label: string;
  name: string;
  country: string;
  license_number: string;
};

const DEFAULT_ENTITIES: RegisteredEntity[] = [
  { label: "Main", name: "Dynime Inc.", country: "United States", license_number: "DYN-INC-00000000" },
  { label: "UK", name: "Dynime UK Ltd.", country: "United Kingdom", license_number: "UK-00000000" },
  { label: "BD", name: "Dynime BD Ltd.", country: "Bangladesh", license_number: "BD-00000000" },
];

const parseJSON = <T,>(raw: unknown, fallback: T): T => {
  if (raw == null) return fallback;
  if (typeof raw !== "string") return raw as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const maskLicense = (license: string) => {
  if (!license) return "";
  // Preserve a short prefix (up to first dash or 3 chars) and last 2, mask the middle.
  const clean = license.trim();
  const dashIdx = clean.indexOf("-");
  const prefix = dashIdx > 0 ? clean.slice(0, dashIdx + 1) : clean.slice(0, 3);
  const tail = clean.slice(-2);
  const middleLen = Math.max(4, clean.length - prefix.length - tail.length);
  return `${prefix}${"•".repeat(middleLen)}${tail}`;
};

const RegisteredEntities = () => {
  const { data: settings } = useSiteSettings();

  const entities = useMemo<RegisteredEntity[]>(() => {
    const raw = (settings as any)?.registered_entities;
    const parsed = parseJSON<RegisteredEntity[]>(raw, DEFAULT_ENTITIES);
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_ENTITIES;
  }, [settings]);

  const masked = useMemo<boolean>(() => {
    const raw = (settings as any)?.registered_entities_mask;
    const parsed = parseJSON<string | boolean>(raw, true);
    if (typeof parsed === "boolean") return parsed;
    return String(parsed).toLowerCase() !== "false";
  }, [settings]);

  return (
    <section className="section-padding bg-gradient-to-b from-background via-card/20 to-background">
      <div className="container-custom max-w-6xl">
        <ScrollReveal>
          <div className="text-center mb-10">
            <span className="inline-flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-[0.2em]">
              <span className="h-px w-6 bg-primary/60" />
              Registered globally
              <span className="h-px w-6 bg-primary/60" />
            </span>
            <h2 className="font-heading text-3xl md:text-5xl font-bold mt-3">
              Our <span className="gradient-text">Registered Entities</span>
            </h2>
            <p className="text-sm md:text-base text-muted-foreground mt-3 max-w-2xl mx-auto">
              We operate under fully compliant corporate entities across multiple jurisdictions —
              giving clients legally enforceable contracts wherever they are.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {entities.map((e, i) => (
            <ScrollReveal key={`${e.label}-${i}`} delay={i * 0.1} className="h-full">
              <div className="relative h-full glass-card-hover p-6 rounded-2xl border border-border/60 overflow-hidden">
                <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                    <Globe2 className="w-3 h-3" />
                    {e.label}
                  </span>
                  <Building2 className="w-5 h-5 text-muted-foreground" />
                </div>

                <h3 className="font-heading text-xl font-bold text-foreground leading-tight">
                  {e.name}
                </h3>

                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{e.country}</span>
                </div>

                <div className="mt-5 pt-4 border-t border-border/50">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80 mb-1">
                    Registration / Licence No.
                  </p>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0" />
                    <code className="text-sm font-mono font-semibold text-foreground tracking-wide">
                      {masked ? maskLicense(e.license_number) : e.license_number}
                    </code>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          {masked
            ? "Registration numbers are masked for privacy. Full numbers are available in signed contracts."
            : "Registration numbers shown as filed in their respective jurisdictions."}
        </p>
      </div>
    </section>
  );
};

export default RegisteredEntities;

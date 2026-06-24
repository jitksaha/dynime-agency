import { Building2, UserRound, Mail, Phone, MapPin } from "lucide-react";
import SiteLogo from "@/components/shared/SiteLogo";

export interface AgreementPreviewIssuer {
  type: "company" | "employee";
  name?: string;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
}

export interface AgreementPreviewItem {
  name: string;
  description?: string;
  price: number;
  quantity: number;
}

export interface AgreementPreviewProps {
  title: string;
  effectiveDate: string;
  scope: string;
  term: string;
  paymentTerms: string;
  jurisdiction: string;
  clauses: string[];
  issuer: AgreementPreviewIssuer;
  customerName: string;
  customerEmail: string;
  customerCompany?: string;
  customerPhone?: string;
  items: AgreementPreviewItem[];
  currency: string;
  total: number;
  referenceLabel?: string;
  // Signatures (editable when onChange handlers are provided)
  providerSignerName?: string;
  providerSignedDate?: string;
  clientSignerName?: string;
  clientSignedDate?: string;
  onProviderSignerNameChange?: (v: string) => void;
  onProviderSignedDateChange?: (v: string) => void;
  onClientSignerNameChange?: (v: string) => void;
  onClientSignedDateChange?: (v: string) => void;
  signatureFont?: SignatureFontKey;
}

export type SignatureFontKey =
  | "Great Vibes"
  | "Dancing Script"
  | "Allison"
  | "Caveat"
  | "Pacifico";

export const SIGNATURE_FONTS: { key: SignatureFontKey; label: string }[] = [
  { key: "Great Vibes", label: "Elegant Script" },
  { key: "Dancing Script", label: "Flowing Cursive" },
  { key: "Allison", label: "Refined Calligraphy" },
  { key: "Caveat", label: "Casual Handwritten" },
  { key: "Pacifico", label: "Bold Signature" },
];

const Clause = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
  <div>
    <h2 className="font-semibold text-base mb-1">
      {n}. {title}
    </h2>
    <div className="text-muted-foreground">{children}</div>
  </div>
);

const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";

// Stable string -> int hash for picking a deterministic-but-varied font per agreement
const hashString = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

const ClientSignatureBlock = ({
  fallbackName,
  signerName,
  signedDate,
  onSignerNameChange,
  onSignedDateChange,
  seed,
}: {
  fallbackName: string;
  signerName?: string;
  signedDate?: string;
  onSignerNameChange?: (v: string) => void;
  onSignedDateChange?: (v: string) => void;
  seed: string;
}) => {
  const editable = !!(onSignerNameChange || onSignedDateChange);
  const fullName = (signerName?.trim() || fallbackName || "").trim();
  const firstName = fullName.split(/\s+/)[0] || fullName;
  // Pick a random signature font per agreement (stable for the same seed)
  const fontKey =
    SIGNATURE_FONTS[hashString(seed || fullName) % SIGNATURE_FONTS.length].key;
  const signatureSize =
    fontKey === "Allison" || fontKey === "Great Vibes" ? "text-5xl" : "text-4xl";
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Client</p>
      <div className="relative h-28">
        {firstName && (
          <span
            className={`absolute left-1 bottom-1 ${signatureSize} text-foreground select-none pointer-events-none`}
            style={{ fontFamily: `'${fontKey}', cursive`, lineHeight: 1 }}
          >
            {firstName}
          </span>
        )}
      </div>
      <div className="border-t border-foreground/40 pt-2 text-sm space-y-1">
        {editable ? (
          <>
            <input
              type="text"
              value={signerName ?? ""}
              onChange={(e) => onSignerNameChange?.(e.target.value)}
              placeholder={fallbackName || "Client name"}
              className="w-full bg-transparent border-0 border-b border-dashed border-border focus:border-primary focus:outline-none text-sm font-medium px-0 py-0.5 print:border-none"
            />
            <input
              type="date"
              value={signedDate ?? ""}
              onChange={(e) => onSignedDateChange?.(e.target.value)}
              className="w-full bg-transparent border-0 border-b border-dashed border-border focus:border-primary focus:outline-none text-xs text-muted-foreground px-0 py-0.5 print:border-none"
            />
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Signature &amp; Date</p>
          </>
        ) : (
          <>
            <p className="font-medium">{fullName || "—"}</p>
            <p className="text-xs text-muted-foreground">{formatDate(signedDate) || "Signature & Date"}</p>
          </>
        )}
      </div>
    </div>
  );
};

export default function AgreementPreview(p: AgreementPreviewProps) {
  const issuerIsEmployee = p.issuer.type === "employee" && !!p.issuer.name;
  const providerName = issuerIsEmployee ? p.issuer.name! : "Dynime Inc.";
  const providerEmail = issuerIsEmployee ? p.issuer.email || "" : "support@dynime.com";
  const providerPhone = issuerIsEmployee ? p.issuer.phone || "" : "";
  const providerCountry = issuerIsEmployee ? p.issuer.country || "" : "";

  const clientName = p.customerName || p.customerCompany || "Client";
  const effectiveDateLabel = p.effectiveDate
    ? new Date(p.effectiveDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "—";

  const services = p.items.filter((it) => it && it.name);
  const title = p.title || "Service Agreement";
  const ref = p.referenceLabel || "DRAFT";

  let n = 0;
  return (
    <article className="hr-doc bg-card border border-border rounded-xl shadow-sm text-foreground print:border-0 print:shadow-none print:rounded-none mx-auto max-w-3xl">
      {/* Off-screen preloader so every signature font is fetched + decoded
          before the user prints/saves as PDF — guarantees consistent rendering. */}
      <div aria-hidden="true" className="absolute -left-[9999px] -top-[9999px] opacity-0 pointer-events-none" style={{ position: "absolute" }}>
        {SIGNATURE_FONTS.map((f) => (
          <span key={f.key} style={{ fontFamily: `'${f.key}', cursive`, fontSize: 48 }}>
            Signature
          </span>
        ))}
      </div>
      <header className="px-8 pt-8 pb-6 border-b border-border flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-1">{title}</p>
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Reference: <span className="font-mono">{ref}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Effective date: <span className="font-medium text-foreground">{effectiveDateLabel}</span>
          </p>
        </div>
        <div className="text-right">
          <SiteLogo variant="light" className="h-8 w-auto ml-auto mb-2" />
          <p className="text-[11px] text-muted-foreground">{providerName}</p>
          <p className="text-[11px] text-muted-foreground">{issuerIsEmployee ? "Authorized Representative" : "dynime.com"}</p>
        </div>
      </header>

      <section className="px-8 py-6 grid sm:grid-cols-2 gap-6 border-b border-border">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 flex items-center gap-1">
            <Building2 className="w-3 h-3" /> Service Provider
          </p>
          <p className="font-semibold text-sm">{providerName}</p>
          {providerEmail && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <Mail className="w-3 h-3" /> {providerEmail}
            </p>
          )}
          {providerPhone && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Phone className="w-3 h-3" /> {providerPhone}
            </p>
          )}
          {providerCountry && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <MapPin className="w-3 h-3" /> {providerCountry}
            </p>
          )}
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 flex items-center gap-1">
            <Building2 className="w-3 h-3" /> Client
          </p>
          <p className="font-semibold text-sm">{clientName}</p>
          {p.customerCompany && p.customerCompany !== clientName && (
            <p className="text-xs text-muted-foreground">{p.customerCompany}</p>
          )}
          {p.customerEmail && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <Mail className="w-3 h-3" /> {p.customerEmail}
            </p>
          )}
          {p.customerPhone && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Phone className="w-3 h-3" /> {p.customerPhone}
            </p>
          )}
        </div>
      </section>

      <section className="px-8 py-6 text-xs leading-relaxed">
        <p>
          This {title} (the “Agreement”) is entered into on{" "}
          <span className="font-medium">{effectiveDateLabel}</span> between{" "}
          <span className="font-medium">{providerName}</span> (“Service Provider”) and{" "}
          <span className="font-medium">{clientName}</span> (“Client”). Each may be referred to individually as a “Party” and
          collectively as the “Parties”.
        </p>
      </section>

      <section className="px-8 pb-8 space-y-5 text-xs leading-relaxed">
        {p.scope && (
          <Clause n={++n} title="Scope of Work">
            <p className="whitespace-pre-wrap">{p.scope}</p>
            {services.length > 0 && (
              <ul className="mt-2 list-disc pl-5 space-y-1">
                {services.map((s, i) => (
                  <li key={i}>
                    <span className="font-medium">{s.name}</span>
                    {s.description ? ` — ${s.description}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </Clause>
        )}

        {p.term && (
          <Clause n={++n} title="Term">
            <p className="whitespace-pre-wrap">{p.term}</p>
          </Clause>
        )}

        {p.paymentTerms && (
          <Clause n={++n} title="Fees & Payment">
            <p className="whitespace-pre-wrap">{p.paymentTerms}</p>
            <p className="mt-2 text-muted-foreground">
              Total agreed value:{" "}
              <span className="font-medium text-foreground">
                {Number(p.total || 0).toFixed(2)} {p.currency}
              </span>
              .
            </p>
          </Clause>
        )}

        {p.clauses.map((c, i) => {
          const [head, ...rest] = c.split(":");
          const hasHead = rest.length > 0;
          const num = ++n;
          return (
            <Clause key={i} n={num} title={hasHead ? head.trim() : `Clause ${num}`}>
              <p className="whitespace-pre-wrap">{hasHead ? rest.join(":").trim() : c}</p>
            </Clause>
          );
        })}

        {p.jurisdiction && (
          <Clause n={++n} title="Governing Law">
            <p>
              This Agreement is governed by and construed in accordance with the laws of{" "}
              <span className="font-medium">{p.jurisdiction}</span>.
            </p>
          </Clause>
        )}
      </section>

      <section className="px-8 pb-10 grid sm:grid-cols-2 gap-6 border-t border-border pt-8">
        {/* Service Provider — formal block, no signature */}
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
            Service Provider
          </p>
          <div className="relative h-28 flex items-end">
            {!issuerIsEmployee || providerName === "Dynime Inc." ? (
              <img
                src="/dynime-seal.png"
                alt="Dynime Seal"
                className="absolute left-1 bottom-0 h-24 w-24 object-contain pointer-events-none select-none"
              />
            ) : (
              <p className="font-heading text-lg font-bold tracking-tight">{providerName}</p>
            )}
          </div>
          <div className="border-t border-foreground/40 pt-2 text-sm space-y-0.5">
            <p className="font-medium">{providerName}</p>
            <p className="text-xs text-muted-foreground">
              Date: <span className="text-foreground font-medium">{effectiveDateLabel}</span>
            </p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
              Authorized on behalf of {providerName}
            </p>
          </div>
        </div>

        {/* Client — auto-signed using first name in a random handwriting font */}
        <ClientSignatureBlock
          fallbackName={clientName}
          signerName={p.clientSignerName}
          signedDate={p.clientSignedDate}
          onSignerNameChange={p.onClientSignerNameChange}
          onSignedDateChange={p.onClientSignedDateChange}
          seed={`${p.referenceLabel || ""}|${clientName}`}
        />
      </section>

      {/* Branded footer */}
      <footer className="px-8 py-6 border-t border-border text-center text-[11px] text-muted-foreground space-y-0.5">
        <div className="flex items-center justify-center gap-2">
          <SiteLogo variant="light" className="h-4 w-auto opacity-80" />
          <span className="font-semibold text-foreground">Dynime Inc.</span>
        </div>
        <p>
          Questions? Email{" "}
          <a className="text-primary" href="mailto:support@dynime.com">support@dynime.com</a>
          {" · "}Reference <span className="font-mono">{ref}</span>
        </p>
        <p className="text-[9px] text-muted-foreground/70">dynime.com</p>
      </footer>
    </article>
  );
}

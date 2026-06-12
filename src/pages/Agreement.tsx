import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { db } from "@/integrations/db/client";
import { Button } from "@/components/ui/button";
import { Loader2, Printer, Download, ArrowLeft, Building2, UserRound, FileText, Mail, Phone, MapPin } from "lucide-react";
import SiteLogo from "@/components/shared/SiteLogo";
import { useSEO } from "@/hooks/use-seo";
import { printWithSignatureFonts } from "@/lib/print-with-fonts";
import { apiGet } from "@/lib/api";

interface AgreementRow {
  id: string;
  invoice_number: string | null;
  status: string;
  total: number;
  currency: string | null;
  items: Array<{ name: string; price: number; quantity: number; description?: string }> | null;
  service_brief: Record<string, unknown> | null;
  billing_address: Record<string, unknown> | null;
  customer_name: string | null;
  customer_email: string;
  created_at: string;
}

const toText = (v: unknown) => (typeof v === "string" || typeof v === "number" ? String(v) : "");

const Agreement = () => {
  const { id: routeId, "*": splat } = useParams();
  const location = useLocation();
  const [data, setData] = useState<AgreementRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ref = useMemo(() => {
    const raw = routeId || splat || location.pathname.match(/^\/agreement\/(.+)$/)?.[1];
    if (!raw) return undefined;
    return decodeURIComponent(raw.replace(/\/$/, ""));
  }, [routeId, splat, location.pathname]);

  useSEO({
    title: data?.invoice_number ? `Agreement ${data.invoice_number} | Dynime` : "Agreement | Dynime",
    description: "Service agreement document.",
  });

  const fetchRow = useCallback(async () => {
    if (!ref) return;
    setLoading(true);
    try {
      const row = await apiGet<AgreementRow>(`/orders/public/invoice/${encodeURIComponent(ref)}`);
      setData(row);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load agreement");
    } finally {
      setLoading(false);
    }
  }, [ref]);

  useEffect(() => { fetchRow(); }, [fetchRow]);

  if (loading) {
    return (
      <Layout>
        <div className="container-custom py-20 flex items-center justify-center text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading agreement…
        </div>
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout>
        <div className="container-custom py-20 text-center space-y-3">
          <FileText className="w-10 h-10 mx-auto text-muted-foreground" />
          <p className="text-lg font-semibold">{error || "Agreement not found"}</p>
          <Button asChild variant="outline" size="sm">
            <Link to="/"><ArrowLeft className="w-4 h-4 mr-1" /> Back home</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const brief = (data.service_brief || {}) as Record<string, unknown>;
  const agreementRaw = brief.agreement;
  const agreement = agreementRaw && typeof agreementRaw === "object" ? (agreementRaw as Record<string, unknown>) : null;

  if (!agreement || agreement.include === false) {
    return (
      <Layout>
        <div className="container-custom py-20 text-center space-y-3">
          <FileText className="w-10 h-10 mx-auto text-muted-foreground" />
          <p className="text-lg font-semibold">No agreement attached to this invoice</p>
          <p className="text-sm text-muted-foreground">Open the invoice and enable “Attach service agreement” when creating it.</p>
          <Button asChild variant="outline" size="sm">
            <Link to={`/invoice/${data.invoice_number || data.id}`}><ArrowLeft className="w-4 h-4 mr-1" /> View invoice</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  // Issuer (Provider) — mirrors invoice logic
  const issuerRaw = brief.issuer;
  const issuer = issuerRaw && typeof issuerRaw === "object" ? (issuerRaw as Record<string, unknown>) : null;
  const issuerIsEmployee = issuer?.type === "employee" && toText(issuer.name).length > 0;
  const providerName = issuerIsEmployee ? toText(issuer!.name) : "Dynime Inc.";
  const providerEmail = issuerIsEmployee ? toText(issuer!.email) : "support@dynime.com";
  const providerPhone = issuerIsEmployee ? toText(issuer!.phone) : "";
  const providerCountry = issuerIsEmployee ? toText(issuer!.country) : "";

  // Client
  const addr = (data.billing_address || {}) as Record<string, unknown>;
  const clientName = data.customer_name || toText(addr.company) || "Client";
  const clientCompany = toText(addr.company);
  const clientPhone = toText(addr.phone);

  const title = toText(agreement.title) || "Service Agreement";
  const scope = toText(agreement.scope);
  const term = toText(agreement.term);
  const paymentTerms = toText(agreement.payment_terms);
  const jurisdiction = toText(agreement.jurisdiction);
  const clauses = Array.isArray(agreement.clauses)
    ? (agreement.clauses as unknown[]).map((c) => toText(c)).filter(Boolean)
    : [];
  const effectiveDate = toText(agreement.effective_date) || data.created_at.slice(0, 10);
  const effectiveDateLabel = new Date(effectiveDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const services = (data.items || []).filter((it) => it && it.name);
  const currency = (data.currency || "USD").toUpperCase();

  return (
    <Layout>
      {/* Toolbar */}
      <div className="container-custom pt-8 pb-4 print:hidden flex items-center justify-between gap-3 flex-wrap">
        <Button asChild variant="ghost" size="sm">
          <Link to={`/invoice/${data.invoice_number || data.id}`}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to invoice
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button onClick={() => printWithSignatureFonts()} variant="outline" size="sm" className="gap-1.5">
            <Printer className="w-4 h-4" /> Print
          </Button>
          <Button onClick={() => printWithSignatureFonts()} variant="hero" size="sm" className="gap-1.5">
            <Download className="w-4 h-4" /> Save PDF
          </Button>
        </div>
      </div>

      <div className="container-custom pb-16 print:pb-0">
        <article className="mx-auto max-w-3xl bg-card border border-border rounded-xl shadow-sm print:border-0 print:shadow-none print:rounded-none">
          {/* Header */}
          <header className="px-8 md:px-10 pt-10 pb-6 border-b border-border flex items-start justify-between gap-6 flex-wrap">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-2">{title}</p>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Reference: <span className="font-mono">{data.invoice_number || data.id.slice(0, 8).toUpperCase()}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Effective date: <span className="font-medium text-foreground">{effectiveDateLabel}</span>
              </p>
            </div>
            <div className="text-right">
              {issuerIsEmployee ? (
                <div className="flex items-center justify-end gap-2 mb-2">
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                    {providerName.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold leading-tight">{providerName}</p>
                    <p className="text-[11px] text-muted-foreground leading-tight">Service Provider</p>
                  </div>
                </div>
              ) : (
                <SiteLogo variant="light" className="h-9 w-auto ml-auto mb-2" />
              )}
              <p className="text-xs text-muted-foreground">{providerName}</p>
              {!issuerIsEmployee && <p className="text-xs text-muted-foreground">dynime.com</p>}
            </div>
          </header>

          {/* Parties */}
          <section className="px-8 md:px-10 py-6 grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-8 border-b border-border">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1">
                {issuerIsEmployee ? <UserRound className="w-3 h-3" /> : <Building2 className="w-3 h-3" />} Service Provider
              </p>
              <p className="font-semibold">{providerName}</p>
              {providerEmail && (
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                  <Mail className="w-3 h-3" /> {providerEmail}
                </p>
              )}
              {providerPhone && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Phone className="w-3 h-3" /> {providerPhone}
                </p>
              )}
              {providerCountry && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" /> {providerCountry}
                </p>
              )}
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1">
                <Building2 className="w-3 h-3" /> Client
              </p>
              <p className="font-semibold">{clientName}</p>
              {clientCompany && clientCompany !== clientName && (
                <p className="text-sm text-muted-foreground">{clientCompany}</p>
              )}
              {data.customer_email && (
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                  <Mail className="w-3 h-3" /> {data.customer_email}
                </p>
              )}
              {clientPhone && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Phone className="w-3 h-3" /> {clientPhone}
                </p>
              )}
            </div>
          </section>

          {/* Recitals */}
          <section className="px-8 md:px-10 py-6 text-sm leading-relaxed">
            <p>
              This {title} (the “Agreement”) is entered into on{" "}
              <span className="font-medium">{effectiveDateLabel}</span> between{" "}
              <span className="font-medium">{providerName}</span> (“Service Provider”) and{" "}
              <span className="font-medium">{clientName}</span> (“Client”). Each may be referred to individually
              as a “Party” and collectively as the “Parties”.
            </p>
          </section>

          {/* Clauses */}
          <section className="px-8 md:px-10 pb-8 space-y-6 text-sm leading-relaxed">
            {scope && (
              <Clause n={1} title="Scope of Work">
                <p>{scope}</p>
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

            {term && (
              <Clause n={scope ? 2 : 1} title="Term">
                <p>{term}</p>
              </Clause>
            )}

            {paymentTerms && (
              <Clause n={(scope ? 1 : 0) + (term ? 1 : 0) + 1} title="Fees & Payment">
                <p>{paymentTerms}</p>
                <p className="mt-2 text-muted-foreground">
                  Total agreed value: <span className="font-medium text-foreground">{Number(data.total).toFixed(2)} {currency}</span>{" "}
                  (see invoice <span className="font-mono">{data.invoice_number || data.id.slice(0, 8).toUpperCase()}</span> for the full breakdown).
                </p>
              </Clause>
            )}

            {clauses.map((c, i) => {
              const offset = (scope ? 1 : 0) + (term ? 1 : 0) + (paymentTerms ? 1 : 0);
              const [head, ...rest] = c.split(":");
              const hasHead = rest.length > 0;
              return (
                <Clause key={i} n={offset + i + 1} title={hasHead ? head.trim() : `Clause ${offset + i + 1}`}>
                  <p>{hasHead ? rest.join(":").trim() : c}</p>
                </Clause>
              );
            })}

            {jurisdiction && (
              <Clause n={(scope ? 1 : 0) + (term ? 1 : 0) + (paymentTerms ? 1 : 0) + clauses.length + 1} title="Governing Law">
                <p>This Agreement is governed by and construed in accordance with the laws of <span className="font-medium">{jurisdiction}</span>.</p>
              </Clause>
            )}
          </section>

          {/* Signatures */}
          <section className="px-8 md:px-10 pb-10 grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-8 border-t border-border pt-8">
            <SignatureBlock
              label="Service Provider"
              name={toText((agreement.signatures as Record<string, Record<string, unknown>> | undefined)?.provider?.signer_name) || providerName}
              date={toText((agreement.signatures as Record<string, Record<string, unknown>> | undefined)?.provider?.signed_date)}
            />
            <SignatureBlock
              label="Client"
              name={toText((agreement.signatures as Record<string, Record<string, unknown>> | undefined)?.client?.signer_name) || clientName}
              date={toText((agreement.signatures as Record<string, Record<string, unknown>> | undefined)?.client?.signed_date)}
            />
          </section>

          {/* Branded footer */}
          <footer className="px-8 md:px-10 py-6 border-t border-border text-center text-xs text-muted-foreground space-y-1">
            <div className="flex items-center justify-center gap-2">
              <SiteLogo variant="light" className="h-5 w-auto opacity-80" />
              <span className="font-semibold text-foreground">Dynime Inc.</span>
            </div>
            <p>
              Questions? Email{" "}
              <a className="text-primary hover:underline" href="mailto:support@dynime.com">support@dynime.com</a>
              {" · "}Reference{" "}
              <span className="font-mono">{data.invoice_number || data.id.slice(0, 8).toUpperCase()}</span>
            </p>
            <p className="text-[10px] text-muted-foreground/70">dynime.com</p>
          </footer>
        </article>
      </div>

      <style>{`
        @page { size: auto; margin: 0mm; }
        @media print {
          body * { visibility: visible !important; }
          header[role="banner"], nav, .print\\:hidden { display: none !important; }
          html, body { background: #ffffff !important; color: #0a0a14 !important; }
          body { padding: 15mm !important; }
          main, .floating-header-main { padding-top: 0 !important; }
          article { background: #ffffff !important; color: #0a0a14 !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
        }
      `}</style>
    </Layout>
  );
};

const Clause = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
  <div>
    <h2 className="font-semibold text-base mb-1">{n}. {title}</h2>
    <div className="text-muted-foreground">{children}</div>
  </div>
);

const SignatureBlock = ({ label, name, date }: { label: string; name: string; date?: string }) => {
  const dateLabel = date
    ? new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "";
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-8">{label}</p>
      <div className="border-t border-foreground/40 pt-2 text-sm">
        <p className="font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">{dateLabel || "Signature & Date"}</p>
      </div>
    </div>
  );
};

export default Agreement;

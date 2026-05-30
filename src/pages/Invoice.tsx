import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import OrderMilestones from "@/components/orders/OrderMilestones";
import { useParams, Link, useLocation, useSearchParams } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Download, Printer, ArrowLeft, CheckCircle2, Clock, XCircle,
  Mail, MapPin, Building2, Phone, Globe, Copy, Check, Share2, FileText, UserRound,
  type LucideIcon,
} from "lucide-react";
import SiteLogo from "@/components/shared/SiteLogo";
import { useSEO } from "@/hooks/use-seo";
import BookingStatusCard from "@/components/orders/BookingStatusCard";
import PayInvoicePanel from "@/components/invoice/PayInvoicePanel";
import InvoiceCurrencyConverter from "@/components/invoice/InvoiceCurrencyConverter";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface InvoiceData {
  id: string;
  invoice_number: string | null;
  status: string;
  total: number;
  subtotal: number | null;
  discount_amount: number;
  currency: string | null;
  items: Array<{ id: string; name: string; price: number; quantity: number; description?: string }>;
  service_brief: Record<string, unknown> | null;
  billing_address: Record<string, unknown> | null;
  customer_name: string | null;
  customer_email: string;
  coupon_code: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  payment_gateway?: string | null;
  stripe_session_id?: string | null;
  tax_amount?: number | null;
  tax_percent?: number | null;
  tax_mode?: string | null;
  tax_label?: string | null;
}

const GATEWAY_LABELS: Record<string, string> = {
  stripe: "Credit / Debit Card (Stripe)",
  sslcommerz: "SSLCommerz",
  dodopayment: "DodoPayment",
  bkash: "bKash",
  bank_transfer: "Bank Transfer",
};

const CANONICAL_HOST = "https://dynime.com";

const STATUS_META: Record<string, { label: string; tone: string; ribbon: string; icon: LucideIcon }> = {
  paid:       { label: "Paid",       tone: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30", ribbon: "bg-emerald-500", icon: CheckCircle2 },
  confirmed:  { label: "Confirmed",  tone: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30", ribbon: "bg-emerald-500", icon: CheckCircle2 },
  completed:  { label: "Completed",  tone: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30", ribbon: "bg-emerald-500", icon: CheckCircle2 },
  delivered:  { label: "Delivered",  tone: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30", ribbon: "bg-emerald-500", icon: CheckCircle2 },
  pending:    { label: "Pending",    tone: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",    ribbon: "bg-yellow-500",  icon: Clock },
  processing: { label: "Processing", tone: "bg-blue-500/15 text-blue-700 border-blue-500/30",         ribbon: "bg-blue-500",    icon: Clock },
  in_progress:{ label: "In progress",tone: "bg-blue-500/15 text-blue-700 border-blue-500/30",         ribbon: "bg-blue-500",    icon: Clock },
  failed:     { label: "Failed",     tone: "bg-destructive/15 text-destructive border-destructive/30", ribbon: "bg-destructive", icon: XCircle },
  cancelled:  { label: "Cancelled",  tone: "bg-muted text-muted-foreground border-border",            ribbon: "bg-muted-foreground", icon: XCircle },
  refunded:   { label: "Refunded",   tone: "bg-muted text-muted-foreground border-border",            ribbon: "bg-muted-foreground", icon: XCircle },
};

const isPaid = (status: string) => ["paid", "confirmed", "completed", "delivered"].includes(status);
const toText = (value: unknown) => (typeof value === "string" || typeof value === "number" ? String(value) : "");

const Invoice = () => {
  const { id: routeInvoiceParam, "*": splatInvoiceParam } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const autoPrint = searchParams.get("print") === "1";
  const [data, setData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useSEO({
    title: data?.invoice_number ? `Invoice ${data.invoice_number} | Dynime` : "Invoice | Dynime",
    description: "Your Dynime order invoice.",
  });

  const invoiceParam = useMemo(() => {
    const rawRef = routeInvoiceParam || splatInvoiceParam || location.pathname.match(/^\/(?:invoice|i)\/(.+)$/)?.[1];
    if (!rawRef) return undefined;
    return decodeURIComponent(rawRef.replace(/\/$/, ""));
  }, [routeInvoiceParam, splatInvoiceParam, location.pathname]);

  const fetchInvoice = useCallback(async (opts?: { silent?: boolean }) => {
    if (!invoiceParam) return;
    if (!opts?.silent) setLoading(true);
    try {
      let row: InvoiceData | null = null;
      const { data: r1 } = await supabase.rpc("get_invoice_by_number", { _invoice: invoiceParam });
      if (r1 && Array.isArray(r1) && r1.length) row = r1[0] as unknown as InvoiceData;
      if (!row) {
        const { data: r2 } = await supabase.from("orders").select("*").eq("id", invoiceParam).maybeSingle();
        if (r2) row = r2 as unknown as InvoiceData;
      }
      if (!row) { setError("Invoice not found"); return; }
      setError(null);
      setData((prev) => {
        // avoid unnecessary state updates if nothing changed
        if (prev && prev.status === row!.status && prev.updated_at === row!.updated_at && prev.payment_gateway === row!.payment_gateway) {
          return prev;
        }
        return row!;
      });
    } catch (e: unknown) {
      if (!opts?.silent) setError(e instanceof Error ? e.message : "Failed to load invoice");
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [invoiceParam]);

  useEffect(() => { fetchInvoice(); }, [fetchInvoice]);

  // Realtime + polling: keep status fresh so the Pay button unlocks
  // as soon as a failed/cancelled checkout returns the invoice to "pending".
  const orderId = data?.id;
  const status = data?.status;
  const needsLiveUpdates = !!status && !["paid", "confirmed", "completed", "delivered", "refunded", "cancelled"].includes(status);
  const pollRef = useRef<number | null>(null);
  useEffect(() => {
    if (!orderId) return;
    const channel = supabase
      .channel(`invoice-${orderId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        () => { fetchInvoice({ silent: true }); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orderId, fetchInvoice]);

  useEffect(() => {
    if (!needsLiveUpdates) return;
    const tick = () => fetchInvoice({ silent: true });
    pollRef.current = window.setInterval(tick, 8000);
    const onVis = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", tick);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", tick);
    };
  }, [needsLiveUpdates, fetchInvoice]);

  // If the user came back from a cancelled checkout, refresh immediately.
  useEffect(() => {
    const p = searchParams.get("payment");
    if (p === "cancelled" || p === "success") fetchInvoice({ silent: true });
  }, [searchParams, fetchInvoice]);

  useEffect(() => {
    if (!data) return;
    const ref = (data as any).invoice_number || data.id;
    const prev = document.title;
    document.title = `Invoice ${ref} — Dynime`;
    return () => { document.title = prev; };
  }, [data]);

  useEffect(() => {
    if (!autoPrint || loading || !data) return;
    const t = setTimeout(() => window.print(), 500);
    return () => clearTimeout(t);
  }, [autoPrint, loading, data]);

  const publicUrl = useMemo(() => {
    if (!data) return "";
    const ref = data.invoice_number || data.id;
    return `${CANONICAL_HOST}/i/${ref}`;
  }, [data]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success("Public link copied");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy");
    }
  };

  const share = async () => {
    if ("share" in navigator && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: `Invoice ${data?.invoice_number}`, url: publicUrl });
        return;
      } catch { /* cancelled */ }
    }
    copyLink();
  };

  if (loading) {
    return (
      <Layout>
        <div className="container-custom py-20 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
        </div>
      </Layout>
    );
  }
  if (error || !data) {
    return (
      <Layout>
        <div className="container-custom py-20 text-center">
          <h1 className="font-heading text-2xl font-bold mb-2">Invoice not found</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button asChild variant="hero"><Link to="/">Go home</Link></Button>
        </div>
      </Layout>
    );
  }

  const meta = STATUS_META[data.status] || STATUS_META.pending;
  const StatusIcon = meta.icon;
  const subtotal = data.subtotal ?? data.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const currency = (data.currency || "USD").toUpperCase();
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
  const addr = data.billing_address || {};
  const brief = data.service_brief || {};
  const taxId = toText(addr.tax_id);
  const company = toText(addr.company);
  const phone = toText(addr.phone);
  const line1 = toText(addr.line1);
  const line2 = toText(addr.line2);
  const city = toText(addr.city);
  const state = toText(addr.state);
  const postalCode = toText(addr.postal_code);
  const country = toText(addr.country);
  const paid = isPaid(data.status);
  const dueDate = new Date(new Date(data.created_at).getTime() + 14 * 86400000);

  // Optional per-invoice issuer override — when an admin issues a manual
  // invoice under a specific employee's name (rather than the company), the
  // "From" block and header swap out the Dynime branding for that person.
  const issuerRaw = (brief as Record<string, unknown>).issuer;
  const issuer = issuerRaw && typeof issuerRaw === "object" ? (issuerRaw as Record<string, unknown>) : null;
  const issuerIsEmployee = issuer?.type === "employee" && toText(issuer.name).length > 0;
  const issuerName = issuerIsEmployee ? toText(issuer!.name) : "Dynime Inc.";
  const issuerRole = issuerIsEmployee ? "" : "Web · Marketing · Software · Consultancy";
  const issuerEmail = issuerIsEmployee ? toText(issuer!.email) : "support@dynime.com";
  const issuerPhone = issuerIsEmployee ? toText(issuer!.phone) : "";
  const issuerCountry = issuerIsEmployee ? toText(issuer!.country) : "";

  const agreementRaw = (brief as Record<string, unknown>).agreement;
  const agreementMeta = agreementRaw && typeof agreementRaw === "object" ? (agreementRaw as Record<string, unknown>) : null;
  const hasAgreement = !!agreementMeta && agreementMeta.include !== false;
  const agreementRef = data.invoice_number || data.id;
  return (
    <Layout>
      {/* Toolbar */}
      <div className="container-custom pt-8 pb-4 print:hidden flex items-center justify-between gap-3 flex-wrap">
        <Button asChild variant="ghost" size="sm">
          <Link to={`/account/orders?highlight=${data.id}#order-${data.id}`}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to orders
          </Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button onClick={share} variant="outline" size="sm" className="gap-1.5">
            <Share2 className="w-4 h-4" /> Share
          </Button>
          <Button onClick={copyLink} variant="outline" size="sm" className="gap-1.5">
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied" : "Copy link"}
          </Button>
          {hasAgreement && (
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link to={`/agreement/${encodeURIComponent(agreementRef)}`}>
                <FileText className="w-4 h-4" /> View agreement
              </Link>
            </Button>
          )}
          <Button onClick={() => window.print()} variant="outline" size="sm" className="gap-1.5">
            <Printer className="w-4 h-4" /> Print
          </Button>
          <Button onClick={() => window.print()} variant="hero" size="sm" className="gap-1.5">
            <Download className="w-4 h-4" /> Save PDF
          </Button>
        </div>
      </div>

      <section className="container-custom pb-16 print:pb-0">
        <div className="mx-auto max-w-4xl bg-white dark:bg-card border border-border rounded-2xl shadow-lg print:shadow-none print:border-0 overflow-hidden relative print:rounded-none">
          {/* Top accent ribbon */}
          <div className={cn("h-1.5 w-full", meta.ribbon)} />

          {/* PAID stamp watermark */}
          {paid && (
            <div className="absolute top-32 right-12 print:right-24 -rotate-[18deg] pointer-events-none opacity-[0.08] select-none print:opacity-[0.12]">
              <div className="border-[6px] border-emerald-600 text-emerald-700 font-heading text-6xl md:text-7xl font-black tracking-wider px-6 py-2 rounded-lg">
                PAID
              </div>
            </div>
          )}

          {/* Header */}
          <div className="p-8 md:p-10 flex flex-wrap items-start justify-between gap-6 relative">
            <div>
              <h1 className="font-heading text-4xl font-bold mb-1">Invoice</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="outline" className={cn("gap-1 px-2.5 py-1 text-xs font-semibold", meta.tone)}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  Payment {meta.label}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {paid
                    ? `Paid on ${new Date(data.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                    : data.status === "failed" || data.status === "cancelled"
                    ? `Updated ${new Date(data.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                    : `Due ${dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                </span>
              </div>
            </div>
            <div className="text-right">
              {issuerIsEmployee ? (
                <div className="flex items-center justify-end gap-2 mb-2">
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                    {issuerName.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold leading-tight">{issuerName}</p>
                  </div>
                </div>
              ) : (
                <SiteLogo variant="light" className="h-9 w-auto ml-auto mb-2" />
              )}
              <p className="text-xs text-muted-foreground">{issuerName}</p>
              <p className="text-xs text-muted-foreground">{issuerIsEmployee ? (issuerEmail || issuerCountry || "") : "dynime.com"}</p>
            </div>
          </div>

          {/* Meta grid */}
          <div className="px-8 md:px-10 pb-6 grid sm:grid-cols-2 gap-x-10 gap-y-2 text-sm relative">
            <Row label="Invoice number" value={<span className="font-mono">{data.invoice_number || data.id.slice(0, 8).toUpperCase()}</span>} />
            <Row label="Currency" value={currency} />
            <Row label="Date of issue" value={new Date(data.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} />
            <Row label={paid ? "Date paid" : "Date due"} value={(paid ? new Date(data.updated_at) : dueDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} />
            {data.coupon_code && <Row label="Coupon" value={<span className="font-mono">{data.coupon_code}</span>} />}
            {taxId && <Row label="Tax ID" value={taxId} />}
            {data.payment_gateway && <Row label="Payment method" value={GATEWAY_LABELS[data.payment_gateway] || data.payment_gateway} />}
            {data.stripe_session_id && <Row label="Payment reference" value={<span className="font-mono text-xs break-all">{data.stripe_session_id}</span>} />}
          </div>

          {/* From / Bill to */}
          <div className="px-8 md:px-10 py-6 grid md:grid-cols-2 gap-8 border-t border-border relative">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1">
                {issuerIsEmployee ? <UserRound className="w-3 h-3" /> : <Building2 className="w-3 h-3" />} From
              </p>
              <p className="font-semibold">{issuerName}</p>
              {issuerRole && (
                <p className="text-sm text-muted-foreground">{issuerRole}</p>
              )}
              {issuerEmail && (
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                  <Mail className="w-3 h-3" /> {issuerEmail}
                </p>
              )}
              {issuerIsEmployee ? (
                <>
                  {issuerPhone && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Phone className="w-3 h-3" /> {issuerPhone}
                    </p>
                  )}
                  {issuerCountry && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="w-3 h-3" /> {issuerCountry}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Globe className="w-3 h-3" /> dynime.com
                </p>
              )}
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1">
                <Mail className="w-3 h-3" /> Billed to
              </p>
              <p className="font-semibold">{data.customer_name || "Customer"}</p>
              {company && <p className="text-sm">{company}</p>}
              <p className="text-sm text-muted-foreground">{data.customer_email}</p>
              {phone && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <Phone className="w-3 h-3" /> {phone}
                </p>
              )}
              {(line1 || city || country) && (
                <p className="text-sm text-muted-foreground mt-1 flex items-start gap-1.5">
                  <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>
                    {[line1, line2].filter(Boolean).join(", ")}
                    {(line1 || line2) && <br />}
                    {[city, state, postalCode].filter(Boolean).join(", ")}
                    {(city || state || postalCode) && <br />}
                    {country}
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* Big amount due */}
          <div className="px-8 md:px-10 py-6 border-t border-border bg-gradient-to-br from-primary/5 to-transparent relative">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">
              {paid ? "Amount paid" : "Amount due"}
            </p>
            <div className="flex items-baseline gap-3 flex-wrap">
              <p className="font-heading text-4xl md:text-5xl font-bold tracking-tight">{fmt(data.total)}</p>
              {!paid && (
                <p className="text-sm text-muted-foreground">
                  due {dueDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              )}
            </div>
          </div>

          {/* Booking */}
          {brief.booking && (
            <div className="px-8 md:px-10 pt-6 print:px-0 relative">
              <BookingStatusCard orderId={data.id} serviceBrief={brief} />
            </div>
          )}

          {/* Items table */}
          <div className="px-8 md:px-10 py-8 relative">
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b-2 border-foreground/80 text-xs uppercase tracking-wider">
                    <th className="py-2 pr-2 font-semibold">Description</th>
                    <th className="py-2 px-2 font-semibold text-center w-16">Qty</th>
                    <th className="py-2 px-2 font-semibold text-right w-28">Unit price</th>
                    <th className="py-2 pl-2 font-semibold text-right w-28">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((it, i) => (
                    <tr key={i} className="border-b border-border/60 last:border-b-2 last:border-foreground/20">
                      <td className="py-4 pr-2 align-top">
                        <p className="font-medium">{it.name}</p>
                        {it.description && <p className="text-xs text-muted-foreground mt-0.5">{it.description}</p>}
                      </td>
                      <td className="py-4 px-2 align-top text-center tabular-nums">{it.quantity}</td>
                      <td className="py-4 px-2 align-top text-right tabular-nums">{fmt(it.price)}</td>
                      <td className="py-4 pl-2 align-top text-right tabular-nums font-medium">{fmt(it.price * it.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mt-6 flex justify-end">
              <div className="w-full sm:w-80 space-y-2 text-sm">
                <Total label="Subtotal" value={fmt(subtotal)} />
                {data.discount_amount > 0 && (
                  <Total label={`Discount${data.coupon_code ? ` (${data.coupon_code})` : ""}`} value={`−${fmt(data.discount_amount)}`} tone="text-emerald-600" />
                )}
                {data.tax_amount && data.tax_amount > 0 ? (
                  data.tax_mode === "inclusive" ? (
                    <>
                      <Total label={`Net (excl. ${data.tax_label || "VAT"})`} value={fmt(subtotal - data.discount_amount - (data.tax_amount || 0))} muted />
                      <Total label={`${data.tax_label || "VAT"} (${data.tax_percent}%) — included`} value={fmt(data.tax_amount)} muted />
                    </>
                  ) : (
                    <>
                      <Total label="Total excluding tax" value={fmt(subtotal - data.discount_amount)} muted />
                      <Total label={`${data.tax_label || "VAT"} (${data.tax_percent}%)`} value={`+${fmt(data.tax_amount)}`} />
                    </>
                  )
                ) : (
                  <>
                    <Total label="Total excluding tax" value={fmt(subtotal - data.discount_amount)} muted />
                    <Total label="Tax" value={fmt(0)} muted />
                  </>
                )}
                <div className="border-t-2 border-foreground/80 pt-2 mt-2">
                  <Total label="Total" value={fmt(data.total)} bold />
                </div>
                <div className={cn("rounded-lg px-3 py-2.5 mt-2 flex items-center justify-between font-semibold", paid ? "bg-emerald-500/10 text-emerald-700" : "bg-foreground text-background")}>
                  <span className="text-sm uppercase tracking-wider">{paid ? "Amount paid" : "Amount due"}</span>
                  <span className="text-base tabular-nums">{fmt(paid ? data.total : data.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Live currency converter (screen only) */}
          <InvoiceCurrencyConverter amount={data.total} currency={currency} />

          {/* Pay now (only when unpaid) */}
          {data.status !== "cancelled" && data.status !== "refunded" && (
            <PayInvoicePanel
              orderId={data.id}
              invoiceNumber={data.invoice_number}
              customerEmail={data.customer_email}
              amount={data.total}
              currency={currency}
              defaultGateway={data.payment_gateway || null}
              status={data.status}
            />
          )}

          {/* Brief / notes */}
          {(Object.keys(brief).length > 0 || data.notes) && (
            <div className="px-8 md:px-10 py-6 border-t border-border bg-muted/20 relative">
              {Array.isArray((brief as any).included_services) && (brief as any).included_services.length > 0 && (
                <div className="mb-5">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> What's included
                  </p>
                  <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                    {((brief as any).included_services as string[]).map((s, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {Object.keys(brief).length > 0 && (
                <div className="mb-4">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1">
                    <FileText className="w-3 h-3" /> Project brief
                  </p>
                  <dl className="grid sm:grid-cols-2 gap-3 text-sm">
                    {Object.entries(brief).filter(([k, v]) => v && k !== "category" && k !== "primary_service" && k !== "booking" && k !== "included_services" && k !== "manual_invoice" && typeof v !== "object").map(([k, v]) => (
                      <div key={k}>
                        <dt className="text-xs text-muted-foreground capitalize">{k.replace(/_/g, " ")}</dt>
                        <dd className="font-medium">{String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
              {data.notes && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Notes</p>
                  <p className="text-sm whitespace-pre-line">{data.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Branded footer */}
          <div className="px-8 md:px-10 py-6 border-t border-border text-center text-xs text-muted-foreground space-y-1 relative">
            <div className="flex items-center justify-center gap-2">
              <SiteLogo variant="light" className="h-5 w-auto opacity-80" />
              <span className="font-semibold text-foreground">Dynime Inc.</span>
            </div>
            <p>Thank you for choosing <span className="font-semibold text-foreground">Dynime</span>.</p>
            <p>Questions? Email <a className="text-primary hover:underline" href="mailto:support@dynime.com">support@dynime.com</a> · Reference #{data.invoice_number || data.id.slice(0, 8).toUpperCase()}</p>
            <p className="text-[10px] text-muted-foreground/70">dynime.com</p>
          </div>
        </div>

        {/* Public link footer (screen only) */}
        <div className="mx-auto max-w-4xl mt-4 text-center print:hidden">
          <p className="text-xs text-muted-foreground">
            Public link: <a className="text-primary hover:underline font-mono" href={publicUrl}>{publicUrl}</a>
          </p>
        </div>
      </section>

      <section className="container-custom pb-16 print:hidden">
        <OrderMilestones orderId={data.id} />
      </section>

      <style>{`
        @page { margin: 12mm; }
        @media print {
          header, footer, nav, .print\\:hidden { display: none !important; }
          html, body { background: #ffffff !important; color: #0a0a14 !important; }
          section { background: #ffffff !important; color: #0a0a14 !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
        }
      `}</style>
    </Layout>
  );
};

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between gap-4">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-right">{value}</span>
  </div>
);

const Total = ({ label, value, bold, muted, tone }: { label: string; value: string; bold?: boolean; muted?: boolean; tone?: string }) => (
  <div className={cn("flex justify-between", bold && "text-base font-bold", muted && "text-muted-foreground", tone)}>
    <span>{label}</span>
    <span className="tabular-nums">{value}</span>
  </div>
);

export default Invoice;

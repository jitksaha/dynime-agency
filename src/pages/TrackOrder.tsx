import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Search, CheckCircle2, CreditCard, Inbox, Cog, PackageCheck,
  XCircle, FileText, Mail, Sparkles, ArrowRight, Clock, Download, Share2, Copy, Check, MessageCircle,
} from "lucide-react";
import { usePageSEO } from "@/hooks/use-page-seo";
import { cn } from "@/lib/utils";
import { apiGet } from "@/lib/api";

interface OrderRow {
  id: string;
  invoice_number: string | null;
  status: string;
  total: number;
  currency: string | null;
  items: Array<{ id: string; name: string; price: number; quantity: number }>;
  customer_name: string | null;
  customer_email: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

type StepKey = "placed" | "paid" | "processing" | "completed";

const STEPS: { key: StepKey; label: string; description: string; icon: any }[] = [
  { key: "placed",     label: "Order placed",   description: "We received your service request and brief.",   icon: CreditCard },
  { key: "paid",       label: "Payment received", description: "Payment confirmed — your order is in the queue.", icon: Inbox },
  { key: "processing", label: "In progress",    description: "Our team is actively working on your project.", icon: Cog },
  { key: "completed",  label: "Completed",      description: "Delivered! Check your inbox for final files.",   icon: PackageCheck },
];

const stepIndexFor = (status: string): number => {
  switch (status) {
    case "pending": return 0;
    case "paid":
    case "confirmed": return 1;
    case "processing":
    case "in_progress": return 2;
    case "completed":
    case "delivered": return 3;
    default: return -1;
  }
};

const statusTone = (status: string) => {
  if (status === "completed" || status === "delivered") return "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400";
  if (status === "paid" || status === "confirmed" || status === "processing" || status === "in_progress") return "bg-primary/15 text-primary border-primary/30";
  if (status === "failed" || status === "cancelled" || status === "refunded")
    return "bg-destructive/15 text-destructive border-destructive/30";
  return "bg-muted text-muted-foreground border-border";
};

const fmtMoney = (n: number, c?: string | null) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: (c || "USD").toUpperCase() }).format(Number(n || 0));

const fmtDate = (s: string) =>
  new Date(s).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

const ShareTrackingButton = ({ ref: orderRef, invoice, status }: { ref: string; invoice: string; status: string }) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/track/${encodeURIComponent(orderRef)}`;
  const message = `Hi! You can follow the status of my Dynime order (${invoice}, currently "${status}") here: ${url}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}`;

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy — please copy manually");
    }
  };

  const tryNativeShare = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: `Dynime order ${invoice}`, text: message, url });
        return true;
      } catch { /* user cancelled */ }
    }
    return false;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-8"
          onClick={async (e) => {
            if (await tryNativeShare()) { e.preventDefault(); return; }
          }}
        >
          <Share2 className="w-3.5 h-3.5" /> Share
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-primary" /> Share tracking link
          </DialogTitle>
          <DialogDescription>
            Anyone with this link can view the live status of order <span className="font-mono font-medium text-foreground">{invoice}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input readOnly value={url} className="font-mono text-xs h-10" onFocus={(e) => e.currentTarget.select()} />
            <Button onClick={() => copy(url)} className="h-10 shrink-0 gap-1.5">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" className="h-11 gap-1.5" asChild>
              <a href={`mailto:?subject=${encodeURIComponent(`Dynime order ${invoice}`)}&body=${encodeURIComponent(message)}`}>
                <Mail className="w-4 h-4" /> Email
              </a>
            </Button>
            <Button variant="outline" className="h-11 gap-1.5" asChild>
              <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </a>
            </Button>
            <Button variant="outline" className="h-11 gap-1.5" onClick={() => copy(message)}>
              <Copy className="w-4 h-4" /> Message
            </Button>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-4 flex items-center gap-4">
            <img src={qrUrl} alt="Tracking QR code" loading="lazy" decoding="async" width={88} height={88} className="rounded-lg bg-white p-1" />
            <div className="text-xs text-muted-foreground leading-relaxed">
              <div className="font-medium text-foreground mb-0.5">Scan to track</div>
              Show this QR code so anyone can open the live tracking page on their phone.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const TrackOrder = () => {
  const { ref } = useParams<{ ref?: string }>();
  const navigate = useNavigate();
  const [query, setQuery] = useState(ref || "");
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  usePageSEO("track-order");

  const fetchOrder = async (term: string) => {
    const value = term.trim();
    if (!value) return;
    setLoading(true); setError(null); setOrder(null);
    try {
      const row = await apiGet<OrderRow>(`/orders/public/track/${encodeURIComponent(value)}`);
      setOrder(row);
    } catch (e: any) {
      setError(e?.message || "We couldn't find an order matching that invoice, order ID, payment reference, or email.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ref) fetchOrder(ref);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);

  // Polling for live updates if status is not final
  useEffect(() => {
    if (!order?.id || isFailed || order.status === "completed" || order.status === "delivered") return;
    const interval = setInterval(async () => {
      try {
        const row = await apiGet<OrderRow>(`/orders/public/track/${encodeURIComponent(order.invoice_number || order.id)}`);
        setOrder(row);
      } catch (e) {
        // ignore background errors
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [order?.id, order?.status, isFailed]);

  const currentIndex = order ? stepIndexFor(order.status) : -1;
  const isFailed = order && (order.status === "failed" || order.status === "cancelled" || order.status === "refunded");
  const progressPct = useMemo(() => {
    if (!order) return 0;
    if (isFailed) return 0;
    return Math.max(0, Math.min(100, ((currentIndex) / (STEPS.length - 1)) * 100));
  }, [order, currentIndex, isFailed]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    navigate(`/track/${encodeURIComponent(query.trim())}`);
  };

  return (
    <Layout>
      <section className="container-custom py-10 md:py-16 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8 md:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
            <Sparkles className="w-3.5 h-3.5" /> Order tracking
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Track your service request
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
            Enter your <span className="font-medium text-foreground">invoice number</span>, <span className="font-medium text-foreground">order ID</span>, <span className="font-medium text-foreground">payment reference</span>, or <span className="font-medium text-foreground">email</span> to see where your project stands — in real time.
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Invoice no., order ID, payment reference or email"
              className="pl-10 h-12 rounded-xl"
            />
          </div>
          <Button type="submit" className="h-12 px-6 rounded-xl" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Track"}
          </Button>
        </form>

        {/* States */}
        {loading && (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground mt-3">Looking up your order…</p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <XCircle className="w-10 h-10 mx-auto text-destructive mb-3" />
            <h3 className="font-heading font-semibold text-lg mb-1">Order not found</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" asChild>
              <Link to="/contact">Contact support</Link>
            </Button>
          </div>
        )}

        {!loading && order && (
          <div className="space-y-6">
            {/* Summary card */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <div className="p-5 md:p-6 border-b border-border bg-gradient-to-br from-primary/5 to-transparent">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-xs text-muted-foreground">Invoice</div>
                    <div className="font-mono font-semibold text-lg">
                      {order.invoice_number || order.id.slice(0, 8).toUpperCase()}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> Placed {fmtDate(order.created_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={cn("border capitalize", statusTone(order.status))}>
                      {order.status}
                    </Badge>
                    <ShareTrackingButton
                      ref={order.invoice_number || order.id}
                      invoice={order.invoice_number || order.id.slice(0, 8).toUpperCase()}
                      status={order.status}
                    />
                  </div>
                </div>
              </div>

              {/* Stepper */}
              <div className="p-5 md:p-8">
                {isFailed ? (
                  <div className="text-center py-4">
                    <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
                      <XCircle className="w-8 h-8 text-destructive" />
                    </div>
                    <h3 className="font-heading font-semibold text-lg mb-1">
                      {order.status === "cancelled" ? "Order cancelled" : order.status === "refunded" ? "Order refunded" : "Payment failed"}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      No work has started. If this is unexpected, our team can help right away.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <Button asChild><Link to="/checkout">Retry checkout</Link></Button>
                      <Button asChild variant="outline"><Link to="/contact">Contact support</Link></Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Progress bar */}
                    <div className="relative h-2 rounded-full bg-muted overflow-hidden mb-8">
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/70 transition-all duration-700 rounded-full"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>

                    {/* Steps */}
                    <ol className="space-y-5">
                      {STEPS.map((step, i) => {
                        const Icon = step.icon;
                        const done = i < currentIndex;
                        const active = i === currentIndex;
                        return (
                          <li key={step.key} className="flex gap-4 items-start">
                            <div className={cn(
                              "shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                              done && "bg-primary border-primary text-primary-foreground",
                              active && "bg-primary/10 border-primary text-primary ring-4 ring-primary/15 animate-pulse",
                              !done && !active && "bg-muted border-border text-muted-foreground"
                            )}>
                              {done ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                            </div>
                            <div className="flex-1 pt-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className={cn(
                                  "font-semibold",
                                  (done || active) ? "text-foreground" : "text-muted-foreground"
                                )}>{step.label}</h4>
                                {active && <Badge variant="secondary" className="text-[10px] h-5">Current</Badge>}
                                {done && <Badge variant="outline" className="text-[10px] h-5 border-emerald-500/40 text-emerald-600">Done</Badge>}
                              </div>
                              <p className="text-sm text-muted-foreground mt-0.5">{step.description}</p>
                            </div>
                          </li>
                        );
                      })}
                    </ol>

                    <div className="mt-8 rounded-xl bg-muted/40 border border-border p-4 flex gap-3 items-start">
                      <Mail className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <div className="font-medium text-foreground">You'll get email updates</div>
                        <p className="text-muted-foreground text-xs mt-0.5">
                          We notify <span className="font-medium text-foreground">{order.customer_email}</span> at every stage. No need to refresh — this page also updates live.
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Order summary */}
            <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
              <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
                <h3 className="font-heading font-semibold">Order summary</h3>
                {order.invoice_number && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/invoice/${order.invoice_number}`} className="gap-1.5">
                        <FileText className="w-4 h-4" /> View
                      </Link>
                    </Button>
                    <Button size="sm" asChild>
                      <a href={`/invoice/${order.invoice_number}?print=1`} target="_blank" rel="noreferrer" className="gap-1.5">
                        <Download className="w-4 h-4" /> Download PDF
                      </a>
                    </Button>
                  </div>
                )}
              </div>
              <div className="divide-y divide-border">
                {(order.items || []).map((it) => (
                  <div key={it.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{it.name}</div>
                      <div className="text-xs text-muted-foreground">Qty {it.quantity}</div>
                    </div>
                    <div className="text-sm font-medium">{fmtMoney(it.price * it.quantity, order.currency)}</div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border mt-2 pt-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total paid</span>
                <span className="font-heading font-bold text-lg">{fmtMoney(order.total, order.currency)}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button variant="outline" asChild><Link to="/services" className="gap-1.5">Browse more services <ArrowRight className="w-4 h-4" /></Link></Button>
              <Button variant="ghost" asChild><Link to="/contact">Need help? Contact us</Link></Button>
            </div>
          </div>
        )}

        {!loading && !order && !error && !ref && (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
            <Inbox className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-heading font-semibold mb-1">Find your order</h3>
            <p className="text-sm text-muted-foreground">
              Search by invoice number, order ID, payment reference or the email you checked out with.
            </p>
          </div>
        )}
      </section>
    </Layout>
  );
};

export default TrackOrder;

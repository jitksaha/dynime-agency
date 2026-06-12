import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { db } from "@/integrations/db/client";
import { CheckCircle2, Download, FileText, Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { apiGet } from "@/lib/api";

interface Props {
  installment: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GATEWAY_LABELS: Record<string, string> = {
  stripe: "Credit / Debit Card (Stripe)",
  sslcommerz: "SSLCommerz",
  dodopayment: "DodoPayment",
  bkash: "bKash",
  bank_transfer: "Bank Transfer",
};

const fmt = (n: number, cur = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(Number(n) || 0);

const InstallmentReceiptDialog = ({ installment, open, onOpenChange }: Props) => {
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !installment) { setOrder(null); return; }
    const orderId = installment.paid_order_id || installment.last_attempt_order_id;
    if (!orderId) { setOrder(null); return; }
    setLoading(true);
    apiGet<any>(`/orders/${orderId}`)
      .then((data) => { setOrder(data); setLoading(false); })
      .catch(() => { setOrder(null); setLoading(false); });
  }, [open, installment]);

  if (!installment) return null;

  const ref = order?.invoice_number || order?.id || installment.id;
  const invoiceHref = order ? `/invoice/${order.invoice_number || order.id}` : null;
  const printHref = invoiceHref ? `${invoiceHref}?print=1` : null;
  const gateway = order?.payment_gateway ? (GATEWAY_LABELS[order.payment_gateway] || order.payment_gateway) : "—";

  const copyRef = async () => {
    try { await navigator.clipboard.writeText(String(ref)); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { toast.error("Couldn't copy"); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mb-2">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <DialogTitle className="text-center">Payment Receipt</DialogTitle>
          <DialogDescription className="text-center">
            Installment #{installment.sequence} paid successfully
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border bg-muted/30 p-4 space-y-2.5 text-sm">
          <Row label="Amount" value={<span className="text-base font-bold">{fmt(Number(installment.amount), order?.currency || "USD")}</span>} />
          <Row label="Status" value={<Badge className="bg-emerald-500 hover:bg-emerald-500">Paid</Badge>} />
          <Row label="Paid on" value={installment.paid_at ? new Date(installment.paid_at).toLocaleString() : "—"} />
          <Row label="Method" value={loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : gateway} />
          <Separator />
          <Row
            label="Reference"
            value={
              <button onClick={copyRef} className="inline-flex items-center gap-1.5 font-mono text-xs hover:text-primary">
                {String(ref).slice(0, 18)}{String(ref).length > 18 ? "…" : ""}
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              </button>
            }
          />
          {order?.customer_name && <Row label="Customer" value={order.customer_name} />}
          {order?.customer_email && <Row label="Email" value={<span className="truncate max-w-[180px]">{order.customer_email}</span>} />}
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          {invoiceHref ? (
            <>
              <Button asChild className="w-full">
                <Link to={invoiceHref}>
                  <FileText className="w-4 h-4 mr-1.5" /> View full invoice
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <a href={printHref!} target="_blank" rel="noreferrer">
                  <Download className="w-4 h-4 mr-1.5" /> Download / Print PDF
                </a>
              </Button>
            </>
          ) : (
            <p className="text-xs text-center text-muted-foreground">
              {loading ? "Loading invoice…" : "Invoice details are still syncing. Please check back shortly."}
            </p>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
    <span className="text-right font-medium">{value}</span>
  </div>
);

export default InstallmentReceiptDialog;

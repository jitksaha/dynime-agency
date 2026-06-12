import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { db } from "@/integrations/db/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, XCircle, Loader2, FileText, Download, Copy, Check, ArrowLeft, Clock } from "lucide-react";
import { toast } from "sonner";
import { usePageSEO } from "@/hooks/use-page-seo";

const GATEWAY_LABELS: Record<string, string> = {
  stripe: "Credit / Debit Card (Stripe)",
  sslcommerz: "SSLCommerz",
  dodopayment: "DodoPayment",
  bkash: "bKash",
  bank_transfer: "Bank Transfer",
};

const fmt = (n: number, cur = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(Number(n) || 0);

const FlexPayReceipt = () => {
  usePageSEO("flexpay");
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const cancelled = params.get("payment") === "cancelled";

  const [installment, setInstallment] = useState<any | null>(null);
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    if (!id) return;
    const { data: inst } = await db
      .from("flexpay_emi_installments")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    setInstallment(inst);
    const orderId = (inst as any)?.paid_order_id || (inst as any)?.last_attempt_order_id;
    if (orderId) {
      const { data: ord } = await db
        .from("orders")
        .select("id, invoice_number, total, currency, payment_gateway, customer_name, customer_email, created_at, status")
        .eq("id", orderId)
        .maybeSingle();
      setOrder(ord);
    } else {
      setOrder(null);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  // Auto-poll while processing to catch the webhook flipping to paid/failed.
  useEffect(() => {
    if (!installment) return;
    if (installment.status !== "processing") return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line
  }, [installment?.status, installment?.id]);

  const status = installment?.status as string | undefined;
  const isPaid = status === "paid";
  const isFailed = status === "failed";
  const isProcessing = status === "processing" || (!status && !loading);

  const txnId = order?.invoice_number || order?.id || installment?.paid_order_id || installment?.last_attempt_order_id || installment?.id;
  const gateway = order?.payment_gateway ? (GATEWAY_LABELS[order.payment_gateway] || order.payment_gateway) : "—";
  const currency = order?.currency || "USD";
  const invoiceHref = order ? `/invoice/${order.invoice_number || order.id}` : null;

  const copyTxn = async () => {
    try {
      await navigator.clipboard.writeText(String(txnId));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { toast.error("Couldn't copy"); }
  };

  return (
    <main className="container max-w-2xl py-10 px-4">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/account/flexpay"><ArrowLeft className="w-4 h-4 mr-1.5" /> Back to FlexPay</Link>
      </Button>

      <Card className="overflow-hidden">
        <CardHeader className="text-center pb-4">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-3 ${
            isPaid ? "bg-emerald-500/15 text-emerald-600" :
            isFailed || cancelled ? "bg-red-500/15 text-red-600" :
            "bg-amber-500/15 text-amber-600"
          }`}>
            {loading ? <Loader2 className="w-7 h-7 animate-spin" /> :
              isPaid ? <CheckCircle2 className="w-8 h-8" /> :
              isFailed || cancelled ? <XCircle className="w-8 h-8" /> :
              <Clock className="w-8 h-8" />}
          </div>
          <CardTitle className="text-2xl">
            {loading ? "Loading receipt…" :
              isPaid ? "Payment successful" :
              isFailed ? "Payment failed" :
              cancelled ? "Payment cancelled" :
              "Payment processing"}
          </CardTitle>
          <CardDescription>
            {installment ? <>FlexPay installment #{installment.sequence}</> : "FlexPay installment"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {!loading && !installment ? (
            <p className="text-center text-sm text-muted-foreground">
              We couldn't find this installment. It may have been removed or you don't have access.
            </p>
          ) : (
            <>
              <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                <Row
                  label="Amount"
                  value={<span className="text-lg font-bold">{fmt(Number(installment?.amount || 0), currency)}</span>}
                />
                <Row
                  label="Status"
                  value={
                    isPaid ? <Badge className="bg-emerald-500 hover:bg-emerald-500">Succeeded</Badge> :
                    isFailed ? <Badge variant="destructive">Failed</Badge> :
                    cancelled ? <Badge variant="secondary">Cancelled</Badge> :
                    <Badge className="bg-amber-500 hover:bg-amber-500">Processing</Badge>
                  }
                />
                <Row label="Gateway" value={gateway} />
                <Row
                  label="Transaction ID"
                  value={
                    <button onClick={copyTxn} className="inline-flex items-center gap-1.5 font-mono text-xs hover:text-primary">
                      {String(txnId).slice(0, 22)}{String(txnId).length > 22 ? "…" : ""}
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  }
                />
                <Separator />
                <Row
                  label={isPaid ? "Paid on" : "Due date"}
                  value={
                    isPaid && installment?.paid_at
                      ? new Date(installment.paid_at).toLocaleString()
                      : installment?.due_date
                        ? new Date(installment.due_date).toLocaleDateString()
                        : "—"
                  }
                />
                {installment?.late_fee > 0 && (
                  <Row label="Late fee" value={fmt(Number(installment.late_fee), currency)} />
                )}
                {isFailed && installment?.failure_reason && (
                  <Row label="Reason" value={<span className="text-red-600 text-xs">{installment.failure_reason}</span>} />
                )}
                {order?.customer_name && <Row label="Customer" value={order.customer_name} />}
                {order?.customer_email && (
                  <Row label="Email" value={<span className="truncate max-w-[220px]">{order.customer_email}</span>} />
                )}
              </div>

              {isProcessing && !cancelled && (
                <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Waiting for the gateway to confirm your payment. This page updates automatically.
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                {invoiceHref && (
                  <>
                    <Button asChild className="flex-1">
                      <Link to={invoiceHref}><FileText className="w-4 h-4 mr-1.5" /> View invoice</Link>
                    </Button>
                    <Button asChild variant="outline" className="flex-1">
                      <a href={`${invoiceHref}?print=1`} target="_blank" rel="noreferrer">
                        <Download className="w-4 h-4 mr-1.5" /> Download PDF
                      </a>
                    </Button>
                  </>
                )}
                {(isFailed || cancelled) && (
                  <Button asChild variant="default" className="flex-1">
                    <Link to="/account/flexpay">Try paying again</Link>
                  </Button>
                )}
                {isPaid && !invoiceHref && (
                  <Button asChild variant="outline" className="flex-1">
                    <Link to="/account/flexpay">Back to schedule</Link>
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
    <span className="text-right font-medium text-sm">{value}</span>
  </div>
);

export default FlexPayReceipt;

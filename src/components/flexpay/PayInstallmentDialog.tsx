import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "@/contexts/LocationContext";
import { useGeoLocation } from "@/hooks/use-geo-location";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";


type Installment = {
  id: string;
  plan_id: string;
  sequence: number;
  amount: number;
  due_date: string;
};

type Props = {
  installment: Installment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type GatewayCap = {
  label: string;
  desc: string;
  /** Min/max amount in USD (the installment is denominated in USD). */
  minUsd?: number;
  maxUsd?: number;
  /** ISO country codes the gateway accepts. Empty = global. */
  countries?: string[];
  /** Display currencies the gateway typically settles in. Empty = any. */
  currencies?: string[];
};

// Region/amount capabilities for each gateway. Tuned to match the live
// providers we integrate with (Stripe global, SSLCommerz/bKash BD-only, etc.).
const GATEWAY_CAPS: Record<string, GatewayCap> = {
  stripe: {
    label: "Stripe",
    desc: "Global cards in USD.",
    minUsd: 0.5,
    maxUsd: 999999,
  },
  dodopayment: {
    label: "DodoPayment",
    desc: "Cards, Apple & Google Pay.",
    minUsd: 1,
    maxUsd: 10000,
  },
  sslcommerz: {
    label: "SSLCommerz",
    desc: "BD cards & mobile banking.",
    minUsd: 1,
    maxUsd: 5000,
    countries: ["BD"],
    currencies: ["BDT", "USD"],
  },
  bkash: {
    label: "bKash",
    desc: "Mobile wallet (auto BDT).",
    minUsd: 0.5,
    maxUsd: 2500,
    countries: ["BD"],
    currencies: ["BDT", "USD"],
  },
  bank_transfer: {
    label: "Bank Transfer",
    desc: "Direct deposit, manual.",
    minUsd: 1,
  },
};

const PayInstallmentDialog = ({ installment, open, onOpenChange }: Props) => {
  const { user } = useAuth();
  const { currency } = useLocation();
  const { geo } = useGeoLocation();
  const [gateway, setGateway] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setGateway("");
  }, [open, installment?.id]);

  const amount = Number(installment?.amount || 0);
  const country = (geo?.countryCode || "").toUpperCase();

  const { data: enabledGateways } = useQuery({
    queryKey: ["installment-pay-gateways"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("key, value");
      const map: Record<string, string> = {};
      (data || []).forEach((r: any) => {
        const v = typeof r.value === "string" ? r.value.replace(/^"|"$/g, "") : String(r.value);
        map[r.key] = v;
      });
      // NOTE: FlexPay is intentionally excluded — an installment cannot be
      // repaid using FlexPay credit itself.
      const ids = ["stripe", "dodopayment", "sslcommerz", "bkash", "bank_transfer"];
      return ids.filter((id) => map[`${id}_enabled`] === "true");
    },
  });

  const available = useMemo(() => {
    if (!enabledGateways) return [];
    return enabledGateways
      .map((id) => ({ id, cap: GATEWAY_CAPS[id] }))
      .filter(({ cap }) => {
        if (!cap) return false;
        if (cap.minUsd != null && amount < cap.minUsd) return false;
        if (cap.maxUsd != null && amount > cap.maxUsd) return false;
        if (cap.countries?.length && country && !cap.countries.includes(country)) return false;
        if (cap.currencies?.length && !cap.currencies.includes(currency)) {
          if (currency !== "USD" && country && !cap.countries?.includes(country)) return false;
        }
        return true;
      })
      .map(({ id, cap }) => ({ id, label: cap.label, desc: cap.desc }));
  }, [enabledGateways, amount, country, currency]);

  useEffect(() => {
    if (available.length && !available.find((g) => g.id === gateway)) {
      setGateway(available[0].id);
    }
  }, [available, gateway]);

  // Send the user straight to the real gateway checkout. process-payment
  // returns a hosted checkout URL (Stripe/Dodo/SSLCommerz/bKash) or the
  // bank-transfer flow — exactly the same path our global checkout uses.
  const runPayment = async () => {
    if (!installment || !gateway || !user) {
      toast.error("Pick a payment method to continue.");
      return;
    }
    setSubmitting(true);
    try {
      const r = await apiPost<any>("/orders/public/process-payment", {
        gateway,
        customer_name: user.user_metadata?.full_name || user.email || "",
        customer_email: user.email,
        items: [{
          id: `flexpay-installment-${installment.id}`,
          name: `FlexPay installment #${installment.sequence}`,
          price: amount,
          quantity: 1,
        }],
        total: amount,
        currency: "USD",
        service_brief: {
          flexpay_installment_id: installment.id,
          flexpay_plan_id: installment.plan_id,
          flexpay_repayment: true,
          note: `FlexPay installment #${installment.sequence} repayment`,
        },
        success_url: `${window.location.origin}/account/flexpay/receipt/${installment.id}?payment=success`,
        cancel_url: `${window.location.origin}/account/flexpay/receipt/${installment.id}?payment=cancelled`,
      });
      const url = r?.url || r?.checkout_url;
      try {
        await supabase.rpc("flexpay_mark_installment_processing", {
          _installment_id: installment.id,
          _order_id: r?.order_id ?? null,
        });
      } catch (_) { /* non-fatal */ }
      if (r?.gateway === "bank_transfer") {
        toast.success("Order placed — complete the bank transfer using the on-screen details.");
        onOpenChange(false);
        return;
      }
      if (url) { window.location.assign(url); return; }
      toast.success("Payment initiated");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Could not start payment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pay installment #{installment?.sequence}</DialogTitle>
          <DialogDescription>
            Repay ${amount.toFixed(2)} — choose a payment method. You'll be redirected to the secure gateway to complete payment. FlexPay credit cannot be used to repay itself.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 mt-2">
          {!available.length ? (
            <p className="text-sm text-muted-foreground">
              No payment gateway is available for this amount {country ? `in ${country}` : ""}. Please contact support.
            </p>
          ) : available.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setGateway(g.id)}
              className={`w-full text-left rounded-lg border p-3 transition ${
                gateway === g.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
              }`}
            >
              <div className="font-semibold text-sm">{g.label}</div>
              <div className="text-xs text-muted-foreground">{g.desc}</div>
            </button>
          ))}
        </div>

        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-2">
          <ShieldCheck className="w-3 h-3" /> Payment is processed on the gateway's secure hosted page.
        </p>

        <Button onClick={runPayment} disabled={submitting || !gateway || !installment} className="w-full mt-1">
          {submitting
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redirecting…</>
            : `Pay $${amount.toFixed(2)}`}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default PayInstallmentDialog;

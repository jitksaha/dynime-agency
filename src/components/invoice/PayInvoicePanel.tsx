import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CreditCard, Wallet, Banknote, CheckCircle2, Clock, ArrowRightLeft, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/integrations/db/client";
import BankDepositDialog, { type BankAccount } from "@/components/checkout/BankDepositDialog";
import { useExchangeRates } from "@/hooks/use-exchange-rates";
import type { CurrencyCode } from "@/lib/currency";
import { apiGet, apiPost } from "@/lib/api";

const GATEWAYS: { id: string; label: string }[] = [
  { id: "stripe", label: "Credit / Debit Card (Stripe)" },
  { id: "stripe_onsite", label: "Credit Card (On-Site)" },
  { id: "keeal", label: "Keeal" },
  { id: "sslcommerz", label: "SSLCommerz" },
  { id: "dodopayment", label: "DodoPayment" },
  { id: "bkash", label: "bKash" },
  { id: "bank_transfer", label: "Bank Transfer" },
];

// Currency mapping per gateway:
//   • Stripe / DodoPayment / Bank Transfer → global, settle in USD (multi-currency cards welcome)
//   • SSLCommerz / bKash → Bangladesh-only, settle in BDT
// `INVOICE` means: keep the invoice's own currency (manual settlement).
const GATEWAY_SETTLE_CURRENCY: Record<string, CurrencyCode | "INVOICE"> = {
  stripe: "USD",
  stripe_onsite: "USD",
  keeal: "USD",
  dodopayment: "USD",
  bank_transfer: "USD",
  sslcommerz: "BDT",
  bkash: "BDT",
};

// What the customer's card/wallet will actually be billed in (display only).
const GATEWAY_DISPLAY_CURRENCY: Record<string, CurrencyCode | "INVOICE"> = {
  stripe: "USD",
  stripe_onsite: "USD",
  keeal: "USD",
  dodopayment: "USD",
  bank_transfer: "USD",
  sslcommerz: "BDT",
  bkash: "BDT",
};

interface Props {
  orderId: string;
  invoiceNumber: string | null;
  customerEmail: string;
  amount: number;
  currency: string;
  defaultGateway?: string | null;
  status?: string;
}

const LOCKED_STATUSES = new Set([
  "paid", "confirmed", "completed", "delivered",
  "processing", "pending_verification", "awaiting_confirmation",
]);

const startedKey = (orderId: string) => `invoice:checkout-started:${orderId}`;
const LAST_GATEWAY_KEY = "invoice:last-gateway";

const readLastGateway = (): string => {
  try { return localStorage.getItem(LAST_GATEWAY_KEY) || ""; } catch { return ""; }
};
const writeLastGateway = (g: string) => {
  try { localStorage.setItem(LAST_GATEWAY_KEY, g); } catch { /* ignore */ }
};

const formatMoney = (value: number, currency: string) => {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
};

export default function PayInvoicePanel({
  orderId, invoiceNumber, customerEmail, amount, currency, defaultGateway, status,
}: Props) {
  const [enabled, setEnabled] = useState<string[]>([]);
  const [loadingGateways, setLoadingGateways] = useState(true);
  const [gateway, setGateway] = useState<string>(defaultGateway || readLastGateway() || "");
  const [submitting, setSubmitting] = useState(false);
  const [checkoutStarted, setCheckoutStarted] = useState<boolean>(() => {
    try { return sessionStorage.getItem(startedKey(orderId)) === "1"; } catch { return false; }
  });
  const [bank, setBank] = useState<{
    open: boolean; accounts: BankAccount[]; instructions?: string; displayName?: string; orderNumber?: string;
  } | null>(null);

  const [stripeInstance, setStripeInstance] = useState<any>(null);
  const [cardElementInstance, setCardElementInstance] = useState<any>(null);
  const [cardholderName, setCardholderName] = useState("");
  const [publicSettings, setPublicSettings] = useState<Record<string, any>>({});

  const stripePublishableKey = useMemo(() => {
    if (!publicSettings) return null;
    const cleanValue = (val: any) => typeof val === "string" ? val.replace(/^"|"$/g, "") : String(val);
    const sandboxVal = cleanValue(publicSettings.stripe_sandbox);
    const isSandbox = sandboxVal === "true" || sandboxVal === "1";
    const key = isSandbox ? publicSettings.stripe_test_publishable_key : publicSettings.stripe_publishable_key;
    if (!key) return null;
    const cleanedKey = cleanValue(key);
    if (!cleanedKey.startsWith("pk_") || cleanedKey.length < 90) return null;
    return cleanedKey;
  }, [publicSettings]);

  // Load Stripe.js CDN
  useEffect(() => {
    const scriptId = "stripe-js-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://js.stripe.com/v3/";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Instantiate Stripe
  useEffect(() => {
    if (!stripePublishableKey) return;
    const checkStripe = () => {
      const stripeWindow = (window as any).Stripe;
      if (stripeWindow) {
        try {
          setStripeInstance(stripeWindow(stripePublishableKey));
        } catch (err) {
          console.error("[Stripe] Failed to initialize Stripe.js with publishable key:", err);
        }
      } else {
        setTimeout(checkStripe, 100);
      }
    };
    checkStripe();
  }, [stripePublishableKey]);

  // Mount/unmount card element
  useEffect(() => {
    if (!stripeInstance || gateway !== "stripe_onsite") {
      if (cardElementInstance) {
        try { cardElementInstance.destroy(); } catch {}
        setCardElementInstance(null);
      }
      return;
    }

    const elements = stripeInstance.elements();
    const card = elements.create("card", {
      style: {
        base: {
          color: "hsl(var(--foreground))",
          fontFamily: 'Inter, sans-serif',
          fontSmoothing: "antialiased",
          fontSize: "14px",
          "::placeholder": {
            color: "hsl(var(--muted-foreground))",
          },
        },
        invalid: {
          color: "hsl(var(--destructive))",
          iconColor: "hsl(var(--destructive))",
        },
      },
    });

    const timer = setTimeout(() => {
      const container = document.getElementById("invoice-card-element");
      if (container) {
        try {
          card.mount("#invoice-card-element");
          setCardElementInstance(card);
        } catch (err) {
          console.warn("Card element mount error:", err);
        }
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      if (card) {
        try { card.destroy(); } catch {}
      }
    };
  }, [stripeInstance, gateway]);

  const {
    rateFor,
    isFallback: fxFallback,
    isStaleCache: fxStale,
    isLoading: fxLoading,
    isError: fxError,
    cachedAt: fxCachedAt,
  } = useExchangeRates();

  const statusLocked = !!status && LOCKED_STATUSES.has(status.toLowerCase());
  const locked = statusLocked || checkoutStarted;

  const markStarted = () => {
    try { sessionStorage.setItem(startedKey(orderId), "1"); } catch { /* ignore */ }
    setCheckoutStarted(true);
  };
  const resetStarted = () => {
    try { sessionStorage.removeItem(startedKey(orderId)); } catch { /* ignore */ }
    setCheckoutStarted(false);
  };

  useEffect(() => {
    (async () => {
      try {
        const settings = await apiGet<Record<string, any>>("/site-settings");
        setPublicSettings(settings);
        const cleanValue = (val: any) => typeof val === "string" ? val.replace(/^"|"$/g, "") : String(val);
        const on = Object.keys(settings)
          .filter((key) => key.endsWith("_enabled") && cleanValue(settings[key]) === "true")
          .map((key) => key.replace(/_enabled$/, ""))
          .filter((g: string) => GATEWAYS.some((x) => x.id === g));
        setEnabled(on);
        if (on.length) {
          const remembered = readLastGateway();
          const pick =
            (gateway && on.includes(gateway) && gateway) ||
            (defaultGateway && on.includes(defaultGateway) && defaultGateway) ||
            (remembered && on.includes(remembered) && remembered) ||
            on[0];
          if (pick !== gateway) setGateway(pick);
        }
      } catch (e) {
        console.error("Failed to load gateways", e);
      } finally {
        setLoadingGateways(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-unlock when invoice goes back to an unpaid state (webhook failure, etc.)
  useEffect(() => {
    if (!status) return;
    const s = status.toLowerCase();
    const unpaidStates = new Set(["pending", "failed", "cancelled", "expired", "draft", "unpaid"]);
    if (checkoutStarted && unpaidStates.has(s)) {
      resetStarted();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // ?payment=cancelled → unlock immediately.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("payment") === "cancelled") resetStarted();
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Currency math ──────────────────────────────────────────────
  // Invoice currency → USD (rates are USD-based: rates[X] = X per 1 USD).
  // amountUsd = amount / rateFor(invoiceCurrency)
  const invoiceCurrency = (currency || "USD").toUpperCase() as CurrencyCode;
  const settleCode = (GATEWAY_SETTLE_CURRENCY[gateway] || "INVOICE");
  const displayCode = (GATEWAY_DISPLAY_CURRENCY[gateway] || "INVOICE");

  const conversion = useMemo(() => {
    // Bank transfer / unknown gateway → no conversion, keep invoice currency.
    if (settleCode === "INVOICE") {
      return {
        chargeAmount: amount,
        chargeCurrency: invoiceCurrency,
        displayAmount: amount,
        displayCurrency: invoiceCurrency,
        converted: false,
        rateNote: null as string | null,
        fxSource: "none" as "none" | "live" | "cache" | "fallback",
        usable: amount > 0,
      };
    }

    const invoiceRate = rateFor(invoiceCurrency); // X per 1 USD
    const settleRate = rateFor(settleCode as CurrencyCode);
    const displayRate = rateFor(displayCode as CurrencyCode);

    const ratesValid = invoiceRate > 0 && settleRate > 0 && displayRate > 0;

    const amountUsd = ratesValid ? amount / invoiceRate : amount;
    const chargeAmount = ratesValid ? Math.round(amountUsd * settleRate * 100) / 100 : amount;
    const displayAmount = ratesValid ? Math.round(amountUsd * displayRate * 100) / 100 : amount;

    const converted = ratesValid && invoiceCurrency !== displayCode;
    const fxSource: "live" | "cache" | "fallback" = fxFallback
      ? "fallback"
      : fxStale
        ? "cache"
        : "live";

    const sourceLabel =
      fxSource === "live" ? "live rate"
        : fxSource === "cache" ? "cached rate"
          : "fallback rate";

    const rateNote = converted
      ? `Converted from ${formatMoney(amount, invoiceCurrency)} at 1 ${invoiceCurrency} ≈ ${(displayRate / invoiceRate).toFixed(4)} ${displayCode} (${sourceLabel})`
      : null;

    return {
      chargeAmount,
      chargeCurrency: settleCode as CurrencyCode,
      displayAmount,
      displayCurrency: displayCode as CurrencyCode,
      converted,
      rateNote,
      fxSource,
      usable: chargeAmount > 0,
    };
  }, [amount, invoiceCurrency, settleCode, displayCode, rateFor, fxFallback, fxStale]);

  const pay = async () => {
    if (locked) return;
    if (!gateway) { toast.error("Choose a payment method"); return; }
    if (!conversion.usable) { toast.error("Could not compute charge amount"); return; }
    if (gateway === "stripe_onsite") {
      if (!stripeInstance) {
        toast.error("Stripe could not initialize. Please contact support.");
        return;
      }
      if (!cardElementInstance) {
        toast.error("Stripe card element has not loaded. Please wait.");
        return;
      }
      if (!cardholderName.trim()) {
        toast.error("Please enter Cardholder Name.");
        return;
      }
    }
    if (conversion.converted && conversion.fxSource !== "live") {
      toast.message(
        conversion.fxSource === "cache"
          ? "Using cached exchange rate — live FX unavailable right now."
          : "Using fallback exchange rate — live FX unavailable right now.",
      );
    }
    setSubmitting(true);
    try {
      const itemPrice = conversion.chargeAmount; // single-line invoice charge
      const r = await apiPost<any>("/orders/public/process-payment", {
        gateway,
        existing_order_id: orderId,
        customer_email: customerEmail,
        customer_name: customerEmail,
        items: [{
          id: "invoice",
          name: `Invoice ${invoiceNumber || orderId}${conversion.converted ? ` (${formatMoney(amount, invoiceCurrency)})` : ""}`,
          price: itemPrice,
          quantity: 1,
        }],
        total: conversion.chargeAmount,
        currency: conversion.chargeCurrency,
        // Audit trail so admins can reconcile FX-converted charges.
        fx: conversion.converted ? {
          invoice_currency: invoiceCurrency,
          invoice_amount: amount,
          charge_currency: conversion.chargeCurrency,
          charge_amount: conversion.chargeAmount,
          display_currency: conversion.displayCurrency,
          display_amount: conversion.displayAmount,
          rate_source: conversion.fxSource,
          rate_cached_at: fxCachedAt,
        } : null,
        success_url: `${window.location.origin}/i/${invoiceNumber || orderId}?payment=success`,
        cancel_url: `${window.location.origin}/i/${invoiceNumber || orderId}?payment=cancelled`,
      });
      if (r?.error) throw new Error(r.error);
      if (gateway === "stripe_onsite") {
        if (!r?.client_secret) {
          throw new Error("Could not initialize Stripe PaymentIntent");
        }
        toast.loading("Processing card payment...", { id: "stripe-onsite-pay" });
        const { error: confirmError, paymentIntent } = await stripeInstance.confirmCardPayment(
          r.client_secret,
          {
            payment_method: {
              card: cardElementInstance,
              billing_details: {
                name: cardholderName.trim(),
                email: customerEmail.trim().toLowerCase(),
              },
            },
          }
        );
        if (confirmError) {
          toast.dismiss("stripe-onsite-pay");
          throw new Error(confirmError.message);
        }
        if (paymentIntent && paymentIntent.status === "succeeded") {
          toast.success("Payment succeeded!", { id: "stripe-onsite-pay" });
          window.location.assign(`${window.location.origin}/i/${invoiceNumber || orderId}?payment=success`);
          return;
        } else {
          toast.dismiss("stripe-onsite-pay");
          throw new Error("Payment is pending confirmation.");
        }
      }
      if (r?.gateway === "bank_transfer" && r?.session_id) {
        markStarted();
        setBank({
          open: true,
          accounts: r.accounts || [],
          instructions: r.instructions,
          displayName: r.display_name,
          orderNumber: invoiceNumber || r.session_id,
        });
        return;
      }
      const url = r?.url || r?.checkout_url;
      if (url) {
        markStarted();
        window.location.assign(url);
        return;
      }
      markStarted();
      toast.success("Payment initiated");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not start payment");
    } finally {
      setSubmitting(false);
    }
  };

  const visible = GATEWAYS.filter((g) => enabled.includes(g.id));
  const invoiceFmt = formatMoney(amount, invoiceCurrency);
  const displayFmt = formatMoney(conversion.displayAmount, conversion.displayCurrency);

  // Per-gateway display amount (what the customer's card/wallet will be billed).
  const previewFor = (gid: string) => {
    const dCode = GATEWAY_DISPLAY_CURRENCY[gid] || "INVOICE";
    if (dCode === "INVOICE") {
      return { amount, currency: invoiceCurrency, converted: false };
    }
    const invoiceRate = rateFor(invoiceCurrency);
    const displayRate = rateFor(dCode as CurrencyCode);
    const valid = invoiceRate > 0 && displayRate > 0;
    const usd = valid ? amount / invoiceRate : amount;
    const amt = valid ? Math.round(usd * displayRate * 100) / 100 : amount;
    return { amount: amt, currency: dCode as CurrencyCode, converted: valid && invoiceCurrency !== dCode };
  };

  return (
    <div className="px-8 md:px-10 py-6 border-t border-border bg-primary/5 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <p className="font-heading text-xl font-bold flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" /> Pay this invoice
          </p>
          <p className="text-sm text-muted-foreground">
            Pay <span className="font-semibold text-foreground">{invoiceFmt}</span> securely with your preferred method.
          </p>
        </div>
      </div>

      {loadingGateways ? (
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading payment options…
        </div>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No payment gateways are currently enabled. Please contact us to settle this invoice.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="flex-1 min-w-0">
                <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 block">
                  Payment method
                </label>
                <Select value={gateway} onValueChange={(v) => { setGateway(v); writeLastGateway(v); }}>
                  <SelectTrigger><SelectValue placeholder="Choose a method" /></SelectTrigger>
                  <SelectContent>
                    {visible.map((g) => {
                      const p = previewFor(g.id);
                      const fmt = formatMoney(p.amount, p.currency);
                      return (
                        <SelectItem key={g.id} value={g.id}>
                          <span className="flex items-center justify-between gap-3 w-full min-w-[260px]">
                            <span className="flex items-center gap-2">
                              {g.id === "bank_transfer" ? <Banknote className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                              {g.label}
                            </span>
                            <span className="text-xs font-semibold tabular-nums text-foreground/80">
                              {fmt}
                              {p.converted && (
                                <span className="ml-1 font-normal text-muted-foreground">
                                  ≈ {invoiceFmt}
                                </span>
                              )}
                            </span>
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              {gateway !== "stripe_onsite" && (
                <Button
                  onClick={pay}
                  disabled={submitting || !gateway || locked}
                  variant="hero"
                  size="lg"
                  className="sm:w-auto w-full"
                >
                  {statusLocked ? (
                    <><CheckCircle2 className="w-4 h-4 mr-2" /> Payment {status}</>
                  ) : checkoutStarted ? (
                    <><Clock className="w-4 h-4 mr-2" /> Checkout in progress</>
                  ) : submitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redirecting…</>
                  ) : (
                    <><CreditCard className="w-4 h-4 mr-2" /> Pay {displayFmt}</>
                  )}
                </Button>
              )}
            </div>

            {gateway === "stripe_onsite" && (
              <div className="rounded-lg border border-border bg-background p-4 space-y-4 max-w-md">
                <div className="space-y-3 w-full">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Cardholder Name *</label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={cardholderName}
                      onChange={(e) => setCardholderName(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Card Information *</label>
                    <div id="invoice-card-element" className="p-3 rounded-lg border border-input bg-background">
                      {/* Stripe unified Card Element will mount here */}
                    </div>
                  </div>
                </div>

                <Button
                  onClick={pay}
                  disabled={submitting || !gateway || locked}
                  variant="hero"
                  size="lg"
                  className="w-full"
                >
                  {statusLocked ? (
                    <><CheckCircle2 className="w-4 h-4 mr-2" /> Payment {status}</>
                  ) : checkoutStarted ? (
                    <><Clock className="w-4 h-4 mr-2" /> Checkout in progress</>
                  ) : submitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing Card…</>
                  ) : (
                    <><CreditCard className="w-4 h-4 mr-2" /> Confirm Payment — {displayFmt}</>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Conversion summary — only shown when charge currency differs from invoice currency */}
          {conversion.converted && gateway && (
            <div className="rounded-lg border border-primary/20 bg-background/60 p-3 text-xs sm:text-[13px] text-foreground/90 flex items-start gap-2">
              <ArrowRightLeft className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="space-y-0.5">
                <div>
                  Invoice: <span className="font-semibold">{invoiceFmt}</span>
                  <span className="mx-2 text-muted-foreground">→</span>
                  You'll be charged: <span className="font-semibold">{displayFmt}</span>
                </div>
                {conversion.rateNote && (
                  <div className="text-[11px] text-muted-foreground">{conversion.rateNote}</div>
                )}
              </div>
            </div>
          )}
        </div>
          )}

          {/* FX availability notice — only matters when conversion is needed */}
          {conversion.converted && gateway && conversion.fxSource !== "live" && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs sm:text-[13px] text-foreground/90 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-0.5">
                <div className="font-semibold">
                  {conversion.fxSource === "cache"
                    ? "Using a recent cached exchange rate"
                    : "Using a fallback exchange rate"}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {fxLoading
                    ? "Live FX rates are still loading — you can pay now and we'll record the rate used for reconciliation."
                    : fxError
                      ? "Live FX provider is unavailable right now. The amount above is fully payable; the actual rate is logged with your payment."
                      : "The displayed charge is final and payable. Live rates will refresh in the background."}
                </div>
              </div>
            </div>
          )}

      {locked && !statusLocked && (
        <p className="text-xs text-muted-foreground mt-3">
          A checkout session was already started for this invoice. If you didn't complete payment,{" "}
          <button
            type="button"
            onClick={resetStarted}
            className="underline font-medium text-foreground hover:text-primary"
          >
            click here to try again
          </button>.
        </p>
      )}
      {statusLocked && (
        <p className="text-xs text-muted-foreground mt-3">
          This invoice is marked as <span className="font-semibold capitalize">{status}</span> — no further payment is needed.
        </p>
      )}

      {bank?.open && (
        <BankDepositDialog
          open={bank.open}
          onClose={() => setBank((b) => (b ? { ...b, open: false } : b))}
          orderNumber={bank.orderNumber || ""}
          amount={conversion.chargeAmount}
          currency={conversion.chargeCurrency}
          accounts={bank.accounts}
          instructions={bank.instructions}
          displayName={bank.displayName}
          customerEmail={customerEmail}
        />
      )}
    </div>
  );
}

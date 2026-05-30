import { useMemo, useState } from "react";
import { ArrowLeftRight, RefreshCw, TrendingUp } from "lucide-react";
import { useExchangeRates } from "@/hooks/use-exchange-rates";
import {
  SUPPORTED_CURRENCIES,
  formatCurrency,
  getCurrencyMeta,
  type CurrencyCode,
} from "@/lib/currency";

interface Props {
  /** Invoice total in its native currency */
  amount: number;
  /** Invoice currency code (e.g. "USD", "BDT") */
  currency: string;
}

/**
 * Live FX widget shown on the public invoice page.
 * Converts the invoice total (in its stored currency) to USD baseline,
 * then displays the equivalent in any supported currency.
 */
const InvoiceCurrencyConverter = ({ amount, currency }: Props) => {
  const fx = useExchangeRates();
  const fromCode = (currency?.toUpperCase() || "USD") as CurrencyCode;
  const [target, setTarget] = useState<CurrencyCode>(
    fromCode === "USD" ? "BDT" : "USD",
  );

  // Convert invoice amount to USD baseline first, then to target.
  const { amountUsd, converted, rateLabel } = useMemo(() => {
    const fromRate = fx.rateFor(fromCode); // 1 USD = fromRate fromCode
    const toRate = fx.rateFor(target);
    const usd = fromCode === "USD" ? amount : amount / (fromRate || 1);
    const out = target === "USD" ? usd : usd * (toRate || 1);
    return {
      amountUsd: usd,
      converted: out,
      rateLabel: `1 ${fromCode} = ${(toRate / (fromRate || 1)).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${target}`,
    };
  }, [amount, fromCode, target, fx]);

  return (
    <div className="px-8 md:px-10 py-6 border-t border-border bg-muted/10 print:hidden">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
          <ArrowLeftRight className="w-3.5 h-3.5" /> Currency converter
        </p>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {fx.isFetching && <RefreshCw className="w-3 h-3 animate-spin" />}
          <span>
            {fx.isFallback
              ? "Offline rates"
              : fx.isStaleCache
              ? "Cached rates"
              : "Live FX rate"}
          </span>
        </div>
      </div>

      <div className="grid sm:grid-cols-[1fr_auto_1fr] items-end gap-3">
        {/* Invoice side */}
        <div className="rounded-xl border border-border bg-background/60 px-4 py-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Invoice amount
          </p>
          <p className="font-heading text-xl font-bold tabular-nums">
            {formatCurrency(amount, fromCode)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {getCurrencyMeta(fromCode).label}
          </p>
        </div>

        <div className="hidden sm:flex items-center justify-center pb-4">
          <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
        </div>

        {/* Target side */}
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Equivalent in
            </p>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value as CurrencyCode)}
              className="bg-transparent text-[11px] font-semibold border border-border rounded-md px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Convert invoice total to currency"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.label}
                </option>
              ))}
            </select>
          </div>
          <p className="font-heading text-xl font-bold tabular-nums text-primary">
            {formatCurrency(converted, target)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> {rateLabel}
          </p>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground mt-3">
        USD baseline: {formatCurrency(amountUsd, "USD")} · Rates refresh
        automatically. The official charge uses the gateway's rate at payment time.
      </p>
    </div>
  );
};

export default InvoiceCurrencyConverter;

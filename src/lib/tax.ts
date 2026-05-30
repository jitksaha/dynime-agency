import { useSiteSettings } from "@/hooks/use-data";

export type TaxMode = "inclusive" | "exclusive";

export interface TaxSettings {
  enabled: boolean;
  label: string;
  percent: number;
  mode: TaxMode;
  showBreakdown: boolean;
}

export interface TaxBreakdown {
  enabled: boolean;
  mode: TaxMode;
  percent: number;
  label: string;
  /** Net price (excluding VAT). */
  net: number;
  /** Tax amount. */
  tax: number;
  /** Gross price (including VAT). */
  gross: number;
  /** Whether the input `subtotal` already included VAT. */
  inclusive: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

const stripQuotes = (v: unknown): string => {
  if (typeof v !== "string") return String(v ?? "");
  return v.replace(/^"|"$/g, "");
};

export const parseTaxSettings = (raw: Record<string, unknown> | undefined): TaxSettings => {
  const r = raw || {};
  return {
    enabled: stripQuotes(r["tax_enabled"]) === "true",
    label: stripQuotes(r["tax_label"]) || "VAT",
    percent: Math.max(0, Math.min(100, parseFloat(stripQuotes(r["tax_percent"]) || "0") || 0)),
    mode: (stripQuotes(r["tax_mode"]) as TaxMode) === "inclusive" ? "inclusive" : "exclusive",
    showBreakdown: stripQuotes(r["tax_show_breakdown"]) !== "false",
  };
};

/**
 * Compute VAT/Tax for a given amount.
 * - `inclusive`: subtotal already includes VAT — tax is extracted from it, gross == subtotal.
 * - `exclusive`: VAT is added on top — gross = subtotal + tax.
 */
export const computeTax = (subtotal: number, settings: TaxSettings): TaxBreakdown => {
  const s = Math.max(0, Number(subtotal) || 0);
  if (!settings.enabled || settings.percent <= 0) {
    return {
      enabled: false,
      mode: settings.mode,
      percent: settings.percent,
      label: settings.label,
      net: round2(s),
      tax: 0,
      gross: round2(s),
      inclusive: settings.mode === "inclusive",
    };
  }
  const p = settings.percent / 100;
  if (settings.mode === "inclusive") {
    const net = s / (1 + p);
    const tax = s - net;
    return {
      enabled: true,
      mode: "inclusive",
      percent: settings.percent,
      label: settings.label,
      net: round2(net),
      tax: round2(tax),
      gross: round2(s),
      inclusive: true,
    };
  }
  const tax = s * p;
  return {
    enabled: true,
    mode: "exclusive",
    percent: settings.percent,
    label: settings.label,
    net: round2(s),
    tax: round2(tax),
    gross: round2(s + tax),
    inclusive: false,
  };
};

export const useTaxSettings = (): TaxSettings => {
  const { data } = useSiteSettings();
  return parseTaxSettings(data as Record<string, unknown> | undefined);
};

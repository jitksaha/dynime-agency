import { COUNTRY_TO_CURRENCY } from "./country-to-currency";

/**
 * Global currency support.
 *
 * Admin enters prices in USD (and optionally BDT). At render-time we convert to
 * the visitor's preferred currency using live FX rates (cached) or a hardcoded
 * fallback table so the UI never breaks.
 */

export type CurrencyCode =
  | "USD" | "EUR" | "GBP" | "BDT" | "INR" | "AUD" | "CAD" | "AED" | "SAR"
  | "SGD" | "JPY" | "MYR" | "CNY" | "HKD" | "KRW" | "THB" | "IDR" | "PHP"
  | "VND" | "PKR" | "LKR" | "NPR" | "TRY" | "ZAR" | "EGP" | "NGN" | "KES"
  | "GHS" | "MAD" | "QAR" | "KWD" | "BHD" | "OMR" | "JOD" | "ILS" | "CHF"
  | "SEK" | "NOK" | "DKK" | "PLN" | "CZK" | "HUF" | "RON" | "BGN" | "UAH"
  | "RUB" | "MXN" | "BRL" | "ARS" | "CLP" | "COP" | "PEN" | "NZD" | "TWD"
  | "ALL" | "ISK" | "CRC" | "PAB" | "FJD" | "PGK" | "TND" | "UGX";

export interface CurrencyMeta {
  code: CurrencyCode;
  symbol: string;
  /** English display label (fallback). */
  label: string;
  /** Locale used for Intl number formatting. */
  locale: string;
  /** Native-language label of the currency (e.g. "Euro" → "Euro", JPY → "日本円"). */
  nativeLabel: string;
  /** True when admin can enter this price directly (no conversion shown). */
  native?: boolean;
}

export const SUPPORTED_CURRENCIES: CurrencyMeta[] = [
  { code: "USD", symbol: "$",   label: "US Dollar",         nativeLabel: "US Dollar",         locale: "en-US", native: true },
  { code: "EUR", symbol: "€",   label: "Euro",              nativeLabel: "Euro",              locale: "de-DE" },
  { code: "ALL", symbol: "L",   label: "Albanian Lek",      nativeLabel: "Lek shqiptar",      locale: "sq-AL" },
  { code: "ISK", symbol: "kr",  label: "Icelandic Krona",   nativeLabel: "Íslensk króna",     locale: "is-IS" },
  { code: "GBP", symbol: "£",   label: "British Pound",     nativeLabel: "Pound Sterling",    locale: "en-GB" },
  { code: "BDT", symbol: "৳",   label: "Bangladeshi Taka",  nativeLabel: "বাংলাদেশি টাকা",       locale: "bn-BD", native: true },
  { code: "INR", symbol: "₹",   label: "Indian Rupee",      nativeLabel: "भारतीय रुपया",        locale: "en-IN" },
  { code: "PKR", symbol: "₨",   label: "Pakistani Rupee",   nativeLabel: "روپیہ",              locale: "ur-PK" },
  { code: "LKR", symbol: "Rs",  label: "Sri Lankan Rupee",  nativeLabel: "රුපියල්",             locale: "si-LK" },
  { code: "NPR", symbol: "रू",  label: "Nepalese Rupee",    nativeLabel: "नेपाली रूपैयाँ",       locale: "ne-NP" },
  { code: "AUD", symbol: "A$",  label: "Australian Dollar", nativeLabel: "Australian Dollar", locale: "en-AU" },
  { code: "NZD", symbol: "NZ$", label: "New Zealand Dollar",nativeLabel: "New Zealand Dollar",locale: "en-NZ" },
  { code: "CAD", symbol: "C$",  label: "Canadian Dollar",   nativeLabel: "Canadian Dollar",   locale: "en-CA" },
  { code: "MXN", symbol: "Mex$",label: "Mexican Peso",      nativeLabel: "Peso Mexicano",     locale: "es-MX" },
  { code: "BRL", symbol: "R$",  label: "Brazilian Real",    nativeLabel: "Real Brasileiro",   locale: "pt-BR" },
  { code: "ARS", symbol: "AR$", label: "Argentine Peso",    nativeLabel: "Peso Argentino",    locale: "es-AR" },
  { code: "CLP", symbol: "CLP$",label: "Chilean Peso",      nativeLabel: "Peso Chileno",      locale: "es-CL" },
  { code: "COP", symbol: "COL$",label: "Colombian Peso",    nativeLabel: "Peso Colombiano",   locale: "es-CO" },
  { code: "PEN", symbol: "S/",  label: "Peruvian Sol",      nativeLabel: "Sol Peruano",       locale: "es-PE" },
  { code: "CRC", symbol: "₡",   label: "Costa Rican Colon", nativeLabel: "Colón costarricense", locale: "es-CR" },
  { code: "PAB", symbol: "B/.", label: "Panamanian Balboa", nativeLabel: "Balboa panameño",    locale: "es-PA" },
  { code: "AED", symbol: "د.إ", label: "UAE Dirham",        nativeLabel: "درهم إماراتي",        locale: "ar-AE" },
  { code: "SAR", symbol: "﷼",   label: "Saudi Riyal",       nativeLabel: "ريال سعودي",          locale: "ar-SA" },
  { code: "QAR", symbol: "ر.ق", label: "Qatari Riyal",      nativeLabel: "ريال قطري",           locale: "ar-QA" },
  { code: "KWD", symbol: "د.ك", label: "Kuwaiti Dinar",     nativeLabel: "دينار كويتي",         locale: "ar-KW" },
  { code: "BHD", symbol: "ب.د", label: "Bahraini Dinar",    nativeLabel: "دينار بحريني",        locale: "ar-BH" },
  { code: "OMR", symbol: "ر.ع.",label: "Omani Rial",        nativeLabel: "ريال عماني",          locale: "ar-OM" },
  { code: "JOD", symbol: "د.ا", label: "Jordanian Dinar",   nativeLabel: "دينار أردني",         locale: "ar-JO" },
  { code: "ILS", symbol: "₪",   label: "Israeli Shekel",    nativeLabel: "שקל ישראלי",          locale: "he-IL" },
  { code: "TRY", symbol: "₺",   label: "Turkish Lira",      nativeLabel: "Türk Lirası",       locale: "tr-TR" },
  { code: "EGP", symbol: "E£",  label: "Egyptian Pound",    nativeLabel: "جنيه مصري",           locale: "ar-EG" },
  { code: "MAD", symbol: "د.م.",label: "Moroccan Dirham",   nativeLabel: "درهم مغربي",          locale: "ar-MA" },
  { code: "TND", symbol: "د.ت", label: "Tunisian Dinar",    nativeLabel: "دينار تونسي",         locale: "ar-TN" },
  { code: "ZAR", symbol: "R",   label: "South African Rand",nativeLabel: "Rand",              locale: "en-ZA" },
  { code: "NGN", symbol: "₦",   label: "Nigerian Naira",    nativeLabel: "Naira",             locale: "en-NG" },
  { code: "KES", symbol: "KSh", label: "Kenyan Shilling",   nativeLabel: "Shilingi",          locale: "en-KE" },
  { code: "GHS", symbol: "₵",   label: "Ghanaian Cedi",     nativeLabel: "Cedi",              locale: "en-GH" },
  { code: "UGX", symbol: "USh", label: "Ugandan Shilling",  nativeLabel: "Ugandan Shilling",  locale: "en-UG" },
  { code: "SGD", symbol: "S$",  label: "Singapore Dollar",  nativeLabel: "Singapore Dollar",  locale: "en-SG" },
  { code: "HKD", symbol: "HK$", label: "Hong Kong Dollar",  nativeLabel: "港幣",                locale: "zh-HK" },
  { code: "TWD", symbol: "NT$", label: "Taiwan Dollar",     nativeLabel: "新台幣",              locale: "zh-TW" },
  { code: "JPY", symbol: "¥",   label: "Japanese Yen",      nativeLabel: "日本円",              locale: "ja-JP" },
  { code: "KRW", symbol: "₩",   label: "South Korean Won",  nativeLabel: "대한민국 원",           locale: "ko-KR" },
  { code: "CNY", symbol: "¥",   label: "Chinese Yuan",      nativeLabel: "人民币",              locale: "zh-CN" },
  { code: "THB", symbol: "฿",   label: "Thai Baht",         nativeLabel: "บาท",                locale: "th-TH" },
  { code: "IDR", symbol: "Rp",  label: "Indonesian Rupiah", nativeLabel: "Rupiah",            locale: "id-ID" },
  { code: "PHP", symbol: "₱",   label: "Philippine Peso",   nativeLabel: "Piso",              locale: "en-PH" },
  { code: "VND", symbol: "₫",   label: "Vietnamese Dong",   nativeLabel: "Đồng",              locale: "vi-VN" },
  { code: "MYR", symbol: "RM",  label: "Malaysian Ringgit", nativeLabel: "Ringgit Malaysia",  locale: "ms-MY" },
  { code: "FJD", symbol: "FJ$", label: "Fijian Dollar",     nativeLabel: "Fijian Dollar",     locale: "en-FJ" },
  { code: "PGK", symbol: "K",   label: "Papua New Guinean Kina", nativeLabel: "Kina",          locale: "en-PG" },
  { code: "CHF", symbol: "Fr",  label: "Swiss Franc",       nativeLabel: "Schweizer Franken", locale: "de-CH" },
  { code: "SEK", symbol: "kr",  label: "Swedish Krona",     nativeLabel: "Svensk krona",      locale: "sv-SE" },
  { code: "NOK", symbol: "kr",  label: "Norwegian Krone",   nativeLabel: "Norsk krone",       locale: "nb-NO" },
  { code: "DKK", symbol: "kr",  label: "Danish Krone",      nativeLabel: "Dansk krone",       locale: "da-DK" },
  { code: "PLN", symbol: "zł",  label: "Polish Zloty",      nativeLabel: "Złoty",             locale: "pl-PL" },
  { code: "CZK", symbol: "Kč",  label: "Czech Koruna",      nativeLabel: "Česká koruna",      locale: "cs-CZ" },
  { code: "HUF", symbol: "Ft",  label: "Hungarian Forint",  nativeLabel: "Forint",            locale: "hu-HU" },
  { code: "RON", symbol: "lei", label: "Romanian Leu",      nativeLabel: "Leu românesc",      locale: "ro-RO" },
  { code: "BGN", symbol: "лв",  label: "Bulgarian Lev",     nativeLabel: "Лев",               locale: "bg-BG" },
  { code: "UAH", symbol: "₴",   label: "Ukrainian Hryvnia", nativeLabel: "Гривня",            locale: "uk-UA" },
  { code: "RUB", symbol: "₽",   label: "Russian Ruble",     nativeLabel: "Рубль",             locale: "ru-RU" },
];

const CURRENCY_BY_CODE = Object.fromEntries(
  SUPPORTED_CURRENCIES.map((c) => [c.code, c]),
) as Record<CurrencyCode, CurrencyMeta>;

export const getCurrencyMeta = (code: CurrencyCode): CurrencyMeta =>
  CURRENCY_BY_CODE[code] ?? CURRENCY_BY_CODE.USD;

/** Hardcoded fallback rates relative to USD (1 USD = X currency). Updated 2026-04. */
export const FALLBACK_RATES: Record<CurrencyCode, number> = {
  USD: 1, EUR: 0.92, ALL: 92, ISK: 139, GBP: 0.79, BDT: 110, INR: 83.5, PKR: 278, LKR: 300, NPR: 133,
  AUD: 1.52, NZD: 1.65, CAD: 1.36, MXN: 17.2, BRL: 5.05, ARS: 880, CLP: 950,
  COP: 3950, PEN: 3.75, CRC: 510, PAB: 1, AED: 3.67, SAR: 3.75, QAR: 3.64, KWD: 0.31, BHD: 0.376,
  OMR: 0.385, JOD: 0.71, ILS: 3.7, TRY: 32.5, EGP: 48, MAD: 9.95, TND: 3.1, ZAR: 18.5,
  NGN: 1550, KES: 130, GHS: 14.8, UGX: 3800, SGD: 1.34, HKD: 7.82, TWD: 32, JPY: 152,
  KRW: 1370, CNY: 7.22, THB: 35.5, IDR: 15700, PHP: 56.5, VND: 25400, MYR: 4.55,
  FJD: 2.25, PGK: 3.9, CHF: 0.88, SEK: 10.5, NOK: 10.7, DKK: 6.85, PLN: 3.95, CZK: 23, HUF: 360,
  RON: 4.6, BGN: 1.8, UAH: 39.5, RUB: 92,
};

const STORAGE_KEY = "preferred_currency";
const SCOPED_KEY = (scope: string) => `preferred_currency:${scope}`;

/** Map browser locale region → currency. Kept aligned with the PDF-backed geo map. */
const REGION_TO_CURRENCY: Record<string, CurrencyCode> = COUNTRY_TO_CURRENCY;

/**
 * Resolve the visitor's currency.
 *
 * Priority:
 *   1. Per-scope override (e.g. last choice on this service slug)
 *   2. Global preferred currency
 *   3. Browser-locale region inference
 *   4. USD fallback
 */
export const detectDefaultCurrency = (scope?: string): CurrencyCode => {
  return detectCurrencyInfo(scope).code;
};

export type CurrencyDetectionSource =
  | "scoped"
  | "global"
  | "region"
  | "unsupported-region"
  | "fallback";

export interface CurrencyDetectionInfo {
  code: CurrencyCode;
  source: CurrencyDetectionSource;
  /** ISO region code from the browser locale, when available (e.g. "BR", "ZA"). */
  detectedRegion?: string;
  /** Localized country name for the detected region, when available. */
  detectedRegionName?: string;
}

/**
 * Same as `detectDefaultCurrency` but returns full provenance so the UI can
 * tell the visitor *why* a currency was picked — and surface a friendly hint
 * when their region isn't supported.
 */
export const detectCurrencyInfo = (scope?: string): CurrencyDetectionInfo => {
  if (typeof window === "undefined") return { code: "USD", source: "fallback" };

  if (scope) {
    const scoped = window.localStorage.getItem(SCOPED_KEY(scope)) as CurrencyCode | null;
    if (scoped && CURRENCY_BY_CODE[scoped]) return { code: scoped, source: "scoped" };
  }

  const stored = window.localStorage.getItem(STORAGE_KEY) as CurrencyCode | null;
  if (stored && CURRENCY_BY_CODE[stored]) return { code: stored, source: "global" };

  let region: string | undefined;
  try {
    const lang = navigator.language || "en-US";
    region = lang.split("-")[1]?.toUpperCase();
  } catch {
    /* ignore */
  }

  let regionName: string | undefined;
  if (region) {
    try {
      const dn = new Intl.DisplayNames([navigator.language || "en"], { type: "region" });
      regionName = dn.of(region) ?? undefined;
    } catch {
      /* ignore */
    }
  }

  if (region && REGION_TO_CURRENCY[region]) {
    return {
      code: REGION_TO_CURRENCY[region],
      source: "region",
      detectedRegion: region,
      detectedRegionName: regionName,
    };
  }

  if (region) {
    return {
      code: "USD",
      source: "unsupported-region",
      detectedRegion: region,
      detectedRegionName: regionName,
    };
  }

  return { code: "USD", source: "fallback" };
};

/**
 * Save currency preference. Always updates the global key; when `scope` is
 * provided also stores a per-scope override (e.g. service slug) so revisits
 * to the same page restore that exact choice.
 */
export const persistCurrency = (code: CurrencyCode, scope?: string) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, code);
  if (scope) window.localStorage.setItem(SCOPED_KEY(scope), code);
};

/**
 * Locale-aware human label for a currency code.
 *
 * Uses `Intl.DisplayNames` against the visitor's UI language so the dropdown
 * reads e.g. "Euro" in English, "ユーロ" in Japanese, "유로" in Korean — falling
 * back to the curated English label, then the curated native label.
 */
export const getCurrencyDisplayLabel = (code: CurrencyCode, uiLocale?: string): string => {
  const meta = getCurrencyMeta(code);
  const locale =
    uiLocale ??
    (typeof navigator !== "undefined" ? navigator.language : undefined) ??
    "en";
  try {
    const dn = new Intl.DisplayNames([locale], { type: "currency" });
    const localized = dn.of(code);
    if (localized && localized !== code) return localized;
  } catch {
    /* Intl.DisplayNames not supported — fall through */
  }
  return meta.label || meta.nativeLabel;
};

/**
 * Convert an amount expressed in USD into the target currency using the rate map.
 */
export const convertFromUsd = (
  amountUsd: number,
  target: CurrencyCode,
  rates: Record<string, number> | null | undefined,
): number => {
  const r = rates?.[target] ?? FALLBACK_RATES[target] ?? 1;
  return amountUsd * r;
};

/** Locale-aware currency formatter with sensible rounding. */
export const formatCurrency = (
  amount: number,
  code: CurrencyCode,
): string => {
  const meta = getCurrencyMeta(code);
  // For high-magnitude currencies (JPY, BDT, INR) round to whole units.
  const noDecimals = ["JPY", "BDT", "INR", "MYR", "SAR", "AED"].includes(code);
  const hasDecimals = amount % 1 !== 0;
  const digits = noDecimals ? 0 : (hasDecimals ? 2 : 0);
  try {
    return new Intl.NumberFormat(meta.locale, {
      style: "currency",
      currency: code,
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
    }).format(amount);
  } catch {
    const formattedVal = digits > 0 ? amount.toFixed(digits) : Math.round(amount).toLocaleString();
    return `${meta.symbol}${formattedVal}`;
  }
};

/**
 * Resolve a tier price to USD-base.
 * Prefers explicit price_usd; falls back to converting price_bdt → USD.
 */
export const resolveBaseUsd = (
  priceUsd: number | null | undefined,
  priceBdt: number | null | undefined,
  rates: Record<string, number> | null | undefined,
): number | null => {
  if (priceUsd != null && !Number.isNaN(priceUsd)) return Number(priceUsd);
  if (priceBdt != null && !Number.isNaN(priceBdt)) {
    const bdtRate = rates?.BDT ?? FALLBACK_RATES.BDT;
    return Number(priceBdt) / bdtRate;
  }
  return null;
};

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import i18n, { LANGUAGE_STORAGE_KEY } from "@/i18n";
import { useGeoLocation, type GeoInfo } from "@/hooks/use-geo-location";
import { currencyForCountry } from "@/lib/country-to-currency";
import { languageForCountry, isRtl, type SupportedLanguage } from "@/lib/country-to-language";
import { setGoogleTranslateLanguage } from "@/lib/google-translate";
import { useSiteSettings } from "@/hooks/use-data";
import type { CurrencyCode } from "@/lib/currency";

const CURRENCY_STORAGE_KEY = "preferred_currency"; // shared with src/lib/currency.ts
const CURRENCY_OVERRIDE_KEY = "currency_user_override"; // "1" when visitor explicitly picked
const LANGUAGE_OVERRIDE_KEY = "language_user_override";

interface LocationContextValue {
  geo: GeoInfo | null;
  isGeoLoading: boolean;
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
  language: SupportedLanguage;
  setLanguage: (code: SupportedLanguage) => void;
  /** True when the active currency was auto-resolved from geo (no user override). */
  currencyAuto: boolean;
  /** True when the active language was auto-resolved from geo (no user override). */
  languageAuto: boolean;
}

const LocationContext = createContext<LocationContextValue | null>(null);

const readLs = (key: string): string | null => {
  if (typeof window === "undefined") return null;
  try { return window.localStorage.getItem(key); } catch { return null; }
};

/**
 * One-time migration: previous builds wrote `preferred_currency:<slug>` keys on
 * every render, locking pricing pages to USD for returning visitors. If there's
 * no explicit user override, clear them so geo-IP detection can take over.
 */
const cleanupLegacyScopedCurrency = () => {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(CURRENCY_OVERRIDE_KEY) === "1") return;
    if (window.localStorage.getItem("scoped_currency_migrated_v2") === "1") return;
    const stale: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith("preferred_currency:")) stale.push(k);
    }
    stale.forEach((k) => window.localStorage.removeItem(k));
    // Also clear the global key so detectDefaultCurrency falls through to geo.
    window.localStorage.removeItem(CURRENCY_STORAGE_KEY);
    window.localStorage.setItem("scoped_currency_migrated_v2", "1");
  } catch { /* ignore */ }
};

cleanupLegacyScopedCurrency();

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const { geo, isLoading: isGeoLoading } = useGeoLocation();
  const { data: siteSettings } = useSiteSettings();

  // Global super-admin toggles — when "false", the geo auto-detect effect is a no-op
  // and the visitor keeps whatever currency/language they (or the default) had.
  // Defaults to enabled when unset so existing behaviour is preserved.
  const autoCurrencyEnabled = (siteSettings?.auto_currency_switcher_enabled ?? "true") !== "false";
  const autoLanguageEnabled = (siteSettings?.auto_language_switcher_enabled ?? "true") !== "false";

  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    const stored = readLs(CURRENCY_STORAGE_KEY) as CurrencyCode | null;
    return stored || "USD";
  });
  // Only respect an EXPLICIT user override marker — presence of preferred_currency
  // alone is not enough (legacy code & pricing widgets write it for caching).
  const [currencyAuto, setCurrencyAuto] = useState<boolean>(() => readLs(CURRENCY_OVERRIDE_KEY) !== "1");

  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    const stored = readLs(LANGUAGE_STORAGE_KEY) as SupportedLanguage | null;
    return stored || (i18n.language?.split("-")[0] as SupportedLanguage) || "en";
  });
  const [languageAuto, setLanguageAuto] = useState<boolean>(() => readLs(LANGUAGE_OVERRIDE_KEY) !== "1");

  // Auto-apply geo → currency/language on first resolve (only if user hasn't overridden
  // AND the super-admin has the global auto switcher enabled).
  useEffect(() => {
    if (!geo?.countryCode) return;
    if (currencyAuto && autoCurrencyEnabled) {
      const next = currencyForCountry(geo.countryCode);
      setCurrencyState(next);
      // Persist so legacy readers (detectDefaultCurrency) see the geo currency too.
      try { window.localStorage.setItem(CURRENCY_STORAGE_KEY, next); } catch { /* ignore */ }
      try { window.dispatchEvent(new CustomEvent("currencychange", { detail: { code: next, source: "geo" } })); } catch { /* ignore */ }
    }
    if (languageAuto && autoLanguageEnabled) {
      const next = languageForCountry(geo.countryCode);
      setLanguageState(next);
      i18n.changeLanguage(next);
      try { window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next); } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo?.countryCode, autoCurrencyEnabled, autoLanguageEnabled]);

  // Keep <html lang> + dir in sync, and drive Google Translate widget on every
  // language change (including initial mount + geo auto-detect). This is what
  // actually translates the whole page; i18n only covers our bundled keys.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = language;
    document.documentElement.dir = isRtl(language) ? "rtl" : "ltr";
    setGoogleTranslateLanguage(language);
  }, [language]);

  const setCurrency = (code: CurrencyCode) => {
    setCurrencyState(code);
    setCurrencyAuto(false);
    try {
      window.localStorage.setItem(CURRENCY_STORAGE_KEY, code);
      window.localStorage.setItem(CURRENCY_OVERRIDE_KEY, "1");
    } catch { /* ignore */ }
    try { window.dispatchEvent(new CustomEvent("currencychange", { detail: { code, source: "user" } })); } catch { /* ignore */ }
  };

  const setLanguage = (code: SupportedLanguage) => {
    setLanguageState(code);
    setLanguageAuto(false);
    i18n.changeLanguage(code);
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
      window.localStorage.setItem(LANGUAGE_OVERRIDE_KEY, "1");
    } catch { /* ignore */ }
    // Drive Google Translate widget — translates the entire page for free,
    // covering every string not in our bundled i18n JSON. Triggers a reload.
    setGoogleTranslateLanguage(code);
  };

  const value = useMemo<LocationContextValue>(
    () => ({ geo, isGeoLoading, currency, setCurrency, language, setLanguage, currencyAuto, languageAuto }),
    [geo, isGeoLoading, currency, language, currencyAuto, languageAuto],
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
};

export const useLocation = () => {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocation must be used within LocationProvider");
  return ctx;
};

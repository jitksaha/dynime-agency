import type { CurrencyCode } from "./currency";

/**
 * Map ISO 3166 alpha-2 country code → preferred display currency.
 * Used by the geo-IP location engine to auto-select the visitor's currency.
 */
export const COUNTRY_TO_CURRENCY: Record<string, CurrencyCode> = {
  // PDF reference: Europe
  AL: "ALL", AD: "EUR", AT: "EUR", BE: "EUR", HR: "EUR", CZ: "CZK",
  DK: "DKK", FI: "EUR", FR: "EUR", DE: "EUR", GR: "EUR", HU: "HUF",
  IS: "ISK", IE: "EUR", IT: "EUR", NL: "EUR", NO: "NOK", PL: "PLN",
  PT: "EUR", RO: "RON", ES: "EUR", SE: "SEK", CH: "CHF", GB: "GBP",
  // Eurozone countries not listed in the PDF but still valid IP regions.
  CY: "EUR", EE: "EUR", LT: "EUR", LU: "EUR", LV: "EUR", MT: "EUR", SI: "EUR", SK: "EUR",
  // PDF reference: Asia
  BD: "BDT", IN: "INR", PK: "PKR", CN: "CNY", JP: "JPY", KR: "KRW",
  SG: "SGD", MY: "MYR", ID: "IDR", TH: "THB", VN: "VND", PH: "PHP",
  SA: "SAR", AE: "AED", QA: "QAR", KW: "KWD", BH: "BHD", OM: "OMR", TR: "TRY",
  // Additional existing supported APAC regions.
  HK: "HKD", TW: "TWD", LK: "LKR", NP: "NPR",
  // PDF reference: Africa
  ZA: "ZAR", NG: "NGN", KE: "KES", EG: "EGP", GH: "GHS", MA: "MAD", TN: "TND", UG: "UGX",
  // Additional existing supported MENA/Africa regions.
  JO: "JOD", IL: "ILS",
  // PDF reference: Americas
  US: "USD", CA: "CAD", MX: "MXN", CR: "CRC", PA: "PAB",
  BR: "BRL", AR: "ARS", CL: "CLP", CO: "COP", PE: "PEN",
  // PDF reference: Oceania
  AU: "AUD", NZ: "NZD", FJ: "FJD", PG: "PGK",
  // Additional existing supported Europe regions.
  BG: "BGN", UA: "UAH", RU: "RUB",
};

export const currencyForCountry = (code: string | null | undefined): CurrencyCode => {
  if (!code) return "USD";
  return COUNTRY_TO_CURRENCY[code.toUpperCase()] ?? "USD";
};

export type SupportedLanguage =
  | "en" | "bn" | "hi" | "es" | "fr" | "de" | "ar" | "zh";

export const SUPPORTED_LANGUAGES: { code: SupportedLanguage; label: string; nativeLabel: string; flag: string; rtl?: boolean }[] = [
  { code: "en", label: "English", nativeLabel: "English", flag: "🇺🇸" },
  { code: "bn", label: "Bengali", nativeLabel: "বাংলা", flag: "🇧🇩" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी", flag: "🇮🇳" },
  { code: "es", label: "Spanish", nativeLabel: "Español", flag: "🇪🇸" },
  { code: "fr", label: "French", nativeLabel: "Français", flag: "🇫🇷" },
  { code: "de", label: "German", nativeLabel: "Deutsch", flag: "🇩🇪" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية", flag: "🇸🇦", rtl: true },
  { code: "zh", label: "Chinese", nativeLabel: "中文", flag: "🇨🇳" },
];

export const COUNTRY_TO_LANGUAGE_CODE_FROM_REFERENCE: Record<string, string> = {
  // PDF reference: Europe
  AL: "sq", AD: "ca", AT: "de", BE: "nl", HR: "hr", CZ: "cs", DK: "da",
  FI: "fi", FR: "fr", DE: "de", GR: "el", HU: "hu", IS: "is", IE: "en",
  IT: "it", NL: "nl", NO: "no", PL: "pl", PT: "pt", RO: "ro", ES: "es",
  SE: "sv", CH: "de", GB: "en",
  // PDF reference: Asia
  BD: "bn", IN: "hi", PK: "ur", CN: "zh", JP: "ja", KR: "ko", SG: "en",
  MY: "ms", ID: "id", TH: "th", VN: "vi", PH: "fil", SA: "ar", AE: "ar",
  QA: "ar", KW: "ar", BH: "ar", OM: "ar", TR: "tr",
  // PDF reference: Africa
  ZA: "en", NG: "en", KE: "sw", EG: "ar", GH: "en", MA: "ar", TN: "ar", UG: "en",
  // PDF reference: Americas
  US: "en", CA: "en", MX: "es", CR: "es", PA: "es",
  BR: "pt", AR: "es", CL: "es", CO: "es", PE: "es",
  // PDF reference: Oceania
  AU: "en", NZ: "en", FJ: "en", PG: "en",
};

const SUPPORTED_LANGUAGE_CODES = new Set<SupportedLanguage>(SUPPORTED_LANGUAGES.map((l) => l.code));

export const languageForCountry = (code: string | null | undefined): SupportedLanguage => {
  if (!code) return "en";
  const referenceLanguage = COUNTRY_TO_LANGUAGE_CODE_FROM_REFERENCE[code.toUpperCase()];
  return SUPPORTED_LANGUAGE_CODES.has(referenceLanguage as SupportedLanguage)
    ? (referenceLanguage as SupportedLanguage)
    : "en";
};

export const isRtl = (lang: SupportedLanguage): boolean =>
  SUPPORTED_LANGUAGES.find((l) => l.code === lang)?.rtl === true;

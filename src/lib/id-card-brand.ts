export const ID_CARD_BRAND_KEY = "id_card_brand_v4";

export type IdCardBrand = {
  companyName: string;
  siteUrl: string;
  logoUrl: string;
  primaryColor: string;     // hex
  secondaryColor: string;   // hex
  accentColor: string;      // hex
  headerEmployee: string;
  headerInvestor: string;
  staffLabel: string;
  investorLabel: string;
  footerText: string;
  validityYears: number;
  supportEmail: string;
  // QR tuning — improves scan reliability across templates
  qrSize: number;                              // pixel size of QR on the card (40–96)
  qrErrorCorrection: "L" | "M" | "Q" | "H";    // L=7%, M=15%, Q=25%, H=30%
  qrMargin: number;                            // quiet-zone padding in px around the QR
  // Verified badge styling (Facebook-style check)
  verifiedBadgeEnabled: boolean;
  verifiedBadgeColor: string;                  // hex (brand blue or green)
  // ID number formatting — guarantees the numeric portion is always at
  // least 4 digits (clamped 4–8). Larger = lower collision probability.
  idDigits: number;
};

export const DEFAULT_ID_CARD_BRAND: IdCardBrand = {
  companyName: "Dynime Inc.",
  siteUrl: "https://dynime.com",
  logoUrl: "",
  primaryColor: "#1919F5",
  secondaryColor: "#1919F5",
  accentColor: "#e879f9",
  headerEmployee: "Employee Identification",
  headerInvestor: "Investor Identification",
  staffLabel: "STAFF",
  investorLabel: "INVESTOR",
  footerText: "dynime.com",
  validityYears: 2,
  supportEmail: "support@dynime.com",
  qrSize: 64,
  qrErrorCorrection: "Q",
  qrMargin: 6,
  verifiedBadgeEnabled: true,
  verifiedBadgeColor: "#1919F5",
  idDigits: 6,
};

export const mergeBrand = (raw: any): IdCardBrand => {
  if (!raw || typeof raw !== "object") return DEFAULT_ID_CARD_BRAND;
  return { ...DEFAULT_ID_CARD_BRAND, ...raw };
};

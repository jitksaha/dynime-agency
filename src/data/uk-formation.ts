export type UKComplexity = "Low" | "Medium" | "High";
export type UKCostTier = "Low" | "Medium" | "High";

export interface UKEntityRecord {
  id: string;
  type: string;
  formationFeeMin: number;
  formationFeeMax: number;
  annualComplianceFee: number; // GBP - confirmation statement etc.
  accountingMin: number;
  accountingMax: number;
  registeredAddressMin: number;
  registeredAddressMax: number;
  corporateTax: string;
  dividendTax: string;
  vatRate: string;
  vatThreshold: string;
  bestFor: string;
  complexity: UKComplexity;
  costTier: UKCostTier;
  notes: string;
  popular?: boolean;
}

export const UK_ENTITIES: UKEntityRecord[] = [
  {
    id: "ltd",
    type: "Private Limited Company (Ltd)",
    formationFeeMin: 12,
    formationFeeMax: 50,
    annualComplianceFee: 13,
    accountingMin: 150,
    accountingMax: 1000,
    registeredAddressMin: 0,
    registeredAddressMax: 150,
    corporateTax: "19% – 25%",
    dividendTax: "8.75% – 39.35%",
    vatRate: "20%",
    vatThreshold: "£90,000",
    bestFor: "Startup / International",
    complexity: "Medium",
    costTier: "Low",
    notes: "Most popular structure for non-residents",
    popular: true,
  },
  {
    id: "llp",
    type: "Limited Liability Partnership (LLP)",
    formationFeeMin: 40,
    formationFeeMax: 100,
    annualComplianceFee: 13,
    accountingMin: 200,
    accountingMax: 1200,
    registeredAddressMin: 0,
    registeredAddressMax: 150,
    corporateTax: "No (Pass-through)",
    dividendTax: "8.75% – 39.35%",
    vatRate: "20%",
    vatThreshold: "£90,000",
    bestFor: "Partnership Business",
    complexity: "Medium",
    costTier: "Low",
    notes: "Partners taxed individually",
  },
  {
    id: "plc",
    type: "Public Limited Company (PLC)",
    formationFeeMin: 50,
    formationFeeMax: 100,
    annualComplianceFee: 50,
    accountingMin: 500,
    accountingMax: 3000,
    registeredAddressMin: 100,
    registeredAddressMax: 300,
    corporateTax: "25%",
    dividendTax: "8.75% – 39.35%",
    vatRate: "20%",
    vatThreshold: "£90,000",
    bestFor: "Large Scale Business",
    complexity: "High",
    costTier: "High",
    notes: "Requires £50,000 share capital",
  },
  {
    id: "sole",
    type: "Sole Trader",
    formationFeeMin: 0,
    formationFeeMax: 0,
    annualComplianceFee: 0,
    accountingMin: 50,
    accountingMax: 500,
    registeredAddressMin: 0,
    registeredAddressMax: 0,
    corporateTax: "0%",
    dividendTax: "20% – 45% (income tax)",
    vatRate: "20%",
    vatThreshold: "£90,000",
    bestFor: "Freelancers",
    complexity: "Low",
    costTier: "Low",
    notes: "No company structure required",
  },
  {
    id: "cic",
    type: "Community Interest Company (CIC)",
    formationFeeMin: 27,
    formationFeeMax: 50,
    annualComplianceFee: 35,
    accountingMin: 200,
    accountingMax: 1500,
    registeredAddressMin: 50,
    registeredAddressMax: 200,
    corporateTax: "19% – 25%",
    dividendTax: "8.75% – 39.35%",
    vatRate: "20%",
    vatThreshold: "£90,000",
    bestFor: "Social Enterprise",
    complexity: "High",
    costTier: "Medium",
    notes: "Regulated company type",
  },
  {
    id: "charity",
    type: "Non-Profit / Charity",
    formationFeeMin: 0,
    formationFeeMax: 50,
    annualComplianceFee: 25,
    accountingMin: 100,
    accountingMax: 800,
    registeredAddressMin: 50,
    registeredAddressMax: 200,
    corporateTax: "0% – 25%",
    dividendTax: "0% – 39%",
    vatRate: "0% – 20%",
    vatThreshold: "£0 – £90,000",
    bestFor: "Charity / NGO",
    complexity: "High",
    costTier: "Low",
    notes: "Tax exemptions possible",
  },
];

export interface UKOperationalCost {
  type: string;
  min: number;
  max: number;
  frequency: string;
  appliesTo: string;
  required: "Yes" | "No" | "Conditional";
  notes: string;
}

export const UK_OPERATIONAL_COSTS: UKOperationalCost[] = [
  { type: "Confirmation Statement", min: 13, max: 13, frequency: "Yearly", appliesTo: "All companies", required: "Yes", notes: "Mandatory Companies House filing" },
  { type: "Registered Office Address", min: 0, max: 150, frequency: "Yearly", appliesTo: "All", required: "No", notes: "Needed for non-UK founders" },
  { type: "Accounting & Tax Filing", min: 150, max: 1000, frequency: "Yearly", appliesTo: "All", required: "Yes", notes: "Depends on activity & turnover" },
  { type: "VAT Registration", min: 0, max: 0, frequency: "One-time", appliesTo: "Threshold based", required: "Conditional", notes: "Required above £90k revenue" },
  { type: "VAT Filing", min: 50, max: 300, frequency: "Quarterly", appliesTo: "VAT registered", required: "Yes", notes: "Usually handled by accountant" },
  { type: "PAYE Payroll", min: 0, max: 50, frequency: "Monthly", appliesTo: "Employers", required: "Conditional", notes: "If hiring employees" },
];

export const UK_TIER_BADGE: Record<UKCostTier, string> = {
  Low: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  Medium: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  High: "bg-rose-500/10 text-rose-500 border-rose-500/30",
};

export const UK_COMPLEXITY_BADGE: Record<UKComplexity, string> = {
  Low: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  Medium: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  High: "bg-rose-500/10 text-rose-500 border-rose-500/30",
};

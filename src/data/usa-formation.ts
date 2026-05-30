// USA Company Formation — full 50-state dataset.
// Numbers reflect typical 2025–2026 published state fees and are intended as
// directional guidance for visitors; always verify current state requirements.

export type CostTier = "Low" | "Medium" | "High" | "Very High";

export interface StateRecord {
  state: string;
  abbr: string;
  llcFormation: number;
  corpFormation: number;
  /** Average yearly LLC fee in USD (range midpoint where applicable). */
  llcAnnual: number;
  llcAnnualLabel: string;
  corpAnnual: number;
  corpAnnualLabel: string;
  franchiseTax: string; // No / Yes (Corp) / Yes (Revenue) etc.
  stateIncomeTax: boolean;
  corporateTax: boolean;
  salesTax: boolean;
  bestFor: string;
  costTier: CostTier;
  notes: string;
  popular?: boolean;
}

export const STATES: StateRecord[] = [
  { state: "Alabama", abbr: "AL", llcFormation: 236, corpFormation: 200, llcAnnual: 125, llcAnnualLabel: "$50–$200", corpAnnual: 150, corpAnnualLabel: "$150+", franchiseTax: "Yes (Revenue)", stateIncomeTax: true, corporateTax: true, salesTax: true, bestFor: "Local Business", costTier: "Medium", notes: "Business Privilege Tax" },
  { state: "Alaska", abbr: "AK", llcFormation: 250, corpFormation: 250, llcAnnual: 50, llcAnnualLabel: "$50", corpAnnual: 100, corpAnnualLabel: "$100", franchiseTax: "No", stateIncomeTax: false, corporateTax: true, salesTax: false, bestFor: "Remote Business", costTier: "Low", notes: "Biennial reporting" },
  { state: "Arizona", abbr: "AZ", llcFormation: 85, corpFormation: 60, llcAnnual: 0, llcAnnualLabel: "$0", corpAnnual: 45, corpAnnualLabel: "$45", franchiseTax: "No", stateIncomeTax: true, corporateTax: true, salesTax: true, bestFor: "Low Cost Startup", costTier: "Low", notes: "No LLC annual fee" },
  { state: "Arkansas", abbr: "AR", llcFormation: 45, corpFormation: 45, llcAnnual: 150, llcAnnualLabel: "$150", corpAnnual: 150, corpAnnualLabel: "$150", franchiseTax: "Yes", stateIncomeTax: true, corporateTax: true, salesTax: true, bestFor: "Standard Business", costTier: "Medium", notes: "Flat franchise tax" },
  { state: "California", abbr: "CA", llcFormation: 70, corpFormation: 100, llcAnnual: 800, llcAnnualLabel: "$800 min", corpAnnual: 800, corpAnnualLabel: "$800 min", franchiseTax: "Yes (Min $800)", stateIncomeTax: true, corporateTax: true, salesTax: true, bestFor: "Large Market", costTier: "Very High", notes: "Highest fixed cost", popular: true },
  { state: "Colorado", abbr: "CO", llcFormation: 50, corpFormation: 50, llcAnnual: 10, llcAnnualLabel: "$10", corpAnnual: 10, corpAnnualLabel: "$10", franchiseTax: "No", stateIncomeTax: true, corporateTax: true, salesTax: true, bestFor: "Cheap Setup", costTier: "Low", notes: "Very low fees" },
  { state: "Connecticut", abbr: "CT", llcFormation: 120, corpFormation: 250, llcAnnual: 80, llcAnnualLabel: "$80", corpAnnual: 150, corpAnnualLabel: "$150", franchiseTax: "No", stateIncomeTax: true, corporateTax: true, salesTax: true, bestFor: "Standard Business", costTier: "Medium", notes: "Annual filing required" },
  { state: "Delaware", abbr: "DE", llcFormation: 110, corpFormation: 89, llcAnnual: 300, llcAnnualLabel: "$300", corpAnnual: 225, corpAnnualLabel: "$225+", franchiseTax: "Yes (Corp)", stateIncomeTax: false, corporateTax: true, salesTax: false, bestFor: "Startup / VC", costTier: "High", notes: "Investor-friendly", popular: true },
  { state: "Florida", abbr: "FL", llcFormation: 125, corpFormation: 70, llcAnnual: 138.75, llcAnnualLabel: "$138.75", corpAnnual: 150, corpAnnualLabel: "$150", franchiseTax: "No", stateIncomeTax: false, corporateTax: true, salesTax: true, bestFor: "E-commerce", costTier: "Medium", notes: "No personal income tax", popular: true },
  { state: "Georgia", abbr: "GA", llcFormation: 105, corpFormation: 100, llcAnnual: 50, llcAnnualLabel: "$50", corpAnnual: 50, corpAnnualLabel: "$50", franchiseTax: "No", stateIncomeTax: true, corporateTax: true, salesTax: true, bestFor: "Small Business", costTier: "Low", notes: "Easy compliance" },
  { state: "Hawaii", abbr: "HI", llcFormation: 51, corpFormation: 50, llcAnnual: 15, llcAnnualLabel: "$15", corpAnnual: 15, corpAnnualLabel: "$15", franchiseTax: "No", stateIncomeTax: true, corporateTax: true, salesTax: true, bestFor: "Small Business", costTier: "Low", notes: "Very low cost" },
  { state: "Idaho", abbr: "ID", llcFormation: 103, corpFormation: 100, llcAnnual: 0, llcAnnualLabel: "$0", corpAnnual: 10, corpAnnualLabel: "$0–$20", franchiseTax: "No", stateIncomeTax: true, corporateTax: true, salesTax: true, bestFor: "Low Cost", costTier: "Low", notes: "Minimal fees" },
  { state: "Illinois", abbr: "IL", llcFormation: 153, corpFormation: 150, llcAnnual: 75, llcAnnualLabel: "$75", corpAnnual: 75, corpAnnualLabel: "$75+", franchiseTax: "Yes (Corp)", stateIncomeTax: true, corporateTax: true, salesTax: true, bestFor: "Mid Business", costTier: "Medium", notes: "Corp franchise tax" },
  { state: "Indiana", abbr: "IN", llcFormation: 97, corpFormation: 100, llcAnnual: 25, llcAnnualLabel: "$25", corpAnnual: 50, corpAnnualLabel: "$50", franchiseTax: "No", stateIncomeTax: true, corporateTax: true, salesTax: true, bestFor: "Affordable", costTier: "Low", notes: "Biennial LLC" },
  { state: "Iowa", abbr: "IA", llcFormation: 50, corpFormation: 50, llcAnnual: 15, llcAnnualLabel: "$15", corpAnnual: 60, corpAnnualLabel: "$60", franchiseTax: "No", stateIncomeTax: true, corporateTax: true, salesTax: true, bestFor: "Small Business", costTier: "Low", notes: "Low cost" },
  { state: "Kansas", abbr: "KS", llcFormation: 85, corpFormation: 90, llcAnnual: 50, llcAnnualLabel: "$50", corpAnnual: 50, corpAnnualLabel: "$50", franchiseTax: "No", stateIncomeTax: true, corporateTax: true, salesTax: true, bestFor: "Standard", costTier: "Low", notes: "Stable system" },
  { state: "Kentucky", abbr: "KY", llcFormation: 40, corpFormation: 40, llcAnnual: 15, llcAnnualLabel: "$15", corpAnnual: 15, corpAnnualLabel: "$15", franchiseTax: "No", stateIncomeTax: true, corporateTax: true, salesTax: true, bestFor: "Cheap Setup", costTier: "Low", notes: "Very low fees" },
  { state: "Louisiana", abbr: "LA", llcFormation: 105, corpFormation: 75, llcAnnual: 30, llcAnnualLabel: "$30", corpAnnual: 30, corpAnnualLabel: "$30+", franchiseTax: "Yes (Corp)", stateIncomeTax: true, corporateTax: true, salesTax: true, bestFor: "Regional", costTier: "Low", notes: "Variable franchise tax" },
  { state: "Maine", abbr: "ME", llcFormation: 178, corpFormation: 145, llcAnnual: 85, llcAnnualLabel: "$85", corpAnnual: 85, corpAnnualLabel: "$85", franchiseTax: "No", stateIncomeTax: true, corporateTax: true, salesTax: true, bestFor: "Small Business", costTier: "Medium", notes: "Annual filing required" },
  { state: "Maryland", abbr: "MD", llcFormation: 155, corpFormation: 120, llcAnnual: 300, llcAnnualLabel: "$300", corpAnnual: 300, corpAnnualLabel: "$300", franchiseTax: "No", stateIncomeTax: true, corporateTax: true, salesTax: true, bestFor: "Mid Business", costTier: "High", notes: "High fixed fee" },
  { state: "Massachusetts", abbr: "MA", llcFormation: 520, corpFormation: 275, llcAnnual: 500, llcAnnualLabel: "$500", corpAnnual: 125, corpAnnualLabel: "$125+", franchiseTax: "No", stateIncomeTax: true, corporateTax: true, salesTax: true, bestFor: "Enterprise", costTier: "High", notes: "Expensive LLC" },
  { state: "Michigan", abbr: "MI", llcFormation: 50, corpFormation: 60, llcAnnual: 25, llcAnnualLabel: "$25", corpAnnual: 25, corpAnnualLabel: "$25", franchiseTax: "No", stateIncomeTax: true, corporateTax: true, salesTax: true, bestFor: "Affordable", costTier: "Low", notes: "Low cost" },
  { state: "Minnesota", abbr: "MN", llcFormation: 155, corpFormation: 135, llcAnnual: 0, llcAnnualLabel: "$0", corpAnnual: 0, corpAnnualLabel: "$0", franchiseTax: "No", stateIncomeTax: true, corporateTax: true, salesTax: true, bestFor: "Low Cost", costTier: "Low", notes: "No annual fee" },
  { state: "Mississippi", abbr: "MS", llcFormation: 53, corpFormation: 50, llcAnnual: 0, llcAnnualLabel: "$0", corpAnnual: 25, corpAnnualLabel: "$25", franchiseTax: "No", stateIncomeTax: true, corporateTax: true, salesTax: true, bestFor: "Cheap Setup", costTier: "Low", notes: "LLC-friendly" },
  { state: "Missouri", abbr: "MO", llcFormation: 51, corpFormation: 58, llcAnnual: 0, llcAnnualLabel: "$0", corpAnnual: 20, corpAnnualLabel: "$20", franchiseTax: "No", stateIncomeTax: true, corporateTax: true, salesTax: true, bestFor: "Low Cost", costTier: "Low", notes: "No LLC renewal" },
  { state: "Montana", abbr: "MT", llcFormation: 35, corpFormation: 70, llcAnnual: 20, llcAnnualLabel: "$20", corpAnnual: 20, corpAnnualLabel: "$20", franchiseTax: "No", stateIncomeTax: true, corporateTax: true, salesTax: false, bestFor: "No Sales Tax", costTier: "Low", notes: "No state sales tax" },
  { state: "Nebraska", abbr: "NE", llcFormation: 103, corpFormation: 60, llcAnnual: 10, llcAnnualLabel: "$10", corpAnnual: 25, corpAnnualLabel: "$25", franchiseTax: "No", stateIncomeTax: true, corporateTax: true, salesTax: true, bestFor: "Small Business", costTier: "Low", notes: "Low fees" },
  { state: "Nevada", abbr: "NV", llcFormation: 436, corpFormation: 725, llcAnnual: 350, llcAnnualLabel: "$350", corpAnnual: 500, corpAnnualLabel: "$500+", franchiseTax: "Yes", stateIncomeTax: false, corporateTax: false, salesTax: true, bestFor: "Privacy Business", costTier: "High", notes: "High compliance cost", popular: true },
  { state: "New Hampshire", abbr: "NH", llcFormation: 102, corpFormation: 100, llcAnnual: 100, llcAnnualLabel: "$100", corpAnnual: 100, corpAnnualLabel: "$100", franchiseTax: "No", stateIncomeTax: false, corporateTax: true, salesTax: false, bestFor: "Tax Advantage", costTier: "Medium", notes: "No sales tax" },
  { state: "New Jersey", abbr: "NJ", llcFormation: 129, corpFormation: 125, llcAnnual: 75, llcAnnualLabel: "$75", corpAnnual: 75, corpAnnualLabel: "$75", franchiseTax: "No", stateIncomeTax: true, corporateTax: true, salesTax: true, bestFor: "Standard", costTier: "Medium", notes: "Stable" },
  { state: "New Mexico", abbr: "NM", llcFormation: 50, corpFormation: 100, llcAnnual: 0, llcAnnualLabel: "$0", corpAnnual: 0, corpAnnualLabel: "$0", franchiseTax: "No", stateIncomeTax: true, corporateTax: true, salesTax: true, bestFor: "No Annual Fee", costTier: "Low", notes: "Best low-maintenance" },
  { state: "New York", abbr: "NY", llcFormation: 205, corpFormation: 125, llcAnnual: 4.5, llcAnnualLabel: "$9 biennial", corpAnnual: 25, corpAnnualLabel: "$25+", franchiseTax: "No", stateIncomeTax: true, corporateTax: true, salesTax: true, bestFor: "Large Market", costTier: "Medium", notes: "Publication cost extra" },
  { state: "North Carolina", abbr: "NC", llcFormation: 128, corpFormation: 125, llcAnnual: 200, llcAnnualLabel: "$200", corpAnnual: 25, corpAnnualLabel: "$25", franchiseTax: "No", stateIncomeTax: true, corporateTax: true, salesTax: true, bestFor: "Local Business", costTier: "High", notes: "LLC costly" },
  { state: "North Dakota", abbr: "ND", llcFormation: 135, corpFormation: 100, llcAnnual: 50, llcAnnualLabel: "$50", corpAnnual: 25, corpAnnualLabel: "$25", franchiseTax: "No", stateIncomeTax: true, corporateTax: true, salesTax: true, bestFor: "Small Business", costTier: "Low", notes: "Affordable" },
  { state: "Ohio", abbr: "OH", llcFormation: 99, corpFormation: 99, llcAnnual: 0, llcAnnualLabel: "$0", corpAnnual: 0, corpAnnualLabel: "$0", franchiseTax: "No", stateIncomeTax: true, corporateTax: true, salesTax: true, bestFor: "Low Cost", costTier: "Low", notes: "No annual fee" },
  { state: "Oklahoma", abbr: "OK", llcFormation: 104, corpFormation: 50, llcAnnual: 25, llcAnnualLabel: "$25", corpAnnual: 25, corpAnnualLabel: "$25", franchiseTax: "No", stateIncomeTax: true, corporateTax: true, salesTax: true, bestFor: "Small Business", costTier: "Low", notes: "Cheap" },
  { state: "Oregon", abbr: "OR", llcFormation: 100, corpFormation: 100, llcAnnual: 100, llcAnnualLabel: "$100", corpAnnual: 100, corpAnnualLabel: "$100", franchiseTax: "No", stateIncomeTax: true, corporateTax: true, salesTax: false, bestFor: "No Sales Tax", costTier: "Medium", notes: "No state sales tax" },
  { state: "Pennsylvania", abbr: "PA", llcFormation: 125, corpFormation: 125, llcAnnual: 0, llcAnnualLabel: "$0", corpAnnual: 70, corpAnnualLabel: "$70", franchiseTax: "No", stateIncomeTax: true, corporateTax: true, salesTax: true, bestFor: "Low Cost LLC", costTier: "Low", notes: "LLC no annual fee" },
  { state: "Rhode Island", abbr: "RI", llcFormation: 156, corpFormation: 230, llcAnnual: 50, llcAnnualLabel: "$50", corpAnnual: 50, corpAnnualLabel: "$50", franchiseTax: "No", stateIncomeTax: true, corporateTax: true, salesTax: true, bestFor: "Small Business", costTier: "Low", notes: "Standard" },
  { state: "South Carolina", abbr: "SC", llcFormation: 125, corpFormation: 135, llcAnnual: 0, llcAnnualLabel: "$0", corpAnnual: 25, corpAnnualLabel: "$25+", franchiseTax: "Yes (Corp)", stateIncomeTax: true, corporateTax: true, salesTax: true, bestFor: "Corp Business", costTier: "Low", notes: "Corp tax applies" },
  { state: "South Dakota", abbr: "SD", llcFormation: 153, corpFormation: 150, llcAnnual: 50, llcAnnualLabel: "$50", corpAnnual: 50, corpAnnualLabel: "$50", franchiseTax: "No", stateIncomeTax: false, corporateTax: false, salesTax: true, bestFor: "Tax Friendly", costTier: "Low", notes: "No income tax" },
  { state: "Tennessee", abbr: "TN", llcFormation: 307, corpFormation: 100, llcAnnual: 300, llcAnnualLabel: "$300+", corpAnnual: 300, corpAnnualLabel: "$300+", franchiseTax: "Yes", stateIncomeTax: false, corporateTax: true, salesTax: true, bestFor: "Large Business", costTier: "High", notes: "Member/share-based tax" },
  { state: "Texas", abbr: "TX", llcFormation: 300, corpFormation: 300, llcAnnual: 0, llcAnnualLabel: "$0 (under threshold)", corpAnnual: 150, corpAnnualLabel: "$0–$300+", franchiseTax: "Yes (Threshold)", stateIncomeTax: false, corporateTax: false, salesTax: true, bestFor: "Scaling Startup", costTier: "Medium", notes: "No tax under revenue threshold", popular: true },
  { state: "Utah", abbr: "UT", llcFormation: 59, corpFormation: 70, llcAnnual: 20, llcAnnualLabel: "$20", corpAnnual: 20, corpAnnualLabel: "$20", franchiseTax: "No", stateIncomeTax: true, corporateTax: true, salesTax: true, bestFor: "Affordable", costTier: "Low", notes: "Low cost" },
  { state: "Vermont", abbr: "VT", llcFormation: 155, corpFormation: 125, llcAnnual: 35, llcAnnualLabel: "$35", corpAnnual: 45, corpAnnualLabel: "$45", franchiseTax: "No", stateIncomeTax: true, corporateTax: true, salesTax: true, bestFor: "Small Business", costTier: "Low", notes: "Affordable" },
  { state: "Virginia", abbr: "VA", llcFormation: 100, corpFormation: 75, llcAnnual: 50, llcAnnualLabel: "$50", corpAnnual: 100, corpAnnualLabel: "$100", franchiseTax: "No", stateIncomeTax: true, corporateTax: true, salesTax: true, bestFor: "Standard", costTier: "Medium", notes: "Stable" },
  { state: "Washington", abbr: "WA", llcFormation: 200, corpFormation: 200, llcAnnual: 60, llcAnnualLabel: "$60", corpAnnual: 60, corpAnnualLabel: "$60", franchiseTax: "Yes (B&O)", stateIncomeTax: false, corporateTax: false, salesTax: true, bestFor: "Online Business", costTier: "Medium", notes: "B&O tax system" },
  { state: "West Virginia", abbr: "WV", llcFormation: 100, corpFormation: 100, llcAnnual: 25, llcAnnualLabel: "$25", corpAnnual: 25, corpAnnualLabel: "$25", franchiseTax: "No", stateIncomeTax: true, corporateTax: true, salesTax: true, bestFor: "Low Cost", costTier: "Low", notes: "Cheap" },
  { state: "Wisconsin", abbr: "WI", llcFormation: 130, corpFormation: 100, llcAnnual: 25, llcAnnualLabel: "$25", corpAnnual: 25, corpAnnualLabel: "$25", franchiseTax: "No", stateIncomeTax: true, corporateTax: true, salesTax: true, bestFor: "Affordable", costTier: "Low", notes: "Low fees" },
  { state: "Wyoming", abbr: "WY", llcFormation: 100, corpFormation: 100, llcAnnual: 60, llcAnnualLabel: "$60", corpAnnual: 60, corpAnnualLabel: "$60", franchiseTax: "No", stateIncomeTax: false, corporateTax: false, salesTax: true, bestFor: "Best Remote LLC", costTier: "Low", notes: "Top choice for non-residents", popular: true },
];

export const ENTITY_TYPES = [
  { id: "single-llc", label: "Single-Member LLC", cpaLow: 150, cpaHigh: 500 },
  { id: "multi-llc", label: "Multi-Member LLC", cpaLow: 300, cpaHigh: 800 },
  { id: "c-corp", label: "C Corporation", cpaLow: 500, cpaHigh: 2000 },
  { id: "s-corp", label: "S Corporation (US residents)", cpaLow: 400, cpaHigh: 1500 },
  { id: "partnership", label: "Partnership (LP / LLP)", cpaLow: 300, cpaHigh: 1500 },
  { id: "nonprofit", label: "Nonprofit", cpaLow: 200, cpaHigh: 1000 },
] as const;

export type EntityTypeId = (typeof ENTITY_TYPES)[number]["id"];

export const TIER_BADGE: Record<CostTier, string> = {
  Low: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  Medium: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  High: "bg-orange-500/15 text-orange-500 border-orange-500/30",
  "Very High": "bg-destructive/15 text-destructive border-destructive/30",
};

/**
 * Canonical "Top 5" most-chosen incorporation states (ordered).
 * Source of truth for popular/Top-5 sections — guarantees exactly 5 entries.
 */
export const TOP_5_ABBRS = ["DE", "WY", "NV", "FL", "CA"] as const;

export const TOP_5_STATES: StateRecord[] = TOP_5_ABBRS
  .map((abbr) => STATES.find((s) => s.abbr === abbr))
  .filter((s): s is StateRecord => Boolean(s));


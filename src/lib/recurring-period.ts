/**
 * Maps a tier `period` string (as authored in AdminPricing or service-pricing-packs)
 * to a normalized billing cycle. Returns null for one-time / non-recurring periods,
 * so callers can branch cleanly: recurring -> create subscription row, otherwise treat as one-off.
 */
export type BillingCycle = "weekly" | "monthly" | "quarterly" | "yearly";

export const RECURRING_PERIOD_OPTIONS: { label: string; value: string }[] = [
  { label: "/week", value: "/week" },
  { label: "/month", value: "/month" },
  { label: "/quarter", value: "/quarter" },
  { label: "/year", value: "/year" },
];

export const ONE_TIME_PERIOD_OPTIONS: { label: string; value: string }[] = [
  { label: "one-time", value: "one-time" },
  { label: "per project", value: "per project" },
  { label: "/hour", value: "/hour" },
  { label: "one-time + 30-day support", value: "one-time + 30-day support" },
  { label: "one-time + 90-day care", value: "one-time + 90-day care" },
  { label: "+ state fee", value: "+ state fee" },
  { label: "+ yearly compliance", value: "+ yearly compliance" },
];

export const detectBillingCycle = (period?: string | null): BillingCycle | null => {
  if (!period) return null;
  const p = period.toLowerCase().trim();
  // Exclude obvious non-recurring labels even if they contain a recurring word
  if (p.startsWith("one-time") || p.includes("per project") || p === "/hour" || p.startsWith("+ ")) return null;
  if (/(^|\W)\/?week(ly|s)?\b/.test(p)) return "weekly";
  if (/(^|\W)\/?month(ly|s)?\b/.test(p)) return "monthly";
  if (/(^|\W)\/?quarter(ly|s)?\b/.test(p)) return "quarterly";
  if (/(^|\W)\/?(year(ly|s)?|yr|annual(ly)?)\b/.test(p)) return "yearly";
  return null;
};

export const isRecurringPeriod = (period?: string | null) => detectBillingCycle(period) !== null;

export const addCycleToDate = (date: Date, cycle: BillingCycle): Date => {
  const d = new Date(date);
  if (cycle === "weekly") d.setDate(d.getDate() + 7);
  else if (cycle === "monthly") d.setMonth(d.getMonth() + 1);
  else if (cycle === "quarterly") d.setMonth(d.getMonth() + 3);
  else if (cycle === "yearly") d.setFullYear(d.getFullYear() + 1);
  return d;
};

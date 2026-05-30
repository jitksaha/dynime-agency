// Profit / loss calculation helpers for the Dynime Inc.
// investment plans (sourced from the official investor brief).

export interface PlanLike {
  slug: string;
  name: string;
  roi_percent: number;        // target annual ROI (used for the simple model)
  profit_share_percent: number;
  lock_period_days: number;
  payout_frequency: string;
  min_amount: number;
  max_amount: number | null;
  currency: string;
}

export type CompoundingMode = "none" | "monthly" | "quarterly";

export interface CalcInput {
  plan: PlanLike;
  amount: number;
  durationMonths: number;
  compounding: CompoundingMode;
  reinvest: boolean;
  // For Tier 3 profit share simulator (USD revenue per month per category)
  profitShareInput?: {
    webRevenue: number;
    marketingRevenue: number;
    consultingRevenue: number;
  };
}

export interface PayoutPoint {
  month: number;
  cumulativeReturn: number; // total profit returned by end of this month
  bonus: number;            // bonus added this month (only on biannual months)
  monthlyPayout: number;    // base monthly payout
  balance: number;          // running compounded balance (if reinvest)
}

export interface CalcResult {
  points: PayoutPoint[];
  monthlyReturn: number;
  totalBonus: number;
  totalProfit: number;
  totalProfitShare: number;
  netProfit: number;
  finalValue: number;       // principal + total profit
  effectiveAnnualRoi: number;
  principalReturnedAt: number; // month index
  isProfitShare: boolean;
}

const isProfitSharePlan = (plan: PlanLike) =>
  plan.slug === "profit-share" || plan.profit_share_percent > 0;

export const calculateInvestment = (input: CalcInput): CalcResult => {
  const { plan, amount, durationMonths, compounding, reinvest } = input;
  const months = Math.max(1, durationMonths);
  const principal = Math.max(0, amount);
  const annualRate = (plan.roi_percent || 0) / 100;
  const monthlyRate = annualRate / 12;
  // +1% biannual bonus (paid every 6 months as a one-off boost on principal)
  const biannualBonusPct = 0.01;

  const points: PayoutPoint[] = [];
  let balance = principal;
  let cumulativeReturn = 0;
  let totalBonus = 0;

  for (let m = 1; m <= months; m++) {
    let monthlyPayout = 0;
    let bonus = 0;

    if (compounding === "monthly" && reinvest) {
      const inc = balance * monthlyRate;
      balance += inc;
      monthlyPayout = inc;
    } else if (compounding === "quarterly" && reinvest) {
      if (m % 3 === 0) {
        const inc = balance * (annualRate / 4);
        balance += inc;
        monthlyPayout = inc;
      }
    } else {
      monthlyPayout = principal * monthlyRate;
      balance = principal + monthlyPayout * m;
    }

    // Biannual bonus on month 6, 12, 18 ...
    if (m % 6 === 0) {
      bonus = principal * biannualBonusPct;
      balance += bonus;
      totalBonus += bonus;
    }

    cumulativeReturn += monthlyPayout + bonus;
    points.push({
      month: m,
      cumulativeReturn,
      bonus,
      monthlyPayout,
      balance,
    });
  }

  const monthlyReturn = principal * monthlyRate;
  const totalProfit = cumulativeReturn;
  const finalValue = principal + totalProfit;
  const effectiveAnnualRoi = principal > 0
    ? (totalProfit / principal) * (12 / months) * 100
    : 0;

  // Profit-share simulator (Tier 3)
  const isProfitShare = isProfitSharePlan(plan);
  let totalProfitShare = 0;
  if (isProfitShare && input.profitShareInput) {
    const { webRevenue, marketingRevenue, consultingRevenue } = input.profitShareInput;
    const monthlyShare =
      webRevenue * 0.30 +
      marketingRevenue * 0.20 +
      consultingRevenue * 0.10;
    totalProfitShare = monthlyShare * months;
  }

  const principalReturnedAt = Math.min(
    months,
    Math.max(1, Math.round(plan.lock_period_days / 30)),
  );

  return {
    points,
    monthlyReturn,
    totalBonus,
    totalProfit,
    totalProfitShare,
    netProfit: totalProfit + totalProfitShare,
    finalValue,
    effectiveAnnualRoi,
    principalReturnedAt,
    isProfitShare,
  };
};

export const formatCurrency = (n: number, currency = "USD") => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(Math.round(n));
  } catch {
    return `$${Math.round(n).toLocaleString()}`;
  }
};

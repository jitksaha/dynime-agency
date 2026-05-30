import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface InvestmentPlan {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  min_amount: number;
  max_amount: number | null;
  currency: string;
  roi_percent: number;
  profit_share_percent: number;
  lock_period_days: number;
  payout_frequency: "monthly" | "quarterly" | "yearly" | string;
  risk_level: string;
  tier: string;
  capacity: number | null;
  allocated: number;
  withdrawal_policy: string | null;
  policy_text: string | null;
  highlights: string[];
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
}

export interface InvestSettings {
  hero?: {
    eyebrow?: string;
    title?: string;
    subtitle?: string;
    primary_cta?: string;
    secondary_cta?: string;
    trust_line?: string;
  };
  stats?: { items: { label: string; value: string; sub?: string }[] };
  benefits?: { items: { icon: string; title: string; body: string }[] };
  roadmap?: {
    items: { period: string; title: string; status: "done" | "in_progress" | "upcoming"; body: string }[];
  };
  faq?: { items: { q: string; a: string }[] };
  policy?: { html: string };
  calculator?: {
    default_amount: number;
    default_duration_months: number;
    default_plan_slug: string;
    platform_fee_percent: number;
    compounding_options: string[];
  };
  rules?: {
    min_withdrawal: number;
    withdrawal_fee_percent: number;
    supported_currencies: string[];
    support_email: string;
    kyc_required: boolean;
  };
  targets?: {
    items: InvestmentTarget[];
  };
}

export interface InvestmentTarget {
  slug: string;
  name: string;
  description?: string;
  roi_multiplier: number;
  profit_share_multiplier: number;
  enabled: boolean;
}

export const useInvestmentPlans = (opts?: { includeInactive?: boolean }) =>
  useQuery({
    queryKey: ["investment-plans", opts?.includeInactive ? "all" : "active"],
    queryFn: async () => {
      let q = supabase.from("investment_plans" as any).select("*").order("sort_order", { ascending: true });
      if (!opts?.includeInactive) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      return ((data as any[]) ?? []).map((r) => ({
        ...r,
        highlights: Array.isArray(r.highlights) ? r.highlights : [],
      })) as InvestmentPlan[];
    },
  });

export const useInvestSettings = () =>
  useQuery({
    queryKey: ["invest-settings"],
    queryFn: async (): Promise<InvestSettings> => {
      const { data, error } = await supabase.from("invest_settings" as any).select("key,value");
      if (error) throw error;
      const out: any = {};
      for (const row of (data as any[]) ?? []) out[row.key] = row.value;
      return out as InvestSettings;
    },
  });

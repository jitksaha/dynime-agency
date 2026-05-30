import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STATES, type StateRecord } from "@/data/usa-formation";

export interface UsaStatePricingRow {
  id: string;
  state: string;
  abbr: string;
  llc_formation: number;
  corp_formation: number;
  llc_annual: number;
  llc_annual_label: string;
  corp_annual: number;
  corp_annual_label: string;
  llc_renewal: number;
  corp_renewal: number;
  state_tax_note: string | null;
  franchise_tax: string | null;
  notes: string | null;
  sort_order: number;
  is_active: boolean;
}

/**
 * Loads admin-managed US state pricing. Falls back to the static STATES dataset
 * for fields the DB doesn't yet override (e.g. tax flags, bestFor labels).
 * Returned StateRecord shape is compatible with the existing UI.
 */
export const useUsaStatePricing = () => {
  return useQuery({
    queryKey: ["usa-state-pricing"],
    queryFn: async (): Promise<StateRecord[]> => {
      const { data, error } = await supabase
        .from("usa_state_pricing" as any)
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      const rows = (data as unknown as UsaStatePricingRow[]) ?? [];
      if (rows.length === 0) return STATES;
      const byAbbr = new Map(STATES.map((s) => [s.abbr, s]));
      return rows.map((r) => {
        const base = byAbbr.get(r.abbr);
        return {
          state: r.state,
          abbr: r.abbr,
          llcFormation: Number(r.llc_formation) || 0,
          corpFormation: Number(r.corp_formation) || 0,
          llcAnnual: Number(r.llc_annual) || 0,
          llcAnnualLabel: r.llc_annual_label || `$${r.llc_annual}`,
          corpAnnual: Number(r.corp_annual) || 0,
          corpAnnualLabel: r.corp_annual_label || `$${r.corp_annual}`,
          franchiseTax: r.franchise_tax || base?.franchiseTax || "No",
          stateIncomeTax: base?.stateIncomeTax ?? false,
          corporateTax: base?.corporateTax ?? false,
          salesTax: base?.salesTax ?? false,
          bestFor: base?.bestFor ?? "Standard Business",
          costTier: base?.costTier ?? "Medium",
          notes: r.notes || base?.notes || "",
          popular: base?.popular,
        } satisfies StateRecord;
      });
    },
    staleTime: 60_000,
  });
};

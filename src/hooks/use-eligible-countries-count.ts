import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/db/client";

/**
 * Returns the count of currently eligible (non-blocked) active countries
 * from the country_eligibility table — used for dynamic stats across the site.
 */
export function useEligibleCountriesCount() {
  return useQuery({
    queryKey: ["eligible-countries-count"],
    queryFn: async () => {
      const { count, error } = await (db as any)
        .from("country_eligibility")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .in("status", ["eligible", "review"]);
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 5000,
  });
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_SEO_RULES, mergeRules, type SeoRules } from "@/lib/seo-rules";

export function useSeoRules(): SeoRules {
  const { data } = useQuery({
    queryKey: ["site-settings-row", "seo_rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "seo_rules")
        .maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      let val: any = data?.value;
      while (typeof val === "string") {
        try { val = JSON.parse(val); } catch { break; }
      }
      return mergeRules(val);
    },
    staleTime: 60_000,
  });
  return data ?? DEFAULT_SEO_RULES;
}

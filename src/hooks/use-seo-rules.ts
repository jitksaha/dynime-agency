import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { DEFAULT_SEO_RULES, mergeRules, type SeoRules } from "@/lib/seo-rules";

export function useSeoRules(): SeoRules {
  const { data } = useQuery({
    queryKey: ["site-settings-row", "seo_rules"],
    queryFn: async () => {
      try {
        const res = await apiGet<any>("/cms/site-settings/seo_rules");
        let val: any = res?.value;
        while (typeof val === "string") {
          try { val = JSON.parse(val); } catch { break; }
        }
        return mergeRules(val);
      } catch {
        return DEFAULT_SEO_RULES;
      }
    },
    staleTime: 60_000,
  });
  return data ?? DEFAULT_SEO_RULES;
}

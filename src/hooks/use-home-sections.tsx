import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_HOME_SECTIONS,
  HomeSections,
  mergeHomeSections,
} from "@/lib/home-sections-defaults";

export const HOME_SECTIONS_KEY = "home_sections";

/** Fetch the homepage sections JSON from `site_settings`, merged on defaults. */
export const useHomeSections = () => {
  return useQuery<HomeSections>({
    queryKey: ["home-sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", HOME_SECTIONS_KEY)
        .maybeSingle();
      if (error) throw error;
      // value can be raw JSON or double-encoded string — unwrap defensively
      let raw: any = data?.value ?? null;
      while (typeof raw === "string") {
        try { raw = JSON.parse(raw); } catch { break; }
      }
      return mergeHomeSections(raw);
    },
    staleTime: 1000 * 60,
    placeholderData: DEFAULT_HOME_SECTIONS,
  });
};

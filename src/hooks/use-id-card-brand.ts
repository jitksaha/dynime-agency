import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/db/client";
import {
  ID_CARD_BRAND_KEY,
  DEFAULT_ID_CARD_BRAND,
  mergeBrand,
  type IdCardBrand,
} from "@/lib/id-card-brand";

export const useIdCardBrand = () =>
  useQuery<IdCardBrand>({
    queryKey: ["id-card-brand"],
    queryFn: async () => {
      const { data, error } = await db
        .from("site_settings")
        .select("value")
        .eq("key", ID_CARD_BRAND_KEY)
        .maybeSingle();
      if (error) throw error;
      let raw: any = data?.value ?? null;
      while (typeof raw === "string") {
        try { raw = JSON.parse(raw); } catch { break; }
      }
      return mergeBrand(raw);
    },
    staleTime: 60_000,
    placeholderData: DEFAULT_ID_CARD_BRAND,
  });

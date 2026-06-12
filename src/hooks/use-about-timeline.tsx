import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/db/client";
import {
  ABOUT_TIMELINE_KEY,
  DEFAULT_ABOUT_TIMELINE,
  TimelineItem,
} from "@/lib/about-timeline-defaults";

export const useAboutTimeline = () =>
  useQuery<TimelineItem[]>({
    queryKey: ["about-timeline"],
    queryFn: async () => {
      const { data, error } = await db
        .from("site_settings")
        .select("value")
        .eq("key", ABOUT_TIMELINE_KEY)
        .maybeSingle();
      if (error) throw error;
      let raw: any = data?.value ?? null;
      while (typeof raw === "string") {
        try { raw = JSON.parse(raw); } catch { break; }
      }
      if (Array.isArray(raw) && raw.length > 0) return raw as TimelineItem[];
      return DEFAULT_ABOUT_TIMELINE;
    },
    staleTime: 60_000,
    placeholderData: DEFAULT_ABOUT_TIMELINE,
  });

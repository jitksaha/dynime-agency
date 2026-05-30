import { useMemo } from "react";
import { useSiteSettings } from "./use-data";
import { useSEO, type SEOConfig } from "./use-seo";
import { getRegistryEntry } from "@/lib/page-seo-registry";

/**
 * Drop-in replacement for useSEO that auto-syncs admin-controlled overrides
 * stored in site_settings.page_seo[<key>] = { title, description, keywords, ogImage }.
 *
 * Pass `key` to look up the registry entry; any value the admin saved overrides
 * the per-page defaults below, which themselves override the site-wide fallback.
 */
export const usePageSEO = (key: string, fallback: SEOConfig = {}) => {
  const { data: settings } = useSiteSettings();

  const merged = useMemo<SEOConfig>(() => {
    const entry = getRegistryEntry(key);

    let overrides: Partial<SEOConfig> = {};
    const raw = settings?.page_seo;
    if (raw) {
      try {
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        const o = parsed?.[key];
        if (o && typeof o === "object") {
          overrides = {
            title: o.title || undefined,
            description: o.description || undefined,
            keywords: Array.isArray(o.keywords)
              ? o.keywords
              : typeof o.keywords === "string" && o.keywords.trim()
                ? o.keywords.split(",").map((k: string) => k.trim()).filter(Boolean)
                : undefined,
            ogImage: o.ogImage || undefined,
            ogImageAlt: o.ogImageAlt || undefined,
            ogType: o.ogType || undefined,
            twitterCard: o.twitterCard || undefined,
            noIndex: typeof o.noIndex === "boolean" ? o.noIndex : undefined,
          };
        }
      } catch {
        /* ignore malformed json */
      }
    }

    return {
      ...fallback,
      title: overrides.title ?? fallback.title ?? entry?.defaults.title,
      description: overrides.description ?? fallback.description ?? entry?.defaults.description,
      keywords: overrides.keywords ?? fallback.keywords ?? entry?.defaults.keywords,
      ogImage: overrides.ogImage ?? fallback.ogImage,
      ogImageAlt: overrides.ogImageAlt ?? fallback.ogImageAlt,
      ogType: overrides.ogType ?? fallback.ogType,
      twitterCard: overrides.twitterCard ?? fallback.twitterCard,
      noIndex: overrides.noIndex ?? fallback.noIndex,
    };
  }, [settings?.page_seo, key, JSON.stringify(fallback)]);

  useSEO(merged);
};

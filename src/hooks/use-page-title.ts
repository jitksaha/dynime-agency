import { useSEO } from "./use-seo";

/**
 * Backward-compatible wrapper around useSEO. Existing pages that just need
 * a page title keep working, but they'll automatically pick up canonical URLs,
 * Open Graph / Twitter tags, robots directives, and JSON-LD (Organization,
 * WebSite SearchAction, BreadcrumbList) from useSEO.
 *
 * Prefer importing useSEO directly when you need full control.
 */
export const usePageTitle = (pageTitle?: string) => {
  useSEO({ title: pageTitle });
};

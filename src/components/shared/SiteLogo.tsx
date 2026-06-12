import { useMemo } from "react";
import { useSiteSettings } from "@/hooks/use-data";
import { useTheme } from "@/components/shared/ThemeProvider";
import { readCachedSiteSettings } from "@/lib/site-settings-cache";
import dynimeLogoDark from "@/assets/dynime-logo-dark.webp";
import dynimeLogoLight from "@/assets/dynime-logo-light.webp";

const cachedSettings = readCachedSiteSettings();

interface SiteLogoProps {
  className?: string;
  /** Override the alt text from settings */
  alt?: string;
  /** Force a specific variant; otherwise auto-detected from theme */
  variant?: "light" | "dark" | "auto";
}

/**
 * SiteLogo — the SINGLE shared brand logo component for the entire app.
 *
 * Used by: header, footer, admin/account/super-admin layouts, login pages,
 * invoice PDFs, agreement PDFs, verification page. Pulls runtime overrides
 * from `site_settings` (logo_light / logo_dark / logo_alt) and falls back
 * to bundled SVG assets, so a single update in Admin → Settings rebrands
 * every surface at once.
 *
 * Variant rules:
 *  - "auto" (default) — follows the active ThemeProvider theme.
 *  - "light" — force the light-background variant. Use for white surfaces
 *    that don't react to theme: invoice/agreement PDFs (printed on white),
 *    light-only marketing sections.
 *  - "dark" — force the dark-background variant. Use for dark heroes,
 *    dark-only footers, dark navbars.
 *
 * For email (no React DOM / theme), use the server-side mirror
 * `BrandHeader` from `db/functions/_shared/transactional-email-templates/
 * brand-header.tsx`, which adapts to dark email clients via
 * `prefers-color-scheme`.
 */
const SiteLogo = ({ className, alt, variant = "auto" }: SiteLogoProps) => {
  const { data: settings } = useSiteSettings();
  const { theme } = useTheme();

  const { lightSrc, darkSrc, altText } = useMemo(() => {
    const lightSrc = settings?.logo_light?.trim() || cachedSettings?.logo_light?.trim() || dynimeLogoLight;
    const darkSrc = settings?.logo_dark?.trim() || cachedSettings?.logo_dark?.trim() || dynimeLogoDark;
    const altText = alt || settings?.logo_alt?.trim() || cachedSettings?.logo_alt?.trim() || "Site logo";
    return { lightSrc, darkSrc, altText };
  }, [settings?.logo_light, settings?.logo_dark, settings?.logo_alt, alt]);

  const resolved = variant === "auto" ? theme : variant;
  const src = resolved === "dark" ? darkSrc : lightSrc;

  return (
    <img
      // Stable key per source URL — same custom logo URL ⇒ same DOM node ⇒
      // browser uses its in-memory cache and never re-fetches.
      key={src}
      src={src}
      alt={altText}
      className={className}
      decoding="async"
      // Header logo is above the fold, so prefer eager + high fetch priority
      loading="eager"
      // @ts-expect-error - fetchpriority is a valid HTML attribute
      fetchpriority="high"
      draggable={false}
    />
  );
};

export default SiteLogo;

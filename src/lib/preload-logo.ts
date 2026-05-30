import { readCachedSiteSettings } from "@/lib/site-settings-cache";
import dynimeLogoLight from "@/assets/dynime-logo-light.webp";
import dynimeLogoDark from "@/assets/dynime-logo-dark.webp";

const PRELOAD_ID = "dynime-logo-preload";

export function preloadLogoForTheme(theme?: "light" | "dark") {
  try {
    const isDark =
      theme === "dark" ||
      (theme === undefined && document.documentElement.classList.contains("dark"));
    const cached = readCachedSiteSettings();
    const href = isDark
      ? cached?.logo_dark?.trim() || dynimeLogoDark
      : cached?.logo_light?.trim() || dynimeLogoLight;

    let link = document.getElementById(PRELOAD_ID) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = PRELOAD_ID;
      link.rel = "preload";
      link.as = "image";
      document.head.appendChild(link);
    }
    if (link.href !== new URL(href, window.location.href).href) {
      link.href = href;
    }
    if (href.endsWith(".svg")) link.type = "image/svg+xml";
    else if (href.endsWith(".webp")) link.type = "image/webp";
    else if (href.endsWith(".png")) link.type = "image/png";
    (link as HTMLLinkElement & { fetchPriority?: string }).fetchPriority = "high";
  } catch {
    /* no-op */
  }
}

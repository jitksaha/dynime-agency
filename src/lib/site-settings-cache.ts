export const SITE_SETTINGS_CACHE_KEY = "dynime-site-settings-cache-v2";

export type SiteSettingsMap = Record<string, string>;

/**
 * One-time cleanup: remove the old v1 cache so stale values (e.g. switcher
 * settings saved before the public endpoint fix) never shadow fresh API data.
 */
const cleanupOldCache = () => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("dynime-site-settings-cache-v1");
  } catch { /* ignore */ }
};

cleanupOldCache();

export const readCachedSiteSettings = (): SiteSettingsMap | undefined => {
  if (typeof window === "undefined") return undefined;

  try {
    const raw = localStorage.getItem(SITE_SETTINGS_CACHE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as SiteSettingsMap)
      : undefined;
  } catch {
    return undefined;
  }
};

export const writeCachedSiteSettings = (settings: SiteSettingsMap) => {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(SITE_SETTINGS_CACHE_KEY, JSON.stringify(settings));
  } catch {
    /* ignore storage quota/private mode */
  }
};
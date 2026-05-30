import { useEffect } from "react";
import { useSiteSettings } from "@/hooks/use-data";

/**
 * Updates the document <link rel="icon"> in real time based on
 * `site_settings.favicon_url` (and optional `favicon_dark_url`).
 *
 * Falls back to the bundled /favicon.png shipped in /public.
 * Because `useSiteSettings` is invalidated by realtime sync whenever an
 * admin changes the value, the browser tab icon updates without a reload.
 */
const setFavicon = (id: string, href: string, media?: string) => {
  if (typeof document === "undefined") return;
  let link = document.getElementById(id) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.id = id;
    link.rel = "icon";
    document.head.appendChild(link);
  }
  // Cache-bust so updates are visible immediately
  const sep = href.includes("?") ? "&" : "?";
  link.href = `${href}${sep}v=${Date.now()}`;
  if (media) link.media = media;
};

const DynamicFavicon = () => {
  const { data: settings } = useSiteSettings();

  useEffect(() => {
    const light = settings?.favicon_url?.trim() || "/favicon.png";
    const dark = settings?.favicon_dark_url?.trim() || "/favicon.png";
    setFavicon("app-favicon", light);
    setFavicon("app-favicon-dark", dark, "(prefers-color-scheme: dark)");
  }, [settings?.favicon_url, settings?.favicon_dark_url]);

  return null;
};

export default DynamicFavicon;

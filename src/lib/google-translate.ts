/**
 * Drive Google's free Website Translator widget via cookie + in-page event.
 *
 * Two-pronged approach so translation works whether or not the widget has
 * already mounted:
 *  1. Write the `googtrans` cookie so Google translates on the next page load
 *     (covers route changes and refreshes).
 *  2. Dispatch a `lovable:translate` event that the <GoogleTranslate />
 *     component listens for and applies WITHOUT a reload by triggering the
 *     hidden combo's change handler. This is the SPA-friendly path.
 */
const setCookie = (name: string, value: string, host: string) => {
  const parts = host.split(".");
  const apex = parts.length >= 2 ? parts.slice(-2).join(".") : host;
  document.cookie = `${name}=${value};path=/;max-age=31536000`;
  document.cookie = `${name}=${value};path=/;domain=${host};max-age=31536000`;
  document.cookie = `${name}=${value};path=/;domain=.${apex};max-age=31536000`;
};

const clearCookie = (name: string, host: string) => {
  const parts = host.split(".");
  const apex = parts.length >= 2 ? parts.slice(-2).join(".") : host;
  document.cookie = `${name}=;path=/;max-age=0`;
  document.cookie = `${name}=;path=/;domain=${host};max-age=0`;
  document.cookie = `${name}=;path=/;domain=.${apex};max-age=0`;
};

/** Map our short codes to Google Translate codes. */
const toGoogleCode = (code: string): string => {
  const c = code.toLowerCase();
  if (c === "zh") return "zh-CN";
  return c;
};

/**
 * Switch Google Translate to the given target language.
 * Pass "en" (page source language) to disable translation.
 *
 * We try the in-place SPA path first (dispatch event so the hidden combo
 * re-translates without losing scroll/state). If the widget hasn't mounted
 * yet OR didn't actually apply within a short window, we fall back to a
 * cookie + full reload — Google's most reliable path.
 */
export const setGoogleTranslateLanguage = (target: string) => {
  if (typeof window === "undefined") return;
  const host = window.location.hostname;
  const lang = toGoogleCode(target || "en");

  // Read current googtrans cookie so we can skip no-op updates that would
  // otherwise cause an infinite reload loop on environments where the
  // Google Translate widget never mounts (e.g. Lovable preview iframe).
  const currentCookie = (() => {
    const m = document.cookie.match(/(?:^|;\s*)googtrans=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : "";
  })();
  const desiredCookie = lang === "en" ? "" : `/en/${lang}`;

  if (lang === "en") {
    clearCookie("googtrans", host);
  } else {
    setCookie("googtrans", `/en/${lang}`, host);
  }

  // Try in-place translation first.
  try {
    window.dispatchEvent(new CustomEvent("lovable:translate", { detail: { lang } }));
  } catch {
    /* ignore */
  }

  // Only consider reloading if the cookie actually changed AND we haven't
  // already reloaded for this language in this tab session. This prevents
  // the boot loader from cycling forever when the Google Translate widget
  // isn't available (e.g. inside the Lovable preview iframe).
  if (currentCookie === desiredCookie) return;
  const RELOAD_KEY = "dynime-gt-reloaded";
  let alreadyReloaded = "";
  try { alreadyReloaded = sessionStorage.getItem(RELOAD_KEY) || ""; } catch { /* ignore */ }
  if (alreadyReloaded === lang) return;

  window.setTimeout(() => {
    const html = document.documentElement;
    const translated =
      html.classList.contains("translated-ltr") || html.classList.contains("translated-rtl");
    const wantsTranslate = lang !== "en";
    const wantsOriginal = lang === "en";
    if ((wantsTranslate && !translated) || (wantsOriginal && translated)) {
      try { sessionStorage.setItem(RELOAD_KEY, lang); } catch { /* ignore */ }
      window.location.reload();
    }
  }, 700);
};

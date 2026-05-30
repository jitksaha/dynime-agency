import { useEffect } from "react";

/**
 * Mounts Google's free Website Translator widget (no API key, unlimited use,
 * 100+ languages). The widget itself is visually hidden off-screen but kept
 * in the DOM so its internal <select.goog-te-combo> stays functional. We
 * translate by dispatching a `change` event on that select — no page reload.
 *
 * Also listens for `lovable:translate` window events from setGoogleTranslateLanguage().
 */
const GoogleTranslate = () => {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Apply pending language once the combo exists.
    const applyPending = () => {
      const pending = (window as any).__pendingTranslateLang as string | undefined;
      if (!pending) return;
      const combo = document.querySelector<HTMLSelectElement>(".goog-te-combo");
      if (!combo) return false;
      combo.value = pending;
      combo.dispatchEvent(new Event("change"));
      (window as any).__pendingTranslateLang = undefined;
      return true;
    };

    const onTranslate = (e: Event) => {
      const lang = (e as CustomEvent<{ lang: string }>).detail?.lang || "en";
      (window as any).__pendingTranslateLang = lang;
      // Try immediately; if combo not ready yet, poll briefly.
      if (applyPending() !== true) {
        let tries = 0;
        const t = setInterval(() => {
          tries += 1;
          if (applyPending() === true || tries > 40) clearInterval(t);
        }, 150);
      }
    };
    window.addEventListener("lovable:translate", onTranslate as EventListener);

    if (document.getElementById("google-translate-script")) {
      // Script already loaded (StrictMode remount) — try to apply pending.
      applyPending();
      return () => window.removeEventListener("lovable:translate", onTranslate as EventListener);
    }

    (window as any).googleTranslateElementInit = () => {
      try {
        // eslint-disable-next-line new-cap
        new (window as any).google.translate.TranslateElement(
          {
            pageLanguage: "en",
            autoDisplay: false,
            // Include every supported UI language up front.
            includedLanguages:
              "en,bn,hi,es,fr,de,ar,zh-CN,ja,ko,pt,it,nl,ru,tr,vi,th,id,ms,ur,sv,pl,uk,fa,he,fil",
          },
          "google_translate_element",
        );
        // Try applying any queued translation as soon as widget mounts.
        setTimeout(applyPending, 400);
        setTimeout(applyPending, 1200);
      } catch {
        /* ignore */
      }
    };

    const s = document.createElement("script");
    s.id = "google-translate-script";
    s.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    s.async = true;
    document.body.appendChild(s);

    return () => window.removeEventListener("lovable:translate", onTranslate as EventListener);
  }, []);

  return (
    <>
      {/*
        Keep widget in the DOM (Google needs it) but visually off-screen.
        DO NOT use display:none — that breaks the widget's init.
      */}
      <div
        id="google_translate_element"
        aria-hidden
        style={{
          position: "fixed",
          left: "-9999px",
          top: "-9999px",
          width: 0,
          height: 0,
          overflow: "hidden",
          opacity: 0,
          pointerEvents: "none",
        }}
      />
      {/* Hide Google's top banner + tooltip artifacts; keep gadget itself functional. */}
      <style>{`
        .goog-te-banner-frame.skiptranslate { display: none !important; }
        .goog-tooltip, .goog-tooltip:hover { display: none !important; }
        .goog-text-highlight { background: none !important; box-shadow: none !important; }
        body { top: 0 !important; position: static !important; }
        font[style*="vertical-align"] { background: transparent !important; box-shadow: none !important; }
      `}</style>
    </>
  );
};

export default GoogleTranslate;

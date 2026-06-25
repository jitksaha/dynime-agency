import { useEffect } from "react";
import { useSiteSettings } from "@/hooks/use-data";

const FLAG_ATTR = "data-tracking-pixel";

const clearTracking = () => {
  document.querySelectorAll(`[${FLAG_ATTR}]`).forEach((el) => el.remove());
};

const injectScript = (id: string, type: string, codeFn: (id: string) => void) => {
  if (!id || !id.trim()) return;
  const scriptId = `${FLAG_ATTR}-${type}`;
  if (document.getElementById(scriptId)) return;

  const script = document.createElement("script");
  script.id = scriptId;
  script.setAttribute(FLAG_ATTR, type);
  script.type = "text/javascript";
  
  // Wrap in string execution or text content
  const codeString = `(${codeFn.toString()})("${id.trim()}");`;
  script.text = codeString;
  document.head.appendChild(script);
};

const injectHtml = (html: string, type: "header" | "footer") => {
  if (!html || !html.trim()) return;
  
  const container = document.createElement("div");
  container.setAttribute(FLAG_ATTR, type);
  container.style.display = "none";
  container.innerHTML = html;
  
  // Extract all scripts inside the HTML to run them
  const scripts = container.getElementsByTagName("script");
  for (let i = 0; i < scripts.length; i++) {
    const s = scripts[i];
    const script = document.createElement("script");
    script.setAttribute(FLAG_ATTR, `${type}-script`);
    if (s.src) {
      script.src = s.src;
      script.async = s.async;
      script.defer = s.defer;
    } else {
      script.text = s.textContent || "";
    }
    document.head.appendChild(script);
  }

  // Inject meta/noscript/link tags to head/body
  const otherElements = Array.from(container.children).filter(el => el.tagName !== "SCRIPT");
  otherElements.forEach(el => {
    el.setAttribute(FLAG_ATTR, `${type}-element`);
    if (type === "header") {
      document.head.appendChild(el);
    } else {
      document.body.appendChild(el);
    }
  });
};

const TrackingPixels = () => {
  const { data: settings } = useSiteSettings();

  useEffect(() => {
    // 1. Clear any old tags before injecting updated ones
    clearTracking();

    if (!settings) return;

    // --- Google Site Verification ---
    const verificationId = settings.site_google_site_verification;
    if (verificationId && verificationId.trim()) {
      const meta = document.createElement("meta");
      meta.name = "google-site-verification";
      meta.content = verificationId.trim();
      meta.setAttribute(FLAG_ATTR, "google-verification");
      document.head.appendChild(meta);
    }

    // --- Google Analytics (GA4) ---
    const gaId = settings.site_google_analytics_id;
    if (gaId && gaId.trim()) {
      // Inject external script
      const scriptSrc = document.createElement("script");
      scriptSrc.src = `https://www.googletagmanager.com/gtag/js?id=${gaId.trim()}`;
      scriptSrc.async = true;
      scriptSrc.setAttribute(FLAG_ATTR, "google-analytics-src");
      document.head.appendChild(scriptSrc);

      // Inject configuration script
      const scriptConfig = document.createElement("script");
      scriptConfig.setAttribute(FLAG_ATTR, "google-analytics-config");
      scriptConfig.text = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${gaId.trim()}');
      `;
      document.head.appendChild(scriptConfig);
    }

    // --- Facebook Pixel ---
    const fbId = settings.site_facebook_pixel_id;
    injectScript(fbId, "facebook", (id) => {
      // @ts-ignore
      if (window.fbq) return;
      // @ts-ignore
      const n = window.fbq = function() {
        // @ts-ignore
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      // @ts-ignore
      if (!window._fbq) window._fbq = n;
      n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
      const t = document.createElement("script");
      t.async = !0; t.src = "https://connect.facebook.net/en_US/fbevents.js";
      const s = document.getElementsByTagName("script")[0];
      s.parentNode?.insertBefore(t, s);
      // @ts-ignore
      fbq("init", id);
      // @ts-ignore
      fbq("track", "PageView");
    });
    if (fbId && fbId.trim()) {
      const noscript = document.createElement("noscript");
      noscript.setAttribute(FLAG_ATTR, "facebook-noscript");
      noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${fbId.trim()}&ev=PageView&noscript=1" />`;
      document.body.appendChild(noscript);
    }

    // --- LinkedIn Insight Tag ---
    const liId = settings.site_linkedin_insight_id;
    injectScript(liId, "linkedin", (id) => {
      // @ts-ignore
      window._linkedin_partner_id = id;
      // @ts-ignore
      window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
      // @ts-ignore
      window._linkedin_data_partner_ids.push(id);
      
      const s = document.getElementsByTagName("script")[0];
      const b = document.createElement("script");
      b.type = "text/javascript"; b.async = !0;
      b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
      s.parentNode?.insertBefore(b, s);
    });
    if (liId && liId.trim()) {
      const noscript = document.createElement("noscript");
      noscript.setAttribute(FLAG_ATTR, "linkedin-noscript");
      noscript.innerHTML = `<img height="1" width="1" style="display:none;" alt="" src="https://px.ads.linkedin.com/collect/?pid=${liId.trim()}&fmt=gif" />`;
      document.body.appendChild(noscript);
    }

    // --- X (Twitter) Pixel ---
    const xId = settings.site_twitter_pixel_id;
    injectScript(xId, "x-twitter", (id) => {
      // @ts-ignore
      if (window.twq) return;
      // @ts-ignore
      const s = window.twq = function() {
        // @ts-ignore
        s.exe ? s.exe.apply(s, arguments) : s.queue.push(arguments);
      };
      s.version = "1.1"; s.queue = [];
      const u = document.createElement("script");
      u.async = !0; u.src = "https://static.ads-twitter.com/uwt.js";
      const a = document.getElementsByTagName("script")[0];
      a.parentNode?.insertBefore(u, a);
      // @ts-ignore
      twq("config", id);
    });

    // --- Custom Header & Footer Scripts ---
    injectHtml(settings.site_custom_header_scripts, "header");
    injectHtml(settings.site_custom_footer_scripts, "footer");

    return () => {
      clearTracking();
    };
  }, [settings]);

  return null;
};

export default TrackingPixels;

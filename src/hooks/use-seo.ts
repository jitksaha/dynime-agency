import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSiteSettings } from "@/hooks/use-data";

const SITE_NAME = "Dynime";
const SITE_DOMAIN = typeof window !== "undefined"
  ? `${window.location.protocol}//${window.location.host}`
  : "https://dynimeweb.lovable.app";

const DEFAULT_DESCRIPTION =
  "Global digital agency delivering web, e-commerce, SEO, paid ads, AI software and US/UK company formation. 500+ projects in 25+ countries.";
const FALLBACK_OG_IMAGE = `${SITE_DOMAIN}/og-image.jpg`;

export interface SEOConfig {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  /** Custom alt text for OG / Twitter image. Falls back to `<title> — social preview`. */
  ogImageAlt?: string;
  /** Twitter card style. Defaults to summary_large_image. */
  twitterCard?: "summary" | "summary_large_image" | "app" | "player";
  ogType?: "website" | "article" | "product";
  noIndex?: boolean;
  /** JSON-LD structured data objects */
  jsonLd?: Record<string, any> | Record<string, any>[];
  /** Article-specific */
  articleAuthor?: string;
  articlePublished?: string;
  articleModified?: string;
}

const upsertMeta = (selector: string, attr: "name" | "property", key: string, content: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
};

const removeMeta = (selector: string) => {
  document.head.querySelector(selector)?.remove();
};

const upsertLink = (rel: string, href: string, attrs: Record<string, string> = {}) => {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
  Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v));
};

const SCRIPT_ID_PREFIX = "ld-json-";
const setJsonLd = (data: Record<string, any> | Record<string, any>[]) => {
  // remove previous LD scripts we owned
  document.head
    .querySelectorAll(`script[data-ld="page"]`)
    .forEach((s) => s.remove());

  const arr = Array.isArray(data) ? data : [data];
  arr.forEach((obj, i) => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = `${SCRIPT_ID_PREFIX}${i}`;
    script.dataset.ld = "page";
    script.text = JSON.stringify(obj);
    document.head.appendChild(script);
  });
};

export const useSEO = (config: SEOConfig = {}) => {
  const { pathname } = useLocation();
  const { data: settings } = useSiteSettings();

  useEffect(() => {
    const title = config.title
      ? `${config.title} | ${SITE_NAME}`
      : `${SITE_NAME} — Web, SEO, AI & Formation Agency`;
    const description = config.description || DEFAULT_DESCRIPTION;
    const url = `${SITE_DOMAIN}${pathname}`;
    const siteDefaultOg = (settings?.default_og_image as string | undefined)?.trim();
    const rawOg = config.ogImage || siteDefaultOg || FALLBACK_OG_IMAGE;
    // Twitter and most scrapers require absolute URLs
    const ogImage = /^https?:\/\//i.test(rawOg)
      ? rawOg
      : `${SITE_DOMAIN}${rawOg.startsWith("/") ? "" : "/"}${rawOg}`;
    const twitterHandle =
      (settings?.twitter_handle as string | undefined)?.trim() || "@dynime";
    const imageAlt =
      config.ogImageAlt?.trim() || `${config.title || SITE_NAME} — social preview`;

    // Title
    document.title = title;

    // Canonical + og:url
    upsertLink("canonical", url);
    upsertMeta('meta[property="og:url"]', "property", "og:url", url);

    // Description (incl. OG/Twitter)
    upsertMeta('meta[name="description"]', "name", "description", description);
    upsertMeta('meta[property="og:title"]', "property", "og:title", title);
    upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", title);
    upsertMeta('meta[property="og:description"]', "property", "og:description", description);
    upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
    upsertMeta('meta[property="og:image"]', "property", "og:image", ogImage);
    upsertMeta('meta[property="og:image:secure_url"]', "property", "og:image:secure_url", ogImage);
    const ogImageType = /\.png(\?|$)/i.test(ogImage)
      ? "image/png"
      : /\.webp(\?|$)/i.test(ogImage)
        ? "image/webp"
        : /\.gif(\?|$)/i.test(ogImage)
          ? "image/gif"
          : "image/jpeg";
    upsertMeta('meta[property="og:image:type"]', "property", "og:image:type", ogImageType);
    upsertMeta('meta[property="og:image:width"]', "property", "og:image:width", "1200");
    upsertMeta('meta[property="og:image:height"]', "property", "og:image:height", "630");
    upsertMeta('meta[property="og:image:alt"]', "property", "og:image:alt", imageAlt);
    upsertMeta('meta[name="twitter:image"]', "name", "twitter:image", ogImage);
    upsertMeta('meta[name="twitter:image:src"]', "name", "twitter:image:src", ogImage);
    upsertMeta('meta[name="twitter:image:alt"]', "name", "twitter:image:alt", imageAlt);
    upsertMeta('meta[name="twitter:image:width"]', "name", "twitter:image:width", "1200");
    upsertMeta('meta[name="twitter:image:height"]', "name", "twitter:image:height", "630");
    upsertMeta('meta[name="twitter:url"]', "name", "twitter:url", url);
    upsertMeta('meta[name="twitter:domain"]', "name", "twitter:domain", new URL(SITE_DOMAIN).host);
    upsertMeta('meta[name="twitter:site"]', "name", "twitter:site", twitterHandle);
    upsertMeta('meta[name="twitter:creator"]', "name", "twitter:creator", twitterHandle);
    upsertMeta('meta[property="og:type"]', "property", "og:type", config.ogType || "website");
    upsertMeta('meta[property="og:site_name"]', "property", "og:site_name", SITE_NAME);
    upsertMeta('meta[name="twitter:card"]', "name", "twitter:card", config.twitterCard || "summary_large_image");

    // Robots — allow all bots (incl. AI crawlers) unless noIndex
    const robotsContent = config.noIndex
      ? "noindex, nofollow"
      : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
    upsertMeta('meta[name="robots"]', "name", "robots", robotsContent);
    upsertMeta('meta[name="googlebot"]', "name", "googlebot", robotsContent);
    upsertMeta('meta[name="bingbot"]', "name", "bingbot", robotsContent);

    // Keywords
    if (config.keywords && config.keywords.length > 0) {
      upsertMeta('meta[name="keywords"]', "name", "keywords", config.keywords.join(", "));
    }

    // Article meta
    if (config.ogType === "article") {
      if (config.articleAuthor)
        upsertMeta('meta[property="article:author"]', "property", "article:author", config.articleAuthor);
      if (config.articlePublished)
        upsertMeta(
          'meta[property="article:published_time"]',
          "property",
          "article:published_time",
          config.articlePublished,
        );
      if (config.articleModified)
        upsertMeta(
          'meta[property="article:modified_time"]',
          "property",
          "article:modified_time",
          config.articleModified,
        );
    } else {
      removeMeta('meta[property="article:author"]');
      removeMeta('meta[property="article:published_time"]');
      removeMeta('meta[property="article:modified_time"]');
    }

    // JSON-LD: always include Organization + WebSite, plus page-specific
    const baseLd: Record<string, any>[] = [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": `${SITE_DOMAIN}/#organization`,
        name: SITE_NAME + " Inc.",
        url: SITE_DOMAIN,
        logo: `${SITE_DOMAIN}/favicon.png`,
        sameAs: [],
        description: DEFAULT_DESCRIPTION,
        foundingDate: "2020",
        numberOfEmployees: "25+",
        areaServed: "Worldwide",
        knowsAbout: [
          "Web Development",
          "Digital Marketing",
          "E-commerce",
          "SEO",
          "Business Registration",
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": `${SITE_DOMAIN}/#website`,
        name: SITE_NAME,
        alternateName: [SITE_NAME + " Inc.", "Dynime Agency"],
        url: SITE_DOMAIN,
        publisher: { "@id": `${SITE_DOMAIN}/#organization` },
        inLanguage: "en",
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE_DOMAIN}/blog?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ];

    // Auto BreadcrumbList from path
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length > 0) {
      baseLd.push({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_DOMAIN },
          ...segments.map((seg, i) => ({
            "@type": "ListItem",
            position: i + 2,
            name: seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            item: `${SITE_DOMAIN}/${segments.slice(0, i + 1).join("/")}`,
          })),
        ],
      });
    }

    const extra = config.jsonLd
      ? Array.isArray(config.jsonLd)
        ? config.jsonLd
        : [config.jsonLd]
      : [];
    setJsonLd([...baseLd, ...extra]);
  }, [
    config.title,
    config.description,
    config.ogImage,
    config.ogImageAlt,
    config.twitterCard,
    config.ogType,
    config.noIndex,
    config.keywords?.join("|"),
    JSON.stringify(config.jsonLd),
    config.articleAuthor,
    config.articlePublished,
    config.articleModified,
    pathname,
    settings?.default_og_image,
  ]);
};

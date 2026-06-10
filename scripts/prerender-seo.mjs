/**
 * Build-time SEO prerender.
 *
 * For each known route, writes dist/<route>/index.html with server-rendered
 * <title>, <meta name="description">, og:*, twitter:*, canonical and JSON-LD,
 * so social scrapers (Facebook, WhatsApp, LinkedIn, X, Slack, Google) get
 * correct metadata without executing any JavaScript.
 *
 * The React app still hydrates the same way for human visitors — useSEO will
 * re-apply identical tags on the client, so no UI/UX change.
 */
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const DIST = path.resolve("dist");
const TEMPLATE_PATH = path.join(DIST, "index.html");

if (!existsSync(TEMPLATE_PATH)) {
  console.error("[prerender-seo] dist/index.html missing — run `vite build` first.");
  process.exit(1);
}

const SITE_URL = (process.env.PRERENDER_SITE_URL || "https://dynime.com").replace(/\/$/, "");
const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || "https://isweduliawwjqwhyvwhp.supabase.co").replace(/\/$/, "");
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  "";

const SITE_NAME = "Dynime Inc.";
const SITE_TAGLINE = "Web Development, Digital Marketing & Business Solutions";
const DEFAULT_DESCRIPTION =
  "Founded in 2020, Dynime Inc. is a global digital agency delivering 500+ projects for clients across 25+ countries — web development, digital marketing, e-commerce & business registration.";
const DEFAULT_OG = `${SITE_URL}/og-image.jpg`;

const template = await readFile(TEMPLATE_PATH, "utf8");

// ── Helpers ───────────────────────────────────────────────────────────────
const esc = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

async function safeFetch(url) {
  try {
    const r = await fetch(url, {
      headers: SUPABASE_KEY
        ? { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
        : {},
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

function unwrapJson(v) {
  let cur = v;
  while (typeof cur === "string") {
    try {
      cur = JSON.parse(cur);
    } catch {
      break;
    }
  }
  return cur;
}

// ── Pull admin-managed site settings (for OG image + per-page overrides) ──
const settingsRows = (await safeFetch(`${SUPABASE_URL}/rest/v1/site_settings?select=key,value`)) || [];
const settings = {};
for (const r of settingsRows) settings[r.key] = unwrapJson(r.value);

const SITE_DEFAULT_OG =
  (typeof settings.default_og_image === "string" && settings.default_og_image.trim()) || DEFAULT_OG;
const PAGE_OVERRIDES = (settings.page_seo && typeof settings.page_seo === "object") ? settings.page_seo : {};

// ── Static route catalog (mirrors src/lib/seo-defaults.ts) ────────────────
const STATIC_ROUTES = [
  { path: "/", key: "home", title: "Premium Digital Studio for Iconic Brands", description: "Dynime Inc. partners with ambitious founders and enterprises to design, engineer and scale category-defining digital experiences worldwide." },
  { path: "/about", key: "about", title: "About — A Studio Built on Quiet Craft", description: "A senior, multidisciplinary studio engineering refined digital products for visionary brands — 500+ projects delivered across 25+ countries since 2020." },
  { path: "/services", key: "services", title: "Disciplines — Design, Engineering & Growth", description: "A curated suite of disciplines: product design, web engineering, brand systems, performance marketing and business formation — delivered with singular vision." },
  { path: "/portfolio", key: "portfolio", title: "Selected Work — A Curated Selection", description: "Selected work from a global client roster — refined websites, brand systems and digital products engineered for measurable, lasting impact." },
  { path: "/contact", key: "contact", title: "Begin a Conversation That Matters", description: "Speak with our partners about a refined, ambitious project. We respond personally to every brief — discreet, considered, and on your timeline." },
  { path: "/blog", key: "blog", title: "Journal — Notes on Craft & Strategy", description: "Considered essays on design, engineering and brand strategy from the partners and senior team at Dynime — written for founders and operators." },
  { path: "/careers", key: "careers", title: "Careers — Join a Studio of Senior Craft", description: "Open invitations for senior designers, engineers and strategists. Remote-first, deeply collaborative, and built for people who care about the work." },
  { path: "/products/os", key: "product-dbm", title: "Dynime OS — The AI-Powered Business Operating System", description: "Dynime OS unifies CRM, HRM, Sales, Finance, Projects, Inventory, AI and Support into one intelligent platform — built for growing companies." },
  { path: "/services/dss", key: "services-dss", title: "DSS — Custom Software, AI Apps & QA Engineering", description: "Dynime Software Services: senior-engineered custom software, AI applications and QA — built with discipline, shipped with precision." },
  { path: "/usa-business-formation", key: "usa-formation", title: "USA Company Formation — All 50 States Compared", description: "Compare LLC and Corporation formation fees, annual costs and taxes across all 50 US states. Curated guidance from the Dynime team." },
  { path: "/track", key: "track", title: "Track Your Order", description: "Track the live status of your order, invoice or company formation with Dynime Inc." },
];

// ── Service detail pages — extract slug + meta from src/data/services.ts ──
const servicesSrc = await readFile("src/data/services.ts", "utf8");
const serviceBlocks = [...servicesSrc.matchAll(/\{\s*slug:\s*"([^"]+)"[\s\S]*?metaTitle:\s*"([^"]+)"[\s\S]*?metaDescription:\s*"([^"]+)"/g)];
const serviceRoutes = serviceBlocks.map(([, slug, title, description]) => ({
  path: `/${slug}`,
  key: `service:${slug}`,
  title,
  description,
}));

// ── Dynamic routes from Supabase ──────────────────────────────────────────
const blogPosts =
  (await safeFetch(
    `${SUPABASE_URL}/rest/v1/blog_posts?select=slug,title,excerpt,seo_title,seo_description,cover_image_url,published_at,updated_at,author&is_published=eq.true`,
  )) || [];
const blogRoutes = blogPosts
  .filter((p) => p.slug)
  .map((p) => ({
    path: `/blog/${p.slug}`,
    key: `blog:${p.slug}`,
    title: p.seo_title || p.title,
    description: p.seo_description || p.excerpt || DEFAULT_DESCRIPTION,
    image: p.cover_image_url || undefined,
    ogType: "article",
    articlePublished: p.published_at || undefined,
    articleModified: p.updated_at || undefined,
    articleAuthor: p.author || undefined,
  }));

const careers =
  (await safeFetch(
    `${SUPABASE_URL}/rest/v1/careers?select=slug,title,description,hero_image_url,is_active&is_active=eq.true`,
  )) || [];
const careerRoutes = (Array.isArray(careers) ? careers : [])
  .filter((c) => c?.slug)
  .map((c) => ({
    path: `/careers/${c.slug}`,
    key: `career:${c.slug}`,
    title: c.title,
    description: (c.description || DEFAULT_DESCRIPTION).replace(/<[^>]+>/g, "").slice(0, 300),
    image: c.hero_image_url || undefined,
  }));

const allRoutes = [...STATIC_ROUTES, ...serviceRoutes, ...blogRoutes, ...careerRoutes];

// ── Render template ───────────────────────────────────────────────────────
function applyOverrides(route) {
  const o = PAGE_OVERRIDES[route.key];
  if (!o || typeof o !== "object") return route;
  return {
    ...route,
    title: o.title || route.title,
    description: o.description || route.description,
    image: o.ogImage || route.image,
  };
}

function buildHtml(route) {
  const r = applyOverrides(route);
  const fullTitle = `${r.title} | ${SITE_NAME}`;
  const description = r.description || DEFAULT_DESCRIPTION;
  const url = `${SITE_URL}${r.path === "/" ? "" : r.path}`;
  const ogType = r.ogType || "website";
  const rawImage = r.image || SITE_DEFAULT_OG;
  const image = /^https?:\/\//i.test(rawImage)
    ? rawImage
    : `${SITE_URL}${rawImage.startsWith("/") ? "" : "/"}${rawImage}`;
  const imageAlt = `${r.title} — social preview`;
  const twitterHandle =
    (typeof settings.twitter_handle === "string" && settings.twitter_handle.trim()) || "@dynime";
  const twitterDomain = SITE_URL.replace(/^https?:\/\//, "");

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: fullTitle,
      description,
      inLanguage: "en",
      primaryImageOfPage: { "@type": "ImageObject", url: image },
    },
  ];
  if (ogType === "article") {
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: r.title,
      description,
      image,
      mainEntityOfPage: url,
      datePublished: r.articlePublished,
      dateModified: r.articleModified,
      author: { "@type": "Person", name: r.articleAuthor || SITE_NAME },
      publisher: { "@type": "Organization", name: SITE_NAME, logo: { "@type": "ImageObject", url: `${SITE_URL}/favicon.svg` } },
    });
  }

  let html = template;

  // <title>
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(fullTitle)}</title>`);

  // Replace specific meta + link tags by attribute selector via regex
  const replaceMeta = (attr, key, value) => {
    const re = new RegExp(`<meta\\s+${attr}=["']${key}["'][^>]*>`, "i");
    const tag = `<meta ${attr}="${key}" content="${esc(value)}">`;
    if (re.test(html)) html = html.replace(re, tag);
    else html = html.replace(/<\/head>/i, `    ${tag}\n  </head>`);
  };

  replaceMeta("name", "description", description);
  replaceMeta("property", "og:title", fullTitle);
  replaceMeta("property", "og:description", description);
  replaceMeta("property", "og:url", url);
  replaceMeta("property", "og:type", ogType);
  replaceMeta("property", "og:site_name", SITE_NAME);
  replaceMeta("property", "og:image", image);
  replaceMeta("property", "og:image:secure_url", image);
  replaceMeta("property", "og:image:type", image.endsWith(".png") ? "image/png" : image.endsWith(".webp") ? "image/webp" : "image/jpeg");
  replaceMeta("property", "og:image:width", "1200");
  replaceMeta("property", "og:image:height", "630");
  replaceMeta("property", "og:image:alt", imageAlt);
  replaceMeta("name", "twitter:card", "summary_large_image");
  replaceMeta("name", "twitter:site", twitterHandle);
  replaceMeta("name", "twitter:creator", twitterHandle);
  replaceMeta("name", "twitter:domain", twitterDomain);
  replaceMeta("name", "twitter:url", url);
  replaceMeta("name", "twitter:title", fullTitle);
  replaceMeta("name", "twitter:description", description);
  replaceMeta("name", "twitter:image", image);
  replaceMeta("name", "twitter:image:src", image);
  replaceMeta("name", "twitter:image:alt", imageAlt);
  replaceMeta("name", "twitter:image:width", "1200");
  replaceMeta("name", "twitter:image:height", "630");

  // Canonical link
  const canonicalRe = /<link\s+rel=["']canonical["'][^>]*>/i;
  const canonicalTag = `<link rel="canonical" href="${esc(url)}">`;
  if (canonicalRe.test(html)) html = html.replace(canonicalRe, canonicalTag);
  else html = html.replace(/<\/head>/i, `    ${canonicalTag}\n  </head>`);

  // Article-specific meta
  if (ogType === "article") {
    if (r.articlePublished) replaceMeta("property", "article:published_time", r.articlePublished);
    if (r.articleModified) replaceMeta("property", "article:modified_time", r.articleModified);
    if (r.articleAuthor) replaceMeta("property", "article:author", r.articleAuthor);
  }

  // JSON-LD (replace any existing prerender block, else inject before </head>)
  const ldBlock = jsonLd
    .map(
      (obj) =>
        `<script type="application/ld+json" data-prerender="seo">${JSON.stringify(obj)}</script>`,
    )
    .join("\n    ");
  html = html.replace(/<script[^>]*data-prerender=["']seo["'][^>]*>[\s\S]*?<\/script>\s*/gi, "");
  html = html.replace(/<\/head>/i, `    ${ldBlock}\n  </head>`);

  return html;
}

// ── Write files ───────────────────────────────────────────────────────────
let count = 0;
for (const route of allRoutes) {
  const html = buildHtml(route);
  let outPath;
  if (route.path === "/") {
    outPath = path.join(DIST, "index.html"); // overwrite root
  } else {
    const dir = path.join(DIST, route.path.replace(/^\//, ""));
    await mkdir(dir, { recursive: true });
    outPath = path.join(dir, "index.html");
  }
  await writeFile(outPath, html, "utf8");
  count++;
}

console.log(`[prerender-seo] ✔ Wrote ${count} prerendered route(s) to dist/`);
console.log(`[prerender-seo]   site: ${SITE_URL} | default OG: ${SITE_DEFAULT_OG}`);

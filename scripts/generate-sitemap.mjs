/**
 * Build-time sitemap generator.
 *
 * Writes public/sitemap.xml with:
 *  - Static, indexable routes from src/App.tsx
 *  - Service detail pages from src/data/services.ts
 *  - Published blog posts (+ category/tag taxonomies) from Supabase
 *  - Active career listings from Supabase
 *  - Published dynamic pages (/page/:slug) from Supabase
 *
 * Runs via `predev` and `prebuild` so the file is always fresh.
 */
import { writeFile, readFile } from "node:fs/promises";
import path from "node:path";

const BASE_URL = (process.env.SITEMAP_SITE_URL || "https://dynime.com").replace(/\/$/, "");
const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || "https://isweduliawwjqwhyvwhp.supabase.co").replace(/\/$/, "");
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlzd2VkdWxpYXd3anF3aHl2d2hwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMzU2NTIsImV4cCI6MjA5MjYxMTY1Mn0.I7InCnynzCOzjZPi_IOb3L9pVUJ7YgebDNWuNb6Uu9M";

const today = new Date().toISOString().slice(0, 10);

const STATIC_ROUTES = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/about", changefreq: "monthly", priority: "0.8" },
  { path: "/services", changefreq: "weekly", priority: "0.9" },
  { path: "/services/dss", changefreq: "monthly", priority: "0.8" },
  { path: "/products/os", changefreq: "monthly", priority: "0.8" },
  { path: "/portfolio", changefreq: "weekly", priority: "0.8" },
  { path: "/blog", changefreq: "daily", priority: "0.8" },
  { path: "/contact", changefreq: "monthly", priority: "0.7" },
  { path: "/careers", changefreq: "weekly", priority: "0.7" },
  { path: "/track", changefreq: "yearly", priority: "0.4" },
  { path: "/usa-business-formation", changefreq: "monthly", priority: "0.8" },
  { path: "/pay-open-source", changefreq: "yearly", priority: "0.3" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/refund", changefreq: "yearly", priority: "0.3" },
  { path: "/cookies", changefreq: "yearly", priority: "0.3" },
  { path: "/aml", changefreq: "yearly", priority: "0.3" },
  { path: "/payments", changefreq: "yearly", priority: "0.3" },
  { path: "/support", changefreq: "yearly", priority: "0.3" },
  { path: "/acceptable-use", changefreq: "yearly", priority: "0.3" },
];

async function readServiceSlugs() {
  try {
    const src = await readFile(path.resolve("src/data/services.ts"), "utf8");
    const slugs = [...src.matchAll(/^\s*slug:\s*"([a-z0-9-]+)"/gm)].map((m) => m[1]);
    return [...new Set(slugs)];
  } catch (e) {
    console.warn("[sitemap] could not read service slugs:", e.message);
    return [];
  }
}

async function fetchTable(pathSegment) {
  if (!SUPABASE_KEY) return [];
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathSegment}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!res.ok) {
      console.warn(`[sitemap] ${pathSegment} -> HTTP ${res.status}`);
      return [];
    }
    return await res.json();
  } catch (e) {
    console.warn(`[sitemap] ${pathSegment} fetch failed:`, e.message);
    return [];
  }
}

function urlEntry({ path: p, lastmod, changefreq, priority }) {
  return [
    "  <url>",
    `    <loc>${BASE_URL}${p}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority ? `    <priority>${priority}</priority>` : null,
    "  </url>",
  ].filter(Boolean).join("\n");
}

async function main() {
  const [serviceSlugs, blogPosts, careers, pages] = await Promise.all([
    readServiceSlugs(),
    fetchTable("blog_posts?select=slug,updated_at,category,tags&is_published=eq.true&order=updated_at.desc"),
    fetchTable("careers?select=slug,updated_at&is_active=eq.true"),
    fetchTable("pages?select=slug,updated_at&is_published=eq.true"),
  ]);

  const entries = [...STATIC_ROUTES.map((r) => ({ ...r, lastmod: today }))];

  for (const slug of serviceSlugs) {
    entries.push({ path: `/${slug}`, lastmod: today, changefreq: "monthly", priority: "0.8" });
  }

  const categories = new Set();
  const tags = new Set();
  for (const post of blogPosts) {
    entries.push({
      path: `/blog/${post.slug}`,
      lastmod: (post.updated_at || today).slice(0, 10),
      changefreq: "monthly",
      priority: "0.7",
    });
    if (post.category) categories.add(post.category);
    if (Array.isArray(post.tags)) post.tags.forEach((t) => t && tags.add(t));
  }
  for (const cat of categories) {
    entries.push({ path: `/blog/category/${slugify(cat)}`, lastmod: today, changefreq: "weekly", priority: "0.5" });
  }
  for (const tag of tags) {
    entries.push({ path: `/blog/tag/${slugify(tag)}`, lastmod: today, changefreq: "weekly", priority: "0.5" });
  }

  for (const c of careers) {
    entries.push({
      path: `/careers/${c.slug}`,
      lastmod: (c.updated_at || today).slice(0, 10),
      changefreq: "weekly",
      priority: "0.6",
    });
  }

  for (const pg of pages) {
    if (!pg.slug) continue;
    entries.push({
      path: `/page/${pg.slug}`,
      lastmod: (pg.updated_at || today).slice(0, 10),
      changefreq: "monthly",
      priority: "0.6",
    });
  }

  // De-dupe by loc, keep latest lastmod
  const seen = new Map();
  for (const e of entries) {
    const prev = seen.get(e.path);
    if (!prev || (e.lastmod || "") > (prev.lastmod || "")) seen.set(e.path, e);
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...[...seen.values()].map(urlEntry),
    "</urlset>",
    "",
  ].join("\n");

  await writeFile(path.resolve("public/sitemap.xml"), xml, "utf8");
  console.log(`[sitemap] wrote public/sitemap.xml (${seen.size} URLs)`);
}

function slugify(v) {
  return String(v)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

main().catch((e) => {
  console.error("[sitemap] failed:", e);
  process.exit(1);
});

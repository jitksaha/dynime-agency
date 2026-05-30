// Technical SEO audit: crawls site and surfaces prioritized issues.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireAdmin } from "../_shared/require-admin.ts";

type Severity = "critical" | "high" | "medium" | "low";
type Issue = { id: string; severity: Severity; category: string; title: string; detail: string; url: string; fix: string };

const DEFAULT_ORIGIN = "https://dynime.com";
const MAX_PAGES = 25;
const FETCH_TIMEOUT = 12_000;

async function fetchWithTimeout(url: string, init: RequestInit = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, redirect: "manual", headers: { "User-Agent": "DynimeSEOBot/1.0", ...(init.headers || {}) } });
  } finally {
    clearTimeout(t);
  }
}

function abs(href: string, base: string) {
  try { return new URL(href, base).toString(); } catch { return null; }
}

function attr(tag: string, name: string): string | null {
  const re = new RegExp(`${name}\\s*=\\s*(\\"([^\\"]*)\\"|'([^']*)')`, "i");
  const m = tag.match(re); return m ? (m[2] ?? m[3] ?? "") : null;
}

function parsePage(html: string, url: string) {
  const head = (html.match(/<head[\s\S]*?<\/head>/i)?.[0] || "");
  const body = html.replace(/<head[\s\S]*?<\/head>/i, "");
  const title = (html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "").trim();
  const metas = [...head.matchAll(/<meta\b[^>]*>/gi)].map(m => m[0]);
  const descs = metas.filter(t => (attr(t, "name") || "").toLowerCase() === "description").map(t => attr(t, "content") || "");
  const robots = metas.filter(t => (attr(t, "name") || "").toLowerCase() === "robots").map(t => attr(t, "content") || "");
  const canonicals = [...head.matchAll(/<link\b[^>]*>/gi)].map(m => m[0]).filter(t => (attr(t, "rel") || "").toLowerCase() === "canonical").map(t => attr(t, "href") || "");
  const h1s = [...body.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => m[1].replace(/<[^>]+>/g, "").trim());
  const headings = [...body.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].map(m => ({ level: Number(m[1]), text: m[2].replace(/<[^>]+>/g, "").trim() }));
  const imgs = [...body.matchAll(/<img\b[^>]*>/gi)].map(m => m[0]);
  const imgsNoAlt = imgs.filter(t => !attr(t, "alt") && !/alt\s*=/.test(t)).length;
  const links = [...body.matchAll(/<a\b[^>]*href\s*=\s*(\\"([^\\"#]*)\\"|'([^'#]*)')[^>]*>/gi)].map(m => m[2] ?? m[3] ?? "").filter(Boolean);
  const blockingScripts = [...head.matchAll(/<script\b[^>]*>/gi)].map(m => m[0]).filter(t => attr(t, "src") && !/(async|defer|type\s*=\s*["']module)/i.test(t));
  const blockingStyles = [...head.matchAll(/<link\b[^>]*>/gi)].map(m => m[0]).filter(t => (attr(t, "rel") || "").toLowerCase() === "stylesheet" && !/media\s*=\s*["'](?:print|\(prefers)/i.test(t));
  const ogTitle = metas.find(t => (attr(t, "property") || "").toLowerCase() === "og:title");
  const ogImage = metas.find(t => (attr(t, "property") || "").toLowerCase() === "og:image");
  const viewport = metas.find(t => (attr(t, "name") || "").toLowerCase() === "viewport");
  const lang = html.match(/<html\b[^>]*\blang\s*=\s*(\\"([^\\"]*)\\"|'([^']*)')/i);
  return { url, title, descs, robots, canonicals, h1s, headings, imgsTotal: imgs.length, imgsNoAlt, links, blockingScripts: blockingScripts.length, blockingStyles: blockingStyles.length, hasOgTitle: !!ogTitle, hasOgImage: !!ogImage, hasViewport: !!viewport, lang: lang?.[2] ?? lang?.[3] ?? null };
}

async function discoverUrls(origin: string): Promise<string[]> {
  const urls = new Set<string>([origin + "/"]);
  try {
    const r = await fetchWithTimeout(origin + "/sitemap.xml");
    if (r.ok) {
      const xml = await r.text();
      for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/gi)) {
        const u = m[1].trim();
        if (u.startsWith(origin)) urls.add(u);
        if (urls.size >= MAX_PAGES) break;
      }
    }
  } catch (_) { /* ignore */ }
  return [...urls].slice(0, MAX_PAGES);
}

async function checkLink(url: string): Promise<{ status: number; ok: boolean; redirected?: string } | null> {
  try {
    let r = await fetchWithTimeout(url, { method: "HEAD" });
    if (r.status === 405 || r.status === 501) r = await fetchWithTimeout(url, { method: "GET" });
    const loc = r.headers.get("location");
    return { status: r.status, ok: r.status >= 200 && r.status < 400, redirected: loc ? abs(loc, url) || undefined : undefined };
  } catch { return { status: 0, ok: false }; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // SECURITY: admin only — accepts caller-supplied origin and fetches URLs (SSRF risk).
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const origin = (body.origin as string | undefined)?.replace(/\/$/, "") || DEFAULT_ORIGIN;
    const maxPages = Math.min(Number(body.maxPages) || MAX_PAGES, 50);

    const urls = (await discoverUrls(origin)).slice(0, maxPages);
    const issues: Issue[] = [];
    const pages: any[] = [];
    const titleMap = new Map<string, string[]>();
    const descMap = new Map<string, string[]>();
    const externalLinks = new Set<string>();
    const internalLinks = new Set<string>();

    for (const u of urls) {
      try {
        const r = await fetchWithTimeout(u);
        const ct = r.headers.get("content-type") || "";
        if (!r.ok) {
          issues.push({ id: `status-${u}`, severity: r.status >= 500 ? "critical" : "high", category: "Status", title: `Page returned ${r.status}`, detail: `${u} responded with HTTP ${r.status}`, url: u, fix: "Investigate the route or server config so this page returns 200." });
          pages.push({ url: u, status: r.status });
          continue;
        }
        if (!ct.includes("text/html")) { pages.push({ url: u, status: r.status, note: "non-html" }); continue; }
        const html = await r.text();
        const p = parsePage(html, u);
        pages.push({ url: u, status: r.status, title: p.title, h1Count: p.h1s.length, imgsNoAlt: p.imgsNoAlt });

        // Title
        if (!p.title) issues.push({ id: `title-missing-${u}`, severity: "high", category: "Meta", title: "Missing <title>", detail: u, url: u, fix: "Add a unique 30–60 char <title> for this page." });
        else {
          if (p.title.length < 20) issues.push({ id: `title-short-${u}`, severity: "medium", category: "Meta", title: "Title too short", detail: `"${p.title}" (${p.title.length} chars)`, url: u, fix: "Expand the title to ~50–60 characters with primary keyword." });
          if (p.title.length > 65) issues.push({ id: `title-long-${u}`, severity: "low", category: "Meta", title: "Title may truncate in SERP", detail: `${p.title.length} chars`, url: u, fix: "Trim the title under 60 characters." });
          const arr = titleMap.get(p.title) || []; arr.push(u); titleMap.set(p.title, arr);
        }

        // Description
        if (p.descs.length === 0) issues.push({ id: `desc-missing-${u}`, severity: "high", category: "Meta", title: "Missing meta description", detail: u, url: u, fix: "Add a unique 70–155 char meta description." });
        else {
          if (p.descs.length > 1) issues.push({ id: `desc-dup-${u}`, severity: "medium", category: "Meta", title: "Duplicate meta description tags", detail: `${p.descs.length} description tags found`, url: u, fix: "Keep only one <meta name=\"description\"> per page." });
          const d = p.descs[0];
          if (d.length < 50) issues.push({ id: `desc-short-${u}`, severity: "low", category: "Meta", title: "Meta description too short", detail: `${d.length} chars`, url: u, fix: "Expand description to 70–155 chars." });
          if (d.length > 170) issues.push({ id: `desc-long-${u}`, severity: "low", category: "Meta", title: "Meta description too long", detail: `${d.length} chars`, url: u, fix: "Trim description under 160 chars." });
          const arr = descMap.get(d) || []; arr.push(u); descMap.set(d, arr);
        }

        // Canonical
        if (p.canonicals.length === 0) issues.push({ id: `canon-missing-${u}`, severity: "medium", category: "Meta", title: "Missing canonical link", detail: u, url: u, fix: "Add <link rel=\"canonical\" href=\"…\"> pointing to the preferred URL." });
        if (p.canonicals.length > 1) issues.push({ id: `canon-dup-${u}`, severity: "high", category: "Meta", title: "Multiple canonical tags", detail: `${p.canonicals.length} canonicals`, url: u, fix: "Keep exactly one canonical link per page." });

        // Headings
        if (p.h1s.length === 0) issues.push({ id: `h1-missing-${u}`, severity: "high", category: "Headings", title: "Missing <h1>", detail: u, url: u, fix: "Add a single descriptive <h1> for the page." });
        if (p.h1s.length > 1) issues.push({ id: `h1-multi-${u}`, severity: "medium", category: "Headings", title: "Multiple <h1> tags", detail: `${p.h1s.length} h1 elements`, url: u, fix: "Use exactly one <h1>; demote others to <h2>/<h3>." });
        // Heading order skips
        let prev = 0; for (const h of p.headings) { if (prev && h.level > prev + 1) { issues.push({ id: `h-skip-${u}-${h.level}`, severity: "low", category: "Headings", title: `Heading level skips h${prev}→h${h.level}`, detail: h.text.slice(0, 80), url: u, fix: "Maintain sequential heading levels for accessibility & SEO." }); break; } prev = h.level; }

        // Images
        if (p.imgsNoAlt > 0) issues.push({ id: `img-alt-${u}`, severity: "medium", category: "Accessibility", title: `${p.imgsNoAlt} image(s) missing alt`, detail: `of ${p.imgsTotal} <img> tags`, url: u, fix: "Add descriptive alt text (use alt=\"\" for purely decorative images)." });

        // Render-blocking
        if (p.blockingScripts > 0) issues.push({ id: `block-js-${u}`, severity: "medium", category: "Performance", title: `${p.blockingScripts} render-blocking script(s)`, detail: "Synchronous <script src> in <head>", url: u, fix: "Add async/defer or move scripts before </body>." });
        if (p.blockingStyles > 3) issues.push({ id: `block-css-${u}`, severity: "low", category: "Performance", title: `${p.blockingStyles} render-blocking stylesheets`, detail: "Many CSS files in <head>", url: u, fix: "Combine CSS or inline critical styles." });

        // Misc
        if (!p.hasViewport) issues.push({ id: `viewport-${u}`, severity: "high", category: "Mobile", title: "Missing viewport meta", detail: u, url: u, fix: "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">." });
        if (!p.lang) issues.push({ id: `lang-${u}`, severity: "low", category: "Accessibility", title: "Missing <html lang>", detail: u, url: u, fix: "Set lang attribute on <html> (e.g. lang=\"en\")." });
        if (!p.hasOgTitle || !p.hasOgImage) issues.push({ id: `og-${u}`, severity: "low", category: "Social", title: "Incomplete Open Graph tags", detail: `${p.hasOgTitle ? "" : "og:title "}${p.hasOgImage ? "" : "og:image"}`.trim(), url: u, fix: "Add og:title and og:image for richer social previews." });
        if (p.robots.some(r => /noindex/i.test(r))) issues.push({ id: `noindex-${u}`, severity: "critical", category: "Indexing", title: "Page set to noindex", detail: p.robots.join("; "), url: u, fix: "Remove noindex if this page should appear in Google." });

        // Collect links
        for (const href of p.links) {
          const a = abs(href, u); if (!a) continue;
          if (a.startsWith(origin)) internalLinks.add(a.split("#")[0]); else if (/^https?:/.test(a)) externalLinks.add(a);
        }
      } catch (e) {
        issues.push({ id: `fetch-${u}`, severity: "high", category: "Status", title: "Failed to fetch page", detail: String((e as Error).message), url: u, fix: "Check network/SSL and that the URL is reachable." });
      }
    }

    // Duplicates across pages
    for (const [t, urls] of titleMap) if (urls.length > 1) issues.push({ id: `dup-title-${t}`, severity: "high", category: "Duplicates", title: "Duplicate <title> across pages", detail: `"${t}" used on ${urls.length} pages`, url: urls[0], fix: "Make each page title unique to avoid keyword cannibalization." });
    for (const [d, urls] of descMap) if (urls.length > 1) issues.push({ id: `dup-desc-${d.slice(0, 40)}`, severity: "medium", category: "Duplicates", title: "Duplicate meta descriptions", detail: `Used on ${urls.length} pages`, url: urls[0], fix: "Write unique meta descriptions for each page." });

    // Broken link checks (sample to keep latency reasonable)
    const linkSample = [...internalLinks, ...[...externalLinks].slice(0, 20)].slice(0, 60);
    const linkResults = await Promise.all(linkSample.map(async (l) => ({ url: l, ...(await checkLink(l)) })));
    for (const lr of linkResults) {
      if (!lr || lr.ok) continue;
      issues.push({ id: `broken-${lr.url}`, severity: lr.status === 0 ? "high" : (lr.status >= 500 ? "high" : "medium"), category: "Broken Links", title: lr.status === 0 ? "Link unreachable" : `Link returns ${lr.status}`, detail: lr.url + (lr.redirected ? ` → ${lr.redirected}` : ""), url: lr.url, fix: lr.status >= 300 && lr.status < 400 ? "Update to the final destination URL to skip the redirect hop." : "Fix or remove the broken link." });
    }
    // 3xx (still ok) — flag as low
    for (const lr of linkResults) {
      if (lr && lr.ok && lr.status >= 300 && lr.status < 400) issues.push({ id: `redir-${lr.url}`, severity: "low", category: "Redirects", title: `Redirect chain ${lr.status}`, detail: `${lr.url} → ${lr.redirected ?? "?"}`, url: lr.url, fix: "Link directly to the final URL to avoid redirect overhead." });
    }

    const sevRank: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    issues.sort((a, b) => sevRank[a.severity] - sevRank[b.severity]);

    const summary = {
      pagesScanned: pages.length,
      linksChecked: linkResults.length,
      counts: {
        critical: issues.filter(i => i.severity === "critical").length,
        high: issues.filter(i => i.severity === "high").length,
        medium: issues.filter(i => i.severity === "medium").length,
        low: issues.filter(i => i.severity === "low").length,
      },
    };

    return new Response(JSON.stringify({ origin, checkedAt: new Date().toISOString(), summary, issues, pages }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

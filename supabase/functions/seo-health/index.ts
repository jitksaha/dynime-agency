// SEO health checker — fetches sitemap.xml and robots.txt server-side,
// follows redirects manually, and returns status codes + warnings.
import { requireAdmin } from "../_shared/require-admin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RedirectHop {
  url: string;
  status: number;
  location?: string;
}

interface CheckResult {
  url: string;
  ok: boolean;
  finalUrl: string;
  finalStatus: number;
  redirects: RedirectHop[];
  contentType?: string;
  contentLength?: number;
  responseTimeMs: number;
  body?: string;
  warnings: string[];
  error?: string;
  checkedAt: string;
}

async function fetchWithRedirects(url: string, maxHops = 5): Promise<CheckResult> {
  const start = Date.now();
  const redirects: RedirectHop[] = [];
  const warnings: string[] = [];
  let current = url;
  let finalStatus = 0;
  let finalRes: Response | null = null;

  try {
    for (let i = 0; i <= maxHops; i++) {
      const res = await fetch(current, {
        redirect: "manual",
        headers: { "User-Agent": "Dynime-SEO-Health/1.0 (+https://dynime.com)" },
      });
      finalStatus = res.status;
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location") || undefined;
        redirects.push({ url: current, status: res.status, location: loc });
        if (!loc) {
          warnings.push(`Redirect ${res.status} at ${current} but no Location header`);
          finalRes = res;
          break;
        }
        current = new URL(loc, current).toString();
        if (i === maxHops) {
          warnings.push(`Too many redirects (>${maxHops})`);
        }
        continue;
      }
      finalRes = res;
      break;
    }

    const body = finalRes ? await finalRes.text() : "";
    const contentType = finalRes?.headers.get("content-type") || undefined;
    const contentLength = body.length;

    if (redirects.length > 0) {
      warnings.push(`${redirects.length} redirect hop${redirects.length > 1 ? "s" : ""} before final URL`);
    }
    if (finalStatus >= 400) warnings.push(`HTTP ${finalStatus} — page is not reachable`);
    if (finalStatus >= 200 && finalStatus < 300 && contentLength === 0) {
      warnings.push("Empty response body");
    }

    return {
      url,
      ok: finalStatus >= 200 && finalStatus < 300,
      finalUrl: current,
      finalStatus,
      redirects,
      contentType,
      contentLength,
      responseTimeMs: Date.now() - start,
      body,
      warnings,
      checkedAt: new Date().toISOString(),
    };
  } catch (e) {
    return {
      url,
      ok: false,
      finalUrl: current,
      finalStatus: 0,
      redirects,
      responseTimeMs: Date.now() - start,
      warnings,
      error: e instanceof Error ? e.message : String(e),
      checkedAt: new Date().toISOString(),
    };
  }
}

function analyzeSitemap(r: CheckResult) {
  if (!r.ok || !r.body) return;
  const body = r.body;
  if (!body.includes("<urlset") && !body.includes("<sitemapindex")) {
    r.warnings.push("Body doesn't look like XML sitemap (no <urlset> or <sitemapindex>)");
  }
  if (r.contentType && !/xml/i.test(r.contentType)) {
    r.warnings.push(`Content-Type is "${r.contentType}", expected application/xml`);
  }
  const urlCount = (body.match(/<url>/g) || []).length;
  const sitemapCount = (body.match(/<sitemap>/g) || []).length;
  if (urlCount === 0 && sitemapCount === 0) r.warnings.push("Sitemap contains 0 URLs");
  if (urlCount > 50000) r.warnings.push(`${urlCount} URLs — exceeds Google's 50,000 per file limit`);
  if (body.length > 50 * 1024 * 1024) r.warnings.push("Sitemap exceeds 50MB limit");
  // attach extracted stats by stuffing into body field replaced later
  (r as any).stats = { urls: urlCount, sitemaps: sitemapCount };
}

function analyzeRobots(r: CheckResult, origin: string) {
  if (!r.ok || !r.body) return;
  const body = r.body;
  const lines = body.split("\n").map((l) => l.trim());
  const hasSitemap = lines.some((l) => /^sitemap:/i.test(l));
  const hasDisallowAll = lines.some((l) => /^disallow:\s*\/\s*$/i.test(l));
  const hasUserAgent = lines.some((l) => /^user-agent:/i.test(l));

  if (!hasUserAgent) r.warnings.push("No User-agent directive found");
  if (!hasSitemap) r.warnings.push("No Sitemap: directive — search engines may not discover sitemap.xml");
  if (hasDisallowAll) r.warnings.push("⚠ Disallow: / found — entire site is blocked from crawlers");
  if (r.contentType && !/text\/plain/i.test(r.contentType)) {
    r.warnings.push(`Content-Type is "${r.contentType}", expected text/plain`);
  }
  (r as any).stats = {
    hasSitemap,
    hasDisallowAll,
    sitemapDirectives: lines.filter((l) => /^sitemap:/i.test(l)).map((l) => l.replace(/^sitemap:\s*/i, "")),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // SECURITY: admin only — accepts caller-supplied origin (SSRF risk).
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }



  try {
    const { origin } = await req.json().catch(() => ({ origin: "https://dynime.com" }));
    const base = (origin || "https://dynime.com").replace(/\/$/, "");

    const [sitemap, robots, home] = await Promise.all([
      fetchWithRedirects(`${base}/sitemap.xml`),
      fetchWithRedirects(`${base}/robots.txt`),
      fetchWithRedirects(`${base}/`),
    ]);

    analyzeSitemap(sitemap);
    analyzeRobots(robots, base);

    // Trim bodies before sending
    const trim = (r: CheckResult) => ({ ...r, body: r.body ? r.body.slice(0, 4000) : undefined });

    return new Response(
      JSON.stringify({
        origin: base,
        checkedAt: new Date().toISOString(),
        results: {
          sitemap: trim(sitemap),
          robots: trim(robots),
          home: trim(home),
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

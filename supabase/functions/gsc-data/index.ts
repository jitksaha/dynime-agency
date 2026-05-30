import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";

async function gsc(path: string, init: RequestInit = {}) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const GSC_KEY = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
  if (!GSC_KEY) throw new Error("GOOGLE_SEARCH_CONSOLE_API_KEY not configured (connect Google Search Console)");

  const res = await fetch(`${GATEWAY}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": GSC_KEY,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let data: unknown;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) {
    throw new Error(`GSC ${res.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`);
  }
  return data;
}

async function requireAdmin(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("Unauthorized");
  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
  const { data: userData, error: uErr } = await supa.auth.getUser(token);
  if (uErr || !userData?.user) throw new Error("Unauthorized");
  const { data: roles } = await supa
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id);
  const ok = (roles || []).some((r: any) => ["super_admin", "manager"].includes(r.role));
  if (!ok) throw new Error("Forbidden: super_admin or manager required");
}

const CACHEABLE = new Set(["sites", "searchAnalytics", "sitemaps"]);
const DEFAULT_TTL = 600; // 10 minutes

function cacheKey(action: string, body: Record<string, unknown>) {
  const norm = {
    action,
    siteUrl: body.siteUrl ?? null,
    dimensions: body.dimensions ?? null,
    startDate: body.startDate ?? null,
    endDate: body.endDate ?? null,
    rowLimit: body.rowLimit ?? null,
  };
  return JSON.stringify(norm);
}

function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    await requireAdmin(req);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = body.action || "sites";
    const siteUrl: string | undefined = body.siteUrl;
    const ttl: number = Number.isFinite(body.maxAgeSec) ? Math.max(0, body.maxAgeSec) : DEFAULT_TTL;
    const force: boolean = body.force === true;
    const enc = (s: string) => encodeURIComponent(s);

    const supa = adminClient();

    // Try cache first for read-only actions
    if (CACHEABLE.has(action) && !force && ttl > 0) {
      const key = cacheKey(action, body);
      const { data: row } = await supa
        .from("gsc_cache")
        .select("payload, fetched_at")
        .eq("cache_key", key)
        .maybeSingle();
      if (row) {
        const ageSec = (Date.now() - new Date(row.fetched_at).getTime()) / 1000;
        if (ageSec < ttl) {
          return new Response(
            JSON.stringify({ ok: true, data: row.payload, cached: true, fetchedAt: row.fetched_at, ageSec }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
    }

    let result: unknown;

    if (action === "sites") {
      result = await gsc(`/webmasters/v3/sites`);
    } else if (action === "searchAnalytics") {
      if (!siteUrl) throw new Error("siteUrl required");
      const dimensions: string[] = body.dimensions || ["query"];
      const startDate: string = body.startDate;
      const endDate: string = body.endDate;
      const rowLimit: number = body.rowLimit || 25;
      result = await gsc(`/webmasters/v3/sites/${enc(siteUrl)}/searchAnalytics/query`, {
        method: "POST",
        body: JSON.stringify({ startDate, endDate, dimensions, rowLimit }),
      });
    } else if (action === "sitemaps") {
      if (!siteUrl) throw new Error("siteUrl required");
      result = await gsc(`/webmasters/v3/sites/${enc(siteUrl)}/sitemaps`);
    } else if (action === "submitSitemap") {
      if (!siteUrl || !body.feedpath) throw new Error("siteUrl and feedpath required");
      await gsc(`/webmasters/v3/sites/${enc(siteUrl)}/sitemaps/${enc(body.feedpath)}`, { method: "PUT" });
      // invalidate sitemap cache for this site
      await supa.from("gsc_cache").delete().like("cache_key", `%"action":"sitemaps"%${siteUrl}%`);
      result = { ok: true };
    } else if (action === "addSite") {
      if (!siteUrl) throw new Error("siteUrl required");
      await gsc(`/webmasters/v3/sites/${enc(siteUrl)}`, { method: "PUT" });
      await supa.from("gsc_cache").delete().like("cache_key", `%"action":"sites"%`);
      result = { ok: true };
    } else if (action === "verifyToken") {
      if (!siteUrl) throw new Error("siteUrl required");
      result = await gsc(`/siteVerification/v1/token`, {
        method: "POST",
        body: JSON.stringify({ site: { identifier: siteUrl, type: "SITE" }, verificationMethod: "META" }),
      });
    } else if (action === "verifySite") {
      if (!siteUrl) throw new Error("siteUrl required");
      result = await gsc(`/siteVerification/v1/webResource?verificationMethod=META`, {
        method: "POST",
        body: JSON.stringify({ site: { identifier: siteUrl, type: "SITE" } }),
      });
    } else if (action === "purgeCache") {
      // Scope: optional siteUrl and date range. With no scope, purges everything.
      const { startDate, endDate } = body as { startDate?: string; endDate?: string };
      let q = supa.from("gsc_cache").delete({ count: "exact" }).neq("cache_key", "");
      if (siteUrl) q = q.like("cache_key", `%${JSON.stringify(siteUrl).slice(1, -1)}%`);
      if (startDate) q = q.like("cache_key", `%"startDate":"${startDate}"%`);
      if (endDate) q = q.like("cache_key", `%"endDate":"${endDate}"%`);
      const { count, error: delErr } = await q;
      if (delErr) throw delErr;
      result = { ok: true, purged: count ?? 0, scope: { siteUrl: siteUrl ?? null, startDate: startDate ?? null, endDate: endDate ?? null } };
    } else {
      throw new Error(`Unknown action: ${action}`);
    }

    const fetchedAt = new Date().toISOString();
    if (CACHEABLE.has(action)) {
      const key = cacheKey(action, body);
      await supa.from("gsc_cache").upsert(
        { cache_key: key, payload: result as any, fetched_at: fetchedAt },
        { onConflict: "cache_key" },
      );
    }

    return new Response(JSON.stringify({ ok: true, data: result, cached: false, fetchedAt }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = /Unauthorized/i.test(msg) ? 401 : /Forbidden/i.test(msg) ? 403 : 500;
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

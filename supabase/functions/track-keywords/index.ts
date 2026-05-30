// Keyword rank tracker — pulls per-keyword position data from Google Search Console
// and stores a daily snapshot in keyword_rank_history.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";

async function gsc(path: string, init: RequestInit = {}) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const GSC_KEY = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
  if (!GSC_KEY) throw new Error("GOOGLE_SEARCH_CONSOLE_API_KEY not configured");

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
  let data: any;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(`GSC ${res.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`);
  return data;
}

function admin() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

async function requireAdminUser(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("Unauthorized");
  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
  const { data: userData, error } = await supa.auth.getUser(token);
  if (error || !userData?.user) throw new Error("Unauthorized");
  const { data: roles } = await supa.from("user_roles").select("role").eq("user_id", userData.user.id);
  const ok = (roles || []).some((r: any) => ["super_admin", "manager"].includes(r.role));
  if (!ok) throw new Error("Forbidden");
  return userData.user;
}

function dateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function fetchKeywordRank(siteUrl: string, keyword: string, country?: string | null, device?: string | null) {
  // Pull last 7 days, exact-match keyword filter, dimension by query+page
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 2); // GSC lags by ~2 days
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 6);

  const filters: any[] = [
    { dimension: "query", operator: "equals", expression: keyword.toLowerCase() },
  ];
  if (country) filters.push({ dimension: "country", operator: "equals", expression: country.toLowerCase() });
  if (device) filters.push({ dimension: "device", operator: "equals", expression: device.toLowerCase() });

  const body: any = {
    startDate: dateStr(start),
    endDate: dateStr(end),
    dimensions: ["page"],
    rowLimit: 5,
    dimensionFilterGroups: [{ filters }],
  };

  const path = `/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const res = await gsc(path, { method: "POST", body: JSON.stringify(body) });
  const rows = (res.rows || []) as any[];
  if (rows.length === 0) {
    return { position: null, impressions: 0, clicks: 0, ctr: 0, top_page: null };
  }
  // Best (lowest position) row wins
  const best = rows.reduce((a, b) => (a.position <= b.position ? a : b));
  // Aggregate impressions/clicks
  const impressions = rows.reduce((s, r) => s + (r.impressions || 0), 0);
  const clicks = rows.reduce((s, r) => s + (r.clicks || 0), 0);
  return {
    position: best.position,
    impressions,
    clicks,
    ctr: impressions > 0 ? clicks / impressions : 0,
    top_page: best.keys?.[0] ?? null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    await requireAdminUser(req);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = body.action || "refresh";
    const supa = admin();

    if (action === "refresh") {
      // Refresh rank for one keyword (body.keywordId) or all active keywords
      let q = supa.from("tracked_keywords").select("*").eq("is_active", true);
      if (body.keywordId) q = q.eq("id", body.keywordId);
      const { data: keywords, error } = await q;
      if (error) throw error;

      const today = dateStr(new Date());
      const results: any[] = [];

      for (const kw of (keywords || [])) {
        try {
          const snap = await fetchKeywordRank(kw.site_url, kw.keyword, kw.country, kw.device);
          const { error: insErr } = await supa
            .from("keyword_rank_history")
            .upsert({
              keyword_id: kw.id,
              position: snap.position,
              impressions: snap.impressions,
              clicks: snap.clicks,
              ctr: snap.ctr,
              top_page: snap.top_page,
              captured_for: today,
              captured_at: new Date().toISOString(),
            }, { onConflict: "keyword_id,captured_for" });
          if (insErr) throw insErr;
          results.push({ keyword: kw.keyword, ok: true, ...snap });
        } catch (e) {
          results.push({ keyword: kw.keyword, ok: false, error: e instanceof Error ? e.message : String(e) });
        }
      }

      return new Response(JSON.stringify({ refreshed: results.length, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    const status = /unauth/i.test(msg) ? 401 : /forbid/i.test(msg) ? 403 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

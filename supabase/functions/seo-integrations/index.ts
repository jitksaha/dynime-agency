// SEO integrations status & test runner: GSC, Firecrawl, Semrush.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function requireAdmin(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth) throw new Error("Unauthorized");
  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: u } = await supa.auth.getUser();
  if (!u.user) throw new Error("Unauthorized");
  const { data: roles } = await supa.from("user_roles").select("role").eq("user_id", u.user.id);
  if (!(roles || []).some((r: any) => ["super_admin", "manager"].includes(r.role))) {
    throw new Error("Forbidden");
  }
}

async function testGsc() {
  const lk = Deno.env.get("LOVABLE_API_KEY"), gk = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY");
  if (!lk || !gk) return { ok: false, configured: false, error: "Connector not linked", latencyMs: 0 };
  const t0 = Date.now();
  try {
    const r = await fetch("https://connector-gateway.lovable.dev/google_search_console/webmasters/v3/sites", {
      headers: { Authorization: `Bearer ${lk}`, "X-Connection-Api-Key": gk },
    });
    const j = await r.json().catch(() => ({}));
    const sites = (j.siteEntry || []).filter((s: any) => s.permissionLevel !== "siteUnverifiedUser");
    return { ok: r.ok, configured: true, latencyMs: Date.now() - t0, status: r.status,
      detail: r.ok ? `${sites.length} verified site(s)` : (j.error?.message || `HTTP ${r.status}`),
      sample: sites.slice(0, 3).map((s: any) => s.siteUrl) };
  } catch (e) { return { ok: false, configured: true, error: String((e as Error).message), latencyMs: Date.now() - t0 }; }
}

async function testFirecrawl() {
  const fk = Deno.env.get("FIRECRAWL_API_KEY");
  if (!fk) return { ok: false, configured: false, error: "FIRECRAWL_API_KEY not set — connect Firecrawl in Connectors", latencyMs: 0 };
  const t0 = Date.now();
  try {
    const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${fk}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://dynime.com", formats: ["markdown"], onlyMainContent: true }),
    });
    const j = await r.json().catch(() => ({}));
    const len = (j.data?.markdown || j.markdown || "").length;
    return { ok: r.ok, configured: true, latencyMs: Date.now() - t0, status: r.status,
      detail: r.ok ? `Scraped homepage (${len} chars markdown)` : (j.error || `HTTP ${r.status}`) };
  } catch (e) { return { ok: false, configured: true, error: String((e as Error).message), latencyMs: Date.now() - t0 }; }
}

function testSemrush() {
  // Semrush is exposed as a built-in Lovable agent tool — not a runtime API the app can call.
  return {
    ok: true,
    configured: true,
    latencyMs: 0,
    detail: "Available via Lovable agent (chat-only)",
    note: "Ask Lovable for keyword research, domain analysis, SERP, backlinks, competitor gaps, etc.",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    await requireAdmin(req);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const target = (body.target as string) || "all";

    const result: Record<string, any> = {};
    const jobs: Promise<void>[] = [];
    if (target === "all" || target === "gsc") jobs.push(testGsc().then(r => { result.gsc = r; }));
    if (target === "all" || target === "firecrawl") jobs.push(testFirecrawl().then(r => { result.firecrawl = r; }));
    if (target === "all" || target === "semrush") { result.semrush = testSemrush(); }
    await Promise.all(jobs);

    return new Response(JSON.stringify({ ok: true, checkedAt: new Date().toISOString(), integrations: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String((e as Error).message) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

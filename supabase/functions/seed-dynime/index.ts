// Admin-only one-shot importer for the Dynime operational dataset.
// The data is too large to ship in a single edge function (10MB limit), so it
// is split across four shard functions: seed-dynime-{payroll,financial,hr,analytics}.
// This dispatcher orchestrates them in a fixed dependency-friendly order.
//
// POST body (optional):
//   { "truncate": true, "tables": ["dynime_payroll", ...] }
//
// - `truncate` (default true): wipes target tables via RPC before inserting.
// - `tables`: only seed the listed tables. Each shard filters down to its own.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Order matters: HR + clients first, then orders/invoices/payroll, then analytics rollups.
const SHARDS = [
  "seed-dynime-hr",
  "seed-dynime-analytics",
  "seed-dynime-financial",
  "seed-dynime-payroll",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    if (!userRes?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(url, service);
    const { data: isAdmin, error: roleErr } = await admin.rpc("is_admin", {
      _user_id: userRes.user.id,
    });
    if (roleErr || !isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: { truncate?: boolean; tables?: string[] } = {};
    try { body = await req.json(); } catch { /* empty body ok */ }
    const truncate = body.truncate !== false;
    const tableFilter = body.tables;

    if (truncate && !tableFilter) {
      const { error: resetErr } = await admin.rpc("dynime_reset_tables");
      if (resetErr) {
        return new Response(JSON.stringify({ error: `truncate failed: ${resetErr.message}` }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const internalSecret = Deno.env.get("SEED_INTERNAL_SECRET") || service;
    const aggregated: Array<{ shard: string; results: unknown }> = [];

    for (const shard of SHARDS) {
      const target = `${url}/functions/v1/${shard}`;
      const resp = await fetch(target, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Service role bypasses verify_jwt and authenticates shard call.
          Authorization: `Bearer ${service}`,
          apikey: service,
          "x-seed-internal": internalSecret,
        },
        body: JSON.stringify(tableFilter ? { tables: tableFilter } : {}),
      });
      const json = await resp.json().catch(() => ({ error: "invalid shard response" }));
      aggregated.push({ shard, results: json });
      if (!resp.ok) {
        return new Response(JSON.stringify({ ok: false, failedAt: shard, aggregated }, null, 2), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ ok: true, aggregated }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

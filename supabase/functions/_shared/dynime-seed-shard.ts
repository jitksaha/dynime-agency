// Shared shard runner used by all seed-dynime-* functions.
// Each shard ships its own ./data/ directory with a subset of the JSON files.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export type ManifestEntry = { table: string; file: string; rows: number };
export type ShardResult = { table: string; inserted: number; error?: string; skipped?: boolean };

const BATCH = 500;

async function loadJson<T>(dataDirUrl: URL, file: string): Promise<T> {
  const url = new URL(file, dataDirUrl);
  const txt = await Deno.readTextFile(url);
  return JSON.parse(txt) as T;
}

/**
 * Run a shard. `metaUrl` should be the calling function's `import.meta.url`
 * so the helper can resolve `./data/...` files inside that function bundle.
 */
export async function runShard(req: Request, metaUrl: string): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";

    // Allow dispatcher-to-shard internal calls with service role bypass.
    const internalSecret = req.headers.get("x-seed-internal");
    const expectedSecret = Deno.env.get("SEED_INTERNAL_SECRET") || service;

    if (internalSecret !== expectedSecret) {
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
      const admin0 = createClient(url, service);
      const { data: isAdmin, error: roleErr } = await admin0.rpc("is_admin", {
        _user_id: userRes.user.id,
      });
      if (roleErr || !isAdmin) {
        return new Response(JSON.stringify({ error: "forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    let body: { tables?: string[] } = {};
    try { body = await req.json(); } catch { /* empty body ok */ }
    const tableFilter = body.tables;

    const admin = createClient(url, service);
    const dataDirUrl = new URL("./data/", metaUrl);
    const manifest = await loadJson<ManifestEntry[]>(dataDirUrl, "_manifest.json");
    const results: ShardResult[] = [];

    for (const entry of manifest) {
      if (tableFilter && !tableFilter.includes(entry.table)) {
        results.push({ table: entry.table, inserted: 0, skipped: true });
        continue;
      }
      try {
        const rows = await loadJson<Record<string, unknown>[]>(dataDirUrl, entry.file);
        let inserted = 0;
        for (let i = 0; i < rows.length; i += BATCH) {
          const slice = rows.slice(i, i + BATCH);
          const { error } = await admin.from(entry.table).insert(slice);
          if (error) throw new Error(`${entry.table} batch ${i}: ${error.message}`);
          inserted += slice.length;
        }
        results.push({ table: entry.table, inserted });
      } catch (e) {
        results.push({ table: entry.table, inserted: 0, error: String((e as Error).message ?? e) });
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

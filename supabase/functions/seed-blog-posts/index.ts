// Admin-only one-shot seeder for blog_posts. Idempotent on `slug`.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import postsData from "./posts.json" with { type: "json" };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    // Verify caller is admin
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: userRes } = await userClient.auth.getUser();
    if (!userRes?.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });
    const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: userRes.user.id });
    if (!isAdmin) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: corsHeaders });

    const posts = postsData as any[];
    let inserted = 0, skipped = 0, errors: any[] = [];
    // chunk inserts of 30
    for (let i = 0; i < posts.length; i += 30) {
      const batch = posts.slice(i, i + 30);
      const { data, error } = await supabase
        .from("blog_posts")
        .upsert(batch, { onConflict: "slug", ignoreDuplicates: true })
        .select("id");
      if (error) errors.push({ i, msg: error.message });
      else inserted += data?.length ?? 0;
    }
    skipped = posts.length - inserted;
    return new Response(JSON.stringify({ ok: true, total: posts.length, inserted, skipped, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});

// Manually trigger workflow for a lead (used by "Run now" button)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization") || "";
  const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  const admin = createClient(url, svc);
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
  if (!(roles || []).some((r: any) => ["super_admin", "manager"].includes(r.role))) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
  }

  const body = await req.json().catch(() => ({}));
  const { workflow_id, lead_id } = body;
  if (!workflow_id || !lead_id) {
    return new Response(JSON.stringify({ error: "workflow_id and lead_id required" }), { status: 400, headers: corsHeaders });
  }

  const { error } = await admin.from("crm_workflow_runs").insert({
    workflow_id, lead_id, status: "pending", next_run_at: new Date().toISOString(),
    context: { event: "manual", lead_id },
  });
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });

  // Kick the tick function immediately
  fetch(`${url}/functions/v1/crm-automation-tick`, {
    method: "POST",
    headers: { Authorization: `Bearer ${svc}`, "Content-Type": "application/json" },
  }).catch(() => null);

  return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});

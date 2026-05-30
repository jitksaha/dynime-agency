import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function requireAdmin(req: Request): Promise<{ admin: boolean; reason?: string }> {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { admin: false, reason: "Missing authorization token" };

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims?.sub) return { admin: false, reason: "Invalid session" };
  const userId = claimsData.claims.sub as string;

  const adminClient = createClient(supabaseUrl, serviceRole);
  const { data: isAdminData, error: rpcErr } = await adminClient.rpc("is_admin", { _user_id: userId });
  if (rpcErr) return { admin: false, reason: `Role check failed: ${rpcErr.message}` };
  if (!isAdminData) return { admin: false, reason: "Admin role required" };
  return { admin: true };
}

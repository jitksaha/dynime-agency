// Shared admin/auth helper for edge functions.
// Validates a Supabase user JWT and verifies the caller has an admin role.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type AuthResult =
  | { ok: true; userId: string; email: string | null; isAdmin: boolean }
  | { ok: false; status: number; error: string };

export async function requireUser(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { ok: false, status: 401, error: "Unauthorized" };

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  // Reject anon / publishable keys outright — they are public.
  const publishable = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
  if (token === anon || (publishable && token === publishable)) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const client = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) return { ok: false, status: 401, error: "Unauthorized" };

  const userId = data.user.id;
  const email = data.user.email ?? null;

  // Check admin role
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const isAdmin = (roles || []).some((r: { role: string }) =>
    ["super_admin", "manager"].includes(r.role),
  );

  return { ok: true, userId, email, isAdmin };
}

export async function requireAdmin(req: Request): Promise<AuthResult> {
  const r = await requireUser(req);
  if (!r.ok) return r;
  if (!r.isAdmin) return { ok: false, status: 403, error: "Forbidden: admin role required" };
  return r;
}

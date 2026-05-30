import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type DeleteResponse = {
  ok: boolean;
  error?: string;
  deleted?: boolean;
  alreadyDeleted?: boolean;
  orderId?: string;
  invoiceNumber?: string | null;
  warnings?: string[];
};

const json = (body: DeleteResponse, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const requireEnv = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured`);
  return value;
};

const isUuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Only POST requests can delete orders." });

  try {
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const anonKey = requireEnv("SUPABASE_ANON_KEY");
    const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ ok: false, error: "Please sign in again before deleting orders." });

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    const userId = claimsData?.claims?.sub;
    if (claimsError || !userId) {
      console.error("[admin-delete-order] invalid auth", claimsError);
      return json({ ok: false, error: "Your session is no longer valid. Please sign in again." });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: staffRoles, error: roleError } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["super_admin", "manager", "sales"]);

    if (roleError) {
      console.error("[admin-delete-order] role lookup failed", roleError);
      return json({ ok: false, error: "Could not verify delete permission." });
    }
    if (!staffRoles?.length) return json({ ok: false, error: "You do not have permission to delete orders." });

    const payload = await req.json().catch(() => null);
    const orderId = typeof payload?.orderId === "string" ? payload.orderId.trim() : "";
    if (!isUuid(orderId)) return json({ ok: false, error: "Invalid order id." });

    const { data: order, error: lookupError } = await admin
      .from("orders")
      .select("id, invoice_number")
      .eq("id", orderId)
      .maybeSingle();

    if (lookupError) {
      console.error("[admin-delete-order] order lookup failed", lookupError);
      return json({ ok: false, error: "Could not find the order before deleting it." });
    }
    if (!order) return json({ ok: true, deleted: false, alreadyDeleted: true, orderId });

    const warnings: string[] = [];
    const cleanupJobs = [
      { label: "child milestones", run: () => admin.from("order_milestones").delete().eq("child_order_id", orderId) },
      { label: "parent milestones", run: () => admin.from("order_milestones").delete().eq("parent_order_id", orderId) },
      { label: "customer services", run: () => admin.from("customer_services").delete().eq("order_id", orderId) },
      { label: "support tickets", run: () => admin.from("support_tickets").update({ order_id: null }).eq("order_id", orderId) },
    ];

    for (const job of cleanupJobs) {
      const { error } = await job.run();
      if (error) {
        console.warn(`[admin-delete-order] cleanup skipped: ${job.label}`, error);
        warnings.push(`${job.label}: ${error.message}`);
      }
    }

    const { error: deleteError, count } = await admin.from("orders").delete({ count: "exact" }).eq("id", orderId);
    if (deleteError) {
      console.error("[admin-delete-order] delete failed", deleteError);
      return json({ ok: false, error: deleteError.message || "Order could not be deleted." });
    }

    return json({
      ok: true,
      deleted: (count ?? 0) > 0,
      alreadyDeleted: (count ?? 0) === 0,
      orderId,
      invoiceNumber: order.invoice_number,
      warnings,
    });
  } catch (error) {
    console.error("[admin-delete-order] unexpected", error);
    return json({ ok: false, error: "Order delete service failed. Please try again." });
  }
});
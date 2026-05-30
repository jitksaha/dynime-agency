// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireUser } from "../_shared/require-admin.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "application/pdf"];
const MAX_BYTES = 10 * 1024 * 1024;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  // SECURITY: require authenticated user — function mutates order payment data.
  const auth = await requireUser(req);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status, headers: { ...cors, "content-type": "application/json" },
    });
  }

  try {
    const { session_id, invoice_number, path, filename, size, content_type } = await req.json();
    if (!path || typeof path !== "string" || (!session_id && !invoice_number)) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: { ...cors, "content-type": "application/json" } });
    }

    // Validate metadata up front
    if (content_type && !ALLOWED_TYPES.includes(String(content_type))) {
      return new Response(JSON.stringify({ error: "Unsupported file type" }), { status: 400, headers: { ...cors, "content-type": "application/json" } });
    }
    if (size && Number(size) > MAX_BYTES) {
      return new Response(JSON.stringify({ error: "File too large" }), { status: 400, headers: { ...cors, "content-type": "application/json" } });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Find order
    let q = admin.from("orders").select("id, invoice_number, stripe_session_id, payment_verification, user_id, customer_email").limit(1);
    if (session_id) q = q.eq("stripe_session_id", session_id);
    else q = q.eq("invoice_number", invoice_number);
    const { data: orders, error: qErr } = await q;
    if (qErr) throw qErr;
    const order = orders?.[0];
    if (!order) {
      return new Response(JSON.stringify({ error: "Order not found" }), { status: 404, headers: { ...cors, "content-type": "application/json" } });
    }

    // SECURITY: verify the authenticated user owns this order (admins always allowed).
    const orderUserId = (order as any).user_id as string | null | undefined;
    const orderEmail = String((order as any).customer_email || "").toLowerCase();
    const callerEmail = (auth.email || "").toLowerCase();
    const isOwner = (orderUserId && orderUserId === auth.userId)
      || (!!callerEmail && !!orderEmail && callerEmail === orderEmail);
    if (!isOwner && !auth.isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...cors, "content-type": "application/json" } });
    }

    // Path must be scoped to this order's identifier (matches client-side prefix logic)
    const safeRef = String(session_id || invoice_number || order.invoice_number || order.stripe_session_id || "")
      .replace(/[^a-zA-Z0-9_-]/g, "_");
    if (!safeRef || !path.startsWith(`${safeRef}/`)) {
      return new Response(JSON.stringify({ error: "Invalid receipt path" }), { status: 400, headers: { ...cors, "content-type": "application/json" } });
    }

    // Verify the object actually exists in the bank-receipts bucket (server-side check)
    const folder = path.substring(0, path.lastIndexOf("/")) || safeRef;
    const fname = path.substring(path.lastIndexOf("/") + 1);
    const { data: listed, error: listErr } = await admin.storage
      .from("bank-receipts")
      .list(folder, { limit: 100, search: fname });
    if (listErr) throw listErr;
    const found = (listed || []).find((o: any) => o.name === fname);
    if (!found) {
      return new Response(JSON.stringify({ error: "Receipt file not found in storage" }), { status: 400, headers: { ...cors, "content-type": "application/json" } });
    }

    const pv: any = order.payment_verification || {};
    const receipts = Array.isArray(pv.receipts) ? pv.receipts : [];
    receipts.push({
      path,
      filename: filename ? String(filename).slice(0, 200) : null,
      size: size ? Number(size) : (found.metadata as any)?.size ?? null,
      content_type: content_type ? String(content_type) : (found.metadata as any)?.mimetype ?? null,
      uploaded_at: new Date().toISOString(),
    });

    const { error: upErr } = await admin
      .from("orders")
      .update({ payment_verification: { ...pv, receipts } })
      .eq("id", order.id);
    if (upErr) throw upErr;

    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "content-type": "application/json" } });
  } catch (e: any) {
    console.error("attach-bank-receipt error", e?.message || e);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500, headers: { ...cors, "content-type": "application/json" } });
  }
});

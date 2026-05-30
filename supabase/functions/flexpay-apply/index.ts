// Dynime FlexPay — Application & Auto-Decision endpoint
// Handles credit-limit applications with optional instant auto-approval.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Payload = {
  full_name: string;
  email: string;
  phone?: string;
  country?: string;
  occupation?: string;
  employer?: string;
  monthly_income?: number | string | null;
  requested_limit: number | string;
  purpose?: string;
  notes?: string;
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const admin = createClient(supabaseUrl, serviceKey);

    // Identify caller (optional)
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization") || "";
    if (authHeader.startsWith("Bearer ")) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data } = await userClient.auth.getUser();
      userId = data.user?.id ?? null;
    }

    const body = (await req.json()) as Payload;

    // Validate
    const fullName = (body.full_name || "").toString().trim();
    const email = (body.email || "").toString().trim().toLowerCase();
    const requested = Number(body.requested_limit);
    const income = body.monthly_income != null && body.monthly_income !== "" ? Number(body.monthly_income) : null;

    if (fullName.length < 2) return json(400, { error: "Full name is required" });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(400, { error: "Valid email is required" });
    if (!Number.isFinite(requested) || requested < 100 || requested > 1_000_000)
      return json(400, { error: "Requested limit must be between 100 and 1,000,000" });

    // Load settings
    const { data: settings } = await admin
      .from("flexpay_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    const minOrder = Number(settings?.min_order_amount ?? 100);
    const maxLimit = Number(settings?.max_credit_limit ?? 10000);
    const autoEnabled = Boolean(settings?.auto_approval_enabled);
    const autoMax = Number(settings?.auto_approval_max_limit ?? 0);
    const currency = String(settings?.default_currency || "USD");

    if (requested < minOrder)
      return json(400, { error: `Minimum requested limit is ${minOrder} ${currency}` });
    if (requested > maxLimit)
      return json(400, { error: `Maximum requested limit is ${maxLimit} ${currency}` });

    // Insert application (pending by default)
    const payload = {
      user_id: userId,
      full_name: fullName,
      email,
      phone: body.phone?.toString().trim() || null,
      country: body.country?.toString().trim() || null,
      occupation: body.occupation?.toString().trim() || null,
      employer: body.employer?.toString().trim() || null,
      monthly_income: income,
      requested_limit: requested,
      purpose: body.purpose?.toString().trim() || null,
      notes: body.notes?.toString().trim() || null,
      status: "pending",
    };

    const { data: app, error: insErr } = await admin
      .from("flexpay_credit_applications")
      .insert(payload)
      .select("*")
      .single();
    if (insErr) return json(500, { error: insErr.message });

    // Auto-decision logic
    let decision: "approved" | "review" = "review";
    let approvedLimit = 0;
    let reason = "";

    if (!autoEnabled) {
      reason = "Our team will review your application and respond within 1 business day.";
    } else if (!userId) {
      reason = "Sign in required for instant decisioning.";
    } else if (requested > autoMax) {
      reason = `Requested limit exceeds instant-approval cap (${autoMax} ${currency}).`;
    } else if (income == null) {
      reason = "Income disclosure required for instant decisioning.";
    } else {
      // Affordability: monthly income must cover at least 1/12 of the limit comfortably
      // i.e. requested <= income * 6  (≈ 6 months of income)
      const affordable = income * 6;
      if (requested > affordable) {
        reason = "Requested limit exceeds the affordability threshold for your stated income.";
      } else {
        decision = "approved";
        approvedLimit = Math.min(requested, autoMax, maxLimit);
      }
    }

    if (decision === "approved" && userId) {
      // Mark application approved
      await admin
        .from("flexpay_credit_applications")
        .update({ status: "approved", reviewed_at: new Date().toISOString() })
        .eq("id", app.id);

      // Upsert credit account
      const { data: existing } = await admin
        .from("flexpay_credit_accounts")
        .select("id, total_limit")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        await admin
          .from("flexpay_credit_accounts")
          .update({
            total_limit: Math.max(Number(existing.total_limit || 0), approvedLimit),
            status: "active",
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await admin.from("flexpay_credit_accounts").insert({
          user_id: userId,
          email,
          total_limit: approvedLimit,
          used_limit: 0,
          currency,
          status: "active",
          approved_at: new Date().toISOString(),
        });
      }
    }

    return json(200, {
      application_id: app.id,
      reference_no: (app as any).reference_no || null,
      decision,
      approved_limit: approvedLimit,
      currency,
      reason,
      signed_in: Boolean(userId),
    });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : "Unexpected error" });
  }
});

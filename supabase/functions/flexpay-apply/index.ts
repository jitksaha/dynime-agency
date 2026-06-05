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
  payment_order_id?: string;
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

    // Identify caller
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization") || "";
    if (authHeader.startsWith("Bearer ")) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data } = await userClient.auth.getUser();
      userId = data.user?.id ?? null;
    }

    if (!userId) {
      return json(401, { error: "Authentication required to apply for FlexPay" });
    }

    const body = (await req.json()) as Payload;

    // Validate inputs
    const fullName = (body.full_name || "").toString().trim();
    const email = (body.email || "").toString().trim().toLowerCase();
    const requested = Number(body.requested_limit);
    const income = body.monthly_income != null && body.monthly_income !== "" ? Number(body.monthly_income) : null;
    const paymentOrderId = body.payment_order_id?.toString().trim();

    if (fullName.length < 2) return json(400, { error: "Full name is required" });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(400, { error: "Valid email is required" });
    if (!Number.isFinite(requested) || requested < 100 || requested > 1_000_000)
      return json(400, { error: "Requested limit must be between 100 and 1,000,000" });

    // Enforce compliance fee payment
    if (!paymentOrderId) {
      return json(400, { error: "Compliance verification fee payment is required" });
    }

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

    // ─── Compliance Checks ───

    // 1. Verify KYC via didit verification tables
    const { data: kycRow } = await admin
      .from("kyc_verifications")
      .select("status")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: kycReq } = await admin
      .from("verification_requests")
      .select("status")
      .eq("customer_id", userId)
      .eq("type", "kyc")
      .eq("status", "verified")
      .limit(1);

    const kycVerified = (kycRow?.status === "verified") || (kycReq && kycReq.length > 0);

    // 2. Verify KYB via didit verification tables
    const { data: kybRow } = await admin
      .from("kyb_verifications")
      .select("status")
      .eq("user_id", userId)
      .limit(1);

    const { data: kybReq } = await admin
      .from("verification_requests")
      .select("status")
      .eq("customer_id", userId)
      .eq("type", "kyb")
      .eq("status", "verified")
      .limit(1);

    const kybVerified = (kybRow?.[0]?.status === "verified") || (kybReq && kybReq.length > 0);

    // 3. Verify Compliance Payment Order
    const { data: order } = await admin
      .from("orders")
      .select("status, customer_email, items")
      .eq("id", paymentOrderId)
      .maybeSingle();

    if (!order) {
      return json(400, { error: "Compliance payment record not found." });
    }

    if (!["paid", "completed", "verified"].includes(order.status)) {
      return json(400, { error: `Compliance payment is not complete (Current status: ${order.status}).` });
    }

    if (order.customer_email.toLowerCase() !== email.toLowerCase()) {
      return json(400, { error: "Compliance payment email does not match application email." });
    }

    // Verify order contains compliance fee item
    const orderItems = Array.isArray(order.items) ? order.items : [];
    const hasComplianceItem = orderItems.some((item: any) =>
      String(item.name || item.title || "").toLowerCase().includes("compliance") ||
      String(item.name || item.title || "").toLowerCase().includes("kyc") ||
      String(item.name || item.title || "").toLowerCase().includes("verification")
    );
    if (!hasComplianceItem) {
      return json(400, { error: "Invalid payment order: missing compliance fee item." });
    }

    // ─── Secure Credit Scoring Formula ───
    let decision: "approved" | "review" = "review";
    let approvedLimit = 0;
    let reason = "";
    let score = 100; // Base score

    if (!kycVerified) {
      reason = "Identity verification (KYC) must be completed before applying.";
    } else if (!kybVerified) {
      reason = "Business verification (KYB) must be completed before applying.";
    } else if (income == null || income <= 0) {
      score = 0;
      reason = "Valid monthly income disclosure required for pre-approval.";
    } else {
      // DTI / Affordability Rule: monthly installment (assume 12-month tenure) relative to monthly income
      const monthlyPayment = requested / 12;
      const dtiRatio = monthlyPayment / income;

      if (dtiRatio > 0.30) {
        score -= 50; // Too high repayment ratio relative to stated monthly income
        reason = "Requested limit exceeds our affordability threshold (repayment is >30% of income).";
      } else if (dtiRatio > 0.15) {
        score -= 20; // Moderate debt-to-income risk
      } else {
        score += 15; // Excellent DTI ratio
      }

      // Income Level Scoring
      if (income < 1200) {
        score -= 30;
        reason = "Stated monthly income is below the minimum required for automated approval.";
      } else if (income > 5000) {
        score += 15;
      }

      // Employment stability scoring
      const hasOccupation = body.occupation && body.occupation.trim().length > 2;
      const hasEmployer = body.employer && body.employer.trim().length > 2;
      if (!hasOccupation || !hasEmployer) {
        score -= 15;
      } else {
        const occLower = body.occupation.toLowerCase();
        if (occLower.includes("student") || occLower.includes("unemployed") || occLower.includes("freelancer") || occLower.includes("freelance")) {
          score -= 25; // Higher risk employment types
        } else {
          score += 10;
        }
      }

      // Country Sanctions & Compliance Check
      const highRiskCountries = ["russia", "belarus", "iran", "north korea", "syria", "somalia", "venezuela", "yemen"];
      const countryLower = (body.country || "").toLowerCase().trim();
      if (highRiskCountries.includes(countryLower)) {
        score = 0;
        reason = "Application routed to manual compliance underwriting due to regional risk policy.";
      }

      // Score evaluation
      if (!autoEnabled) {
        reason = "Instant pre-approval is currently disabled. Our team will review your application.";
      } else if (requested > autoMax) {
        reason = `Requested limit exceeds instant-approval cap of ${autoMax} ${currency}.`;
      } else if (score >= 70) {
        decision = "approved";
        approvedLimit = Math.min(requested, autoMax, maxLimit);
        reason = "Automated pre-approval issued based on excellent compliance, income, and risk assessment.";
      } else if (!reason) {
        reason = "Application did not meet the automated scoring threshold and will be reviewed manually.";
      }
    }

    // Insert application
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
      status: decision === "approved" ? "approved" : "pending",
      reviewed_by: decision === "approved" ? serviceKey : null, // marked by system
      reviewed_at: decision === "approved" ? new Date().toISOString() : null,
    };

    const { data: app, error: insErr } = await admin
      .from("flexpay_credit_applications")
      .insert(payload)
      .select("*")
      .single();

    if (insErr) return json(500, { error: insErr.message });

    // If approved, upsert the credit account
    if (decision === "approved" && userId) {
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
      signed_in: true,
    });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : "Unexpected error" });
  }
});

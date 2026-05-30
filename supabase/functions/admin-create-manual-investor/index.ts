// Super-admin endpoint: create or attach an investor account and record an
// investment that originated offline (consultation + paperwork). Optionally
// sends a magic-link invite so the investor can view the portal.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) throw new Error("Invalid session");
    const callerId = claimsData.claims.sub as string;

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);
    const callerRoles = (roles ?? []).map((r: any) => r.role);
    const isAdmin = callerRoles.some((r: string) =>
      ["super_admin", "manager"].includes(r),
    );
    if (!isAdmin) throw new Error("Only admins can add manual investors");

    const body = await req.json();
    const {
      email,
      full_name,
      phone,
      country,
      send_invite = true,
      plan_id,
      plan_slug,
      plan_name,
      amount,
      currency = "USD",
      monthly_return_percent,
      bonus_percent_biannual,
      lock_period_months,
      payout_frequency = "monthly",
      started_at,
      agreement_status = "signed",
      agreement_signed_by_name,
      notes,
    } = body ?? {};

    if (!email || typeof email !== "string") throw new Error("Email is required");
    if (!plan_name || typeof plan_name !== "string") throw new Error("Plan is required");
    if (!amount || Number(amount) <= 0) throw new Error("Amount must be > 0");

    const cleanEmail = email.trim().toLowerCase();

    // 1. find or create the auth user
    let userId: string | null = null;
    let createdAccount = false;
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("email", cleanEmail)
      .maybeSingle();
    if (existing?.id) {
      userId = existing.id;
    } else {
      const tempPassword =
        crypto.randomUUID().replace(/-/g, "").slice(0, 16) + "Aa9!";
      const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        email: cleanEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: full_name || "", source: "manual_investor" },
      });
      if (createError) throw new Error(createError.message);
      userId = newUser.user!.id;
      createdAccount = true;

      // best-effort profile insert (trigger may also create it)
      await admin.from("profiles").upsert({
        id: userId,
        email: cleanEmail,
        full_name: full_name || null,
      });
    }

    // ensure investor role
    await admin
      .from("user_roles")
      .upsert({ user_id: userId!, role: "investor" }, { onConflict: "user_id,role" });

    // 2. create investment record
    const investmentInsert = {
      investor_id: userId,
      plan_id: plan_id || null,
      plan_slug: plan_slug || null,
      plan_name,
      amount: Number(amount),
      currency,
      status: "active",
      payout_frequency,
      monthly_return_percent:
        monthly_return_percent != null ? Number(monthly_return_percent) : null,
      bonus_percent_biannual:
        bonus_percent_biannual != null ? Number(bonus_percent_biannual) : null,
      lock_period_months:
        lock_period_months != null ? Number(lock_period_months) : null,
      started_at: started_at || new Date().toISOString(),
      agreement_status,
      agreement_signed_at:
        agreement_status === "signed" ? new Date().toISOString() : null,
      agreement_signed_by_name: agreement_signed_by_name || full_name || null,
      notes: notes || null,
      metadata: {
        source: "manual_offline",
        created_by: callerId,
        contact: { phone: phone || null, country: country || null },
      },
    };

    const { data: investment, error: invError } = await admin
      .from("investments")
      .insert(investmentInsert)
      .select()
      .single();
    if (invError) throw new Error(invError.message);

    // 3. optional invite link so they can claim the account
    let inviteLink: string | null = null;
    if (send_invite) {
      try {
        const origin = req.headers.get("origin") || supabaseUrl;
        const { data: link } = await admin.auth.admin.generateLink({
          type: createdAccount ? "invite" : "magiclink",
          email: cleanEmail,
          options: { redirectTo: `${origin}/investor` },
        });
        inviteLink = link?.properties?.action_link ?? null;
      } catch (e) {
        console.warn("invite link failed", e);
      }
    }

    return json({
      success: true,
      user_id: userId,
      investment_id: investment.id,
      created_account: createdAccount,
      invite_link: inviteLink,
    });
  } catch (e: any) {
    console.error("admin-create-manual-investor", e);
    return json({ error: e?.message ?? "Server error" }, 400);
  }
});

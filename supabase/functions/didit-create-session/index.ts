import { corsHeaders } from "./_cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface Body {
  type: "kyc" | "kyb";
  /** Optional: admin can create for another user */
  target_user_id?: string;
  /** Frontend origin so the callback can redirect back to the app */
  frontend_origin?: string;
  /** KYB only */
  company_name?: string;
  registration_number?: string;
  country?: string;
  business_type?: string;
  website?: string;
  tax_id?: string;
}

const DIDIT_BASE = "https://verification.didit.me";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("DIDIT_API_KEY");
    const kycWf = Deno.env.get("DIDIT_KYC_WORKFLOW_ID");
    const kybWf = Deno.env.get("DIDIT_KYB_WORKFLOW_ID");
    if (!apiKey || !kycWf || !kybWf) {
      return new Response(JSON.stringify({ error: "Didit env vars missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userClient = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const callerId = userData.user.id;
    const callerEmail = userData.user.email ?? null;

    const admin = createClient(url, service);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", callerId);
    const isAdmin = (roles || []).some((r: { role: string }) => ["super_admin", "manager"].includes(r.role));

    const body = (await req.json()) as Body;
    if (!body?.type || !["kyc", "kyb"].includes(body.type)) {
      return new Response(JSON.stringify({ error: "type must be kyc or kyb" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const targetUserId = body.target_user_id && isAdmin ? body.target_user_id : callerId;
    const workflowId = body.type === "kyc" ? kycWf : kybWf;

    // Fetch target email for callback context
    let targetEmail = callerEmail;
    if (targetUserId !== callerId) {
      const { data: u } = await admin.auth.admin.getUserById(targetUserId);
      targetEmail = u?.user?.email ?? targetEmail;
    }

    // Call Didit to create session.
    // callback = browser redirect URL after the user finishes verification.
    // The server-side webhook is configured separately in the Didit dashboard.
    const origin = body.frontend_origin || "https://dynime.com";
    const callbackPath = body.type === "kyb" ? "/account/verification?kyb_done=1" : "/account/verification?kyc_done=1";
    const callback = `${origin}${callbackPath}`;

    const diditPayload: Record<string, unknown> = {
      workflow_id: workflowId,
      vendor_data: targetUserId,
      callback,
      metadata: { user_id: targetUserId, email: targetEmail, type: body.type },
    };

    const diditRes = await fetch(`${DIDIT_BASE}/v2/session/`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(diditPayload),
    });
    const diditText = await diditRes.text();
    let didit: any = null;
    try { didit = JSON.parse(diditText); } catch { /* ignore */ }
    if (!diditRes.ok) {
      return new Response(JSON.stringify({ error: "Didit error", status: diditRes.status, body: diditText }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sessionId: string = didit?.session_id || didit?.id || "";
    const verificationUrl: string = didit?.url || didit?.verification_url || didit?.session_url || "";

    if (body.type === "kyc") {
      // upsert by user_id (unique index)
      const { data: existing } = await admin.from("kyc_verifications").select("id").eq("user_id", targetUserId).maybeSingle();
      if (existing) {
        await admin.from("kyc_verifications").update({
          didit_session_id: sessionId, workflow_id: workflowId, verification_url: verificationUrl,
          status: "pending", raw_data: didit ?? {},
        }).eq("id", existing.id);
      } else {
        await admin.from("kyc_verifications").insert({
          user_id: targetUserId, didit_session_id: sessionId, workflow_id: workflowId,
          verification_url: verificationUrl, status: "pending", raw_data: didit ?? {},
        });
      }
    } else {
      if (!body.company_name) {
        return new Response(JSON.stringify({ error: "company_name required for KYB" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      await admin.from("kyb_verifications").insert({
        user_id: targetUserId,
        company_name: body.company_name,
        registration_number: body.registration_number ?? null,
        country: body.country ?? null,
        business_type: body.business_type ?? null,
        website: body.website ?? null,
        tax_id: body.tax_id ?? null,
        didit_session_id: sessionId,
        workflow_id: workflowId,
        verification_url: verificationUrl,
        status: "pending",
        raw_data: didit ?? {},
      });
    }

    return new Response(JSON.stringify({
      ok: true, session_id: sessionId, verification_url: verificationUrl,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

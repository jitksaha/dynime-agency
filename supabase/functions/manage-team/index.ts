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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate JWT using getClaims (signing-keys compatible).
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) throw new Error("Invalid session");
    const callerId = claimsData.claims.sub as string;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .single();

    if (callerRole?.role !== "super_admin") {
      throw new Error("Only super admins can manage users");
    }

    const body = await req.json();
    const { action } = body;

    // -- list_users -------------------------------------------------------
    // Returns every auth user enriched with profile + role. Used by both
    // the Team tab and the new Customers tab.
    if (action === "list_users") {
      const { data: usersData, error: usersErr } = await adminClient.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (usersErr) throw new Error(usersErr.message);

      const ids = usersData.users.map((u) => u.id);
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        adminClient.from("profiles").select("id, email, full_name").in("id", ids),
        adminClient.from("user_roles").select("user_id, role, created_at").in("user_id", ids),
      ]);

      // Order count per user (best-effort — orders.customer_email matches profile.email).
      const emails = (profiles || []).map((p: any) => p.email).filter(Boolean);
      const { data: orderRows } = await adminClient
        .from("orders")
        .select("customer_email")
        .in("customer_email", emails);
      const orderCounts: Record<string, number> = {};
      (orderRows || []).forEach((o: any) => {
        orderCounts[o.customer_email] = (orderCounts[o.customer_email] || 0) + 1;
      });

      const list = usersData.users.map((u) => {
        const profile = (profiles || []).find((p: any) => p.id === u.id);
        const roleRow = (roles || []).find((r: any) => r.user_id === u.id);
        return {
          user_id: u.id,
          email: u.email || profile?.email || "",
          full_name: profile?.full_name || (u.user_metadata as any)?.full_name || null,
          role: roleRow?.role || null,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          email_confirmed_at: u.email_confirmed_at,
          order_count: orderCounts[u.email || ""] || 0,
        };
      });

      return json({ users: list });
    }

    if (action === "invite") {
      const { email, password, role, full_name } = body;
      if (!email || !password || !role) throw new Error("Email, password and role are required");

      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name || "" },
      });
      if (createError) throw new Error(createError.message);

      const { error: roleError } = await adminClient
        .from("user_roles")
        .insert({ user_id: newUser.user!.id, role });
      if (roleError) throw new Error(roleError.message);

      try {
        await adminClient.auth.admin.generateLink({
          type: "magiclink",
          email,
          options: { redirectTo: `${req.headers.get("origin") || supabaseUrl}/superadmin` },
        });
      } catch (emailErr) {
        console.warn("Could not send invite email:", emailErr);
      }

      return json({
        success: true,
        user_id: newUser.user!.id,
        message: `Team member ${email} created with role ${role}.`,
      });
    }

    if (action === "update_role") {
      const { user_id, role } = body;
      if (user_id === callerId) throw new Error("Cannot change your own role");

      // Upsert: works for promoting customers (no row yet) and changing existing roles.
      const { error } = await adminClient
        .from("user_roles")
        .upsert({ user_id, role }, { onConflict: "user_id" });
      if (error) throw new Error(error.message);
      return json({ success: true });
    }

    // Removes the role only — keeps the user account (used for demoting team
    // members back to customer status).
    if (action === "remove_role") {
      const { user_id } = body;
      if (user_id === callerId) throw new Error("Cannot remove your own role");
      const { error } = await adminClient.from("user_roles").delete().eq("user_id", user_id);
      if (error) throw new Error(error.message);
      return json({ success: true });
    }

    if (action === "remove") {
      const { user_id } = body;
      if (user_id === callerId) throw new Error("Cannot remove yourself");
      await adminClient.from("user_roles").delete().eq("user_id", user_id);
      await adminClient.auth.admin.deleteUser(user_id);
      return json({ success: true });
    }

    if (action === "delete_user") {
      const { user_id } = body;
      if (user_id === callerId) throw new Error("Cannot delete yourself");
      await adminClient.from("user_roles").delete().eq("user_id", user_id);
      const { error } = await adminClient.auth.admin.deleteUser(user_id);
      if (error) throw new Error(error.message);
      return json({ success: true });
    }

    // -- manual_employee --------------------------------------------------
    // For employees onboarded outside the system (paperwork done offline).
    // Creates the auth account with a random password (or finds an existing
    // one), assigns the chosen role, stores HR metadata, and optionally
    // generates a magic-link the admin can hand to the employee so they can
    // claim portal access at their own pace.
    if (action === "manual_employee") {
      const {
        email,
        full_name,
        role,
        department,
        job_title,
        start_date,
        phone,
        notes,
        send_invite = true,
      } = body;
      if (!email || typeof email !== "string") throw new Error("Email is required");
      if (!role) throw new Error("Role is required");

      const cleanEmail = email.trim().toLowerCase();
      let userId: string | null = null;
      let createdAccount = false;

      const { data: existingProfile } = await adminClient
        .from("profiles").select("id").eq("email", cleanEmail).maybeSingle();

      if (existingProfile?.id) {
        userId = existingProfile.id;
      } else {
        const tempPassword =
          crypto.randomUUID().replace(/-/g, "").slice(0, 16) + "Aa9!";
        const { data: newUser, error: createError } =
          await adminClient.auth.admin.createUser({
            email: cleanEmail,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
              full_name: full_name || "",
              source: "manual_offline_employee",
              department: department || null,
              job_title: job_title || null,
              start_date: start_date || null,
              phone: phone || null,
              hr_notes: notes || null,
              onboarded_by: callerId,
            },
          });
        if (createError) throw new Error(createError.message);
        userId = newUser.user!.id;
        createdAccount = true;

        await adminClient.from("profiles").upsert({
          id: userId,
          email: cleanEmail,
          full_name: full_name || null,
        });
      }

      // assign requested role (one role per user, upsert by user_id)
      await adminClient
        .from("user_roles")
        .upsert({ user_id: userId!, role }, { onConflict: "user_id" });

      let inviteLink: string | null = null;
      if (send_invite) {
        try {
          const origin = req.headers.get("origin") || supabaseUrl;
          const { data: link } = await adminClient.auth.admin.generateLink({
            type: createdAccount ? "invite" : "magiclink",
            email: cleanEmail,
            options: { redirectTo: `${origin}/superadmin` },
          });
          inviteLink = link?.properties?.action_link ?? null;
        } catch (e) {
          console.warn("manual employee invite link failed", e);
        }
      }

      return json({
        success: true,
        user_id: userId,
        created_account: createdAccount,
        invite_link: inviteLink,
      });
    }

    // -- resend_invite ----------------------------------------------------
    // Regenerates a magic-link for an existing employee/user so the admin
    // can re-share portal access (e.g. original invite expired or was lost).
    if (action === "resend_invite") {
      const { email, user_id } = body;
      let targetEmail: string | null = email?.trim()?.toLowerCase() ?? null;
      if (!targetEmail && user_id) {
        const { data: u } = await adminClient.auth.admin.getUserById(user_id);
        targetEmail = u?.user?.email ?? null;
      }
      if (!targetEmail) throw new Error("Email or user_id is required");

      const origin = req.headers.get("origin") || supabaseUrl;
      const { data: link, error: linkErr } = await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email: targetEmail,
        options: { redirectTo: `${origin}/superadmin` },
      });
      if (linkErr) throw new Error(linkErr.message);

      return json({
        success: true,
        email: targetEmail,
        invite_link: link?.properties?.action_link ?? null,
      });
    }

    if (action === "reset_password") {
      const { email } = body;
      if (!email) throw new Error("Email is required");
      const { error } = await adminClient.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: `${req.headers.get("origin") || supabaseUrl}/reset-password` },
      });
      if (error) throw new Error(error.message);
      return json({ success: true, message: `Password reset email sent to ${email}.` });
    }

    throw new Error("Unknown action");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

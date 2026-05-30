// Payment webhook router. Each provider is implemented in its own _h_*.ts file.
// Public endpoint (verify_jwt = false) — providers do not send Supabase JWTs.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "./_shared.ts";
import { handleStripe } from "./_h_stripe.ts";
import { handleSslcommerz } from "./_h_sslcommerz.ts";
import { handleDodo } from "./_h_dodo.ts";
import { handleBkash } from "./_h_bkash.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const provider = url.pathname.split("/").pop()?.toLowerCase() || "";

  if (req.method !== "POST") {
    return json({ ok: true, message: "payment-webhook alive", provider }, 200);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  try {
    switch (provider) {
      case "stripe": return await handleStripe(req, admin);
      case "sslcommerz": return await handleSslcommerz(req, admin);
      case "dodopayment":
      case "dodo": return await handleDodo(req, admin);
      case "bkash": return await handleBkash(req, admin);
      default:
        return json(
          { error: "Unknown provider", hint: "Use /payment-webhook/{stripe|sslcommerz|dodopayment|bkash}" },
          404,
        );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[payment-webhook]", provider, message);
    return json({ error: message }, 500);
  }
});

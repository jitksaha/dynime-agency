// Edge function: generates a social share image using Lovable AI Gateway
// (Gemini image model) and uploads it to the public `site-assets` bucket.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireAdmin } from "../_shared/require-admin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // SECURITY: admin only — calls paid AI gateway and writes to public bucket.
  const auth = await requireAdmin(req);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  try {
    const { title, description = "", folder = "og" } = await req.json();
    if (!title || typeof title !== "string") {
      return json({ error: "title is required" }, 400);
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "LOVABLE_API_KEY missing" }, 500);

    const prompt =
      `A modern, clean 1200x630 social share banner for: "${title}". ` +
      (description ? `Subtitle context: ${description}. ` : "") +
      `Bold sans-serif headline reading "${title}", deep dark gradient background, ` +
      `subtle abstract geometric accents, premium tech aesthetic, ample negative space, ` +
      `no logos, no watermarks, high contrast, 16:9 wide composition.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      return json({ error: `AI error: ${aiRes.status} ${t}` }, 500);
    }
    const aiJson = await aiRes.json();
    const dataUrl: string | undefined =
      aiJson?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!dataUrl?.startsWith("data:image/")) {
      return json({ error: "No image in AI response" }, 500);
    }

    // Decode data URL -> bytes
    const [meta, b64] = dataUrl.split(",");
    const mime = meta.match(/data:([^;]+)/)?.[1] || "image/png";
    const ext = mime.split("/")[1]?.split("+")[0] || "png";
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("site-assets")
      .upload(path, bytes, { contentType: mime, upsert: false });
    if (upErr) return json({ error: upErr.message }, 500);

    const { data } = supabase.storage.from("site-assets").getPublicUrl(path);
    return json({ url: data.publicUrl });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

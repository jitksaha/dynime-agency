import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAdmin } from "../_shared/require-admin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const stripHtml = (s = "") =>
  s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // SECURITY: gate on admin role — function calls a paid AI gateway.
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { title, metaDescription, slug, content, primaryKeyword } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const text = stripHtml(content || "").slice(0, 6000);

    const userPrompt = `Audit this page for SEO ranking + AI (LLM) citation friendliness.

TITLE: ${title || "(empty)"}
META: ${metaDescription || "(empty)"}
SLUG: ${slug || "(empty)"}
PRIMARY KEYWORD HINT: ${primaryKeyword || "(none provided)"}
CONTENT SAMPLE:
${text || "(empty)"}

Return:
1. The single best primary keyword (high volume + achievable difficulty) for this page.
2. 5 secondary / long-tail keywords.
3. 6 concrete improvement suggestions ordered by impact, each ≤ 22 words. Cover intent match, title/meta, headings, content gaps, schema, internal linking, AI extraction.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a senior technical SEO + AI-citation strategist. Be precise, no fluff.",
          },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_seo_audit",
              description: "Return structured SEO audit",
              parameters: {
                type: "object",
                properties: {
                  primaryKeyword: { type: "string" },
                  secondaryKeywords: {
                    type: "array",
                    items: { type: "string" },
                  },
                  suggestions: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
                required: ["primaryKeyword", "secondaryKeywords", "suggestions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_seo_audit" } },
      }),
    });

    if (resp.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (resp.status === 402) {
      return new Response(
        JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    let parsed: any = {};
    try { parsed = args ? JSON.parse(args) : {}; } catch { parsed = {}; }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("seo-analyze error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

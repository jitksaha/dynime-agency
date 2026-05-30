// Entry point for the ATS scanner. Orchestrates small, focused modules.
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/require-admin.ts";

import { deriveKeywords } from "./text-utils.ts";
import { extractContactLinks } from "./contact-links.ts";
import {
  applyExperiencePenalty,
  blendWithAiScore,
  buildCandidateCorpus,
  computeBaseScore,
  detectRequiredYears,
  levelFromScore,
  matchKeywords,
} from "./scoring.ts";
import { aiStructuredExtract } from "./ai-extractor.ts";
import {
  loadApplication,
  loadCareer,
  loadResumeText,
  persistAtsResult,
} from "./data-access.ts";
import {
  buildSummary,
  buildUpdatePayload,
  mergeContactLinks,
} from "./result-builder.ts";

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
    const auth = await requireAdmin(req);
    if (!auth.ok) return json({ error: auth.error }, auth.status);

    const body = await req.json().catch(() => ({}));
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Load application + career + resume text
    const app = await loadApplication(supabase, body);
    if (!app) return json({ error: "Application not found" }, 404);

    const career = await loadCareer(supabase, app);
    const { text: resumeText, chars: resumeChars } = await loadResumeText(supabase, app);

    // 2. Deterministic keyword scoring
    const corpus = buildCandidateCorpus(app, resumeText);
    const keywords = deriveKeywords(career);
    const { matched, missing } = matchKeywords(corpus, keywords);
    const requiredYears = detectRequiredYears(career);
    const baseScore = applyExperiencePenalty({
      baseScore: computeBaseScore({ keywords, matched, resumeChars }),
      requiredYears,
      applicantYears: app.experience_years,
    });

    // 3. AI-powered enrichment (best-effort)
    const regexLinks = extractContactLinks(`${resumeText}\n${app.cover_letter || ""}`);
    const ai = await aiStructuredExtract({ career, app, resumeText });

    // 4. Final score + level
    const score = blendWithAiScore(baseScore, ai?.fit_score ?? null);
    const level = levelFromScore(score);

    // 5. Merge + persist
    const contactLinks = mergeContactLinks({ app, regex: regexLinks, ai });
    const summary = buildSummary({ career, app, matched, keywords, requiredYears, resumeChars, ai });
    const payload = buildUpdatePayload({
      score, level, matched, missing, summary, resumeChars, contactLinks, ai,
    });
    await persistAtsResult(supabase, app.id, payload);

    return json({
      ok: true,
      score,
      level,
      matched_count: matched.length,
      total_keywords: keywords.length,
      ai_enriched: !!ai,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("ats-scan error", msg);
    return json({ error: msg }, 500);
  }
});

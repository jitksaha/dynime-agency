// AI-powered structured extraction via the Lovable AI Gateway.
export interface AiInsights {
  detected_skills?: string[];
  detected_titles?: string[];
  detected_experience_years?: number | null;
  education?: string;
  contact_links?: {
    emails?: string[];
    phones?: string[];
    linkedin?: string[];
    github?: string[];
    portfolio?: string[];
    other?: string[];
  };
  highlights?: string[];
  red_flags?: string[];
  recommendation?: string;
  fit_score?: number;
}

function buildCareerSummary(career: any) {
  if (!career) return null;
  return {
    title: career.title || null,
    department: career.department || null,
    requirements: Array.isArray(career.requirements) ? career.requirements.slice(0, 30) : [],
    description: String(career.content_html || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .slice(0, 4000),
  };
}

function buildApplicantSummary(app: any) {
  return {
    full_name: app.full_name,
    email: app.email,
    phone: app.phone,
    country: app.country,
    current_position: app.current_position,
    experience_years: app.experience_years,
    expected_salary: app.expected_salary,
    linkedin_url: app.linkedin_url,
    portfolio_url: app.portfolio_url,
    cover_letter: String(app.cover_letter || "").slice(0, 4000),
  };
}

function buildPrompt(career: any, app: any, resumeText: string) {
  const resumeSnippet = String(resumeText || "").slice(0, 14000);
  return `JOB POST:
${JSON.stringify(buildCareerSummary(career), null, 2)}

APPLICANT SUBMISSION (form fields):
${JSON.stringify(buildApplicantSummary(app), null, 2)}

RESUME / CV TEXT (may be empty if unparseable):
"""${resumeSnippet}"""

Return JSON with exactly this shape:
{
  "detected_skills": string[],
  "detected_titles": string[],
  "detected_experience_years": number | null,
  "education": string,
  "contact_links": {
    "emails": string[], "phones": string[],
    "linkedin": string[], "github": string[],
    "portfolio": string[], "other": string[]
  },
  "highlights": string[],
  "red_flags": string[],
  "recommendation": string,
  "fit_score": number
}
Only return JSON. No prose, no markdown.`;
}

export async function aiStructuredExtract(args: {
  career: any;
  app: any;
  resumeText: string;
}): Promise<AiInsights | null> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return null;

  const system =
    "You are an expert ATS (Applicant Tracking System) analyst. Parse the candidate's full submission and return strict JSON only. Be objective, concise, and grounded in evidence from the materials.";

  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: buildPrompt(args.career, args.app, args.resumeText) },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!resp.ok) {
      console.error("ai gateway error", resp.status, await resp.text().catch(() => ""));
      return null;
    }
    const json = await resp.json();
    const raw = json?.choices?.[0]?.message?.content || "";
    const cleaned = String(raw).trim().replace(/^```json\s*/i, "").replace(/```\s*$/i, "");
    return JSON.parse(cleaned) as AiInsights;
  } catch (e) {
    console.error("ai parse failed", e);
    return null;
  }
}

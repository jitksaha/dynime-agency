// Merge deterministic + AI signals into the final update payload + summary string.
import type { ContactLinks } from "./contact-links.ts";
import type { AiInsights } from "./ai-extractor.ts";

export function mergeContactLinks(opts: {
  app: any;
  regex: ContactLinks;
  ai: AiInsights | null;
}) {
  const { app, regex, ai } = opts;
  const aiLinks = ai?.contact_links || {};
  const dedup = (arr: string[]) => Array.from(new Set(arr.filter(Boolean))).slice(0, 10);
  return {
    emails: dedup([
      ...(aiLinks.emails || []),
      ...regex.emails,
      ...(app.email ? [String(app.email).toLowerCase()] : []),
    ]),
    phones: dedup([
      ...(aiLinks.phones || []),
      ...regex.phones,
      ...(app.phone ? [app.phone] : []),
    ]),
    linkedin: dedup([
      ...(aiLinks.linkedin || []),
      ...regex.linkedIn,
      ...(app.linkedin_url ? [app.linkedin_url] : []),
    ]),
    github: dedup([...(aiLinks.github || []), ...regex.github]),
    portfolio: dedup([
      ...(aiLinks.portfolio || []),
      ...regex.portfolio,
      ...(app.portfolio_url ? [app.portfolio_url] : []),
    ]),
    other: dedup([...(aiLinks.other || []), ...regex.twitter, ...regex.dribbble]),
  };
}

export function buildSummary(opts: {
  career: any;
  app: any;
  matched: string[];
  keywords: string[];
  requiredYears: number | null;
  resumeChars: number;
  ai: AiInsights | null;
}): string {
  const { career, app, matched, keywords, requiredYears, resumeChars, ai } = opts;
  if (!career) return "No matching job post found for this application.";
  return (
    `Matched ${matched.length}/${keywords.length} keywords for "${career.title}".` +
    (requiredYears != null && app.experience_years != null
      ? ` Required ~${requiredYears}y, candidate has ${app.experience_years}y.` : "") +
    (ai?.recommendation ? ` ${ai.recommendation}` : "") +
    (resumeChars === 0 && app.resume_url ? " Resume could not be parsed." : "") +
    (!app.resume_url ? " No resume uploaded." : "")
  );
}

export function buildUpdatePayload(opts: {
  score: number;
  level: "high" | "medium" | "low";
  matched: string[];
  missing: string[];
  summary: string;
  resumeChars: number;
  contactLinks: ReturnType<typeof mergeContactLinks>;
  ai: AiInsights | null;
}): Record<string, any> {
  const { score, level, matched, missing, summary, resumeChars, contactLinks, ai } = opts;
  const payload: Record<string, any> = {
    ats_score: score,
    ats_match_level: level,
    ats_matched_keywords: matched.slice(0, 50),
    ats_missing_keywords: missing.slice(0, 50),
    ats_summary: summary,
    ats_scanned_at: new Date().toISOString(),
    ats_resume_chars: resumeChars,
    ats_contact_links: contactLinks,
  };
  if (ai) {
    if (Array.isArray(ai.detected_skills)) payload.ats_detected_skills = ai.detected_skills.slice(0, 60);
    if (Array.isArray(ai.detected_titles)) payload.ats_detected_titles = ai.detected_titles.slice(0, 20);
    if (typeof ai.detected_experience_years === "number") payload.ats_detected_experience_years = ai.detected_experience_years;
    if (typeof ai.education === "string") payload.ats_education = ai.education.slice(0, 1000);
    if (Array.isArray(ai.red_flags)) payload.ats_red_flags = ai.red_flags.slice(0, 20);
    if (typeof ai.recommendation === "string") payload.ats_recommendation = ai.recommendation.slice(0, 500);
    if (Array.isArray(ai.highlights)) payload.ats_highlights = ai.highlights.slice(0, 20);
  }
  return payload;
}

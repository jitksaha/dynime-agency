// Deterministic keyword overlap + experience-gap scoring.
import { tokenize } from "./text-utils.ts";

export interface KeywordMatch {
  matched: string[];
  missing: string[];
}

export function matchKeywords(corpus: string, keywords: string[]): KeywordMatch {
  const tokens = new Set(tokenize(corpus));
  const matched: string[] = [];
  const missing: string[] = [];
  for (const k of keywords) {
    if (tokens.has(k) || corpus.includes(k)) matched.push(k);
    else missing.push(k);
  }
  return { matched, missing };
}

export function computeBaseScore(opts: {
  keywords: string[];
  matched: string[];
  resumeChars: number;
}): number {
  const { keywords, matched, resumeChars } = opts;
  if (keywords.length > 0) {
    return Math.round((matched.length / keywords.length) * 100);
  }
  return resumeChars > 200 ? 50 : 25;
}

export function detectRequiredYears(career: any): number | null {
  const reqText = (career?.requirements || []).join(" ") + " " + (career?.content_html || "");
  const yrMatch = reqText.match(/(\d+)\+?\s*(?:\+|to\s*\d+)?\s*year/i);
  return yrMatch ? parseInt(yrMatch[1], 10) : null;
}

export function applyExperiencePenalty(opts: {
  baseScore: number;
  requiredYears: number | null;
  applicantYears: number | null;
}): number {
  const { baseScore, requiredYears, applicantYears } = opts;
  let score = baseScore;
  if (requiredYears != null && applicantYears != null) {
    const gap = requiredYears - Number(applicantYears);
    if (gap > 0) score = Math.max(0, score - Math.min(30, gap * 8));
  }
  return Math.max(0, Math.min(100, score));
}

export function blendWithAiScore(baseScore: number, aiScore: number | null): number {
  if (aiScore == null || !Number.isFinite(aiScore)) return baseScore;
  const clamped = Math.max(0, Math.min(100, Math.round(aiScore)));
  return Math.max(0, Math.min(100, Math.round(clamped * 0.6 + baseScore * 0.4)));
}

export function levelFromScore(score: number): "high" | "medium" | "low" {
  return score >= 70 ? "high" : score >= 40 ? "medium" : "low";
}

export function buildCandidateCorpus(app: any, resumeText: string): string {
  return [
    app.full_name, app.email, app.phone, app.country, app.current_position,
    app.expected_salary != null ? String(app.expected_salary) : "",
    app.experience_years != null ? `${app.experience_years} years experience` : "",
    app.linkedin_url, app.portfolio_url,
    app.cover_letter, resumeText,
  ].filter(Boolean).join("\n").toLowerCase();
}

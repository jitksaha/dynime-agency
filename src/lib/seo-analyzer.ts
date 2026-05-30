// 10-step SEO + AI-readability rules engine.
// Pure TypeScript — runs live in the browser as the user edits.
import { DEFAULT_SEO_RULES, mergeRules, type SeoRules } from "./seo-rules";

export type SeoSeverity = "pass" | "warn" | "fail" | "info";

export interface SeoCheck {
  id: string;
  step: number;
  group: string;
  label: string;
  severity: SeoSeverity;
  message: string;
  weight: number; // contribution to score (max points if pass)
}

export interface SeoInput {
  title?: string;
  metaDescription?: string;
  slug?: string;
  h1?: string;
  /** Raw HTML or markdown body */
  content?: string;
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  faqs?: { q: string; a: string }[];
  hasJsonLd?: boolean;
  internalLinkCount?: number;
  externalLinkCount?: number;
  imageCount?: number;
  imagesWithAlt?: number;
}

export interface SeoReport {
  score: number; // 0-100
  grade: "A" | "B" | "C" | "D" | "F";
  checks: SeoCheck[];
  groupedScores: Record<string, { earned: number; total: number }>;
  summary: { passes: number; warns: number; fails: number };
}

const stripHtml = (s = "") => s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const wordCount = (s = "") => (stripHtml(s).match(/\b[\w'-]+\b/g) || []).length;
const sentenceCount = (s = "") => (stripHtml(s).match(/[.!?]+/g) || []).length || 1;
const syllables = (w: string) =>
  Math.max(1, (w.toLowerCase().match(/[aeiouy]+/g) || []).length);

const fleschReading = (text: string) => {
  const words = stripHtml(text).split(/\s+/).filter(Boolean);
  if (!words.length) return 0;
  const sents = sentenceCount(text);
  const syl = words.reduce((a, w) => a + syllables(w), 0);
  return 206.835 - 1.015 * (words.length / sents) - 84.6 * (syl / words.length);
};

const norm = (s = "") => s.toLowerCase();
const includesKw = (text: string, kw?: string) =>
  !!kw && norm(text).includes(norm(kw));

const countMatches = (text: string, kw?: string) => {
  if (!kw) return 0;
  const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
  return (text.match(re) || []).length;
};

const headings = (html = "") => {
  const h1 = (html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi) || []).length;
  const h2 = (html.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi) || []).length;
  const h3 = (html.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi) || []).length;
  return { h1, h2, h3 };
};

const hasList = (html = "") => /<ul\b|<ol\b/i.test(html);
const hasTable = (html = "") => /<table\b/i.test(html);

export function analyzeSeo(input: SeoInput, rulesInput?: Partial<SeoRules> | null): SeoReport {
  const rules = mergeRules(rulesInput);
  const W = rules.weights;
  const T = rules.thresholds;
  const checks: SeoCheck[] = [];
  const html = input.content || "";
  const text = stripHtml(html);
  const words = wordCount(html);
  const kw = input.primaryKeyword?.trim();
  const titleLen = (input.title || "").length;
  const descLen = (input.metaDescription || "").length;
  const slug = (input.slug || "").trim();
  const hs = headings(html);

  const add = (c: SeoCheck) => checks.push({ ...c, weight: W[c.id] ?? c.weight });

  // ── Step 1: Intent + keyword research ───────────────────────────────
  add({
    id: "primary-kw",
    step: 1,
    group: "Keyword Research",
    label: "Primary keyword defined",
    weight: 6,
    severity: kw ? "pass" : "fail",
    message: kw ? `Primary keyword: "${kw}"` : "Set a primary keyword to optimise around.",
  });
  add({
    id: "secondary-kw",
    step: 1,
    group: "Keyword Research",
    label: "Secondary / long-tail keywords",
    weight: 4,
    severity: (input.secondaryKeywords?.length ?? 0) >= T.secondaryKwPass ? "pass"
      : (input.secondaryKeywords?.length ?? 0) >= T.secondaryKwWarn ? "warn" : "fail",
    message: `${input.secondaryKeywords?.length ?? 0} secondary keywords (aim for ${T.secondaryKwPass}+).`,
  });

  // ── Step 2: SEO architecture ────────────────────────────────────────
  add({
    id: "title-length",
    step: 2,
    group: "SEO Architecture",
    label: `Meta title length (${T.titleMin}–${T.titleMax})`,
    weight: 6,
    severity: titleLen >= T.titleMin && titleLen <= T.titleMax ? "pass"
      : titleLen >= T.titleSoftMin && titleLen <= T.titleSoftMax ? "warn" : "fail",
    message: `${titleLen} characters.`,
  });
  add({
    id: "title-kw",
    step: 2,
    group: "SEO Architecture",
    label: "Primary keyword in title",
    weight: 5,
    severity: includesKw(input.title || "", kw) ? "pass" : kw ? "fail" : "info",
    message: kw ? (includesKw(input.title || "", kw)
      ? "Title contains primary keyword."
      : "Add the primary keyword to the title.") : "Awaiting primary keyword.",
  });
  add({
    id: "desc-length",
    step: 2,
    group: "SEO Architecture",
    label: `Meta description length (${T.descMin}–${T.descMax})`,
    weight: 5,
    severity: descLen >= T.descMin && descLen <= T.descMax ? "pass"
      : descLen >= T.descSoftMin && descLen <= T.descSoftMax ? "warn" : "fail",
    message: `${descLen} characters.`,
  });
  add({
    id: "desc-kw",
    step: 2,
    group: "SEO Architecture",
    label: "Primary keyword in description",
    weight: 3,
    severity: includesKw(input.metaDescription || "", kw) ? "pass" : kw ? "warn" : "info",
    message: includesKw(input.metaDescription || "", kw)
      ? "Description contains primary keyword."
      : "Mention the primary keyword once in the description.",
  });
  add({
    id: "slug",
    step: 2,
    group: "SEO Architecture",
    label: "URL slug short & keyword-rich",
    weight: 3,
    severity: slug
      ? slug.length <= T.slugMaxChars && slug.split("-").length <= T.slugMaxParts && (!kw || slug.includes(norm(kw).replace(/\s+/g, "-")))
        ? "pass"
        : "warn"
      : "fail",
    message: slug ? `/${slug}` : "Slug is empty.",
  });
  add({
    id: "h1",
    step: 2,
    group: "SEO Architecture",
    label: "Single H1 with primary keyword",
    weight: 5,
    severity:
      hs.h1 === 1 && (!kw || includesKw(input.h1 || (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? ""), kw))
        ? "pass"
        : hs.h1 === 1 ? "warn"
        : hs.h1 === 0 ? "fail" : "fail",
    message: hs.h1 === 1 ? "One H1 found." : hs.h1 === 0 ? "Add exactly one H1." : `${hs.h1} H1 tags — keep only one.`,
  });

  // ── Step 3: Content engine ──────────────────────────────────────────
  add({
    id: "word-count",
    step: 3,
    group: "Content",
    label: `Content depth (≥ ${T.wordCountWarn} words)`,
    weight: 8,
    severity: words >= T.wordCountPass ? "pass" : words >= T.wordCountWarn ? "warn" : "fail",
    message: `${words} words.`,
  });
  add({
    id: "kw-density",
    step: 3,
    group: "Content",
    label: `Keyword density ${T.densityMin}–${T.densityMax}%`,
    weight: 4,
    severity: (() => {
      if (!kw || !words) return "info";
      const density = (countMatches(text, kw) / words) * 100;
      if (density >= T.densityMin && density <= T.densityMax) return "pass";
      if (density > 0 && density <= T.densityHardMax) return "warn";
      return "fail";
    })(),
    message: kw && words
      ? `${((countMatches(text, kw) / words) * 100).toFixed(2)}% (${countMatches(text, kw)} mentions).`
      : "Awaiting keyword & content.",
  });
  add({
    id: "headings",
    step: 3,
    group: "Content",
    label: "H2 / H3 structure",
    weight: 5,
    severity: hs.h2 >= T.h2Pass ? "pass" : hs.h2 >= 1 ? "warn" : "fail",
    message: `${hs.h2} H2 · ${hs.h3} H3`,
  });
  add({
    id: "intro-kw",
    step: 3,
    group: "Content",
    label: "Primary keyword in first 100 words",
    weight: 4,
    severity: kw ? (includesKw(text.slice(0, 600), kw) ? "pass" : "warn") : "info",
    message: kw && includesKw(text.slice(0, 600), kw)
      ? "Found early in content."
      : "Mention the primary keyword in the opening paragraph.",
  });

  // ── Step 4: Featured snippet / AI extraction ────────────────────────
  add({
    id: "lists",
    step: 4,
    group: "AI Extraction",
    label: "Bullet or numbered lists present",
    weight: 4,
    severity: hasList(html) ? "pass" : "warn",
    message: hasList(html) ? "List markup detected." : "Add a <ul> or <ol> for snippet eligibility.",
  });
  add({
    id: "table",
    step: 4,
    group: "AI Extraction",
    label: "Comparison table (optional)",
    weight: 2,
    severity: hasTable(html) ? "pass" : "info",
    message: hasTable(html) ? "Table detected." : "Tables boost rich-result chances.",
  });
  add({
    id: "definition",
    step: 4,
    group: "AI Extraction",
    label: "Definition-style answer block",
    weight: 3,
    severity: /^|\s(is|are|means|refers to)\s/i.test(text.slice(0, 400)) ? "pass" : "warn",
    message: "Use a 'X is …' definition early so LLMs can cite it.",
  });

  // ── Step 5: FAQ + Schema ────────────────────────────────────────────
  add({
    id: "faqs",
    step: 5,
    group: "FAQ & Schema",
    label: `≥ ${T.faqsPass} FAQs with concise answers`,
    weight: 6,
    severity: (input.faqs?.length ?? 0) >= T.faqsPass ? "pass"
      : (input.faqs?.length ?? 0) >= T.faqsWarn ? "warn" : "fail",
    message: `${input.faqs?.length ?? 0} FAQs.`,
  });
  add({
    id: "schema",
    step: 5,
    group: "FAQ & Schema",
    label: "JSON-LD schema present",
    weight: 5,
    severity: input.hasJsonLd || /application\/ld\+json/i.test(html) ? "pass" : "fail",
    message: input.hasJsonLd ? "Schema flag enabled." : "Add FAQ / Article / Service JSON-LD.",
  });

  // ── Step 6: Internal linking ────────────────────────────────────────
  add({
    id: "internal-links",
    step: 6,
    group: "Internal Links",
    label: `≥ ${T.internalLinksMin} internal links`,
    weight: 4,
    severity: (input.internalLinkCount ?? (html.match(/href="\/[^"]+"/gi) || []).length) >= T.internalLinksMin ? "pass" : "warn",
    message: `${input.internalLinkCount ?? (html.match(/href="\/[^"]+"/gi) || []).length} internal links.`,
  });
  add({
    id: "external-links",
    step: 6,
    group: "Internal Links",
    label: `${T.externalLinksMin}–${T.externalLinksMax} authoritative external links`,
    weight: 2,
    severity: (() => {
      const n = input.externalLinkCount ?? (html.match(/href="https?:\/\//gi) || []).length;
      return n >= T.externalLinksMin && n <= T.externalLinksMax ? "pass" : n === 0 ? "warn" : "info";
    })(),
    message: `${input.externalLinkCount ?? (html.match(/href="https?:\/\//gi) || []).length} external links.`,
  });

  // ── Step 7: Technical SEO ───────────────────────────────────────────
  add({
    id: "readability",
    step: 7,
    group: "Technical & UX",
    label: `Readability (Flesch ≥ ${T.fleschPass})`,
    weight: 4,
    severity: (() => {
      if (!words) return "info";
      const f = fleschReading(html);
      return f >= T.fleschPass ? "pass" : f >= T.fleschWarn ? "warn" : "fail";
    })(),
    message: words ? `Flesch score ${fleschReading(html).toFixed(0)}.` : "Add content to score.",
  });
  add({
    id: "image-alt",
    step: 7,
    group: "Technical & UX",
    label: "All images have alt text",
    weight: 3,
    severity: (() => {
      const total = input.imageCount ?? (html.match(/<img\b/gi) || []).length;
      const withAlt = input.imagesWithAlt ?? (html.match(/<img\b[^>]*alt=("|')[^"']+\1/gi) || []).length;
      if (total === 0) return "info";
      return withAlt === total ? "pass" : withAlt >= total / 2 ? "warn" : "fail";
    })(),
    message: (() => {
      const total = input.imageCount ?? (html.match(/<img\b/gi) || []).length;
      const withAlt = input.imagesWithAlt ?? (html.match(/<img\b[^>]*alt=("|')[^"']+\1/gi) || []).length;
      return total ? `${withAlt}/${total} images with alt.` : "No images.";
    })(),
  });
  add({
    id: "para-length",
    step: 7,
    group: "Technical & UX",
    label: `Short paragraphs (≤ ${T.paraMaxWords} words)`,
    weight: 2,
    severity: (() => {
      const paras = (html.match(/<p\b[^>]*>([\s\S]*?)<\/p>/gi) || []).map((p) => wordCount(p));
      if (!paras.length) return "info";
      const tooLong = paras.filter((w) => w > T.paraMaxWords).length;
      return tooLong === 0 ? "pass" : tooLong <= 2 ? "warn" : "fail";
    })(),
    message: `Aim for ≤ ${T.paraMaxWords} words per paragraph.`,
  });

  // ── Step 9: Conversion layer ────────────────────────────────────────
  add({
    id: "cta",
    step: 9,
    group: "Conversion",
    label: "CTA present in content",
    weight: 4,
    severity: /(get started|book a call|contact us|request a quote|talk to|sign up|try (it )?free)/i.test(text)
      ? "pass" : "warn",
    message: "Include at least one clear CTA phrase.",
  });
  add({
    id: "trust",
    step: 9,
    group: "Conversion",
    label: "Trust signal (number, %, guarantee)",
    weight: 3,
    severity: /\d+%|\d{2,}\+|guarantee|certified|trusted by|iso |gdpr/i.test(text) ? "pass" : "warn",
    message: "Add a stat, %, or trust phrase to strengthen credibility.",
  });

  // ── Aggregate ───────────────────────────────────────────────────────
  let earned = 0;
  let total = 0;
  const groupedScores: Record<string, { earned: number; total: number }> = {};
  let passes = 0, warns = 0, fails = 0;
  for (const c of checks) {
    if (c.severity === "info") continue;
    total += c.weight;
    const got = c.severity === "pass" ? c.weight : c.severity === "warn" ? c.weight * 0.5 : 0;
    earned += got;
    const g = (groupedScores[c.group] ||= { earned: 0, total: 0 });
    g.earned += got;
    g.total += c.weight;
    if (c.severity === "pass") passes++;
    else if (c.severity === "warn") warns++;
    else fails++;
  }
  const score = Math.round((earned / Math.max(total, 1)) * 100);
  const grade: SeoReport["grade"] =
    score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 40 ? "D" : "F";

  return { score, grade, checks, groupedScores, summary: { passes, warns, fails } };
}

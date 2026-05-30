// Configurable SEO scoring rules. Persisted in site_settings.seo_rules
// and read live by the analyzer + admin panel.

export interface SeoRules {
  weights: Record<string, number>;
  thresholds: {
    titleMin: number;
    titleMax: number;
    titleSoftMin: number;
    titleSoftMax: number;
    descMin: number;
    descMax: number;
    descSoftMin: number;
    descSoftMax: number;
    slugMaxChars: number;
    slugMaxParts: number;
    wordCountPass: number;
    wordCountWarn: number;
    densityMin: number;
    densityMax: number;
    densityHardMax: number;
    h2Pass: number;
    fleschPass: number;
    fleschWarn: number;
    paraMaxWords: number;
    internalLinksMin: number;
    externalLinksMin: number;
    externalLinksMax: number;
    faqsPass: number;
    faqsWarn: number;
    secondaryKwPass: number;
    secondaryKwWarn: number;
  };
}

export const DEFAULT_SEO_RULES: SeoRules = {
  weights: {
    "primary-kw": 6,
    "secondary-kw": 4,
    "title-length": 6,
    "title-kw": 5,
    "desc-length": 5,
    "desc-kw": 3,
    slug: 3,
    h1: 5,
    "word-count": 8,
    "kw-density": 4,
    headings: 5,
    "intro-kw": 4,
    lists: 4,
    table: 2,
    definition: 3,
    faqs: 6,
    schema: 5,
    "internal-links": 4,
    "external-links": 2,
    readability: 4,
    "image-alt": 3,
    "para-length": 2,
    cta: 4,
    trust: 3,
  },
  thresholds: {
    titleMin: 50,
    titleMax: 60,
    titleSoftMin: 30,
    titleSoftMax: 70,
    descMin: 130,
    descMax: 155,
    descSoftMin: 70,
    descSoftMax: 165,
    slugMaxChars: 60,
    slugMaxParts: 6,
    wordCountPass: 1200,
    wordCountWarn: 600,
    densityMin: 0.5,
    densityMax: 2.5,
    densityHardMax: 4,
    h2Pass: 3,
    fleschPass: 60,
    fleschWarn: 45,
    paraMaxWords: 90,
    internalLinksMin: 3,
    externalLinksMin: 1,
    externalLinksMax: 5,
    faqsPass: 5,
    faqsWarn: 3,
    secondaryKwPass: 3,
    secondaryKwWarn: 1,
  },
};

export const SEO_CHECK_LABELS: Record<string, string> = {
  "primary-kw": "Primary keyword defined",
  "secondary-kw": "Secondary / long-tail keywords",
  "title-length": "Meta title length",
  "title-kw": "Primary keyword in title",
  "desc-length": "Meta description length",
  "desc-kw": "Primary keyword in description",
  slug: "URL slug quality",
  h1: "Single H1 with primary keyword",
  "word-count": "Content depth",
  "kw-density": "Keyword density",
  headings: "H2 / H3 structure",
  "intro-kw": "Primary keyword in intro",
  lists: "Bullet / numbered lists",
  table: "Comparison table",
  definition: "Definition-style answer",
  faqs: "FAQ count",
  schema: "JSON-LD schema",
  "internal-links": "Internal links",
  "external-links": "External authority links",
  readability: "Readability (Flesch)",
  "image-alt": "Image alt text",
  "para-length": "Short paragraphs",
  cta: "Call-to-action present",
  trust: "Trust signal present",
};

export function mergeRules(partial?: Partial<SeoRules> | null): SeoRules {
  if (!partial) return DEFAULT_SEO_RULES;
  return {
    weights: { ...DEFAULT_SEO_RULES.weights, ...(partial.weights || {}) },
    thresholds: { ...DEFAULT_SEO_RULES.thresholds, ...(partial.thresholds || {}) },
  };
}

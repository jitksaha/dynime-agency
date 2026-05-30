// Brand tone presets — full HomeSections overrides per tone.
// Editable copy variants the admin can swap site-wide with one click.
import { DEFAULT_HOME_SECTIONS, HomeSections } from "./home-sections-defaults";

export type BrandTone = "premium" | "bold" | "friendly" | "results";

export const BRAND_TONE_LABELS: Record<BrandTone, { label: string; desc: string }> = {
  premium: { label: "Premium & Elegant", desc: "Refined, agency-style — Apple/Stripe vibe" },
  bold: { label: "Bold & Confident", desc: "Punchy, strong claims — assertive leader voice" },
  friendly: { label: "Friendly & Energetic", desc: "Warm, approachable, exciting" },
  results: { label: "Results-Driven", desc: "Numbers, ROI, growth-focused messaging" },
};

/** Patch only the copy fields — keep structural defaults (badges, items, etc.) intact. */
type ToneCopy = {
  hero: { eyebrow: string; headline: string; subheadline: string; primary_cta_label: string; secondary_cta_label: string };
  services: { eyebrow: string; heading: string; description: string };
  testimonials: { eyebrow: string; heading: string; description: string };
  team: { eyebrow: string; heading_prefix: string; heading_highlight: string; description: string };
  countries: { eyebrow: string; heading_prefix: string; heading_highlight: string; description: string };
  founder: { headline: string; bio: string; cta_label: string };
  cta: { heading_prefix: string; heading_highlight: string; heading_suffix: string; description: string; primary_cta_label: string; secondary_cta_label: string };
};

export const BRAND_TONE_PRESETS: Record<BrandTone, ToneCopy> = {
  premium: {
    hero: {
      eyebrow: "Dynime Inc. — Crafted for visionary brands",
      headline: "Where Ambitious Brands Become {{Iconic}} — Engineered, Designed, Delivered.",
      subheadline: "We partner with founders and enterprises to design, build, and scale category-defining digital experiences. From bespoke web platforms to global growth — every detail, considered.",
      primary_cta_label: "Begin Your Project",
      secondary_cta_label: "Explore Our Work",
    },
    services: {
      eyebrow: "Our Craft",
      heading: "A Studio of Specialists. A Spectrum of Excellence.",
      description: "Eight disciplines, one obsession — building digital experiences that move markets and elevate brands.",
    },
    testimonials: {
      eyebrow: "In Their Words",
      heading: "The World's Most Discerning Brands Choose Dynime",
      description: "From early-stage founders to global enterprises — hear why category leaders entrust their digital future to our studio.",
    },
    team: {
      eyebrow: "50+ specialists, one studio",
      heading_prefix: "The Minds Behind the",
      heading_highlight: "Magic",
      description: "Award-winning designers, engineers, strategists, and storytellers — collaborating across continents to shape brands that endure.",
    },
    countries: {
      eyebrow: "Global by design",
      heading_prefix: "A Studio Without Borders —",
      heading_highlight: "20+ countries",
      description: "From Manhattan to Mayfair to Marina Bay — we partner with visionary teams across continents and time zones.",
    },
    founder: {
      headline: "Excellence Is Not a Standard. It's the Starting Point.",
      bio: "Every brand has a story worth telling beautifully. At Dynime, we blend strategic clarity with creative craft to build digital experiences that don't just perform — they resonate. Let's create something timeless together.",
      cta_label: "Discover Our Story",
    },
    cta: {
      heading_prefix: "Your Next Chapter Begins With",
      heading_highlight: "One Conversation",
      heading_suffix: ".",
      description: "Tell us about your vision. We'll respond within 24 hours with a tailored strategy and a clear path forward.",
      primary_cta_label: "Start the Conversation",
      secondary_cta_label: "View Selected Work",
    },
  },
  bold: {
    hero: {
      eyebrow: "Dynime Inc. — Built to Dominate",
      headline: "We Build What Others {{Can't}}. Period.",
      subheadline: "Stop settling. We engineer ruthlessly fast websites, growth machines, and global business structures that put you ahead — and keep you there.",
      primary_cta_label: "Launch My Project",
      secondary_cta_label: "See Proof",
    },
    services: {
      eyebrow: "What We Do",
      heading: "Eight Weapons. One Mission: Your Growth.",
      description: "We don't dabble. Every service is sharp, focused, and built to deliver outsized results.",
    },
    testimonials: {
      eyebrow: "Receipts",
      heading: "500+ Brands. Zero Regrets.",
      description: "Founders and CEOs don't fake reviews. Read what they actually say after working with us.",
    },
    team: {
      eyebrow: "50+ killers worldwide",
      heading_prefix: "The Squad That",
      heading_highlight: "Delivers",
      description: "Hand-picked engineers, designers, and growth experts. No juniors. No fillers. Just operators who ship.",
    },
    countries: {
      eyebrow: "Global muscle",
      heading_prefix: "Winning in",
      heading_highlight: "20+ countries",
      description: "We've shipped for clients in every major market. Your geography isn't a problem — it's an advantage.",
    },
    founder: {
      headline: "Good Enough Is the Enemy. We Don't Negotiate on Quality.",
      bio: "We took the agency model and rebuilt it for founders who refuse to compromise. Faster. Sharper. Accountable. If you're tired of mediocrity, you're in the right place.",
      cta_label: "Meet the Team",
    },
    cta: {
      heading_prefix: "Stop Planning.",
      heading_highlight: "Start Winning",
      heading_suffix: ".",
      description: "Tell us what you're building. We'll tell you exactly how we'll help you win — within 24 hours.",
      primary_cta_label: "Get My Free Strategy",
      secondary_cta_label: "See Case Studies",
    },
  },
  friendly: {
    hero: {
      eyebrow: "Hey there 👋 — we're Dynime",
      headline: "Let's Build Something {{Amazing}} Together.",
      subheadline: "We're a friendly team of designers, developers, and marketers who love helping brands shine online. Big ideas welcome — coffee on us.",
      primary_cta_label: "Say Hello",
      secondary_cta_label: "Peek at Our Work",
    },
    services: {
      eyebrow: "How we help",
      heading: "Everything You Need, All Under One Roof",
      description: "Whether you're launching, scaling, or rebranding — we've got the team and the tools to make it happen.",
    },
    testimonials: {
      eyebrow: "Happy clients",
      heading: "Don't Just Take Our Word for It",
      description: "Here's what our friends and partners have to say about working with the Dynime team.",
    },
    team: {
      eyebrow: "Meet the crew",
      heading_prefix: "The People Behind the",
      heading_highlight: "Smiles",
      description: "Talented humans who care about your success — and have a lot of fun making it happen.",
    },
    countries: {
      eyebrow: "Friends everywhere",
      heading_prefix: "Working with awesome people in",
      heading_highlight: "20+ countries",
      description: "From small startups to growing brands — we love partnering with teams all over the world.",
    },
    founder: {
      headline: "Every Project Starts With a Real Conversation.",
      bio: "We treat every client like a friend — because that's how the best work happens. Tell us your story, your goals, your worries. We'll listen, then roll up our sleeves and help you grow.",
      cta_label: "Get to Know Us",
    },
    cta: {
      heading_prefix: "Got an Idea?",
      heading_highlight: "Let's Chat",
      heading_suffix: "!",
      description: "No pressure, no jargon. Just a friendly conversation about how we can help bring your vision to life.",
      primary_cta_label: "Send Us a Note",
      secondary_cta_label: "Browse Our Work",
    },
  },
  results: {
    hero: {
      eyebrow: "Dynime Inc. — Engineered for ROI",
      headline: "Turn Digital Spend Into {{3-5x Returns}}. Measurably.",
      subheadline: "We've driven $40M+ in client revenue through high-converting websites, ROI-positive ad campaigns, and data-driven growth systems. Your numbers are next.",
      primary_cta_label: "Get a Growth Audit",
      secondary_cta_label: "See Results",
    },
    services: {
      eyebrow: "Growth services",
      heading: "Every Service. One KPI: Revenue.",
      description: "We don't sell deliverables. We sell measurable business outcomes — backed by analytics, A/B tests, and weekly reporting.",
    },
    testimonials: {
      eyebrow: "Real numbers",
      heading: "340% Revenue Lift. 5x ROAS. Page-1 Rankings.",
      description: "Our clients track results, not vanity metrics. Here's what they've achieved.",
    },
    team: {
      eyebrow: "50+ growth operators",
      heading_prefix: "The Team Driving Your",
      heading_highlight: "Numbers",
      description: "Performance marketers, conversion specialists, and engineers obsessed with metrics that matter to your bottom line.",
    },
    countries: {
      eyebrow: "Performance worldwide",
      heading_prefix: "Driving growth in",
      heading_highlight: "20+ countries",
      description: "Multi-market campaigns, localized funnels, and globally optimized infrastructure — all measured, all accountable.",
    },
    founder: {
      headline: "If We Can't Measure It, We Don't Promise It.",
      bio: "After delivering 500+ projects, one thing is clear: results compound when strategy meets execution. We track every metric, optimize every funnel, and report transparently — so you always know what's working.",
      cta_label: "See Our Numbers",
    },
    cta: {
      heading_prefix: "Ready to See",
      heading_highlight: "Real Growth",
      heading_suffix: "?",
      description: "Book a free 30-minute audit. We'll show you exactly where you're losing revenue — and how to fix it.",
      primary_cta_label: "Book My Free Audit",
      secondary_cta_label: "View ROI Case Studies",
    },
  },
};

/** Apply a tone preset on top of an existing HomeSections (or defaults). */
export function applyBrandTone(tone: BrandTone, base?: HomeSections | null): HomeSections {
  const b = base || DEFAULT_HOME_SECTIONS;
  const p = BRAND_TONE_PRESETS[tone];
  return {
    ...b,
    hero: { ...b.hero, ...p.hero },
    services: { ...b.services, ...p.services },
    testimonials: { ...b.testimonials, ...p.testimonials },
    team: { ...b.team, ...p.team },
    countries: { ...b.countries, ...p.countries },
    founder: { ...b.founder, ...p.founder },
    cta: { ...b.cta, ...p.cta },
  };
}

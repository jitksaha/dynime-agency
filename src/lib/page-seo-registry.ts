/**
 * Registry of every editable route in the site. Keys are stable identifiers
 * used as map keys in `site_settings.page_seo` (jsonb) so admins can override
 * meta per page without code changes. Pages call `usePageSEO(key, fallback)`.
 */
import { servicePages } from "@/data/services";
import { SEO_DEFAULTS } from "./seo-defaults";

export interface PageSEORegistryEntry {
  key: string;
  label: string;
  path: string;
  group: "Core" | "Service" | "Product" | "Legal" | "Account";
  defaults: { title: string; description: string; keywords?: string[] };

}

const core: PageSEORegistryEntry[] = [
  { key: "home", label: "Home", path: "/", group: "Core", defaults: SEO_DEFAULTS.home },
  { key: "about", label: "About", path: "/about", group: "Core", defaults: SEO_DEFAULTS.about },
  { key: "services", label: "Services", path: "/services", group: "Core", defaults: SEO_DEFAULTS.services },
  { key: "portfolio", label: "Portfolio", path: "/portfolio", group: "Core", defaults: SEO_DEFAULTS.portfolio },
  { key: "contact", label: "Contact", path: "/contact", group: "Core", defaults: SEO_DEFAULTS.contact },
  { key: "blog", label: "Blog", path: "/blog", group: "Core", defaults: SEO_DEFAULTS.blog },
  { key: "careers", label: "Careers", path: "/careers", group: "Core", defaults: SEO_DEFAULTS.careers },
  
];

const products: PageSEORegistryEntry[] = [
  {
    key: "product-dbm",
    label: "Dynime OS",
    path: "/products/os",
    group: "Product",
    defaults: {
      title: "Dynime OS — All-in-One Business Management Software",
      description:
        "Run your whole company on one AI-powered platform: CRM, HRM, Sales, Finance, Projects, Inventory and Support. Built for SMBs replacing 5+ disconnected SaaS tools.",
      keywords: [
        "all in one business management software",
        "ERP alternative for small business",
        "CRM HRM accounting software",
        "AI business operating system",
        "SaaS for SMBs",
        "Dynime OS",
        "unified business platform",
        "CRM and ERP combined",
      ],
    },
  },
  {
    key: "product-pay-open-source",
    label: "Dynime Pay (Self-Hosted)",
    path: "/pay-open-source",
    group: "Product",
    defaults: {
      title: "Open-Source Self-Hosted Payment Gateway — 46 Rails",
      description:
        "Self-hosted, white-label payment gateway with bKash, Nagad, Rocket, Stripe, Binance, SSLCommerz and 40+ more rails. Personal & merchant modes, open-source, deploy in minutes.",
      keywords: [
        "open source payment gateway",
        "self hosted payment gateway",
        "white label payment gateway",
        "bKash payment gateway integration",
        "Nagad payment gateway",
        "Stripe alternative open source",
        "SSLCommerz integration",
        "Bangladesh payment gateway",
        "crypto payment gateway",
        "Dynime Pay",
      ],
    },
  },
  {
    key: "services-dss",
    label: "DSS — Software Services",
    path: "/services/dss",
    group: "Product",
    defaults: {
      title: "Custom Software & AI App Development Services",
      description:
        "Dynime Software Services builds custom software, AI applications and QA-engineered systems for funded startups and enterprises — senior engineers, fixed scope, weekly shipping.",
      keywords: [
        "custom software development services",
        "AI application development",
        "enterprise software development",
        "QA engineering services",
        "hire software engineers",
        "MVP development agency",
        "SaaS development company",
        "Dynime Software Services",
      ],
    },
  },
  {
    key: "usa-formation",
    label: "USA Company Formation",
    path: "/usa-business-formation",
    group: "Product",
    defaults: {
      title: "USA LLC Formation for Non-Residents — All 50 States",
      description:
        "Form a US LLC or C-Corp from anywhere in the world. Compare state fees, annual costs and taxes across all 50 states. EIN, registered agent and bank account included.",
      keywords: [
        "USA LLC formation for non residents",
        "form LLC in USA from abroad",
        "Delaware LLC formation",
        "Wyoming LLC formation",
        "register US company online",
        "EIN for non US resident",
        "US C-Corp formation",
        "open US business bank account",
        "USA company registration service",
      ],
    },
  },
  {
    key: "services-pricing",
    label: "Services Pricing",
    path: "/services-pricing",
    group: "Product",
    defaults: {
      title: "Service Pricing — Web, Marketing, AI & Software Packages",
      description:
        "Transparent fixed-price packages for web development, SEO, paid ads, AI software, e-commerce and company formation. Compare 30+ services and pick the right plan.",
      keywords: [
        "web development pricing",
        "digital agency pricing",
        "SEO services pricing",
        "Shopify development cost",
        "WordPress development cost",
        "AI development pricing",
        "fixed price web services",
        "Dynime pricing",
      ],
    },
  },
  {
    key: "flexpay",
    label: "FlexPay — Buy Now, Pay Later",
    path: "/flexpay",
    group: "Product",
    defaults: {
      title: "FlexPay — Buy Now, Pay Later for Digital Services",
      description:
        "Buy Now, Pay Later for web, marketing, AI and e-commerce services. Get a Dynime FlexPay credit limit in minutes — split into EMI installments with no credit card required.",
      keywords: [
        "buy now pay later digital services",
        "EMI for web development",
        "pay later for SEO services",
        "BNPL for businesses",
        "installment payment for agency services",
        "Dynime FlexPay",
        "interest free EMI services",
      ],
    },
  },
  {
    key: "flexpay-apply",
    label: "FlexPay — Apply for Credit",
    path: "/flexpay/apply",
    group: "Product",
    defaults: {
      title: "Apply for FlexPay Credit — Instant Pre-Approval",
      description:
        "Apply for a Dynime FlexPay spending limit in under 3 minutes. Soft-check, instant pre-approval, transparent EMI terms. No credit card or hard pull required.",
      keywords: [
        "apply for buy now pay later",
        "instant BNPL approval",
        "FlexPay credit application",
        "no credit card EMI",
        "instant business credit line",
        "Dynime FlexPay apply",
      ],
    },
  },
  {
    key: "invest",
    label: "Invest in Dynime",
    path: "/investor",
    group: "Product",
    defaults: {
      title: "Invest in Dynime LLC. — Shareholder Plans & Profit Calculator",
      description:
        "Invest in a profitable, audited global digital agency. Choose a shareholder plan, see projected returns with our profit calculator, and join 25+ existing investors.",
      keywords: [
        "invest in digital agency",
        "buy shares in startup",
        "shareholder investment plans",
        "agency equity investment",
        "Dynime investor plans",
        "passive income investment",
        "global business investment opportunity",
      ],
    },
  },
  {
    key: "investor-relations",
    label: "Investor Relations",
    path: "/investor-relations",
    group: "Product",
    defaults: {
      title: "Investor Relations — Reports, Governance & IR Contact",
      description:
        "Investor Relations at Dynime LLC. — audited financials, quarterly shareholder reports, governance, voting rights and direct access to our IR team.",
      keywords: [
        "Dynime investor relations",
        "shareholder reports",
        "quarterly investor reports",
        "agency governance and reporting",
        "IR contact Dynime",
        "audited agency financials",
      ],
    },
  },
];

// Legal & policy pages (also editable in the SEO admin).
const legal: PageSEORegistryEntry[] = [
  {
    key: "legal:privacy",
    label: "Privacy Policy",
    path: "/privacy",
    group: "Legal",
    defaults: {
      title: "Privacy Policy — How Dynime Protects Your Data",
      description:
        "Read how Dynime LLC. collects, uses and protects personal data under GDPR, CCPA and global privacy laws. Cookies, retention, rights and contact for data requests.",
      keywords: ["privacy policy", "GDPR compliance", "CCPA", "data protection", "Dynime privacy"],
    },
  },
  {
    key: "legal:terms",
    label: "Terms of Service",
    path: "/terms",
    group: "Legal",
    defaults: {
      title: "Terms of Service — Dynime LLC. Customer Agreement",
      description:
        "The legal agreement between Dynime LLC. and customers using our digital services, software, FlexPay and investment products. Read scope, payments, liability and dispute terms.",
      keywords: ["terms of service", "customer agreement", "service terms", "Dynime terms"],
    },
  },
  {
    key: "legal:refund",
    label: "Refund Policy",
    path: "/refund",
    group: "Legal",
    defaults: {
      title: "Refund & Cancellation Policy — Digital Services",
      description:
        "Eligibility, timelines and process for refunds and order cancellations on Dynime digital services, software subscriptions, FlexPay installments and one-time projects.",
      keywords: ["refund policy", "cancellation policy", "service refund", "money back guarantee"],
    },
  },
  {
    key: "legal:cookies",
    label: "Cookie Policy",
    path: "/cookies",
    group: "Legal",
    defaults: {
      title: "Cookie Policy — Tracking & Consent Choices",
      description:
        "How Dynime uses cookies, local storage and pixels for authentication, analytics and personalization. Manage your consent and learn about third-party trackers.",
      keywords: ["cookie policy", "cookie consent", "tracking cookies", "GDPR cookies"],
    },
  },
  {
    key: "legal:aml",
    label: "AML & Compliance",
    path: "/aml",
    group: "Legal",
    defaults: {
      title: "AML & KYC Compliance Policy — Dynime LLC.",
      description:
        "Dynime's Anti-Money Laundering, KYC, sanctions-screening and counter-terrorism financing program. Country eligibility, ID checks and reporting obligations.",
      keywords: ["AML policy", "KYC compliance", "sanctions screening", "anti money laundering", "OFAC"],
    },
  },
  {
    key: "legal:payments",
    label: "Payments Policy",
    path: "/payments",
    group: "Legal",
    defaults: {
      title: "Payments Policy — Methods, Fees & Settlement",
      description:
        "Accepted payment methods, processing fees, settlement timelines, chargeback handling and FlexPay installment rules for Dynime customers and merchants worldwide.",
      keywords: ["payments policy", "payment methods", "settlement terms", "chargeback policy"],
    },
  },
  {
    key: "legal:support",
    label: "Support & SLA",
    path: "/support",
    group: "Legal",
    defaults: {
      title: "Support Policy & SLA — Response & Uptime Commitments",
      description:
        "Dynime's customer support tiers, channels, response-time SLAs and uptime commitments for software, hosting and managed services. Severity levels and escalation path.",
      keywords: ["support policy", "service level agreement", "SLA uptime", "customer support tiers"],
    },
  },
  {
    key: "legal:acceptable-use",
    label: "Acceptable Use Policy",
    path: "/acceptable-use",
    group: "Legal",
    defaults: {
      title: "Acceptable Use Policy — Prohibited Content & Activity",
      description:
        "Rules for using Dynime hosting, software, FlexPay and APIs. Prohibited content, abusive behavior, security restrictions and enforcement actions explained.",
      keywords: ["acceptable use policy", "AUP", "prohibited content", "abuse policy"],
    },
  },
];

// Additional public-facing pages that should be SEO-editable.
const extras: PageSEORegistryEntry[] = [
  {
    key: "invest-apply",
    label: "Invest — Apply",
    path: "/invest/apply",
    group: "Product",
    defaults: {
      title: "Apply to Invest in Dynime LLC. — Shareholder Onboarding",
      description:
        "Apply to become a Dynime LLC. shareholder. Choose a plan, submit KYC and complete onboarding in under 10 minutes. Audited financials and signed agreements.",
      keywords: [
        "apply to invest in startup",
        "become a shareholder",
        "invest in digital agency",
        "Dynime invest apply",
        "startup shareholder onboarding",
      ],
    },
  },
  {
    key: "track-order",
    label: "Track Order",
    path: "/track",
    group: "Core",
    defaults: {
      title: "Track Your Order — Real-Time Status & Milestones",
      description:
        "Track your Dynime order in real time: project milestones, delivery progress, invoice status and live updates from your assigned project manager.",
      keywords: ["track order", "order status", "project tracking", "milestone tracker"],
    },
  },
  {
    key: "checkout",
    label: "Checkout",
    path: "/checkout",
    group: "Core",
    defaults: {
      title: "Secure Checkout — Pay With Card, Wallet or FlexPay",
      description:
        "Complete your Dynime order securely. Pay with card, Apple/Google Pay, bKash, Nagad, SSLCommerz, bank transfer or split into FlexPay installments.",
      keywords: ["secure checkout", "online payment", "FlexPay checkout", "digital agency checkout"],
    },
  },
];


// Smart keyword generator for service pages — derives a richer commercial
// keyword set from the service title rather than just echoing it.
const buildServiceKeywords = (sp: typeof servicePages[number]): string[] => {
  const base = sp.title.toLowerCase();
  const stripped = base
    .replace(/\s+services?$/i, "")
    .replace(/\s+development$/i, "")
    .trim();
  const out = new Set<string>([
    base,
    `${stripped} services`,
    `${stripped} agency`,
    `hire ${stripped} experts`,
    `best ${stripped} company`,
    sp.categoryLabel,
  ]);
  return Array.from(out).filter(Boolean).slice(0, 8);
};

const services: PageSEORegistryEntry[] = servicePages.map((sp) => ({
  key: `service:${sp.slug}`,
  label: sp.title,
  path: `/${sp.slug}`,
  group: "Service" as const,
  defaults: {
    title: sp.metaTitle || sp.title,
    description: sp.metaDescription || sp.description,
    keywords: buildServiceKeywords(sp),
  },
}));

export const PAGE_SEO_REGISTRY: PageSEORegistryEntry[] = [...core, ...products, ...extras, ...legal, ...services];

export const getRegistryEntry = (key: string) =>
  PAGE_SEO_REGISTRY.find((e) => e.key === key);

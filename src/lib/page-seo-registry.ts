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
  { key: "careers", label: "Careers", path: "https://careers.dynime.com", group: "Core", defaults: SEO_DEFAULTS.careers },
  
];

const products: PageSEORegistryEntry[] = [
  {
    key: "product-dbm",
    label: "Dynime OS",
    path: "/products/os",
    group: "Product",
    defaults: {
      title: "Dynime OS | AI Business Management Software",
      description:
        "Manage CRM, HR, finance, projects and operations from one AI-powered business operating system designed for growing businesses.",
      keywords: [
        "Business Management Software",
        "Business Operating System",
        "ERP Software",
        "CRM Software",
        "Business OS",
        "AI business operating system",
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
      title: "Open Source Payment Platform | Dynime Pay",
      description:
        "Explore Dynime Pay Open Source, a flexible payment platform designed for developers and businesses requiring customizable payment infrastructure.",
      keywords: [
        "Open Source Payment Platform",
        "Self Hosted Payment Gateway",
        "Payment Infrastructure",
        "Payment Software",
        "open source payment gateway",
        "self hosted payment gateway",
        "white label payment gateway",
        "bKash payment gateway integration",
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
      title: "Software Development Services | Dynime Software Solutions",
      description:
        "Discover custom software development, AI solutions, SaaS platforms, testing and enterprise applications built for startups and growing businesses.",
      keywords: [
        "Software Development Services",
        "Enterprise Software",
        "AI Software",
        "SaaS Development",
        "Custom Software",
        "custom software development services",
        "AI application development",
        "enterprise software development",
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
      title: "US Company Formation Services | LLC & C Corp Registration | Dynime",
      description:
        "Register your US LLC or C Corporation with expert guidance. Dynime helps entrepreneurs establish compliant US businesses with ongoing support.",
      keywords: [
        "US Company Formation",
        "LLC Registration",
        "C Corp Registration",
        "US Business Registration",
        "Start a US Company",
        "USA LLC formation for non residents",
        "register US company online",
        "EIN for non US resident",
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
      title: "FlexPay | Smart Business Payment Platform | Dynime",
      description:
        "Simplify business payments with FlexPay, a modern payment platform built for secure transactions and business growth.",
      keywords: [
        "FlexPay",
        "Business Payment Platform",
        "Payment Management",
        "Digital Payments",
        "buy now pay later digital services",
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
      title: "Apply for FlexPay Credit — Instant Pre-Approval | Dynime",
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
    path: "/invest",
    group: "Product",
    defaults: {
      title: "Invest in Dynime | Investment Opportunities | Dynime",
      description:
        "Discover investment opportunities with Dynime and support the growth of innovative AI software and technology solutions.",
      keywords: [
        "Invest in Dynime",
        "Startup Investment",
        "Investment Opportunity",
        "Technology Investment",
        "invest in digital agency",
        "Dynime investor plans",
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
      title: "Investor Relations | Dynime",
      description:
        "Access investor information, company updates, governance resources and strategic announcements from Dynime.",
      keywords: [
        "Investor Relations",
        "Corporate Information",
        "Investors",
        "Company Updates",
        "Dynime investor relations",
        "quarterly investor reports",
      ],
    },
  },
  {
    key: "investor-dashboard",
    label: "Investor Dashboard",
    path: "/investor",
    group: "Product",
    defaults: {
      title: "Become a Dynime Investor | Dynime",
      description:
        "Partner with Dynime and explore investment opportunities focused on AI software, digital innovation and long-term growth.",
      keywords: [
        "Become a Dynime Investor",
        "Investment Partnership",
        "Venture Investment",
        "Dynime investor portal",
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
      title: "Privacy Policy | Dynime",
      description:
        "Read Dynime's Privacy Policy to understand how we collect, use, protect and manage your personal information.",
      keywords: ["privacy policy", "data protection", "Dynime privacy"],
    },
  },
  {
    key: "legal:terms",
    label: "Terms of Service",
    path: "/terms",
    group: "Legal",
    defaults: {
      title: "Terms & Conditions | Dynime",
      description:
        "Review the terms and conditions governing the use of Dynime's products, services and website.",
      keywords: ["terms of service", "terms and conditions", "Dynime terms"],
    },
  },
  {
    key: "legal:refund",
    label: "Refund Policy",
    path: "/refund",
    group: "Legal",
    defaults: {
      title: "Refund Policy | Dynime",
      description:
        "Understand Dynime's refund policy, eligibility requirements and service cancellation terms.",
      keywords: ["refund policy", "cancellation policy", "service refund"],
    },
  },
  {
    key: "legal:cookies",
    label: "Cookie Policy",
    path: "/cookies",
    group: "Legal",
    defaults: {
      title: "Cookie Policy | Dynime",
      description:
        "Learn how Dynime uses cookies and similar technologies to improve website functionality and user experience.",
      keywords: ["cookie policy", "cookie consent", "Dynime cookies"],
    },
  },
  {
    key: "legal:aml",
    label: "AML & Compliance",
    path: "/aml",
    group: "Legal",
    defaults: {
      title: "Anti-Money Laundering (AML) Policy | Dynime",
      description:
        "Read Dynime's Anti-Money Laundering policy and compliance measures designed to prevent financial crime.",
      keywords: ["AML policy", "anti money laundering", "Dynime compliance"],
    },
  },
  {
    key: "legal:payments",
    label: "Payments Policy",
    path: "/payments",
    group: "Legal",
    defaults: {
      title: "Payment Options & Billing Information | Dynime",
      description:
        "View accepted payment methods, billing information and payment policies for Dynime services and products.",
      keywords: ["Payment Options", "payment methods", "billing information", "Dynime payments"],
    },
  },
  {
    key: "legal:support",
    label: "Support & SLA",
    path: "/support",
    group: "Legal",
    defaults: {
      title: "Customer Support | Help Center | Dynime",
      description:
        "Get help with Dynime products and services through our support center, technical assistance, documentation and customer care.",
      keywords: ["Customer Support", "Technical Support", "Help Center", "Customer Service"],
    },
  },
  {
    key: "legal:acceptable-use",
    label: "Acceptable Use Policy",
    path: "/acceptable-use",
    group: "Legal",
    defaults: {
      title: "Acceptable Use Policy | Dynime",
      description:
        "Review Dynime's Acceptable Use Policy outlining permitted and prohibited use of our services.",
      keywords: ["acceptable use policy", "AUP", "Dynime policy"],
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
      title: "Apply to Invest in Dynime LLC. — Shareholder Onboarding | Dynime",
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
      title: "Track Your Order — Real-Time Status & Milestones | Dynime",
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
      title: "Secure Checkout — Pay With Card, Wallet or FlexPay | Dynime",
      description:
        "Complete your Dynime order securely. Pay with card, Apple/Google Pay, bKash, Nagad, SSLCommerz, bank transfer or split into FlexPay installments.",
      keywords: ["secure checkout", "online payment", "FlexPay checkout", "digital agency checkout"],
    },
  },
];


// Smart keyword generator for service pages — derives a richer commercial
// keyword set from the service title rather than just echoing it.
const buildServiceKeywords = (sp: typeof servicePages[number]): string[] => {
  if (sp.keywords && sp.keywords.length > 0) return sp.keywords;
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

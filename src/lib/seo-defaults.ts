/**
 * Centralized SEO copy for Dynime Inc. — rewritten for real commercial
 * search intent (Path A SEO pass).
 *
 * Each entry is tuned to terms users actually search for when hiring
 * an agency or buying business software — not navigational labels.
 *
 * Guidelines:
 *  - title: < 60 chars (brand name " | Dynime Inc." is appended by useSEO)
 *  - description: < 160 chars, unique per page, benefit-led, primary KW early
 *  - keywords: ordered primary → secondary → long-tail; commercial > navigational
 */

export interface PageSEO {
  title: string;
  description: string;
  keywords?: string[];
}

export const SEO_DEFAULTS = {
  home: {
    title: "Web Development & Digital Marketing Agency",
    description:
      "Hire a senior team for web development, Shopify & WordPress, SEO, paid ads, AI software and US/UK LLC formation. 500+ projects in 25+ countries.",
    keywords: [
      "web development agency",
      "digital marketing agency",
      "custom website development services",
      "Shopify development agency",
      "WordPress development agency",
      "SEO agency",
      "performance marketing agency",
      "AI software development company",
      "ecommerce development services",
      "LLC formation services",
      "hire web developers",
      "Dynime Inc.",
    ],
  },
  about: {
    title: "About Dynime — Senior Global Product Studio",
    description:
      "Dynime is a senior, multidisciplinary digital studio founded in 2020. We've shipped 500+ web, e-commerce, marketing and AI projects for clients in 25+ countries.",
    keywords: [
      "about Dynime",
      "global digital agency",
      "senior product studio",
      "trusted web development partner",
      "digital agency Bangladesh",
      "international software studio",
      "agency leadership team",
    ],
  },
  services: {
    title: "Web, SEO, AI & Formation Services",
    description:
      "Full-stack digital services: web development, Shopify & WordPress, SEO, paid ads, AI software and US/UK company formation — fixed pricing, senior team.",
    keywords: [
      "digital agency services",
      "web development services",
      "ecommerce development services",
      "SEO services",
      "performance marketing services",
      "AI software services",
      "Shopify development services",
      "WordPress development services",
      "custom software development",
      "US company formation services",
      "UK company formation services",
      "business management software",
    ],
  },
  portfolio: {
    title: "Portfolio — Web, E-commerce & Branding",
    description:
      "Explore 500+ web, Shopify, WordPress, branding, marketing and AI case studies delivered for founders, SMBs and enterprises across 25+ countries.",
    keywords: [
      "web development portfolio",
      "Shopify portfolio",
      "WordPress portfolio",
      "ecommerce case studies",
      "branding case studies",
      "digital agency portfolio",
      "web design case studies",
      "AI project case studies",
    ],
  },
  contact: {
    title: "Contact Dynime — Free Project Quote in 24h",
    description:
      "Get a free quote and roadmap from senior strategists and engineers. Email, WhatsApp or phone — replies within 24 hours from a real human, not a sales bot.",
    keywords: [
      "contact digital agency",
      "free website quote",
      "hire web development agency",
      "hire SEO agency",
      "WhatsApp digital agency",
      "agency consultation",
      "project inquiry Dynime",
    ],
  },
  blog: {
    title: "Insights — Web, SEO, Marketing & AI Strategy",
    description:
      "Senior-written insights on web development, SEO, paid marketing, AI, e-commerce conversion and global business growth — published weekly by Dynime.",
    keywords: [
      "web development blog",
      "SEO blog",
      "digital marketing blog",
      "ecommerce strategy blog",
      "AI strategy blog",
      "business growth insights",
      "Shopify tips",
      "WordPress tips",
    ],
  },
  careers: {
    title: "Careers — Remote Engineering & Design Jobs",
    description:
      "Remote-first careers at Dynime Inc. Open roles for senior engineers, designers, marketers and strategists who care about craft and the work they ship.",
    keywords: [
      "remote tech jobs",
      "remote developer jobs",
      "remote designer jobs",
      "digital marketing jobs",
      "agency careers",
      "senior engineering jobs",
      "Bangladesh tech jobs",
      "Dynime careers",
    ],
  },
} satisfies Record<string, PageSEO>;

export type SEOKey = keyof typeof SEO_DEFAULTS;

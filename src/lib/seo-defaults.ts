/**
 * Centralized SEO copy for Dynime LLC. — rewritten for real commercial
 * search intent (Path A SEO pass).
 *
 * Each entry is tuned to terms users actually search for when hiring
 * an agency or buying business software — not navigational labels.
 *
 * Guidelines:
 *  - title: < 60 chars (brand name " | Dynime LLC." is appended by useSEO)
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
    title: "Dynime | AI Software Development Company & Digital Transformation",
    description:
      "Build AI-powered software, websites, SaaS platforms and business automation solutions with Dynime. Helping startups and enterprises grow through technology, strategy and digital transformation.",
    keywords: [
      "AI Software Development Company",
      "Digital Transformation Company",
      "Business Automation",
      "Custom Software Development",
      "SaaS Development Company",
      "Web Development Company",
      "AI Solutions",
      "Software Company",
      "Digital Agency",
      "AI software development company for startups",
      "Business automation software company",
      "Custom software development services",
      "Digital transformation partner",
      "Enterprise software development",
    ],
  },
  about: {
    title: "About Dynime | AI Software, Digital Transformation & Business Solutions | Dynime",
    description:
      "Learn about Dynime, our mission, values and team. We help startups and enterprises build AI software, digital products and scalable business solutions worldwide.",
    keywords: [
      "About Dynime",
      "Software Company",
      "AI Company",
      "Digital Transformation Company",
      "Technology Partner",
      "Global Software Company",
      "About AI software company",
      "Global software development company",
      "Technology consulting company",
    ],
  },
  services: {
    title: "Software Development Services, AI Solutions & Digital Transformation | Dynime",
    description:
      "Explore Dynime's complete range of AI software development, web development, SaaS, digital marketing, automation and business consulting services designed to help businesses grow globally.",
    keywords: [
      "Software Development Services",
      "AI Development Services",
      "Web Development Services",
      "Digital Marketing Services",
      "Business Consulting Services",
      "SaaS Development Services",
      "Technology Services",
      "End-to-end software development services",
      "AI software development services",
      "Business technology solutions",
      "Digital transformation services",
      "Enterprise software solutions",
    ],
  },
  portfolio: {
    title: "Portfolio | AI, Web & Software Development Projects | Dynime",
    description:
      "Explore our portfolio featuring AI software, SaaS platforms, websites, business automation systems and digital transformation projects delivered for clients worldwide.",
    keywords: [
      "Software Development Portfolio",
      "AI Projects",
      "Website Portfolio",
      "SaaS Portfolio",
      "Case Studies",
      "Client Projects",
      "Software development portfolio",
      "AI development case studies",
      "SaaS development portfolio",
    ],
  },
  contact: {
    title: "Contact Dynime | Start Your Next Project | Dynime",
    description:
      "Contact Dynime to discuss AI software, web development, automation, SaaS, marketing or business consulting. Schedule your free consultation today.",
    keywords: [
      "Contact Dynime",
      "Contact Software Company",
      "Contact Digital Agency",
      "Get Free Consultation",
      "Contact AI software company",
      "Request software consultation",
      "Contact web development company",
    ],
  },
  blog: {
    title: "Blog | AI, Software Development & Business Growth Insights | Dynime",
    description:
      "Discover expert insights on AI, software development, SaaS, digital transformation, automation, web technologies and business growth strategies.",
    keywords: [
      "Technology Blog",
      "AI Blog",
      "Software Development Blog",
      "Business Automation Blog",
      "Digital Marketing Blog",
      "AI software development blog",
      "Business automation articles",
      "Technology insights",
    ],
  },
  careers: {
    title: "Careers at Dynime | Join Our Team | Dynime",
    description:
      "Explore career opportunities at Dynime and join a team building innovative AI software, digital products and technology solutions.",
    keywords: [
      "Careers at Dynime",
      "Software Jobs",
      "Technology Careers",
      "Join Dynime",
      "remote tech jobs",
      "remote developer jobs",
      "Dynime careers",
    ],
  },
} satisfies Record<string, PageSEO>;

export type SEOKey = keyof typeof SEO_DEFAULTS;

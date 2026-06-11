// Hand-crafted pricing packs per service slug.
// 5 tiers each: Starter → Basic → Professional (highlighted) → Premium → Custom Quote.
// Hybrid feature style: 4–6 short bullets per tier; higher tiers say "Everything in <previous>".
// Currency: USD baseline (BDT = USD × 100 for rough display; live rates handle the rest).
// All packs are tuned to mid-market band ($199 → $2,999) with Custom Quote at the end.

import type { PricingTier } from "@/components/services/ServicePricingSection";

const usd = (price: number): { price_usd: number; price_bdt: number } => ({
  price_usd: price,
  price_bdt: price * 100,
});

type PackBuilder = () => PricingTier[];

/** Build a 5-tier pack from short, service-specific copy. */
const pack = (
  slug: string,
  starterDesc: string,
  prevName: string, // used for "Everything in X" labels — we just hardcode below for clarity
  tiers: Array<{
    price: number | null;
    period?: string;
    desc: string;
    features: string[];
    highlighted?: boolean;
    cta?: string;
  }>,
): PricingTier[] => {
  const names = ["Starter", "Basic", "Professional", "Premium", "Custom Quote"];
  return tiers.map((t, i) => ({
    id: `${slug}-${names[i].toLowerCase().replace(/\s+/g, "-")}`,
    name: names[i],
    description: t.desc,
    price_usd: t.price,
    price_bdt: t.price === null ? null : t.price * 100,
    period: t.period ?? (t.price === null ? "" : "one-time"),
    features: t.features,
    highlighted: t.highlighted ?? i === 2,
    cta_type: t.price === null ? "quote" : "fixed",
    cta_label:
      t.cta ??
      (t.price === null
        ? "Get Custom Quote"
        : i === 2
          ? "Most Popular"
          : i === 0
            ? "Start Small"
            : i === 1
              ? "Choose Basic"
              : "Go Premium"),
  }));
};

export const SERVICE_PRICING_PACKS: Record<string, PackBuilder> = {
  // ────────────────────────────────  DWS  ────────────────────────────────
  "wordpress-design": () =>
    pack("wp", "", "", [
      {
        price: 299,
        desc: "Simple, professional 5-page WordPress site for new brands",
        features: [
          "Up to 5 pages (Home, About, Services, Blog, Contact)",
          "Mobile-responsive theme customization",
          "Contact form + Google Maps",
          "Basic on-page SEO setup",
          "SSL & speed basics",
          "1 round of revisions",
        ],
      },
      {
        price: 599,
        desc: "Growing business site with stronger design & lead capture",
        features: [
          "Everything in Starter",
          "Up to 10 pages with custom layouts",
          "Premium plugins (Elementor Pro / Yoast)",
          "WhatsApp + newsletter integration",
          "Schema markup + sitemap",
          "2 rounds of revisions",
        ],
      },
      {
        price: 1199,
        desc: "Full custom WordPress build optimised for conversions",
        period: "one-time + 30-day support",
        features: [
          "Everything in Basic",
          "Up to 20 pages, fully custom design",
          "Custom theme + reusable blocks",
          "Speed-tuned (PageSpeed 90+)",
          "Advanced SEO + analytics setup",
          "30-day post-launch support",
        ],
        highlighted: true,
      },
      {
        price: 2499,
        desc: "High-end WordPress with multilingual & ongoing care",
        period: "one-time + 90-day care",
        features: [
          "Everything in Professional",
          "Multilingual (WPML) up to 3 languages",
          "Membership / LMS setup if needed",
          "CRM & marketing automation hookup",
          "90-day post-launch care",
          "Priority chat support",
        ],
      },
      {
        price: null,
        desc: "Marketplace, multisite, headless WP or custom integrations",
        features: [
          "Everything in Premium",
          "Headless / multisite architecture",
          "Custom plugin development",
          "Dedicated project manager",
          "SLA-backed support",
        ],
      },
    ]),

  "website-redesign": () =>
    pack("rd", "", "", [
      {
        price: 349,
        desc: "Refresh visuals on your existing 5–7 page website",
        features: [
          "Visual refresh of up to 7 pages",
          "New typography & color system",
          "Mobile responsiveness fixes",
          "Basic speed cleanup",
          "1 round of revisions",
        ],
      },
      {
        price: 699,
        desc: "Modernised redesign with improved UX & SEO",
        features: [
          "Everything in Starter",
          "Up to 12 pages redesigned",
          "UX audit + new wireframes",
          "On-page SEO migration (no ranking loss)",
          "301 redirect map",
          "2 rounds of revisions",
        ],
      },
      {
        price: 1399,
        desc: "Full conversion-focused redesign for growing businesses",
        period: "one-time + 30-day support",
        features: [
          "Everything in Basic",
          "Up to 20 pages + new sections",
          "Conversion-optimised CTAs & forms",
          "PageSpeed 90+ tuning",
          "Analytics + heatmap setup",
          "30-day post-launch support",
        ],
        highlighted: true,
      },
      {
        price: 2599,
        desc: "Premium rebrand-ready redesign with ongoing care",
        period: "one-time + 90-day care",
        features: [
          "Everything in Professional",
          "Brand refresh assets included",
          "Multilingual setup (up to 3 langs)",
          "A/B testing setup",
          "90-day care & monitoring",
        ],
      },
      {
        price: null,
        desc: "Replatform, headless rebuild, or 50+ page sites",
        features: [
          "Everything in Premium",
          "Replatform (e.g. Wix → WP, WP → Headless)",
          "Custom integrations",
          "Dedicated project lead",
          "SLA-backed support",
        ],
      },
    ]),

  "wordpress-maintenance": () =>
    pack("wm", "", "", [
      {
        price: 49,
        period: "/month",
        desc: "Essential monthly care for small WordPress sites",
        features: [
          "Weekly core + plugin updates",
          "Daily off-site backups",
          "Uptime monitoring (24/7)",
          "Monthly health report",
          "Email support",
        ],
      },
      {
        price: 99,
        period: "/month",
        desc: "Stronger care + security hardening for business sites",
        features: [
          "Everything in Starter",
          "Malware scanning & removal",
          "Firewall (WAF) configuration",
          "Broken link & SEO checks",
          "Up to 1 hr/mo content edits",
        ],
      },
      {
        price: 199,
        period: "/month",
        desc: "Best value — full care + performance tuning",
        features: [
          "Everything in Basic",
          "Monthly speed optimisation",
          "Database cleanup & caching",
          "Up to 3 hrs/mo content/dev work",
          "Priority chat support",
        ],
        highlighted: true,
      },
      {
        price: 399,
        period: "/month",
        desc: "Premium care for high-traffic stores & multisite",
        features: [
          "Everything in Professional",
          "WooCommerce-specific monitoring",
          "Staging + change-management workflow",
          "Up to 8 hrs/mo dev work",
          "Dedicated account manager",
        ],
      },
      {
        price: null,
        period: "/month",
        desc: "Multisite, agency white-label, or 24×7 SLA",
        features: [
          "Everything in Premium",
          "Multisite / agency white-label",
          "24×7 emergency response SLA",
          "Custom dev hours block",
          "Quarterly strategy review",
        ],
      },
    ]),

  "speed-optimization": () =>
    pack("sp", "", "", [
      {
        price: 199,
        desc: "Quick PageSpeed wins for small sites (≤10 pages)",
        features: [
          "PageSpeed Insights audit",
          "Image compression (WebP)",
          "Caching plugin setup",
          "CSS/JS minification",
          "Before/after report",
        ],
      },
      {
        price: 399,
        desc: "Deeper optimisation for business sites (≤25 pages)",
        features: [
          "Everything in Starter",
          "Lazy-loading & deferred JS",
          "Database cleanup",
          "Hosting/CDN recommendations",
          "Mobile Core Web Vitals tuning",
        ],
      },
      {
        price: 699,
        desc: "Full Core Web Vitals overhaul targeting 90+ scores",
        features: [
          "Everything in Basic",
          "Render-blocking resource fixes",
          "Cloudflare/CDN setup",
          "Server response (TTFB) tuning",
          "Target: 90+ on PageSpeed mobile & desktop",
          "30-day re-test guarantee",
        ],
        highlighted: true,
      },
      {
        price: 1299,
        desc: "Premium tuning for large/eCommerce sites",
        features: [
          "Everything in Professional",
          "WooCommerce/Shopify-specific tuning",
          "Custom caching architecture",
          "Server-level optimisation",
          "60-day monitoring",
        ],
      },
      {
        price: null,
        desc: "Multi-domain, headless, or 100+ page enterprise sites",
        features: [
          "Everything in Premium",
          "Edge caching & global CDN strategy",
          "Custom infra recommendations",
          "Quarterly performance audits",
        ],
      },
    ]),

  "woocommerce": () =>
    pack("wc", "", "", [
      {
        price: 499,
        desc: "Launch-ready WooCommerce store (up to 25 products)",
        features: [
          "WooCommerce setup on WordPress",
          "Up to 25 products imported",
          "1 payment gateway (Stripe/PayPal)",
          "Shipping zones & tax basics",
          "Mobile-responsive theme",
        ],
      },
      {
        price: 999,
        desc: "Custom WooCommerce store with branding & SEO",
        features: [
          "Everything in Starter",
          "Up to 100 products",
          "Custom theme styling",
          "Coupons, upsells, abandoned cart",
          "On-page SEO + schema",
          "2 rounds of revisions",
        ],
      },
      {
        price: 1899,
        desc: "Full-featured store with conversion optimisation",
        period: "one-time + 30-day support",
        features: [
          "Everything in Basic",
          "Up to 500 products",
          "Multi-currency + multi-payment",
          "Wishlist, reviews, loyalty plugin",
          "Speed-tuned checkout",
          "30-day post-launch support",
        ],
        highlighted: true,
      },
      {
        price: 2799,
        desc: "Premium store with subscriptions & integrations",
        period: "one-time + 90-day care",
        features: [
          "Everything in Professional",
          "Subscriptions / memberships",
          "ERP/CRM/accounting integration",
          "Multilingual (up to 3 langs)",
          "90-day post-launch care",
        ],
      },
      {
        price: null,
        desc: "Marketplace, B2B, or 5,000+ SKU stores",
        features: [
          "Everything in Premium",
          "Marketplace / multi-vendor (Dokan)",
          "B2B pricing & wholesale",
          "Custom plugin development",
          "Dedicated account manager",
        ],
      },
    ]),

  "shopify": () =>
    pack("sh", "", "", [
      {
        price: 399,
        desc: "Shopify store setup with a free theme (≤25 products)",
        features: [
          "Shopify store setup",
          "Free theme customisation",
          "Up to 25 products imported",
          "Payment + shipping setup",
          "Basic SEO (titles, meta, sitemap)",
        ],
      },
      {
        price: 899,
        desc: "Premium-themed store with branding & apps",
        features: [
          "Everything in Starter",
          "Premium theme customised to brand",
          "Up to 100 products",
          "Essential apps (reviews, upsell, email)",
          "Conversion-friendly product pages",
          "2 rounds of revisions",
        ],
      },
      {
        price: 1799,
        desc: "Custom Shopify store with advanced conversion features",
        period: "one-time + 30-day support",
        features: [
          "Everything in Basic",
          "Custom Liquid theme tweaks",
          "Up to 500 products + collections",
          "Bundles, upsells, abandoned cart flows",
          "Speed & Core Web Vitals tuning",
          "30-day post-launch support",
        ],
        highlighted: true,
      },
      {
        price: 2699,
        desc: "Premium Shopify with subscriptions & integrations",
        period: "one-time + 90-day care",
        features: [
          "Everything in Professional",
          "Subscriptions (Recharge / Bold)",
          "ERP/3PL/accounting integration",
          "Multi-currency + multi-language",
          "90-day post-launch care",
        ],
      },
      {
        price: null,
        desc: "Shopify Plus, headless, or 5,000+ SKU stores",
        features: [
          "Everything in Premium",
          "Shopify Plus / Hydrogen headless",
          "Custom apps & integrations",
          "Dedicated account manager",
          "SLA-backed support",
        ],
      },
    ]),

  "ui-ux-design": () =>
    pack("ux", "", "", [
      {
        price: 299,
        desc: "Wireframes & mockups for a small site or MVP (up to 5 screens)",
        features: [
          "Up to 5 screens (desktop + mobile)",
          "Low-fidelity wireframes",
          "1 high-fidelity mockup style direction",
          "Figma source files",
          "1 round of revisions",
        ],
      },
      {
        price: 599,
        desc: "Full UX flow + UI design for a small product or website",
        features: [
          "Everything in Starter",
          "Up to 12 screens",
          "User flows & site map",
          "Hi-fi UI design (light/dark)",
          "Basic design tokens",
          "2 rounds of revisions",
        ],
      },
      {
        price: 1299,
        desc: "Best value — full product UX/UI with design system",
        features: [
          "Everything in Basic",
          "Up to 25 screens",
          "Reusable design system + components",
          "Interactive Figma prototype",
          "Usability testing (1 round)",
          "3 rounds of revisions",
        ],
        highlighted: true,
      },
      {
        price: 2499,
        desc: "Enterprise-grade design system + multi-product UX",
        features: [
          "Everything in Professional",
          "Up to 50 screens or 2 products",
          "Full design system + documentation",
          "Accessibility (WCAG AA) review",
          "Motion / micro-interaction specs",
          "Dev handover sessions",
        ],
      },
      {
        price: null,
        desc: "Multi-platform, design-ops, or ongoing design partnership",
        features: [
          "Everything in Premium",
          "Multi-platform (web + iOS + Android)",
          "Embedded design partner (monthly)",
          "Research & user testing program",
          "Dedicated design lead",
        ],
      },
    ]),

  "custom-web-apps": () =>
    pack("cwa", "", "", [
      {
        price: 999,
        desc: "MVP web app with auth + 1 core feature",
        features: [
          "Single-page React app",
          "User auth (email + Google)",
          "1 core feature module",
          "Basic admin dashboard",
          "Cloud deploy (Vercel/Netlify)",
        ],
      },
      {
        price: 1999,
        desc: "Production-ready SaaS MVP with database & roles",
        features: [
          "Everything in Starter",
          "Up to 5 modules / CRUD entities",
          "Role-based access (admin/user)",
          "Stripe / payment integration",
          "Email notifications",
          "30-day post-launch support",
        ],
      },
      {
        price: 2999,
        desc: "Best value — scalable SaaS with API & integrations",
        period: "one-time + 30-day support",
        features: [
          "Everything in Basic",
          "REST/GraphQL API",
          "3rd-party integrations (Slack, Zapier, etc.)",
          "Real-time features (chat/notifications)",
          "Automated tests + CI/CD",
          "30-day support",
        ],
        highlighted: true,
      },
      {
        price: 4999,
        desc: "Enterprise web app with advanced architecture",
        period: "one-time + 90-day care",
        features: [
          "Everything in Professional",
          "Multi-tenant architecture",
          "Advanced analytics dashboard",
          "SSO (Google / Microsoft)",
          "Load testing & monitoring",
          "90-day post-launch care",
        ],
      },
      {
        price: null,
        desc: "Multi-region SaaS, fintech, or regulated industries",
        features: [
          "Everything in Premium",
          "Multi-region deploy & DR plan",
          "SOC 2 / HIPAA-friendly architecture",
          "Dedicated engineering team",
          "SLA-backed support",
        ],
      },
    ]),

  // ────────────────────────────────  DMS  ────────────────────────────────
  "social-media": () =>
    pack("sm", "", "", [
      {
        price: 199,
        period: "/month",
        desc: "Starter social presence on 1 platform",
        features: [
          "1 platform (FB or IG)",
          "8 posts / month",
          "Basic graphic design (Canva)",
          "Caption + hashtag research",
          "Monthly report",
        ],
      },
      {
        price: 399,
        period: "/month",
        desc: "Active brand presence on 2 platforms",
        features: [
          "Everything in Starter",
          "2 platforms (FB + IG)",
          "16 posts + 4 reels / month",
          "Stories & community engagement",
          "Competitor monitoring",
        ],
      },
      {
        price: 699,
        period: "/month",
        desc: "Best value — full content engine + paid boost",
        features: [
          "Everything in Basic",
          "3 platforms (add LinkedIn or TikTok)",
          "24 posts + 8 reels + 1 mini-campaign",
          "$100 ad boost included",
          "Monthly strategy call",
        ],
        highlighted: true,
      },
      {
        price: 1299,
        period: "/month",
        desc: "Premium social with influencer & UGC support",
        features: [
          "Everything in Professional",
          "4 platforms",
          "Influencer outreach (up to 3/mo)",
          "UGC sourcing & licensing",
          "Bi-weekly strategy calls",
          "Dedicated account manager",
        ],
      },
      {
        price: null,
        period: "/month",
        desc: "Multi-brand, multi-region or 24×7 community ops",
        features: [
          "Everything in Premium",
          "Multi-brand / multi-region rollout",
          "24×7 community management",
          "Custom content studio team",
        ],
      },
    ]),

  "facebook-ads": () =>
    pack("fb", "", "", [
      {
        price: 249,
        period: "/month",
        desc: "Starter Meta Ads management (≤$1k ad spend)",
        features: [
          "Up to $1k/mo ad spend managed",
          "1 campaign objective",
          "3 ad creatives / month",
          "Pixel + Conversions API setup",
          "Monthly report",
        ],
      },
      {
        price: 499,
        period: "/month",
        desc: "Growth-stage ads (≤$5k ad spend)",
        features: [
          "Everything in Starter",
          "Up to $5k/mo ad spend",
          "2 campaign types (traffic + conversions)",
          "8 ad creatives / month",
          "Audience research & lookalikes",
        ],
      },
      {
        price: 899,
        period: "/month",
        desc: "Best value — full-funnel Meta Ads (≤$15k spend)",
        features: [
          "Everything in Basic",
          "Up to $15k/mo ad spend",
          "Full funnel (TOF/MOF/BOF)",
          "16 creatives + A/B testing",
          "Bi-weekly optimisation calls",
        ],
        highlighted: true,
      },
      {
        price: 1499,
        period: "/month",
        desc: "Premium Meta Ads with creative production",
        features: [
          "Everything in Professional",
          "Up to $30k/mo ad spend",
          "Creative production (UGC + statics)",
          "Advanced retargeting & DPA",
          "Dedicated media buyer",
        ],
      },
      {
        price: null,
        period: "/month",
        desc: "$50k+ monthly spend or multi-region campaigns",
        features: [
          "Everything in Premium",
          "$50k+ ad spend managed",
          "Multi-region / multi-language ads",
          "Senior strategist + buyer team",
          "Custom reporting dashboard",
        ],
      },
    ]),

  "google-ads": () =>
    pack("ga", "", "", [
      {
        price: 249,
        period: "/month",
        desc: "Starter Google Ads (≤$1k ad spend)",
        features: [
          "Up to $1k/mo ad spend managed",
          "1 campaign type (Search)",
          "Keyword research (up to 50)",
          "Conversion tracking setup",
          "Monthly report",
        ],
      },
      {
        price: 499,
        period: "/month",
        desc: "Growth Google Ads (≤$5k ad spend)",
        features: [
          "Everything in Starter",
          "Up to $5k/mo ad spend",
          "Search + Performance Max",
          "Negative keyword management",
          "Landing page recommendations",
        ],
      },
      {
        price: 899,
        period: "/month",
        desc: "Best value — full-funnel Google Ads (≤$15k spend)",
        features: [
          "Everything in Basic",
          "Up to $15k/mo ad spend",
          "Search + PMax + Display + YouTube",
          "A/B testing on ads & landers",
          "Bi-weekly optimisation calls",
        ],
        highlighted: true,
      },
      {
        price: 1499,
        period: "/month",
        desc: "Premium Google Ads with creative & CRO support",
        features: [
          "Everything in Professional",
          "Up to $30k/mo ad spend",
          "YouTube creative scripting",
          "Landing page CRO recommendations",
          "Dedicated PPC strategist",
        ],
      },
      {
        price: null,
        period: "/month",
        desc: "$50k+ spend or multi-account / multi-region",
        features: [
          "Everything in Premium",
          "$50k+ ad spend managed",
          "Multi-account MCC management",
          "Senior PPC team",
          "Custom dashboard & SLA",
        ],
      },
    ]),

  "seo": () =>
    pack("seo", "", "", [
      {
        price: 249,
        period: "/month",
        desc: "Local / small-site SEO (≤10 pages)",
        features: [
          "Technical audit",
          "On-page SEO for up to 10 pages",
          "10 target keywords",
          "Google Business Profile setup",
          "Monthly ranking report",
        ],
      },
      {
        price: 499,
        period: "/month",
        desc: "Growing-business SEO (≤25 pages)",
        features: [
          "Everything in Starter",
          "Up to 25 keywords",
          "2 SEO blog posts / month",
          "Backlink outreach (5 / month)",
          "Competitor gap analysis",
        ],
      },
      {
        price: 899,
        period: "/month",
        desc: "Best value — full-stack SEO for serious growth",
        features: [
          "Everything in Basic",
          "Up to 50 keywords",
          "4 SEO blog posts / month",
          "10 quality backlinks / month",
          "Schema + Core Web Vitals tuning",
          "Bi-weekly strategy calls",
        ],
        highlighted: true,
      },
      {
        price: 1799,
        period: "/month",
        desc: "Premium SEO for competitive niches",
        features: [
          "Everything in Professional",
          "Up to 100 keywords",
          "8 long-form articles / month",
          "Digital PR & link building",
          "International / multi-region SEO",
          "Dedicated SEO strategist",
        ],
      },
      {
        price: null,
        period: "/month",
        desc: "Enterprise SEO, eCommerce 1k+ SKU, or YMYL niches",
        features: [
          "Everything in Premium",
          "Enterprise / eCommerce SEO",
          "Programmatic SEO setup",
          "Senior SEO + content team",
          "Custom reporting dashboard",
        ],
      },
    ]),

  "brand-strategy": () =>
    pack("br", "", "", [
      {
        price: 399,
        desc: "Starter brand kit (logo + basic guidelines)",
        features: [
          "Logo design (3 concepts)",
          "Color palette + typography",
          "1-page brand guideline PDF",
          "Social profile assets",
          "2 rounds of revisions",
        ],
      },
      {
        price: 799,
        desc: "Brand identity for new businesses",
        features: [
          "Everything in Starter",
          "Logo system (primary + variations)",
          "Brand guideline (10–15 pages)",
          "Stationery design (card + letterhead)",
          "Social media templates (5)",
        ],
      },
      {
        price: 1499,
        desc: "Best value — full brand strategy + identity",
        features: [
          "Everything in Basic",
          "Brand strategy workshop",
          "Brand voice & messaging framework",
          "Full brand book (25+ pages)",
          "Pitch deck template",
          "3 rounds of revisions",
        ],
        highlighted: true,
      },
      {
        price: 2499,
        desc: "Premium rebrand + launch toolkit",
        features: [
          "Everything in Professional",
          "Competitive & market research",
          "Naming / tagline (if needed)",
          "Launch campaign assets",
          "Internal brand training session",
        ],
      },
      {
        price: null,
        desc: "Multi-brand portfolios, sub-brands, or rebrand rollouts",
        features: [
          "Everything in Premium",
          "Sub-brand architecture",
          "Multi-region rollout assets",
          "Dedicated brand strategist",
        ],
      },
    ]),

  "content-marketing": () =>
    pack("cm", "", "", [
      {
        price: 299,
        period: "/month",
        desc: "Starter blog content (4 posts/month)",
        features: [
          "4 SEO blog posts / month (~800 words)",
          "Keyword research",
          "Basic on-page SEO",
          "1 royalty-free image / post",
          "WordPress publishing",
        ],
      },
      {
        price: 599,
        period: "/month",
        desc: "Active content engine (8 posts/month)",
        features: [
          "Everything in Starter",
          "8 posts / month (~1,200 words)",
          "Editorial calendar",
          "Internal linking strategy",
          "Custom blog graphics",
        ],
      },
      {
        price: 999,
        period: "/month",
        desc: "Best value — content + distribution",
        features: [
          "Everything in Basic",
          "12 long-form posts / month (~1,500 words)",
          "Email newsletter (2/month)",
          "Social repurposing (LinkedIn + IG)",
          "Monthly content strategy call",
        ],
        highlighted: true,
      },
      {
        price: 1799,
        period: "/month",
        desc: "Premium content with thought-leadership",
        features: [
          "Everything in Professional",
          "20 posts/mo + 4 pillar pages",
          "Ghostwriting for execs",
          "Lead magnets / ebooks (1/quarter)",
          "Dedicated content manager",
        ],
      },
      {
        price: null,
        period: "/month",
        desc: "Enterprise content ops or multi-language programs",
        features: [
          "Everything in Premium",
          "Multi-language content (3+ langs)",
          "Editorial team (writers + editor)",
          "Custom analytics dashboard",
        ],
      },
    ]),

  "email-marketing": () =>
    pack("em", "", "", [
      {
        price: 199,
        period: "/month",
        desc: "Starter email program (≤2k subscribers)",
        features: [
          "ESP setup (Mailchimp / Brevo)",
          "2 campaigns / month",
          "1 simple automation (welcome)",
          "Template design",
          "Monthly report",
        ],
      },
      {
        price: 399,
        period: "/month",
        desc: "Growth email program (≤10k subscribers)",
        features: [
          "Everything in Starter",
          "4 campaigns / month",
          "3 automations (welcome / abandon / winback)",
          "List segmentation",
          "A/B subject line testing",
        ],
      },
      {
        price: 699,
        period: "/month",
        desc: "Best value — full lifecycle email & SMS",
        features: [
          "Everything in Basic",
          "8 campaigns / month",
          "5+ automation flows",
          "SMS marketing add-on",
          "Deliverability monitoring",
        ],
        highlighted: true,
      },
      {
        price: 1299,
        period: "/month",
        desc: "Premium email/CRM with advanced segmentation",
        features: [
          "Everything in Professional",
          "Klaviyo / HubSpot advanced setup",
          "Predictive segmentation",
          "Lead scoring + sales handoff",
          "Dedicated lifecycle strategist",
        ],
      },
      {
        price: null,
        period: "/month",
        desc: "Enterprise CRM / 100k+ list / multi-brand",
        features: [
          "Everything in Premium",
          "100k+ list management",
          "Multi-brand / multi-region",
          "Custom integrations & data warehouse",
        ],
      },
    ]),

  "analytics": () =>
    pack("an", "", "", [
      {
        price: 299,
        desc: "GA4 + tag setup for a single site",
        features: [
          "GA4 + GTM setup",
          "Up to 5 events tracked",
          "Goals / conversions setup",
          "Looker Studio starter dashboard",
          "1 training session (1 hr)",
        ],
      },
      {
        price: 599,
        desc: "Full analytics stack with eCommerce tracking",
        features: [
          "Everything in Starter",
          "Enhanced eCommerce tracking",
          "Server-side GTM (basic)",
          "Heatmaps (Hotjar/Clarity) setup",
          "Cross-domain tracking",
        ],
      },
      {
        price: 999,
        desc: "Best value — analytics + CRO program",
        period: "one-time + 30-day support",
        features: [
          "Everything in Basic",
          "Conversion audit on key pages",
          "2 A/B tests setup & analysis",
          "Funnel & cohort dashboards",
          "Monthly insights report (3 months)",
        ],
        highlighted: true,
      },
      {
        price: 1899,
        desc: "Premium CRO with ongoing experimentation",
        period: "one-time + 90-day program",
        features: [
          "Everything in Professional",
          "4 A/B tests / month",
          "Personalisation setup",
          "Server-side tracking (full)",
          "Dedicated CRO strategist",
        ],
      },
      {
        price: null,
        desc: "Enterprise data warehouse / BI integration",
        features: [
          "Everything in Premium",
          "Data warehouse (BigQuery / Snowflake)",
          "Custom BI dashboards",
          "Multi-source data pipelines",
          "Dedicated analytics engineer",
        ],
      },
    ]),

  // ────────────────────────────────  DCS  ────────────────────────────────
  "virtual-address": () =>
    pack("va", "", "", [
      {
        price: 79,
        period: "/year",
        desc: "Basic UK or US registered address with mail handling",
        features: [
          "Real UK or US street address",
          "Statutory & official mail handling",
          "Mail scanning (up to 25/yr)",
          "Director / home address privacy",
          "Online dashboard",
        ],
      },
      {
        price: 149,
        period: "/year",
        desc: "Pro address with worldwide forwarding",
        features: [
          "Everything in Starter",
          "Unlimited mail scanning",
          "Worldwide mail forwarding",
          "Dedicated suite number",
          "Faster mail processing (24h)",
        ],
      },
      {
        price: 249,
        period: "/year",
        desc: "Best value — Pro address + bank-friendly extras",
        features: [
          "Everything in Basic",
          "UK: director service address / US: priority mail handling",
          "Phone number + voicemail-to-email",
          "Bank account introduction assistance",
          "Priority support",
        ],
        highlighted: true,
      },
      {
        price: 449,
        period: "/year",
        desc: "Premium presence in both UK & US",
        features: [
          "Everything in Professional",
          "Address in BOTH UK and US",
          "Compliance mail handling",
          "Annual filings reminder service",
          "Dedicated account manager",
        ],
      },
      {
        price: null,
        period: "/year",
        desc: "Multi-state, multi-country, or compliance-heavy needs",
        features: [
          "Everything in Premium",
          "Multi-state US presence",
          "EU / Singapore / UAE addresses",
          "Custom mail-handling SLAs",
        ],
      },
    ]),

  "itin-services": () =>
    pack("itin", "", "", [
      {
        price: 299,
        desc: "DIY-assisted ITIN application review",
        features: [
          "W-7 form review",
          "Document checklist",
          "Email guidance",
          "1 revision",
        ],
      },
      {
        price: 399,
        desc: "Standard ITIN application with CAA verification",
        features: [
          "Everything in Starter",
          "CAA-certified document verification",
          "Complete W-7 preparation",
          "Submission within 5–7 business days",
          "No passport mailing required",
        ],
      },
      {
        price: 549,
        desc: "Best value — Priority ITIN with money-back guarantee",
        features: [
          "Everything in Basic",
          "Fast-track prep (2–3 business days)",
          "100% money-back guarantee",
          "Priority IRS handling",
          "FedEx tracking included",
          "Step-by-step status updates",
        ],
        highlighted: true,
      },
      {
        price: 899,
        desc: "ITIN + tax filing combo",
        features: [
          "Everything in Professional",
          "First-year US tax return prep (1040-NR)",
          "EIN application included",
          "Tax planning consultation (1 hr)",
        ],
      },
      {
        price: null,
        desc: "Family ITINs, dependents, or complex cases",
        features: [
          "Everything in Premium",
          "Family / dependent ITINs",
          "Renewal & rejection recovery",
          "Dedicated CAA agent",
        ],
      },
    ]),

  "dropshipping-solution": () =>
    pack("ds", "", "", [
      {
        price: 399,
        desc: "Starter dropshipping store (Shopify or WooCommerce)",
        features: [
          "Store setup (Shopify or Woo)",
          "Niche & product research (10 winners)",
          "Supplier connection (AliExpress/CJ)",
          "Basic theme customisation",
          "Payment + shipping setup",
        ],
      },
      {
        price: 799,
        desc: "Branded dropshipping with marketing setup",
        features: [
          "Everything in Starter",
          "30 winning products imported",
          "Logo + brand kit",
          "Email automation (welcome + abandon)",
          "Pixel + GA4 setup",
        ],
      },
      {
        price: 1499,
        desc: "Best value — full dropship launch + ad creatives",
        features: [
          "Everything in Basic",
          "60 products + premium suppliers",
          "5 video ad creatives",
          "First Meta Ads campaign setup",
          "30-day launch support",
        ],
        highlighted: true,
      },
      {
        price: 2499,
        desc: "Premium dropship + 90-day growth program",
        features: [
          "Everything in Professional",
          "Private agent / branded packaging sourcing",
          "10 ad creatives / month (3 months)",
          "Influencer outreach",
          "Dedicated launch manager",
        ],
      },
      {
        price: null,
        desc: "Multi-store, multi-region, or 7-figure scaling",
        features: [
          "Everything in Premium",
          "Multi-store / multi-region setup",
          "Private supplier negotiations",
          "Dedicated growth team",
        ],
      },
    ]),

  "marketplace-solution": () =>
    pack("mk", "", "", [
      {
        price: 299,
        desc: "Single-marketplace setup (Amazon / eBay / Daraz)",
        features: [
          "Account setup on 1 marketplace",
          "Up to 25 listings created",
          "Category & keyword research",
          "Basic A+ / image optimisation",
          "1 round of revisions",
        ],
      },
      {
        price: 599,
        desc: "Optimised listings + multi-marketplace presence",
        features: [
          "Everything in Starter",
          "2 marketplaces",
          "Up to 75 optimised listings",
          "A+ content / EBC for top SKUs",
          "PPC campaign setup",
        ],
      },
      {
        price: 1099,
        desc: "Best value — full marketplace growth program",
        features: [
          "Everything in Basic",
          "3 marketplaces",
          "Up to 200 listings",
          "PPC management ($1k spend included)",
          "Inventory & FBA guidance",
          "Monthly review call",
        ],
        highlighted: true,
      },
      {
        price: 2199,
        desc: "Premium marketplace with brand registry & ads",
        features: [
          "Everything in Professional",
          "Brand registry assistance",
          "PPC management ($5k spend)",
          "Review & reputation management",
          "Dedicated marketplace strategist",
        ],
      },
      {
        price: null,
        desc: "Global marketplaces, FBA logistics, or 1k+ SKUs",
        features: [
          "Everything in Premium",
          "Global expansion (US/EU/UK/JP)",
          "FBA logistics consulting",
          "Custom analytics dashboard",
        ],
      },
    ]),

  "payment-gateway": () =>
    pack("pg", "", "", [
      {
        price: 199,
        desc: "1 payment gateway integration on existing site",
        features: [
          "Stripe OR PayPal OR local gateway",
          "Test + live mode setup",
          "Basic webhook configuration",
          "Receipt email setup",
        ],
      },
      {
        price: 399,
        desc: "Multi-gateway setup with reconciliation",
        features: [
          "Everything in Starter",
          "2 gateways (e.g. Stripe + local)",
          "Refund & dispute workflow",
          "Order reconciliation dashboard",
          "Tax/invoice email automation",
        ],
      },
      {
        price: 699,
        desc: "Best value — full payments stack with subscriptions",
        features: [
          "Everything in Basic",
          "Subscriptions / recurring billing",
          "Customer portal (manage cards/plans)",
          "Failed-payment retry logic",
          "30-day post-launch support",
        ],
        highlighted: true,
      },
      {
        price: 1299,
        desc: "Premium payments with fraud & multi-currency",
        features: [
          "Everything in Professional",
          "Multi-currency settlement",
          "Fraud rules (Radar / Sift)",
          "PCI-aware checkout audit",
          "Dedicated integration engineer",
        ],
      },
      {
        price: null,
        desc: "Marketplace splits, custom acquirers, or PSP integrations",
        features: [
          "Everything in Premium",
          "Marketplace split payments (Connect)",
          "Direct acquirer / PSP integrations",
          "Custom risk & compliance workflows",
        ],
      },
    ]),

  "consulting": () =>
    pack("co", "", "", [
      {
        price: 199,
        desc: "1-hour business strategy session",
        features: [
          "60-minute consultation",
          "Pre-call questionnaire",
          "Written summary & action items",
          "Email follow-up (7 days)",
        ],
      },
      {
        price: 499,
        desc: "Strategy sprint (3 sessions)",
        features: [
          "Everything in Starter",
          "3 × 60-minute sessions",
          "Market & competitor snapshot",
          "30-day action roadmap",
          "Slack/email support",
        ],
      },
      {
        price: 999,
        period: "/month",
        desc: "Best value — fractional advisor (monthly retainer)",
        features: [
          "Everything in Basic",
          "Weekly strategy calls",
          "KPI dashboard setup",
          "Hiring & vendor advice",
          "Priority Slack/email support",
        ],
        highlighted: true,
      },
      {
        price: 1999,
        period: "/month",
        desc: "Premium fractional COO / growth advisor",
        features: [
          "Everything in Professional",
          "2× weekly strategy calls",
          "OKR & process design",
          "Investor-readiness prep",
          "Dedicated senior advisor",
        ],
      },
      {
        price: null,
        desc: "Long-term advisory, board seats, or M&A support",
        features: [
          "Everything in Premium",
          "Board / advisory seat",
          "Fundraising / M&A support",
          "Senior partner team",
        ],
      },
    ]),

  // ────────────────────────────────  DSS  ────────────────────────────────
  "ai-software-development": () =>
    pack("ai", "", "", [
      {
        price: 999,
        desc: "AI prototype with OpenAI / Claude / Gemini API",
        features: [
          "Single AI feature prototype",
          "LLM API integration (OpenAI/Anthropic)",
          "Basic prompt engineering",
          "Simple web UI",
          "Cloud deploy",
        ],
      },
      {
        price: 1999,
        desc: "AI MVP with RAG + chat interface",
        features: [
          "Everything in Starter",
          "RAG (vector DB) over your data",
          "Chat UI with history",
          "Auth + usage limits",
          "Streaming responses",
          "30-day post-launch support",
        ],
      },
      {
        price: 2999,
        desc: "Best value — production AI app with multi-model & tools",
        period: "one-time + 30-day support",
        features: [
          "Everything in Basic",
          "Multi-model orchestration",
          "Function calling / tool use",
          "Admin dashboard + analytics",
          "Eval & safety guardrails",
          "Stripe billing integration",
        ],
        highlighted: true,
      },
      {
        price: 4999,
        desc: "Enterprise AI app with custom fine-tuning",
        period: "one-time + 90-day care",
        features: [
          "Everything in Professional",
          "Fine-tuning / LoRA training",
          "Self-hosted / private model option",
          "SSO + role-based access",
          "Observability (LangSmith/Helicone)",
          "90-day care & monitoring",
        ],
      },
      {
        price: null,
        desc: "Custom LLMs, agents, or regulated AI deployments",
        features: [
          "Everything in Premium",
          "Custom model training pipeline",
          "Multi-agent systems",
          "On-prem / VPC deployment",
          "Dedicated AI engineering team",
        ],
      },
    ]),

  "custom-software-development": () =>
    pack("cs", "", "", [
      {
        price: 999,
        desc: "Small internal tool or admin app",
        features: [
          "Single-purpose internal tool",
          "Auth + 1 core module",
          "Cloud deploy",
          "Basic documentation",
        ],
      },
      {
        price: 1999,
        desc: "Multi-module business app (5 modules)",
        features: [
          "Everything in Starter",
          "Up to 5 modules / CRUD entities",
          "Role-based access",
          "Reporting / export to CSV/PDF",
          "30-day post-launch support",
        ],
      },
      {
        price: 2999,
        desc: "Best value — full SaaS / ERP-style app with API",
        period: "one-time + 30-day support",
        features: [
          "Everything in Basic",
          "REST/GraphQL API",
          "Integrations (3rd-party / accounting)",
          "Automated tests + CI/CD",
          "Audit logs",
          "30-day support",
        ],
        highlighted: true,
      },
      {
        price: 4999,
        desc: "Enterprise app with advanced architecture",
        period: "one-time + 90-day care",
        features: [
          "Everything in Professional",
          "Multi-tenant architecture",
          "SSO (Google/Microsoft)",
          "Performance & load testing",
          "Disaster recovery plan",
          "90-day post-launch care",
        ],
      },
      {
        price: null,
        desc: "Mission-critical / regulated industries (finance, health)",
        features: [
          "Everything in Premium",
          "SOC 2 / HIPAA-friendly architecture",
          "Multi-region deploy & DR",
          "Dedicated engineering team",
          "SLA-backed support",
        ],
      },
    ]),

  "software-built-with-ai": () =>
    pack("swai", "", "", [
      {
        price: 799,
        desc: "AI-augmented MVP shipped fast (1 week)",
        features: [
          "1-week MVP build using AI tools",
          "Single core feature",
          "Auth + cloud deploy",
          "Source code handover",
        ],
      },
      {
        price: 1599,
        desc: "Production-ready app built with AI assistance",
        features: [
          "Everything in Starter",
          "Up to 4 modules",
          "Database + admin panel",
          "Stripe / payment ready",
          "Automated tests",
          "30-day post-launch support",
        ],
      },
      {
        price: 2499,
        desc: "Best value — fast SaaS build with full QA",
        period: "one-time + 30-day support",
        features: [
          "Everything in Basic",
          "Up to 8 modules",
          "API + 3rd-party integrations",
          "Manual QA + automated tests",
          "CI/CD pipeline",
          "30-day support",
        ],
        highlighted: true,
      },
      {
        price: 3999,
        desc: "Premium AI-augmented build with care",
        period: "one-time + 90-day care",
        features: [
          "Everything in Professional",
          "Performance tuning",
          "SSO + role-based access",
          "Observability & error tracking",
          "90-day post-launch care",
        ],
      },
      {
        price: null,
        desc: "Long-term AI-augmented engineering partnership",
        features: [
          "Everything in Premium",
          "Embedded engineering pod",
          "Continuous delivery program",
          "Dedicated tech lead",
        ],
      },
    ]),

  "software-testing-qa": () =>
    pack("qa", "", "", [
      {
        price: 299,
        desc: "Manual QA pass on a small app or website",
        features: [
          "Up to 20 hours manual QA",
          "Cross-browser testing",
          "Mobile responsiveness check",
          "Bug report (Notion/Jira)",
        ],
      },
      {
        price: 599,
        desc: "Manual + smoke automation",
        features: [
          "Everything in Starter",
          "Up to 50 hours QA",
          "Smoke automation (Playwright/Cypress)",
          "Regression checklist",
          "Test plan documentation",
        ],
      },
      {
        price: 1199,
        desc: "Best value — full QA program with automation",
        period: "one-time + 30-day support",
        features: [
          "Everything in Basic",
          "End-to-end automation suite",
          "API testing (Postman/Newman)",
          "CI/CD integration",
          "Performance baseline tests",
          "30-day support",
        ],
        highlighted: true,
      },
      {
        price: 2299,
        desc: "Premium QA with security & load testing",
        features: [
          "Everything in Professional",
          "Security testing (OWASP top 10)",
          "Load testing (k6 / JMeter)",
          "Accessibility (WCAG AA) audit",
          "Dedicated QA lead",
        ],
      },
      {
        price: null,
        desc: "Embedded QA team / regulated compliance testing",
        features: [
          "Everything in Premium",
          "Embedded QA pod",
          "SOC 2 / HIPAA compliance testing",
          "24×5 QA on-call",
        ],
      },
    ]),

  // ───────────────────────────  US / UK Company Formation  ───────────────────────────
  "us-company": () =>
    pack("us", "", "", [
      {
        price: 199,
        desc: "Starter LLC formation in WY/DE — state fees extra",
        features: [
          "LLC formation in WY, DE, NV, FL or CA",
          "EIN application (online filing)",
          "Operating Agreement template",
          "BOI report guidance",
          "Email support",
        ],
      },
      {
        price: 349,
        desc: "Business-ready LLC with registered agent + address",
        features: [
          "Everything in Starter",
          "1-year Registered Agent included",
          "US business address (1 year)",
          "Bank-account-ready document pack",
          "Priority filing (24–48h)",
        ],
      },
      {
        price: 599,
        desc: "Best value — full LLC + EIN + banking + compliance",
        period: "one-time + 30-day support",
        features: [
          "Everything in Basic",
          "Mercury / Wise bank intro",
          "Stripe / PayPal account setup help",
          "BOI report filing included",
          "ITIN guidance call (30 min)",
          "30-day post-formation support",
        ],
        highlighted: true,
      },
      {
        price: 999,
        desc: "Premium C-Corp / multi-member LLC for startups & funding",
        period: "one-time + 90-day care",
        features: [
          "Everything in Professional",
          "Delaware C-Corp or multi-member LLC",
          "Founder stock issuance + 83(b) prep",
          "Cap-table starter (Carta-friendly)",
          "Annual compliance calendar",
          "90-day post-formation care",
        ],
      },
      {
        price: null,
        desc: "Multi-state, holding company, or investor-ready structures",
        features: [
          "Everything in Premium",
          "Multi-state or holding co. structuring",
          "Custom legal documents",
          "Dedicated formation lead",
          "Tax & legal partner introductions",
        ],
      },
    ]),

  "uk-company": () =>
    pack("uk", "", "", [
      {
        price: 99,
        desc: "Basic UK Ltd formation with Companies House filing",
        features: [
          "Ltd company incorporation",
          "Companies House filing fee included",
          "Digital certificate of incorporation",
          "Memorandum & Articles of Association",
          "Share certificate template",
        ],
      },
      {
        price: 199,
        desc: "Non-resident friendly Ltd with UK address",
        features: [
          "Everything in Starter",
          "UK registered office (1 year)",
          "Director service address (1 year)",
          "VAT registration guidance",
          "Bank intro (Wise / Revolut Business)",
        ],
      },
      {
        price: 399,
        desc: "Best value — Ltd + address + VAT + first-year filings",
        period: "one-time + 30-day support",
        features: [
          "Everything in Basic",
          "VAT registration filed for you",
          "Confirmation Statement (1 filing)",
          "Bookkeeping starter setup",
          "Stripe / PayPal UK setup help",
          "30-day post-formation support",
        ],
        highlighted: true,
      },
      {
        price: 799,
        desc: "Premium — Ltd + accountant package + annual care",
        period: "one-time + 90-day care",
        features: [
          "Everything in Professional",
          "Annual accounts prep (small co.)",
          "Corporation tax return (CT600)",
          "PAYE registration",
          "Quarterly compliance reminders",
          "90-day post-formation care",
        ],
      },
      {
        price: null,
        desc: "Group structures, PLC, or regulated entities (FCA, etc.)",
        features: [
          "Everything in Premium",
          "Group / holding co. structure",
          "PLC or regulated entity setup",
          "Dedicated formation lead",
          "Legal & tax partner introductions",
        ],
      },
    ]),

  // ────────────────────────────────  DES  ────────────────────────────────
  "shopify-ecommerce": () =>
    pack("se", "", "", [
      {
        price: 499,
        desc: "Custom storefront design & store build with standard features",
        features: [
          "Complete Shopify store build & setup",
          "Premium conversion theme customized to your brand",
          "Up to 50 products imported & collections mapped",
          "Standard integrations (reviews, upsells, cart triggers)",
          "Payment gateways (Stripe/PayPal) & shipping setup",
          "Basic training and launch support",
        ],
      },
      {
        price: 999,
        desc: "Advanced store build with theme custom code & migration",
        features: [
          "Everything in Starter",
          "Up to 150 products",
          "Custom Shopify theme tweaks (Liquid adjustments)",
          "SEO-friendly platform migration (retains search ranks)",
          "Advanced apps setup (abandoned carts, custom discounts)",
          "2 rounds of theme revisions",
        ],
      },
      {
        price: 1899,
        desc: "Custom storefront + private app development",
        period: "one-time + 30-day support",
        features: [
          "Everything in Basic",
          "Up to 500 products",
          "Custom Private Shopify App development for custom business logic",
          "Full multi-currency & language localization setup",
          "Advanced page speed tuning (PageSpeed score 90+)",
          "30 days post-launch support",
        ],
        highlighted: true,
      },
      {
        price: 2999,
        desc: "Enterprise store with ERP, POS, and recurring checkouts",
        period: "one-time + 90-day care",
        features: [
          "Everything in Professional",
          "ERP, inventory, or physical POS systems sync integration",
          "Recurring subscriptions setup (Recharge / Bold)",
          "A/B testing tools setup for product pages",
          "90 days post-launch developer care",
          "Priority support SLA",
        ],
      },
      {
        price: null,
        desc: "Headless Shopify, multi-store layouts, or customized setups",
        features: [
          "Everything in Premium",
          "Headless Shopify architecture (Hydrogen / Next.js)",
          "Multi-store international setup",
          "Custom app backend API hosting setup",
          "Dedicated e-commerce strategist",
          "24/7 emergency support contract",
        ],
      },
    ]),

  "wordpress-ecommerce": () =>
    pack("wpe", "", "", [
      {
        price: 399,
        desc: "Simple e-commerce setup on WordPress",
        features: [
          "WooCommerce, EDD, or Surecart installation & configuration",
          "Up to 25 products with basic variants",
          "Standard payment gateways (Stripe & PayPal) configured",
          "Mobile-responsive storefront layout",
          "Basic sitemap & SEO setup",
        ],
      },
      {
        price: 799,
        desc: "Bespoke storefront templates with advanced filters",
        features: [
          "Everything in Starter",
          "Up to 100 products",
          "Custom theme templates coded to match your identity",
          "Advanced product search, filters, and comparisons",
          "Abandoned cart recoveries & coupon setups",
          "2 rounds of reviews",
        ],
      },
      {
        price: 1499,
        desc: "Headless checkout or custom license generators",
        period: "one-time + 30-day support",
        features: [
          "Everything in Basic",
          "Up to 300 products",
          "Surecart customized checkouts OR EDD license key generator",
          "Custom customer user portals with download locks",
          "Speed tuning & database indexing (sub-3s load)",
          "30 days post-launch support",
        ],
        highlighted: true,
      },
      {
        price: 2499,
        desc: "Enterprise WP store with third-party CRM sync",
        period: "one-time + 90-day care",
        features: [
          "Everything in Professional",
          "API connection to Zoho CRM, ERP, or accounting systems",
          "Multilingual translation integration (WPML / Polylang)",
          "Malware shield & security hardening",
          "90 days post-launch care and backups",
        ],
      },
      {
        price: null,
        desc: "Multi-vendor marketplaces, wholesale, or custom plugins",
        features: [
          "Everything in Premium",
          "Multi-vendor marketplace (Dokan / WCFM)",
          "B2B wholesale dynamic pricing modules",
          "Custom WooCommerce plugin development",
          "Dedicated project developer",
        ],
      },
    ]),

  "nodejs-mern-ecommerce": () =>
    pack("nme", "", "", [
      {
        price: 1199,
        desc: "Headless MERN storefront with core e-commerce API",
        features: [
          "Headless React storefront with Next.js",
          "Node.js & NestJS backend API services",
          "Core product catalog database schema (MongoDB/Postgres)",
          "Standard customer auth (JWT + email/Google)",
          "Basic admin panel for products",
        ],
      },
      {
        price: 2299,
        desc: "Production-ready headless MERN store with full checkouts",
        features: [
          "Everything in Starter",
          "Full Stripe custom checkout integration with webhooks",
          "Advanced product variants, categories, and inventory models",
          "Email triggers and background invoice generators",
          "Elasticsearch / Algolia instant product search",
          "30 days support",
        ],
      },
      {
        price: 3499,
        desc: "Best value — High-scaling headless store with CI/CD",
        period: "one-time + 30-day support",
        features: [
          "Everything in Basic",
          "Next.js Incremental Static Regeneration (ISR) (sub-1s loads)",
          "Custom discount engine & voucher structures",
          "Automated tests (Unit + Integration) & CI/CD pipeline",
          "Admin portal dashboard with reports and charts",
          "30 days support",
        ],
        highlighted: true,
      },
      {
        price: 5499,
        desc: "Omnichannel / Multi-tenant store architecture",
        period: "one-time + 90-day care",
        features: [
          "Everything in Professional",
          "Omnichannel API (serve web, iOS, Android from same backend)",
          "Multi-tenant database isolation or vendor backend",
          "Docker containerization & serverless scaling setups",
          "90 days post-launch support and logs tracking",
        ],
      },
      {
        price: null,
        desc: "Enterprise multi-region e-commerce networks",
        features: [
          "Everything in Premium",
          "Multi-region deployment and local caches",
          "Tailored admin dashboard with Elasticsearch logs analytics",
          "Custom ERP/SAP sync connections",
          "Dedicated senior backend developer",
        ],
      },
    ]),

  "laravel-ecommerce": () =>
    pack("le", "", "", [
      {
        price: 899,
        desc: "Bespoke Laravel store with Blade frontend & Filament admin",
        features: [
          "Laravel e-commerce backend built with clean models",
          "Filament admin panel setup (catalog, orders, customers)",
          "Stripe or PayPal checkout integration",
          "Standard relational database layout (MySQL)",
          "Basic cache tuning",
        ],
      },
      {
        price: 1799,
        desc: "Laravel Livewire/Alpine storefront with background queues",
        features: [
          "Everything in Starter",
          "Dynamic Livewire/Alpine.js reactive storefront",
          "Laravel background queues for emails, syncs, and logs",
          "Custom discount coupons & dynamic pricing rules",
          "Advanced shipping fees calculator API integration",
          "30 days support",
        ],
      },
      {
        price: 2799,
        desc: "High-security custom Laravel store with advanced modules",
        period: "one-time + 30-day support",
        features: [
          "Everything in Basic",
          "Bespoke security hardening & SQL protection tests",
          "Filament dashboard customized with charts and analytics",
          "API connection for CRM or inventory updates",
          "Full SEO dynamic schema generators",
          "30 days support",
        ],
        highlighted: true,
      },
      {
        price: 4499,
        desc: "Laravel headless store with separate frontend",
        period: "one-time + 90-day care",
        features: [
          "Everything in Professional",
          "Laravel API backend with separate Next.js or React frontend",
          "Multi-warehouse inventory management configurations",
          "Load testing & performance tuning (caching grids)",
          "90 days post-launch developer care",
        ],
      },
      {
        price: null,
        desc: "Custom e-commerce platforms or ERP systems",
        features: [
          "Everything in Premium",
          "Full ERP / legacy database integration mapping",
          "Bespoke multi-currency & tax calculators",
          "Dedicated project lead developer",
          "SLA-backed support contracts",
        ],
      },
    ]),
};


// Defaults & types for dynamic homepage sections.
// All editable content is stored in `site_settings` under the `home_sections` key
// as JSON. The frontend reads this via useHomeSections() and falls back to these
// defaults when no override exists.

export type HeroBadge = { icon: string; label: string };
export type HeroData = {
  enabled: boolean;
  eyebrow: string;
  headline: string;       // supports {{primary}} markers for highlight color
  subheadline: string;
  primary_cta_label: string;
  primary_cta_href: string;
  secondary_cta_label: string;
  secondary_cta_href: string;
  badges: HeroBadge[];
};

export type StatItem = { value: number; suffix: string; label: string };
export type StatsData = { enabled: boolean; items: StatItem[] };

export type ServiceItem = { icon: string; title: string; desc: string; to: string };
export type ServicesData = {
  enabled: boolean;
  eyebrow: string;
  heading: string;
  description: string;
  items: ServiceItem[];
};

export type Testimonial = { name: string; role: string; text: string; rating: number };
export type TestimonialsData = {
  enabled: boolean;
  eyebrow: string;
  heading: string;
  description: string;
  items: Testimonial[];
};

export type TeamMember = {
  name: string;
  role: string;
  initials: string;
  specialty: string;
  color: string;
  employeeKey?: string;          // Stable CMS identity; prevents duplicate-name ID mixing when reordered
  // Optional public details — when present they appear on the About page card
  // AND populate the matching ID card (single source of truth).
  photoUrl?: string;
  email?: string;
  phone?: string;
  country?: string;
  joinedAt?: string;            // ISO date — "2024-03-01"
  expiresAt?: string;           // ISO date — optional, used for contractual roles only
  bio?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  githubUrl?: string;
  // Employment status — drives QR verification result.
  // When not "active", the verify page shows the ID as no longer valid
  // even though the QR / card_id / employee id remain unchanged.
  status?: "active" | "resigned" | "terminated" | "suspended" | "on_leave";
  statusNote?: string;          // optional reason shown publicly on verify page
  statusChangedAt?: string;     // ISO date — when the status was last updated
  // Temporary admin-controlled hide-from-public toggle. Independent from
  // `status` — paused members are simply not rendered in the public team
  // carousel / About page, but their ID card / verify page still work normally
  // (so an active employee can be hidden short-term without revoking their ID).
  paused?: boolean;
};
export type TeamData = {
  enabled: boolean;
  eyebrow: string;
  heading_prefix: string;     // e.g. "Meet the"
  heading_highlight: string;  // e.g. "Experts"
  description: string;
  items: TeamMember[];
};

export type CountryItem = { flag: string; name: string };
export type CountryStat = { label: string; value: string };
export type CountriesData = {
  enabled: boolean;
  eyebrow: string;
  heading_prefix: string;       // "Trusted by clients in"
  heading_highlight: string;    // "20+ countries"
  description: string;
  stats: CountryStat[];
  items: CountryItem[];
};

export type FounderData = {
  enabled: boolean;
  headline: string;
  name: string;
  role: string;
  company: string;
  bio: string;
  badge: string;
  cta_label: string;
  cta_href: string;
};

export type CtaData = {
  enabled: boolean;
  heading_prefix: string;     // "Ready to Build Something"
  heading_highlight: string;  // "Extraordinary"
  heading_suffix: string;     // "?"
  description: string;
  primary_cta_label: string;
  primary_cta_href: string;
  secondary_cta_label: string;
  secondary_cta_href: string;
};

export type HomeSections = {
  hero: HeroData;
  stats: StatsData;
  services: ServicesData;
  testimonials: TestimonialsData;
  team: TeamData;
  countries: CountriesData;
  founder: FounderData;
  cta: CtaData;
};

export const DEFAULT_HOME_SECTIONS: HomeSections = {
  hero: {
    enabled: true,
    eyebrow: "Best-in-class digital services trusted by brands worldwide",
    headline:
      "Where Ambitious Brands Become Iconic — {{Engineered, Designed, Delivered.}}",
    subheadline:
      "We partner with founders and enterprises to design, build, and scale category-defining digital experiences. From bespoke web platforms to global growth — every detail, considered.",
    primary_cta_label: "Begin Your Project",
    primary_cta_href: "/contact",
    secondary_cta_label: "Explore Our Work",
    secondary_cta_href: "/portfolio",
    badges: [
      { icon: "Award", label: "500+ brands trust Dynime" },
      { icon: "Globe", label: "Studios across 3 continents" },
      { icon: "Sparkles", label: "Crafted since 2020" },
    ],
  },
  stats: {
    enabled: true,
    items: [
      { value: 500, suffix: "+", label: "Projects Delivered" },
      { value: 98, suffix: "%", label: "Client Satisfaction" },
      { value: 50, suffix: "+", label: "Team Members" },
      { value: 15, suffix: "+", label: "Countries Served" },
    ],
  },
  services: {
    enabled: true,
    eyebrow: "Our Craft",
    heading: "A Studio of Specialists. A Spectrum of Excellence.",
    description: "Eight disciplines, one obsession — building digital experiences that move markets and elevate brands.",
    items: [
      { icon: "Code", title: "Web Development", desc: "Custom web apps, SaaS platforms, and enterprise solutions built with modern frameworks.", to: "/wordpress-woocommerce" },
      { icon: "Cpu", title: "AI & Software Development", desc: "AI-powered apps, ML models, intelligent agents, and AI SaaS platforms built to scale.", to: "/ai-software-development" },
      { icon: "Megaphone", title: "Digital Marketing", desc: "SEO, PPC, social media, and content strategies that drive measurable growth.", to: "/seo" },
      { icon: "ShoppingBag", title: "E-Commerce", desc: "Scalable online stores with payment integration, inventory, and analytics.", to: "/wordpress-woocommerce" },
      { icon: "Building2", title: "Business Formation", desc: "US/UK company setup services including LLC formation, EIN registration, and more.", to: "/us-company" },
      { icon: "Palette", title: "UI/UX Design", desc: "User-centered design that converts visitors into loyal customers.", to: "/ui-ux-design" },
      { icon: "BarChart3", title: "Analytics & Growth", desc: "Data-driven optimization, A/B testing, and conversion rate improvement.", to: "/analytics" },
    ],
  },
  testimonials: {
    enabled: true,
    eyebrow: "In Their Words",
    heading: "The World's Most Discerning Brands Choose Dynime",
    description: "From early-stage founders to global enterprises — hear why category leaders entrust their digital future to our studio.",
    items: [
      { name: "Sarah Chen", role: "CEO, TechFlow", text: "Dynime transformed our entire digital presence. Revenue increased 340% within 6 months of launching our new platform.", rating: 5 },
      { name: "Marcus Johnson", role: "Founder, GreenLeaf", text: "The e-commerce solution they built handles 10K+ orders daily without breaking a sweat. Truly enterprise-grade work.", rating: 5 },
      { name: "Elena Rodriguez", role: "CMO, StyleVault", text: "Their marketing strategy and SEO work doubled our organic traffic. The ROI speaks for itself.", rating: 5 },
      { name: "David Park", role: "CTO, DataSync", text: "Clean architecture, excellent documentation, and a team that truly understands scalability. Highly recommend.", rating: 5 },
      { name: "Amina Okafor", role: "CEO, NovaBrand", text: "From brand strategy to Facebook Ads, Dynime helped us go from zero to 50K followers in just 3 months.", rating: 5 },
      { name: "James Wright", role: "Founder, CloudBase", text: "They set up our US LLC, payment gateways, and website in under 2 weeks. Incredible speed and professionalism.", rating: 5 },
      { name: "Sophia Lee", role: "Director, PixelCraft", text: "The UI/UX redesign they delivered increased our conversion rate by 180%. Worth every penny.", rating: 5 },
      { name: "Rahul Mehta", role: "COO, FastShip", text: "Our Shopify store went from 2s load time to under 0.8s. Page speed optimization was a game changer.", rating: 5 },
      { name: "Lisa Tanaka", role: "VP, BrightEdge", text: "Dynime's SEO strategies got us to page 1 for 15+ competitive keywords within 4 months.", rating: 5 },
      { name: "Carlos Diaz", role: "Founder, Vendora", text: "Their WooCommerce solution is rock solid. We process thousands of transactions daily without a hitch.", rating: 5 },
      { name: "Nina Petrova", role: "CMO, UrbanStyle", text: "The Google Ads campaigns they manage consistently deliver 5x ROAS. Exceptional paid media team.", rating: 5 },
      { name: "Tom Harris", role: "CTO, ScaleUp", text: "Migrated our entire platform with zero downtime. Their technical expertise is truly next level.", rating: 5 },
    ],
  },
  team: {
    enabled: true,
    eyebrow: "20+ specialists, one studio",
    heading_prefix: "The Minds Behind the",
    heading_highlight: "Magic",
    description: "Award-winning designers, engineers, strategists, and storytellers — collaborating across continents to shape brands that endure.",
    items: [
      { name: "Jit Kumar Saha", role: "Founder & CEO", initials: "JK", specialty: "Digital Strategy & Leadership", color: "from-blue-500/20 to-indigo-500/20" },
      { name: "Alex Rivera", role: "CTO", initials: "AR", specialty: "Full-Stack Architecture", color: "from-violet-500/20 to-purple-500/20" },
      { name: "Priya Sharma", role: "Head of Design", initials: "PS", specialty: "UI/UX & Branding", color: "from-pink-500/20 to-rose-500/20" },
      { name: "Marcus Chen", role: "VP Marketing", initials: "MC", specialty: "Growth & SEO", color: "from-amber-500/20 to-orange-500/20" },
      { name: "Jordan Kim", role: "Lead Developer", initials: "JK", specialty: "React & Node.js", color: "from-cyan-500/20 to-sky-500/20" },
      { name: "Amina Okafor", role: "Project Manager", initials: "AO", specialty: "Agile & Delivery", color: "from-emerald-500/20 to-teal-500/20" },
      { name: "David Park", role: "DevOps Engineer", initials: "DP", specialty: "Cloud Infrastructure", color: "from-slate-500/20 to-gray-500/20" },
      { name: "Sophia Lee", role: "Content Strategist", initials: "SL", specialty: "Copywriting & SEO", color: "from-rose-500/20 to-pink-500/20" },
      { name: "Rahul Mehta", role: "E-Commerce Lead", initials: "RM", specialty: "Shopify & WooCommerce", color: "from-yellow-500/20 to-amber-500/20" },
      { name: "Elena Rodriguez", role: "Social Media Manager", initials: "ER", specialty: "Meta & Google Ads", color: "from-fuchsia-500/20 to-pink-500/20" },
      { name: "Tom Harris", role: "QA Engineer", initials: "TH", specialty: "Testing & Automation", color: "from-green-500/20 to-emerald-500/20" },
      { name: "Nina Petrova", role: "Business Consultant", initials: "NP", specialty: "Company Formation", color: "from-indigo-500/20 to-blue-500/20" },
      { name: "Liam O'Connor", role: "AI Engineer", initials: "LO", specialty: "LLMs & ML Pipelines", color: "from-violet-500/20 to-fuchsia-500/20" },
      { name: "Yuki Tanaka", role: "Product Designer", initials: "YT", specialty: "Design Systems & Prototyping", color: "from-sky-500/20 to-cyan-500/20" },
      { name: "Sara Ahmed", role: "Brand Strategist", initials: "SA", specialty: "Positioning & Identity", color: "from-rose-500/20 to-orange-500/20" },
      { name: "Diego Fernandez", role: "Backend Engineer", initials: "DF", specialty: "APIs & Databases", color: "from-blue-500/20 to-cyan-500/20" },
      { name: "Hana Park", role: "SEO Specialist", initials: "HP", specialty: "Technical & On-Page SEO", color: "from-emerald-500/20 to-green-500/20" },
      { name: "Omar Khalid", role: "Solutions Architect", initials: "OK", specialty: "SaaS & Enterprise Systems", color: "from-purple-500/20 to-indigo-500/20" },
      { name: "Isabella Rossi", role: "Customer Success Lead", initials: "IR", specialty: "Onboarding & Retention", color: "from-pink-500/20 to-fuchsia-500/20" },
      { name: "Kenji Watanabe", role: "Mobile Developer", initials: "KW", specialty: "React Native & iOS", color: "from-teal-500/20 to-emerald-500/20" },
    ],
  },
  countries: {
    enabled: true,
    eyebrow: "Global coverage",
    heading_prefix: "We Serve Clients",
    heading_highlight: "Worldwide",
    description: "Dynime operates as a global studio. We work with founders, businesses, and teams across every continent — excluding only jurisdictions restricted by international sanctions, FATF blacklists, active conflict zones, or severe restrictions on digital services and cross-border payments.",
    stats: [
      { label: "Continents", value: "6" },
      { label: "Countries served", value: "190+" },
      { label: "Time zones", value: "24" },
      { label: "Avg. response", value: "< 4h" },
    ],
    items: [
      { flag: "🌎", name: "Americas" },
      { flag: "🇺🇸", name: "United States" },
      { flag: "🇨🇦", name: "Canada" },
      { flag: "🇲🇽", name: "Mexico" },
      { flag: "🇧🇷", name: "Brazil" },
      { flag: "🇦🇷", name: "Argentina" },
      { flag: "🌍", name: "Europe" },
      { flag: "🇬🇧", name: "United Kingdom" },
      { flag: "🇩🇪", name: "Germany" },
      { flag: "🇫🇷", name: "France" },
      { flag: "🇪🇸", name: "Spain" },
      { flag: "🇮🇹", name: "Italy" },
      { flag: "🇳🇱", name: "Netherlands" },
      { flag: "🇮🇪", name: "Ireland" },
      { flag: "🇸🇪", name: "Sweden" },
      { flag: "🇨🇭", name: "Switzerland" },
      { flag: "🇪🇪", name: "Estonia" },
      { flag: "🇱🇺", name: "Luxembourg" },
      { flag: "🇩🇰", name: "Denmark" },
      { flag: "🇵🇱", name: "Poland" },
      { flag: "🌏", name: "Asia-Pacific" },
      { flag: "🇮🇳", name: "India" },
      { flag: "🇧🇩", name: "Bangladesh" },
      { flag: "🇸🇬", name: "Singapore" },
      { flag: "🇭🇰", name: "Hong Kong" },
      { flag: "🇯🇵", name: "Japan" },
      { flag: "🇰🇷", name: "South Korea" },
      { flag: "🇹🇭", name: "Thailand" },
      { flag: "🇵🇭", name: "Philippines" },
      { flag: "🇮🇩", name: "Indonesia" },
      { flag: "🇲🇾", name: "Malaysia" },
      { flag: "🇻🇳", name: "Vietnam" },
      { flag: "🇦🇺", name: "Australia" },
      { flag: "🇳🇿", name: "New Zealand" },
      { flag: "🌍", name: "Middle East & Africa" },
      { flag: "🇦🇪", name: "United Arab Emirates" },
      { flag: "🇸🇦", name: "Saudi Arabia" },
      { flag: "🇶🇦", name: "Qatar" },
      { flag: "🇮🇱", name: "Israel" },
      { flag: "🇹🇷", name: "Turkey" },
      { flag: "🇿🇦", name: "South Africa" },
      { flag: "🇰🇪", name: "Kenya" },
      { flag: "🇳🇬", name: "Nigeria" },
      { flag: "🇪🇬", name: "Egypt" },
    ],
  },
  founder: {
    enabled: true,
    headline: "Excellence Is Not a Standard. It's the Starting Point.",
    name: "Jit Kumar Saha",
    role: "Founder & CEO",
    company: "Dynime Inc.",
    bio: "Every brand has a story worth telling beautifully. At Dynime, we blend strategic clarity with creative craft to build digital experiences that don't just perform — they resonate. Let's create something timeless together.",
    badge: "CEO",
    cta_label: "Discover Our Story",
    cta_href: "/about",
  },
  cta: {
    enabled: true,
    heading_prefix: "Your Next Chapter Begins With",
    heading_highlight: "One Conversation",
    heading_suffix: ".",
    description: "Tell us about your vision. We'll respond within 24 hours with a tailored strategy and a clear path forward.",
    primary_cta_label: "Start the Conversation",
    primary_cta_href: "/contact",
    secondary_cta_label: "View Selected Work",
    secondary_cta_href: "/portfolio",
  },
};

/** Deep-merge incoming overrides on top of defaults so missing keys never break the UI. */
export function mergeHomeSections(overrides: Partial<HomeSections> | null | undefined): HomeSections {
  const o = overrides || {};
  const d = DEFAULT_HOME_SECTIONS;
  return {
    hero: { ...d.hero, ...(o.hero || {}), badges: o.hero?.badges ?? d.hero.badges },
    stats: { ...d.stats, ...(o.stats || {}), items: o.stats?.items ?? d.stats.items },
    services: { ...d.services, ...(o.services || {}), items: o.services?.items ?? d.services.items },
    testimonials: { ...d.testimonials, ...(o.testimonials || {}), items: o.testimonials?.items ?? d.testimonials.items },
    team: { ...d.team, ...(o.team || {}), items: o.team?.items ?? d.team.items },
    countries: {
      ...d.countries,
      ...(o.countries || {}),
      stats: o.countries?.stats ?? d.countries.stats,
      items: o.countries?.items ?? d.countries.items,
    },
    founder: { ...d.founder, ...(o.founder || {}) },
    cta: { ...d.cta, ...(o.cta || {}) },
  };
}

import { useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { usePageSEO } from "@/hooks/use-page-seo";
import { SEO_DEFAULTS } from "@/lib/seo-defaults";
import ScrollReveal from "@/components/shared/ScrollReveal";
import PageHero from "@/components/shared/PageHero";
import { serviceTabs, serviceTabOrder, type ServiceTabKey } from "@/components/layout/nav-data";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ServicesLeadForm from "@/components/services/ServicesLeadForm";
import ModernFaq from "@/components/shared/ModernFaq";
import { useEligibleCountriesCount } from "@/hooks/use-eligible-countries-count";
import {
  ArrowRight, Sparkles, CheckCircle2, ShieldCheck, Zap, Globe2, Users2,
  Trophy, Rocket, MessageSquare, Calendar, FileText, Briefcase, ChevronRight, Wallet,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Category meta — SEO-rich, benefit-led copy + keyword-dense bullets */
/* ------------------------------------------------------------------ */
const categoryMeta: Record<ServiceTabKey, {
  desc: string;
  tagline?: string;
  outcomes?: string[];
  hubTo: string | null;
  keywords?: string;
  accent: string;
}> = {
  dws: {
    tagline: "Websites & web apps engineered to convert, scale, and rank.",
    desc: "Custom WordPress, Shopify, Webflow, React, Next.js, MERN and Laravel builds. We design, develop, redesign, secure and maintain digital products that load in under 3 seconds, look stunning on every device, and turn visitors into paying customers.",
    outcomes: ["Sub-3s load times", "Core Web Vitals optimized", "Mobile-first UX", "30-day post-launch care"],
    hubTo: null,
    keywords: "web development, WordPress, Shopify, React, Next.js, Laravel, SaaS, UI/UX",
    accent: "from-blue-500/15 via-transparent to-indigo-500/10 border-blue-500/30",
  },
  dms: {
    tagline: "Performance marketing that compounds — traffic, leads & revenue.",
    desc: "ROI-positive growth across Meta, Google, TikTok, LinkedIn and organic SEO. Strategists, copywriters and media buyers craft brand stories, run conversion-led ad campaigns, build domain authority and nurture leads through email — every dollar measured, every result reported.",
    outcomes: ["3–10× ROAS playbooks", "First-page SEO wins", "Conversion-led creative", "Weekly growth reports"],
    hubTo: null,
    keywords: "digital marketing, SEO, Google Ads, Meta Ads, content, email marketing",
    accent: "from-violet-500/15 via-transparent to-purple-500/10 border-violet-500/30",
  },
  dss: {
    tagline: "AI-first software, shipped 5× faster.",
    desc: "Custom software, AI products and intelligent agents built by senior engineers using GPT, Claude, Gemini, RAG, vector search and modern cloud stacks. From MVPs and internal tools to production-grade SaaS and ML pipelines — with rigorous QA so what we ship stays shipped.",
    outcomes: ["GPT / Claude / Gemini ready", "Production-grade architecture", "End-to-end QA & testing", "Built to scale to millions"],
    hubTo: "/services/dss",
    keywords: "AI software development, custom software, SaaS, MVP, LLM, RAG, automation",
    accent: "from-cyan-500/20 via-transparent to-sky-500/10 border-cyan-500/40",
  },
  dcs: {
    tagline: "Launch and run a global business — without the paperwork pain.",
    desc: "We handle the regulated, complicated parts so you can focus on growth: US & UK company formation, EIN, ITIN, VAT, registered office & virtual addresses, payment-gateway approval, marketplace launches and turnkey dropshipping — all within full legal & tax compliance.",
    outcomes: ["LLC / Ltd / C-Corp", "Stripe & PayPal ready", "Bank account assistance", "Ongoing compliance"],
    hubTo: null,
    keywords: "company formation USA, UK Ltd, EIN, ITIN, virtual address, payment gateway",
    accent: "from-emerald-500/15 via-transparent to-teal-500/10 border-emerald-500/30",
  },
  dbm: {
    tagline: "The AI-powered business operating system.",
    desc: "Dynime OS is our AI-powered business operating system — Dynime CRM, HRM, Sales, Finance, Projects, Inventory, AI and Support under a single login. Built for growing companies tired of paying for and switching between disconnected SaaS tools.",
    outcomes: ["8 integrated modules", "AI copilots built in", "Role-based access", "Mobile + web ready"],
    hubTo: "/products/os",
    keywords: "Dynime OS, business operating system, HRM, CRM, ERP, AI",
    accent: "from-amber-500/15 via-transparent to-orange-500/10 border-amber-500/30",
  },
  resources: { desc: "", hubTo: null, accent: "" },
};

/* ------------------------------------------------------------------ */
const buildTrustStats = (countries: number) => [
  { icon: Trophy, value: "800+", label: "Projects shipped" },
  { icon: Users2, value: "250+", label: "Happy clients" },
  { icon: Globe2, value: countries > 0 ? `${countries}+` : "25+", label: "Countries served" },
  { icon: ShieldCheck, value: "Since 2020", label: "In business" },
];


const WHY_US = [
  { icon: Zap, title: "Senior team only", desc: "No juniors learning on your project. Every engineer has 5+ years of production experience." },
  { icon: Rocket, title: "Ship in weeks, not quarters", desc: "AI-augmented workflows let us deliver in a fraction of the typical agency timeline." },
  { icon: ShieldCheck, title: "Fixed scope, fixed price", desc: "Transparent quotes, milestone-based billing, and a 30-day post-launch warranty." },
  { icon: MessageSquare, title: "Real humans, real fast", desc: "Slack/WhatsApp access to your project lead — not an account manager who guards the team." },
];

const QUICK_LINKS = [
  { to: "/portfolio", label: "Portfolio", icon: Briefcase },
  { to: "/about", label: "About Dynime", icon: Users2 },
  { to: "/contact", label: "Get a quote", icon: MessageSquare },
  { to: "/blog", label: "Insights & guides", icon: FileText },
  { to: "/careers", label: "Careers", icon: Sparkles },
  { to: "/services/dss", label: "AI Software Hub", icon: Rocket },
  { to: "/products/os", label: "Dynime OS", icon: Globe2 },
  { to: "/pay-open-source", label: "Dynime Pay (Self-Hosted)", icon: Wallet },
  { to: "/contact", label: "Book a call", icon: Calendar },
];

const FAQS = [
  {
    q: "What services does Dynime offer?",
    a: "Dynime is a full-service digital studio. We handle web design & development (WordPress, Shopify, React, Laravel), digital marketing (SEO, Meta & Google Ads, content), AI & custom software development, US/UK company formation and our own AI-powered business operating system, Dynime OS.",
  },
  {
    q: "How much does a project cost?",
    a: "Pricing depends on scope. Simple WordPress builds start at $499, Shopify stores at $799, custom SaaS MVPs from $4,999 and AI products from $7,500. Every quote is fixed-price with milestone billing — no surprises.",
  },
  {
    q: "How long does delivery take?",
    a: "Most marketing setups go live in 5–10 days. Standard websites ship in 2–4 weeks, complex SaaS or AI products in 6–12 weeks. We share a Gantt timeline before kickoff and update it weekly.",
  },
  {
    q: "Do you work with clients outside Bangladesh?",
    a: "Yes. 70% of our clients are in the US, UK, EU, UAE and Australia. We accept Stripe, SSLCommerz, Wise, bKash and bank transfer in USD, GBP, EUR and BDT.",
  },
  {
    q: "Can I hire you on a retainer?",
    a: "Absolutely. We offer monthly retainers for marketing, development, AI ops and Dynime OS support — from $499/mo with no long-term lock-in.",
  },
];

/* ------------------------------------------------------------------ */
/*  Comparison table — helps users pick the right service             */
/* ------------------------------------------------------------------ */
const COMPARISON_ROWS: {
  feature: string;
  web: string;
  marketing: string;
  ai: string;
  formation: string;
}[] = [
  { feature: "Best for", web: "Launching or revamping a site/store", marketing: "Driving traffic, leads & sales", ai: "Custom software & AI products", formation: "Going global & getting paid" },
  { feature: "Typical timeline", web: "2–4 weeks", marketing: "Live in 5–10 days", ai: "6–12 weeks", formation: "7–21 days" },
  { feature: "Starting price", web: "$499", marketing: "$299/mo", ai: "$4,999", formation: "$199" },
  { feature: "Engagement", web: "Fixed-scope project", marketing: "Monthly retainer", ai: "Milestone-based build", formation: "One-time + annual" },
  { feature: "Deliverables", web: "Live website / app + 30-day care", marketing: "Campaigns, content, weekly reports", ai: "Production app, code, docs, QA", formation: "Company docs, EIN, bank, gateway" },
  { feature: "Tech / channels", web: "WordPress, Shopify, React, Next.js", marketing: "SEO, Google, Meta, TikTok, Email", ai: "GPT, Claude, RAG, Node, Python", formation: "US LLC, UK Ltd, Stripe, PayPal" },
  { feature: "Ongoing support", web: "Optional care plan", marketing: "Included in retainer", ai: "SLA-backed maintenance", formation: "Annual compliance" },
  { feature: "Best outcome", web: "Conversion-ready presence", marketing: "Predictable pipeline", ai: "Owned IP & automation", formation: "Compliant global business" },
];

const COMPARISON_COLS = [
  { key: "web", label: "Web Development", sub: "Sites, stores & apps", to: "#cat-dws", accent: "from-blue-500/20 to-indigo-500/10" },
  { key: "marketing", label: "Digital Marketing", sub: "SEO, ads & content", to: "#cat-dms", accent: "from-violet-500/20 to-purple-500/10" },
  { key: "ai", label: "AI & Software", sub: "Custom builds", to: "/services/dss", accent: "from-cyan-500/20 to-sky-500/10" },
  { key: "formation", label: "Company Formation", sub: "US / UK setup", to: "#cat-dcs", accent: "from-emerald-500/20 to-teal-500/10" },
] as const;

/* ------------------------------------------------------------------ */
/*  Related internal links per category — boosts SEO + discoverability */
/* ------------------------------------------------------------------ */
type RelatedLink = { label: string; to: string; kind: "service" | "portfolio" | "guide" | "pricing" };
const RELATED_LINKS: Record<ServiceTabKey, RelatedLink[]> = {
  dws: [
    { label: "WordPress development", to: "/wordpress-woocommerce", kind: "service" },
    { label: "Shopify store setup", to: "/shopify", kind: "service" },
    { label: "WooCommerce stores", to: "/wordpress-woocommerce", kind: "service" },
    { label: "Custom web apps", to: "/react-mern-apps", kind: "service" },
    { label: "UI/UX design", to: "/ui-ux-design", kind: "service" },
    { label: "Web design portfolio", to: "/portfolio", kind: "portfolio" },
  ],
  dms: [
    { label: "SEO services", to: "/seo", kind: "service" },
    { label: "Google Ads management", to: "/google-ads", kind: "service" },
    { label: "Meta (Facebook & Instagram) Ads", to: "/facebook-ads", kind: "service" },
    { label: "Social media marketing", to: "/social-media", kind: "service" },
    { label: "Content & email marketing", to: "/content-marketing", kind: "service" },
    { label: "Marketing case studies", to: "/portfolio", kind: "portfolio" },
  ],
  dss: [
    { label: "AI software hub", to: "/services/dss", kind: "service" },
    { label: "AI software development", to: "/ai-software-development", kind: "service" },
    { label: "Custom software development", to: "/custom-software-development", kind: "service" },
    { label: "Software built with AI", to: "/software-built-with-ai", kind: "service" },
    { label: "QA & software testing", to: "/software-testing-qa", kind: "service" },
    { label: "Dynime Pay (self-hosted gateway)", to: "/pay-open-source", kind: "service" },
    { label: "Software portfolio", to: "/portfolio", kind: "portfolio" },
  ],
  dcs: [
    { label: "USA company formation", to: "/us-company", kind: "service" },
    { label: "UK Ltd formation", to: "/uk-company", kind: "service" },
    { label: "Payment gateway setup", to: "/payment-gateway", kind: "service" },
    { label: "Virtual address", to: "/virtual-address", kind: "service" },
    { label: "ITIN services", to: "/itin-services", kind: "service" },
    { label: "Business consulting", to: "/consulting", kind: "service" },
  ],
  dbm: [
    { label: "Dynime OS overview", to: "/products/os", kind: "service" },
    { label: "Dynime Pay — open-source gateway", to: "/pay-open-source", kind: "service" },
    { label: "Dropshipping solution", to: "/dropshipping-solution", kind: "service" },
    { label: "Marketplace solution", to: "/marketplace-solution", kind: "service" },
    { label: "Analytics & growth", to: "/analytics", kind: "service" },
    { label: "Customer stories", to: "/portfolio", kind: "portfolio" },
    { label: "Request a demo", to: "/contact", kind: "guide" },
  ],
  resources: [],
};

const KIND_META: Record<RelatedLink["kind"], { label: string; className: string }> = {
  service:   { label: "Service",  className: "bg-primary/10 text-primary" },
  portfolio: { label: "Portfolio", className: "bg-violet-500/10 text-violet-600 dark:text-violet-300" },
  pricing:   { label: "Pricing",  className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" },
  guide:     { label: "Guide",    className: "bg-amber-500/10 text-amber-600 dark:text-amber-300" },
};

/* ------------------------------------------------------------------ */
const Services = () => {
  const { data: eligibleCount = 0 } = useEligibleCountriesCount();
  const TRUST_STATS = buildTrustStats(eligibleCount);
  const categoryKeys = serviceTabOrder.filter((k) => k !== "resources");

  // Build itemListElement for SEO
  const itemListElement = categoryKeys.flatMap((key, ci) =>
    serviceTabs[key].items.map((it, i) => ({
      "@type": "ListItem",
      position: ci * 100 + i + 1,
      name: `${serviceTabs[key].label} — ${it.label}`,
      url: typeof window !== "undefined" ? `${window.location.origin}${it.to}` : it.to,
    })),
  );

  usePageSEO("services", {
    title: SEO_DEFAULTS.services.title,
    description: SEO_DEFAULTS.services.description,
    keywords: SEO_DEFAULTS.services.keywords,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Dynime Digital Services",
        itemListElement,
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: FAQS.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  });

  // Smooth scroll on category click
  useEffect(() => {
    const onHash = () => {
      const id = window.location.hash.replace("#", "");
      if (id) document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return (
    <Layout>
      <PageHero
        eyebrow="Digital Services · Web · Marketing · AI · Formation"
        eyebrowIcon={Sparkles}
        title={
          <>
            One studio. <span className="gradient-text">Every digital discipline</span>.
          </>
        }
        description="Web development, performance marketing, AI software, US/UK company formation and an all-in-one business OS — delivered by senior teams, shipped in weeks, priced fixed."
        primaryCta={{ label: "Get a free quote", href: "/contact" }}
        secondaryCta={{ label: "See our work", href: "/portfolio" }}
      />

      {/* Trust strip */}
      <section className="section-padding-sm section-tint-a">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {TRUST_STATS.map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <s.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-heading text-2xl font-bold text-foreground leading-none">{s.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Category quick jump grid (non-sticky, fully responsive) */}
      <section className="py-8 border-b border-border">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {categoryKeys.map((key) => {
              const cat = serviceTabs[key];
              const Icon = cat.icon;
              return (
                <a
                  key={key}
                  href={`#cat-${key}`}
                  className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{cat.label}</div>
                    <div className="text-xs text-muted-foreground truncate">{cat.sublabel}</div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-9 md:py-12">
        <div className="container-custom space-y-12 md:space-y-16">
          {categoryKeys.map((key, ci) => {
            const cat = serviceTabs[key];
            const meta = categoryMeta[key];
            const services = cat.items;
            const CatIcon = cat.icon;
            return (
              <article
                key={key}
                id={`cat-${key}`}
                className={`relative rounded-3xl border bg-gradient-to-br ${meta.accent} p-6 md:p-10 scroll-mt-32`}
              >
                <ScrollReveal delay={ci * 0.05}>
                  <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-14 h-14 rounded-2xl bg-background/80 border border-border flex items-center justify-center flex-shrink-0 shadow-sm">
                        <CatIcon className="w-7 h-7 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold uppercase tracking-widest text-primary">{cat.label}</span>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs font-medium text-muted-foreground">{cat.sublabel}</span>
                        </div>
                        <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mt-1 leading-tight">
                          {meta.tagline}
                        </h2>
                        <p className="text-sm md:text-base text-muted-foreground mt-3 leading-relaxed max-w-3xl">
                          {meta.desc}
                        </p>
                        {meta.outcomes && (
                          <ul className="flex flex-wrap gap-2 mt-4">
                            {meta.outcomes.map((o) => (
                              <li
                                key={o}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-background/70 border border-border text-xs font-medium text-foreground"
                              >
                                <CheckCircle2 className="w-3 h-3 text-primary" />
                                {o}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                    {meta.hubTo && (
                      <Button variant="hero" asChild className="shrink-0">
                        <Link to={meta.hubTo}>
                          Explore {cat.label} <ArrowRight className="w-4 h-4 ml-1" />
                        </Link>
                      </Button>
                    )}
                  </header>
                </ScrollReveal>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                  {services.map((s, i) => {
                    const Icon = s.icon;
                    return (
                      <ScrollReveal key={`${key}-${s.to}-${i}`} delay={i * 0.04} className="h-full">
                        <Link
                          to={s.to}
                          className="group relative h-full p-5 rounded-2xl bg-background/70 backdrop-blur-sm border border-border hover:border-primary/50 hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col"
                        >
                          <div className="w-10 h-10 rounded-xl bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground transition-colors flex items-center justify-center mb-3">
                            <Icon className="w-5 h-5 text-primary group-hover:text-primary-foreground transition-colors" />
                          </div>
                          <h3 className="font-heading font-semibold text-sm text-foreground mb-1 group-hover:text-primary transition-colors">
                            {s.label}
                          </h3>
                          <p className="text-xs text-muted-foreground leading-relaxed flex-1">{s.desc}</p>
                          <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between text-xs font-medium text-primary">
                            <span>Learn more</span>
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </Link>
                      </ScrollReveal>
                    );
                  })}
                </div>

                {RELATED_LINKS[key]?.length > 0 && (
                  <ScrollReveal delay={0.05}>
                    <div className="mt-8 pt-6 border-t border-border/60">
                      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                        <h3 className="font-heading text-sm font-bold uppercase tracking-widest text-foreground/80">
                          Explore {cat.label} resources
                        </h3>
                        <Link
                          to="/portfolio"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          See all work <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {RELATED_LINKS[key].map((l) => {
                          const km = KIND_META[l.kind];
                          return (
                            <Link
                              key={l.to + l.label}
                              to={l.to}
                              className="group flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-background/70 border border-border hover:border-primary/50 hover:bg-background transition-all"
                            >
                              <div className="min-w-0 flex items-center gap-3">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${km.className}`}>
                                  {km.label}
                                </span>
                                <span className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                                  {l.label}
                                </span>
                              </div>
                              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </ScrollReveal>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* Why Dynime */}
      <section className="section-padding section-tint-a">
        <div className="container-custom">
          <ScrollReveal>
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="inline-block text-xs font-bold uppercase tracking-widest text-primary mb-3">Why Dynime</span>
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-3">
                Built for founders who want it <span className="gradient-text">done right</span>, not redone twice.
              </h2>
              <p className="text-muted-foreground">A senior team, transparent pricing and an obsession with shipping. That's the Dynime promise.</p>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {WHY_US.map((w, i) => (
              <ScrollReveal key={w.title} delay={i * 0.05}>
                <div className="h-full p-6 rounded-2xl bg-background border border-border hover:border-primary/40 transition-colors">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <w.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-heading font-bold text-foreground mb-2">{w.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{w.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ — SEO */}
      <section className="section-padding section-tint-b relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[680px] h-[680px] rounded-full bg-primary/5 blur-3xl" />
        </div>
        <div className="container-custom max-w-3xl relative">
          <ScrollReveal>
            <div className="text-center mb-12">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" /> FAQ
              </span>
              <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold mt-4 text-foreground">
                Common questions
              </h2>
            </div>
          </ScrollReveal>
          <ModernFaq items={FAQS} />
        </div>
      </section>

      {/* Service comparison table */}
      <section className="py-12 md:py-14 border-t border-border">
        <div className="container-custom">
          <ScrollReveal>
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="inline-block text-xs font-bold uppercase tracking-widest text-primary mb-3">Compare services</span>
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-3">
                Not sure where to start? <span className="gradient-text">Compare at a glance.</span>
              </h2>
              <p className="text-muted-foreground">Pick the service that matches your goal — timeline, price, deliverables and outcomes side-by-side.</p>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            {/* Desktop / tablet table */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-background/60">
                    <th className="text-left font-heading font-semibold text-foreground p-4 w-44">Feature</th>
                    {COMPARISON_COLS.map((c) => (
                      <th key={c.key} className={`text-left p-4 bg-gradient-to-br ${c.accent}`}>
                        <div className="font-heading font-bold text-foreground">{c.label}</div>
                        <div className="text-xs text-muted-foreground font-normal mt-0.5">{c.sub}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row, i) => (
                    <tr key={row.feature} className={i % 2 ? "bg-background/30" : ""}>
                      <td className="p-4 font-medium text-foreground border-t border-border align-top">{row.feature}</td>
                      <td className="p-4 text-muted-foreground border-t border-border align-top">{row.web}</td>
                      <td className="p-4 text-muted-foreground border-t border-border align-top">{row.marketing}</td>
                      <td className="p-4 text-muted-foreground border-t border-border align-top">{row.ai}</td>
                      <td className="p-4 text-muted-foreground border-t border-border align-top">{row.formation}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-border bg-background/40">
                    <td className="p-4 font-medium text-foreground">Take action</td>
                    {COMPARISON_COLS.map((c) => (
                      <td key={c.key} className="p-4">
                        {c.to.startsWith("#") ? (
                          <a href={c.to} className="inline-flex items-center text-xs font-semibold text-primary hover:underline">
                            Explore <ArrowRight className="w-3 h-3 ml-1" />
                          </a>
                        ) : (
                          <Link to={c.to} className="inline-flex items-center text-xs font-semibold text-primary hover:underline">
                            Explore <ArrowRight className="w-3 h-3 ml-1" />
                          </Link>
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Mobile stacked cards */}
            <div className="md:hidden grid grid-cols-1 gap-4">
              {COMPARISON_COLS.map((c) => (
                <div key={c.key} className={`rounded-2xl border border-border bg-gradient-to-br ${c.accent} p-5`}>
                  <div className="font-heading font-bold text-foreground text-lg">{c.label}</div>
                  <div className="text-xs text-muted-foreground mb-4">{c.sub}</div>
                  <dl className="space-y-2">
                    {COMPARISON_ROWS.map((row) => (
                      <div key={row.feature} className="flex justify-between gap-3 text-sm border-t border-border/60 pt-2">
                        <dt className="text-muted-foreground flex-shrink-0 w-32">{row.feature}</dt>
                        <dd className="text-foreground text-right">{(row as any)[c.key]}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-4">
                    {c.to.startsWith("#") ? (
                      <a href={c.to} className="inline-flex items-center text-sm font-semibold text-primary">
                        Explore {c.label} <ArrowRight className="w-4 h-4 ml-1" />
                      </a>
                    ) : (
                      <Link to={c.to} className="inline-flex items-center text-sm font-semibold text-primary">
                        Explore {c.label} <ArrowRight className="w-4 h-4 ml-1" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Useful links */}
      <section className="section-padding-sm section-tint-a">
        <div className="container-custom">
          <ScrollReveal>
            <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
              <div>
                <span className="inline-block text-xs font-bold uppercase tracking-widest text-primary mb-2">Useful links</span>
                <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground">Keep exploring</h2>
              </div>
              <Button variant="outline" asChild>
                <Link to="/contact">Talk to a strategist <ArrowRight className="w-4 h-4 ml-1" /></Link>
              </Button>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {QUICK_LINKS.map((l, i) => (
              <ScrollReveal key={l.label} delay={i * 0.03}>
                <Link
                  to={l.to}
                  className="group flex items-center gap-3 p-4 rounded-xl bg-background border border-border hover:border-primary/50 hover:shadow-sm transition-all"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors flex-shrink-0">
                    <l.icon className="w-4 h-4 text-primary group-hover:text-primary-foreground transition-colors" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm text-foreground group-hover:text-primary transition-colors truncate">{l.label}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Lead capture form */}
      <section id="get-quote" className="section-padding section-tint-a scroll-mt-24">
        <div className="container-custom max-w-3xl">
          <ScrollReveal>
            <div className="text-center mb-8">
              <span className="inline-block text-xs font-bold uppercase tracking-widest text-primary mb-3">Free quote</span>
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-3">
                Tell us about your project — get a <span className="gradient-text">fixed quote in 24 hours</span>.
              </h2>
              <p className="text-muted-foreground">No sales pressure. Share a few details and a senior strategist will reply with scope, timeline and price.</p>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.05}>
            <ServicesLeadForm />
          </ScrollReveal>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-12 md:py-14">
        <div className="container-custom">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/15 via-primary/5 to-background border border-primary/30 p-8 md:p-14 text-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.15),transparent_60%)] pointer-events-none" />
            <div className="relative">
              <Sparkles className="w-10 h-10 text-primary mx-auto mb-4" />
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-3">
                Ready to ship something <span className="gradient-text">real</span>?
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto mb-6">
                Get a free 30-minute strategy call. We'll scope your project, share a fixed quote and a delivery plan — no obligation.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="hero" size="lg" asChild>
                  <Link to="/contact">Start a project <ArrowRight className="w-4 h-4 ml-1" /></Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link to="/portfolio">View case studies</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Services;

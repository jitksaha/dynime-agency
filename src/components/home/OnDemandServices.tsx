import { Link } from "react-router-dom";
import { motion, useInView, AnimatePresence, LayoutGroup } from "framer-motion";
import { useRef, useState } from "react";
import {
  ArrowRight, Code, ShoppingBag, Zap, Shield, Users, Megaphone,
  BarChart3, Lightbulb, Building2, Globe, Palette, Layers,
  Sparkles, BrainCircuit, Rocket, ChevronLeft, ChevronRight, Wallet,
} from "lucide-react";

type Category = "all" | "web" | "marketing" | "business" | "ai" | "products";

const categories: { key: Category; label: string; icon: any }[] = [
  { key: "all", label: "All Services", icon: Layers },
  { key: "products", label: "Products", icon: Rocket },
  { key: "web", label: "Web & Dev", icon: Code },
  { key: "ai", label: "AI / DSS", icon: Sparkles },
  { key: "marketing", label: "Marketing", icon: Megaphone },
  { key: "business", label: "Business", icon: Building2 },
];

type BannerConfig = {
  to: string;
  icon: any;
  title: string;
  desc: string;
  cta: string;
  gradient: string;
  iconBg: string;
};

const categoryBanners: Partial<Record<Category, BannerConfig>> = {
  products: {
    to: "/products/os",
    icon: Rocket,
    title: "Dynime OS — AI-Powered Business Operating System",
    desc: "CRM, HRM, Sales, Finance, Projects, Inventory, AI and Support — one intelligent platform.",
    cta: "Explore Dynime OS",
    gradient: "from-amber-500/10 via-primary/5 to-orange-500/10",
    iconBg: "from-amber-500/30 to-orange-500/30",
  },
  ai: {
    to: "/services/dss",
    icon: Sparkles,
    title: "DSS — Dynime Software Services",
    desc: "Custom software, AI software, AI-augmented dev & software QA — explore our software hub.",
    cta: "Visit DSS Hub",
    gradient: "from-cyan-500/10 via-primary/5 to-sky-500/10",
    iconBg: "from-cyan-500/30 to-sky-500/30",
  },
  web: {
    to: "/services",
    icon: Code,
    title: "DWS — Dynime Web Services",
    desc: "WordPress, Shopify, custom web apps, speed & maintenance — built to convert.",
    cta: "Explore Web Services",
    gradient: "from-blue-500/10 via-primary/5 to-indigo-500/10",
    iconBg: "from-blue-500/30 to-indigo-500/30",
  },
  marketing: {
    to: "/services",
    icon: Megaphone,
    title: "DMS — Dynime Marketing Services",
    desc: "SEO, Meta & Google Ads, social media, branding & content — growth on autopilot.",
    cta: "Explore Marketing",
    gradient: "from-violet-500/10 via-primary/5 to-purple-500/10",
    iconBg: "from-violet-500/30 to-purple-500/30",
  },
  business: {
    to: "/services",
    icon: Building2,
    title: "DCS — Dynime Consultancy Services",
    desc: "US/UK company formation, business addresses, payment gateways & consulting.",
    cta: "Explore Business Setup",
    gradient: "from-emerald-500/10 via-primary/5 to-teal-500/10",
    iconBg: "from-emerald-500/30 to-teal-500/30",
  },
};

const services = [
  // ── Product ──
  {
    title: "Dynime OS",
    desc: "The AI-powered business operating system: Dynime CRM, HRM, Sales, Finance, Projects, Inventory, AI and Support — one login, one platform.",
    to: "/products/os",
    icon: Rocket,
    tag: "Product",
    tagColor: "bg-amber-500/20 text-amber-400",
    category: "products" as Category,
  },
  {
    title: "Dynime Pay (Self-Hosted)",
    desc: "Open-source, self-hosted payment gateway for Bangladesh & beyond — bKash, Nagad, Rocket, Stripe, Binance, SSLCommerz and 40+ rails. Personal & merchant modes.",
    to: "/pay-open-source",
    icon: Wallet,
    tag: "Product",
    tagColor: "bg-amber-500/20 text-amber-400",
    category: "products" as Category,
  },
  {
    title: "WordPress Design/Redesign",
    desc: "Pixel-perfect, fully responsive websites crafted to captivate your audience on every device.",
    to: "/wordpress-woocommerce",
    icon: Palette,
    tag: "Most Popular",
    tagColor: "bg-primary/20 text-primary",
    category: "web" as Category,
  },
  {
    title: "WordPress Development",
    desc: "Clean, standards-compliant development with custom themes, plugins, and seamless integrations.",
    to: "/wordpress-woocommerce",
    icon: Code,
    tag: "Core",
    tagColor: "bg-accent/20 text-accent",
    category: "web" as Category,
  },
  {
    title: "Ecommerce Development",
    desc: "High-converting WooCommerce stores with lightning-fast checkout and optimized UX.",
    to: "/wordpress-woocommerce",
    icon: ShoppingBag,
    tag: "Revenue",
    tagColor: "bg-emerald-500/20 text-emerald-400",
    category: "web" as Category,
  },
  {
    title: "Shopify Development",
    desc: "Premium Shopify stores with express checkout, custom themes, and conversion-focused design.",
    to: "/shopify",
    icon: ShoppingBag,
    tag: "E-Commerce",
    tagColor: "bg-emerald-500/20 text-emerald-400",
    category: "web" as Category,
  },
  {
    title: "Page Speed Optimization",
    desc: "Transform slow websites into sub-3-second loading experiences that boost SEO and retention.",
    to: "/speed-optimization",
    icon: Zap,
    tag: "Performance",
    tagColor: "bg-amber-500/20 text-amber-400",
    category: "web" as Category,
  },
  {
    title: "WordPress Maintenance",
    desc: "24/7 security monitoring, updates, backups, and bug fixes to keep your site running flawlessly.",
    to: "/maintenance-security",
    icon: Shield,
    tag: "Essential",
    tagColor: "bg-sky-500/20 text-sky-400",
    category: "web" as Category,
  },
  {
    title: "Social Media Management",
    desc: "Strategic content creation, scheduling, and community engagement across all major platforms.",
    to: "/social-media",
    icon: Users,
    tag: "Growth",
    tagColor: "bg-violet-500/20 text-violet-400",
    category: "marketing" as Category,
  },
  {
    title: "Facebook & Instagram Ads",
    desc: "Data-driven Meta ad campaigns with precise targeting to maximize ROAS and brand reach.",
    to: "/facebook-ads",
    icon: Megaphone,
    tag: "Paid Ads",
    tagColor: "bg-rose-500/20 text-rose-400",
    category: "marketing" as Category,
  },
  {
    title: "Google Advertising",
    desc: "Search, display, and shopping campaigns engineered to drive qualified traffic and instant sales.",
    to: "/google-ads",
    icon: BarChart3,
    tag: "Paid Ads",
    tagColor: "bg-rose-500/20 text-rose-400",
    category: "marketing" as Category,
  },
  {
    title: "Brand Strategy Development",
    desc: "Define your unique identity, voice, and market positioning to stand out from competitors.",
    to: "/brand-strategy",
    icon: Lightbulb,
    tag: "Strategy",
    tagColor: "bg-orange-500/20 text-orange-400",
    category: "marketing" as Category,
  },
  {
    title: "US Company Formation",
    desc: "Full LLC/C-Corp setup with EIN, registered agent, bank account, and payment gateway assistance.",
    to: "/us-company",
    icon: Building2,
    tag: "Business",
    tagColor: "bg-teal-500/20 text-teal-400",
    category: "business" as Category,
  },
  {
    title: "UK Company Formation",
    desc: "Ltd company registration with Companies House, VAT setup, and business banking guidance.",
    to: "/uk-company",
    icon: Globe,
    tag: "Business",
    tagColor: "bg-teal-500/20 text-teal-400",
    category: "business" as Category,
  },
  // ── DSS — Dynime Software Services ──
  {
    title: "Custom Software Development",
    desc: "Bespoke web apps, SaaS platforms, internal tools and dashboards built around your exact workflow.",
    to: "/custom-software-development",
    icon: Code,
    tag: "Bespoke",
    tagColor: "bg-cyan-500/20 text-cyan-400",
    category: "ai" as Category,
  },
  {
    title: "AI Software Development",
    desc: "AI-native apps powered by LLMs, RAG, and custom fine-tuning — built for production scale.",
    to: "/ai-software-development",
    icon: BrainCircuit,
    tag: "AI-First",
    tagColor: "bg-cyan-500/20 text-cyan-400",
    category: "ai" as Category,
  },
  {
    title: "Software Built With AI",
    desc: "AI-augmented engineering — senior humans + AI coding agents ship custom software 3× faster.",
    to: "/software-built-with-ai",
    icon: Sparkles,
    tag: "3× Faster",
    tagColor: "bg-cyan-500/20 text-cyan-400",
    category: "ai" as Category,
  },
  {
    title: "Software Testing & QA",
    desc: "Automated, manual, performance and security testing — catch bugs before your users do.",
    to: "/software-testing-qa",
    icon: Shield,
    tag: "QA",
    tagColor: "bg-cyan-500/20 text-cyan-400",
    category: "ai" as Category,
  },
];

const OnDemandServices = () => {
  const ref = useRef(null);
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [activeCategory, setActiveCategory] = useState<Category>("all");

  const filtered = activeCategory === "all"
    ? services
    : services.filter((s) => s.category === activeCategory);

  return (
    <section ref={ref} className="section-padding">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
          animate={inView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-10"
        >
          <span className="text-primary text-sm font-semibold uppercase tracking-wider">What We Offer</span>
          <h2 className="font-heading text-3xl md:text-4xl font-bold mt-3 mb-2 text-foreground">
            On-Demand <span className="gradient-text">Services</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            From concept to launch and beyond — everything your digital business needs to thrive, all under one roof.
          </p>
        </motion.div>

        {/* Filter Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-10 relative"
        >
          {/* Mobile-only edge fade hints */}
          <div className="sm:hidden pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-background to-transparent z-10" />
          <div className="sm:hidden pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent z-10" />

          {/* Mobile-only side arrows (outside the tab bar) */}
          <button
            type="button"
            aria-label="Scroll categories left"
            onClick={() => tabsScrollRef.current?.scrollBy({ left: -160, behavior: "smooth" })}
            className="sm:hidden absolute left-0 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full bg-card/90 border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Scroll categories right"
            onClick={() => tabsScrollRef.current?.scrollBy({ left: 160, behavior: "smooth" })}
            className="sm:hidden absolute right-0 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full bg-card/90 border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="w-4 h-4 animate-pulse" />
          </button>

          <div
            ref={tabsScrollRef}
            className="-mx-4 sm:mx-0 px-10 sm:px-0 overflow-x-auto sm:overflow-visible scrollbar-hide scroll-smooth snap-x"
          >
            <div className="inline-flex sm:flex sm:justify-center items-center gap-1.5 p-1.5 rounded-2xl bg-card/80 border border-border/50 backdrop-blur-sm w-max sm:mx-auto">
              {categories.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className="relative px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors duration-200 shrink-0 snap-start"
                >
                  {activeCategory === cat.key && (
                    <motion.div
                      layoutId="service-tab-bg"
                      className="absolute inset-0 rounded-xl bg-primary shadow-[0_0_20px_-5px_hsl(var(--primary)/0.5)]"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span
                    className={`relative z-10 inline-flex items-center gap-1.5 whitespace-nowrap ${
                      activeCategory === cat.key
                        ? "text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <cat.icon className="w-3.5 h-3.5 shrink-0" />
                    {cat.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Category hub banners — one consistent banner per non-"all" tab */}
        <AnimatePresence mode="wait">
          {activeCategory !== "all" && categoryBanners[activeCategory] && (
            <motion.div
              key={`banner-${activeCategory}`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="mb-6"
            >
              <Link
                to={categoryBanners[activeCategory]!.to}
                className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-primary/30 bg-gradient-to-r ${categoryBanners[activeCategory]!.gradient} hover:border-primary/50 transition-colors group`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${categoryBanners[activeCategory]!.iconBg} border border-primary/30 flex items-center justify-center shrink-0`}>
                    {(() => {
                      const Icon = categoryBanners[activeCategory]!.icon;
                      return <Icon className="w-5 h-5 text-primary" />;
                    })()}
                  </div>
                  <div>
                    <p className="text-sm font-heading font-semibold text-foreground">
                      {categoryBanners[activeCategory]!.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {categoryBanners[activeCategory]!.desc}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-primary font-semibold inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                  {categoryBanners[activeCategory]!.cta} <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>


        {/* Service Cards */}
        <LayoutGroup>
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {filtered.map((svc) => (
                <motion.div
                  key={svc.title}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
                  className="h-full"
                >
                  <motion.div
                    whileHover={{ y: -6, boxShadow: "0 0 40px -10px hsl(240 100% 60% / 0.25)" }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    className="h-full hover-lift-safe"
                  >
                    <Link
                      to={svc.to}
                      className="flex flex-col h-full p-5 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm group hover:border-primary/30 transition-all duration-300 relative overflow-hidden"
                    >
                      <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-primary/0 group-hover:bg-primary/10 transition-all duration-500 blur-2xl" />

                      <div className="flex items-start justify-between mb-3 relative z-10">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 group-hover:shadow-[0_0_15px_-3px_hsl(var(--primary)/0.4)] transition-all duration-300">
                          <svc.icon className="w-5 h-5 text-primary" />
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${svc.tagColor}`}>
                          {svc.tag}
                        </span>
                      </div>

                      <h4 className="font-heading font-semibold text-sm text-foreground group-hover:text-primary transition-colors mb-1.5 relative z-10">
                        {svc.title}
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-3 relative z-10">
                        {svc.desc}
                      </p>

                      <div className="mt-auto pt-3 border-t border-border/30 relative z-10">
                        <span className="text-xs text-primary font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                          Explore Service <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </LayoutGroup>
      </div>
    </section>
  );
};

export default OnDemandServices;

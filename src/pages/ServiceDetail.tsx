import { useParams, Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { usePageSEO } from "@/hooks/use-page-seo";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { getServiceBySlug, getServicesByCategory } from "@/data/services";
import { extraFaqsBySlug } from "@/data/extra-faqs";
import { useEligibleCountriesCount } from "@/hooks/use-eligible-countries-count";
import { motion, useInView } from "framer-motion";
import { useRef, useMemo } from "react";
import {
  ArrowRight, CheckCircle2, Star, Quote, Shield, Clock,
  Award, Users, Globe, Phone, MessageSquare,
  ChevronRight, Target, Sparkles, HeartHandshake,
  BadgeCheck, Rocket, Timer, Layers, Zap, X,
  Trophy, Users2, Globe2, ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import ServicePricingSection from "@/components/services/ServicePricingSection";
import SmoothAnchorLink from "@/components/shared/SmoothAnchorLink";
import USAStatesComparison from "@/components/services/USAStatesComparison";
import UKFormationInfo from "@/components/services/UKFormationInfo";
import UKFormationUpgrade from "@/components/services/UKFormationUpgrade";
import USCompanyNameChecker from "@/components/services/USCompanyNameChecker";
import USFormationHero from "@/components/services/USFormationHero";
import ModernFaq from "@/components/shared/ModernFaq";
import InteractiveHeroVisual from "@/components/shared/InteractiveHeroVisual";

/* ── Helper data that applies universally ── */
const buildStats = (countries: number) => [
  { icon: Trophy, value: "800+", label: "Projects shipped" },
  { icon: Users2, value: "250+", label: "Happy clients" },
  { icon: Globe2, value: countries > 0 ? `${countries}+` : "25+", label: "Countries served" },
  { icon: ShieldCheck, value: "Since 2020", label: "In business" },
];

const trustLogos = [
  "Google", "Meta", "Shopify", "WordPress", "Stripe", "PayPal", "Cloudflare", "Envato",
];

const guarantees = [
  { icon: Shield, title: "100% Satisfaction", desc: "We work until you're completely happy with the results." },
  { icon: Clock, title: "On-Time Delivery", desc: "We commit to deadlines and deliver on schedule, every time." },
  { icon: HeartHandshake, title: "Transparent Pricing", desc: "No hidden fees. You know exactly what you're paying for." },
  { icon: BadgeCheck, title: "Quality Assurance", desc: "Rigorous testing and QA processes ensure flawless delivery." },
];

const testimonials = [
  { name: "Sarah Chen", role: "CEO, TechFlow", text: "Dynime transformed our entire digital presence. Revenue increased 340% within 6 months.", rating: 5 },
  { name: "Marcus Johnson", role: "Founder, GreenLeaf", text: "Enterprise-grade solution handling 10K+ daily orders without issues.", rating: 5 },
  { name: "Elena Rodriguez", role: "CMO, StyleVault", text: "Their strategy doubled our organic traffic. The ROI speaks for itself.", rating: 5 },
];

/* whyNotDIY, problems, techStack, timeline are now per-service in services.ts */

const industries = [
  "E-Commerce & Retail", "SaaS & Technology", "Healthcare & Wellness",
  "Finance & Fintech", "Education & E-Learning", "Real Estate",
  "Travel & Hospitality", "Food & Restaurant", "Legal & Consulting",
  "Non-Profit & NGO", "Fashion & Beauty", "Automotive",
];

/* ── Animated counter ── */
const AnimatedStat = ({ value, label, icon: Icon }: { value: string; label: string; icon: any }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <motion.div
      ref={ref}
      className="text-center"
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6 }}
    >
      <Icon className="w-6 h-6 text-primary mx-auto mb-2" />
      <p className="font-heading text-3xl font-bold gradient-text">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </motion.div>
  );
};

const serviceIllustrationMap: Record<string, string> = {
  "wordpress-design": "/wordpress-design-illustration.png",
  "wordpress-woocommerce": "/wordpress-design-illustration.png",
  "shopify": "/shopify-illustration.png",
  "shopify-ecommerce": "/shopify-illustration.png",
  "seo": "/seo-illustration.png",
  "google-ads": "/marketing-ads-illustration.png",
  "facebook-ads": "/marketing-ads-illustration.png",
  "social-media": "/marketing-ads-illustration.png",
  "content-marketing": "/marketing-ads-illustration.png",
  "email-marketing": "/marketing-ads-illustration.png",
  "us-company": "/company-formation-illustration.png",
  "uk-company": "/company-formation-illustration.png",
  "itin-services": "/company-formation-illustration.png",
  "virtual-address": "/company-formation-illustration.png",
  "ai-software-development": "/ai-software-illustration.png",
  "custom-software-development": "/ai-software-illustration.png",
  "software-built-with-ai": "/ai-software-illustration.png",
};

const ServiceDetailPage = () => {
  const { slug } = useParams();
  const service = getServiceBySlug(slug || "");
  const { data: eligibleCount = 0 } = useEligibleCountriesCount();
  const stats = buildStats(eligibleCount);

  // Compute total delivery estimate dynamically from each service's timeline phases.
  // Wrapped in useMemo with full guards so render never throws a ReferenceError if
  // a service is missing or a phase has malformed/missing time copy.
  const { totalEstimate, expressEstimate } = useMemo(() => {
    const fallback = { totalEstimate: "2–4 weeks", expressEstimate: "1–2 weeks" };
    try {
      const phases = service?.timeline ?? [];
      let minW = 0;
      let maxW = 0;
      phases.forEach((p) => {
        const time = typeof p?.time === "string" ? p.time : "";
        const m = time.match(/(\d+)(?:\s*-\s*(\d+))?\s*(day|week|month)s?/i);
        if (!m) return;
        const a = parseInt(m[1], 10);
        const b = m[2] ? parseInt(m[2], 10) : a;
        const unit = m[3].toLowerCase();
        const toWeeks = (n: number) => unit === "day" ? n / 7 : unit === "month" ? n * 4 : n;
        minW += toWeeks(a);
        maxW += toWeeks(b);
      });
      if (!minW || !maxW) return fallback;
      const total =
        Math.round(minW) === Math.round(maxW)
          ? `${Math.round(minW)} weeks`
          : `${Math.max(1, Math.round(minW))}–${Math.round(maxW)} weeks`;
      const express =
        `${Math.max(1, Math.round(minW / 2))}–${Math.max(1, Math.round(maxW / 2))} weeks`;
      return { totalEstimate: total, expressEstimate: express };
    } catch {
      return fallback;
    }
  }, [service?.slug, service?.timeline]);

  usePageSEO(service ? `service:${service.slug}` : "service:unknown", {
    title: service?.metaTitle || service?.title || "Service",
    description:
      service?.metaDescription ||
      service?.description ||
      "Premium digital service by Dynime Inc. — explore features, process, and pricing.",
    keywords: service
      ? [
          service.title,
          service.categoryLabel,
          `${service.title} agency`,
          `${service.title} services`,
          `hire ${service.title}`,
          "Dynime Inc.",
          "digital agency",
        ]
      : undefined,
    ogType: "article",
    jsonLd: service
      ? [
          {
            "@context": "https://schema.org",
            "@type": "Service",
            name: service.title,
            serviceType: service.categoryLabel,
            description: service.metaDescription || service.description,
            url: `https://dynime.com/${service.slug}`,
            provider: {
              "@type": "Organization",
              name: "Dynime Inc.",
              url: "https://dynime.com",
              logo: "https://dynime.com/favicon.png",
            },
            areaServed: "Worldwide",
            audience: { "@type": "BusinessAudience", audienceType: "Founders, SMBs and Enterprises" },
            offers: {
              "@type": "Offer",
              availability: "https://schema.org/InStock",
              priceCurrency: "USD",
              url: "https://dynime.com/contact",
            },
          },
        ]
      : undefined,
  });

  if (!service) {
    return (
      <Layout>
        <section className="section-padding">
          <div className="container-custom text-center">
            <h1 className="font-heading text-4xl font-bold mb-4">Service Not Found</h1>
            <p className="text-muted-foreground mb-8">The service you're looking for doesn't exist.</p>
            <Button variant="hero" asChild>
              <Link to="/services">View All Services</Link>
            </Button>
          </div>
        </section>
      </Layout>
    );
  }

  const relatedServices = getServicesByCategory(service.category).filter((s) => s.slug !== service.slug).slice(0, 4);
  

  const isUKCompany = service.slug === "uk-company";
  const isUSCompany = service.slug === "us-company";

  return (
    <Layout>
      {/* ══════ UK FORMATION HERO (replaces default for uk-company) ══════ */}
      {isUKCompany && <UKFormationUpgrade />}

      {/* ══════ US FORMATION HERO (replaces default for us-company) ══════ */}
      {isUSCompany && <USFormationHero />}

      {/* ══════ 1. HERO (hidden for uk-company / us-company — replaced above) ══════ */}
      {!isUKCompany && !isUSCompany && (
      <section className="section-padding relative overflow-hidden">

        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-accent/5 blur-3xl" />
        </div>
        <div className="container-custom relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-7">
              <ScrollReveal>
                <div>
                  {(() => {
                    const [catShort, ...catRest] = service.categoryLabel.split(" — ");
                    const catFull = catRest.join(" — ");
                    return (
                      <nav
                        aria-label="Breadcrumb"
                        className="flex items-center gap-1.5 mb-4 text-xs text-muted-foreground min-w-0"
                      >
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary uppercase tracking-wider shrink-0">
                          {catShort}
                        </span>
                        {catFull && (
                          <span className="hidden sm:inline truncate text-muted-foreground/80">
                            {catFull}
                          </span>
                        )}
                        <ChevronRight className="w-3 h-3 text-muted-foreground/60 shrink-0" aria-hidden="true" />
                        <span className="truncate text-foreground/80 font-medium">{service.title}</span>
                      </nav>
                    );
                  })()}
                  <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                    {service.headline}
                  </h1>
                  <p className="text-lg text-muted-foreground mb-8 leading-relaxed max-w-2xl">
                    {service.description}
                  </p>
                  <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4">
                    <Button variant="hero" size="lg" asChild className="w-full sm:w-auto h-auto py-5 sm:py-0 sm:h-11 leading-none rounded-md text-base">
                      <Link to="/contact">
                        Get a Free Quote <ArrowRight className="w-4 h-4 ml-1" />
                      </Link>
                    </Button>
                    <div className="grid grid-cols-2 gap-3 sm:contents w-full">
                      <Button variant="default" size="lg" asChild className="w-full sm:w-auto h-auto py-5 sm:py-0 sm:h-11 leading-none rounded-md text-base">
                        <SmoothAnchorLink
                          href="#pricing"
                          aria-label="Jump to pricing plans for this service"
                        >
                          Pricing <Sparkles className="w-4 h-4 ml-1" aria-hidden="true" />
                        </SmoothAnchorLink>
                      </Button>
                      <Button variant="glass" size="lg" asChild className="w-full sm:w-auto h-auto py-5 sm:py-0 sm:h-11 leading-none rounded-md text-base">
                        <Link to="/portfolio">Our Work</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </div>
            
            <div className="lg:col-span-5 w-full flex items-center justify-center">
              <ScrollReveal className="w-full flex justify-center">
                <InteractiveHeroVisual slug={service.slug} />
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>
      )}




      {/* ══════ DCS LEGAL & REGULATORY DISCLAIMER (compact) ══════ */}
      {service.category === "dcs" && (
        <section className="py-4">
          <div className="container-custom">
            <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 flex items-center gap-3">
              <Shield className="w-4 h-4 text-primary shrink-0" />
              <p className="text-xs md:text-sm text-muted-foreground leading-snug">
                <strong className="text-foreground">Advisory & setup only.</strong> We help you register
                companies, accounts and gateways <em>in your own name</em> with official providers — we don't
                sell ready-made entities, EINs, ITINs or accounts. Not a law firm or CPA.
              </p>
            </div>
          </div>
        </section>
      )}


      {/* ══════ 2. TRUST BADGES BAR ══════ */}
      <section className="py-6 border-y border-border/30 overflow-hidden">
        <div className="container-custom">
          <div className="flex items-center justify-center gap-8 flex-wrap">
            {[
              { icon: Zap, label: "Fast Delivery" },
              { icon: Shield, label: "100% Secure" },
              { icon: Award, label: "Award-Winning" },
              { icon: MessageSquare, label: "24/7 Support" },
              { icon: Rocket, label: "Free Revisions" },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-2 text-sm text-muted-foreground font-medium whitespace-nowrap">
                <Icon className="w-4 h-4 text-primary" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ 3. STATS SECTION ══════ */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s) => (
              <AnimatedStat key={s.label} {...s} />
            ))}
          </div>
        </div>
      </section>

      {/* ══════ 4. WHAT'S INCLUDED ══════ */}
      <section className="section-padding section-tint-a">
        <div className="container-custom">
          <ScrollReveal>
            <div className="text-center mb-12">
              <span className="text-primary text-sm font-semibold uppercase tracking-wider">What's Included</span>
              <h2 className="font-heading text-3xl md:text-4xl font-bold mt-3">
                Everything You Get With Our {service.title}
              </h2>
              <p className="text-muted-foreground/60 mt-3 max-w-xl mx-auto text-sm hover:text-muted-foreground transition-colors duration-300 cursor-default">
                Comprehensive deliverables designed to maximize your investment and drive real business growth.
              </p>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {service.features.map((f, i) => (
              <ScrollReveal key={f} delay={i * 0.05}>
                <div className="glass-card p-4 text-center h-full">
                  <CheckCircle2 className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">{f}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ 5. BENEFITS GRID ══════ */}
      <section className="section-padding">
        <div className="container-custom">
          <ScrollReveal>
            <div className="text-center mb-12">
              <span className="text-primary text-sm font-semibold uppercase tracking-wider">Why Choose Us</span>
              <h2 className="font-heading text-3xl md:text-4xl font-bold mt-3">
                Benefits of Our {service.title}
              </h2>
              <p className="text-muted-foreground/60 mt-3 max-w-xl mx-auto text-sm hover:text-muted-foreground transition-colors duration-300 cursor-default">
                Every solution is engineered to deliver measurable results for your business.
              </p>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column - Illustration */}
            <ScrollReveal className="lg:col-span-4 flex justify-center">
              <div className="relative w-full max-w-[320px] lg:max-w-none aspect-[4/3] flex items-center justify-center bg-card/60 rounded-2xl border border-border p-6 shadow-md overflow-hidden hover:scale-[1.02] hover:shadow-lg transition-all duration-300">
                <img
                  src={service ? (serviceIllustrationMap[service.slug] || `/${service.category}-illustration.png`) : ""}
                  alt={service?.metaTitle || service?.title || "Dynime illustration"}
                  className="w-full h-full object-contain filter drop-shadow-sm brightness-100 dark:brightness-95 select-none"
                  loading="lazy"
                />
              </div>
            </ScrollReveal>

            {/* Right Column - Benefits Grid */}
            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {service.benefits.map((b, i) => (
                <ScrollReveal key={b.title} delay={i * 0.08}>
                  <div className="glass-card-hover p-6 h-full group">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-heading font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">{b.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════ 6. SPLIT — PROBLEM / SOLUTION ══════ */}
      <section className="section-padding section-tint-a">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <ScrollReveal>
              <div>
                <span className="text-destructive text-sm font-semibold uppercase tracking-wider">The Problem</span>
                <h2 className="font-heading text-2xl md:text-3xl font-bold mt-3 mb-4 text-foreground">
                  What Happens Without Professional {service.title}?
                </h2>
                <ul className="space-y-3">
                  {service.problems.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.15}>
              <div>
                <span className="text-primary text-sm font-semibold uppercase tracking-wider">Our Solution</span>
                <h2 className="font-heading text-2xl md:text-3xl font-bold mt-3 mb-4 text-foreground">
                  How Dynime's {service.title} Solves It
                </h2>
                <ul className="space-y-3">
                  {service.benefits.slice(0, 4).map((b) => (
                    <li key={b.title} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-semibold text-foreground">{b.title}:</span> {b.desc}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ══════ 7. PROCESS STEPS ══════ */}
      <section className="section-padding">
        <div className="container-custom">
          <ScrollReveal>
            <div className="text-center mb-12">
              <span className="text-primary text-sm font-semibold uppercase tracking-wider">Our Process</span>
              <h2 className="font-heading text-3xl md:text-4xl font-bold mt-3">
                How We Deliver Results
              </h2>
              <p className="text-muted-foreground/60 mt-3 max-w-xl mx-auto text-sm hover:text-muted-foreground transition-colors duration-300 cursor-default">
                A proven, transparent process that keeps you informed every step of the way.
              </p>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {service.process.map((p, i) => (
              <ScrollReveal key={p.step} delay={i * 0.12}>
                <motion.div
                  className="relative group h-full"
                  whileHover={{ y: -6, transition: { type: "spring", stiffness: 300, damping: 20 } }}
                >
                  {/* Large watermark number */}
                  <motion.div
                    className="absolute -top-2 -right-1 font-heading text-[7rem] font-black leading-none text-primary/[0.04] select-none pointer-events-none z-0"
                    whileHover={{ scale: 1.1, opacity: 0.12 }}
                    transition={{ duration: 0.5 }}
                  >
                    {p.step}
                  </motion.div>

                  <div className="relative z-10 h-full rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden transition-all duration-500 group-hover:border-primary/30 group-hover:shadow-[0_8px_40px_-12px_hsl(var(--primary)/0.2)]">
                    {/* Left accent strip */}
                    <div className="absolute top-0 left-0 w-1 h-0 bg-primary rounded-full group-hover:h-full transition-all duration-700 ease-out" />

                    <div className="p-6">
                      {/* Inline step indicator */}
                      <div className="flex items-center gap-2.5 mb-4">
                        <motion.div
                          className="w-8 h-8 rounded-full border-2 border-primary/30 flex items-center justify-center group-hover:border-primary group-hover:bg-primary transition-all duration-400"
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.6 }}
                        >
                          <span className="font-heading text-xs font-bold text-primary group-hover:text-primary-foreground transition-colors duration-400">{p.step}</span>
                        </motion.div>
                        <div className="h-px flex-1 bg-gradient-to-r from-border/60 to-transparent group-hover:from-primary/30 transition-colors duration-500" />
                      </div>

                      <h3 className="font-heading font-bold text-foreground text-base mb-2 group-hover:text-primary transition-colors duration-300">{p.title}</h3>
                      <p className="text-sm text-muted-foreground/70 leading-relaxed">{p.desc}</p>

                      {/* Bottom arrow indicator */}
                      <div className="mt-4 flex items-center gap-1.5 text-primary/0 group-hover:text-primary transition-all duration-500 translate-x-[-8px] group-hover:translate-x-0">
                        <div className="w-5 h-px bg-current" />
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ 8. WHY NOT DIY ══════ */}
      <section className="section-padding section-tint-a">
        <div className="container-custom">
          <ScrollReveal>
            <div className="text-center mb-12">
              <span className="text-primary text-sm font-semibold uppercase tracking-wider">Expert vs DIY</span>
              <h2 className="font-heading text-3xl md:text-4xl font-bold mt-3">
                Why Hire Professionals?
              </h2>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {service.whyNotDIY.map((item, i) => (
              <ScrollReveal key={item.title} delay={i * 0.08}>
                <motion.div
                  className="relative group h-full overflow-hidden rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm transition-all duration-500 hover:border-primary/30 hover:shadow-[0_8px_40px_-12px_hsl(var(--primary)/0.2)]"
                  whileHover={{ y: -6, transition: { type: "spring", stiffness: 300, damping: 20 } }}
                >
                  <div className="absolute top-0 left-0 w-1 h-0 bg-primary rounded-full group-hover:h-full transition-all duration-700 ease-out" />
                  <div className="absolute -top-2 -right-1 font-heading text-[7rem] font-black leading-none text-primary/[0.04] group-hover:text-primary/[0.1] transition-colors duration-700 select-none pointer-events-none">{i + 1}</div>
                  <div className="relative p-6 text-center">
                    <motion.div whileHover={{ rotate: 15, scale: 1.15 }} transition={{ type: "spring", stiffness: 300 }}>
                      <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
                    </motion.div>
                    <h3 className="font-heading font-semibold text-foreground mb-2 group-hover:text-primary transition-colors duration-300">{item.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ 9. GUARANTEES ══════ */}
      <section className="section-padding">
        <div className="container-custom">
          <ScrollReveal>
            <div className="text-center mb-12">
              <span className="text-primary text-sm font-semibold uppercase tracking-wider">Our Promise</span>
              <h2 className="font-heading text-3xl md:text-4xl font-bold mt-3">
                Guarantees You Can Count On
              </h2>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto">
            {guarantees.map((g, i) => (
              <ScrollReveal key={g.title} delay={i * 0.1}>
                <motion.div
                  className="relative group h-full"
                  whileHover={{ y: -5, transition: { type: "spring", stiffness: 300, damping: 20 } }}
                >
                  <div className="relative h-full rounded-2xl bg-gradient-to-br from-card/80 to-card/40 border border-border/30 overflow-hidden transition-all duration-500 group-hover:border-primary/40 group-hover:shadow-[0_12px_40px_-8px_hsl(var(--primary)/0.2)]">
                    {/* Top gradient accent */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    {/* Background glow */}
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-primary/[0.03] blur-3xl group-hover:bg-primary/[0.08] transition-all duration-700 pointer-events-none" />

                    <div className="relative p-7 flex items-start gap-5">
                      {/* Icon container */}
                      <motion.div
                        className="flex-shrink-0 w-14 h-14 rounded-2xl bg-primary/[0.08] border border-primary/15 flex items-center justify-center group-hover:bg-primary group-hover:border-primary group-hover:shadow-[0_0_30px_-6px_hsl(var(--primary)/0.5)] transition-all duration-500"
                        whileHover={{ rotate: 8, scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <g.icon className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors duration-500" />
                      </motion.div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-heading font-bold text-foreground text-base mb-1.5 group-hover:text-primary transition-colors duration-300">{g.title}</h3>
                        <p className="text-sm text-muted-foreground/70 leading-relaxed group-hover:text-muted-foreground transition-colors duration-300">{g.desc}</p>
                      </div>

                      {/* Step indicator */}
                      <span className="flex-shrink-0 font-heading text-3xl font-black text-primary/[0.06] group-hover:text-primary/[0.15] transition-colors duration-700 select-none">
                        0{i + 1}
                      </span>
                    </div>
                  </div>
                </motion.div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ 10. COMPARISON TABLE ══════ */}
      <section className="section-padding">
        <div className="container-custom">
          <ScrollReveal>
            <div className="text-center mb-12">
              <span className="text-primary text-sm font-semibold uppercase tracking-wider">Comparison</span>
              <h2 className="font-heading text-3xl md:text-4xl font-bold mt-3">
                Dynime vs. The Competition
              </h2>
            </div>
          </ScrollReveal>
          <div className="max-w-3xl mx-auto overflow-hidden rounded-xl border border-border/50">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-card">
                    <th className="text-left p-4 font-heading font-semibold text-foreground">Feature</th>
                    <th className="text-center p-4 font-heading font-semibold text-primary">Dynime</th>
                    <th className="text-center p-4 font-heading font-semibold text-muted-foreground">Others</th>
                  </tr>
                </thead>
                <tbody>
                  {service.comparison.map(([feature, us, them], i) => (
                    <motion.tr
                      key={i}
                      className="border-t border-border/30"
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ delay: i * 0.05, duration: 0.35, ease: "easeOut" }}
                    >
                      <td className="p-4 text-muted-foreground">{feature as string}</td>
                      <td className="p-4 text-center">
                        {us ? <CheckCircle2 className="w-5 h-5 text-primary mx-auto" /> : <X className="w-5 h-5 text-muted-foreground/40 mx-auto" />}
                      </td>
                      <td className="p-4 text-center">
                        {them ? <CheckCircle2 className="w-5 h-5 text-muted-foreground/60 mx-auto" /> : <X className="w-5 h-5 text-muted-foreground/40 mx-auto" />}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
        </div>
      </section>

      {/* ══════ 11. TECH STACK ══════ */}
      <section className="section-padding">
        <div className="container-custom">
          <ScrollReveal>
            <div className="text-center mb-10">
              <span className="text-primary text-sm font-semibold uppercase tracking-wider">Technology</span>
              <h2 className="font-heading text-3xl md:text-4xl font-bold mt-3">
                Tools & Technologies We Use
              </h2>
            </div>
          </ScrollReveal>
           <div className="flex flex-wrap justify-center gap-4 md:gap-5">
            {service.techStack.map((t, i) => (
              <ScrollReveal key={t} delay={i * 0.03}>
                <span className="px-5 py-2.5 rounded-full border border-border/50 bg-card/60 text-sm font-medium text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors">
                  {t}
                </span>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ 12. INDUSTRIES ══════ */}
      <section className="section-padding section-tint-a">
        <div className="container-custom">
          <ScrollReveal>
            <div className="text-center mb-10">
              <span className="text-primary text-sm font-semibold uppercase tracking-wider">Industries</span>
              <h2 className="font-heading text-3xl md:text-4xl font-bold mt-3">
                Industries We Serve
              </h2>
              <p className="text-muted-foreground/60 mt-3 max-w-xl mx-auto text-sm hover:text-muted-foreground transition-colors duration-300 cursor-default">
                Our {service.title.toLowerCase()} solutions are tailored for diverse industries.
              </p>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-5">
            {industries.map((ind, i) => (
              <ScrollReveal key={ind} delay={i * 0.04}>
                <div className="glass-card p-4 text-center h-full">
                  <p className="text-xs font-medium text-foreground">{ind}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ 13. TESTIMONIALS ══════ */}
      <section className="section-padding">
        <div className="container-custom">
          <ScrollReveal>
            <div className="text-center mb-12">
              <span className="text-primary text-sm font-semibold uppercase tracking-wider">Client Reviews</span>
              <h2 className="font-heading text-3xl md:text-4xl font-bold mt-3">
                What Our Clients Say
              </h2>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <ScrollReveal key={t.name} delay={i * 0.1}>
                <div className="glass-card-hover p-6 h-full">
                  <Quote className="w-8 h-8 text-primary/20 mb-3" />
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: t.rating }).map((_, si) => (
                      <Star key={si} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed mb-4">"{t.text}"</p>
                  <div className="pt-3 border-t border-border/30">
                    <p className="font-heading font-semibold text-sm text-foreground">{t.name}</p>
                    <p className="text-[11px] text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ 14. TRUSTED BY ══════ */}
      <section className="py-10 border-y border-border/40 bg-gradient-to-r from-primary/[0.02] via-accent/[0.04] to-primary/[0.02]">
        <div className="container-custom">
          <p className="text-center text-xs font-semibold text-primary/70 uppercase tracking-[0.2em] mb-6">Trusted by brands working with</p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
            {trustLogos.map((name) => (
              <span key={name} className="text-sm font-heading font-semibold text-foreground/70 hover:text-primary transition-colors">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ 15. HOW LONG / TIMELINE ══════ */}
      <section className="section-padding relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-card/20 to-background" />
        <div className="container-custom">
          {/* Header */}
          <ScrollReveal>
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
                <Timer className="w-3.5 h-3.5" /> Timeline
              </span>
              <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold mt-4 mb-3">
                From kickoff to <span className="gradient-text">launch</span>
              </h2>
              <p className="text-muted-foreground text-sm md:text-base">
                A typical {service.title.toLowerCase()} engagement — {totalEstimate} end-to-end. Pick the pace that matches your deadline.
              </p>
            </div>
          </ScrollReveal>

          {/* Horizontal stepper */}
          <ScrollReveal delay={0.1}>
            <div className="relative mb-12">
              {/* Connecting line */}
              <div className="hidden md:block absolute top-7 left-[8%] right-[8%] h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-4 relative">
                {service.timeline.map((p, i) => {
                  const icons = [Target, Layers, MessageSquare, Rocket];
                  const Icon = icons[i % icons.length];
                  return (
                    <div key={p.phase} className="flex flex-col items-center text-center group">
                      <div className="relative mb-4">
                        <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative w-14 h-14 rounded-2xl bg-card border border-primary/30 flex items-center justify-center shadow-sm group-hover:border-primary group-hover:scale-105 transition-all">
                          <Icon className="w-6 h-6 text-primary" />
                          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow">
                            {i + 1}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm font-heading font-semibold text-foreground">{p.phase}</p>
                      <span className="mt-1.5 inline-flex items-center text-[11px] font-mono font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        {p.time}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollReveal>

          {/* Delivery options — compact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto items-stretch">
            {/* Standard */}
            <ScrollReveal delay={0.15} className="h-full">
              <motion.div
                whileHover={{ y: -2 }}
                transition={{ type: "spring", stiffness: 280, damping: 22 }}
                className="relative h-full rounded-xl border border-border bg-card flex flex-col p-4"
              >
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      Standard
                    </span>
                  </div>
                  <Timer className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <h3 className="font-heading text-2xl font-black leading-none tracking-tight text-foreground">
                    {totalEstimate}
                  </h3>
                  <span className="text-xs text-muted-foreground">included</span>
                </div>
                <p className="text-muted-foreground text-xs mb-3">
                  Standard delivery for {service.title.toLowerCase()} — no extra cost.
                </p>
                <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs flex-1">
                  {["Standard queue", "Shared team", "Weekly updates", "Quoted price"].map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-foreground/80">
                      <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button variant="outline" size="sm" asChild className="w-full mt-4">
                  <Link to={`/contact?service=${encodeURIComponent(service.title)}&delivery=standard`}>
                    Start standard <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </Button>
              </motion.div>
            </ScrollReveal>

            {/* Express */}
            <ScrollReveal delay={0.25} className="h-full">
              <motion.div
                whileHover={{ y: -2 }}
                transition={{ type: "spring", stiffness: 280, damping: 22 }}
                className="relative h-full rounded-xl overflow-hidden border-2 border-primary/40 bg-gradient-to-br from-primary/[0.08] via-card to-background shadow-[0_16px_40px_-22px_hsl(var(--primary)/0.45)] flex flex-col p-4"
              >
                <div className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full bg-primary/20 blur-3xl" />

                <div className="relative flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                      Express
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5">
                      <Zap className="w-2.5 h-2.5" /> Popular
                    </span>
                  </div>
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <div className="relative flex items-baseline gap-2 mb-2">
                  <h3 className="font-heading text-2xl font-black leading-none tracking-tight gradient-text">
                    {expressEstimate}
                  </h3>
                  <span className="text-xs font-bold text-foreground/70">· 2× faster</span>
                </div>
                <p className="relative text-muted-foreground text-xs mb-3">
                  Half the timeline. <span className="text-foreground/90 font-semibold">Additional fee</span> based on scope.
                </p>
                <ul className="relative grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs flex-1">
                  {["Priority queue", "Dedicated team", "Daily updates", "Same-day start"].map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-foreground/90">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button variant="hero" size="sm" asChild className="relative w-full mt-4">
                  <Link to={`/contact?service=${encodeURIComponent(service.title)}&delivery=express&message=${encodeURIComponent(`I'd like Express Delivery for ${service.title}. Please share express pricing and the earliest start date.`)}`}>
                    Request Express <Zap className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </Button>
              </motion.div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ══════ 16. PRICING (dynamic, admin-managed) ══════ */}
      <ServicePricingSection
        serviceSlug={service.slug}
        serviceTitle={service.title}
        serviceFeatures={service.features}
      />

      {/* ══════ 16b. USA STATES COMPARISON (us-company only) ══════ */}
      {service.slug === "us-company" && <USAStatesComparison />}

      {/* ══════ 16c. UK FORMATION INFO (uk-company only) ══════ */}
      {service.slug === "uk-company" && <UKFormationInfo />}


      {/* ══════ 17. FAQ ══════ */}
      <section className="section-padding section-tint-b relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[680px] h-[680px] rounded-full bg-primary/5 blur-3xl" />
        </div>
        <div className="container-custom relative">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-12">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" /> FAQ
                </span>
                <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold mt-4">
                  Questions, answered.
                </h2>
                <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
                  Everything customers usually ask about {service.title.toLowerCase()} — in one place.
                </p>
              </div>
              <ModernFaq items={[...service.faqs, ...(extraFaqsBySlug[service.slug] ?? [])]} />
              <div className="mt-10 text-center">
                <p className="text-sm text-muted-foreground mb-4">Still have questions?</p>
                <Button variant="hero" asChild>
                  <Link to="/contact">
                    Talk to an expert <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ══════ 18. HOW TO GET STARTED ══════ */}
      <section className="section-padding section-tint-a">
        <div className="container-custom">
          <ScrollReveal>
            <div className="text-center mb-12">
              <span className="text-primary text-sm font-semibold uppercase tracking-wider">Get Started</span>
              <h2 className="font-heading text-3xl md:text-4xl font-bold mt-3">
                Ready to Begin? It's Simple.
              </h2>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            {[
              { step: "1", title: "Contact Us", desc: "Fill out a quick form or send a message. We respond within 2 hours.", icon: Phone },
              { step: "2", title: "Free Consultation", desc: "We discuss your goals, timeline, and provide a detailed proposal.", icon: MessageSquare },
              { step: "3", title: "We Get to Work", desc: "Once approved, our team starts delivering results immediately.", icon: Rocket },
            ].map((s, i) => (
              <ScrollReveal key={s.step} delay={i * 0.1}>
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center mx-auto mb-4 shadow-[0_0_25px_-5px_hsl(var(--primary)/0.5)]">
                    <s.icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <h3 className="font-heading font-semibold text-foreground mb-2">{s.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ 19. RELATED SERVICES ══════ */}
      {relatedServices.length > 0 && (
        <section className="section-padding">
          <div className="container-custom">
            <ScrollReveal>
              <div className="text-center mb-10">
                <span className="text-primary text-sm font-semibold uppercase tracking-wider">Related Services</span>
                <h2 className="font-heading text-2xl md:text-3xl font-bold mt-3">
                  You Might Also Need
                </h2>
              </div>
            </ScrollReveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {relatedServices.map((rs, i) => (
                <ScrollReveal key={rs.slug} delay={i * 0.08}>
                  <Link to={`/${rs.slug}`} className="glass-card-hover p-5 block group h-full">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                      <rs.icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-heading font-semibold text-sm text-foreground group-hover:text-primary transition-colors mb-1">{rs.title}</h3>
                    <p className="text-xs text-muted-foreground">{rs.description}</p>
                    <span className="text-xs text-primary font-medium mt-3 inline-flex items-center gap-1">
                      Learn More <ArrowRight className="w-3 h-3" />
                    </span>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════ 20. FINAL CTA ══════ */}
    </Layout>
  );
};

export default ServiceDetailPage;

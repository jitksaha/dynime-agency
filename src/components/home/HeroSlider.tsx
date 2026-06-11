import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade, Pagination, Navigation, Keyboard } from "swiper/modules";
import { motion } from "framer-motion";
import {
  Rocket, ArrowRight, Briefcase, Code2, Megaphone, Users, Cpu, Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import InteractiveHeroVisual from "@/components/shared/InteractiveHeroVisual";

import "swiper/css";
import "swiper/css/effect-fade";
import "swiper/css/pagination";
import "swiper/css/navigation";

interface Slide {
  eyebrow: string;
  title: string;
  highlight: string;
  description: string;
  primary: { label: string; to: string };
  secondary?: { label: string; to: string };
  icon: LucideIcon;
  accent: string; // tailwind gradient classes from primary token
  isHero?: boolean; // first slide carries h1 for SEO
  categoryKey: string; // added categoryKey for interactive visual
}

const slides: Slide[] = [
  {
    eyebrow: "Featured · Dynime OS",
    title: "Dynime OS — the AI-powered",
    highlight: "business operating system",
    description:
      "Dynime OS unifies CRM, HRM, Sales, Finance, Projects, Inventory, AI and Support into one intelligent platform — built for growing companies that want to scale without the chaos.",
    primary: { label: "Explore Dynime OS", to: "/products/os" },
    secondary: { label: "Talk to sales", to: "/contact" },
    icon: Briefcase,
    accent: "from-primary via-primary/70 to-fuchsia-500",
    isHero: true,
    categoryKey: "os",
  },
  {
    eyebrow: "DWS — Dynime Web Services",
    title: "Websites that convert and",
    highlight: "rank from day one",
    description:
      "WordPress, Shopify, custom builds, landing pages and SEO architecture — engineered for speed, conversions and growth.",
    primary: { label: "Browse web services", to: "/services?cat=dws" },
    secondary: { label: "See portfolio", to: "/portfolio" },
    icon: Code2,
    accent: "from-sky-500 via-primary to-indigo-500",
    categoryKey: "dws",
  },
  {
    eyebrow: "DMS — Dynime Marketing Services",
    title: "Performance marketing that",
    highlight: "actually drives revenue",
    description:
      "SEO, paid ads, content, social and email — measured, optimised and reported with full transparency every month.",
    primary: { label: "View marketing services", to: "/services?cat=dms" },
    secondary: { label: "Book strategy call", to: "/contact" },
    icon: Megaphone,
    accent: "from-amber-500 via-rose-500 to-primary",
    categoryKey: "dms",
  },
  {
    eyebrow: "DSS — Dynime Software Development",
    title: "Custom software, web apps and",
    highlight: "AI products built right",
    description:
      "From MVPs to enterprise platforms — modern stacks, clean architecture, and ship-ready code with long-term maintainability.",
    primary: { label: "Software services", to: "/services?cat=dss" },
    secondary: { label: "Start a project", to: "/contact" },
    icon: Cpu,
    accent: "from-emerald-500 via-teal-500 to-primary",
    categoryKey: "dss",
  },
  {
    eyebrow: "DCS — Dynime Consultancy Services",
    title: "Company formation, payments,",
    highlight: "compliance — done for you",
    description:
      "USA / UK / global incorporation, merchant accounts, bank setup and corporate compliance handled end-to-end by experts.",
    primary: { label: "Consultancy services", to: "/services?cat=dcs" },
    secondary: { label: "Investor relations", to: "/investor-relations" },
    icon: Users,
    accent: "from-violet-500 via-primary to-cyan-500",
    categoryKey: "dcs",
  },
];

const renderHighlighted = (title: string, highlight: string, isHero?: boolean) => {
  const Tag: any = isHero ? "h1" : "h2";
  return (
    <Tag
      className="font-heading font-bold tracking-tight text-balance text-foreground"
      style={{
        fontSize: "clamp(1.85rem, 0.9rem + 3.6vw, 3.75rem)",
        lineHeight: 1.08,
        letterSpacing: "-0.025em",
      }}
    >
      {title}{" "}
      <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
        {highlight}
      </span>
    </Tag>
  );
};

const HeroSlider = () => {
  return (
    <section className="relative isolate overflow-hidden bg-background">
      {/* Dotted grid background */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(circle, hsl(var(--foreground) / 0.18) 1px, transparent 1.2px)",
          backgroundSize: "22px 22px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 45%, black, transparent 85%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 50% 45%, black, transparent 85%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[60%] -z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 100%, hsl(var(--primary) / 0.18), transparent 70%)",
        }}
      />

      <Swiper
        modules={[Autoplay, EffectFade, Pagination, Navigation, Keyboard]}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        loop
        keyboard={{ enabled: true }}
        autoplay={{ delay: 5500, disableOnInteraction: false, pauseOnMouseEnter: true }}
        pagination={{ clickable: true }}
        navigation
        speed={700}
        className="hero-swiper"
        a11y={{ enabled: true }}
      >
        {slides.map((s, idx) => {
          const Icon = s.icon;
          return (
            <SwiperSlide key={idx}>
              <div className="container-custom relative py-12 md:py-16 lg:py-20">
                <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
                  <motion.div
                    key={`eb-${idx}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="inline-flex items-center gap-2.5 mb-6 rounded-full border border-border/60 bg-card/70 backdrop-blur-md px-4 py-1.5 shadow-sm mx-auto"
                  >
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br ${s.accent} text-primary-foreground shadow-md`}>
                      <Icon className="h-3 w-3" />
                    </span>
                    <span className="text-xs sm:text-sm font-medium text-foreground/80">
                      {s.eyebrow}
                    </span>
                  </motion.div>

                  <motion.div
                    key={`tt-${idx}`}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.1 }}
                  >
                    {renderHighlighted(s.title, s.highlight, s.isHero)}
                  </motion.div>

                  <motion.p
                    key={`d-${idx}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="mt-6 text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed text-balance mx-auto max-w-2xl"
                  >
                    {s.description}
                  </motion.p>

                  <motion.div
                    key={`c-${idx}`}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.45 }}
                    className="mt-8 flex flex-wrap gap-3 justify-center"
                  >
                    <Button
                      variant="hero"
                      size="lg"
                      asChild
                      className="h-12 px-7 text-sm font-semibold rounded-full shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/45 transition-all duration-300 hover:-translate-y-0.5"
                    >
                      <Link to={s.primary.to}>
                        {s.primary.label}
                        <Rocket className="w-4 h-4 ml-2 -rotate-45" />
                      </Link>
                    </Button>
                    {s.secondary && (
                      <Button
                        variant="outline"
                        size="lg"
                        asChild
                        className="h-12 px-7 text-sm font-semibold rounded-full border-border/70 bg-card/60 backdrop-blur text-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all"
                      >
                        <Link to={s.secondary.to}>
                          {s.secondary.label}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Link>
                      </Button>
                    )}
                  </motion.div>
                </div>
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>

      {/* Quick service chips below the slider — always visible */}
      <div className="container-custom pb-12 md:pb-16">
        <div className="flex flex-wrap justify-center gap-2 mt-2">
          {[
            { label: "Dynime OS", to: "/products/os" },
            { label: "DWS · Web Services", to: "/services?cat=dws" },
            { label: "DES · Ecommerce Solutions", to: "/services?cat=des" },
            { label: "DMS · Marketing", to: "/services?cat=dms" },
            { label: "DSS · Software Dev", to: "/services?cat=dss" },
            { label: "DCS · Consultancy", to: "/services?cat=dcs" },
            { label: "Invest with Dynime", to: "/invest" },
          ].map((c) => (
            <Link
              key={c.to}
              to={c.to}
              className="group inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 backdrop-blur px-3.5 py-1.5 text-xs sm:text-sm font-medium text-foreground/80 hover:text-primary hover:border-primary/50 transition-colors"
            >
              <Sparkles className="h-3 w-3 text-primary/70 group-hover:text-primary" />
              {c.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Swiper theme overrides */}
      <style>{`
        .hero-swiper { --swiper-theme-color: hsl(var(--primary)); }
        .hero-swiper .swiper-pagination { bottom: 14px !important; }
        .hero-swiper .swiper-pagination-bullet {
          background: hsl(var(--foreground) / 0.25);
          opacity: 1;
          width: 8px; height: 8px;
          transition: width .3s ease, background .3s ease;
        }
        .hero-swiper .swiper-pagination-bullet-active {
          background: hsl(var(--primary));
          width: 22px;
          border-radius: 4px;
        }
        .hero-swiper .swiper-button-next,
        .hero-swiper .swiper-button-prev {
          color: hsl(var(--foreground));
          background: hsl(var(--card) / 0.85);
          backdrop-filter: blur(8px);
          width: 44px;
          height: 44px;
          border-radius: 9999px;
          border: 1px solid hsl(var(--border));
          box-shadow: 0 4px 14px hsl(var(--foreground) / 0.08);
          margin-top: -22px;
          transition: background .2s ease, color .2s ease, transform .2s ease, border-color .2s ease;
        }
        .hero-swiper .swiper-button-prev { left: 18px; right: auto; }
        .hero-swiper .swiper-button-next { right: 18px; left: auto; }
        .hero-swiper .swiper-button-next:hover,
        .hero-swiper .swiper-button-prev:hover {
          background: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
          border-color: hsl(var(--primary));
          transform: scale(1.06);
        }
        .hero-swiper .swiper-button-next:after,
        .hero-swiper .swiper-button-prev:after {
          font-size: 16px;
          font-weight: 700;
          line-height: 1;
        }
        .hero-swiper .swiper-button-disabled { opacity: 0.4; }
        @media (max-width: 640px) {
          .hero-swiper .swiper-button-next,
          .hero-swiper .swiper-button-prev { display: none; }
        }

      `}</style>
    </section>
  );
};

export default HeroSlider;

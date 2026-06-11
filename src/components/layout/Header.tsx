import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import Link from "@/components/shared/PrefetchLink";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronDown, ArrowRight, User, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import SiteLogo from "@/components/shared/SiteLogo";
import ThemeToggle from "@/components/shared/ThemeToggle";
import { useSiteSettings } from "@/hooks/use-data";
import {
  primaryNav,
  serviceTabs, serviceTabOrder, type ServiceTabKey,
  osTabs, osTabOrder, type OsTabKey,
} from "./nav-data";
import featuredImage from "@/assets/business_management_featured.png";

const megaMenuSpotlights: Record<string, {
  moreTitle: string;
  moreLinks: { label: string; to: string; desc: string }[];
  featured: {
    title: string;
    desc: string;
    cta: string;
    to: string;
  };
}> = {
  dws: {
    moreTitle: "Explore More Solutions",
    moreLinks: [
      { label: "Shopify Ecommerce", desc: "Build & scale custom online stores", to: "/shopify-ecommerce" },
      { label: "SEO Optimization", desc: "Drive recurring organic traffic from Google", to: "/seo" },
    ],
    featured: {
      title: "Redesign & Modernize",
      desc: "Convert legacy code to modern React or WordPress with 25% off.",
      cta: "Claim offer",
      to: "/website-redesign",
    },
  },
  des: {
    moreTitle: "Explore More Solutions",
    moreLinks: [
      { label: "Web Design & Development", desc: "High-performance React & custom sites", to: "/web-design-development" },
      { label: "Facebook & Instagram Ads", desc: "Meta paid acquisition that converts", to: "/facebook-ads" },
    ],
    featured: {
      title: "POS & Stock Sync",
      desc: "Integrate physical store POS database with online store automatically.",
      cta: "Book demo",
      to: "/shopify-ecommerce",
    },
  },
  dms: {
    moreTitle: "Explore More Solutions",
    moreLinks: [
      { label: "React / MERN Apps", desc: "Tailored JS dashboards & modern apps", to: "/react-mern-apps" },
      { label: "AI Software Development", desc: "Integrate custom AI workflows into software", to: "/ai-software-development" },
    ],
    featured: {
      title: "Free SEO & Ads Audit",
      desc: "Get a comprehensive growth audit of your current channels today.",
      cta: "Get free audit",
      to: "/contact?service=SEO",
    },
  },
  dss: {
    moreTitle: "Explore More Solutions",
    moreLinks: [
      { label: "SaaS Development", desc: "Multi-tenant platforms & scaling support", to: "/saas-development" },
      { label: "Payment Gateway Setup", desc: "Stripe & PayPal compliance and setups", to: "/payment-gateway" },
    ],
    featured: {
      title: "Custom Software Demo",
      desc: "Explore bespoke payment gateway setups, custom CRM & HR software.",
      cta: "Explore systems",
      to: "/ai-software-development",
    },
  },
  dcs: {
    moreTitle: "Explore More Solutions",
    moreLinks: [
      { label: "Web Design & Development", desc: "Premium custom web platforms & design", to: "/web-design-development" },
      { label: "Shopify Ecommerce", desc: "Brand new custom store build & theme design", to: "/shopify-ecommerce" },
    ],
    featured: {
      title: "Start Your US/UK Brand",
      desc: "Form your legal business structure and set up banking remotely.",
      cta: "Get started",
      to: "/us-company",
    },
  },
};

const centerNav = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Services", to: "__services__" },
  { label: "Dynime OS", to: "__os__" },
  { label: "Portfolio", to: "/portfolio" },
  { label: "Blog", to: "/blog" },
];

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ServiceTabKey>("dws");
  const [osOpen, setOsOpen] = useState(false);
  const [activeOsTab, setActiveOsTab] = useState<OsTabKey>("core");
  const [mobileServiceOpen, setMobileServiceOpen] = useState<ServiceTabKey | null>(null);
  const [mobileOsOpen, setMobileOsOpen] = useState<OsTabKey | null>(null);
  const [barRect, setBarRect] = useState<{ left: number; width: number; top: number } | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const { data: settings } = useSiteSettings();
  const { user } = useAuth();
  const location = useLocation();

  const ctaText = settings?.header_cta_text || "Contact";
  const ctaUrl = settings?.header_cta_url || "/contact";
  const showTheme = settings?.header_theme_toggle !== "false";

  // Measure inner bar so mega menu aligns to its left/width
  useLayoutEffect(() => {
    const measure = () => {
      if (!barRef.current) return;
      const r = barRef.current.getBoundingClientRect();
      setBarRect({ left: r.left, width: r.width, top: r.bottom });
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, []);

  // Close on route change
  useEffect(() => {
    setMobileOpen(false);
    setMegaOpen(false);
    setOsOpen(false);
  }, [location.pathname]);

  // Lock body scroll on mobile menu
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const isActive = (to: string) =>
    to !== "__services__" && to !== "__os__" && (to === "/" ? location.pathname === "/" : location.pathname.startsWith(to));

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] bg-background border-b border-border/60">
      <div
        ref={barRef}
        className="container-custom flex items-center justify-between gap-6 lg:gap-10 h-16 md:h-[72px] relative"
      >
        {/* Left: Logo */}
        <Link to="/" aria-label="Home" className="flex items-center min-w-0 flex-shrink-0">
          <SiteLogo
            alt="Dynime"
            className="w-auto object-contain h-10 md:h-11 max-w-[170px] md:max-w-[210px]"
          />
        </Link>

        {/* Center: Nav (desktop) */}
        <nav className="hidden lg:flex items-center gap-1 absolute left-1/2 -translate-x-1/2" aria-label="Primary">
          {centerNav.map((item) => {
            if (item.to === "__services__" || item.to === "__os__") {
              const isOs = item.to === "__os__";
              const open = isOs ? osOpen : megaOpen;
              const setOpen = isOs ? setOsOpen : setMegaOpen;
              const setOther = isOs ? setMegaOpen : setOsOpen;
              return (
                <button
                  key={item.label}
                  onMouseEnter={() => { setOpen(true); setOther(false); }}
                  onClick={() => { setOpen(!open); setOther(false); }}
                  aria-expanded={open}
                  className={[
                    "px-3 xl:px-4 py-2 rounded-lg text-[14px] xl:text-[15px] font-semibold flex items-center gap-1.5 whitespace-nowrap",
                    "transition-all duration-200",
                    open
                      ? "text-foreground bg-foreground/5"
                      : "text-foreground/75 hover:text-foreground hover:bg-foreground/5",
                  ].join(" ")}
                >
                  {item.label}
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                  />
                </button>
              );
            }
            const active = isActive(item.to);
            return (
              <Link
                key={item.label}
                to={item.to}
                className={[
                  "px-3 xl:px-4 py-2 rounded-lg text-[14px] xl:text-[15px] font-semibold whitespace-nowrap",
                  "transition-all duration-200",
                  active
                    ? "text-foreground"
                    : "text-foreground/75 hover:text-foreground hover:bg-foreground/5",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: actions */}
        <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
          {showTheme && <ThemeToggle />}

          {/* Account icon */}
          <Link
            to={user ? "/account" : "/account/login"}
            aria-label={user ? "Account portal" : "Sign in"}
            title={user ? "My Account" : "Sign in"}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full text-foreground/75 hover:text-foreground hover:bg-foreground/5 transition-colors"
          >
            <User className="w-4 h-4" />
          </Link>

          {/* CTA - desktop */}
          <Link
            to={ctaUrl}
            className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-primary/85 text-primary-foreground text-sm font-semibold px-4 py-2 shadow-[0_2px_8px_-2px_hsl(var(--primary)/0.35)] transition-all duration-200 hover:brightness-110 hover:scale-[1.03] active:scale-[0.98]"
          >
            {ctaText}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          {/* Hamburger - mobile */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-full text-foreground hover:bg-foreground/5 transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Desktop Mega Menu — anchored under the bar */}
      <AnimatePresence>
        {megaOpen && barRect && (
          <motion.div
            key="mega"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onMouseLeave={() => setMegaOpen(false)}
            style={{
              position: "fixed",
              left: barRect.left,
              top: barRect.top,
              width: barRect.width,
            }}
            className="hidden lg:block rounded-b-2xl border border-t-0 border-border/60 bg-background shadow-[0_24px_80px_-20px_hsl(var(--foreground)/0.4)] overflow-hidden"
          >
            <div className="grid grid-cols-12">
              {/* Left and Middle Sections with Padding */}
              <div className="col-span-9 grid grid-cols-9 gap-4 p-5 md:p-6">
                {/* Vertical tabs */}
                <div className="col-span-3 space-y-1 border-r border-border/20 pr-3">
                  {serviceTabOrder.map((key) => {
                    const t = serviceTabs[key];
                    const Icon = t.icon;
                    const active = activeTab === key;
                    return (
                      <button
                        key={key}
                        onMouseEnter={() => setActiveTab(key)}
                        onClick={() => setActiveTab(key)}
                        className={[
                          "w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left transition-all",
                          active
                            ? `bg-gradient-to-r ${t.color} border border-primary/25`
                            : "border border-transparent hover:bg-foreground/5",
                        ].join(" ")}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          active ? "bg-primary/20" : "bg-primary/10"
                        }`}>
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] xl:text-[13.5px] font-bold text-foreground leading-tight">{t.label}</div>
                          <div className="text-[10.5px] xl:text-[11px] text-muted-foreground leading-snug mt-0.5">{t.sublabel}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Items */}
                <div className="col-span-6">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                    className="grid grid-cols-2 gap-x-3 gap-y-2"
                  >
                    {serviceTabs[activeTab].items.map((sub) => {
                      const Icon = sub.icon;
                      return (
                        <Link
                          key={sub.label}
                          to={sub.to}
                          onClick={() => setMegaOpen(false)}
                          className="group flex items-start gap-2.5 p-2 rounded-lg hover:bg-foreground/5 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-primary/20 transition-colors">
                            <Icon className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[13.5px] font-semibold text-foreground leading-tight">{sub.label}</div>
                            <div className="text-[11.5px] text-muted-foreground leading-snug mt-0.5 line-clamp-1">{sub.desc}</div>
                          </div>
                        </Link>
                      );
                    })}
                  </motion.div>
                </div>
              </div>

              {/* Right Sidebar - Stripe Style Panel */}
              {(() => {
                const spotlight = megaMenuSpotlights[activeTab] || megaMenuSpotlights.dws;
                return (
                  <div className="col-span-3 bg-[#f6f9fc] dark:bg-zinc-950/50 border-l border-border/30 p-5 md:p-6 flex flex-col justify-between">
                    {/* Section 1 - Spotlight links */}
                    <div className="space-y-2.5">
                      <div className="text-[10px] font-heading font-bold text-foreground/50 dark:text-white/60 uppercase tracking-[0.18em] flex items-center gap-1.5">
                        <span className="inline-block w-3.5 h-px bg-gradient-to-r from-primary to-primary/0" />
                        {spotlight.moreTitle}
                      </div>
                      <div className="space-y-2.5">
                        {spotlight.moreLinks.map((link, idx) => (
                          <Link
                            key={idx}
                            to={link.to}
                            onClick={() => setMegaOpen(false)}
                            className="group/sl block"
                          >
                            <div className="text-[12.5px] font-semibold text-foreground group-hover/sl:text-primary transition-colors flex items-center gap-0.5">
                              {link.label}
                              <ArrowRight className="w-2.5 h-2.5 opacity-0 group-hover/sl:opacity-100 group-hover/sl:translate-x-0.5 transition-all" />
                            </div>
                            <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">{link.desc}</div>
                          </Link>
                        ))}
                      </div>
                    </div>

                    {/* Section 2 - Featured Card */}
                    <div className="mt-3 pt-3 border-t border-border/15">
                      <Link
                        to={spotlight.featured.to}
                        onClick={() => setMegaOpen(false)}
                        className="group/fc block rounded-lg overflow-hidden border border-border/40 bg-background hover:border-primary/20 transition-all shadow-sm"
                      >
                        <div className="relative aspect-[22/9] w-full overflow-hidden bg-muted">
                          <img
                            src={featuredImage}
                            alt={spotlight.featured.title}
                            className="object-cover w-full h-full group-hover/fc:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="p-2.5 space-y-0.5">
                          <div className="text-[12.5px] font-bold text-foreground group-hover/fc:text-primary transition-colors">
                            {spotlight.featured.title}
                          </div>
                          <div className="text-[11px] text-muted-foreground leading-snug">
                            {spotlight.featured.desc}
                          </div>
                          <div className="text-[11px] font-semibold text-primary inline-flex items-center gap-0.5 pt-0.5">
                            {spotlight.featured.cta}
                            <ChevronRight className="w-3 h-3 group-hover/fc:translate-x-0.5 transition-transform" />
                          </div>
                        </div>
                      </Link>
                    </div>
                  </div>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop OS Mega Menu */}
      <AnimatePresence>
        {osOpen && barRect && (
          <motion.div
            key="os-mega"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onMouseLeave={() => setOsOpen(false)}
            style={{
              position: "fixed",
              left: barRect.left,
              top: barRect.top,
              width: barRect.width,
            }}
            className="hidden lg:block rounded-b-2xl border border-t-0 border-border/60 bg-background shadow-[0_24px_80px_-20px_hsl(var(--foreground)/0.4)] p-5 md:p-6"
          >
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-3 space-y-1 border-r border-border/30 pr-3">
                {osTabOrder.map((key) => {
                  const t = osTabs[key];
                  const Icon = t.icon;
                  const active = activeOsTab === key;
                  return (
                    <button
                      key={key}
                      onMouseEnter={() => setActiveOsTab(key)}
                      onClick={() => setActiveOsTab(key)}
                      className={[
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all",
                        active
                          ? `bg-gradient-to-r ${t.color} border border-primary/25`
                          : "border border-transparent hover:bg-foreground/5",
                      ].join(" ")}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        active ? "bg-primary/20" : "bg-primary/10"
                      }`}>
                        <Icon className="w-[18px] h-[18px] text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[15px] font-bold text-foreground leading-tight truncate">{t.label}</div>
                        <div className="text-[12px] text-muted-foreground leading-snug mt-0.5 truncate">{t.sublabel}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="col-span-9">
                <motion.div
                  key={activeOsTab}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                  className="grid grid-cols-2 gap-2"
                >
                  {osTabs[activeOsTab].items.map((sub) => {
                    const Icon = sub.icon;
                    return (
                      <Link
                        key={sub.label}
                        to={sub.to}
                        onClick={() => setOsOpen(false)}
                        className="group flex items-start gap-3 p-3 rounded-xl hover:bg-foreground/5 transition-colors"
                      >
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-primary/20 transition-colors">
                          <Icon className="w-[18px] h-[18px] text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[15px] font-semibold text-foreground leading-tight">{sub.label}</div>
                          <div className="text-[12px] text-muted-foreground leading-snug mt-0.5">{sub.desc}</div>
                        </div>
                      </Link>
                    );
                  })}
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile slide-down menu — unchanged styling */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="lg:hidden mx-3 mt-2 rounded-2xl border border-white/10 bg-background/85 [backdrop-filter:blur(18px)_saturate(160%)] [-webkit-backdrop-filter:blur(18px)_saturate(160%)] shadow-[0_20px_60px_-20px_hsl(var(--foreground)/0.4)] overflow-hidden"
          >
            <div className="max-h-[calc(100vh-7rem)] overflow-y-auto p-3 space-y-3">
              {/* Services accordion - FIRST */}
              <div className="rounded-xl border border-border/30 bg-card/40 overflow-hidden">
                <div className="px-3 pt-3 pb-2 text-[11px] uppercase tracking-wide font-bold text-muted-foreground/80">
                  Services
                </div>
                <div className="px-2 pb-2 space-y-1">
                  {serviceTabOrder.map((key) => {
                    const t = serviceTabs[key];
                    const Icon = t.icon;
                    const open = mobileServiceOpen === key;
                    return (
                      <div key={key} className="rounded-lg overflow-hidden border border-transparent data-[open=true]:border-border/40 data-[open=true]:bg-background/40" data-open={open}>
                        <button
                          onClick={() => setMobileServiceOpen(open ? null : key)}
                          className={[
                            "w-full flex items-center gap-2.5 px-2.5 py-2 text-left transition-colors",
                            open ? "bg-foreground/5" : "hover:bg-foreground/5",
                          ].join(" ")}
                          aria-expanded={open}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${open ? "bg-primary/20" : "bg-primary/10"}`}>
                            <Icon className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-base font-bold text-foreground leading-tight">{t.label}</div>
                            <div className="text-[12.5px] text-muted-foreground leading-tight mt-0.5">{t.sublabel}</div>
                          </div>
                          <ChevronDown
                            className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
                          />
                        </button>
                        <AnimatePresence initial={false}>
                          {open && (
                            <motion.div
                              key="content"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.22, ease: "easeOut" }}
                              className="overflow-hidden"
                            >
                              <div className="flex flex-col gap-2 p-2">
                                {t.items.map((sub) => {
                                  const SubIcon = sub.icon;
                                  return (
                                    <Link
                                      key={sub.label}
                                      to={sub.to}
                                      onClick={() => setMobileOpen(false)}
                                      className="flex items-start gap-3 p-3 rounded-lg bg-background/60 border border-border/30 hover:border-primary/40 transition-colors"
                                    >
                                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                        <SubIcon className="w-4 h-4 text-primary" />
                                      </div>
                                      <div className="flex flex-col min-w-0">
                                        <span className="text-sm font-semibold text-foreground leading-snug">{sub.label}</span>
                                        <span className="text-xs text-muted-foreground leading-snug mt-0.5">{sub.desc}</span>
                                      </div>
                                    </Link>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* OS accordion */}
              <div className="rounded-xl border border-border/30 bg-card/40 overflow-hidden">
                <div className="px-3 pt-3 pb-2 text-[11px] uppercase tracking-wide font-bold text-muted-foreground/80">
                  Dynime OS
                </div>
                <div className="px-2 pb-2 space-y-1">
                  {osTabOrder.map((key) => {
                    const t = osTabs[key];
                    const Icon = t.icon;
                    const open = mobileOsOpen === key;
                    return (
                      <div key={key} className="rounded-lg overflow-hidden border border-transparent data-[open=true]:border-border/40 data-[open=true]:bg-background/40" data-open={open}>
                        <button
                          onClick={() => setMobileOsOpen(open ? null : key)}
                          className={[
                            "w-full flex items-center gap-2.5 px-2.5 py-2 text-left transition-colors",
                            open ? "bg-foreground/5" : "hover:bg-foreground/5",
                          ].join(" ")}
                          aria-expanded={open}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${open ? "bg-primary/20" : "bg-primary/10"}`}>
                            <Icon className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-base font-bold text-foreground leading-tight">{t.label}</div>
                            <div className="text-[12.5px] text-muted-foreground leading-tight mt-0.5">{t.sublabel}</div>
                          </div>
                          <ChevronDown
                            className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
                          />
                        </button>
                        <AnimatePresence initial={false}>
                          {open && (
                            <motion.div
                              key="content"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.22, ease: "easeOut" }}
                              className="overflow-hidden"
                            >
                              <div className="flex flex-col gap-2 p-2">
                                {t.items.map((sub) => {
                                  const SubIcon = sub.icon;
                                  return (
                                    <Link
                                      key={sub.label}
                                      to={sub.to}
                                      onClick={() => setMobileOpen(false)}
                                      className="flex items-start gap-3 p-3 rounded-lg bg-background/60 border border-border/30 hover:border-primary/40 transition-colors"
                                    >
                                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                        <SubIcon className="w-4 h-4 text-primary" />
                                      </div>
                                      <div className="flex flex-col min-w-0">
                                        <span className="text-sm font-semibold text-foreground leading-snug">{sub.label}</span>
                                        <span className="text-xs text-muted-foreground leading-snug mt-0.5">{sub.desc}</span>
                                      </div>
                                    </Link>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>


              {/* Primary nav links */}
              <div className="grid grid-cols-2 gap-1.5">
                {primaryNav.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.to);
                  return (
                    <Link
                      key={item.label}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className={[
                        "flex items-center gap-2 px-2.5 py-2 rounded-xl transition-colors min-w-0",
                        active ? "bg-foreground/8 text-foreground" : "text-foreground/85 hover:bg-foreground/5",
                      ].join(" ")}
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm font-semibold">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, ChevronRight, RefreshCw, Menu, X } from "lucide-react";
import Layout from "@/components/layout/Layout";
import ServicePricingSection from "@/components/services/ServicePricingSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { servicePages, type ServicePageData } from "@/data/services";
import { usePageSEO } from "@/hooks/use-page-seo";

const CATEGORY_ORDER: Array<ServicePageData["category"]> = ["dws", "dms", "dss", "dcs"];
const CATEGORY_META: Record<ServicePageData["category"], { label: string; sub: string }> = {
  dws: { label: "DWS", sub: "Web Services" },
  dms: { label: "DMS", sub: "Marketing Services" },
  dss: { label: "DSS", sub: "Software & AI" },
  dcs: { label: "DCS", sub: "Consultancy Services" },
};

const servicesByCategory = CATEGORY_ORDER.map((cat) => ({
  category: cat,
  meta: CATEGORY_META[cat],
  items: servicePages.filter((s) => s.category === cat),
}));

const allSlugs = servicePages.map((s) => s.slug);

const SidebarList = ({
  activeSlug,
  onSelect,
}: {
  activeSlug: string;
  onSelect: (slug: string) => void;
}) => (
  <nav className="space-y-6 p-4">
    {servicesByCategory.map(({ category, meta, items }) => (
      <div key={category} className="space-y-1">
        <div className="px-2 mb-2 text-[11px] font-bold uppercase tracking-wider text-primary">
          {meta.label} · {meta.sub}
        </div>
        <ul className="space-y-0.5">
          {items.map((s) => {
            const Icon = s.icon;
            const isActive = s.slug === activeSlug;
            return (
              <li key={s.slug}>
                <button
                  type="button"
                  onClick={() => onSelect(s.slug)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors text-left",
                    isActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-foreground/70 hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                  <span className="truncate">{s.title}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    ))}
  </nav>
);

const ServicesPricing = () => {
  usePageSEO("services-pricing");
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initialSlug = params.get("service") || "seo";
  const [activeSlug, setActiveSlug] = useState<string>(
    allSlugs.includes(initialSlug) ? initialSlug : "seo",
  );

  const activeService = useMemo(
    () => servicePages.find((s) => s.slug === activeSlug),
    [activeSlug],
  );

  useEffect(() => {
    if (params.get("service") !== activeSlug) {
      const next = new URLSearchParams(params);
      next.set("service", activeSlug);
      setParams(next, { replace: true });
    }
  }, [activeSlug, params, setParams]);

  const handleSelect = (slug: string) => {
    setActiveSlug(slug);
    setMobileOpen(false);
    requestAnimationFrame(() => {
      document.getElementById("pricing-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const pageTitle = `Services Pricing — Transparent Plans for Every Service | Dynime`;
  const pageDesc = `Compare pricing across all Dynime services — web, marketing, software, AI, and consultancy. Live pricing, instant currency conversion, VAT inclusive options.`;

  useEffect(() => {
    const prev = document.title;
    document.title = pageTitle;
    const setMeta = (name: string, content: string, attr: "name" | "property" = "name") => {
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    setMeta("description", pageDesc);
    setMeta("og:title", pageTitle, "property");
    setMeta("og:description", pageDesc, "property");
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = "https://dynime.com/services-pricing";
    return () => { document.title = prev; };
  }, [pageTitle, pageDesc]);

  if (!activeService) return null;

  return (
    <Layout>
      <div className="flex w-full bg-background">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-72 flex-shrink-0 border-r bg-card/30 sticky top-16 md:top-20 self-start max-h-[calc(100vh-5rem)] overflow-y-auto">
          <SidebarList activeSlug={activeSlug} onSelect={handleSelect} />
        </aside>

        {/* Mobile drawer */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="p-0 w-80">
            <div className="h-14 flex items-center justify-between px-4 border-b">
              <span className="font-heading font-bold">All services</span>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="overflow-y-auto h-[calc(100%-3.5rem)]">
              <SidebarList activeSlug={activeSlug} onSelect={handleSelect} />
            </div>
          </SheetContent>
        </Sheet>

        {/* Main content */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Topbar */}
          <header className="sticky top-16 md:top-20 z-20 h-14 flex items-center gap-3 border-b bg-background/95 backdrop-blur px-4 md:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open services menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <nav className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-0 flex-1">
              <Link to="/" className="hover:text-foreground transition-colors hidden sm:inline">Home</Link>
              <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 hidden sm:inline" />
              <Link to="/services" className="hover:text-foreground transition-colors">Services</Link>
              <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-foreground font-medium truncate">{activeService.title}</span>
            </nav>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge variant="outline" className="hidden md:inline-flex gap-1.5 text-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                Live pricing
              </Badge>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/services/${activeService.slug}`}>
                  <span className="hidden sm:inline">View full details</span>
                  <span className="sm:hidden">Details</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Link>
              </Button>
            </div>
          </header>

          {/* Hero */}
          <section className="border-b bg-gradient-to-br from-primary/5 via-background to-background px-6 lg:px-10 py-10">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
                {CATEGORY_META[activeService.category].label} · Pricing
              </div>
              <h1 className="font-heading text-3xl md:text-5xl font-black tracking-tight mb-4">
                {activeService.title} <span className="gradient-text">pricing</span>
              </h1>
              <p className="text-muted-foreground text-base md:text-lg max-w-3xl">
                {activeService.description}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <RefreshCw className="w-3.5 h-3.5" />
                Prices sync live from admin · VAT &amp; currency auto-detected for your region
              </div>
            </div>
          </section>

          {/* Pricing — reuses ServicePricingSection so admin changes auto-sync */}
          <section id="pricing-panel" className="flex-1">
            <ServicePricingSection
              key={activeService.slug}
              serviceSlug={activeService.slug}
              serviceTitle={activeService.title}
              serviceFeatures={activeService.features}
            />
          </section>

          {/* Footer CTA */}
          <section className="border-t bg-muted/30 px-6 lg:px-10 py-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="font-heading text-xl font-bold">Not sure which plan fits?</h3>
                <p className="text-sm text-muted-foreground">Talk to us — we'll match the right tier to your goals.</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button variant="outline" asChild>
                  <Link to={`/services/${activeService.slug}`}>Full service page</Link>
                </Button>
                <Button asChild>
                  <Link to={`/contact?service=${encodeURIComponent(activeService.title)}`}>
                    Get a custom quote <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default ServicesPricing;

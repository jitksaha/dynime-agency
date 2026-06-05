import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/layout/Layout";
import { usePageSEO } from "@/hooks/use-page-seo";
import { SEO_DEFAULTS } from "@/lib/seo-defaults";
import ScrollReveal from "@/components/shared/ScrollReveal";
import PageHero from "@/components/shared/PageHero";
import { usePortfolioProjects, useSiteSettings } from "@/hooks/use-cms-data";
import { Layers, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import ProjectCard from "@/components/portfolio/ProjectCard";

const TABS = [
  { key: "Web", label: "Web" },
  { key: "Marketing", label: "Marketing" },
  { key: "Consultancy", label: "Consultancy" },
] as const;

const Portfolio = () => {
  const [activeTab, setActiveTab] = useState<string>("Web");
  const [search, setSearch] = useState("");
  const [techFilter, setTechFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const { data: projects, isLoading } = usePortfolioProjects(activeTab);
  const { data: settings } = useSiteSettings();
  const perPage = Math.max(1, parseInt(settings?.portfolio_per_page || "12", 10) || 12);

  // Build tech/category filter options from current tab's projects
  const techOptions = useMemo(() => {
    const set = new Set<string>();
    (projects || []).forEach((p) => (p.technologies || []).forEach((t: string) => t && set.add(t)));
    return Array.from(set).sort();
  }, [projects]);

  // Filter projects by search + tech
  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (projects || []).filter((p) => {
      const matchesQuery =
        !q ||
        p.title?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        (p.technologies || []).some((t: string) => t.toLowerCase().includes(q));
      const matchesTech =
        techFilter === "all" || (p.technologies || []).includes(techFilter);
      return matchesQuery && matchesTech;
    });
  }, [projects, search, techFilter]);

  const projectsLd = (projects || []).slice(0, 20).map((p, i) => ({
    "@type": "ListItem",
    position: i + 1,
    item: {
      "@type": "CreativeWork",
      name: p.title,
      description: p.description || undefined,
      url: p.project_url || undefined,
      image: p.thumbnail_url || undefined,
      keywords: (p.technologies || []).join(", ") || undefined,
    },
  }));

  usePageSEO("portfolio", {
    title: activeTab && activeTab !== "All" ? `${activeTab} — ${SEO_DEFAULTS.portfolio.title}` : SEO_DEFAULTS.portfolio.title,
    description: SEO_DEFAULTS.portfolio.description,
    keywords: [...(SEO_DEFAULTS.portfolio.keywords ?? []), activeTab.toLowerCase()],
    jsonLd: projectsLd.length
      ? {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${activeTab} Portfolio — Dynime Inc.`,
          mainEntity: { "@type": "ItemList", itemListElement: projectsLd },
        }
      : undefined,
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const pagedProjects = filteredProjects.slice((currentPage - 1) * perPage, currentPage * perPage);

  // Reset to page 1 on tab/filter/search change
  useEffect(() => {
    setPage(1);
  }, [activeTab, search, techFilter, perPage]);


  return (
    <Layout>
      <PageHero
        eyebrow="A Curated Selection of Recent Work"
        eyebrowIcon={Layers}
        title={
          <>
            Selected <span className="gradient-text">Work</span>
          </>
        }
        description="Each project, a partnership. Each result, a quiet statement of intent. Explore the brands we've helped shape."
        primaryCta={{ label: "Begin a project", href: "/contact" }}
        secondaryCta={{ label: "Browse selected work", href: "#portfolio-grid" }}
      />

      {/* Tabs + Content */}
      <section id="portfolio-grid" className="pb-14 scroll-mt-24">
        <div className="container-custom">
          {/* Tab Switcher */}
          <ScrollReveal>
            <div className="flex justify-center mb-8">
              <div className="inline-flex rounded-full border border-border bg-card/50 p-1 gap-1">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setActiveTab(tab.key);
                      setSearch("");
                      setTechFilter("all");
                    }}
                    className={`relative px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                      activeTab === tab.key
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* Search + Category Filter */}
          <ScrollReveal>
            <div className="flex flex-col sm:flex-row gap-3 max-w-3xl mx-auto mb-10">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search projects by name, description, or tech…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-9 h-11 rounded-full bg-card/50"
                  aria-label="Search projects"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <Select value={techFilter} onValueChange={setTechFilter}>
                <SelectTrigger className="w-full sm:w-56 h-11 rounded-full bg-card/50" aria-label="Filter by category">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {techOptions.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(search || techFilter !== "all") && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearch("");
                    setTechFilter("all");
                  }}
                  className="h-11 rounded-full"
                >
                  Reset
                </Button>
              )}
            </div>
            <div className="text-center text-sm text-muted-foreground mb-6">
              Showing {pagedProjects.length} of {filteredProjects.length} projects
              {filteredProjects.length !== (projects?.length ?? 0) && (
                <> (filtered from {projects?.length ?? 0})</>
              )}
            </div>
          </ScrollReveal>

          {/* Loading */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-border bg-card p-1">
                  <Skeleton className="h-52 rounded-xl" />
                  <div className="p-5 space-y-3">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Content */}
          {!isLoading && (
            <motion.div
              key={activeTab + "-" + currentPage}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pagedProjects.map((project, i) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i, 6) * 0.02, duration: 0.25 }}
                      className="h-full"
                    >
                      <ProjectCard project={project} />
                    </motion.div>
                  ))}
                </div>

                {filteredProjects.length === 0 && (
                  <div className="text-center py-14 text-muted-foreground">
                    No projects found{search || techFilter !== "all" ? " matching your filters." : " in this category yet."}
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (() => {
                  const goToPage = (n: number) => {
                    setPage(n);
                    requestAnimationFrame(() => {
                      document.getElementById("portfolio-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
                    });
                  };
                  return (
                  <div className="flex items-center justify-center gap-2 mt-12 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="rounded-full"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                    </Button>
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const n = i + 1;
                      const show =
                        n === 1 ||
                        n === totalPages ||
                        Math.abs(n - currentPage) <= 2;
                      const isGap =
                        !show &&
                        ((n === 2 && currentPage > 4) ||
                          (n === totalPages - 1 && currentPage < totalPages - 3));
                      if (isGap) {
                        return (
                          <span key={n} className="px-2 text-muted-foreground">
                            …
                          </span>
                        );
                      }
                      if (!show) return null;
                      return (
                        <button
                          key={n}
                          onClick={() => goToPage(n)}
                          className={`w-9 h-9 rounded-full text-sm font-medium transition-colors ${
                            n === currentPage
                              ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                              : "border border-border bg-card/50 text-foreground hover:border-primary/50"
                          }`}
                        >
                          {n}
                        </button>
                      );
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="rounded-full"
                    >
                      Next <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                  );
                })()}
            </motion.div>
          )}
        </div>
      </section>

    </Layout>
  );
};

export default Portfolio;


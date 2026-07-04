import { useState } from "react";
import { Link } from "react-router-dom";
import { useSyncedJobs } from "@/hooks/use-cms-data";
import Layout from "@/components/layout/Layout";
import { usePageSEO } from "@/hooks/use-page-seo";
import { SEO_DEFAULTS } from "@/lib/seo-defaults";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { Briefcase, MapPin, Clock, ArrowUpRight, Sparkles, Heart, Globe, Rocket, Users, Search, X, ChevronLeft, ChevronRight, DollarSign, ChevronDown, CheckCircle2 } from "lucide-react";

interface JobCardProps {
  job: SyncedJob;
  isExpanded: boolean;
  onToggle: () => void;
}

const JobCard = ({ job, isExpanded, onToggle }: JobCardProps) => {
  const cleanDescription = job.description
    ? job.description.replace(/<[^>]+>/g, " ").trim()
    : "";

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-b from-card/40 to-card/10 backdrop-blur-md hover:shadow-[0_20px_50px_rgba(var(--primary-rgb),0.08)] transition-all duration-300 ${
        isExpanded
          ? "border-primary/40 shadow-[0_15px_40px_-15px_rgba(var(--primary-rgb),0.15)]"
          : "border-border/30 hover:border-primary/20"
      }`}
    >
      {/* Background hover light effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {job.featured && (
        <span className="absolute top-0 right-6 inline-flex items-center gap-1 rounded-b-xl bg-gradient-to-r from-primary to-accent text-primary-foreground px-3 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm z-20">
          <Sparkles className="w-3 h-3 animate-pulse" /> Featured
        </span>
      )}

      {/* Clickable Header */}
      <button
        onClick={onToggle}
        type="button"
        className="w-full text-left p-6 md:p-7 flex items-start justify-between gap-4 focus:outline-none z-10 relative"
      >
        <div className="space-y-3.5 pr-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-primary font-bold px-2.5 py-0.5 rounded-md bg-primary/10 border border-primary/10">
              {job.department}
            </span>
          </div>
          <h3 className="font-heading font-extrabold text-xl md:text-2xl text-foreground group-hover:text-primary transition-colors duration-300">
            {job.title}
          </h3>

          {/* Always visible tags info */}
          <div className="flex flex-wrap gap-2.5 pt-1">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/30 bg-background/40 px-3 py-1 text-xs text-foreground/80 font-medium">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              {job.location}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/30 bg-background/40 px-3 py-1 text-xs text-foreground/80 font-medium">
              <Clock className="w-3.5 h-3.5 text-primary" /> {job.employment_type}
            </span>
            {job.experience && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/30 bg-background/40 px-3 py-1 text-xs text-foreground/80 font-medium">
                <Briefcase className="w-3.5 h-3.5 text-primary" /> {job.experience}
              </span>
            )}
            {job.salary_currency && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-3 py-1 text-xs font-semibold">
                <DollarSign className="w-3.5 h-3.5" /> {job.salary_currency}
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0 pt-1">
          <div className={`p-2 rounded-full border border-border/40 bg-background/50 hover:bg-primary/10 hover:text-primary transition-all duration-300 ${isExpanded ? 'rotate-180 border-primary/30 text-primary' : 'text-muted-foreground'}`}>
            <ChevronDown className="w-5 h-5 transition-transform duration-300" />
          </div>
        </div>
      </button>

      {/* Expandable Content Container */}
      <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="px-6 md:px-7 pb-6 md:pb-7 border-t border-border/20 space-y-5 pt-5 relative z-10 bg-background/5">
            
            {cleanDescription && (
              <div className="space-y-2">
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Role Overview</h4>
                <p className="text-sm text-foreground/85 leading-relaxed font-sans max-w-3xl">
                  {cleanDescription.length > 280 ? cleanDescription.slice(0, 277).trim() + "..." : cleanDescription}
                </p>
              </div>
            )}

            {/* Responsibilities and Requirements side by side if present */}
            {(job.responsibilities?.length > 0 || job.requirements?.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {job.responsibilities?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Key Responsibilities
                    </h4>
                    <ul className="space-y-1.5 pl-1">
                      {job.responsibilities.slice(0, 3).map((resp, idx) => (
                        <li key={idx} className="text-xs text-foreground/80 leading-relaxed list-disc list-inside">
                          {resp}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {job.requirements?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-primary" /> Requirements
                    </h4>
                    <ul className="space-y-1.5 pl-1">
                      {job.requirements.slice(0, 3).map((req, idx) => (
                        <li key={idx} className="text-xs text-foreground/80 leading-relaxed list-disc list-inside">
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-5 border-t border-border/10">
              <span className="text-xs text-muted-foreground self-center">
                {job.published_at ? `Posted ${new Date(job.published_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}` : ""}
              </span>
              <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-border/60 hover:bg-background/80"
                >
                  <Link to={`/careers/${job.slug}`}>
                    View Details
                  </Link>
                </Button>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(job.apply_url, "_blank", "noopener,noreferrer");
                  }}
                  size="sm"
                  className="rounded-xl font-bold bg-primary hover:bg-primary/95 text-primary-foreground gap-1.5 group shadow-sm shadow-primary/10"
                >
                  Apply Now <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </Button>
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
};

const Careers = () => {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  const { data, isLoading, isError } = useSyncedJobs({
    search: search.trim() || undefined,
    department: department || undefined,
    location: location || undefined,
    employment_type: employmentType || undefined,
    remote: remoteOnly ? "true" : undefined,
    page,
    per_page: 6,
  });

  usePageSEO("careers", {
    title: SEO_DEFAULTS.careers.title,
    description: SEO_DEFAULTS.careers.description,
    keywords: SEO_DEFAULTS.careers.keywords,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        url: "https://dynime.com/careers",
        name: "Careers at Dynime LLC.",
        description: SEO_DEFAULTS.careers.description,
        about: { "@id": "https://dynime.com/#organization" },
      },
      ...(data?.data ?? []).map((j) => ({
        "@context": "https://schema.org",
        "@type": "JobPosting",
        title: j.title,
        description: j.description || SEO_DEFAULTS.careers.description,
        datePosted: j.published_at || j.created_at || new Date().toISOString(),
        employmentType: j.employment_type?.toUpperCase().replace(/[\s-]+/g, "_") || "FULL_TIME",
        hiringOrganization: {
          "@type": "Organization",
          name: "Dynime LLC.",
          sameAs: "https://dynime.com",
        },
        jobLocation: {
          "@type": "Place",
          address: { "@type": "PostalAddress", addressLocality: j.location },
        },
        ...(j.remote && {
          jobLocationType: "TELECOMMUTE",
          applicantLocationRequirements: { "@type": "Country", name: "Worldwide" },
        }),
      })),
    ],
  });

  const handleResetFilters = () => {
    setSearch("");
    setDepartment("");
    setLocation("");
    setEmploymentType("");
    setRemoteOnly(false);
    setPage(1);
  };

  return (
    <Layout>
      {/* Hero */}
      <section className="section-padding relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-60"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 0%, hsl(var(--primary) / 0.12), transparent 70%)",
          }}
        />
        <div className="container-custom text-center max-w-3xl mx-auto">
          <ScrollReveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 backdrop-blur px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              We're hiring globally
            </span>
            <h1 className="font-heading text-4xl md:text-6xl font-bold mt-5 mb-5">
              Build the future <span className="gradient-text">with us</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Join a global team of designers, engineers, and strategists shaping world-class digital products. Remote-first, ambitious, and human.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Perks */}
      <section className="pb-9 md:pb-12">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {perks.map((p, i) => (
              <ScrollReveal key={p.title} delay={i * 0.08}>
                <div className="rounded-xl border border-border/60 bg-card/50 p-5 text-center h-full">
                  <p.icon className="w-6 h-6 text-primary mx-auto mb-3" />
                  <h3 className="font-heading font-semibold text-sm mb-1">{p.title}</h3>
                  <p className="text-xs text-muted-foreground">{p.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Jobs */}
      <section className="section-padding bg-card/30">
        <div className="container-custom">
          <ScrollReveal>
            <div className="text-center mb-10">
              <span className="text-primary text-sm font-semibold uppercase tracking-wider">Open Positions</span>
              <h2 className="font-heading text-3xl md:text-4xl font-bold mt-3">Find your next role</h2>
              <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
                Browse our open positions below. Applications are processed through our secure integration.
              </p>
            </div>
          </ScrollReveal>

          {/* Advanced Filter Panel */}
          <div className="max-w-5xl mx-auto bg-background/50 border border-border/60 backdrop-blur-md rounded-2xl p-6 mb-8 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="relative md:col-span-2">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  type="search"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search by title, description..."
                  className="pl-9 pr-10 h-10 w-full"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div>
                <select
                  value={department}
                  onChange={(e) => {
                    setDepartment(e.target.value);
                    setPage(1);
                  }}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">All Departments</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Design">Design</option>
                  <option value="Product">Product</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Sales">Sales</option>
                </select>
              </div>

              <div>
                <select
                  value={employmentType}
                  onChange={(e) => {
                    setEmploymentType(e.target.value);
                    setPage(1);
                  }}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">All Types</option>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Internship">Internship</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2 border-t border-border/20">
              <div className="flex items-center gap-4">
                <label className="inline-flex items-center gap-2 text-sm text-foreground/80 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remoteOnly}
                    onChange={(e) => {
                      setRemoteOnly(e.target.checked);
                      setPage(1);
                    }}
                    className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                  />
                  Remote Only
                </label>
              </div>

              {(search || department || location || employmentType || remoteOnly) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="text-xs text-primary hover:text-primary-hover w-fit self-end"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {/* Results Grid */}
          {isLoading ? (
            <div className="space-y-4 max-w-4xl mx-auto">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-28 rounded-2xl bg-muted/40 animate-pulse border border-border/20" />
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-12 max-w-5xl mx-auto">
              <Briefcase className="w-12 h-12 text-destructive mx-auto mb-4 opacity-50 animate-bounce" />
              <h3 className="font-heading text-lg font-bold text-foreground mb-2">Error loading positions</h3>
              <p className="text-muted-foreground">We couldn't load the jobs listing. Please refresh the page or try again later.</p>
            </div>
          ) : data && data.data.length > 0 ? (
            <div className="max-w-4xl mx-auto">
              <div className="space-y-4 mb-8">
                {data.data.map((job) => (
                  <ScrollReveal key={job.flowmingo_job_id} delay={0.05}>
                    <JobCard
                      job={job}
                      isExpanded={expandedJobId === job.flowmingo_job_id}
                      onToggle={() =>
                        setExpandedJobId(
                          expandedJobId === job.flowmingo_job_id
                            ? null
                            : job.flowmingo_job_id
                        )
                      }
                    />
                  </ScrollReveal>
                ))}
              </div>

              {/* Pagination */}
              {data.meta.last_page > 1 && (
                <div className="flex items-center justify-center gap-2 pt-6">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium text-foreground/80 px-3">
                    Page {data.meta.current_page} of {data.meta.last_page}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage((p) => Math.min(data.meta.last_page, p + 1))}
                    disabled={page === data.meta.last_page}
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 max-w-5xl mx-auto border border-dashed border-border/80 rounded-2xl bg-background/20">
              <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="font-heading text-lg font-bold text-foreground mb-1">No open positions found</h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                No roles match your filter options. Try adjusting your search term, filters, or clear all values.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-card/60 to-card/30 p-10 md:p-14 text-center">
            <h2 className="font-heading text-2xl md:text-3xl font-bold mb-3">
              Don't see your role?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-6">
              We're always looking for exceptional talent. Send us your profile and tell us how you'd contribute.
            </p>
            <Button asChild size="lg">
              <Link to="/contact">Get in touch</Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Careers;

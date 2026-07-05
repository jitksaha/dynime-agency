import { useState } from "react";
import { Link } from "react-router-dom";
import { useSyncedJobs } from "@/hooks/use-cms-data";
import { type SyncedJob } from "@/lib/api";
import Layout from "@/components/layout/Layout";
import { usePageSEO } from "@/hooks/use-page-seo";
import { SEO_DEFAULTS } from "@/lib/seo-defaults";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Briefcase, MapPin, Clock, ArrowRight, Sparkles, Heart, Globe, Rocket, Users, Search, X, DollarSign, ChevronDown } from "lucide-react";

const perks = [
  { icon: Globe, title: "Remote-first", desc: "Work from anywhere in the world" },
  { icon: Rocket, title: "Fast growth", desc: "Own meaningful work from day one" },
  { icon: Heart, title: "Great benefits", desc: "Health, equity & flexible time off" },
  { icon: Users, title: "Inclusive culture", desc: "Diverse teams, strong values" },
];

interface JobCardProps {
  job: SyncedJob;
  isExpanded: boolean;
  onToggle: () => void;
}

const JobCard = ({ job, isExpanded, onToggle }: JobCardProps) => {
  // Extract clean text from markdown description
  const cleanDescription = job.description
    ? job.description
        .replace(/#+\s*[^\n]+/g, "") // Remove headers
        .replace(/[\*#_\-]/g, "")     // Remove markdown formatting
        .replace(/\s+/g, " ")         // Normalize whitespace
        .trim()
    : "";

  return (
    <div className="border-b border-border/40 py-8 first:pt-4 transition-all duration-300">
      {/* Clickable Header */}
      <button
        onClick={onToggle}
        type="button"
        className="w-full text-left flex items-start justify-between gap-4 focus:outline-none"
      >
        <div className="space-y-3">
          <h3 className="font-heading font-bold text-xl md:text-2xl text-foreground hover:text-primary transition-colors duration-300">
            {job.title}
          </h3>

          {/* Inline Job Metadata */}
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground/80 font-medium">
            <span className="inline-flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-muted-foreground/50 shrink-0" />
              {job.department}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-muted-foreground/50 shrink-0" />
              {job.location}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-muted-foreground/50 shrink-0" />
              {job.employment_type}
            </span>
            {job.salary_currency && (
              <span className="inline-flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                {job.salary_currency}
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0 pt-1">
          <ChevronDown className={`w-5 h-5 text-muted-foreground/60 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-primary' : ''}`} />
        </div>
      </button>

      {/* Expandable Description Details */}
      <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="pt-5 space-y-5">
            {cleanDescription && (
              <p className="text-sm md:text-base text-foreground/80 leading-relaxed font-sans max-w-4xl">
                {cleanDescription.length > 360 ? cleanDescription.slice(0, 357).trim() + "..." : cleanDescription}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(job.apply_url, "_blank", "noopener,noreferrer");
                }}
                className="rounded-full font-bold bg-[#1a1a1a] hover:bg-black dark:bg-foreground dark:text-background dark:hover:bg-foreground/90 text-white px-6 py-2.5 text-sm gap-2 group shadow-sm transition-all"
              >
                Apply for this position <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>

              <Button
                asChild
                variant="outline"
                size="sm"
                className="rounded-full text-xs font-semibold border-border/80 text-foreground hover:bg-muted/80 hover:text-foreground transition-all"
              >
                <Link to={`/careers/${job.slug}`}>
                  View Details Page
                </Link>
              </Button>
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
  const [employmentType, setEmploymentType] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  // Set per_page to 100 to pull all jobs in a single request and disable pagination
  const { data, isLoading, isError } = useSyncedJobs({
    search: search.trim() || undefined,
    department: department || undefined,
    employment_type: employmentType || undefined,
    remote: remoteOnly ? "true" : undefined,
    per_page: 100,
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
    setEmploymentType("");
    setRemoteOnly(false);
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

      {/* Jobs Listing */}
      <section className="section-padding bg-card/30">
        <div className="container-custom">
          <ScrollReveal>
            <div className="text-center mb-12">
              <span className="text-primary text-sm font-semibold uppercase tracking-wider">Open Positions</span>
              <h2 className="font-heading text-3xl md:text-4xl font-bold mt-3">Find your next role</h2>
              <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
                Browse our open positions below. We're hiring! Check back soon for open roles.
              </p>
            </div>
          </ScrollReveal>

                  {/* Filtering System Panel */}
          <div className="max-w-5xl mx-auto bg-background/40 border border-border/50 backdrop-blur-md rounded-2xl p-6 mb-12 shadow-sm">
            {/* Styled Remote Only Checkbox on Top */}
            <div className="flex items-center gap-4 mb-5 pb-4 border-b border-border/20">
              <button
                type="button"
                onClick={() => setRemoteOnly(!remoteOnly)}
                className="flex items-center gap-3 group text-sm text-foreground/80 font-semibold focus:outline-none cursor-pointer"
              >
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all duration-300 ${remoteOnly ? 'bg-primary border-primary' : 'border-border/80 group-hover:border-primary/50'}`}>
                  {remoteOnly && (
                    <svg className="w-3.5 h-3.5 text-primary-foreground stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                Remote Only
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none" />
                <Input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by title, description..."
                  className="pl-9 pr-10 h-10 w-full"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
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
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground/80 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">All Departments</option>
                  <option value="Sales & Business Development">Sales & Business Development</option>
                  <option value="Marketing & Growth">Marketing & Growth</option>
                  <option value="Human Resources">Human Resources</option>
                  <option value="Engineering & Development">Engineering & Development</option>
                  <option value="Product Management">Product Management</option>
                  <option value="Operations">Operations</option>
                </select>
              </div>

              <div>
                <select
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground/80 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">All Types</option>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Internship">Internship</option>
                </select>
              </div>
            </div>

            {(search || department || employmentType || remoteOnly) && (
              <div className="flex justify-end pt-3 mt-3 border-t border-border/10">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="text-xs text-primary hover:text-primary-hover w-fit"
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>

          {/* Results List */}
          {isLoading ? (
            <div className="space-y-6 max-w-4xl mx-auto">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="py-8 border-b border-border/20 space-y-3">
                  <div className="h-7 w-2/3 bg-muted/40 rounded animate-pulse" />
                  <div className="h-5 w-1/2 bg-muted/30 rounded animate-pulse" />
                </div>
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
              <div className="space-y-1 mb-8">
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

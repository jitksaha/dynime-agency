import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useSyncedJobs } from "@/hooks/use-cms-data";
import { type SyncedJob } from "@/lib/api";
import Layout from "@/components/layout/Layout";
import { usePageSEO } from "@/hooks/use-page-seo";
import { SEO_DEFAULTS } from "@/lib/seo-defaults";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Briefcase, MapPin, Clock, ArrowRight, Sparkles,
  Heart, Globe, Rocket, Users, Search, X,
  DollarSign, ChevronDown, Wifi, Star,
} from "lucide-react";

const perks = [
  { icon: Globe, title: "Remote-first", desc: "Work from anywhere in the world" },
  { icon: Rocket, title: "Fast growth", desc: "Own meaningful work from day one" },
  { icon: Heart, title: "Great benefits", desc: "Health, equity & flexible time off" },
  { icon: Users, title: "Inclusive culture", desc: "Diverse teams, strong values" },
];

// ─────────────────────────────────────────────────────────────────
// Job Card Component
// ─────────────────────────────────────────────────────────────────
interface JobCardProps {
  job: SyncedJob;
  isExpanded: boolean;
  onToggle: () => void;
}

const JobCard = ({ job, isExpanded, onToggle }: JobCardProps) => {
  // Extract clean text from markdown description (first meaningful paragraph)
  const cleanDescription = useMemo(() => {
    if (!job.description) return "";
    return job.description
      .replace(/#+\s*[^\n]+/g, "")
      .replace(/[*#_\-]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }, [job.description]);

  // Determine displayed salary
  const salaryDisplay = job.salary_range || null;

  return (
    <div className="group border border-border/50 rounded-2xl bg-card/40 hover:bg-card/80 hover:border-border/80 hover:shadow-lg hover:shadow-black/5 transition-all duration-300 overflow-hidden">
      {/* Card Header */}
      <button
        onClick={onToggle}
        type="button"
        className="w-full text-left p-6 md:p-7 focus:outline-none"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3 flex-1 min-w-0">
            {/* Department + Tags row */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] uppercase tracking-[0.15em] text-primary font-semibold bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                {job.department}
              </span>
              {job.featured && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                  <Star className="w-2.5 h-2.5" /> Featured
                </span>
              )}
              {job.remote && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                  <Wifi className="w-2.5 h-2.5" /> Remote
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className="font-heading font-bold text-xl md:text-2xl text-foreground group-hover:text-primary transition-colors duration-200 leading-tight">
              {job.title}
            </h3>

            {/* Metadata pills row */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground font-medium">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                {job.location}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                {job.employment_type || "Full-time"}
              </span>
              {job.experience && (
                <span className="inline-flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                  {job.experience}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                {salaryDisplay || "Negotiable"}
              </span>
            </div>
          </div>

          {/* Expand chevron */}
          <div className="shrink-0 w-9 h-9 rounded-full border border-border/60 bg-background/60 group-hover:border-primary/30 group-hover:bg-primary/5 flex items-center justify-center transition-all duration-300">
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground/60 transition-transform duration-300 ${
                isExpanded ? "rotate-180 text-primary" : ""
              }`}
            />
          </div>
        </div>
      </button>

      {/* Expanded Section */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-6 md:px-7 pb-6 md:pb-7 pt-0 border-t border-border/30 space-y-5">
            {cleanDescription && (
              <p className="text-sm md:text-base text-foreground/75 leading-relaxed mt-5 max-w-3xl">
                {cleanDescription.length > 380
                  ? cleanDescription.slice(0, 377).trim() + "…"
                  : cleanDescription}
              </p>
            )}

            {/* Requirements snippet */}
            {job.requirements?.length > 0 && (
              <ul className="space-y-1.5 max-w-2xl">
                {job.requirements.slice(0, 3).map((req, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/70">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/70 shrink-0" />
                    {req}
                  </li>
                ))}
                {job.requirements.length > 3 && (
                  <li className="text-xs text-muted-foreground pl-4">
                    +{job.requirements.length - 3} more requirements
                  </li>
                )}
              </ul>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  if (job.apply_url) {
                    window.open(job.apply_url, "_blank", "noopener,noreferrer");
                  }
                }}
                className="rounded-full font-bold bg-foreground hover:bg-foreground/90 dark:bg-foreground dark:text-background text-background px-7 py-2.5 text-sm gap-2 group/btn shadow-sm transition-all"
              >
                Apply for this position
                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
              </Button>

              <Button
                asChild
                variant="outline"
                size="sm"
                className="rounded-full text-xs font-semibold border-border/80 text-foreground hover:bg-muted/80 hover:text-foreground transition-all"
              >
                <Link to={`/careers/${job.slug}`}>View Full Details</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Filter Select Component
// ─────────────────────────────────────────────────────────────────
const FilterSelect = ({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: string[];
}) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="w-full h-10 px-3 rounded-xl border border-border/60 bg-background/80 text-sm text-foreground/80 focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all appearance-none cursor-pointer"
  >
    <option value="">{placeholder}</option>
    {options.map((opt) => (
      <option key={opt} value={opt}>
        {opt}
      </option>
    ))}
  </select>
);

// ─────────────────────────────────────────────────────────────────
// Main Careers Page
// ─────────────────────────────────────────────────────────────────
const Careers = () => {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [experience, setExperience] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  // Fetch all jobs (no pagination — per_page=100)
  const { data, isLoading, isError } = useSyncedJobs({
    per_page: 100,
  });

  // Derive unique filter options from API data (dynamic)
  const filterOptions = useMemo(() => {
    const jobs = data?.data ?? [];
    const departments = [...new Set(jobs.map((j) => j.department).filter(Boolean))].sort();
    const empTypes = [...new Set(jobs.map((j) => j.employment_type).filter(Boolean))].sort();
    const experiences = [
      ...new Set(jobs.map((j) => j.experience).filter(Boolean)),
    ].sort() as string[];
    return { departments, empTypes, experiences };
  }, [data]);

  // Client-side filtering on top of API data
  const filteredJobs = useMemo(() => {
    const jobs = data?.data ?? [];
    return jobs.filter((job) => {
      if (remoteOnly && !job.remote) return false;
      if (
        department &&
        job.department?.toLowerCase() !== department.toLowerCase()
      )
        return false;
      if (
        employmentType &&
        job.employment_type?.toLowerCase() !== employmentType.toLowerCase()
      )
        return false;
      if (
        experience &&
        job.experience?.toLowerCase() !== experience.toLowerCase()
      )
        return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !job.title?.toLowerCase().includes(q) &&
          !job.department?.toLowerCase().includes(q) &&
          !job.description?.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [data, search, department, employmentType, experience, remoteOnly]);

  const hasActiveFilters =
    search || department || employmentType || experience || remoteOnly;

  const handleResetFilters = () => {
    setSearch("");
    setDepartment("");
    setEmploymentType("");
    setExperience("");
    setRemoteOnly(false);
  };

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
        employmentType:
          j.employment_type?.toUpperCase().replace(/[\s-]+/g, "_") ||
          "FULL_TIME",
        hiringOrganization: {
          "@type": "Organization",
          name: "Dynime LLC.",
          sameAs: "https://dynime.com",
        },
        jobLocation: {
          "@type": "Place",
          address: {
            "@type": "PostalAddress",
            addressLocality: j.location,
          },
        },
        ...(j.remote && {
          jobLocationType: "TELECOMMUTE",
          applicantLocationRequirements: {
            "@type": "Country",
            name: "Worldwide",
          },
        }),
      })),
    ],
  });

  return (
    <Layout>
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="section-padding relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-60"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 0%, hsl(var(--primary) / 0.14), transparent 70%)",
          }}
        />
        <div className="container-custom text-center max-w-3xl mx-auto">
          <ScrollReveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 backdrop-blur px-3 py-1 text-xs font-medium text-muted-foreground mb-5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              We're hiring globally
            </span>
            <h1 className="font-heading text-4xl md:text-6xl font-bold mt-5 mb-5">
              Build the future{" "}
              <span className="gradient-text">with us</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Join a global team of designers, engineers, and strategists
              shaping world-class digital products. Remote-first, ambitious, and human.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Perks Grid ────────────────────────────────────────────── */}
      <section className="pb-10 md:pb-14">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {perks.map((p, i) => (
              <ScrollReveal key={p.title} delay={i * 0.08}>
                <div className="rounded-2xl border border-border/60 bg-card/50 p-5 text-center h-full hover:bg-card/80 hover:border-border transition-all duration-200">
                  <p.icon className="w-6 h-6 text-primary mx-auto mb-3" />
                  <h3 className="font-heading font-semibold text-sm mb-1">
                    {p.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">{p.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Jobs Section ──────────────────────────────────────────── */}
      <section className="section-padding bg-card/20">
        <div className="container-custom">
          <ScrollReveal>
            <div className="text-center mb-12">
              <span className="text-primary text-sm font-semibold uppercase tracking-wider">
                Open Positions
              </span>
              <h2 className="font-heading text-3xl md:text-4xl font-bold mt-3">
                Find your next role
              </h2>
              <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
                We're always looking for talented people who are passionate about
                building great things.
              </p>
            </div>
          </ScrollReveal>

          {/* ── Filter Panel ──────────────────────────────────────── */}
          <div className="max-w-5xl mx-auto mb-10">
            <div className="rounded-2xl border border-border/50 bg-background/60 backdrop-blur-md p-5 shadow-sm space-y-4">
              {/* Remote Toggle on Top */}
              <div className="flex items-center justify-between pb-3 border-b border-border/20">
                <button
                  type="button"
                  onClick={() => setRemoteOnly(!remoteOnly)}
                  className="flex items-center gap-3 group text-sm font-semibold text-foreground/85 focus:outline-none cursor-pointer select-none"
                >
                  <div
                    className={`w-11 h-6 rounded-full relative transition-all duration-300 ${
                      remoteOnly
                        ? "bg-primary shadow-sm shadow-primary/30"
                        : "bg-muted border border-border/80"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${
                        remoteOnly ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </div>
                  <span className="flex items-center gap-1.5">
                    <Wifi className="w-3.5 h-3.5 text-muted-foreground/60" />
                    Remote Only
                  </span>
                </button>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
                  >
                    <X className="w-3.5 h-3.5" />
                    Clear filters
                  </button>
                )}
              </div>

              {/* Search + Dropdowns */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {/* Search */}
                <div className="relative md:col-span-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none" />
                  <Input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search roles…"
                    className="pl-9 pr-9 h-10 rounded-xl border-border/60 bg-background/80 focus-visible:ring-ring/50"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Department */}
                <FilterSelect
                  value={department}
                  onChange={setDepartment}
                  placeholder="All Departments"
                  options={filterOptions.departments}
                />

                {/* Employment Type */}
                <FilterSelect
                  value={employmentType}
                  onChange={setEmploymentType}
                  placeholder="All Types"
                  options={filterOptions.empTypes}
                />

                {/* Experience Level */}
                <FilterSelect
                  value={experience}
                  onChange={setExperience}
                  placeholder="All Levels"
                  options={filterOptions.experiences}
                />
              </div>

              {/* Active filter chips */}
              {hasActiveFilters && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {remoteOnly && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs px-3 py-1 font-medium">
                      <Wifi className="w-3 h-3" /> Remote Only
                      <button onClick={() => setRemoteOnly(false)} className="ml-1 hover:text-primary/60">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {department && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted border border-border/60 text-foreground/80 text-xs px-3 py-1 font-medium">
                      {department}
                      <button onClick={() => setDepartment("")} className="ml-1 hover:text-foreground/50">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {employmentType && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted border border-border/60 text-foreground/80 text-xs px-3 py-1 font-medium">
                      {employmentType}
                      <button onClick={() => setEmploymentType("")} className="ml-1 hover:text-foreground/50">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {experience && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted border border-border/60 text-foreground/80 text-xs px-3 py-1 font-medium">
                      {experience}
                      <button onClick={() => setExperience("")} className="ml-1 hover:text-foreground/50">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {search && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted border border-border/60 text-foreground/80 text-xs px-3 py-1 font-medium">
                      "{search}"
                      <button onClick={() => setSearch("")} className="ml-1 hover:text-foreground/50">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Results count */}
            {!isLoading && !isError && (
              <p className="text-xs text-muted-foreground mt-3 ml-1">
                {filteredJobs.length === 0
                  ? "No positions match your filters"
                  : `${filteredJobs.length} open position${filteredJobs.length !== 1 ? "s" : ""}`}
                {hasActiveFilters && " · filtered"}
              </p>
            )}
          </div>

          {/* ── Job Cards ─────────────────────────────────────────── */}
          {isLoading ? (
            <div className="max-w-5xl mx-auto space-y-4">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-border/40 bg-card/40 p-6 space-y-3 animate-pulse"
                >
                  <div className="h-4 w-24 bg-muted/50 rounded-full" />
                  <div className="h-7 w-2/3 bg-muted/40 rounded" />
                  <div className="h-4 w-1/2 bg-muted/30 rounded" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-16 max-w-5xl mx-auto">
              <Briefcase className="w-12 h-12 text-destructive mx-auto mb-4 opacity-50" />
              <h3 className="font-heading text-lg font-bold text-foreground mb-2">
                Error loading positions
              </h3>
              <p className="text-muted-foreground text-sm">
                We couldn't load the jobs listing. Please refresh the page or try again later.
              </p>
            </div>
          ) : filteredJobs.length > 0 ? (
            <div className="max-w-5xl mx-auto space-y-4">
              {filteredJobs.map((job) => (
                <ScrollReveal key={job.flowmingo_job_id} delay={0.04}>
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
          ) : (
            <div className="text-center py-16 max-w-5xl mx-auto border border-dashed border-border/60 rounded-2xl bg-background/20">
              <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
              <h3 className="font-heading text-lg font-bold text-foreground mb-2">
                No open positions found
              </h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                No roles match your filters. Try adjusting or clearing your search.
              </p>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  className="mt-5 rounded-full text-xs"
                >
                  Clear all filters
                </Button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── CTA Banner ────────────────────────────────────────────── */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-card/60 to-card/30 p-10 md:p-14 text-center">
            <h2 className="font-heading text-2xl md:text-3xl font-bold mb-3">
              Don't see your role?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-6">
              We're always looking for exceptional talent. Send us your profile and tell us how you'd contribute.
            </p>
            <Button asChild size="lg" className="rounded-full px-8">
              <Link to="/contact">Get in touch</Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Careers;

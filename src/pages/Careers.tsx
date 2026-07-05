import { useState, useMemo, useEffect } from "react";
import { useSyncedJobs } from "@/hooks/use-cms-data";
import { type SyncedJob } from "@/lib/api";
import Layout from "@/components/layout/Layout";
import { usePageSEO } from "@/hooks/use-page-seo";
import { SEO_DEFAULTS } from "@/lib/seo-defaults";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DOMPurify from "isomorphic-dompurify";
import { marked } from "marked";
import {
  Briefcase, MapPin, Clock, ArrowRight, Sparkles,
  Heart, Globe, Rocket, Users, Search, X,
  DollarSign, ChevronRight, Wifi, Star, CheckCircle2,
  Calendar, Shield, Share2, ArrowLeft, Share
} from "lucide-react";
import { toast } from "sonner";

const perks = [
  { icon: Globe, title: "Remote-first", desc: "Work from anywhere in the world" },
  { icon: Rocket, title: "Fast growth", desc: "Own meaningful work from day one" },
  { icon: Heart, title: "Great benefits", desc: "Health, equity & flexible time off" },
  { icon: Users, title: "Inclusive culture", desc: "Diverse teams, strong values" },
];

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
  <div className="relative">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-11 px-4 pr-10 rounded-xl border border-border/60 bg-background/80 text-sm text-foreground/80 focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all appearance-none cursor-pointer font-medium"
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/60">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────
// Job Detail View Pane Component
// ─────────────────────────────────────────────────────────────────
interface JobDetailPaneProps {
  job: SyncedJob;
  onBack?: () => void; // Mobile back button
}

const JobDetailPane = ({ job, onBack }: JobDetailPaneProps) => {
  // Parse markdown description to html
  const cleanHtml = useMemo(() => {
    if (!job.description) return "";
    const isMarkdown = job.description.includes('#') || job.description.includes('*') || job.description.includes('\n\n');
    const rawHtml = isMarkdown ? marked.parse(job.description) as string : job.description;
    return DOMPurify.sanitize(rawHtml, {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ["img", "picture", "source", "figure", "svg", "video", "iframe"],
      FORBID_ATTR: ["style", "background"],
    });
  }, [job.description]);

  // Workplace clean
  const displayWorkplace = useMemo(() => {
    if (!job.location) return ["Remote"];
    return job.location.replace(/\([^)]*\)/g, "").split(/[\/,]/).map(t => t.trim()).filter(Boolean);
  }, [job.location]);

  // Salary clean
  const displaySalary = useMemo(() => {
    if (job.salary_range) return job.salary_range;
    if (job.salary_min != null && job.salary_max != null) {
      return `${job.salary_currency || 'USD'} ${Number(job.salary_min).toLocaleString()} – ${Number(job.salary_max).toLocaleString()}`;
    }
    return "Negotiable";
  }, [job.salary_range, job.salary_min, job.salary_max, job.salary_currency]);

  const handleShare = async () => {
    const url = `${window.location.origin}/careers/${job.slug}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: job.title, url });
        return;
      } catch {
        /* fall through */
      }
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  const handleApplyRedirect = () => {
    if (job.apply_url) {
      window.open(job.apply_url, "_blank", "noopener,noreferrer");
    } else {
      toast.error("Application URL not found.");
    }
  };

  return (
    <div className="bg-background border border-border/60 rounded-2xl p-6 md:p-8 space-y-8 shadow-sm h-full overflow-y-auto max-h-[85vh] sticky top-24">
      {/* Mobile Header Row */}
      {onBack && (
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors font-semibold md:hidden mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to open positions
        </button>
      )}

      {/* Title & Action Row */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-border/20">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase tracking-[0.15em] text-primary font-bold bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
              {job.department}
            </span>
            {job.featured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                <Star className="w-2.5 h-2.5" /> Featured
              </span>
            )}
          </div>
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground leading-snug">
            {job.title}
          </h2>
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {job.location}
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {job.employment_type || "Full-time"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={handleApplyRedirect}
            size="lg"
            className="font-bold bg-primary hover:bg-primary/95 text-primary-foreground rounded-xl shadow-md shadow-primary/10 px-6"
          >
            Apply Now
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleShare}
            className="rounded-xl border-border/80 text-foreground hover:bg-muted"
            title="Share Position"
          >
            <Share className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Meta Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-card/40 border border-border/40 text-sm">
        <div>
          <span className="text-xs uppercase tracking-wider text-muted-foreground block mb-0.5">Salary</span>
          <span className="font-semibold text-foreground">{displaySalary}</span>
        </div>
        <div>
          <span className="text-xs uppercase tracking-wider text-muted-foreground block mb-0.5">Workplace</span>
          <span className="font-semibold text-foreground">{displayWorkplace.join(", ")}</span>
        </div>
        <div>
          <span className="text-xs uppercase tracking-wider text-muted-foreground block mb-0.5">Employment</span>
          <span className="font-semibold text-foreground">{job.employment_type || "Full-time"}</span>
        </div>
        <div>
          <span className="text-xs uppercase tracking-wider text-muted-foreground block mb-0.5">Experience</span>
          <span className="font-semibold text-foreground">{job.experience || "Mid-Senior"}</span>
        </div>
      </div>

      {/* Description Content */}
      <div className="space-y-6">
        {cleanHtml && (
          <article
            className="prose prose-neutral dark:prose-invert max-w-none
              prose-headings:font-heading prose-headings:font-bold
              prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3
              prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-2
              prose-p:text-foreground/80 prose-p:leading-relaxed prose-li:text-foreground/80
              prose-a:text-primary hover:prose-a:text-primary/80
              prose-strong:text-foreground
              prose-ul:my-3 prose-ol:my-3"
            dangerouslySetInnerHTML={{ __html: cleanHtml }}
          />
        )}

        {/* Side by side Requirements & Responsibilities cards if they exist */}
        {(job.responsibilities?.length > 0 || job.requirements?.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border/10">
            {job.responsibilities?.length > 0 && (
              <div className="rounded-xl border border-border/40 bg-card/30 p-5">
                <h3 className="font-heading font-bold text-base mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" /> Key Responsibilities
                </h3>
                <ul className="space-y-2">
                  {job.responsibilities.map((r, i) => (
                    <li key={i} className="flex gap-2 text-xs text-foreground/80 leading-relaxed">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {job.requirements?.length > 0 && (
              <div className="rounded-xl border border-border/40 bg-card/30 p-5">
                <h3 className="font-heading font-bold text-base mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" /> Requirements
                </h3>
                <ul className="space-y-2">
                  {job.requirements.map((r, i) => (
                    <li key={i} className="flex gap-2 text-xs text-foreground/80 leading-relaxed">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Benefits & Perks */}
        {job.benefits?.length > 0 && (
          <div className="rounded-xl border border-border/40 bg-card/30 p-5">
            <h3 className="font-heading font-bold text-base mb-3 flex items-center gap-2">
              <Heart className="w-4 h-4 text-primary" /> Benefits & Perks
            </h3>
            <ul className="space-y-2">
              {job.benefits.map((b, i) => (
                <li key={i} className="flex gap-2 text-xs text-foreground/80 leading-relaxed">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Redirection Notice Banner */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card/50 to-indigo-500/5 p-6 text-center relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
            <Shield className="w-3.5 h-3.5" /> SECURE REDIRECTION
          </span>
          <h4 className="font-heading text-lg font-bold">Apply for this role</h4>
          <p className="text-muted-foreground text-xs max-w-sm mx-auto leading-relaxed">
            Clicking below will launch the candidate evaluation form directly on our hiring partner portal Flowmingo.
          </p>
          <Button
            onClick={handleApplyRedirect}
            className="font-semibold bg-primary hover:bg-primary/95 text-primary-foreground px-6 py-2 rounded-full shadow-lg shadow-primary/20 transition-all duration-300 gap-1.5 group"
          >
            Start Application <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Main Careers Component
// ─────────────────────────────────────────────────────────────────
const Careers = () => {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [experience, setExperience] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  
  // Selection state
  const [selectedJob, setSelectedJob] = useState<SyncedJob | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  // Fetch all jobs (no pagination — per_page=100)
  const { data, isLoading, isError } = useSyncedJobs({
    per_page: 100,
  });

  // Derive unique filter options dynamically
  const filterOptions = useMemo(() => {
    const jobs = data?.data ?? [];
    const departments = [...new Set(jobs.map((j) => j.department).filter(Boolean))].sort();
    const empTypes = [...new Set(jobs.map((j) => j.employment_type).filter(Boolean))].sort();
    const experiences = [...new Set(jobs.map((j) => j.experience).filter(Boolean))].sort() as string[];
    return { departments, empTypes, experiences };
  }, [data]);

  // Client-side filtering
  const filteredJobs = useMemo(() => {
    const jobs = data?.data ?? [];
    return jobs.filter((job) => {
      if (remoteOnly && !job.remote) return false;
      if (department && job.department?.toLowerCase() !== department.toLowerCase()) return false;
      if (employmentType && job.employment_type?.toLowerCase() !== employmentType.toLowerCase()) return false;
      if (experience && job.experience?.toLowerCase() !== experience.toLowerCase()) return false;
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

  // Automatically select first job when data loads or filters change
  useEffect(() => {
    if (filteredJobs.length > 0) {
      // Keep selection if it is still in the list, otherwise select first
      const stillInList = filteredJobs.find(j => j.flowmingo_job_id === selectedJob?.flowmingo_job_id);
      if (!stillInList) {
        setSelectedJob(filteredJobs[0]);
      }
    } else {
      setSelectedJob(null);
    }
  }, [filteredJobs, selectedJob]);

  const hasActiveFilters = search || department || employmentType || experience || remoteOnly;

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

  return (
    <Layout>
      {/* Hero & Search Banner */}
      <section className="pt-12 md:pt-16 pb-6 relative overflow-hidden bg-gradient-to-b from-primary/5 via-transparent to-transparent border-b border-border/30">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto text-center mb-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 backdrop-blur px-3 py-1 text-xs font-medium text-muted-foreground mb-4">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              We're hiring globally
            </span>
            <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4 tracking-tight">
              Find your <span className="gradient-text">dream job</span>
            </h1>
            <p className="text-muted-foreground text-sm max-w-xl mx-auto">
              Browse our open positions below. Work with an ambitious, global, remote-first team building world-class products.
            </p>
          </div>

          {/* Filter Panel */}
          <div className="max-w-6xl mx-auto rounded-2xl border border-border/50 bg-background/60 backdrop-blur-md p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/20">
              <button
                type="button"
                onClick={() => setRemoteOnly(!remoteOnly)}
                className="flex items-center gap-3 group text-sm font-semibold text-foreground/85 focus:outline-none cursor-pointer select-none"
              >
                <div
                  className={`w-11 h-6 rounded-full relative transition-all duration-300 ${
                    remoteOnly ? "bg-primary shadow-sm shadow-primary/30" : "bg-muted border border-border/80"
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

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Search */}
              <div className="relative md:col-span-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none" />
                <Input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search jobs..."
                  className="pl-9 pr-9 h-11 rounded-xl border-border/60 bg-background/80 font-medium"
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
          </div>
        </div>
      </section>

      {/* 2-Column Split Job Board Section */}
      <section className="section-padding bg-card/10">
        <div className="container-custom max-w-7xl">
          {isLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-6">
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-32 bg-muted/40 animate-pulse rounded-2xl border border-border/40" />
                ))}
              </div>
              <div className="h-[60vh] bg-muted/30 animate-pulse rounded-2xl border border-border/40 hidden lg:block" />
            </div>
          ) : isError ? (
            <div className="text-center py-16">
              <Briefcase className="w-12 h-12 text-destructive mx-auto mb-4 opacity-50" />
              <h3 className="font-heading text-lg font-bold text-foreground mb-2">Error loading positions</h3>
              <p className="text-muted-foreground text-sm">We couldn't load jobs right now. Please try again later.</p>
            </div>
          ) : filteredJobs.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1.8fr] gap-6 items-start">
              {/* Left Column: Job Cards List */}
              <div className={`space-y-3.5 ${mobileDetailOpen ? "hidden md:block" : "block"}`}>
                <div className="flex justify-between items-center mb-4 px-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {filteredJobs.length} Job Posting{filteredJobs.length !== 1 ? "s" : ""} Available
                  </span>
                </div>

                <div className="space-y-3">
                  {filteredJobs.map((job) => {
                    const isSelected = selectedJob?.flowmingo_job_id === job.flowmingo_job_id;
                    const salaryText = job.salary_range || "Negotiable";

                    return (
                      <button
                        key={job.flowmingo_job_id}
                        onClick={() => {
                          setSelectedJob(job);
                          setMobileDetailOpen(true);
                        }}
                        className={`w-full text-left p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between h-auto gap-4 relative overflow-hidden group ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-md shadow-primary/5"
                            : "border-border/50 bg-background/50 hover:bg-background/80 hover:border-border"
                        }`}
                      >
                        <div className="flex gap-4 items-start w-full">
                          {/* Icon Block */}
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                            isSelected ? "bg-primary/10 border-primary/20 text-primary" : "bg-card border-border/80 text-muted-foreground"
                          }`}>
                            <Briefcase className="w-5 h-5" />
                          </div>

                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">
                                {job.department}
                              </span>
                              {job.featured && (
                                <span className="text-[9px] font-extrabold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full uppercase tracking-widest shrink-0">
                                  Featured
                                </span>
                              )}
                            </div>
                            <h3 className="font-heading font-bold text-base md:text-lg text-foreground group-hover:text-primary transition-colors leading-tight truncate">
                              {job.title}
                            </h3>
                            <p className="text-xs text-muted-foreground font-medium flex flex-wrap gap-x-2 gap-y-1 items-center">
                              <span className="inline-flex items-center gap-0.5"><MapPin className="w-3 h-3" /> {job.location}</span>
                              <span>·</span>
                              <span className="inline-flex items-center gap-0.5"><Clock className="w-3 h-3" /> {job.employment_type || "Full-time"}</span>
                              <span>·</span>
                              <span className="inline-flex items-center gap-0.5"><DollarSign className="w-3 h-3" /> {salaryText}</span>
                            </p>
                          </div>
                        </div>

                        {/* Card Bottom Meta */}
                        <div className="border-t border-border/30 pt-3 flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                          <span className="inline-flex items-center gap-1">
                            <Star className="w-3 h-3 text-amber-500" /> Company Verified
                          </span>
                          <span className="inline-flex items-center gap-1 group-hover:text-primary transition-colors">
                            View details <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Selected Job Details */}
              <div className={`${mobileDetailOpen ? "block" : "hidden md:block"} h-full`}>
                {selectedJob ? (
                  <JobDetailPane
                    job={selectedJob}
                    onBack={() => setMobileDetailOpen(false)}
                  />
                ) : (
                  <div className="bg-background border border-dashed border-border/80 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[50vh] hidden lg:flex">
                    <Briefcase className="w-12 h-12 text-muted-foreground opacity-40 mb-3" />
                    <h3 className="font-heading text-lg font-bold text-foreground">Select a role</h3>
                    <p className="text-muted-foreground text-sm max-w-xs mt-1">
                      Choose an open position from the list to view full details and apply.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 max-w-5xl mx-auto border border-dashed border-border/60 rounded-2xl bg-background/20">
              <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
              <h3 className="font-heading text-lg font-bold text-foreground mb-2">No open positions found</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                No roles match your filters. Try adjusting or clearing your search.
              </p>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={handleResetFilters} className="mt-5 rounded-full text-xs">
                  Clear all filters
                </Button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Perks Grid */}
      <section className="pb-14 border-t border-border/30 pt-14 bg-card/5">
        <div className="container-custom max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {perks.map((p, i) => (
              <ScrollReveal key={p.title} delay={i * 0.08}>
                <div className="rounded-2xl border border-border/60 bg-card/50 p-5 text-center h-full hover:bg-card/85 hover:border-border transition-all duration-200">
                  <p.icon className="w-6 h-6 text-primary mx-auto mb-3" />
                  <h3 className="font-heading font-semibold text-sm mb-1">{p.title}</h3>
                  <p className="text-xs text-muted-foreground">{p.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Spontaneous CTA Banner */}
      <section className="pb-16 pt-6">
        <div className="container-custom">
          <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-card/60 to-card/30 p-10 md:p-14 text-center">
            <h2 className="font-heading text-2xl md:text-3xl font-bold mb-3">Don't see your role?</h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-6">
              We're always looking for exceptional talent. Send us your profile and tell us how you'd contribute.
            </p>
            <Button asChild size="lg" className="rounded-full px-8">
              <a href="/contact">Get in touch</a>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Careers;

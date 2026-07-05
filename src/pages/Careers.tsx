import { useState, useMemo, useEffect } from "react";
import { useSyncedJobs } from "@/hooks/use-cms-data";
import { type SyncedJob } from "@/lib/api";
import Layout from "@/components/layout/Layout";
import { usePageSEO } from "@/hooks/use-page-seo";
import { SEO_DEFAULTS } from "@/lib/seo-defaults";
import DOMPurify from "isomorphic-dompurify";
import { marked } from "marked";
import {
  Briefcase, MapPin, Clock, Search, X,
  DollarSign, Star, CheckCircle2, ChevronRight,
  Shield, Heart, Users, Check, ArrowLeft, Bookmark
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Helper to get a deterministic fake applicant count and rating
const getJobMeta = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const rating = (4.0 + (Math.abs(hash) % 10) / 10).toFixed(1);
  const applicants = (Math.abs(hash) % 40) + 5;
  return { rating, applicants };
};

// Beautiful brand logos mapping based on title/department to look premium
const JobBrandLogo = ({ job, className = "w-11 h-11" }: { job: SyncedJob; className?: string }) => {
  const title = job.title.toLowerCase();
  
  let bg = "bg-blue-600/10 text-blue-600 border-blue-600/20";
  let letter = "D";

  if (title.includes("social") || title.includes("brand")) {
    bg = "bg-sky-500/10 text-sky-500 border-sky-500/20";
    letter = "S";
  } else if (title.includes("seo") || title.includes("content")) {
    bg = "bg-rose-500/10 text-rose-500 border-rose-500/20";
    letter = "C";
  } else if (title.includes("market")) {
    bg = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    letter = "P";
  } else if (title.includes("partner") || title.includes("outreach")) {
    bg = "bg-indigo-500/10 text-indigo-500 border-indigo-500/20";
    letter = "O";
  } else if (title.includes("sales") || title.includes("sdr") || title.includes("business")) {
    bg = "bg-amber-500/10 text-amber-500 border-amber-500/20";
    letter = "S";
  } else if (title.includes("crm") || title.includes("automation")) {
    bg = "bg-purple-500/10 text-purple-500 border-purple-500/20";
    letter = "A";
  } else if (title.includes("operation") || title.includes("project")) {
    bg = "bg-teal-500/10 text-teal-500 border-teal-500/20";
    letter = "M";
  } else if (title.includes("growth") || title.includes("revenue")) {
    bg = "bg-violet-500/10 text-violet-500 border-violet-500/20";
    letter = "G";
  }

  return (
    <div className={`${className} rounded-2xl flex items-center justify-center shrink-0 border font-heading font-extrabold text-lg ${bg}`}>
      {letter}
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
// Job Detail View Pane Component (Mockup Matched)
// ─────────────────────────────────────────────────────────────────
interface JobDetailPaneProps {
  job: SyncedJob;
  onBack?: () => void;
}

const JobDetailPane = ({ job, onBack }: JobDetailPaneProps) => {
  const { rating, applicants } = useMemo(() => getJobMeta(job.flowmingo_job_id), [job.flowmingo_job_id]);

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

  const displaySalary = useMemo(() => {
    if (job.salary_range) return job.salary_range;
    if (job.salary_min != null && job.salary_max != null) {
      return `${job.salary_currency || 'USD'} ${Number(job.salary_min).toLocaleString()} – ${Number(job.salary_max).toLocaleString()}`;
    }
    return "Negotiable";
  }, [job.salary_range, job.salary_min, job.salary_max, job.salary_currency]);

  const handleApplyRedirect = () => {
    if (job.apply_url) {
      window.open(job.apply_url, "_blank", "noopener,noreferrer");
    } else {
      toast.error("Application URL not found.");
    }
  };

  return (
    <div className="bg-background border border-border/50 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm overflow-y-auto h-full scrollbar-thin">
      {onBack && (
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-bold md:hidden mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to List
        </button>
      )}

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4 pb-5 border-b border-border/20">
        <div className="flex gap-4 items-start">
          <JobBrandLogo job={job} className="w-14 h-14" />
          <div className="space-y-1">
            <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground leading-tight flex items-center gap-1.5">
              {job.title} <span className="text-primary font-normal text-lg">+</span>
            </h2>
            <p className="text-xs text-muted-foreground font-semibold flex flex-wrap gap-x-2 gap-y-1 items-center">
              <span>Dynime LLC.</span>
              <span>·</span>
              <span className="inline-flex items-center gap-0.5"><MapPin className="w-3 h-3" /> {job.location}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-0.5"><Clock className="w-3 h-3" /> {job.employment_type || "Full-time"}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            onClick={handleApplyRedirect}
            className="flex-1 sm:flex-none font-bold bg-primary hover:bg-primary/95 text-primary-foreground rounded-xl px-6 h-10 shadow-sm"
          >
            Apply Now
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="rounded-xl border-border/80 text-foreground hover:bg-muted shrink-0 w-10 h-10"
            title="Save Job"
          >
            <Bookmark className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Job Overview */}
      <div className="space-y-3">
        <h3 className="font-heading font-bold text-base text-foreground flex items-center gap-1">
          Job Overview <span className="text-primary font-normal">+</span>
        </h3>
        {cleanHtml && (
          <article
            className="prose prose-neutral dark:prose-invert max-w-none text-sm text-foreground/80 leading-relaxed
              prose-headings:font-heading prose-headings:font-bold prose-headings:text-base prose-headings:my-2
              prose-p:my-2 prose-li:my-1"
            dangerouslySetInnerHTML={{ __html: cleanHtml }}
          />
        )}
      </div>

      {/* Responsibilities list if extracted */}
      {job.responsibilities && job.responsibilities.length > 0 && (
        <div className="space-y-3 pt-3 border-t border-border/10">
          <h3 className="font-heading font-bold text-base text-foreground flex items-center gap-1">
            What You Will Do <span className="text-primary font-normal">+</span>
          </h3>
          <ul className="grid grid-cols-1 gap-2.5">
            {job.responsibilities.map((resp, i) => (
              <li key={i} className="flex gap-3 text-sm text-foreground/80 leading-normal items-start">
                <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-500/20">
                  <Check className="w-3.5 h-3.5" />
                </span>
                <span>{resp}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* About Company footer card */}
      <div className="pt-6 border-t border-border/20 space-y-4">
        <h3 className="font-heading font-bold text-base text-foreground flex items-center gap-1">
          About Dynime <span className="text-primary font-normal">+</span>
        </h3>
        <div className="rounded-xl border border-border/40 bg-card/25 p-5 flex flex-col sm:flex-row gap-4 items-start justify-between">
          <div className="flex gap-3.5 items-start">
            <div className="w-11 h-11 bg-primary text-primary-foreground rounded-xl flex items-center justify-center font-heading font-bold text-base shrink-0">
              d
            </div>
            <div className="space-y-1">
              <span className="font-heading font-bold text-sm text-foreground">Dynime Agency</span>
              <p className="text-xs text-muted-foreground max-w-md leading-normal">
                Dynime is a global AI Software Development Company & Digital Transformation partner. We build beautiful, performant software.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="rounded-lg text-xs font-bold border-border/80 text-foreground hover:bg-muted w-full sm:w-auto">
            Follow
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Main Careers Page
// ─────────────────────────────────────────────────────────────────
const Careers = () => {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [experience, setExperience] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  
  // Selection
  const [selectedJob, setSelectedJob] = useState<SyncedJob | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  // Fetch jobs
  const { data, isLoading, isError } = useSyncedJobs({ per_page: 100 });

  // Filter options
  const filterOptions = useMemo(() => {
    const jobs = data?.data ?? [];
    const departments = [...new Set(jobs.map((j) => j.department).filter(Boolean))].sort();
    const empTypes = [...new Set(jobs.map((j) => j.employment_type).filter(Boolean))].sort();
    const experiences = [...new Set(jobs.map((j) => j.experience).filter(Boolean))].sort() as string[];
    return { departments, empTypes, experiences };
  }, [data]);

  // Filtering
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

  // Selection Sync
  useEffect(() => {
    if (filteredJobs.length > 0) {
      const stillInList = filteredJobs.find(j => j.flowmingo_job_id === selectedJob?.flowmingo_job_id);
      if (!stillInList) {
        setSelectedJob(filteredJobs[0]);
      }
    } else {
      setSelectedJob(null);
    }
  }, [filteredJobs, selectedJob]);

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
  });

  return (
    <Layout>
      <div className="bg-slate-50/50 min-h-screen pb-16">
        
        {/* ── Top Header Banner (Mockup Styled) ────────────────────── */}
        <section className="bg-blue-600 text-white relative overflow-hidden py-14 px-6 md:px-12 text-center md:text-left flex flex-col md:flex-row md:items-center justify-between gap-6 max-w-7xl mx-auto md:rounded-3xl mt-4 md:mt-6">
          <div className="space-y-2.5 relative z-10 max-w-2xl">
            <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight">
              Find your dream job
            </h1>
            <p className="text-blue-100 text-sm md:text-base font-medium">
              Looking for jobs? Browse our latest job openings to view and apply.
            </p>
          </div>
          <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none hidden lg:block select-none">
            {/* Dynamic visual placeholder matching header patterns */}
            <svg width="400" height="100%" fill="none" viewBox="0 0 400 300">
              <path d="M50 0h100l-50 300H0z" fill="currentColor"/>
              <path d="M180 0h80L160 300h-80z" fill="currentColor"/>
              <path d="M300 0h100L300 300H200z" fill="currentColor"/>
            </svg>
          </div>
        </section>

        {/* ── Filters Section (Mockup Styled) ─────────────────────── */}
        <section className="max-w-7xl mx-auto px-4 mt-6">
          <div className="bg-background rounded-2xl border border-border/50 p-4 md:p-5 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-center">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none" />
                <Input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search jobs..."
                  className="pl-9 pr-9 h-11 rounded-xl border-border/60 bg-background font-medium text-sm focus-visible:ring-ring/40"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Department */}
              <FilterSelect value={department} onChange={setDepartment} placeholder="Location / Dept" options={filterOptions.departments} />

              {/* Employment Type */}
              <FilterSelect value={employmentType} onChange={setEmploymentType} placeholder="Job Type" options={filterOptions.empTypes} />

              {/* Experience */}
              <FilterSelect value={experience} onChange={setExperience} placeholder="Experience" options={filterOptions.experiences} />

              {/* Remote only toggle */}
              <button
                onClick={() => setRemoteOnly(!remoteOnly)}
                className={`w-full h-11 px-4 rounded-xl border font-semibold text-sm transition-all flex items-center justify-between select-none ${
                  remoteOnly ? "bg-primary/5 border-primary text-primary" : "border-border/60 text-muted-foreground bg-background hover:bg-muted/40"
                }`}
              >
                <span>Remote Only</span>
                <span className={`w-2 h-2 rounded-full ${remoteOnly ? "bg-primary animate-pulse" : "bg-muted-foreground/30"}`} />
              </button>
            </div>
            
            {/* Active filters summary */}
            {(search || department || employmentType || experience || remoteOnly) && (
              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-muted-foreground font-medium">Active filters apply</span>
                <button onClick={handleResetFilters} className="text-primary font-bold hover:underline">Reset Filters</button>
              </div>
            )}
          </div>
        </section>

        {/* ── Main Two-Column Split Layout (Fixed & Sticky) ────────── */}
        <section className="max-w-7xl mx-auto px-4 mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1.8fr] gap-6 h-[75vh]">
              <div className="space-y-3.5 overflow-hidden">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-28 bg-muted/40 animate-pulse rounded-2xl border border-border/40" />
                ))}
              </div>
              <div className="bg-muted/20 animate-pulse rounded-2xl border border-border/40 hidden lg:block" />
            </div>
          ) : isError ? (
            <div className="text-center py-16 bg-background rounded-2xl border border-border/50">
              <Briefcase className="w-12 h-12 text-destructive mx-auto mb-4 opacity-40" />
              <h3 className="font-heading text-lg font-bold text-foreground">Failed to load offers</h3>
              <p className="text-muted-foreground text-sm">Please refresh the page to reload the listing.</p>
            </div>
          ) : filteredJobs.length > 0 ? (
            /* Split Container: height locks to screen on large screens, enabling dual column scrolling */
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1.8fr] gap-6 items-start lg:h-[78vh] lg:max-h-[850px] overflow-hidden">
              
              {/* LEFT Column: Sticky & Independently Scrollable Jobs List */}
              <div className={`h-full flex flex-col ${mobileDetailOpen ? "hidden md:flex" : "flex"}`}>
                <div className="mb-3 px-1 flex justify-between items-center text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
                  <span>Related Jobs</span>
                  <span>{filteredJobs.length} posting{filteredJobs.length !== 1 ? "s" : ""}</span>
                </div>
                
                {/* Scrollable list box */}
                <div className="flex-1 overflow-y-auto pr-1 space-y-3 scrollbar-thin pb-4">
                  {filteredJobs.map((job) => {
                    const isSelected = selectedJob?.flowmingo_job_id === job.flowmingo_job_id;
                    const { rating, applicants } = getJobMeta(job.flowmingo_job_id);

                    return (
                      <button
                        key={job.flowmingo_job_id}
                        onClick={() => {
                          setSelectedJob(job);
                          setMobileDetailOpen(true);
                        }}
                        className={`w-full text-left p-5 rounded-2xl border transition-all duration-200 flex flex-col gap-3 relative overflow-hidden bg-background ${
                          isSelected
                            ? "border-primary shadow-sm ring-1 ring-primary/40 bg-primary/[0.02]"
                            : "border-border/50 hover:bg-card/40 hover:border-border/80"
                        }`}
                      >
                        {/* Upper row: icon + title */}
                        <div className="flex gap-3.5 items-start w-full">
                          <JobBrandLogo job={job} className="w-11 h-11" />
                          <div className="space-y-0.5 flex-1 min-w-0">
                            <h3 className="font-heading font-bold text-sm md:text-base text-foreground leading-tight truncate flex items-center gap-1">
                              {job.title} <span className="text-primary font-normal text-sm">+</span>
                            </h3>
                            <span className="text-[11px] font-bold text-muted-foreground block truncate">
                              {job.department}
                            </span>
                            <p className="text-[11px] text-muted-foreground/80 font-medium pt-1 flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-0.5"><MapPin className="w-3 h-3 text-muted-foreground/50" /> {job.location}</span>
                              <span>·</span>
                              <span>{job.employment_type || "Full-time"}</span>
                            </p>
                          </div>
                        </div>

                        {/* Dotted divider line */}
                        <div className="border-t border-dashed border-border/60 w-full pt-2" />

                        {/* Bottom Row metadata (mockup styles) */}
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground/80 font-semibold pt-1">
                          <span className="inline-flex items-center gap-1 text-amber-500">
                            <Star className="w-3.5 h-3.5 fill-amber-500 stroke-none" /> {rating} Trusted
                          </span>
                          <span>{applicants} Applicants</span>
                          <span className="inline-flex items-center gap-1 text-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-500/10" /> Verified
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT Column: Independently Scrollable Job Details Panel */}
              <div className={`h-full ${mobileDetailOpen ? "block" : "hidden md:block"}`}>
                {selectedJob ? (
                  <JobDetailPane job={selectedJob} onBack={() => setMobileDetailOpen(false)} />
                ) : (
                  <div className="bg-background border border-dashed border-border/80 rounded-2xl p-12 text-center flex flex-col items-center justify-center h-full">
                    <Briefcase className="w-10 h-10 text-muted-foreground opacity-30 mb-3" />
                    <h3 className="font-heading text-base font-bold text-foreground">Select an offer</h3>
                    <p className="text-muted-foreground text-xs max-w-xs mt-1">
                      Pick any job posting from the left pane to view requirements, benefits, and apply details.
                    </p>
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="text-center py-16 bg-background border border-dashed border-border/60 rounded-2xl">
              <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
              <h3 className="font-heading text-lg font-bold text-foreground mb-2">No positions found</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                Try adjusting your search terms or filters.
              </p>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={handleResetFilters} className="mt-5 rounded-full text-xs">
                  Clear all filters
                </Button>
              )}
            </div>
          )}
        </section>

      </div>
    </Layout>
  );
};

export default Careers;

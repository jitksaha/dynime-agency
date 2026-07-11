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
  Star, CheckCircle2, ChevronRight,
  Shield, Heart, Check, ArrowLeft, Bookmark,
  DollarSign, Globe, Linkedin, Facebook, Instagram,
  Zap, Sun, Wifi, CalendarDays, Timer, Bot, Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import dynimeIcon from "@/assets/dynime-icon-light.svg";

// Beautiful brand logo component
const JobBrandLogo = ({ job, className = "w-10 h-10" }: { job: SyncedJob; className?: string }) => {
  return (
    <div className={`${className} flex items-center justify-center shrink-0 overflow-hidden`}>
      <img src={dynimeIcon} alt="Dynime logo" className="w-full h-full object-contain" />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Filter Select Component (Compact sized)
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
  <div className="relative w-full">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-9 px-3 pr-8 rounded-lg border border-border/50 bg-background/80 text-xs text-foreground/80 focus:outline-none focus:ring-1 focus:ring-ring/30 transition-all appearance-none cursor-pointer font-semibold"
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60">
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
  onBack?: () => void;
}

const getJobSalary = (job: SyncedJob): string | null => {
  if (job.salary_range) return job.salary_range;
  if (job.salary_min != null && job.salary_max != null) {
    const rawPeriod = (job.salary_period || "").toLowerCase();
    const periodSuffix = rawPeriod === "annual" ? " / year" : (rawPeriod === "monthly" ? " / month" : (rawPeriod ? ` / ${rawPeriod}` : ""));
    return `${job.salary_currency || 'USD'} ${Number(job.salary_min).toLocaleString()} – ${Number(job.salary_max).toLocaleString()}${periodSuffix}`;
  }

  // Fallback to extract from description
  if (job.description) {
    // 1. Look for inline pattern: **Salary Range:** $X - $Y
    const inlineMatch = job.description.match(/(?:Salary Range|Salary|Compensation)[^\n:]*:\s*([^\n\r]+)/i);
    if (inlineMatch) {
      return inlineMatch[1].replace(/[\*#_]/g, "").trim();
    }

    // 2. Look for block pattern
    const blockMatch = job.description.match(/(?:Salary Range|Salary|Compensation)[^\n]*\s*[\r\n]+(?:\*?\s*)?([^\n\r]+)/i);
    if (blockMatch) {
      const val = blockMatch[1].replace(/[\*#_]/g, "").trim();
      if (/[\$\d]|usd|negotiable/i.test(val)) {
        return val;
      }
    }
  }

  return null;
};

const JobDetailPane = ({ job, onBack }: JobDetailPaneProps) => {
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

  const displaySalary = useMemo(() => getJobSalary(job) || "Negotiable", [job]);

  const handleApplyRedirect = () => {
    if (job.apply_url) {
      window.open(job.apply_url, "_blank", "noopener,noreferrer");
    } else {
      toast.error("Application URL not found.");
    }
  };

  return (
    <div id="job-details-container" className="bg-background border border-border/50 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm overflow-y-auto h-full scrollbar-thin">
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
            <h2 className="font-heading text-xl md:text-2xl font-semibold text-foreground leading-tight flex items-center gap-1.5">
              {job.title} <span className="text-primary font-normal text-lg">+</span>
            </h2>
            <p className="text-xs text-muted-foreground font-semibold flex flex-wrap gap-x-2 gap-y-1 items-center">
              <span>Dynime LLC.</span>
              <span>·</span>
              <span className="inline-flex items-center gap-0.5"><MapPin className="w-3 h-3" /> {job.location}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-0.5"><Clock className="w-3 h-3" /> {job.employment_type || "Full-time"}</span>
              {displaySalary && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-0.5"><DollarSign className="w-3 h-3 text-primary" /> {displaySalary}</span>
                </>
              )}
            </p>
            <div className="flex flex-wrap gap-1.5 pt-2">
              <a
                href="https://dynime.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-muted hover:bg-muted/80 text-foreground transition-all duration-200 border border-border/40"
              >
                <Globe className="w-3 h-3 text-muted-foreground" /> dynime.com
              </a>
              <a
                href="https://linkedin.com/company/thedynime"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-muted hover:bg-muted/80 text-foreground transition-all duration-200 border border-border/40"
              >
                <Linkedin className="w-3 h-3 text-[#0a66c2]" /> LinkedIn
              </a>
              <a
                href="https://facebook.com/thedynime"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-muted hover:bg-muted/80 text-foreground transition-all duration-200 border border-border/40"
              >
                <Facebook className="w-3 h-3 text-[#1877f2]" /> Facebook
              </a>
              <a
                href="https://instagram.com/thedynime"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-muted hover:bg-muted/80 text-foreground transition-all duration-200 border border-border/40"
              >
                <Instagram className="w-3 h-3 text-[#e1306c]" /> Instagram
              </a>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            onClick={handleApplyRedirect}
            className="flex-1 sm:flex-none font-bold bg-primary hover:bg-primary/95 text-primary-foreground rounded-xl px-6 h-10 shadow-sm"
          >
            Apply Now
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
        <div className="rounded-xl border border-border/40 bg-card/25 p-5 flex flex-col gap-4">
          <div className="flex gap-3.5 items-start">
            <div className="w-11 h-11 bg-card border border-border/40 rounded-xl flex items-center justify-center shrink-0 overflow-hidden p-1 bg-white">
              <img src={dynimeIcon} alt="Dynime logo" className="w-full h-full object-contain" />
            </div>
            <div className="space-y-1">
              <span className="font-heading font-bold text-sm text-foreground">Dynime LLC</span>
              <p className="text-xs text-muted-foreground leading-normal">
                Dynime LLC is a global digital studio and technology company that partners with startups, entrepreneurs, and established businesses to design, build, and grow digital products. Our multidisciplinary team combines strategy, design, engineering, AI, and marketing to deliver solutions that solve real business problems. From launching a new startup to modernizing enterprise workflows, we help organizations accelerate digital transformation with scalable technology.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/10">
            <a
              href="https://dynime.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-muted hover:bg-muted/80 text-foreground transition-all duration-200 border border-border/40"
            >
              <Globe className="w-3 h-3 text-muted-foreground" /> dynime.com
            </a>
            <a
              href="https://linkedin.com/company/thedynime"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-muted hover:bg-muted/80 text-foreground transition-all duration-200 border border-border/40"
            >
              <Linkedin className="w-3 h-3 text-[#0a66c2]" /> LinkedIn
            </a>
            <a
              href="https://facebook.com/thedynime"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-muted hover:bg-muted/80 text-foreground transition-all duration-200 border border-border/40"
            >
              <Facebook className="w-3 h-3 text-[#1877f2]" /> Facebook
            </a>
            <a
              href="https://instagram.com/thedynime"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-muted hover:bg-muted/80 text-foreground transition-all duration-200 border border-border/40"
            >
              <Instagram className="w-3 h-3 text-[#e1306c]" /> Instagram
            </a>
          </div>
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
  const [isDashboardMode, setIsDashboardMode] = useState(false);

  // Scroll handler to enter dashboard mode when user scrolls down
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20 && !isDashboardMode) {
        setIsDashboardMode(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isDashboardMode]);

  // Gesture/wheel handlers to exit dashboard mode when at top of scroll
  useEffect(() => {
    if (!isDashboardMode) return;

    let touchStartY = 0;

    const handleWheel = (e: WheelEvent) => {
      const jobListEl = document.getElementById("jobs-list-container");
      const detailEl = document.getElementById("job-details-container");
      
      const isJobListAtTop = jobListEl ? jobListEl.scrollTop === 0 : true;
      const isDetailAtTop = detailEl ? detailEl.scrollTop === 0 : true;

      // User scrolls up (negative deltaY) while both panels are at the very top
      if (e.deltaY < -15 && isJobListAtTop && isDetailAtTop) {
        setIsDashboardMode(false);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touchY = e.touches[0].clientY;
      const diff = touchY - touchStartY;
      
      const jobListEl = document.getElementById("jobs-list-container");
      const detailEl = document.getElementById("job-details-container");
      
      const isJobListAtTop = jobListEl ? jobListEl.scrollTop === 0 : true;
      const isDetailAtTop = detailEl ? detailEl.scrollTop === 0 : true;

      // Swipe down (scrolling up)
      if (diff > 40 && isJobListAtTop && isDetailAtTop) {
        setIsDashboardMode(false);
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [isDashboardMode]);

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
    <Layout hideFooter={isDashboardMode} relativeHeader={isDashboardMode}>
      <div className={`bg-slate-50/50 flex flex-col transition-all duration-500 ease-in-out ${
        isDashboardMode 
          ? "lg:h-[calc(100vh-var(--header-h,72px))] lg:overflow-hidden pb-1" 
          : "min-h-screen pb-6"
      }`}>
        
        {/* ── Top Header Banner (White Background, Centered Title) ────────────────── */}
        <section className={`text-center px-4 max-w-full transition-all duration-500 ease-in-out transform origin-top ${
          isDashboardMode 
            ? "max-h-0 opacity-0 py-0 mb-0 overflow-hidden pointer-events-none -translate-y-4 scale-y-95" 
            : "max-h-[200px] opacity-100 py-5 scale-y-100 translate-y-0"
        }`}>
          <div className="space-y-2 max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
              We're hiring globally
            </span>
            <h1 className="font-heading text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              Find your dream job
            </h1>
            <p className="text-muted-foreground text-xs md:text-sm font-medium">
              Browse our open positions below. Work with an ambitious, global, remote-first team building world-class products.
            </p>

            {/* ── Quick Info Cards ─────────────────────────────── */}
            <div className="flex flex-wrap justify-center gap-2 pt-3">
              {/* Work Time */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-left">
                <Timer className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <div>
                  <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">Work Time: 8 Hours</span>
                  <span className="block text-[9px] text-amber-600/70 dark:text-amber-400/60 font-medium leading-none mt-0.5">Flexible on discussion</span>
                </div>
              </div>

              {/* Work Type */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-left">
                <Wifi className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <div>
                  <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400">Work Type: Remote</span>
                  <span className="block text-[9px] text-blue-600/70 dark:text-blue-400/60 font-medium leading-none mt-0.5">Work from anywhere</span>
                </div>
              </div>

              {/* Holiday */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-left">
                <Sun className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <div>
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">Holiday: Sunday</span>
                  <span className="block text-[9px] text-emerald-600/70 dark:text-emerald-400/60 font-medium leading-none mt-0.5">You can choose by availability</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── AI & Culture Info Mini-Cards Row ────────────────────────────────── */}
        <div className="w-full px-4 md:px-8 mb-2 shrink-0">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20">
              <Bot className="w-3 h-3 text-violet-500 shrink-0" />
              <span className="text-[10px] font-bold text-violet-700 dark:text-violet-400">AI-Assisted Workflows</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-pink-50 dark:bg-pink-500/10 border border-pink-200 dark:border-pink-500/20">
              <Sparkles className="w-3 h-3 text-pink-500 shrink-0" />
              <span className="text-[10px] font-bold text-pink-700 dark:text-pink-400">AI Tools Provided</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20">
              <Zap className="w-3 h-3 text-sky-500 shrink-0" />
              <span className="text-[10px] font-bold text-sky-700 dark:text-sky-400">Fast-Growth Environment</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20">
              <Globe className="w-3 h-3 text-teal-500 shrink-0" />
              <span className="text-[10px] font-bold text-teal-700 dark:text-teal-400">Global Remote Team</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20">
              <Heart className="w-3 h-3 text-orange-500 shrink-0" />
              <span className="text-[10px] font-bold text-orange-700 dark:text-orange-400">Inclusive Culture</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20">
              <Shield className="w-3 h-3 text-indigo-500 shrink-0" />
              <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400">Verified Employer</span>
            </div>
          </div>
        </div>

        {/* ── Filters Section (Full Width, Compact Height) ─────────────────────── */}
        <section className="w-full px-4 md:px-8 mb-3 shrink-0">
          <div className="bg-background rounded-xl border border-border/40 p-3 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 w-full items-center">
              
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none" />
                <Input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search jobs..."
                  className="pl-8 pr-8 h-9 rounded-lg border-border/50 bg-background font-semibold text-xs focus-visible:ring-ring/30"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="w-3 h-3" />
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
                className={`h-9 px-3.5 rounded-lg border font-bold text-xs transition-all flex items-center justify-between select-none ${
                  remoteOnly ? "bg-primary/5 border-primary text-primary" : "border-border/50 text-muted-foreground bg-background hover:bg-muted/40"
                }`}
              >
                <span>Remote Only</span>
                <span className={`w-1.5 h-1.5 rounded-full ${remoteOnly ? "bg-primary animate-pulse" : "bg-muted-foreground/35"}`} />
              </button>
            </div>
            
            {/* Active filters / Dashboard mode toggles */}
            <div className="flex items-center gap-3 shrink-0 pl-2">
              {isDashboardMode && (
                <button
                  onClick={() => setIsDashboardMode(false)}
                  className="text-muted-foreground hover:text-foreground text-xs font-bold flex items-center gap-1 bg-muted/60 px-2.5 py-1 rounded-lg transition-colors border border-border/20 shrink-0"
                >
                  <ArrowLeft className="w-3 h-3 rotate-90" /> Show Banner
                </button>
              )}
              {(search || department || employmentType || experience || remoteOnly) && (
                <button onClick={handleResetFilters} className="text-primary text-xs font-bold hover:underline shrink-0">
                  Reset
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ── Main Two-Column Split Layout (Full Width & Height Viewport) ────────── */}
        <section className="w-full px-4 md:px-8">
          {isLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1.8fr] gap-6 h-[65vh]">
              <div className="space-y-3 overflow-hidden">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-24 bg-muted/40 animate-pulse rounded-2xl border border-border/40" />
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
            /* Split Container: full screen flex height, scroll lock */
            <div className={`grid grid-cols-1 lg:grid-cols-[30%_70%] gap-6 items-start overflow-hidden w-full transition-all duration-500 ease-in-out ${
              isDashboardMode 
                ? "lg:h-[calc(100vh-var(--header-h,72px)-76px)] pb-1" 
                : "lg:h-[calc(100vh-var(--header-h,72px)-260px)] lg:min-h-[550px] pb-4"
            }`}>
              
              {/* LEFT Column: Sticky & Independently Scrollable Jobs List */}
              <div className={`h-full flex flex-col ${mobileDetailOpen ? "hidden md:flex" : "flex"}`}>
                <div className="mb-2 px-1 flex justify-between items-center text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
                  <span>Related Jobs</span>
                  <span>{filteredJobs.length} posting{filteredJobs.length !== 1 ? "s" : ""}</span>
                </div>
                
                {/* Scrollable list box */}
                <div id="jobs-list-container" className="flex-1 overflow-y-auto pr-1 space-y-3 scrollbar-thin pb-4">
                  {filteredJobs.map((job) => {
                    const isSelected = selectedJob?.flowmingo_job_id === job.flowmingo_job_id;
                    const cardSalary = getJobSalary(job);

                    return (
                      <button
                        key={job.flowmingo_job_id}
                        onClick={() => {
                          setSelectedJob(job);
                          setMobileDetailOpen(true);
                        }}
                        className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex gap-3.5 relative overflow-hidden bg-background ${
                          isSelected
                            ? "border-primary shadow-sm ring-1 ring-primary/40 bg-primary/[0.02]"
                            : "border-border/50 hover:bg-card/45 hover:border-border/80"
                        }`}
                      >
                        <JobBrandLogo job={job} className="w-10 h-10" />
                        <div className="space-y-0.5 flex-1 min-w-0 pr-16">
                          <h3 className="font-heading font-semibold text-sm md:text-[15px] text-foreground leading-snug">
                            {job.title} <span className="text-primary font-normal text-xs">+</span>
                          </h3>
                          <span className="text-[11px] font-bold text-muted-foreground block truncate">
                            {job.department}
                          </span>
                          <p className="text-[11px] text-muted-foreground/80 font-medium pt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                            <span className="inline-flex items-center gap-0.5"><MapPin className="w-3 h-3 text-muted-foreground/50" /> {job.location}</span>
                            <span>·</span>
                            <span>{job.employment_type || "Full-time"}</span>
                            {cardSalary && (
                              <>
                                <span>·</span>
                                <span className="text-primary font-semibold">{cardSalary}</span>
                              </>
                            )}
                          </p>
                        </div>

                        {/* Verified badge top right */}
                        <span className="absolute top-4 right-4 inline-flex items-center gap-0.5 text-[9px] text-emerald-600 font-bold bg-emerald-500/5 px-1.5 py-0.5 rounded-full border border-emerald-500/10 shrink-0">
                          <CheckCircle2 className="w-2.5 h-2.5 fill-emerald-500/10" /> Verified
                        </span>
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
              {search || department || employmentType || experience || remoteOnly ? (
                <Button variant="outline" size="sm" onClick={handleResetFilters} className="mt-5 rounded-full text-xs">
                  Clear all filters
                </Button>
              ) : null}
            </div>
          )}
        </section>

      </div>
    </Layout>
  );
};

export default Careers;

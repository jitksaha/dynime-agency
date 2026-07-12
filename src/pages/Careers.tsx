import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSyncedJobs } from "@/hooks/use-cms-data";
import { type SyncedJob } from "@/lib/api";
import Layout from "@/components/layout/Layout";
import { usePageSEO } from "@/hooks/use-page-seo";
import { SEO_DEFAULTS } from "@/lib/seo-defaults";
import DOMPurify from "isomorphic-dompurify";
import { marked } from "marked";
import {
  Briefcase, MapPin, Clock, Search, X,
  CheckCircle2, Shield, Heart, Check,
  DollarSign, Globe, Linkedin, Facebook, Instagram,
  Zap, Sun, Wifi, Timer, Bot, Sparkles,
  ArrowUpRight, Users, Building2, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import dynimeIcon from "@/assets/dynime-icon-light.svg";

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────
const JobBrandLogo = ({ className = "w-10 h-10" }: { className?: string }) => (
  <div className={`${className} flex items-center justify-center shrink-0 overflow-hidden`}>
    <img src={dynimeIcon} alt="Dynime logo" className="w-full h-full object-contain" />
  </div>
);

const getJobSalary = (job: SyncedJob): string | null => {
  if (job.salary_range) return job.salary_range;
  if (job.salary_min != null && job.salary_max != null) {
    const rawPeriod = (job.salary_period || "").toLowerCase();
    const periodSuffix =
      rawPeriod === "annual" ? " / year" : rawPeriod === "monthly" ? " / month" : rawPeriod ? ` / ${rawPeriod}` : "";
    return `${job.salary_currency || "USD"} ${Number(job.salary_min).toLocaleString()} – ${Number(job.salary_max).toLocaleString()}${periodSuffix}`;
  }
  if (job.description) {
    const inlineMatch = job.description.match(/(?:Salary Range|Salary|Compensation)[^\n:]*:\s*([^\n\r]+)/i);
    if (inlineMatch) return inlineMatch[1].replace(/[\*#_]/g, "").trim();
    const blockMatch = job.description.match(/(?:Salary Range|Salary|Compensation)[^\n]*\s*[\r\n]+(?:\*?\s*)?([^\n\r]+)/i);
    if (blockMatch) {
      const val = blockMatch[1].replace(/[\*#_]/g, "").trim();
      if (/[\$\d]|usd|negotiable/i.test(val)) return val;
    }
  }
  return null;
};

// ─────────────────────────────────────────────────────────────────
// Filter Select
// ─────────────────────────────────────────────────────────────────
const FilterSelect = ({
  value, onChange, placeholder, options,
}: { value: string; onChange: (v: string) => void; placeholder: string; options: string[] }) => (
  <div className="relative w-full">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-10 px-3 pr-8 rounded-xl border border-border/60 bg-background text-xs text-foreground/80 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer font-semibold"
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
    </select>
    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">
      <ChevronDown className="w-3.5 h-3.5" />
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────
// Job Detail Modal — fixed to viewport, 80% wide, tall
// ─────────────────────────────────────────────────────────────────
const JobDetailModal = ({ job, onClose }: { job: SyncedJob; onClose: () => void }) => {
  const cleanHtml = useMemo(() => {
    if (!job.description) return "";
    const isMarkdown = job.description.includes("#") || job.description.includes("*") || job.description.includes("\n\n");
    const rawHtml = isMarkdown ? (marked.parse(job.description) as string) : job.description;
    return DOMPurify.sanitize(rawHtml, {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ["img", "picture", "source", "figure", "svg", "video", "iframe"],
      FORBID_ATTR: ["style", "background"],
    });
  }, [job.description]);

  const displaySalary = useMemo(() => getJobSalary(job) || "Negotiable", [job]);

  const handleApply = () => {
    if (job.apply_url) window.open(job.apply_url, "_blank", "noopener,noreferrer");
    else toast.error("Application URL not found.");
  };

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", esc); document.body.style.overflow = ""; };
  }, [onClose]);

  const socials = [
    { href: "https://dynime.com", Icon: Globe, label: "dynime.com", color: "text-muted-foreground" },
    { href: "https://linkedin.com/company/thedynime", Icon: Linkedin, label: "LinkedIn", color: "text-[#0a66c2]" },
    { href: "https://facebook.com/thedynime", Icon: Facebook, label: "Facebook", color: "text-[#1877f2]" },
    { href: "https://instagram.com/thedynime", Icon: Instagram, label: "Instagram", color: "text-[#e1306c]" },
  ];

  return createPortal(
    /* Rendered directly on document.body via portal — bypasses any parent overflow/transform */
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-6 bg-black/50 backdrop-blur-sm"
      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Modal container — 80% viewport width, max 960px, 88% viewport height */}
      <div
        className="relative flex flex-col bg-background border border-border/50 rounded-2xl shadow-2xl overflow-hidden
          w-[92vw] md:w-[82vw] max-w-[960px] h-[88vh] max-h-[820px]"
        style={{ animation: "modalIn 0.22s cubic-bezier(0.16,1,0.3,1)" }}
      >
        {/* ── Modal Header (sticky) */}
        <div className="shrink-0 flex items-start justify-between gap-4 p-6 pb-4 border-b border-border/20 bg-background">
          <div className="flex gap-4 items-start flex-1 min-w-0">
            <div className="w-14 h-14 bg-white border border-border/40 rounded-xl flex items-center justify-center shrink-0 overflow-hidden p-1.5 shadow-sm">
              <JobBrandLogo className="w-full h-full" />
            </div>
            <div className="space-y-1.5 flex-1 min-w-0">
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground leading-tight">{job.title}</h2>
              <p className="text-xs text-muted-foreground font-semibold flex flex-wrap gap-x-2 gap-y-1 items-center">
                <span>Dynime LLC.</span>
                <span>·</span>
                <span className="inline-flex items-center gap-0.5"><MapPin className="w-3 h-3" /> {job.location}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-0.5"><Clock className="w-3 h-3" /> {job.employment_type || "Full-time"}</span>
                {displaySalary && (<>
                  <span>·</span>
                  <span className="inline-flex items-center gap-0.5 text-primary font-bold"><DollarSign className="w-3 h-3" />{displaySalary}</span>
                </>)}
              </p>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {socials.map(({ href, Icon, label, color }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-muted hover:bg-muted/80 text-foreground transition-all border border-border/40">
                    <Icon className={`w-3 h-3 ${color}`} />{label}
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 pt-0.5">
            <Button onClick={handleApply}
              className="font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-5 h-9 text-sm shadow-sm">
              Apply Now
            </Button>
            <button onClick={onClose}
              className="w-9 h-9 rounded-xl border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-7">
          {/* Job Overview */}
          <div className="space-y-3">
            <h3 className="font-heading font-bold text-base text-foreground flex items-center gap-1">
              Job Overview <span className="text-primary font-normal">+</span>
            </h3>
            {cleanHtml ? (
              <article
                className="prose prose-neutral dark:prose-invert max-w-none text-sm text-foreground/80 leading-relaxed
                  prose-headings:font-heading prose-headings:font-bold prose-headings:text-base prose-headings:my-2
                  prose-p:my-2 prose-li:my-1"
                dangerouslySetInnerHTML={{ __html: cleanHtml }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">No description available.</p>
            )}
          </div>

          {/* Responsibilities */}
          {job.responsibilities && job.responsibilities.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-border/10">
              <h3 className="font-heading font-bold text-base text-foreground flex items-center gap-1">
                What You Will Do <span className="text-primary font-normal">+</span>
              </h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {job.responsibilities.map((resp, i) => (
                  <li key={i} className="flex gap-3 text-sm text-foreground/80 leading-normal items-start">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-500/20 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                    <span>{resp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* About Dynime */}
          <div className="pt-2 border-t border-border/20 space-y-3">
            <h3 className="font-heading font-bold text-base text-foreground flex items-center gap-1">
              About Dynime <span className="text-primary font-normal">+</span>
            </h3>
            <div className="rounded-xl border border-border/40 bg-muted/20 p-5 flex gap-4 items-start">
              <div className="w-11 h-11 bg-white border border-border/40 rounded-xl flex items-center justify-center shrink-0 overflow-hidden p-1">
                <img src={dynimeIcon} alt="Dynime" className="w-full h-full object-contain" />
              </div>
              <div className="space-y-1.5">
                <span className="font-heading font-bold text-sm text-foreground block">Dynime LLC</span>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Dynime LLC is a global digital studio and technology company that partners with startups, entrepreneurs, and established businesses to design, build, and grow digital products. Our multidisciplinary team combines strategy, design, engineering, AI, and marketing to deliver solutions that solve real business problems. From launching a new startup to modernizing enterprise workflows, we help organizations accelerate digital transformation with scalable technology.
                </p>
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {socials.map(({ href, Icon, label, color }) => (
                    <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-muted hover:bg-muted/80 text-foreground transition-all border border-border/40">
                      <Icon className={`w-3 h-3 ${color}`} />{label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Modal Footer (sticky) */}
        <div className="shrink-0 p-4 border-t border-border/20 flex items-center justify-between gap-4 bg-muted/20">
          <p className="text-xs text-muted-foreground font-medium hidden sm:block">
            Ready to join? Click Apply Now to submit your application.
          </p>
          <Button onClick={handleApply}
            className="font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-7 h-9 text-sm shadow-sm ml-auto">
            Apply Now <ArrowUpRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </div>
      </div>

      {/* Keyframe animation */}
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.96) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>,
    document.body
  );
};

// ─────────────────────────────────────────────────────────────────
// Job Row Card — single column, horizontal list item style
// ─────────────────────────────────────────────────────────────────
const JobCard = ({ job, onViewDetails }: { job: SyncedJob; onViewDetails: () => void }) => {
  const salary = getJobSalary(job);
  return (
    <div className="group bg-background border border-border/40 rounded-2xl px-5 py-4 hover:border-primary/30 hover:shadow-md transition-all duration-200 flex items-center gap-5">
      {/* Logo */}
      <div className="w-12 h-12 bg-white border border-border/30 rounded-xl flex items-center justify-center shrink-0 overflow-hidden p-1.5 shadow-sm group-hover:border-primary/20 transition-colors">
        <JobBrandLogo className="w-full h-full" />
      </div>

      {/* Main Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-heading font-bold text-sm md:text-[15px] text-foreground group-hover:text-primary transition-colors leading-snug">
            {job.title}
          </h3>
          <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-600 font-bold bg-emerald-500/8 px-1.5 py-0.5 rounded-full border border-emerald-500/15 shrink-0">
            <CheckCircle2 className="w-2.5 h-2.5" /> Verified
          </span>
        </div>
        <p className="text-[11px] font-semibold text-muted-foreground mt-0.5 mb-2">
          {job.department || "General"} · Dynime LLC
        </p>
        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {job.location && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted/80 text-muted-foreground border border-border/40">
              <MapPin className="w-2.5 h-2.5" /> {job.location}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted/80 text-muted-foreground border border-border/40">
            <Clock className="w-2.5 h-2.5" /> {job.employment_type || "Full-time"}
          </span>
          {salary && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/8 text-primary border border-primary/20">
              <DollarSign className="w-2.5 h-2.5" /> {salary}
            </span>
          )}
          {job.remote && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
              <Wifi className="w-2.5 h-2.5" /> Remote
            </span>
          )}
        </div>
      </div>

      {/* Description preview — hidden on small */}
      {job.description && (
        <p className="hidden lg:block text-xs text-muted-foreground leading-relaxed line-clamp-2 max-w-xs shrink-0">
          {job.description.replace(/[#*_`\[\]()]/g, "").trim().slice(0, 120)}…
        </p>
      )}

      {/* CTA */}
      <button
        onClick={onViewDetails}
        className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 bg-primary/8 hover:bg-primary/15 px-4 py-2 rounded-xl transition-all border border-primary/20 hover:border-primary/40 whitespace-nowrap"
      >
        View Details <ArrowUpRight className="w-3.5 h-3.5" />
      </button>
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
  const [selectedJob, setSelectedJob] = useState<SyncedJob | null>(null);

  const { data, isLoading, isError } = useSyncedJobs({ per_page: 100 });

  const filterOptions = useMemo(() => {
    const jobs = data?.data ?? [];
    return {
      departments: [...new Set(jobs.map((j) => j.department).filter(Boolean))].sort(),
      empTypes: [...new Set(jobs.map((j) => j.employment_type).filter(Boolean))].sort(),
      experiences: [...new Set(jobs.map((j) => j.experience).filter(Boolean))].sort() as string[],
    };
  }, [data]);

  const filteredJobs = useMemo(() => {
    const jobs = data?.data ?? [];
    return jobs.filter((job) => {
      if (remoteOnly && !job.remote) return false;
      if (department && job.department?.toLowerCase() !== department.toLowerCase()) return false;
      if (employmentType && job.employment_type?.toLowerCase() !== employmentType.toLowerCase()) return false;
      if (experience && job.experience?.toLowerCase() !== experience.toLowerCase()) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!job.title?.toLowerCase().includes(q) && !job.department?.toLowerCase().includes(q) && !job.description?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [data, search, department, employmentType, experience, remoteOnly]);

  const handleReset = () => { setSearch(""); setDepartment(""); setEmploymentType(""); setExperience(""); setRemoteOnly(false); };

  usePageSEO("careers", {
    title: SEO_DEFAULTS.careers.title,
    description: SEO_DEFAULTS.careers.description,
    keywords: SEO_DEFAULTS.careers.keywords,
  });

  // ── Brand gradient colours (primary-adjacent purples/blues) ──
  const workCards = [
    {
      icon: Timer,
      title: "Work Time: 8 Hours",
      sub: "Flexible on discussion",
      gradient: "from-violet-600 to-indigo-600",
      shadow: "shadow-violet-500/25",
    },
    {
      icon: Wifi,
      title: "Work Type: Remote",
      sub: "Work from anywhere",
      gradient: "from-indigo-600 to-blue-600",
      shadow: "shadow-indigo-500/25",
    },
    {
      icon: Sun,
      title: "Holiday: Sunday",
      sub: "You can choose by availability",
      gradient: "from-blue-600 to-cyan-500",
      shadow: "shadow-blue-500/25",
    },
  ];

  const cultureTags = [
    { icon: Bot, label: "AI-Assisted Workflows" },
    { icon: Sparkles, label: "AI Tools Provided" },
    { icon: Zap, label: "Fast-Growth Environment" },
    { icon: Globe, label: "Global Remote Team" },
    { icon: Heart, label: "Inclusive Culture" },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50/50 dark:bg-background">

        {/* ────────── Hero Banner ────────── */}
        <section className="relative overflow-hidden bg-gradient-to-b from-violet-50/60 via-background to-slate-50/30 dark:from-violet-950/20 dark:via-background dark:to-background border-b border-border/30">
          {/* Decorative blobs */}
          <div className="absolute inset-0 pointer-events-none select-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[340px] bg-gradient-to-r from-violet-400/10 to-indigo-400/10 rounded-full blur-3xl" />
            <div className="absolute -top-4 left-12 w-56 h-56 bg-violet-500/8 rounded-full blur-3xl" />
            <div className="absolute -top-4 right-12 w-56 h-56 bg-blue-500/8 rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-5xl mx-auto px-4 py-16 text-center">
            {/* Badge */}
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/25 mb-5">
              <Briefcase className="w-3 h-3" /> We're hiring globally
            </span>

            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground mb-4">
              Find your dream job
            </h1>
            <p className="text-muted-foreground text-sm md:text-base font-medium max-w-lg mx-auto mb-10">
              Work with an ambitious, global, remote-first team building world-class digital products powered by AI.
            </p>

            {/* ── Work Info Cards ─ brand gradient, centered */}
            <div className="flex flex-wrap justify-center gap-3 mb-10">
              {workCards.map(({ icon: Icon, title, sub, gradient, shadow }) => (
                <div
                  key={title}
                  className={`inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-gradient-to-r ${gradient} ${shadow} shadow-lg text-white text-left`}
                >
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0 backdrop-blur-sm">
                    <Icon className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
                  </div>
                  <div>
                    <span className="text-[12px] font-bold block leading-tight">{title}</span>
                    <span className="text-[10px] font-medium text-white/75 block mt-0.5">{sub}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Stats Row */}
            <div className="flex flex-wrap justify-center gap-8 text-center mb-2">
              {[
                { icon: Briefcase, value: String(filteredJobs.length || "—"), label: "Open Positions" },
                { icon: Users, value: "50+", label: "Team Members" },
                { icon: Globe, value: "10+", label: "Countries" },
                { icon: Building2, value: "100%", label: "Remote" },
              ].map(({ icon: Icon, value, label }) => (
                <div key={label} className="flex flex-col items-center gap-0.5">
                  <Icon className="w-4 h-4 text-primary mb-0.5 opacity-70" />
                  <span className="font-heading font-extrabold text-xl text-foreground">{value}</span>
                  <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ────────── Culture / AI Tags — centered ────────── */}
        <div className="max-w-5xl mx-auto px-4 md:px-8 pt-5 pb-2 flex justify-center">
          <div className="flex flex-wrap justify-center gap-2">
            {cultureTags.map(({ icon: Icon, label }) => (
              <div key={label}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary/20 bg-primary/5 text-primary">
                <Icon className="w-3 h-3 shrink-0" />
                <span className="text-[10px] font-bold">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ────────── Sticky Filter Bar ────────── */}
        <div className="sticky top-0 z-20 max-w-5xl mx-auto px-4 md:px-8 py-3 bg-slate-50/95 dark:bg-background/95 backdrop-blur-sm">
          <div className="bg-background rounded-xl border border-border/40 p-3 shadow-sm flex flex-col sm:flex-row gap-3 items-center">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 w-full items-center">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none" />
                <Input
                  type="search" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search jobs..."
                  className="pl-8 pr-8 h-10 rounded-xl border-border/50 bg-background font-semibold text-xs focus-visible:ring-primary/20"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <FilterSelect value={department} onChange={setDepartment} placeholder="Location / Dept" options={filterOptions.departments} />
              <FilterSelect value={employmentType} onChange={setEmploymentType} placeholder="Job Type" options={filterOptions.empTypes} />
              <FilterSelect value={experience} onChange={setExperience} placeholder="Experience" options={filterOptions.experiences} />
              <button
                onClick={() => setRemoteOnly(!remoteOnly)}
                className={`h-10 px-3.5 rounded-xl border font-bold text-xs transition-all flex items-center justify-between select-none ${
                  remoteOnly ? "bg-primary/5 border-primary text-primary" : "border-border/50 text-muted-foreground bg-background hover:bg-muted/40"
                }`}
              >
                <span>Remote Only</span>
                <span className={`w-1.5 h-1.5 rounded-full ml-2 ${remoteOnly ? "bg-primary animate-pulse" : "bg-muted-foreground/35"}`} />
              </button>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-muted-foreground font-semibold whitespace-nowrap">
                {filteredJobs.length} result{filteredJobs.length !== 1 ? "s" : ""}
              </span>
              {(search || department || employmentType || experience || remoteOnly) && (
                <button onClick={handleReset} className="text-primary text-xs font-bold hover:underline shrink-0">Reset</button>
              )}
            </div>
          </div>
        </div>

        {/* ────────── Job List — single column ────────── */}
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-muted/40 animate-pulse rounded-2xl border border-border/40" />
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-20 bg-background rounded-2xl border border-border/50">
              <Briefcase className="w-12 h-12 text-destructive mx-auto mb-4 opacity-40" />
              <h3 className="font-heading text-lg font-bold text-foreground">Failed to load positions</h3>
              <p className="text-muted-foreground text-sm mt-1">Please refresh the page.</p>
            </div>
          ) : filteredJobs.length > 0 ? (
            <div className="space-y-3">
              {filteredJobs.map((job) => (
                <JobCard key={job.flowmingo_job_id} job={job} onViewDetails={() => setSelectedJob(job)} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-background border border-dashed border-border/60 rounded-2xl">
              <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
              <h3 className="font-heading text-lg font-bold text-foreground mb-2">No positions found</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">Try adjusting your search or filters.</p>
              {(search || department || employmentType || experience || remoteOnly) && (
                <Button variant="outline" size="sm" onClick={handleReset} className="mt-5 rounded-full text-xs">
                  Clear all filters
                </Button>
              )}
            </div>
          )}
        </div>

      </div>

      {/* ── Modal — rendered outside scroll flow, always viewport-centered */}
      {selectedJob && <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />}
    </Layout>
  );
};

export default Careers;

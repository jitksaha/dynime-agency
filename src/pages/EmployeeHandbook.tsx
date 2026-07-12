import { useState, useEffect, useRef, useMemo } from "react";
import {
  Search, BookOpen, ChevronRight, Lock, Shield,
  Clock, Globe, Users, Zap, Star, Check, AlertCircle,
  FileText, Briefcase, Heart, Wifi, Sun, Timer,
  ChevronUp, Menu, X
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────
interface Section { id: string; title: string; level: 1 | 2; }
interface Chapter {
  id: string;
  number: string;
  title: string;
  icon: React.ElementType;
  color: string;
  sections: Section[];
}

// ─── Chapter Data ─────────────────────────────────────────────────
const CHAPTERS: Chapter[] = [
  {
    id: "ch1", number: "01", title: "Welcome to Dynime", icon: Star, color: "violet",
    sections: [
      { id: "our-story", title: "Our Story", level: 2 },
      { id: "who-we-are", title: "Who We Are", level: 2 },
      { id: "our-purpose", title: "Our Purpose", level: 2 },
      { id: "working-at-dynime", title: "Working at Dynime", level: 2 },
      { id: "expectations", title: "Mutual Expectations", level: 2 },
    ]
  },
  {
    id: "ch2", number: "02", title: "Mission, Vision & Values", icon: Zap, color: "blue",
    sections: [
      { id: "mission", title: "Our Mission", level: 2 },
      { id: "vision", title: "Our Vision", level: 2 },
      { id: "core-values", title: "Core Values", level: 2 },
      { id: "operating-principles", title: "Operating Principles", level: 2 },
    ]
  },
  {
    id: "ch3", number: "03", title: "How We Work", icon: Globe, color: "teal",
    sections: [
      { id: "remote-first", title: "Remote-First", level: 2 },
      { id: "communication", title: "Communication", level: 2 },
      { id: "meetings", title: "Meetings & Async", level: 2 },
      { id: "accountability", title: "Accountability", level: 2 },
      { id: "feedback-culture", title: "Feedback Culture", level: 2 },
    ]
  },
  {
    id: "ch4", number: "04", title: "Employment Policy", icon: Briefcase, color: "indigo",
    sections: [
      { id: "employment-categories", title: "Employment Categories", level: 2 },
      { id: "probation", title: "Probation Period", level: 2 },
      { id: "working-hours", title: "Working Hours", level: 2 },
      { id: "attendance", title: "Attendance", level: 2 },
      { id: "resignation", title: "Resignation & Termination", level: 2 },
    ]
  },
  {
    id: "ch5", number: "05", title: "Leave & Holidays", icon: Sun, color: "amber",
    sections: [
      { id: "annual-leave", title: "Annual Leave", level: 2 },
      { id: "sick-leave", title: "Sick Leave", level: 2 },
      { id: "other-leaves", title: "Other Leave Types", level: 2 },
      { id: "public-holidays", title: "Public Holidays", level: 2 },
      { id: "leave-guidelines", title: "General Guidelines", level: 2 },
    ]
  },
  {
    id: "ch6", number: "06", title: "Compensation & Benefits", icon: Star, color: "emerald",
    sections: [
      { id: "salary", title: "Salary & Payroll", level: 2 },
      { id: "benefits", title: "Benefits", level: 2 },
      { id: "reimbursements", title: "Reimbursements", level: 2 },
    ]
  },
  {
    id: "ch7", number: "07", title: "Performance & Growth", icon: Zap, color: "sky",
    sections: [
      { id: "kpis", title: "KPIs & OKRs", level: 2 },
      { id: "reviews", title: "Performance Reviews", level: 2 },
      { id: "learning", title: "Learning & Development", level: 2 },
      { id: "promotions", title: "Promotions & Career Growth", level: 2 },
    ]
  },
  {
    id: "ch8", number: "08", title: "Code of Conduct", icon: Shield, color: "rose",
    sections: [
      { id: "professionalism", title: "Professionalism", level: 2 },
      { id: "anti-bribery", title: "Anti-Bribery & Ethics", level: 2 },
      { id: "social-media", title: "Social Media Conduct", level: 2 },
      { id: "conflict-of-interest", title: "Conflict of Interest", level: 2 },
    ]
  },
  {
    id: "ch9", number: "09", title: "Information Security", icon: Lock, color: "slate",
    sections: [
      { id: "passwords", title: "Passwords & MFA", level: 2 },
      { id: "device-security", title: "Device Security", level: 2 },
      { id: "vpn-cloud", title: "VPN & Cloud Storage", level: 2 },
      { id: "incident-reporting", title: "Incident Reporting", level: 2 },
    ]
  },
  {
    id: "ch10", number: "10", title: "IT & Acceptable Use", icon: Wifi, color: "purple",
    sections: [
      { id: "company-devices", title: "Company Devices", level: 2 },
      { id: "byod", title: "Personal Devices (BYOD)", level: 2 },
      { id: "ai-tools", title: "AI Tools Usage", level: 2 },
      { id: "monitoring", title: "Monitoring Notice", level: 2 },
    ]
  },
  {
    id: "ch11", number: "11", title: "AI Usage Policy", icon: Zap, color: "violet",
    sections: [
      { id: "approved-ai-uses", title: "Approved Uses", level: 2 },
      { id: "prohibited-ai-uses", title: "Prohibited Uses", level: 2 },
      { id: "ai-responsibility", title: "Employee Responsibility", level: 2 },
    ]
  },
  {
    id: "ch12", number: "12", title: "Confidentiality & IP", icon: Lock, color: "orange",
    sections: [
      { id: "confidential-info", title: "Confidential Information", level: 2 },
      { id: "ip-ownership", title: "Intellectual Property", level: 2 },
      { id: "nda-obligations", title: "NDA Obligations", level: 2 },
    ]
  },
  {
    id: "ch13", number: "13", title: "Workplace Respect & Equal Opportunity", icon: Heart, color: "pink",
    sections: [
      { id: "equal-opportunity", title: "Equal Opportunity", level: 2 },
      { id: "anti-harassment", title: "Anti-Harassment Policy", level: 2 },
      { id: "reporting", title: "Reporting Procedure", level: 2 },
    ]
  },
  {
    id: "ch14", number: "14", title: "Disciplinary & Grievances", icon: AlertCircle, color: "red",
    sections: [
      { id: "progressive-discipline", title: "Progressive Discipline", level: 2 },
      { id: "grievance-process", title: "Grievance Process", level: 2 },
      { id: "whistleblower", title: "Whistleblower Protection", level: 2 },
    ]
  },
  {
    id: "ch15", number: "15", title: "Offboarding Policy", icon: FileText, color: "gray",
    sections: [
      { id: "notice-period", title: "Notice Period", level: 2 },
      { id: "asset-return", title: "Asset Return", level: 2 },
      { id: "exit-interview", title: "Exit Interview", level: 2 },
      { id: "post-employment", title: "Post-Employment Obligations", level: 2 },
    ]
  },
  {
    id: "ch16", number: "16", title: "Employee Acknowledgment", icon: Check, color: "green",
    sections: [
      { id: "acknowledgment-statement", title: "Acknowledgment Statement", level: 2 },
      { id: "version-history", title: "Version History", level: 2 },
    ]
  },
];

// ─── Color maps ───────────────────────────────────────────────────
const colorMap: Record<string, string> = {
  violet: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border-violet-200 dark:border-violet-800",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  teal: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200 dark:border-teal-800",
  indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  sky: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 border-sky-200 dark:border-sky-800",
  rose: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800",
  slate: "bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800",
  orange: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800",
  pink: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 border-pink-200 dark:border-pink-800",
  red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
  gray: "bg-gray-100 text-gray-700 dark:bg-gray-800/60 dark:text-gray-300 border-gray-200 dark:border-gray-700",
  green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
};
const dotMap: Record<string, string> = {
  violet:"bg-violet-500",blue:"bg-blue-500",teal:"bg-teal-500",indigo:"bg-indigo-500",
  amber:"bg-amber-500",emerald:"bg-emerald-500",sky:"bg-sky-500",rose:"bg-rose-500",
  slate:"bg-slate-500",purple:"bg-purple-500",orange:"bg-orange-500",pink:"bg-pink-500",
  red:"bg-red-500",gray:"bg-gray-500",green:"bg-green-500",
};

// ─── Callout ──────────────────────────────────────────────────────
const Callout = ({ type = "note", children }: { type?: "note"|"important"|"warning"; children: React.ReactNode }) => {
  const s = {
    note: "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200",
    important: "bg-violet-50 dark:bg-violet-900/20 border-violet-300 dark:border-violet-700 text-violet-800 dark:text-violet-200",
    warning: "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200",
  }[type];
  const icon = type === "warning" ? "⚠" : type === "important" ? "★" : "ℹ";
  return (
    <div className={`my-5 flex gap-3 px-4 py-3.5 rounded-xl border ${s} text-sm leading-relaxed`}>
      <span className="text-base mt-0.5 shrink-0">{icon}</span>
      <div>{children}</div>
    </div>
  );
};

// ─── Section Heading ──────────────────────────────────────────────
const SectionH = ({ id, children }: { id: string; children: React.ReactNode }) => (
  <h3 id={id} className="font-heading font-bold text-base text-foreground mt-8 mb-3 flex items-center gap-2 scroll-mt-24">
    <span className="w-1 h-4 rounded-full bg-primary inline-block" />
    {children}
  </h3>
);

// ─── Bullet List ──────────────────────────────────────────────────
const BList = ({ items }: { items: string[] }) => (
  <ul className="space-y-1.5 my-3">
    {items.map((item, i) => (
      <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/80 leading-relaxed">
        <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

// ─── Policy Table ─────────────────────────────────────────────────
const PolicyTable = ({ rows }: { rows: [string, string][] }) => (
  <div className="my-4 overflow-hidden rounded-xl border border-border/50">
    <table className="w-full text-sm">
      <tbody>
        {rows.map(([label, value], i) => (
          <tr key={i} className={i % 2 === 0 ? "bg-muted/30" : "bg-background"}>
            <td className="py-2.5 px-4 font-semibold text-foreground/90 w-48 border-r border-border/30">{label}</td>
            <td className="py-2.5 px-4 text-foreground/75">{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────
const EmployeeHandbook = () => {
  const [activeChapter, setActiveChapter] = useState("ch1");
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Search filter
  const filteredChapters = useMemo(() => {
    if (!search.trim()) return CHAPTERS;
    const q = search.toLowerCase();
    return CHAPTERS.filter(ch =>
      ch.title.toLowerCase().includes(q) ||
      ch.sections.some(s => s.title.toLowerCase().includes(q))
    );
  }, [search]);

  // Scroll spy
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
      // find current chapter
      for (const ch of [...CHAPTERS].reverse()) {
        const el = document.getElementById(ch.id);
        if (el && el.getBoundingClientRect().top <= 120) {
          setActiveChapter(ch.id);
          break;
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) { el.scrollIntoView({ behavior: "smooth", block: "start" }); setSidebarOpen(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 font-sans">
      {/* ── Top Bar ─────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border-b border-border/40 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 h-14 flex items-center gap-4">
          {/* Mobile TOC toggle */}
          <button className="md:hidden p-2 rounded-lg hover:bg-muted/50" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <span className="font-heading font-bold text-sm text-foreground leading-none block">Dynime Employee Handbook</span>
              <span className="text-[10px] text-muted-foreground font-medium">Culture · People · Policies — Version 1.0</span>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
              <Lock className="w-2.5 h-2.5" /> Confidential · Internal Use Only
            </span>
            <span className="hidden sm:inline-flex text-[10px] text-muted-foreground font-medium">Last Updated: July 2026</span>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto flex">

        {/* ── Left Sidebar TOC ────────────────────────────── */}
        <aside className={`
          fixed md:sticky top-14 z-30 md:z-auto
          w-72 md:w-64 lg:w-72
          h-[calc(100vh-56px)]
          bg-white dark:bg-zinc-900 md:bg-transparent md:dark:bg-transparent
          border-r border-border/40
          overflow-y-auto
          flex flex-col
          transition-transform duration-300
          ${sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"}
          scrollbar-thin
        `}>
          <div className="p-4 flex flex-col gap-1 pb-10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 mb-2">Table of Contents</p>
            {filteredChapters.map((ch) => {
              const Icon = ch.icon;
              const isActive = activeChapter === ch.id;
              return (
                <div key={ch.id}>
                  <button
                    onClick={() => scrollTo(ch.id)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all ${
                      isActive
                        ? "bg-primary/10 text-primary font-bold"
                        : "text-foreground/70 hover:text-foreground hover:bg-muted/50 font-semibold"
                    }`}
                  >
                    <span className={`text-[10px] font-black w-5 text-center shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                      {ch.number}
                    </span>
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="text-xs leading-snug">{ch.title}</span>
                    {isActive && <ChevronRight className="w-3 h-3 ml-auto text-primary shrink-0" />}
                  </button>
                  {isActive && ch.sections.length > 0 && (
                    <div className="ml-8 mt-0.5 mb-1 flex flex-col gap-0.5">
                      {ch.sections.map(sec => (
                        <button
                          key={sec.id}
                          onClick={() => scrollTo(sec.id)}
                          className="text-left text-[11px] text-muted-foreground hover:text-primary py-1 px-2 rounded-lg hover:bg-muted/40 transition-colors leading-snug"
                        >
                          {sec.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-20 bg-black/30 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* ── Right Content Area ───────────────────────────── */}
        <main ref={contentRef} className="flex-1 min-w-0 px-4 md:px-8 lg:px-12 py-8">

          {/* Search Bar */}
          <div className="relative mb-8 max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search handbook content..."
              className="w-full h-11 pl-11 pr-4 rounded-xl border border-border/60 bg-white dark:bg-zinc-900 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all shadow-sm"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Search note */}
          {search && (
            <p className="text-xs text-muted-foreground mb-6 font-medium">
              Showing {filteredChapters.length} chapter{filteredChapters.length !== 1 ? "s" : ""} matching "{search}"
            </p>
          )}

          {/* ════════════════════════════════════════════════ */}
          {/* CHAPTER 1 — Welcome */}
          {/* ════════════════════════════════════════════════ */}
          <article id="ch1" className="scroll-mt-20 mb-16">
            <ChapterHeader number="01" title="Welcome to Dynime" color="violet" icon={Star} />

            <p className="text-base text-foreground/80 leading-relaxed mb-6 font-medium">
              Welcome to Dynime. We're excited to have you join our team. Whether you're beginning your first day or starting a new chapter in your career, you've become part of a company that values curiosity, ownership, and continuous improvement.
            </p>

            <Callout type="important">
              This handbook is designed to help you understand who we are, how we work, and what you can expect as a member of our team. It also explains the standards, policies, and principles that guide our daily work.
            </Callout>

            <SectionH id="our-story">Our Story</SectionH>
            <p className="text-sm text-foreground/75 leading-relaxed mb-3">
              Dynime was founded with a simple belief: <em className="text-foreground font-semibold">Businesses should spend less time managing complexity and more time creating value.</em>
            </p>
            <p className="text-sm text-foreground/75 leading-relaxed mb-3">
              Since our journey began in 2020, we've worked with startups, entrepreneurs, agencies, and organizations across multiple industries, helping them solve business challenges through technology, automation, digital transformation, and strategic consulting.
            </p>
            <p className="text-sm text-foreground/75 leading-relaxed">
              What started as a small digital services business has grown into an international company serving clients across different countries and time zones. Today, Dynime continues to expand its capabilities through software development, business consulting, AI-powered solutions, cloud technologies, marketing, and operational systems.
            </p>

            <SectionH id="who-we-are">Who We Are</SectionH>
            <p className="text-sm text-foreground/75 leading-relaxed mb-3">Dynime is a global technology and business solutions company. We partner with businesses to design, build, improve, and scale digital products and operational systems. Our work spans multiple disciplines:</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 my-4">
              {["Software Development","AI & Automation","Business Consulting","Web Development","Digital Marketing","Cloud Solutions","E-commerce","UI/UX Design","Business Operations"].map(s => (
                <div key={s} className="text-xs font-semibold px-3 py-2 rounded-lg bg-muted/50 border border-border/40 text-foreground/80">{s}</div>
              ))}
            </div>

            <SectionH id="our-purpose">Our Purpose</SectionH>
            <blockquote className="border-l-4 border-primary pl-4 my-4 italic text-foreground/80 text-sm leading-relaxed">
              "We exist to help businesses work smarter. Through technology, automation, and strategic thinking, we enable organizations to reduce complexity, improve efficiency, and unlock sustainable growth."
            </blockquote>

            <SectionH id="working-at-dynime">Working at Dynime</SectionH>
            <p className="text-sm text-foreground/75 leading-relaxed mb-3">Working at Dynime means embracing responsibility. We believe great work comes from people who are trusted to think independently, communicate openly, and continuously improve. Our culture values initiative over instruction.</p>
            <Callout type="note">Mistakes are part of learning. Failing to learn from them is not.</Callout>

            <SectionH id="expectations">Mutual Expectations</SectionH>
            <div className="grid md:grid-cols-2 gap-4 my-4">
              <div className="rounded-xl border border-border/40 bg-white dark:bg-zinc-900 p-4">
                <p className="text-xs font-bold text-foreground mb-2 uppercase tracking-wide">What We Expect From You</p>
                <BList items={["Act with honesty and integrity","Treat everyone with respect and professionalism","Take ownership of your work","Communicate clearly and proactively","Protect confidential information","Continue learning and developing skills","Represent Dynime professionally"]} />
              </div>
              <div className="rounded-xl border border-border/40 bg-white dark:bg-zinc-900 p-4">
                <p className="text-xs font-bold text-foreground mb-2 uppercase tracking-wide">What Dynime Provides</p>
                <BList items={["A respectful and inclusive workplace","Equal opportunities for growth","Fair compensation and transparent policies","Meaningful work with real impact","Access to learning and development","Modern tools and technology","Open communication and feedback"]} />
              </div>
            </div>
          </article>

          {/* ════════════════════════════════════════════════ */}
          {/* CHAPTER 2 — Mission, Vision & Values */}
          {/* ════════════════════════════════════════════════ */}
          <article id="ch2" className="scroll-mt-20 mb-16">
            <ChapterHeader number="02" title="Mission, Vision & Core Values" color="blue" icon={Zap} />

            <SectionH id="mission">Our Mission</SectionH>
            <blockquote className="border-l-4 border-blue-500 pl-4 my-4 italic text-foreground/80 text-sm leading-relaxed">
              "To empower businesses with innovative technology, intelligent automation, and strategic expertise that simplify operations, improve efficiency, and create sustainable growth."
            </blockquote>

            <SectionH id="vision">Our Vision</SectionH>
            <p className="text-sm text-foreground/75 leading-relaxed mb-3">
              To become a globally trusted technology and business solutions company recognized for helping organizations transform the way they work. We aspire to build products, services, and partnerships that create long-term value for businesses of all sizes.
            </p>

            <SectionH id="core-values">Core Values</SectionH>
            <div className="grid md:grid-cols-2 gap-3 my-4">
              {[
                { title: "Customer Success First", desc: "Our success is directly connected to the success of our clients. We listen before offering solutions.", color: "blue" },
                { title: "Ownership", desc: "Take responsibility for outcomes, not just tasks. Act proactively and follow through.", color: "violet" },
                { title: "Excellence", desc: "Quality is not an accident. Deliver work that reflects professionalism and pride.", color: "amber" },
                { title: "Continuous Learning", desc: "Technology evolves every day, and so do we. Expand knowledge and share expertise.", color: "emerald" },
                { title: "Integrity", desc: "Do the right thing, even when it's difficult. Honesty, transparency, and accountability.", color: "rose" },
                { title: "Respect", desc: "Every employee deserves to work in an environment where they feel valued and heard.", color: "teal" },
                { title: "Collaboration", desc: "Great work is rarely achieved alone. Share knowledge and support teammates.", color: "indigo" },
                { title: "Innovation", desc: "Find better ways to solve problems. Challenge outdated processes and experiment responsibly.", color: "sky" },
                { title: "Simplicity", desc: "Simple solutions are often the most effective. Remove unnecessary complexity.", color: "orange" },
                { title: "Growth Mindset", desc: "Abilities can be developed through effort. Challenges are opportunities to improve.", color: "purple" },
              ].map(v => (
                <div key={v.title} className={`rounded-xl border p-4 ${colorMap[v.color]}`}>
                  <p className="font-bold text-[13px] mb-1">{v.title}</p>
                  <p className="text-xs leading-relaxed opacity-90">{v.desc}</p>
                </div>
              ))}
            </div>

            <SectionH id="operating-principles">Operating Principles</SectionH>
            <BList items={[
              "We Communicate Clearly — Share information openly, provide timely updates, and communicate with professionalism.",
              "We Deliver on Our Commitments — When we make a commitment, we follow through.",
              "We Make Decisions with Data — Base decisions on facts and measurable outcomes, not assumptions.",
              "We Think Long-Term — Prioritize sustainable growth over short-term gains.",
              "We Continuously Improve — Every process, product, and service can be made better.",
            ]} />
          </article>

          {/* ════════════════════════════════════════════════ */}
          {/* CHAPTER 3 — How We Work */}
          {/* ════════════════════════════════════════════════ */}
          <article id="ch3" className="scroll-mt-20 mb-16">
            <ChapterHeader number="03" title="How We Work at Dynime" color="teal" icon={Globe} />
            <blockquote className="border-l-4 border-teal-500 pl-4 my-4 italic text-foreground/80 text-sm leading-relaxed">
              "Culture is not what we say. It's how we work every day."
            </blockquote>

            <SectionH id="remote-first">Remote-First by Design</SectionH>
            <p className="text-sm text-foreground/75 leading-relaxed mb-3">Dynime is a remote-first company. Our processes, communication, and collaboration are designed to support distributed teams across different locations and time zones. Success is measured by outcomes, quality, and accountability rather than physical presence.</p>
            <BList items={[
              "Maintain a professional workspace with reliable internet connectivity",
              "Keep regular working hours and communicate your schedule to your team",
              "Be available during core working hours for synchronous collaboration",
              "Ensure your home office setup supports focused, productive work",
            ]} />

            <SectionH id="communication">Communication Principles</SectionH>
            <p className="text-sm text-foreground/75 leading-relaxed mb-3">Clear communication is essential in a distributed workplace. We encourage communication that is clear, respectful, professional, timely, and constructive.</p>
            <PolicyTable rows={[
              ["Email", "Formal communications, client correspondence, official notices"],
              ["Slack / Teams", "Day-to-day team communication, quick questions"],
              ["Project Tools", "Task tracking, project updates, documentation"],
              ["WhatsApp", "Urgent or informal team communication only"],
              ["Video Calls", "Meetings, client calls, team check-ins"],
            ]} />

            <SectionH id="meetings">Meetings & Asynchronous Work</SectionH>
            <p className="text-sm text-foreground/75 leading-relaxed mb-3">Meetings should have a clear purpose. Before scheduling, consider whether the objective could be achieved through documentation or async communication.</p>
            <div className="grid md:grid-cols-2 gap-4 my-4">
              <div className="rounded-xl border border-border/40 bg-white dark:bg-zinc-900 p-4">
                <p className="text-xs font-bold text-foreground mb-2 uppercase tracking-wide">When in Meetings</p>
                <BList items={["Arrive prepared and on time","Review pre-read materials","Stay focused on the agenda","Respect everyone's time","End with clear action items"]} />
              </div>
              <div className="rounded-xl border border-border/40 bg-white dark:bg-zinc-900 p-4">
                <p className="text-xs font-bold text-foreground mb-2 uppercase tracking-wide">Async First Approach</p>
                <BList items={["Document decisions clearly","Write actionable updates","Set realistic async deadlines","Don't expect immediate replies outside hours","Use structured written communication"]} />
              </div>
            </div>

            <SectionH id="accountability">Accountability</SectionH>
            <p className="text-sm text-foreground/75 leading-relaxed mb-3">Every employee is accountable for their responsibilities, commitments, communication, quality of work, and professional conduct. If circumstances prevent you from meeting expectations, communicate early.</p>
            <Callout type="note">If something affects your ability to meet a deadline, communicate it as early as possible. Surprises should be rare because communication should be continuous.</Callout>

            <SectionH id="feedback-culture">Feedback Culture</SectionH>
            <p className="text-sm text-foreground/75 leading-relaxed mb-3">We encourage feedback that is respectful, honest, constructive, timely, and specific. When receiving feedback, listen carefully, ask questions if needed, and focus on improvement rather than defensiveness.</p>
          </article>

          {/* ════════════════════════════════════════════════ */}
          {/* CHAPTER 4 — Employment Policy */}
          {/* ════════════════════════════════════════════════ */}
          <article id="ch4" className="scroll-mt-20 mb-16">
            <ChapterHeader number="04" title="Employment Policy" color="indigo" icon={Briefcase} />
            <Callout type="note">Individual employment agreements, local labor laws, and applicable regulations will prevail where required by law. This handbook provides general guidance applicable across all regions.</Callout>

            <SectionH id="employment-categories">Employment Categories</SectionH>
            <PolicyTable rows={[
              ["Full-Time", "Standard weekly schedule, eligible for full benefits"],
              ["Part-Time", "Fewer hours than full-time; benefits based on policy and local law"],
              ["Contract", "Services under a separate agreement; not considered employees unless required by law"],
              ["Intern", "Structured learning opportunity; terms defined in internship agreement"],
              ["Temporary", "Hired for specific project or limited duration"],
            ]} />

            <SectionH id="probation">Probation Period</SectionH>
            <p className="text-sm text-foreground/75 leading-relaxed mb-3">New employees typically complete a probation period as specified in their employment agreement. During this time, both Dynime and the employee assess suitability for the role.</p>
            <BList items={[
              "Standard probation: 2–6 months depending on the role",
              "Performance review conducted at the midpoint and end of probation",
              "Probation may be extended with documented justification",
              "Confirmation letter issued upon successful completion",
              "Either party may terminate employment during probation with appropriate notice",
            ]} />
            <Callout type="important">Salary, benefits, and confirmation criteria will be specified in the individual employment agreement.</Callout>

            <SectionH id="working-hours">Working Hours</SectionH>
            <PolicyTable rows={[
              ["Standard Hours", "8 hours per working day"],
              ["Work Type", "Remote — work from anywhere"],
              ["Holiday", "Sunday (may be adjusted based on employee location and availability)"],
              ["Core Hours", "To be agreed between employee and manager"],
              ["Overtime", "Prior approval required; compensated per local law or company policy"],
              ["Breaks", "Regular breaks are encouraged for wellbeing and productivity"],
            ]} />
            <Callout type="note">Working hours are flexible by discussion. Core hours ensure team overlap for collaboration. Flexibility is granted based on role requirements and manager approval.</Callout>

            <SectionH id="attendance">Attendance</SectionH>
            <BList items={[
              "Employees are expected to be available and responsive during agreed working hours",
              "Unplanned absences should be reported to the manager as early as possible",
              "Repeated unexplained absences may result in disciplinary action",
              "Time tracking may be required depending on role and project",
            ]} />

            <SectionH id="resignation">Resignation & Termination</SectionH>
            <div className="grid md:grid-cols-2 gap-4 my-4">
              <div className="rounded-xl border border-border/40 bg-white dark:bg-zinc-900 p-4">
                <p className="text-xs font-bold text-foreground mb-2 uppercase tracking-wide">Resignation Process</p>
                <BList items={["Submit written notice to manager and HR","Notice period as specified in employment agreement","Complete knowledge transfer and handover","Return all company assets","Participate in exit interview","Final settlement processed within agreed timeline"]} />
              </div>
              <div className="rounded-xl border border-border/40 bg-white dark:bg-zinc-900 p-4">
                <p className="text-xs font-bold text-foreground mb-2 uppercase tracking-wide">Grounds for Termination</p>
                <BList items={["Serious misconduct or dishonesty","Repeated policy violations after warnings","Unsatisfactory performance after PIP","Redundancy or business restructuring","Breach of confidentiality or NDA","Provision of false employment information"]} />
              </div>
            </div>
          </article>

          {/* ════════════════════════════════════════════════ */}
          {/* CHAPTER 5 — Leave */}
          {/* ════════════════════════════════════════════════ */}
          <article id="ch5" className="scroll-mt-20 mb-16">
            <ChapterHeader number="05" title="Leave & Holidays" color="amber" icon={Sun} />

            <SectionH id="annual-leave">Annual Leave</SectionH>
            <PolicyTable rows={[
              ["Entitlement", "14 working days per calendar year"],
              ["Eligibility", "Full-time employees after completing probation"],
              ["Accrual", "Accrued proportionally throughout the year"],
              ["Carry Forward", "Subject to manager approval and business requirements"],
              ["Approval", "Minimum 3 business days advance notice required"],
            ]} />

            <SectionH id="sick-leave">Sick Leave</SectionH>
            <PolicyTable rows={[
              ["Entitlement", "5 working days per calendar year"],
              ["Documentation", "Required for absences exceeding 2 consecutive days"],
              ["Notification", "Inform manager as early as possible on the day of absence"],
              ["Abuse", "Patterns of misuse may result in disciplinary review"],
            ]} />
            <Callout type="note">Dynime provides 5 days of paid sick leave, reflecting our commitment to employee wellbeing and aligning with international remote-first technology company standards.</Callout>

            <SectionH id="other-leaves">Other Leave Types</SectionH>
            <PolicyTable rows={[
              ["Emergency Leave", "3 working days per year for urgent personal or family matters"],
              ["Casual Leave", "Included within annual leave entitlement"],
              ["Maternity Leave", "As per applicable local employment law"],
              ["Paternity Leave", "As per applicable local employment law"],
              ["Bereavement Leave", "3–5 days for immediate family; subject to manager approval"],
              ["Unpaid Leave", "Available subject to business requirements and HR approval"],
            ]} />

            <SectionH id="public-holidays">Public Holidays</SectionH>
            <p className="text-sm text-foreground/75 leading-relaxed mb-3">Employees are entitled to paid public holidays based on their primary country of employment or approved work location. Regional variations apply. The standard weekly day off is <strong className="text-foreground">Sunday</strong>, with flexibility available based on employee location and agreement.</p>

            <SectionH id="leave-guidelines">General Leave Guidelines</SectionH>
            <BList items={[
              "Planned leave must be submitted through the HR system and approved in advance",
              "Leave approval is subject to business requirements and team coverage",
              "Emergency leave should be reported to the manager as soon as reasonably possible",
              "Unused annual leave may be carried forward or will expire per company policy",
              "Abuse or misuse of leave benefits may result in disciplinary action",
            ]} />
          </article>

          {/* ════════════════════════════════════════════════ */}
          {/* CHAPTER 6 — Compensation */}
          {/* ════════════════════════════════════════════════ */}
          <article id="ch6" className="scroll-mt-20 mb-16">
            <ChapterHeader number="06" title="Compensation & Benefits" color="emerald" icon={Star} />

            <SectionH id="salary">Salary & Payroll</SectionH>
            <BList items={[
              "Salary is specified in the individual employment agreement",
              "Payment is made on the agreed payroll schedule (monthly or bi-weekly)",
              "Dynime operates in multiple currencies; payment currency is specified in the employment agreement",
              "Applicable deductions and taxes are processed in accordance with local law",
              "Salary revisions are reviewed annually or during performance promotion cycles",
            ]} />

            <SectionH id="benefits">Benefits</SectionH>
            <PolicyTable rows={[
              ["Annual Leave", "14 paid working days per year"],
              ["Sick Leave", "5 paid working days per year"],
              ["Remote Work", "Full remote — work from your preferred location"],
              ["Flexible Hours", "Core hours with flexibility by discussion"],
              ["Holiday", "Sunday off (adjustable by location)"],
              ["Learning Budget", "Access to approved courses, certifications, and training"],
              ["Equipment", "Allowance or provision based on role requirements"],
              ["Internet Allowance", "As specified in employment agreement"],
            ]} />

            <SectionH id="reimbursements">Reimbursements</SectionH>
            <BList items={[
              "Business expenses pre-approved by the manager are eligible for reimbursement",
              "Submit expense claims with receipts within 30 days of the expense",
              "Eligible expenses include: business travel, client meetings, approved software, and training",
              "Reimbursements are processed in the regular payroll cycle",
            ]} />
          </article>

          {/* ════════════════════════════════════════════════ */}
          {/* CHAPTER 7 — Performance */}
          {/* ════════════════════════════════════════════════ */}
          <article id="ch7" className="scroll-mt-20 mb-16">
            <ChapterHeader number="07" title="Performance & Career Growth" color="sky" icon={Zap} />

            <SectionH id="kpis">KPIs & OKRs</SectionH>
            <p className="text-sm text-foreground/75 leading-relaxed mb-3">Performance at Dynime is measured through a combination of Key Performance Indicators (KPIs) and Objectives & Key Results (OKRs). These are agreed upon at the beginning of each review period in collaboration with the employee's manager.</p>

            <SectionH id="reviews">Performance Reviews</SectionH>
            <PolicyTable rows={[
              ["Monthly Check-ins", "Informal progress discussions between employee and manager"],
              ["Quarterly Reviews", "Formal review of goals, performance, and development"],
              ["Annual Review", "Comprehensive evaluation; determines promotions and salary revisions"],
              ["PIP", "Performance Improvement Plan for employees not meeting expectations"],
            ]} />
            <Callout type="note">A PIP is a structured support tool, not a punitive measure. It defines specific, measurable improvement targets with a clear timeline and support plan.</Callout>

            <SectionH id="learning">Learning & Development</SectionH>
            <BList items={[
              "All employees are encouraged to invest in continuous professional development",
              "Dynime provides access to approved online courses, certifications, and training resources",
              "Learning goals should be discussed with your manager during quarterly reviews",
              "Internal knowledge-sharing sessions are encouraged across teams",
              "Employees may request learning budget support for role-relevant qualifications",
            ]} />

            <SectionH id="promotions">Promotions & Career Growth</SectionH>
            <BList items={[
              "Promotions are merit-based, driven by consistent performance and demonstrated growth",
              "Internal opportunities are prioritized when positions become available",
              "Career growth discussions take place during annual performance reviews",
              "Employees are encouraged to discuss career goals openly with their managers",
            ]} />
          </article>

          {/* ════════════════════════════════════════════════ */}
          {/* CHAPTER 8 — Code of Conduct */}
          {/* ════════════════════════════════════════════════ */}
          <article id="ch8" className="scroll-mt-20 mb-16">
            <ChapterHeader number="08" title="Code of Conduct" color="rose" icon={Shield} />
            <p className="text-sm text-foreground/75 leading-relaxed mb-4">All Dynime employees are expected to conduct themselves with the highest standards of professionalism, integrity, and respect in all business interactions.</p>

            <SectionH id="professionalism">Professionalism & Ethics</SectionH>
            <BList items={[
              "Treat all colleagues, clients, and partners with respect and professionalism",
              "Maintain confidentiality of business and client information at all times",
              "Deliver work with quality, accuracy, and care",
              "Represent Dynime positively in all public and professional interactions",
              "Act with honesty even when the outcome is inconvenient",
            ]} />

            <SectionH id="anti-bribery">Anti-Bribery & Anti-Corruption</SectionH>
            <p className="text-sm text-foreground/75 leading-relaxed mb-3">Dynime maintains a zero-tolerance policy toward bribery and corruption in any form.</p>
            <BList items={[
              "Employees must not offer, request, accept, or facilitate bribes of any kind",
              "Gifts and entertainment must be modest, transparent, and not intended to influence decisions",
              "Report any suspected bribery or corruption to HR or management immediately",
            ]} />
            <Callout type="warning">Violation of this policy may result in immediate termination and, where required, referral to relevant legal authorities.</Callout>

            <SectionH id="social-media">Social Media Conduct</SectionH>
            <BList items={[
              "Employees must not share confidential or proprietary Dynime information on social media",
              "Personal opinions must be clearly identified as personal and not representative of Dynime",
              "Do not post content that could harm Dynime's reputation or that of clients or colleagues",
              "Dynime's branding and intellectual property must not be used without authorization",
            ]} />

            <SectionH id="conflict-of-interest">Conflict of Interest</SectionH>
            <p className="text-sm text-foreground/75 leading-relaxed mb-3">Employees must avoid situations where personal interests conflict with their professional responsibilities to Dynime.</p>
            <BList items={[
              "Disclose any potential conflicts of interest to HR or your manager immediately",
              "Do not engage in outside employment that conflicts with Dynime's business without prior approval",
              "Personal relationships must not influence business decisions",
            ]} />
          </article>

          {/* ════════════════════════════════════════════════ */}
          {/* CHAPTER 9 — Information Security */}
          {/* ════════════════════════════════════════════════ */}
          <article id="ch9" className="scroll-mt-20 mb-16">
            <ChapterHeader number="09" title="Information Security" color="slate" icon={Lock} />
            <Callout type="warning">Information security is every employee's responsibility. A single security breach can harm our clients, our business, and our reputation.</Callout>

            <SectionH id="passwords">Passwords & Multi-Factor Authentication</SectionH>
            <BList items={[
              "Use strong, unique passwords for all work accounts (minimum 12 characters)",
              "Enable multi-factor authentication (MFA) on all company systems and accounts",
              "Never share passwords with colleagues, managers, or third parties",
              "Use an approved password manager for storing credentials",
              "Change passwords immediately if you suspect a compromise",
            ]} />

            <SectionH id="device-security">Device Security</SectionH>
            <BList items={[
              "Keep operating systems, software, and antivirus updated at all times",
              "Lock your device screen when unattended",
              "Encrypt your hard drive (BitLocker or FileVault recommended)",
              "Do not use public or unsecured Wi-Fi without a VPN",
              "Report lost or stolen devices to IT and HR immediately",
            ]} />

            <SectionH id="vpn-cloud">VPN & Cloud Storage</SectionH>
            <BList items={[
              "Use company-approved VPN when accessing company systems on public networks",
              "Store company data only in approved cloud storage platforms",
              "Do not transfer confidential data to personal cloud accounts",
              "Follow company data classification and labeling guidelines",
            ]} />

            <SectionH id="incident-reporting">Incident Reporting</SectionH>
            <p className="text-sm text-foreground/75 leading-relaxed mb-3">All suspected security incidents must be reported immediately, including:</p>
            <BList items={[
              "Phishing emails or suspicious communications",
              "Unauthorized access attempts to company systems",
              "Lost or stolen devices",
              "Accidental exposure of confidential information",
              "Any unusual system behavior that may indicate a breach",
            ]} />
          </article>

          {/* ════════════════════════════════════════════════ */}
          {/* CHAPTER 10 — IT Acceptable Use */}
          {/* ════════════════════════════════════════════════ */}
          <article id="ch10" className="scroll-mt-20 mb-16">
            <ChapterHeader number="10" title="IT & Acceptable Use Policy" color="purple" icon={Wifi} />

            <SectionH id="company-devices">Company-Issued Devices</SectionH>
            <BList items={[
              "Company devices are provided for business use",
              "Personal use must be kept minimal and must not interfere with performance or security",
              "Do not install unauthorized software, applications, or browser extensions",
              "Return all devices in good condition upon separation",
              "Report damage or technical issues to IT promptly",
            ]} />

            <SectionH id="byod">Personal Devices (BYOD)</SectionH>
            <BList items={[
              "Personal devices used for work must meet minimum security requirements",
              "Enable device encryption, screen lock, and up-to-date antivirus",
              "Install only company-approved applications for work access",
              "Company data stored on personal devices must be removed upon separation",
            ]} />

            <SectionH id="ai-tools">AI Tools Usage (IT Perspective)</SectionH>
            <BList items={[
              "Use only approved AI tools as listed in the AI Usage Policy",
              "Do not use unauthorized AI tools to process or store company or client data",
              "All AI tool usage on company systems may be monitored for compliance",
            ]} />

            <SectionH id="monitoring">Monitoring Notice</SectionH>
            <Callout type="important">Dynime may monitor the use of company devices, systems, and networks to the extent permitted by law. This monitoring is intended to protect company assets, ensure security, and maintain compliance. Employees should have no expectation of privacy when using company systems for personal activities.</Callout>
          </article>

          {/* ════════════════════════════════════════════════ */}
          {/* CHAPTER 11 — AI Usage Policy */}
          {/* ════════════════════════════════════════════════ */}
          <article id="ch11" className="scroll-mt-20 mb-16">
            <ChapterHeader number="11" title="AI Usage Policy" color="violet" icon={Zap} />
            <p className="text-sm text-foreground/75 leading-relaxed mb-4">Dynime embraces the thoughtful use of AI tools to enhance productivity, creativity, and efficiency. This policy establishes responsible guidelines for AI usage across the organization.</p>

            <SectionH id="approved-ai-uses">Approved Uses of AI</SectionH>
            <BList items={[
              "Coding assistance and code review",
              "Documentation drafting and improvement",
              "Research and information gathering",
              "Design ideation and brainstorming",
              "Content drafting for review by a human before publication",
              "Summarizing internal documents and meeting notes",
              "Automating repetitive workflows with approved tools",
            ]} />

            <SectionH id="prohibited-ai-uses">Prohibited Uses of AI</SectionH>
            <Callout type="warning">The following actions are strictly prohibited and may result in disciplinary action up to and including termination.</Callout>
            <BList items={[
              "Uploading confidential, proprietary, or client information to unauthorized AI services",
              "Submitting client source code to public AI tools without explicit written approval",
              "Sharing company credentials, API keys, or passwords with AI systems",
              "Generating misleading, deceptive, or fraudulent content",
              "Using AI to impersonate employees, clients, or third parties",
              "Bypassing internal review processes using AI-generated output",
            ]} />

            <SectionH id="ai-responsibility">Employee Responsibility</SectionH>
            <p className="text-sm text-foreground/75 leading-relaxed mb-3">Employees are responsible for reviewing and validating all AI-generated output before use. AI tools are assistants, not decision-makers. Final responsibility for accuracy, quality, and appropriateness rests with the employee.</p>
            <Callout type="note">When in doubt about whether a specific AI tool or use case is permitted, consult your manager or HR before proceeding.</Callout>
          </article>

          {/* ════════════════════════════════════════════════ */}
          {/* CHAPTER 12 — Confidentiality & IP */}
          {/* ════════════════════════════════════════════════ */}
          <article id="ch12" className="scroll-mt-20 mb-16">
            <ChapterHeader number="12" title="Confidentiality & Intellectual Property" color="orange" icon={Lock} />

            <SectionH id="confidential-info">Confidential Information</SectionH>
            <p className="text-sm text-foreground/75 leading-relaxed mb-3">Confidential information includes all non-public information that Dynime designates as confidential or that a reasonable person would understand to be confidential given the nature of the information.</p>
            <BList items={[
              "Client information, data, source code, and project details",
              "Financial data, pricing, business plans, and roadmaps",
              "Employee data and personal information",
              "Internal systems, credentials, and access information",
              "Trade secrets and proprietary methodologies",
              "Contract terms and partnership agreements",
            ]} />

            <SectionH id="ip-ownership">Intellectual Property Ownership</SectionH>
            <p className="text-sm text-foreground/75 leading-relaxed mb-3">All work created by employees during the course of their employment belongs to Dynime, including:</p>
            <BList items={[
              "Source code, software, scripts, and technical documentation",
              "UI/UX designs, graphics, and visual assets",
              "Marketing materials, written content, and publications",
              "Research, methodologies, and processes",
              "AI-generated work produced for company purposes",
              "Patents, trademarks, and inventions developed using company resources",
            ]} />

            <SectionH id="nda-obligations">NDA Obligations</SectionH>
            <BList items={[
              "Confidentiality obligations remain in effect after employment ends",
              "Employees must not disclose confidential information for personal gain",
              "Violations may result in disciplinary action, legal action, or both",
              "Return or destroy all confidential materials upon separation",
            ]} />
            <Callout type="warning">Breach of confidentiality is a serious misconduct matter and may result in immediate termination and legal proceedings.</Callout>
          </article>

          {/* ════════════════════════════════════════════════ */}
          {/* CHAPTER 13 — Workplace Respect */}
          {/* ════════════════════════════════════════════════ */}
          <article id="ch13" className="scroll-mt-20 mb-16">
            <ChapterHeader number="13" title="Workplace Respect & Equal Opportunity" color="pink" icon={Heart} />

            <SectionH id="equal-opportunity">Equal Employment Opportunity</SectionH>
            <p className="text-sm text-foreground/75 leading-relaxed mb-3">Dynime is committed to fair employment regardless of any legally protected characteristic, including:</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 my-3">
              {["Age","Disability","Gender","Gender Identity","Marital Status","Nationality","Race or Ethnicity","Religion","Sexual Orientation","Veteran Status"].map(s => (
                <div key={s} className="text-xs font-semibold px-3 py-2 rounded-lg bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 text-pink-700 dark:text-pink-300">{s}</div>
              ))}
            </div>

            <SectionH id="anti-harassment">Anti-Harassment Policy</SectionH>
            <p className="text-sm text-foreground/75 leading-relaxed mb-3">Dynime maintains a zero-tolerance policy toward any form of harassment in the workplace, including:</p>
            <BList items={[
              "Sexual harassment — unwelcome conduct of a sexual nature",
              "Bullying — persistent intimidation, abuse of power, or verbal aggression",
              "Discrimination — unfair treatment based on protected characteristics",
              "Retaliation — adverse treatment of an employee for reporting misconduct",
              "Any behavior that creates a hostile or intimidating work environment",
            ]} />
            <Callout type="warning">Violations of this policy will be taken seriously and may result in disciplinary action up to and including termination, regardless of seniority or position.</Callout>

            <SectionH id="reporting">Reporting Procedure</SectionH>
            <BList items={[
              "Employees may report concerns to their direct manager or HR",
              "Reports may be made anonymously where possible",
              "All reports will be treated confidentially and investigated promptly",
              "No employee will face retaliation for making a good-faith report",
              "Investigation outcomes will be communicated appropriately",
            ]} />
          </article>

          {/* ════════════════════════════════════════════════ */}
          {/* CHAPTER 14 — Disciplinary */}
          {/* ════════════════════════════════════════════════ */}
          <article id="ch14" className="scroll-mt-20 mb-16">
            <ChapterHeader number="14" title="Disciplinary Process & Grievances" color="red" icon={AlertCircle} />

            <SectionH id="progressive-discipline">Progressive Discipline</SectionH>
            <p className="text-sm text-foreground/75 leading-relaxed mb-3">Dynime uses a progressive discipline approach for most performance and conduct issues, except where immediate dismissal is warranted.</p>
            <PolicyTable rows={[
              ["Step 1", "Verbal Warning — documented discussion of the concern"],
              ["Step 2", "Written Warning — formal written notice with improvement expectations"],
              ["Step 3", "Final Written Warning — last formal warning before further action"],
              ["Step 4", "Suspension — temporary suspension pending investigation"],
              ["Step 5", "Termination — employment ends following serious or repeated violations"],
            ]} />
            <Callout type="important">Serious misconduct such as fraud, violence, harassment, or confidentiality breaches may result in immediate termination without prior warnings.</Callout>

            <SectionH id="grievance-process">Grievance Process</SectionH>
            <BList items={[
              "Employees may raise concerns informally with their manager in the first instance",
              "Formal grievances should be submitted in writing to HR",
              "HR will acknowledge the grievance within 3 business days",
              "Investigation will be completed within a reasonable timeframe",
              "Outcomes will be communicated in writing",
              "Employees may appeal decisions through the established process",
            ]} />

            <SectionH id="whistleblower">Whistleblower Protection</SectionH>
            <p className="text-sm text-foreground/75 leading-relaxed mb-3">Employees who report suspected misconduct, illegal activity, or policy violations in good faith are protected from retaliation.</p>
            <BList items={[
              "Anonymous reporting channels are available where technically feasible",
              "All reports are treated with the utmost confidentiality",
              "Retaliation against whistleblowers is a serious disciplinary matter",
            ]} />
          </article>

          {/* ════════════════════════════════════════════════ */}
          {/* CHAPTER 15 — Offboarding */}
          {/* ════════════════════════════════════════════════ */}
          <article id="ch15" className="scroll-mt-20 mb-16">
            <ChapterHeader number="15" title="Resignation & Offboarding" color="gray" icon={FileText} />

            <SectionH id="notice-period">Notice Period</SectionH>
            <p className="text-sm text-foreground/75 leading-relaxed mb-3">Notice periods are specified in individual employment agreements. During the notice period, employees are expected to continue performing their duties professionally and cooperate fully with the transition process.</p>

            <SectionH id="asset-return">Asset Return</SectionH>
            <BList items={[
              "All company assets must be returned on or before the final working day",
              "Assets include: laptops, peripherals, access cards, documents, and any other company property",
              "Failure to return assets in good condition may result in deductions from the final paycheck, where permitted by law",
              "Company data must be removed from all personal devices",
            ]} />

            <SectionH id="exit-interview">Exit Interview</SectionH>
            <p className="text-sm text-foreground/75 leading-relaxed mb-3">An exit interview will be conducted by HR to gather feedback and support continuous organizational improvement. Participation is encouraged. Insights shared are treated confidentially and used to improve the employee experience.</p>

            <SectionH id="post-employment">Post-Employment Obligations</SectionH>
            <BList items={[
              "Confidentiality obligations continue after employment ends",
              "Non-solicitation obligations as specified in the employment agreement",
              "Intellectual property created during employment remains with Dynime",
              "References will be provided in accordance with company policy",
            ]} />
            <Callout type="note">The offboarding checklist will be provided by HR and must be completed before the final paycheck is processed.</Callout>
          </article>

          {/* ════════════════════════════════════════════════ */}
          {/* CHAPTER 16 — Acknowledgment */}
          {/* ════════════════════════════════════════════════ */}
          <article id="ch16" className="scroll-mt-20 mb-16">
            <ChapterHeader number="16" title="Employee Acknowledgment" color="green" icon={Check} />

            <SectionH id="acknowledgment-statement">Acknowledgment Statement</SectionH>
            <div className="rounded-2xl border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-6 my-4">
              <p className="text-sm text-foreground/80 leading-relaxed mb-4">By working at Dynime, I confirm that I have:</p>
              <BList items={[
                "Received and read the Dynime Employee Handbook",
                "Understood the policies, expectations, and standards outlined herein",
                "Agreed to comply with all applicable company rules and procedures",
                "Understood that policies may be updated and I will be informed of significant changes",
                "Acknowledged that this handbook does not constitute an employment contract unless explicitly stated in a separate written agreement",
              ]} />
              <p className="text-xs text-muted-foreground mt-4 font-medium">A formal acknowledgment form will be provided by HR for signature upon commencement of employment.</p>
            </div>

            <SectionH id="version-history">Version History</SectionH>
            <PolicyTable rows={[
              ["Version", "1.0"],
              ["Date", "July 2026"],
              ["Status", "Active"],
              ["Classification", "Confidential — Internal Use Only"],
              ["Owner", "Dynime HR & Operations"],
              ["Review Cycle", "Annual, or as required by business or legal changes"],
            ]} />

            {/* Footer */}
            <div className="mt-12 pt-6 border-t border-border/40 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border/40">
                <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">Confidential · Dynime LLC · Internal Use Only · Version 1.0 · July 2026</span>
              </div>
            </div>
          </article>

        </main>
      </div>

      {/* Scroll to top */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-all"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

// ─── Chapter Header Component ────────────────────────────────────
const ChapterHeader = ({ number, title, color, icon: Icon }: { number: string; title: string; color: string; icon: React.ElementType }) => (
  <div className={`flex items-center gap-4 p-5 rounded-2xl border ${colorMap[color]} mb-6`}>
    <div className={`w-12 h-12 rounded-xl ${dotMap[color]} flex items-center justify-center shrink-0 shadow-sm`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div>
      <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Chapter {number}</span>
      <h2 className="font-heading font-extrabold text-xl leading-snug">{title}</h2>
    </div>
  </div>
);

export default EmployeeHandbook;

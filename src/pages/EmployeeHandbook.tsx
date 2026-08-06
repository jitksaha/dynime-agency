import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import Layout from "@/components/layout/Layout";
import {
  Search, BookOpen, ChevronRight, Lock, Shield,
  Globe, Zap, Star, Check, AlertCircle,
  FileText, Briefcase, Heart, Wifi, Sun,
  ChevronUp, X, TriangleAlert, Info,
  BadgeCheck, Sparkles, Building2, Users,
  GraduationCap, DollarSign, TrendingUp,
  MessageSquare, ShieldCheck, Monitor, Bot,
  Fingerprint, Scale, AlertOctagon, LogOut,
  ClipboardCheck, Menu, Database, HelpCircle,
  Phone, ListChecks, Crown, Layers, Award,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────
interface SubSection { id: string; title: string; }
interface Chapter {
  id: string;
  number: string;
  title: string;
  icon: React.ElementType;
  gradient: string;
  accent: string;
  sections: SubSection[];
}

// ─── Chapter Registry ─────────────────────────────────────────────
const CHAPTERS: Chapter[] = [
  { id:"ch1", number:"01", title:"Welcome to Dynime", icon:Building2,
    gradient:"from-violet-500 to-purple-600", accent:"violet",
    sections:[{id:"our-story",title:"Our Story"},{id:"who-we-are",title:"Who We Are"},{id:"our-purpose",title:"Our Purpose"},{id:"working-at-dynime",title:"Working at Dynime"},{id:"expectations",title:"Mutual Expectations"}] },
  { id:"ch2", number:"02", title:"Mission, Vision & Values", icon:Sparkles,
    gradient:"from-blue-500 to-indigo-600", accent:"blue",
    sections:[{id:"mission",title:"Our Mission"},{id:"vision",title:"Our Vision"},{id:"core-values",title:"Core Values"},{id:"operating-principles",title:"Operating Principles"}] },
  { id:"ch3", number:"03", title:"How We Work", icon:Globe,
    gradient:"from-teal-500 to-cyan-600", accent:"teal",
    sections:[{id:"remote-first",title:"Remote-First"},{id:"communication",title:"Communication"},{id:"meetings",title:"Meetings & Async"},{id:"accountability",title:"Accountability"},{id:"feedback-culture",title:"Feedback Culture"}] },
  { id:"ch4", number:"04", title:"Employment Policy", icon:Briefcase,
    gradient:"from-indigo-500 to-blue-600", accent:"indigo",
    sections:[{id:"employment-categories",title:"Employment Categories"},{id:"probation",title:"Probation Period"},{id:"working-hours",title:"Working Hours"},{id:"attendance",title:"Attendance"},{id:"resignation",title:"Resignation & Termination"}] },
  { id:"ch5", number:"05", title:"Leave & Holidays", icon:Sun,
    gradient:"from-amber-500 to-orange-500", accent:"amber",
    sections:[{id:"annual-leave",title:"Annual Leave"},{id:"sick-leave",title:"Sick Leave"},{id:"other-leaves",title:"Other Leave Types"},{id:"public-holidays",title:"Public Holidays"},{id:"leave-guidelines",title:"General Guidelines"}] },
  { id:"ch6", number:"06", title:"Compensation & Benefits", icon:DollarSign,
    gradient:"from-emerald-500 to-green-600", accent:"emerald",
    sections:[{id:"salary",title:"Salary & Payroll"},{id:"probationary-compensation",title:"Probationary Compensation"},{id:"monthly-payroll",title:"Monthly Payroll"},{id:"benefits",title:"Benefits"},{id:"reimbursements",title:"Reimbursements"}] },
  { id:"ch7", number:"07", title:"Performance & Growth", icon:TrendingUp,
    gradient:"from-sky-500 to-blue-500", accent:"sky",
    sections:[{id:"kpis",title:"KPIs & OKRs"},{id:"reviews",title:"Performance Reviews"},{id:"learning",title:"Learning & Development"},{id:"promotions",title:"Promotions & Career Growth"}] },
  { id:"ch8", number:"08", title:"Code of Conduct", icon:Shield,
    gradient:"from-rose-500 to-pink-600", accent:"rose",
    sections:[{id:"professionalism",title:"Professionalism & Ethics"},{id:"anti-bribery",title:"Anti-Bribery & Corruption"},{id:"social-media",title:"Social Media Conduct"},{id:"conflict-of-interest",title:"Conflict of Interest"}] },
  { id:"ch9", number:"09", title:"Information Security", icon:Lock,
    gradient:"from-slate-600 to-zinc-700", accent:"slate",
    sections:[{id:"passwords",title:"Passwords & MFA"},{id:"device-security",title:"Device Security"},{id:"vpn-cloud",title:"VPN & Cloud Storage"},{id:"incident-reporting",title:"Incident Reporting"}] },
  { id:"ch10", number:"10", title:"IT & Acceptable Use", icon:Monitor,
    gradient:"from-purple-500 to-violet-600", accent:"purple",
    sections:[{id:"company-devices",title:"Company Devices"},{id:"byod",title:"Personal Devices (BYOD)"},{id:"ai-tools",title:"AI Tools"},{id:"monitoring",title:"Monitoring Notice"}] },
  { id:"ch11", number:"11", title:"AI Usage Policy", icon:Bot,
    gradient:"from-fuchsia-500 to-pink-600", accent:"fuchsia",
    sections:[{id:"approved-ai-uses",title:"Approved Uses"},{id:"prohibited-ai-uses",title:"Prohibited Uses"},{id:"ai-responsibility",title:"Employee Responsibility"}] },
  { id:"ch12", number:"12", title:"Confidentiality & IP", icon:Fingerprint,
    gradient:"from-orange-500 to-amber-600", accent:"orange",
    sections:[{id:"confidential-info",title:"Confidential Information"},{id:"ip-ownership",title:"IP Ownership"},{id:"nda-obligations",title:"NDA Obligations"}] },
  { id:"ch13", number:"13", title:"Workplace Respect & EEO", icon:Heart,
    gradient:"from-pink-500 to-rose-500", accent:"pink",
    sections:[{id:"equal-opportunity",title:"Equal Opportunity"},{id:"anti-harassment",title:"Anti-Harassment"},{id:"reporting",title:"Reporting Procedure"}] },
  { id:"ch14", number:"14", title:"Disciplinary & Grievances", icon:Scale,
    gradient:"from-red-500 to-orange-600", accent:"red",
    sections:[{id:"progressive-discipline",title:"Progressive Discipline"},{id:"grievance-process",title:"Grievance Process"},{id:"whistleblower",title:"Whistleblower Protection"}] },
  { id:"ch15", number:"15", title:"Resignation & Offboarding", icon:LogOut,
    gradient:"from-gray-500 to-slate-600", accent:"gray",
    sections:[{id:"notice-period",title:"Notice Period"},{id:"asset-return",title:"Asset Return"},{id:"exit-interview",title:"Exit Interview"},{id:"post-employment",title:"Post-Employment"}] },
  { id:"ch16", number:"16", title:"Employee Acknowledgment", icon:ClipboardCheck,
    gradient:"from-green-500 to-emerald-600", accent:"green",
    sections:[{id:"acknowledgment-statement",title:"Acknowledgment"},{id:"version-history",title:"Version History"}] },
  { id:"ch21", number:"21", title:"Data Privacy & Records", icon:Database,
    gradient:"from-cyan-500 to-teal-600", accent:"teal",
    sections:[{id:"dp-purpose",title:"Purpose"},{id:"privacy-principles",title:"Privacy Principles"},{id:"personal-info",title:"Personal Information"},{id:"data-collection",title:"Data Collection"},{id:"data-access",title:"Access & Accuracy"},{id:"secure-storage",title:"Secure Storage"},{id:"data-retention",title:"Retention & Disposal"},{id:"records-management",title:"Records Management"},{id:"data-breaches-dp",title:"Data Breaches"}] },
  { id:"ch22", number:"22", title:"Business Continuity & Compliance", icon:ShieldCheck,
    gradient:"from-slate-600 to-zinc-700", accent:"slate",
    sections:[{id:"bc-purpose",title:"Purpose"},{id:"business-continuity",title:"Business Continuity"},{id:"incident-mgmt",title:"Incident Management"},{id:"compliance-laws",title:"Compliance with Laws"},{id:"anti-fraud-comp",title:"Anti-Fraud & Corruption"},{id:"sanctions",title:"Sanctions & Trade"},{id:"audits",title:"Audits"},{id:"decision-framework",title:"Decision Framework"},{id:"crisis-comms",title:"Crisis Communication"}] },
  { id:"dynime-way", number:"★", title:"The Dynime Way", icon:Zap,
    gradient:"from-violet-600 to-indigo-700", accent:"violet",
    sections:[{id:"dw-principles",title:"Operating Principles"},{id:"dw-how",title:"How We Work"}] },
  { id:"leadership", number:"★", title:"Leadership Principles", icon:Crown,
    gradient:"from-amber-500 to-orange-600", accent:"amber",
    sections:[{id:"lp-principles",title:"Core Leadership Principles"},{id:"lp-managers",title:"What Great Managers Do"}] },
  { id:"standard", number:"★", title:"The Dynime Standard", icon:Award,
    gradient:"from-emerald-500 to-green-600", accent:"emerald",
    sections:[{id:"quality-checklist",title:"Quality Checklist"},{id:"standard-why",title:"Why Standards Matter"}] },
  { id:"faqs", number:"★", title:"FAQs", icon:HelpCircle,
    gradient:"from-sky-500 to-blue-600", accent:"sky",
    sections:[{id:"faq-work",title:"Working at Dynime"},{id:"faq-policy",title:"Policy Questions"},{id:"faq-tech",title:"Technology & AI"}] },
  { id:"app-a", number:"A", title:"Appendix A — Quick Contacts", icon:Phone,
    gradient:"from-rose-500 to-pink-600", accent:"rose",
    sections:[] },
  { id:"app-b", number:"B", title:"Appendix B — Quick Reference", icon:FileText,
    gradient:"from-blue-500 to-indigo-600", accent:"blue",
    sections:[] },
  { id:"app-c", number:"C", title:"Appendix C — Glossary", icon:BookOpen,
    gradient:"from-purple-500 to-violet-600", accent:"purple",
    sections:[] },
  { id:"app-d", number:"D", title:"Appendix D — First Week Checklist", icon:ListChecks,
    gradient:"from-green-500 to-teal-600", accent:"green",
    sections:[] },
];

// ─── Accent helpers ───────────────────────────────────────────────
const accentBg: Record<string,string> = {
  violet:"bg-violet-500/10 border-violet-500/20 text-violet-600 dark:text-violet-400",
  blue:"bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400",
  teal:"bg-teal-500/10 border-teal-500/20 text-teal-600 dark:text-teal-400",
  indigo:"bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400",
  amber:"bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
  emerald:"bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  sky:"bg-sky-500/10 border-sky-500/20 text-sky-600 dark:text-sky-400",
  rose:"bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400",
  slate:"bg-slate-500/10 border-slate-500/20 text-slate-600 dark:text-slate-400",
  purple:"bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400",
  fuchsia:"bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-400",
  orange:"bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400",
  pink:"bg-pink-500/10 border-pink-500/20 text-pink-600 dark:text-pink-400",
  red:"bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400",
  gray:"bg-gray-500/10 border-gray-500/20 text-gray-600 dark:text-gray-400",
  green:"bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400",
};

// ─── Callout Box ──────────────────────────────────────────────────
const Callout = ({ type = "note", children }: { type?: "note" | "important" | "warning"; children: React.ReactNode }) => {
  const styles = {
    note:      { wrap: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800", icon: <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />, label: "Note" },
    important: { wrap: "bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800", icon: <BadgeCheck className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />, label: "Important" },
    warning:   { wrap: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800", icon: <TriangleAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />, label: "Warning" },
  }[type];
  return (
    <div className={`flex gap-3 rounded-xl border px-4 py-3.5 my-5 text-sm leading-relaxed ${styles.wrap}`}>
      {styles.icon}
      <div className="text-foreground/80">{children}</div>
    </div>
  );
};

// ─── Section Heading ──────────────────────────────────────────────
const SH = ({ id, children }: { id: string; children: React.ReactNode }) => (
  <h3 id={id} className="group font-heading font-bold text-[15px] text-foreground mt-9 mb-3 flex items-center gap-2.5 scroll-mt-24">
    <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-primary to-primary/40 shrink-0" />
    {children}
  </h3>
);

// ─── Bullet List ──────────────────────────────────────────────────
const BList = ({ items }: { items: string[] }) => (
  <ul className="space-y-2 my-3.5">
    {items.map((item, i) => (
      <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/75 leading-relaxed">
        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

// ─── Policy Table ─────────────────────────────────────────────────
const PTable = ({ rows }: { rows: [string, string][] }) => (
  <div className="my-5 rounded-xl overflow-hidden border border-border/50 shadow-sm">
    <table className="w-full text-sm">
      <tbody>
        {rows.map(([label, value], i) => (
          <tr key={i} className={`border-b border-border/30 last:border-0 ${i % 2 === 0 ? "bg-muted/20" : "bg-background"}`}>
            <td className="py-2.5 px-4 font-semibold text-foreground/90 w-44 border-r border-border/30 whitespace-nowrap">{label}</td>
            <td className="py-2.5 px-4 text-foreground/70">{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ─── Chapter Hero ─────────────────────────────────────────────────
const ChapterHero = ({ ch }: { ch: Chapter }) => {
  const Icon = ch.icon;
  return (
    <div className="relative rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm mb-8 p-5 pl-7 flex items-center gap-5 shadow-sm overflow-hidden">
      {/* Subtle visual color accent bar on the left */}
      <div className={`absolute left-0 top-0 bottom-0 w-[4px] bg-gradient-to-b ${ch.gradient}`} />
      
      {/* Colored soft badge for the icon */}
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
        accentBg[ch.accent]?.split(" ")[0] || "bg-primary/10"
      } ${accentBg[ch.accent]?.split(" ")[2] || "text-primary"}`}>
        <Icon className="w-5 h-5" />
      </div>

      <div>
        <p className="text-muted-foreground/60 text-[9px] font-black uppercase tracking-[0.15em] mb-0.5">Chapter {ch.number}</p>
        <h2 className="text-foreground font-heading font-bold text-[18px] leading-tight">{ch.title}</h2>
      </div>
    </div>
  );
};

// ─── Mobile TOC Portal ────────────────────────────────────────────
const MobileTOCDrawer = ({
  open, onClose, chapters, activeId, activeSubId, onNav, search, setSearch
}: {
  open: boolean; onClose: () => void; chapters: Chapter[];
  activeId: string; activeSubId: string; onNav: (id: string) => void;
  search: string; setSearch: (v: string) => void;
}) => {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[200] flex">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative z-10 w-72 h-full bg-background border-r border-border flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 shrink-0">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Contents</span>
          <button onClick={onClose}><X className="w-4 h-4" /></button>
        </div>
        <div className="px-3 py-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
              className="w-full h-8 pl-8 pr-3 rounded-lg border border-border/60 bg-muted/30 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30" />
          </div>
        </div>
        {/* Scrollable list container matches desktop layout exactly to prevent flex height bugs */}
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <TOCItems chapters={chapters} activeId={activeId} activeSubId={activeSubId} onNav={(id) => { onNav(id); onClose(); }} />
        </div>
      </aside>
    </div>,
    document.body
  );
};

// ─── TOC Item List ────────────────────────────────────────────────
const TOCItems = ({
  chapters, activeId, activeSubId, onNav
}: {
  chapters: Chapter[]; activeId: string; activeSubId: string; onNav: (id: string) => void;
}) => (
  <div className="flex flex-col px-3 py-2 pb-10">
    {chapters.map(ch => {
      const Icon = ch.icon;
      const isActive = activeId === ch.id;
      return (
        <div key={ch.id} className="mb-0.5">
          {/* Chapter row */}
          <button
            id={`toc-${ch.id}`}
            onClick={() => onNav(ch.id)}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all duration-150 group relative overflow-hidden ${
              isActive
                ? "bg-primary/8 dark:bg-primary/10"
                : "hover:bg-muted/50"
            }`}
          >
            {/* Left accent bar — only on active */}
            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-[60%] w-[3px] rounded-full bg-primary" />
            )}

            {/* Chapter number */}
            <span className={`text-[9px] font-black w-4 text-center shrink-0 tabular-nums ${
              isActive ? "text-primary" : "text-muted-foreground/40"
            }`}>
              {ch.number}
            </span>

            {/* Icon — uniform neutral square */}
            <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors ${
              isActive
                ? "bg-primary/15 text-primary"
                : "bg-muted/60 text-muted-foreground/60 group-hover:bg-muted text-foreground/50"
            }`}>
              <Icon className="w-3 h-3" />
            </div>

            {/* Title */}
            <span className={`text-[11.5px] leading-snug flex-1 transition-colors ${
              isActive ? "font-bold text-foreground" : "font-medium text-foreground/65 group-hover:text-foreground/85"
            }`}>
              {ch.title}
            </span>

            {isActive && <ChevronRight className="w-3 h-3 shrink-0 text-primary/60" />}
          </button>

          {/* Sub-sections — elegant vertical line connector */}
          {isActive && ch.sections.length > 0 && (
            <div className="ml-[42px] my-1 relative">
              {/* Vertical connector line */}
              <div className="absolute left-0 top-0 bottom-0 w-px bg-border/60" />
              <div className="flex flex-col pl-3 space-y-0.5">
                {ch.sections.map(s => {
                  const isActiveSub = activeSubId === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => onNav(s.id)}
                      className={`group text-left text-[12px] py-1.5 px-2.5 rounded-md transition-all leading-snug flex items-center gap-2 ${
                        isActiveSub
                          ? "text-primary font-semibold bg-primary/5"
                          : "text-muted-foreground/75 hover:text-primary hover:bg-primary/5"
                      }`}
                    >
                      <ChevronRight className={`w-3 h-3 shrink-0 transition-transform ${
                        isActiveSub
                          ? "text-primary translate-x-0.5"
                          : "text-muted-foreground/30 group-hover:text-primary/70"
                      }`} />
                      <span>{s.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );
    })}
  </div>
);


// ═════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════
const EmployeeHandbook = () => {
  const [activeId, setActiveId] = useState("ch1");
  const [activeSubId, setActiveSubId] = useState("");
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrollTop, setScrollTop] = useState(false);
  
  const sidebarRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return CHAPTERS;
    return CHAPTERS.filter(ch =>
      ch.title.toLowerCase().includes(q) ||
      ch.sections.some(s => s.title.toLowerCase().includes(q))
    );
  }, [search]);

  // Scroll active chapter into view inside the sidebar container directly, preventing window scroll propagation
  useEffect(() => {
    const activeEl = document.getElementById(`toc-${activeId}`);
    const sidebarEl = sidebarRef.current;
    if (activeEl && sidebarEl) {
      const activeRect = activeEl.getBoundingClientRect();
      const sidebarRect = sidebarEl.getBoundingClientRect();

      // Check if active item is out of view (above or below visible container viewport)
      if (activeRect.top < sidebarRect.top || activeRect.bottom > sidebarRect.bottom) {
        const offsetTop = activeEl.offsetTop;
        const targetScrollTop = offsetTop - sidebarEl.clientHeight / 2 + activeEl.clientHeight / 2;
        sidebarEl.scrollTo({ top: targetScrollTop, behavior: "smooth" });
      }
    }
  }, [activeId]);

  // Combined Scroll Spy: Updates active chapter and active sub-section dynamically
  useEffect(() => {
    const onScroll = () => {
      setScrollTop(window.scrollY > 500);

      let currentChId = "ch1";
      let currentSubId = "";

      for (const ch of CHAPTERS) {
        const el = document.getElementById(ch.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 140) {
            currentChId = ch.id;
          }
        }

        for (const s of ch.sections) {
          const subEl = document.getElementById(s.id);
          if (subEl) {
            const rect = subEl.getBoundingClientRect();
            if (rect.top <= 140) {
              currentSubId = s.id;
            }
          }
        }
      }

      setActiveId(currentChId);
      setActiveSubId(currentSubId);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // initial run
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <Layout>
      {/* Page wrapper */}
      <div className="min-h-screen bg-muted/20">

        {/* ── Banner ─────────────────────────────────────── */}
        <div className="relative overflow-hidden border-b border-border/60 bg-muted/20">
          {/* Very soft background glow accent */}
          <div className="absolute top-0 right-0 w-[400px] h-[300px] rounded-full bg-primary/5 blur-[80px]" />
          
          <div className="container-custom relative py-8 flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <Lock className="w-3.5 h-3.5 text-muted-foreground/60" />
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Confidential · Internal Use Only</span>
              </div>
              <h1 className="font-heading font-extrabold text-2xl md:text-3xl text-foreground leading-tight mb-1">
                Dynime Employee Handbook
              </h1>
              <p className="text-muted-foreground text-xs font-semibold">Last Updated: Jul 2026</p>
            </div>
            <div className="flex gap-2.5 flex-wrap">
              {[["22+","Chapters"],["40+","Policies"],["2026","Edition"]].map(([n,l]) => (
                <div key={l} className="bg-background/80 dark:bg-muted/20 border border-border/50 rounded-xl px-6 py-3 text-center min-w-[95px] shadow-sm">
                  <p className="text-foreground font-black text-[16px] leading-none">{n}</p>
                  <p className="text-muted-foreground/75 text-[9px] font-bold uppercase tracking-wider mt-1">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Body: Sidebar + Content ─────────────────────── */}
        <div className="container-custom flex gap-0 relative">

          {/* ── LEFT STICKY SIDEBAR ─────────────────────── */}
          {/* self-start prevents flex item stretching, which is required for sticky to activate */}
          <aside
            className="hidden md:flex flex-col w-64 lg:w-72 shrink-0 self-start sticky top-[96px] h-[calc(100vh-96px)] border-r border-border/40 bg-background/60 backdrop-blur-sm"
          >
            {/* Search */}
            <div className="px-3 pt-4 pb-2 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50 pointer-events-none" />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search chapters..."
                  className="w-full h-9 pl-9 pr-3 rounded-xl border border-border/60 bg-muted/40 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
                {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground"><X className="w-3 h-3" /></button>}
              </div>
              {search && <p className="text-[10px] text-muted-foreground mt-1.5 px-1">{filtered.length} chapter{filtered.length !== 1 ? "s" : ""} found</p>}
            </div>

            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 px-5 pb-1 shrink-0">Table of Contents</div>

            {/* Scrollable TOC list */}
            <div
              ref={sidebarRef}
              className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              <TOCItems chapters={filtered} activeId={activeId} activeSubId={activeSubId} onNav={navTo} />
            </div>
          </aside>

          {/* ── MAIN CONTENT ───────────────────────────────── */}
          <main className="flex-1 min-w-0 py-8 px-4 md:px-8 lg:px-10">

            {/* Mobile TOC button */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden mb-6 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border/50 bg-background shadow-sm text-sm font-semibold text-foreground/70 hover:text-foreground"
            >
              <Menu className="w-4 h-4" /> Table of Contents
            </button>

            <MobileTOCDrawer open={mobileOpen} onClose={() => setMobileOpen(false)}
              chapters={filtered} activeId={activeId} activeSubId={activeSubId} onNav={navTo} search={search} setSearch={setSearch} />

            {/* ════ CH 1 — Welcome ═══════════════════════════ */}
            <article id="ch1" className="scroll-mt-20 mb-20">
              <ChapterHero ch={CHAPTERS[0]} />
              <p className="text-base text-foreground/80 leading-relaxed mb-5 font-medium">
                Welcome to Dynime. We're excited to have you join our team. Whether you're beginning your first day or starting a new chapter in your career, you've become part of a company that values curiosity, ownership, and continuous improvement.
              </p>
              <Callout type="important">
                This handbook is designed to help you understand who we are, how we work, and what you can expect as a member of our team. It also explains the standards, policies, and principles that guide our daily work.
              </Callout>
              <SH id="our-story">Our Story</SH>
              <p className="text-sm text-foreground/75 leading-relaxed mb-3">Dynime was founded with a simple belief: <em className="font-bold text-foreground not-italic">Businesses should spend less time managing complexity and more time creating value.</em></p>
              <p className="text-sm text-foreground/75 leading-relaxed mb-3">Since our journey began in 2020, we've worked with startups, entrepreneurs, agencies, and organizations across multiple industries, helping them solve business challenges through technology, automation, digital transformation, and strategic consulting.</p>
              <p className="text-sm text-foreground/75 leading-relaxed">What started as a small digital services business has grown into an international company serving clients across countries and time zones.</p>
              <SH id="who-we-are">Who We Are</SH>
              <p className="text-sm text-foreground/75 leading-relaxed mb-4">Dynime is a global technology and business solutions company. Our work spans multiple disciplines:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 my-4">
                {["Software Development","AI & Automation","Business Consulting","Web Development","Digital Marketing","Cloud Solutions","E-commerce","UI/UX Design","Business Operations"].map(s => (
                  <div key={s} className="text-xs font-semibold px-3 py-2.5 rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 border border-violet-100 dark:border-violet-900/40 text-foreground/80">{s}</div>
                ))}
              </div>
              <SH id="our-purpose">Our Purpose</SH>
              <blockquote className="border-l-4 border-primary/60 pl-5 my-4 py-1 italic text-foreground/80 text-sm leading-relaxed bg-primary/5 rounded-r-xl pr-4">
                "We exist to help businesses work smarter. Through technology, automation, and strategic thinking, we enable organizations to reduce complexity, improve efficiency, and unlock sustainable growth."
              </blockquote>
              <SH id="working-at-dynime">Working at Dynime</SH>
              <p className="text-sm text-foreground/75 leading-relaxed mb-3">Working at Dynime means embracing responsibility. We believe great work comes from people who are trusted to think independently, communicate openly, and continuously improve.</p>
              <Callout type="note">Mistakes are part of learning. Failing to learn from them is not.</Callout>
              <SH id="expectations">Mutual Expectations</SH>
              <div className="grid md:grid-cols-2 gap-4 my-4">
                {[
                  { title:"What We Expect From You", items:["Act with honesty and integrity","Treat everyone with respect","Take ownership of your work","Communicate clearly and proactively","Protect confidential information","Continue learning new skills","Represent Dynime professionally"] },
                  { title:"What Dynime Provides", items:["Respectful and inclusive workplace","Equal opportunities for growth","Fair compensation and transparent policies","Meaningful work with real impact","Access to learning & development","Modern tools and technology","Open communication and feedback"] },
                ].map(col => (
                  <div key={col.title} className="rounded-xl border border-border/50 bg-background p-5 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">{col.title}</p>
                    <BList items={col.items} />
                  </div>
                ))}
              </div>
            </article>

            {/* ════ CH 2 — Mission ════════════════════════════ */}
            <article id="ch2" className="scroll-mt-20 mb-20">
              <ChapterHero ch={CHAPTERS[1]} />
              <SH id="mission">Our Mission</SH>
              <blockquote className="border-l-4 border-blue-500/60 pl-5 my-4 py-1 italic text-foreground/80 text-sm leading-relaxed bg-blue-50 dark:bg-blue-950/30 rounded-r-xl pr-4">
                "To empower businesses with innovative technology, intelligent automation, and strategic expertise that simplify operations, improve efficiency, and create sustainable growth."
              </blockquote>
              <SH id="vision">Our Vision</SH>
              <p className="text-sm text-foreground/75 leading-relaxed">To become a globally trusted technology and business solutions company recognized for helping organizations transform the way they work — building products, services, and partnerships that create long-term value for businesses of all sizes.</p>
              <SH id="core-values">Core Values</SH>
              <div className="grid md:grid-cols-2 gap-3 my-5">
                {[
                  {title:"Customer Success First",desc:"Our success is directly connected to the success of our clients. Listen before offering solutions.",grad:"from-blue-500 to-indigo-600"},
                  {title:"Ownership",desc:"Take responsibility for outcomes, not just tasks. Act proactively and follow through.",grad:"from-violet-500 to-purple-600"},
                  {title:"Excellence",desc:"Quality is not an accident. Deliver work that reflects professionalism and pride.",grad:"from-amber-500 to-orange-500"},
                  {title:"Continuous Learning",desc:"Technology evolves every day, and so do we. Expand knowledge, share expertise.",grad:"from-emerald-500 to-green-600"},
                  {title:"Integrity",desc:"Do the right thing, even when it's difficult. Honesty, transparency, accountability.",grad:"from-rose-500 to-pink-600"},
                  {title:"Respect",desc:"Every employee deserves an environment where they feel valued and heard.",grad:"from-teal-500 to-cyan-600"},
                  {title:"Collaboration",desc:"Great work is rarely achieved alone. Share knowledge and support teammates.",grad:"from-indigo-500 to-blue-600"},
                  {title:"Innovation",desc:"Find better ways to solve problems. Challenge outdated processes responsibly.",grad:"from-sky-500 to-blue-500"},
                  {title:"Simplicity",desc:"Simple solutions are often the most effective. Remove unnecessary complexity.",grad:"from-orange-500 to-amber-500"},
                  {title:"Growth Mindset",desc:"Abilities can be developed through effort. Challenges are opportunities.",grad:"from-purple-500 to-violet-600"},
                ].map(v => (
                  <div key={v.title} className="group relative rounded-xl overflow-hidden border border-border/40 bg-background hover:shadow-md transition-shadow">
                    <div className={`h-1 bg-gradient-to-r ${v.grad}`} />
                    <div className="p-4">
                      <p className="font-bold text-[13px] text-foreground mb-1">{v.title}</p>
                      <p className="text-xs text-foreground/65 leading-relaxed">{v.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <SH id="operating-principles">Operating Principles</SH>
              <BList items={["Communicate Clearly — Share information openly and with professionalism","Deliver on Commitments — When we make a commitment, we follow through","Decide with Data — Base decisions on facts and measurable outcomes","Think Long-Term — Prioritize sustainable growth over short-term gains","Continuously Improve — Every process, product, and service can be made better"]} />
            </article>

            {/* ════ CH 3 — How We Work ═══════════════════════ */}
            <article id="ch3" className="scroll-mt-20 mb-20">
              <ChapterHero ch={CHAPTERS[2]} />
              <blockquote className="border-l-4 border-teal-500/60 pl-5 my-4 py-1 italic text-foreground/80 text-sm leading-relaxed bg-teal-50 dark:bg-teal-950/30 rounded-r-xl pr-4">
                "Culture is not what we say. It's how we work every day."
              </blockquote>
              <SH id="remote-first">Remote-First by Design</SH>
              <p className="text-sm text-foreground/75 leading-relaxed mb-3">Dynime is a remote-first company. Our processes, communication, and collaboration are designed to support distributed teams across different locations and time zones. Success is measured by outcomes, quality, and accountability rather than physical presence.</p>
              <BList items={["Maintain a professional workspace with reliable internet connectivity","Keep regular working hours and communicate your schedule to your team","Be available during core hours for synchronous collaboration","Ensure your setup supports focused, productive work"]} />
              <SH id="communication">Communication Principles</SH>
              <PTable rows={[["Email","Formal communications, client correspondence, official notices"],["Slack / Teams","Day-to-day team communication, quick questions"],["Project Tools","Task tracking, project updates, documentation"],["WhatsApp","Urgent or informal team communication only"],["Video Calls","Meetings, client calls, team check-ins"]]} />
              <SH id="meetings">Meetings & Asynchronous Work</SH>
              <div className="grid md:grid-cols-2 gap-4 my-4">
                {[
                  {title:"When in Meetings",items:["Arrive prepared and on time","Review pre-read materials","Stay focused on the agenda","Respect everyone's time","End with clear action items"]},
                  {title:"Async First Approach",items:["Document decisions clearly","Write actionable updates","Set realistic async deadlines","Don't expect immediate replies outside hours","Use structured written communication"]},
                ].map(c => (
                  <div key={c.title} className="rounded-xl border border-border/50 bg-background p-5 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">{c.title}</p>
                    <BList items={c.items} />
                  </div>
                ))}
              </div>
              <SH id="accountability">Accountability</SH>
              <Callout type="note">If something affects your ability to meet a deadline, communicate it as early as possible. Surprises should be rare because communication should be continuous.</Callout>
              <SH id="feedback-culture">Feedback Culture</SH>
              <p className="text-sm text-foreground/75 leading-relaxed">We encourage feedback that is respectful, honest, constructive, timely, and specific. When receiving feedback, listen carefully, ask questions if needed, and focus on improvement rather than defensiveness.</p>
            </article>

            {/* ════ CH 4 — Employment ════════════════════════ */}
            <article id="ch4" className="scroll-mt-20 mb-20">
              <ChapterHero ch={CHAPTERS[3]} />
              <Callout type="note">Individual employment agreements, local labor laws, and applicable regulations will prevail where required by law.</Callout>
              <SH id="employment-categories">Employment Categories</SH>
              <PTable rows={[["Full-Time","Standard weekly schedule, eligible for full benefits"],["Part-Time","Fewer hours; benefits based on policy and local law"],["Contract","Services under a separate agreement; not employees unless required by law"],["Intern","Structured learning opportunity; terms in the internship agreement"],["Temporary","Hired for a specific project or limited duration"]]} />
              <SH id="probation">Probation Period</SH>
              <BList items={["Standard probation: 2–6 months depending on role","Performance review at midpoint and end of probation","Probation may be extended with documented justification","Confirmation letter issued upon successful completion","Either party may terminate with appropriate notice during probation"]} />
              <Callout type="note">For details on salary accrued and paid during probation, refer to <a href="#probationary-compensation" className="font-semibold text-primary underline underline-offset-2">Probationary Compensation</a> in Chapter 06.</Callout>
              <SH id="working-hours">Working Hours</SH>
              <PTable rows={[["Standard Hours","8 hours per working day (Flexible by discussion)"],["Work Type","Remote — work from anywhere"],["Holiday","Sunday (adjustable by location/availability)"],["Core Hours","Agreed between employee and manager"],["Overtime","Prior approval required; compensated per local law or company policy"]]} />
              <Callout type="note">Working hours are flexible by discussion. Core hours ensure team overlap for collaboration.</Callout>
              <SH id="attendance">Attendance</SH>
              <BList items={["Be available and responsive during agreed working hours","Report unplanned absences to manager as early as possible","Repeated unexplained absences may result in disciplinary action","Time tracking may be required depending on role and project"]} />
              <SH id="resignation">Resignation & Termination</SH>
              <div className="grid md:grid-cols-2 gap-4 my-4">
                {[
                  {title:"Resignation Process",items:["Submit written notice to manager and HR","Notice period as specified in employment agreement","Complete knowledge transfer and handover","Return all company assets","Participate in exit interview","Final settlement processed within agreed timeline"]},
                  {title:"Grounds for Termination",items:["Serious misconduct or dishonesty","Repeated policy violations after warnings","Unsatisfactory performance after PIP","Redundancy or business restructuring","Breach of confidentiality or NDA","Provision of false employment information"]},
                ].map(c => (
                  <div key={c.title} className="rounded-xl border border-border/50 bg-background p-5 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">{c.title}</p>
                    <BList items={c.items} />
                  </div>
                ))}
              </div>
            </article>

            {/* ════ CH 5 — Leave ═════════════════════════════ */}
            <article id="ch5" className="scroll-mt-20 mb-20">
              <ChapterHero ch={CHAPTERS[4]} />
              <SH id="annual-leave">Annual Leave</SH>
              <PTable rows={[["Entitlement","14 working days per calendar year"],["Eligibility","Full-time employees after completing probation"],["Accrual","Accrued proportionally throughout the year"],["Approval","Minimum 3 business days advance notice required"]]} />
              <SH id="sick-leave">Sick Leave</SH>
              <PTable rows={[["Entitlement","5 working days per calendar year"],["Documentation","Required for absences exceeding 2 consecutive days"],["Notification","Inform manager as early as possible on the day of absence"]]} />
              <Callout type="note">Dynime provides 5 days of paid sick leave, reflecting our commitment to employee wellbeing and aligning with international remote-first technology company standards.</Callout>
              <SH id="other-leaves">Other Leave Types</SH>
              <PTable rows={[["Emergency Leave","3 working days/year for urgent personal or family matters"],["Maternity Leave","As per applicable local employment law"],["Paternity Leave","As per applicable local employment law"],["Bereavement Leave","3–5 days for immediate family; subject to manager approval"],["Unpaid Leave","Available subject to business requirements and HR approval"]]} />
              <SH id="public-holidays">Public Holidays</SH>
              <p className="text-sm text-foreground/75 leading-relaxed">Employees are entitled to paid public holidays based on their primary country of employment. The standard weekly day off is <strong className="text-foreground">Sunday</strong>, with flexibility available based on location and agreement.</p>
              <SH id="leave-guidelines">General Leave Guidelines</SH>
              <BList items={["Planned leave must be submitted and approved in advance","Approval is subject to business requirements and team coverage","Emergency leave should be reported as soon as reasonably possible","Abuse or misuse of leave benefits may result in disciplinary action"]} />
            </article>

            {/* ════ CH 6 — Compensation ══════════════════════ */}
            <article id="ch6" className="scroll-mt-20 mb-20">
              <ChapterHero ch={CHAPTERS[5]} />
              <SH id="salary">Salary & Payroll</SH>
              <BList items={["Salary is specified in the individual employment agreement","Payment is made on the agreed payroll schedule (monthly or bi-weekly)","Dynime operates in multiple currencies; payment currency specified in agreement","Applicable deductions and taxes processed in accordance with local law","Salary revisions reviewed annually or during performance promotion cycles"]} />
              
              <SH id="probationary-compensation">Probationary Compensation</SH>
              <p className="text-sm text-foreground/75 leading-relaxed mb-3">
                All newly hired employees will begin under a probation period as specified in their Employment Agreement.
              </p>
              <p className="text-sm text-foreground/75 leading-relaxed mb-3">
                Compensation earned during the probation period will be held until the completion of the probation review. Employees who successfully complete probation and are confirmed as permanent employees will receive the <strong className="font-bold text-foreground">full confirmed salary</strong>, including the compensation accrued during the probation period, in accordance with the Company's compensation policy.
              </p>
              <p className="text-sm text-foreground/75 leading-relaxed mb-5">
                If employment ends during the probation period for any valid reason, including resignation or unsuccessful performance, the employee will receive only the <strong className="font-bold text-foreground">probationary compensation</strong> earned for the actual period worked. In such cases, the employee will not be eligible for the confirmed permanent salary or its associated adjustment.
              </p>

              <SH id="monthly-payroll">Monthly Payroll</SH>
              <p className="text-sm text-foreground/75 leading-relaxed mb-5">
                Upon confirmation as a permanent employee, salary payments will be processed on a <strong className="font-bold text-foreground">monthly basis</strong> according to the Company's Payroll Policy and the official payroll schedule in effect at the time. The Company reserves the right to update payroll dates and payment procedures in accordance with business requirements and applicable laws.
              </p>
              <SH id="benefits">Benefits</SH>
              <PTable rows={[["Annual Leave","14 paid working days per year"],["Sick Leave","5 paid working days per year"],["Remote Work","Full remote — work from your preferred location"],["Flexible Hours","Core hours with flexibility by discussion"],["Holiday","Sunday off (adjustable by location)"],["Learning Budget","Approved courses, certifications, and training"],["Equipment","Allowance or provision based on role"],["Internet Allowance","As specified in employment agreement"]]} />
              <SH id="reimbursements">Reimbursements</SH>
              <BList items={["Business expenses pre-approved by manager are eligible for reimbursement","Submit expense claims with receipts within 30 days","Eligible: business travel, client meetings, approved software, training","Reimbursements processed in the regular payroll cycle"]} />
            </article>

            {/* ════ CH 7 — Performance ═══════════════════════ */}
            <article id="ch7" className="scroll-mt-20 mb-20">
              <ChapterHero ch={CHAPTERS[6]} />
              <SH id="kpis">KPIs & OKRs</SH>
              <p className="text-sm text-foreground/75 leading-relaxed mb-3">Performance at Dynime is measured through a combination of Key Performance Indicators (KPIs) and Objectives & Key Results (OKRs), agreed upon at the beginning of each review period.</p>
              <SH id="reviews">Performance Reviews</SH>
              <PTable rows={[["Monthly Check-ins","Informal progress discussions between employee and manager"],["Quarterly Reviews","Formal review of goals, performance, and development"],["Annual Review","Comprehensive evaluation; determines promotions and salary revisions"],["PIP","Performance Improvement Plan for employees not meeting expectations"]]} />
              <Callout type="note">A PIP is a structured support tool, not a punitive measure. It defines specific, measurable improvement targets with a clear timeline and support plan.</Callout>
              <SH id="learning">Learning & Development</SH>
              <BList items={["All employees are encouraged to invest in continuous professional development","Dynime provides access to approved online courses and certifications","Learning goals should be discussed with your manager during quarterly reviews","Internal knowledge-sharing sessions are encouraged across teams"]} />
              <SH id="promotions">Promotions & Career Growth</SH>
              <BList items={["Promotions are merit-based, driven by consistent performance and demonstrated growth","Internal opportunities are prioritized when positions become available","Career growth discussions take place during annual performance reviews"]} />
            </article>

            {/* ════ CH 8 — Code of Conduct ════════════════════ */}
            <article id="ch8" className="scroll-mt-20 mb-20">
              <ChapterHero ch={CHAPTERS[7]} />
              <SH id="professionalism">Professionalism & Ethics</SH>
              <BList items={["Treat all colleagues, clients, and partners with respect and professionalism","Maintain confidentiality of business and client information at all times","Deliver work with quality, accuracy, and care","Represent Dynime positively in all professional interactions","Act with honesty even when the outcome is inconvenient"]} />
              <SH id="anti-bribery">Anti-Bribery & Anti-Corruption</SH>
              <p className="text-sm text-foreground/75 leading-relaxed mb-3">Dynime maintains a zero-tolerance policy toward bribery and corruption in any form.</p>
              <BList items={["Employees must not offer, request, accept, or facilitate bribes","Gifts and entertainment must be modest, transparent, and not intended to influence decisions","Report any suspected bribery or corruption to HR or management immediately"]} />
              <Callout type="warning">Violation of this policy may result in immediate termination and, where required, referral to relevant legal authorities.</Callout>
              <SH id="social-media">Social Media Conduct</SH>
              <BList items={["Do not share confidential or proprietary Dynime information on social media","Personal opinions must be clearly identified as personal, not representative of Dynime","Do not post content that could harm Dynime's reputation or that of clients or colleagues"]} />
              <SH id="conflict-of-interest">Conflict of Interest</SH>
              <BList items={["Disclose any potential conflicts of interest to HR or your manager immediately","Do not engage in outside employment that conflicts with Dynime's business without prior approval","Personal relationships must not influence business decisions"]} />
            </article>

            {/* ════ CH 9 — Security ══════════════════════════ */}
            <article id="ch9" className="scroll-mt-20 mb-20">
              <ChapterHero ch={CHAPTERS[8]} />
              <Callout type="warning">Information security is every employee's responsibility. A single breach can harm our clients, our business, and our reputation.</Callout>
              <SH id="passwords">Passwords & MFA</SH>
              <BList items={["Use strong, unique passwords for all work accounts (minimum 12 characters)","Enable multi-factor authentication (MFA) on all company systems","Never share passwords with colleagues, managers, or third parties","Use an approved password manager for storing credentials","Change passwords immediately if you suspect a compromise"]} />
              <SH id="device-security">Device Security</SH>
              <BList items={["Keep operating systems, software, and antivirus updated at all times","Lock your screen when unattended","Encrypt your hard drive (BitLocker or FileVault recommended)","Do not use public or unsecured Wi-Fi without a VPN","Report lost or stolen devices to IT and HR immediately"]} />
              <SH id="vpn-cloud">VPN & Cloud Storage</SH>
              <BList items={["Use company-approved VPN when accessing company systems on public networks","Store company data only in approved cloud storage platforms","Do not transfer confidential data to personal cloud accounts"]} />
              <SH id="incident-reporting">Incident Reporting</SH>
              <BList items={["Phishing emails or suspicious communications","Unauthorized access attempts to company systems","Lost or stolen devices","Accidental exposure of confidential information","Any unusual system behavior that may indicate a breach"]} />
            </article>

            {/* ════ CH 10 — IT ═══════════════════════════════ */}
            <article id="ch10" className="scroll-mt-20 mb-20">
              <ChapterHero ch={CHAPTERS[9]} />
              <SH id="company-devices">Company-Issued Devices</SH>
              <BList items={["Company devices are provided for business use","Personal use must be minimal and must not interfere with performance or security","Do not install unauthorized software, applications, or browser extensions","Return all devices in good condition upon separation"]} />
              <SH id="byod">Personal Devices (BYOD)</SH>
              <BList items={["Personal devices used for work must meet minimum security requirements","Enable device encryption, screen lock, and up-to-date antivirus","Company data stored on personal devices must be removed upon separation"]} />
              <SH id="ai-tools">AI Tools (IT Perspective)</SH>
              <BList items={["Use only approved AI tools as listed in the AI Usage Policy","Do not use unauthorized AI tools to process or store company or client data","All AI tool usage on company systems may be monitored for compliance"]} />
              <SH id="monitoring">Monitoring Notice</SH>
              <Callout type="important">Dynime may monitor the use of company devices, systems, and networks to the extent permitted by law. This is intended to protect company assets, ensure security, and maintain compliance. Employees should have no expectation of privacy when using company systems for personal activities.</Callout>
            </article>

            {/* ════ CH 11 — AI Usage ══════════════════════════ */}
            <article id="ch11" className="scroll-mt-20 mb-20">
              <ChapterHero ch={CHAPTERS[10]} />
              <p className="text-sm text-foreground/75 leading-relaxed mb-4">Dynime embraces the thoughtful use of AI tools to enhance productivity, creativity, and efficiency. This policy establishes responsible guidelines for AI usage across the organization.</p>
              <SH id="approved-ai-uses">Approved Uses of AI</SH>
              <BList items={["Coding assistance and code review","Documentation drafting and improvement","Research and information gathering","Design ideation and brainstorming","Content drafting for review by a human before publication","Summarizing internal documents and meeting notes","Automating repetitive workflows with approved tools"]} />
              <SH id="prohibited-ai-uses">Prohibited Uses of AI</SH>
              <Callout type="warning">The following actions are strictly prohibited and may result in disciplinary action up to and including termination.</Callout>
              <BList items={["Uploading confidential, proprietary, or client information to unauthorized AI services","Submitting client source code to public AI tools without explicit written approval","Sharing company credentials, API keys, or passwords with AI systems","Generating misleading, deceptive, or fraudulent content","Using AI to impersonate employees, clients, or third parties"]} />
              <SH id="ai-responsibility">Employee Responsibility</SH>
              <p className="text-sm text-foreground/75 leading-relaxed">Employees are responsible for reviewing and validating all AI-generated output before use. AI tools are assistants, not decision-makers. Final responsibility for accuracy, quality, and appropriateness rests with the employee.</p>
            </article>

            {/* ════ CH 12 — Confidentiality ══════════════════ */}
            <article id="ch12" className="scroll-mt-20 mb-20">
              <ChapterHero ch={CHAPTERS[11]} />
              <SH id="confidential-info">Confidential Information</SH>
              <BList items={["Client information, data, source code, and project details","Financial data, pricing, business plans, and roadmaps","Employee data and personal information","Internal systems, credentials, and access information","Trade secrets and proprietary methodologies","Contract terms and partnership agreements"]} />
              <SH id="ip-ownership">Intellectual Property Ownership</SH>
              <p className="text-sm text-foreground/75 leading-relaxed mb-3">All work created by employees during the course of their employment belongs to Dynime, including:</p>
              <BList items={["Source code, software, scripts, and technical documentation","UI/UX designs, graphics, and visual assets","Marketing materials, written content, and publications","Research, methodologies, and processes developed using company resources","AI-generated work produced for company purposes"]} />
              <SH id="nda-obligations">NDA Obligations</SH>
              <BList items={["Confidentiality obligations remain in effect after employment ends","Employees must not disclose confidential information for personal gain","Return or destroy all confidential materials upon separation"]} />
              <Callout type="warning">Breach of confidentiality is a serious misconduct matter and may result in immediate termination and legal proceedings.</Callout>
            </article>

            {/* ════ CH 13 — Workplace Respect ════════════════ */}
            <article id="ch13" className="scroll-mt-20 mb-20">
              <ChapterHero ch={CHAPTERS[12]} />
              <SH id="equal-opportunity">Equal Employment Opportunity</SH>
              <p className="text-sm text-foreground/75 leading-relaxed mb-4">Dynime is committed to fair employment regardless of any legally protected characteristic, including:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 my-4">
                {["Age","Disability","Gender","Gender Identity","Marital Status","Nationality","Race or Ethnicity","Religion","Sexual Orientation","Veteran Status"].map(s => (
                  <div key={s} className="text-xs font-semibold px-3 py-2 rounded-lg bg-pink-50 dark:bg-pink-950/30 border border-pink-100 dark:border-pink-900/40 text-foreground/80">{s}</div>
                ))}
              </div>
              <SH id="anti-harassment">Anti-Harassment Policy</SH>
              <p className="text-sm text-foreground/75 leading-relaxed mb-3">Dynime maintains a zero-tolerance policy toward any form of harassment, including:</p>
              <BList items={["Sexual harassment — unwelcome conduct of a sexual nature","Bullying — persistent intimidation, abuse of power, or verbal aggression","Discrimination — unfair treatment based on protected characteristics","Retaliation — adverse treatment of an employee for reporting misconduct"]} />
              <Callout type="warning">Violations will be taken seriously and may result in disciplinary action up to and including termination, regardless of seniority.</Callout>
              <SH id="reporting">Reporting Procedure</SH>
              <BList items={["Employees may report concerns to their direct manager or HR","Reports may be made anonymously where possible","All reports are treated confidentially and investigated promptly","No employee will face retaliation for making a good-faith report"]} />
            </article>

            {/* ════ CH 14 — Disciplinary ══════════════════════ */}
            <article id="ch14" className="scroll-mt-20 mb-20">
              <ChapterHero ch={CHAPTERS[13]} />
              <SH id="progressive-discipline">Progressive Discipline</SH>
              <PTable rows={[["Step 1","Verbal Warning — documented discussion of the concern"],["Step 2","Written Warning — formal written notice with improvement expectations"],["Step 3","Final Written Warning — last formal warning before further action"],["Step 4","Suspension — temporary suspension pending investigation"],["Step 5","Termination — employment ends following serious or repeated violations"]]} />
              <Callout type="important">Serious misconduct such as fraud, violence, harassment, or confidentiality breaches may result in immediate termination without prior warnings.</Callout>
              <SH id="grievance-process">Grievance Process</SH>
              <BList items={["Raise concerns informally with your manager in the first instance","Formal grievances should be submitted in writing to HR","HR will acknowledge the grievance within 3 business days","Investigation will be completed within a reasonable timeframe","Employees may appeal decisions through the established process"]} />
              <SH id="whistleblower">Whistleblower Protection</SH>
              <p className="text-sm text-foreground/75 leading-relaxed mb-3">Employees who report suspected misconduct in good faith are protected from retaliation.</p>
              <BList items={["Anonymous reporting channels are available where technically feasible","All reports are treated with the utmost confidentiality","Retaliation against whistleblowers is a serious disciplinary matter"]} />
            </article>

            {/* ════ CH 15 — Offboarding ══════════════════════ */}
            <article id="ch15" className="scroll-mt-20 mb-20">
              <ChapterHero ch={CHAPTERS[14]} />
              <SH id="notice-period">Notice Period</SH>
              <p className="text-sm text-foreground/75 leading-relaxed mb-3">Notice periods are specified in individual employment agreements. During this period, employees are expected to continue performing their duties professionally and cooperate fully with the transition process.</p>
              <SH id="asset-return">Asset Return</SH>
              <BList items={["All company assets must be returned on or before the final working day","Assets include: laptops, peripherals, access cards, documents, and company property","Company data must be removed from all personal devices"]} />
              <SH id="exit-interview">Exit Interview</SH>
              <p className="text-sm text-foreground/75 leading-relaxed mb-3">An exit interview will be conducted by HR to gather feedback and support continuous organizational improvement. Participation is encouraged and insights are treated confidentially.</p>
              <SH id="post-employment">Post-Employment Obligations</SH>
              <BList items={["Confidentiality obligations continue after employment ends","Non-solicitation obligations as specified in the employment agreement","Intellectual property created during employment remains with Dynime","References will be provided in accordance with company policy"]} />
              <Callout type="note">The offboarding checklist will be provided by HR and must be completed before the final paycheck is processed.</Callout>
            </article>

            {/* ════ CH 16 — Acknowledgment ════════════════════ */}
            <article id="ch16" className="scroll-mt-20 mb-20">
              <ChapterHero ch={CHAPTERS[15]} />
              <SH id="acknowledgment-statement">Acknowledgment Statement</SH>
              <div className="rounded-2xl border-2 border-green-200 dark:border-green-800/60 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 p-6 my-5">
                <p className="text-sm text-foreground/80 leading-relaxed mb-4 font-medium">By working at Dynime, I confirm that I have:</p>
                <BList items={["Received and read the Dynime Employee Handbook","Understood the policies, expectations, and standards outlined herein","Agreed to comply with all applicable company rules and procedures","Understood that policies may be updated and I will be informed of significant changes","Acknowledged that this handbook does not constitute an employment contract unless explicitly stated in a separate written agreement"]} />
                <p className="text-xs text-muted-foreground mt-4 font-medium">A formal acknowledgment form will be provided by HR for signature upon commencement of employment.</p>
              </div>
              <SH id="version-history">Version History</SH>
              <PTable rows={[["Version","1.0"],["Date","July 2026"],["Status","Active"],["Classification","Confidential — Internal Use Only"],["Owner","Dynime HR & Operations"],["Review Cycle","Annual, or as required by business or legal changes"]]} />
              {/* Footer stamp */}
              <div className="mt-14 pt-8 border-t border-border/40 flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <p className="text-xs text-muted-foreground font-medium max-w-sm">
                  Dynime Employee Handbook · Culture, People & Policies<br />
                  Version 1.0 · July 2026 · Confidential — Internal Use Only
                </p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 border border-border/40">
                  <Lock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground font-semibold">Dynime LLC · All Rights Reserved</span>
                </div>
              </div>
            </article>

            {/* ════ CH 21 — Data Privacy & Records ══════════ */}
            <article id="ch21" className="scroll-mt-20 mb-20">
              <ChapterHero ch={CHAPTERS.find(c=>c.id==="ch21")!} />
              <p className="text-sm text-foreground/75 leading-relaxed mb-5">At Dynime, we are entrusted with information that belongs to our employees, clients, partners, and the company. Protecting that information is a shared responsibility. Every employee who collects, accesses, stores, shares, or manages data must do so responsibly, securely, and in accordance with company policies and applicable laws.</p>
              <SH id="dp-purpose">Purpose</SH>
              <BList items={["Protect personal and business information","Support compliance with applicable privacy and data protection laws","Establish responsible data management practices","Minimize security and privacy risks","Ensure business records remain accurate, available, and secure"]} />
              <SH id="privacy-principles">Our Privacy Principles</SH>
              <div className="grid md:grid-cols-2 gap-3 my-5">
                {["Collect only what is necessary","Use information only for legitimate business purposes","Keep information accurate and up to date","Protect information with appropriate security measures","Share information only when authorized","Retain information only as long as necessary","Dispose of information securely when no longer required"].map((p,i)=>(
                  <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/40">
                    <Check className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground/80">{p}</span>
                  </div>
                ))}
              </div>
              <SH id="personal-info">Personal & Business Information</SH>
              <div className="grid md:grid-cols-2 gap-4 my-4">
                {[
                  {title:"Personal Information",items:["Full name & contact details","Email address & telephone number","Date of birth","Government-issued identification","Banking information","Employment & payroll records","Emergency contacts","Performance records"]},
                  {title:"Business Information",items:["Client records & contracts","Financial reports","Internal documentation","Sales & marketing plans","Operational procedures","Project documentation","Technical documentation","Business correspondence"]},
                ].map(c=>(
                  <div key={c.title} className="rounded-xl border border-border/50 bg-background p-5 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">{c.title}</p>
                    <BList items={c.items} />
                  </div>
                ))}
              </div>
              <SH id="data-collection">Data Collection</SH>
              <p className="text-sm text-foreground/75 leading-relaxed mb-3">Employees should collect only the information necessary to perform legitimate business activities. Before collecting information, consider:</p>
              <BList items={["Why is the information needed?","Is the collection appropriate and is there a business purpose?","Can the objective be achieved with less information?","Collecting unnecessary information increases privacy and security risks"]} />
              <SH id="data-access">Access to Information & Data Accuracy</SH>
              <Callout type="important">Access should be based on the principle of least privilege. Employees should only access information necessary for their responsibilities.</Callout>
              <BList items={["Do not browse records out of curiosity","Do not access information unrelated to your role","Never share credentials or attempt to bypass access controls","Managers should regularly review access permissions for their teams","Make reasonable efforts to keep records accurate, complete, and current"]} />
              <SH id="secure-storage">Secure Storage & Sharing</SH>
              <PTable rows={[["Avoid","Personal cloud storage, personal email, unauthorized messaging apps, unapproved devices"],["Use","Company-approved systems with proper security, backup, and access management"],["Before Sharing","Verify recipient is authorized, method is secure, and confidentiality is maintained"],["Minimum Info","Share the minimum amount of information required to achieve the business purpose"],["International Transfers","Implement appropriate safeguards; consult management before transfers to new systems"]]} />
              <SH id="data-retention">Data Retention & Secure Disposal</SH>
              <div className="my-5 rounded-xl overflow-hidden border border-border/50 shadow-sm">
                <table className="w-full text-sm">
                  <thead><tr className="bg-teal-50 dark:bg-teal-950/40 border-b border-border/40"><th className="py-2.5 px-4 text-left font-bold text-foreground/80">Record Type</th><th className="py-2.5 px-4 text-left font-bold text-foreground/80">Typical Retention</th></tr></thead>
                  <tbody>
                    {[["Employment Records","As required by applicable law and company policy"],["Payroll Records","As required by applicable law"],["Financial Records","As required by applicable law and accounting standards"],["Client Contracts","During the contract term and applicable retention period"],["Project Documentation","According to business needs and contractual obligations"],["Security Logs","According to operational and security requirements"]].map(([r,v],i)=>(
                      <tr key={i} className={`border-b border-border/30 last:border-0 ${i%2===0?"bg-muted/20":"bg-background"}`}><td className="py-2.5 px-4 font-semibold text-foreground/90 border-r border-border/30">{r}</td><td className="py-2.5 px-4 text-foreground/70">{v}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Callout type="note">Retention periods may vary based on applicable laws, contractual obligations, and regulatory requirements. The company may update retention schedules from time to time.</Callout>
              <SH id="records-management">Records Management</SH>
              <BList items={["Business records should be accurate, organized, and readily available when needed","Protected against unauthorized access and retained according to company requirements","Examples: employment records, contracts, financial records, project & technical documentation","Company emails may form part of official business records — retain important correspondence","Good records management supports transparency, compliance, and operational continuity"]} />
              <SH id="data-breaches-dp">Data Breaches & Employee Responsibilities</SH>
              <Callout type="warning">If you suspect that personal or confidential information has been lost, stolen, accessed without authorization, or shared incorrectly — report it immediately per the Information Security Policy. Prompt reporting enables the company to respond quickly and reduce potential impact.</Callout>
              <div className="grid md:grid-cols-2 gap-4 my-4">
                {[
                  {title:"Every Employee Must",items:["Protect personal information","Keep records accurate","Follow company privacy policies","Use approved systems","Report security incidents","Respect confidentiality","Dispose of information securely"]},
                  {title:"Managers Must Ensure Teams",items:["Understand privacy requirements","Follow data handling procedures","Maintain appropriate records","Review access permissions periodically","Report significant privacy concerns promptly"]},
                ].map(c=>(
                  <div key={c.title} className="rounded-xl border border-border/50 bg-background p-5 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">{c.title}</p>
                    <BList items={c.items} />
                  </div>
                ))}
              </div>
              <div className="mt-8 rounded-2xl border-2 border-teal-200 dark:border-teal-800/60 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/30 p-6">
                <p className="font-bold text-sm text-foreground mb-3">Summary — When Handling Information:</p>
                {["Collect only what you need","Access only what you are authorized to use","Store information securely","Share responsibly","Retain records appropriately","Dispose of information securely","Report concerns immediately"].map((item,i)=>(
                  <div key={i} className="flex items-center gap-2.5 py-1.5"><Check className="w-4 h-4 text-teal-500 shrink-0" /><span className="text-sm text-foreground/80">{item}</span></div>
                ))}
              </div>
            </article>

            {/* ════ CH 22 — Business Continuity & Compliance ═ */}
            <article id="ch22" className="scroll-mt-20 mb-20">
              <ChapterHero ch={CHAPTERS.find(c=>c.id==="ch22")!} />
              <p className="text-sm text-foreground/75 leading-relaxed mb-5">Dynime is committed to operating responsibly, ethically, and consistently, even during unexpected events. Whether facing a technology outage, natural disaster, cybersecurity incident, or regulatory change, our goal is to continue serving our clients while protecting our employees, information, and business operations.</p>
              <SH id="bc-purpose">Purpose</SH>
              <BList items={["Support uninterrupted business operations","Prepare employees for unexpected disruptions","Promote compliance with applicable laws and regulations","Encourage ethical decision-making","Protect clients, employees, and company assets","Maintain trust during challenging situations"]} />
              <SH id="business-continuity">Business Continuity</SH>
              <p className="text-sm text-foreground/75 leading-relaxed mb-3">Potential disruptions may include:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 my-4">
                {["Internet Outages","Power Failures","Cybersecurity Incidents","Cloud Service Interruptions","Natural Disasters","Public Health Emergencies","Civil Disturbances","Loss of Key Personnel","Hardware Failures"].map(s=>(
                  <div key={s} className="text-xs font-semibold px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 text-foreground/80">{s}</div>
                ))}
              </div>
              <div className="grid md:grid-cols-2 gap-4 my-4">
                {[
                  {title:"During Disruptions, Employees Should",items:["Prioritize personal safety","Notify manager if unable to work","Follow emergency communication instructions","Protect company equipment and information","Continue working using approved alternative methods","Report significant operational issues promptly"]},
                  {title:"Remote Work Continuity — Be Prepared",items:["Maintain a reliable internet connection","Have backup internet options where feasible","Keep access to company systems current","Maintain updated contact information","Access to approved communication platforms"]},
                ].map(c=>(
                  <div key={c.title} className="rounded-xl border border-border/50 bg-background p-5 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">{c.title}</p>
                    <BList items={c.items} />
                  </div>
                ))}
              </div>
              <SH id="incident-mgmt">Incident Management</SH>
              <p className="text-sm text-foreground/75 leading-relaxed mb-3">Immediately report incidents that may significantly affect business operations:</p>
              <BList items={["Security incidents and system outages","Data breaches and loss of company equipment","Service disruptions and safety concerns","Legal notices, major client issues"]} />
              <SH id="compliance-laws">Compliance with Laws & Ethical Business Practices</SH>
              <PTable rows={[["Employment","Follow applicable employment laws in your jurisdiction"],["Privacy","Comply with applicable data protection regulations"],["Intellectual Property","Respect IP rights; do not infringe third-party IP"],["Anti-Corruption","Zero tolerance for bribery or improper payments"],["Information Security","Follow company security policies and applicable regulations"],["Tax Obligations","Comply with applicable tax laws where relevant"],["Consumer Protection","Conduct business fairly and transparently"]]} />
              <SH id="anti-fraud-comp">Anti-Fraud & Anti-Corruption</SH>
              <Callout type="warning">Fraud and corruption in any form are strictly prohibited and may result in immediate termination and referral to legal authorities.</Callout>
              <div className="grid md:grid-cols-2 gap-4 my-4">
                {[
                  {title:"Fraud Includes",items:["Falsifying records","Misappropriating company funds","Expense fraud and payroll fraud","Identity fraud and forgery","Unauthorized financial transactions"]},
                  {title:"Corruption — Never",items:["Offer or accept bribes","Provide unlawful incentives","Attempt to influence decisions through unethical means","Engage in improper payments","Conduct business outside professional integrity"]},
                ].map(c=>(
                  <div key={c.title} className="rounded-xl border border-border/50 bg-background p-5 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">{c.title}</p>
                    <BList items={c.items} />
                  </div>
                ))}
              </div>
              <SH id="sanctions">Sanctions & International Trade</SH>
              <p className="text-sm text-foreground/75 leading-relaxed">Because Dynime may serve international clients, employees should ensure that business activities comply with applicable sanctions, export controls, and international trade restrictions. Do not enter into business relationships that violate applicable legal restrictions. Questions should be directed to management before proceeding.</p>
              <SH id="audits">Regulatory Cooperation & Audits</SH>
              <BList items={["Forward legal notices, subpoenas, or regulatory inquiries promptly to company leadership","Do not respond independently to official legal requests without authorization unless legally required","Cooperate honestly during internal or external audits","Provide accurate information and maintain requested records during audits","Audits help improve operations and strengthen accountability"]} />
              <SH id="decision-framework">Ethical Decision-Making Framework</SH>
              <div className="my-5 rounded-2xl bg-gradient-to-br from-slate-50 to-zinc-50 dark:from-slate-900/40 dark:to-zinc-900/40 border border-border/50 p-6">
                <p className="font-bold text-sm text-foreground mb-4">When uncertain whether an action is appropriate, ask:</p>
                {["Is it legal?","Is it ethical?","Does it comply with company policy?","Would I be comfortable explaining this decision to a client, my manager, or my colleagues?","Could this damage Dynime's reputation?","Does it align with our values?"].map((q,i)=>(
                  <div key={i} className="flex items-start gap-3 py-1.5">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{i+1}</span>
                    <span className="text-sm text-foreground/80">{q}</span>
                  </div>
                ))}
                <Callout type="warning">If the answer to any question is <strong>No</strong> or <strong>I'm not sure</strong> — stop and seek guidance before proceeding.</Callout>
              </div>
              <SH id="crisis-comms">Crisis Communication</SH>
              <p className="text-sm text-foreground/75 leading-relaxed">During significant business disruptions, only authorized spokespersons may communicate with clients, media, government authorities, investors, and the public. Employees should avoid sharing unofficial information or speculation regarding ongoing incidents. Accurate communication protects both the company and our stakeholders.</p>
              <div className="mt-8 rounded-2xl border-2 border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-900/30 p-6">
                <p className="font-bold text-sm text-foreground mb-3">When Facing Uncertainty:</p>
                {["Protect people first","Protect information","Follow company procedures","Report incidents promptly","Act ethically","Ask for guidance when unsure","Help maintain business continuity"].map((item,i)=>(
                  <div key={i} className="flex items-center gap-2.5 py-1.5"><Check className="w-4 h-4 text-primary shrink-0" /><span className="text-sm text-foreground/80">{item}</span></div>
                ))}
              </div>
            </article>

            {/* ════ THE DYNIME WAY ════════════════════════════ */}
            <article id="dynime-way" className="scroll-mt-20 mb-20">
              <ChapterHero ch={CHAPTERS.find(c=>c.id==="dynime-way")!} />
              <p className="text-sm text-foreground/75 leading-relaxed mb-6">The Dynime Way is not a rule book. It is how we think, how we work, and how we make decisions every day. These operating principles define our culture and reflect what we believe makes great work possible.</p>
              <SH id="dw-principles">Our 10 Operating Principles</SH>
              <div className="grid md:grid-cols-2 gap-4 my-5">
                {[
                  {num:"01",title:"We Own Outcomes",desc:"We take responsibility for the result, not just the task. We follow through, we own our work end-to-end, and we do not pass blame when things go wrong."},
                  {num:"02",title:"We Move Fast, Responsibly",desc:"Speed matters. But not at the cost of quality, security, or our clients' trust. We move with purpose and make thoughtful decisions quickly."},
                  {num:"03",title:"We Think Long-Term",desc:"We build things that last. Short-term gains that compromise long-term trust are never worth it. We optimize for sustainability."},
                  {num:"04",title:"We Protect Trust",desc:"Trust is the foundation of every client relationship. Once broken, it is extremely difficult to rebuild. We protect it with our behavior."},
                  {num:"05",title:"We Build Quality",desc:"Mediocre work is never acceptable. We take pride in what we deliver. Every output should reflect the Dynime Standard."},
                  {num:"06",title:"We Document Everything",desc:"A great idea that is not documented is eventually a lost idea. We write things down clearly, so the whole team can benefit."},
                  {num:"07",title:"We Learn Continuously",desc:"Technology, business, and the world evolve. The team that learns fastest wins. We read, experiment, share, and grow."},
                  {num:"08",title:"We Respect Everyone",desc:"Every person deserves dignity. Regardless of role, location, background, or seniority — respect is non-negotiable at Dynime."},
                  {num:"09",title:"We Solve Problems",desc:"We do not just raise problems. We come prepared with potential solutions, context, and a willingness to find the right path forward."},
                  {num:"10",title:"We Leave Things Better",desc:"When we touch a process, a codebase, a client relationship, or a system — we leave it better than we found it. Always."},
                ].map(p=>(
                  <div key={p.num} className="group rounded-2xl border border-border/50 bg-background hover:shadow-md transition-shadow p-5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-violet-500 to-indigo-600 rounded-l-2xl" />
                    <div className="pl-2">
                      <span className="text-[10px] font-black text-muted-foreground/50 tracking-widest">{p.num}</span>
                      <p className="font-heading font-bold text-[13.5px] text-foreground mt-0.5 mb-2">{p.title}</p>
                      <p className="text-xs text-foreground/65 leading-relaxed">{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <SH id="dw-how">How We Bring the Dynime Way to Life</SH>
              <BList items={["Start every project by clearly understanding the outcome, not just the task","Ask 'does this reflect the Dynime Standard?' before submitting any work","Document decisions, processes, and key learnings in real time","Share what you learn — write it down so others benefit","When in doubt, choose the path that protects trust","Treat every client interaction as a reflection of our values","Celebrate team wins and learn openly from setbacks"]} />
            </article>

            {/* ════ LEADERSHIP PRINCIPLES ══════════════════════ */}
            <article id="leadership" className="scroll-mt-20 mb-20">
              <ChapterHero ch={CHAPTERS.find(c=>c.id==="leadership")!} />
              <p className="text-sm text-foreground/75 leading-relaxed mb-6">Leadership at Dynime is not defined by a job title. It is defined by how you show up — for your team, your clients, and the company. These principles apply to everyone who leads others, whether formally or informally.</p>
              <SH id="lp-principles">Core Leadership Principles</SH>
              <div className="grid md:grid-cols-2 gap-4 my-5">
                {[
                  {title:"Lead by Example",desc:"The standards you hold for your team must first be standards you hold for yourself. Your team watches what you do more than what you say."},
                  {title:"Coach, Don't Micromanage",desc:"Trust your team to do the work. Your role is to set clear expectations, provide support, remove obstacles, and develop people — not control every step."},
                  {title:"Hire Carefully",desc:"One wrong hire can damage team culture and performance for months. Invest time in finding the right person, not just the fast person."},
                  {title:"Give Clear Feedback",desc:"Vague feedback helps no one. Be direct, specific, and kind. Address issues early — small problems ignored today become large problems tomorrow."},
                  {title:"Make Decisions with Data",desc:"Opinions are useful, but decisions should be grounded in evidence. Ask for data. Question assumptions. Be willing to change your mind."},
                  {title:"Build Trust",desc:"Trust is built through consistency, honesty, and follow-through. Do what you say you will do. Admit when you are wrong."},
                  {title:"Empower Others",desc:"Give your team the authority to make decisions within their responsibility. Empowered teams deliver better outcomes and grow faster."},
                  {title:"Create Future Leaders",desc:"The best leaders build other leaders. Actively invest in the development of the people around you. Your success is measured by theirs."},
                ].map(p=>(
                  <div key={p.title} className="rounded-2xl border border-border/50 bg-background hover:shadow-md transition-shadow p-5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-500 to-orange-600 rounded-l-2xl" />
                    <div className="pl-2">
                      <p className="font-heading font-bold text-[13.5px] text-foreground mb-1.5">{p.title}</p>
                      <p className="text-xs text-foreground/65 leading-relaxed">{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <SH id="lp-managers">What Great Managers Do at Dynime</SH>
              <BList items={["Hold weekly or bi-weekly 1-on-1 meetings with every direct report","Set clear goals and success criteria at the start of every project or quarter","Provide written feedback, not just verbal — documentation matters","Recognize contributions publicly and address concerns privately","Actively ask 'what do you need from me?' to remove blockers","Create psychological safety — people do their best work when they feel safe to speak up","Review team access permissions and project assignments regularly","Participate in performance reviews with preparation and honesty"]} />
            </article>

            {/* ════ THE DYNIME STANDARD ════════════════════════ */}
            <article id="standard" className="scroll-mt-20 mb-20">
              <ChapterHero ch={CHAPTERS.find(c=>c.id==="standard")!} />
              <p className="text-sm text-foreground/75 leading-relaxed mb-6">The Dynime Standard is a simple quality framework. Before submitting any work — whether a line of code, a client deliverable, a document, or a communication — apply this checklist.</p>
              <SH id="quality-checklist">The Quality Checklist</SH>
              <div className="my-6 space-y-3">
                {[
                  {q:"Is it accurate?",desc:"Have you verified the information, data, or output? Are there errors, assumptions, or gaps?"},
                  {q:"Is it secure?",desc:"Does this work follow security and confidentiality standards? Have you checked for exposure of sensitive information?"},
                  {q:"Is it documented?",desc:"Has this been written down clearly so that someone else can understand, continue, or audit it?"},
                  {q:"Is it professional?",desc:"Does this work meet the quality standard expected from Dynime? Would you be proud to put your name on it?"},
                  {q:"Would I proudly show this to a client?",desc:"If the answer is no, it is not ready. If the answer is yes, you may be close."},
                  {q:"Did I verify my work?",desc:"Did you test it, re-read it, or review it from a fresh perspective before submitting?"},
                  {q:"Is it complete?",desc:"Has every item been addressed? Are there open questions that need to be resolved before this is finalized?"},
                ].map((item,i)=>(
                  <div key={i} className="flex gap-4 p-4 rounded-xl border border-border/50 bg-background hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground mb-1">{item.q}</p>
                      <p className="text-xs text-foreground/65 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <SH id="standard-why">Why This Standard Matters</SH>
              <p className="text-sm text-foreground/75 leading-relaxed mb-3">Quality work is not always the fastest work. But work that does not meet the Dynime Standard will always cost us more time in the long run — through revisions, client dissatisfaction, or reputational damage.</p>
              <Callout type="important">When you apply the Dynime Standard consistently, you build your professional reputation, strengthen client relationships, and contribute to a culture where excellence is the default — not the exception.</Callout>
            </article>

            {/* ════ FAQs ══════════════════════════════════════ */}
            <article id="faqs" className="scroll-mt-20 mb-20">
              <ChapterHero ch={CHAPTERS.find(c=>c.id==="faqs")!} />
              <p className="text-sm text-foreground/75 leading-relaxed mb-6">Answers to the questions employees ask most often. If your question is not listed here, contact HR or your manager.</p>
              <SH id="faq-work">Working at Dynime</SH>
              <div className="space-y-3 my-4">
                {[
                  {q:"Can I work while traveling?",a:"Yes. Dynime is a remote-first company. You can work from any location as long as you maintain your performance, availability during core hours, comply with security requirements, and ensure there are no legal or tax implications in the destination country. Consult HR if traveling for extended periods."},
                  {q:"Can I freelance or do outside work?",a:"Limited outside work may be permitted provided it does not conflict with Dynime's business interests, does not involve competitor clients, does not use Dynime's resources, and is disclosed to HR. Work that creates a conflict of interest is not permitted."},
                  {q:"Can I work from another country?",a:"Short-term remote work from another country may be possible with manager and HR approval. Extended relocation may trigger tax, legal, and employment obligations. Always consult HR before making arrangements."},
                  {q:"What happens during probation?",a:"During probation (typically 2–6 months), your performance will be formally reviewed at midpoint and at the end. Either party may terminate with appropriate notice. Successful completion results in a written confirmation of employment."},
                ].map((item,i)=>(
                  <div key={i} className="rounded-xl border border-border/50 bg-background overflow-hidden">
                    <div className="flex items-start gap-3 px-5 py-3.5 bg-sky-50/50 dark:bg-sky-950/20 border-b border-border/30">
                      <HelpCircle className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                      <p className="font-semibold text-[13px] text-foreground">{item.q}</p>
                    </div>
                    <p className="px-5 py-3.5 text-sm text-foreground/75 leading-relaxed">{item.a}</p>
                  </div>
                ))}
              </div>
              <SH id="faq-policy">Policy Questions</SH>
              <div className="space-y-3 my-4">
                {[
                  {q:"How do I request leave?",a:"Submit your leave request to your manager with at least 3 business days' advance notice for planned leave. Emergency leave should be reported as soon as reasonably possible. Approvals depend on business requirements and team coverage."},
                  {q:"Who approves expenses?",a:"Your direct manager approves day-to-day business expenses. Submit expense claims with receipts within 30 days of incurring the expense. Pre-approval is required for expenses above the standard threshold."},
                  {q:"Who owns the code or work I produce?",a:"All intellectual property created during the course of your employment belongs to Dynime, including code, designs, documentation, and any AI-assisted work produced for company purposes. See Chapter 12 for full details."},
                  {q:"What is the notice period if I resign?",a:"The notice period is specified in your employment agreement. The standard is 30 days unless otherwise agreed. During notice, you are expected to continue your responsibilities professionally and cooperate with the transition."},
                ].map((item,i)=>(
                  <div key={i} className="rounded-xl border border-border/50 bg-background overflow-hidden">
                    <div className="flex items-start gap-3 px-5 py-3.5 bg-sky-50/50 dark:bg-sky-950/20 border-b border-border/30">
                      <HelpCircle className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                      <p className="font-semibold text-[13px] text-foreground">{item.q}</p>
                    </div>
                    <p className="px-5 py-3.5 text-sm text-foreground/75 leading-relaxed">{item.a}</p>
                  </div>
                ))}
              </div>
              <SH id="faq-tech">Technology & AI</SH>
              <div className="space-y-3 my-4">
                {[
                  {q:"Can I use ChatGPT or other AI tools?",a:"Yes, approved AI tools may be used for work. However, never upload confidential client information, source code, credentials, or company proprietary data to public AI tools. Review all AI-generated output before use. See Chapter 11 for the full AI Usage Policy."},
                  {q:"Can I use my personal device for work?",a:"Personal devices used for work (BYOD) must meet minimum security requirements including device encryption, screen lock, and up-to-date antivirus. Company data on personal devices must be removed upon separation."},
                  {q:"What should I do if I receive a suspicious email?",a:"Do not click any links or download attachments. Report the email to your manager and the security team immediately. Follow the procedures in Chapter 9 — Information Security Policy."},
                ].map((item,i)=>(
                  <div key={i} className="rounded-xl border border-border/50 bg-background overflow-hidden">
                    <div className="flex items-start gap-3 px-5 py-3.5 bg-sky-50/50 dark:bg-sky-950/20 border-b border-border/30">
                      <HelpCircle className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                      <p className="font-semibold text-[13px] text-foreground">{item.q}</p>
                    </div>
                    <p className="px-5 py-3.5 text-sm text-foreground/75 leading-relaxed">{item.a}</p>
                  </div>
                ))}
              </div>
            </article>

            {/* ════ APPENDIX A — QUICK CONTACTS ════════════════ */}
            <article id="app-a" className="scroll-mt-20 mb-20">
              <ChapterHero ch={CHAPTERS.find(c=>c.id==="app-a")!} />
              <p className="text-sm text-foreground/75 leading-relaxed mb-6">Use this directory when you need to reach the right team or person quickly.</p>
              <div className="grid md:grid-cols-2 gap-3 my-4">
                {[
                  {need:"Human Resources",who:"HR Department",icon:Users,color:"violet"},
                  {need:"Payroll & Finance",who:"Finance Department",icon:DollarSign,color:"emerald"},
                  {need:"IT Support",who:"IT Department",icon:Monitor,color:"blue"},
                  {need:"Information Security",who:"Security Team",icon:ShieldCheck,color:"slate"},
                  {need:"Legal & Compliance",who:"Legal / Compliance Team",icon:Scale,color:"red"},
                  {need:"Your Role & Performance",who:"Direct Manager",icon:Star,color:"amber"},
                  {need:"AI Tools & Access",who:"IT Department",icon:Bot,color:"purple"},
                  {need:"Data Privacy Concerns",who:"HR & Security Team",icon:Lock,color:"teal"},
                ].map(row=>(
                  <div key={row.need} className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-background hover:shadow-sm transition-shadow">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <row.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground font-semibold">{row.need}</p>
                      <p className="text-sm font-bold text-foreground">{row.who}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            {/* ════ APPENDIX B — QUICK REFERENCE ══════════════ */}
            <article id="app-b" className="scroll-mt-20 mb-20">
              <ChapterHero ch={CHAPTERS.find(c=>c.id==="app-b")!} />
              <p className="text-sm text-foreground/75 leading-relaxed mb-6">At-a-glance summary of key employment terms and entitlements.</p>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 my-4">
                {[
                  {label:"Standard Work Week",value:"40 Hours (8hrs/day, Flexible)"},
                  {label:"Work Type",value:"Remote — Work from Anywhere"},
                  {label:"Weekly Holiday",value:"Sunday (Adjustable)"},
                  {label:"Annual Leave",value:"14 Working Days"},
                  {label:"Sick Leave",value:"5 Working Days"},
                  {label:"Emergency Leave",value:"3 Working Days"},
                  {label:"Notice Period",value:"30 Days (unless otherwise agreed)"},
                  {label:"Probation",value:"2–6 Months (role dependent)"},
                  {label:"Payroll",value:"As per employment agreement"},
                ].map(item=>(
                  <div key={item.label} className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-100 dark:border-blue-900/40">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{item.label}</p>
                    <p className="font-bold text-sm text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            </article>

            {/* ════ APPENDIX C — GLOSSARY ══════════════════════ */}
            <article id="app-c" className="scroll-mt-20 mb-20">
              <ChapterHero ch={CHAPTERS.find(c=>c.id==="app-c")!} />
              <p className="text-sm text-foreground/75 leading-relaxed mb-6">Common terms and abbreviations used throughout this handbook and in day-to-day operations at Dynime.</p>
              <div className="my-5 rounded-xl overflow-hidden border border-border/50 shadow-sm">
                <table className="w-full text-sm">
                  <thead><tr className="bg-purple-50 dark:bg-purple-950/40 border-b border-border/40"><th className="py-2.5 px-4 text-left font-bold text-foreground/80">Term</th><th className="py-2.5 px-4 text-left font-bold text-foreground/80">Meaning</th></tr></thead>
                  <tbody>
                    {[["AI","Artificial Intelligence"],["API","Application Programming Interface"],["BYOD","Bring Your Own Device"],["CRM","Customer Relationship Management"],["HRIS","Human Resources Information System"],["IP","Intellectual Property"],["KPI","Key Performance Indicator"],["MFA","Multi-Factor Authentication"],["NDA","Non-Disclosure Agreement"],["OKR","Objectives and Key Results"],["PIP","Performance Improvement Plan"],["SaaS","Software as a Service"],["SSO","Single Sign-On"],["VPN","Virtual Private Network"],["EEO","Equal Employment Opportunity"],["GDPR","General Data Protection Regulation"]].map(([t,m],i)=>(
                      <tr key={t} className={`border-b border-border/30 last:border-0 ${i%2===0?"bg-muted/20":"bg-background"}`}><td className="py-2.5 px-4 font-bold text-foreground/90 border-r border-border/30 w-24">{t}</td><td className="py-2.5 px-4 text-foreground/70">{m}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            {/* ════ APPENDIX D — FIRST WEEK CHECKLIST ══════════ */}
            <article id="app-d" className="scroll-mt-20 mb-20">
              <ChapterHero ch={CHAPTERS.find(c=>c.id==="app-d")!} />
              <p className="text-sm text-foreground/75 leading-relaxed mb-6">Your guided checklist for the first five days at Dynime. Work through this with your manager and HR to ensure a smooth start.</p>
              <div className="space-y-5 my-6">
                {[
                  {day:"Day 1",color:"from-violet-500 to-indigo-600",items:["Receive company equipment (if applicable)","Activate company email account","Configure Multi-Factor Authentication (MFA)","Read the Employee Handbook","Meet your manager and immediate team","Join all required communication channels"]},
                  {day:"Day 2–3",color:"from-blue-500 to-sky-500",items:["Gain access to all required systems and tools","Review department processes and workflows","Meet key stakeholders and cross-functional teams","Complete mandatory security awareness training","Review current active projects"]},
                  {day:"Day 4–5",color:"from-emerald-500 to-green-600",items:["Understand your role responsibilities and KPIs","Review current projects in detail","Set initial 30-day goals with your manager","Schedule your first formal 1-on-1 meeting","Confirm understanding of policies and acknowledge the handbook"]},
                ].map(block=>(
                  <div key={block.day} className="rounded-2xl border border-border/50 bg-background overflow-hidden shadow-sm">
                    <div className={`px-5 py-3 bg-gradient-to-r ${block.color} flex items-center gap-2`}>
                      <ListChecks className="w-4 h-4 text-white" />
                      <p className="font-bold text-white text-sm">{block.day}</p>
                    </div>
                    <div className="p-5">
                      {block.items.map((item,i)=>(
                        <div key={i} className="flex items-start gap-3 py-2 border-b border-border/20 last:border-0">
                          <div className="w-5 h-5 rounded border-2 border-border/40 shrink-0 mt-0.5" />
                          <span className="text-sm text-foreground/75">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <Callout type="note">This checklist is a guide. Your manager may adjust the sequence based on your role and team requirements. Don't hesitate to ask questions — your team wants you to succeed.</Callout>
            </article>

          </main>
        </div>
      </div>

      {/* Scroll to top */}
      {scrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-50 w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}
    </Layout>
  );
};

export default EmployeeHandbook;

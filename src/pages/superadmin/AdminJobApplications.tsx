import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Search, Inbox, Mail, Phone, Globe, Linkedin, ExternalLink, FileText, Trash2, Download, FileDown,
  Sparkles, RefreshCw, AlertTriangle, UserX, Filter, Gauge,
} from "lucide-react";
import { streamCsvExport, type CsvColumn } from "@/lib/csv-export";

interface AtsContactLinks {
  emails?: string[];
  phones?: string[];
  linkedin?: string[];
  github?: string[];
  portfolio?: string[];
  other?: string[];
}

interface JobApplication {
  id: string;
  career_id: string | null;
  career_slug: string | null;
  career_title: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  country: string | null;
  current_position: string | null;
  experience_years: number | null;
  expected_salary: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  resume_url: string | null;
  cover_letter: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  ats_score: number | null;
  ats_match_level: "high" | "medium" | "low" | null;
  ats_matched_keywords: string[] | null;
  ats_missing_keywords: string[] | null;
  ats_summary: string | null;
  ats_scanned_at: string | null;
  ats_resume_chars: number | null;
  ats_detected_skills: string[] | null;
  ats_detected_titles: string[] | null;
  ats_detected_experience_years: number | null;
  ats_education: string | null;
  ats_red_flags: string[] | null;
  ats_recommendation: string | null;
  ats_contact_links: AtsContactLinks | null;
  ats_highlights: string[] | null;
}

const STATUSES = ["new", "reviewing", "shortlisted", "interview", "offer", "hired", "rejected"];

// Parses values like "80000 / yearly", "5000 / monthly", or "Negotiable".
// Falls back to plain string display for legacy entries.
const parseSalary = (raw: string): { amount: number | null; period: "yearly" | "monthly" | null; negotiable: boolean; original: string } => {
  const trimmed = raw.trim();
  if (/^negotiable$/i.test(trimmed)) return { amount: null, period: null, negotiable: true, original: trimmed };
  // Matches "$80000 USD / yearly", "80000 / monthly", etc.
  const m = trimmed.match(/^\$?\s*([\d.,]+)\s*(?:USD)?\s*\/\s*(yearly|monthly)$/i);
  if (m) {
    const amount = parseFloat(m[1].replace(/,/g, ""));
    const period = m[2].toLowerCase() as "yearly" | "monthly";
    return { amount: Number.isFinite(amount) ? amount : null, period, negotiable: false, original: trimmed };
  }
  return { amount: null, period: null, negotiable: false, original: trimmed };
};

const SalaryDisplay = ({ raw }: { raw: string }) => {
  const parsed = useMemo(() => parseSalary(raw), [raw]);
  const [months, setMonths] = useState(12);

  if (parsed.negotiable) {
    return (
      <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Expected salary</p>
        <p className="text-sm font-semibold text-foreground">Negotiable</p>
      </div>
    );
  }

  if (parsed.amount == null || !parsed.period) {
    return (
      <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Expected salary</p>
        <p className="text-sm text-foreground">{parsed.original}</p>
      </div>
    );
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);

  const monthly = parsed.period === "yearly" ? parsed.amount / (months || 1) : parsed.amount;
  const yearly = parsed.period === "monthly" ? parsed.amount * (months || 1) : parsed.amount;

  return (
    <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 space-y-2 sm:col-span-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Expected salary</p>
          <p className="text-sm font-semibold text-foreground">
            ${fmt(parsed.amount)} <span className="text-xs font-normal text-muted-foreground">USD / {parsed.period}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <label htmlFor="salary-months" className="text-muted-foreground">Months / year</label>
          <input
            id="salary-months"
            type="number"
            min={1}
            max={24}
            value={months}
            onChange={(e) => setMonths(Math.max(1, Math.min(24, parseInt(e.target.value || "12", 10) || 12)))}
            className="h-7 w-16 rounded border border-input bg-background px-2 text-xs"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded bg-background/60 px-2 py-1.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Per month</p>
          <p className="font-semibold text-foreground">${fmt(monthly)}</p>
        </div>
        <div className="rounded bg-background/60 px-2 py-1.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Per year ({months} mo)</p>
          <p className="font-semibold text-foreground">${fmt(yearly)}</p>
        </div>
      </div>
    </div>
  );
};


const notifyApplicationStatus = async (app: JobApplication, status: string, note?: string) => {
  const updatedAt = new Date().toISOString();
  const trimmedNote = (note || "").trim();
  const { error } = await supabase.functions.invoke("send-transactional-email", {
    body: {
      templateName: "job-application-status-update",
      recipientEmail: app.email,
      idempotencyKey: `job-application-${app.id}-status-${status}-${updatedAt}`,
      templateData: {
        name: app.full_name,
        role: app.career_title || "the role you applied for",
        status,
        updatedAt,
        ...(trimmedNote ? { note: trimmedNote } : {}),
      },
    },
  });
  if (error) throw error;
};


const statusColor = (s: string) =>
  ({
    new: "bg-primary/15 text-primary",
    reviewing: "bg-amber-500/15 text-amber-500",
    shortlisted: "bg-blue-500/15 text-blue-500",
    interview: "bg-purple-500/15 text-purple-500",
    offer: "bg-emerald-500/15 text-emerald-500",
    hired: "bg-emerald-600/20 text-emerald-600",
    rejected: "bg-destructive/15 text-destructive",
  }[s] || "bg-muted text-muted-foreground");

const atsBadge = (level: string | null, score: number | null) => {
  if (level == null || score == null) return { className: "bg-muted text-muted-foreground", label: "Not scanned" };
  if (level === "high") return { className: "bg-emerald-500/15 text-emerald-600", label: `High match · ${score}` };
  if (level === "medium") return { className: "bg-amber-500/15 text-amber-600", label: `Medium · ${score}` };
  return { className: "bg-destructive/15 text-destructive", label: `Low match · ${score}` };
};


type NotePreset = { label: string; text: string };
const fill = (tpl: string, v: { name: string; role: string }) =>
  tpl.replace(/\{name\}/g, v.name).replace(/\{role\}/g, v.role);

const STATUS_NOTE_PRESETS: Record<string, NotePreset[]> = {
  reviewing: [
    { label: "Standard", text: "Hi {name},\n\nThanks again for applying for {role}. Your application is now with our hiring team for review — we'll get back to you within 5–7 business days." },
    { label: "High volume", text: "Hi {name},\n\nWe've received a high volume of applications for {role}. Your profile is in the queue and we'll update you as soon as the review is complete." },
  ],
  shortlisted: [
    { label: "Standard", text: "Hi {name},\n\nGreat news — you've been shortlisted for {role}. Our team will reach out shortly with the next steps." },
    { label: "Task incoming", text: "Hi {name},\n\nYou've been shortlisted for {role}. As a next step, we'll send over a short take-home task in the next 24 hours." },
  ],
  interview: [
    { label: "Schedule call", text: "Hi {name},\n\nWe'd love to invite you to a 30-minute introductory call for the {role} position. Please reply with 2–3 time slots that work for you next week (mention your timezone)." },
    { label: "Panel interview", text: "Hi {name},\n\nYou've advanced to the panel interview round for {role}. The session will be ~60 minutes with 2–3 team members. Please share your availability for next week." },
    { label: "Technical round", text: "Hi {name},\n\nNext step for {role} is a technical interview (~60 min) covering problem solving and a short code walkthrough. Please share 3 time windows that work for you." },
  ],
  offer: [
    { label: "Offer coming", text: "Hi {name},\n\nWe're thrilled to move forward with an offer for the {role} position. Our team will email the formal offer letter with compensation and start date details within 1–2 business days." },
    { label: "Verbal offer", text: "Hi {name},\n\nCongratulations — we'd like to extend a verbal offer for {role}. Expect the written offer letter shortly. Please let us know if you have any initial questions." },
  ],
  hired: [
    { label: "Welcome", text: "Hi {name},\n\nWelcome to the team! 🎉 We're excited to have you on board for the {role} role. Our HR team will reach out with onboarding paperwork, IT setup, and your first-week schedule." },
    { label: "Onboarding", text: "Hi {name},\n\nCongratulations on joining us as {role}! You'll receive your onboarding kit, login credentials, and Day-1 agenda by email before your start date." },
  ],
  rejected: [
    { label: "Polite decline", text: "Hi {name},\n\nThank you for taking the time to apply for {role}. After careful review, we've decided to move forward with other candidates whose experience more closely matches our current needs. We truly appreciate your interest and wish you the best in your search." },
    { label: "Not qualified", text: "Hi {name},\n\nThanks for applying for {role}. Unfortunately your current profile doesn't meet the specific requirements we're hiring for at this time. We'll keep your details on file for future openings that may be a better fit." },
    { label: "Strong but no fit", text: "Hi {name},\n\nWe really enjoyed reviewing your application for {role}. While we won't be moving forward this time, your background is strong and we'd welcome you to apply for future roles that align with your experience." },
    { label: "Keep on file", text: "Hi {name},\n\nThanks for applying for {role}. We won't be progressing your application this round, but we'd like to keep your profile on file and reach out if a suitable role opens up." },
  ],
};

const getStatusNotePresets = (status: string, v: { name: string; role: string }): NotePreset[] =>
  (STATUS_NOTE_PRESETS[status] || []).map((p) => ({ label: p.label, text: fill(p.text, v) }));

const AdminJobApplications = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [atsFilter, setAtsFilter] = useState<string>("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [selected, setSelected] = useState<JobApplication | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [resumeMeta, setResumeMeta] = useState<{ name: string; type: string } | null>(null);
  const [rescanning, setRescanning] = useState(false);
  const [bulkScan, setBulkScan] = useState<{ running: boolean; done: number; total: number }>({ running: false, done: 0, total: 0 });
  const [bulkReject, setBulkReject] = useState<{ running: boolean; done: number; total: number }>({ running: false, done: 0, total: 0 });
  const [rejectThreshold, setRejectThreshold] = useState<number>(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("ats-reject-threshold") : null;
    const n = saved ? Number(saved) : 40;
    return Number.isFinite(n) && n >= 1 && n <= 99 ? n : 40;
  });
  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem("ats-reject-threshold", String(rejectThreshold));
  }, [rejectThreshold]);
  const [rejectConfirm, setRejectConfirm] = useState<{ open: boolean; mode: "score" | "filter"; notify: boolean }>({ open: false, mode: "score", notify: true });
  const [rejectToolsOpen, setRejectToolsOpen] = useState(false);
  const [statusChange, setStatusChange] = useState<{ newStatus: string; note: string } | null>(null);

  const runBulkScan = async (mode: "unscanned" | "filtered") => {
    const targets = (mode === "unscanned" ? apps.filter((a) => a.ats_match_level == null) : filtered).filter((a) => !!a.resume_url || !!a.cover_letter);
    if (targets.length === 0) {
      toast.info("Nothing to scan");
      return;
    }
    setBulkScan({ running: true, done: 0, total: targets.length });
    let ok = 0, fail = 0;
    const concurrency = 3;
    let idx = 0;
    const worker = async () => {
      while (idx < targets.length) {
        const my = idx++;
        const app = targets[my];
        try {
          const { error } = await supabase.functions.invoke("ats-scan-application", { body: { application_id: app.id } });
          if (error) throw error;
          ok++;
        } catch {
          fail++;
        }
        setBulkScan((s) => ({ ...s, done: s.done + 1 }));
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, worker));
    setBulkScan({ running: false, done: 0, total: 0 });
    await qc.invalidateQueries({ queryKey: ["admin-job-applications"] });
    toast.success(`Scanned ${ok} application${ok === 1 ? "" : "s"}${fail ? ` · ${fail} failed` : ""}`);
  };

  const runBulkReject = async (mode: "score" | "filter", notify: boolean) => {
    const targets = mode === "score"
      ? apps.filter((a) => a.ats_score != null && a.ats_score < rejectThreshold && a.status !== "rejected")
      : filtered.filter((a) => a.status !== "rejected");
    if (targets.length === 0) {
      toast.info(mode === "score" ? "No low-score candidates to reject" : "No candidates in the current filter to reject");
      return;
    }
    setBulkReject({ running: true, done: 0, total: targets.length });
    let ok = 0, fail = 0, emailFail = 0;
    const concurrency = 3;
    let idx = 0;
    const worker = async () => {
      while (idx < targets.length) {
        const my = idx++;
        const app = targets[my];
        try {
          const { error } = await supabase
            .from("job_applications")
            .update({ status: "rejected" })
            .eq("id", app.id);
          if (error) throw error;
          ok++;
          if (notify && app.email) {
            try {
              const note = fill(
                STATUS_NOTE_PRESETS.rejected[1]?.text || STATUS_NOTE_PRESETS.rejected[0].text,
                { name: app.full_name, role: app.career_title || "the role" },
              );
              await notifyApplicationStatus(app, "rejected", note);
            } catch { emailFail++; }
          }
        } catch {
          fail++;
        }
        setBulkReject((s) => ({ ...s, done: s.done + 1 }));
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, worker));
    setBulkReject({ running: false, done: 0, total: 0 });
    setRejectConfirm({ open: false, mode: "score", notify: true });
    await qc.invalidateQueries({ queryKey: ["admin-job-applications"] });
    toast.success(
      `Rejected ${ok}${fail ? ` · ${fail} failed` : ""}${notify ? ` · emails sent${emailFail ? ` (${emailFail} failed)` : ""}` : ""}`,
    );
  };

  const { data: apps = [], isLoading } = useQuery<JobApplication[]>({
    queryKey: ["admin-job-applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_applications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as JobApplication[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return apps.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (atsFilter !== "all") {
        if (atsFilter === "unscanned" ? a.ats_match_level != null : a.ats_match_level !== atsFilter) return false;
      }
      if (countryFilter !== "all") {
        const c = (a.country || "").trim().toLowerCase();
        if (countryFilter === "__none__" ? c !== "" : c !== countryFilter.toLowerCase()) return false;
      }
      if (!q) return true;
      return (
        a.full_name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        (a.career_title || "").toLowerCase().includes(q) ||
        (a.country || "").toLowerCase().includes(q)
      );
    });
  }, [apps, search, statusFilter, atsFilter, countryFilter]);

  const countryOptions = useMemo(() => {
    const set = new Map<string, string>();
    apps.forEach((a) => {
      const raw = (a.country || "").trim();
      if (!raw) return;
      const key = raw.toLowerCase();
      if (!set.has(key)) set.set(key, raw);
    });
    return Array.from(set.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [apps]);

  const atsStats = useMemo(() => ({
    high: apps.filter((a) => a.ats_match_level === "high").length,
    medium: apps.filter((a) => a.ats_match_level === "medium").length,
    low: apps.filter((a) => a.ats_match_level === "low").length,
    unscanned: apps.filter((a) => a.ats_match_level == null).length,
  }), [apps]);

  const lowScoreRejectCount = useMemo(
    () => apps.filter((a) => a.ats_score != null && a.ats_score < rejectThreshold && a.status !== "rejected").length,
    [apps, rejectThreshold],
  );

  const stats = useMemo(() => {
    const by: Record<string, number> = { total: apps.length };
    STATUSES.forEach((s) => (by[s] = apps.filter((a) => a.status === s).length));
    return by;
  }, [apps]);

  const updateMutation = useMutation({
    mutationFn: async (patch: { id: string; status?: string; admin_notes?: string; notifyStatus?: boolean; emailNote?: string }) => {
      const { id, notifyStatus, emailNote, ...rest } = patch;
      const { error } = await supabase.from("job_applications").update(rest).eq("id", id);
      if (error) throw error;
      // Email send is non-fatal: the DB status change has already persisted.
      // If we threw here on email failure, the dialog would roll back its local
      // state and the user would think the status change didn't stick.
      let emailSent = false;
      let emailError: string | null = null;
      if (notifyStatus && patch.status) {
        const app = apps.find((item) => item.id === id) || selected;
        if (app?.email) {
          try {
            await notifyApplicationStatus(app, patch.status, emailNote);
            emailSent = true;
          } catch (err) {
            emailError = err instanceof Error ? err.message : "email failed";
          }
        }
      }
      return { emailSent, emailError };
    },
    onSuccess: (res, vars) => {
      if (vars.notifyStatus) {
        if (res.emailSent) toast.success("Status updated and email sent");
        else toast.success(`Status updated · email failed${res.emailError ? `: ${res.emailError}` : ""}`);
      } else {
        toast.success("Application updated");
      }
      qc.invalidateQueries({ queryKey: ["admin-job-applications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("job_applications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Application deleted");
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["admin-job-applications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openDetail = async (app: JobApplication) => {
    setSelected(app);
    setResumeUrl(null);
    setResumeMeta(null);
    if (!app.resume_url) return;
    const resumeName = app.resume_url.split("/").pop() || "candidate-resume";

    const { data, error } = await supabase.storage
      .from("job-applications")
      .createSignedUrl(app.resume_url, 60 * 30); // 30 minutes
    if (error || !data?.signedUrl) return;

    // Fetch the file and expose it as an in-page data URL. Direct storage
    // URLs and top-level blob: tabs can be blocked by browser extensions.
    try {
      const resp = await fetch(data.signedUrl);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error || new Error("Failed to read resume"));
        reader.readAsDataURL(blob);
      });
      setResumeUrl(dataUrl);
      setResumeMeta({ name: resumeName, type: blob.type || "application/octet-stream" });
    } catch (e) {
      console.warn("Resume fetch failed, falling back to direct link", e);
      // Fallback to the raw signed URL — user can right-click → open if their
      // extension allows; otherwise they get a clear error in the toast below.
      setResumeUrl(data.signedUrl);
      setResumeMeta({ name: resumeName, type: resumeName.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream" });
      toast.error(
        "Couldn't preload the resume — a browser extension (ad blocker / privacy guard) may be blocking supabase.co. Disable it for this site or use an incognito window.",
      );
    }
  };

  const runScan = async (id: string) => {
    setRescanning(true);
    try {
      const { error } = await supabase.functions.invoke("ats-scan-application", {
        body: { application_id: id },
      });
      if (error) throw error;
      toast.success("ATS scan complete");
      await qc.invalidateQueries({ queryKey: ["admin-job-applications"] });
      // refresh dialog selection
      const { data } = await supabase.from("job_applications").select("*").eq("id", id).maybeSingle();
      if (data) setSelected(data as JobApplication);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setRescanning(false);
    }
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Inbox className="w-6 h-6 text-primary" /> Job Applications
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and manage candidates who applied directly through the careers site.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <button
            type="button"
            onClick={() => { setStatusFilter("all"); setAtsFilter("all"); setCountryFilter("all"); setSearch(""); }}
            className={`text-left rounded-lg transition-all hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-ring ${statusFilter === "all" && atsFilter === "all" && countryFilter === "all" && !search ? "ring-2 ring-primary" : ""}`}
          >
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
          </button>
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter((prev) => (prev === s ? "all" : s))}
              className={`text-left rounded-lg transition-all hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-ring ${statusFilter === s ? "ring-2 ring-primary" : ""}`}
            >
              <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground capitalize">{s}</p><p className="text-2xl font-bold">{stats[s] || 0}</p></CardContent></Card>
            </button>
          ))}
        </div>

        {/* ATS match summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {([
            { key: "high", label: "High match", count: atsStats.high, icon: <Sparkles className="w-3 h-3" />, color: "text-emerald-600" },
            { key: "medium", label: "Medium match", count: atsStats.medium, icon: null, color: "text-amber-600" },
            { key: "low", label: "Low / off-target", count: atsStats.low, icon: <AlertTriangle className="w-3 h-3" />, color: "text-destructive" },
            { key: "unscanned", label: "Not scanned", count: atsStats.unscanned, icon: null, color: "text-muted-foreground" },
          ] as const).map((it) => (
            <button
              key={it.key}
              type="button"
              onClick={() => setAtsFilter((prev) => (prev === it.key ? "all" : it.key))}
              className={`text-left rounded-lg transition-all hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-ring ${atsFilter === it.key ? "ring-2 ring-primary" : ""}`}
            >
              <Card><CardContent className="p-4"><p className={`text-xs flex items-center gap-1 ${it.color}`}>{it.icon}{it.label}</p><p className="text-2xl font-bold">{it.count}</p></CardContent></Card>
            </button>
          ))}
        </div>



        {/* Filters */}
        <TooltipProvider delayDuration={150}>
          <div className="rounded-xl border bg-card p-3 shadow-sm space-y-3">
            {/* Row 1 — Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-9 h-10 text-sm bg-background"
                placeholder="Search candidates by name, email, role or country…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Row 2 — Filters + actions */}
            <div className="flex flex-col md:flex-row md:items-center gap-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1 min-w-0">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Country" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="all">All countries</SelectItem>
                    <SelectItem value="__none__">Not specified</SelectItem>
                    {countryOptions.map((c) => (
                      <SelectItem key={c.key} value={c.key} className="capitalize">{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={atsFilter} onValueChange={setAtsFilter}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="ATS match" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All match levels</SelectItem>
                    <SelectItem value="high">High match</SelectItem>
                    <SelectItem value="medium">Medium match</SelectItem>
                    <SelectItem value="low">Low / off-target</SelectItem>
                    <SelectItem value="unscanned">Not scanned</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Icon-only action toolbar */}
              <div className="flex items-center gap-1 md:border-l md:pl-2 self-end md:self-auto">
              {/* Export CSV */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11"
                    disabled={filtered.length === 0}
                    onClick={async () => {
                      const columns: CsvColumn<JobApplication>[] = [
                        { header: "Applied At", value: (r) => new Date(r.created_at).toISOString() },
                        { header: "Full Name", value: (r) => r.full_name },
                        { header: "Email", value: (r) => r.email },
                        { header: "Phone", value: (r) => r.phone },
                        { header: "Country", value: (r) => r.country },
                        { header: "Role", value: (r) => r.career_title },
                        { header: "Role Slug", value: (r) => r.career_slug },
                        { header: "Current Position", value: (r) => r.current_position },
                        { header: "Experience (years)", value: (r) => r.experience_years },
                        { header: "Expected Salary", value: (r) => r.expected_salary },
                        { header: "LinkedIn", value: (r) => r.linkedin_url },
                        { header: "Portfolio", value: (r) => r.portfolio_url },
                        { header: "Resume Path", value: (r) => r.resume_url },
                        { header: "Cover Letter", value: (r) => r.cover_letter },
                        { header: "Status", value: (r) => r.status },
                        { header: "Admin Notes", value: (r) => r.admin_notes },
                        { header: "ID", value: (r) => r.id },
                      ];
                      try {
                        const rows = filtered;
                        const stamp = new Date().toISOString().slice(0, 10);
                        const count = await streamCsvExport<JobApplication>({
                          filename: `job-applications-${stamp}.csv`,
                          columns,
                          fetchPage: async (offset) => (offset === 0 ? { rows, total: rows.length } : { rows: [], total: rows.length }),
                        });
                        if (count > 0) toast.success(`Exported ${count} application${count === 1 ? "" : "s"}`);
                      } catch (e: any) {
                        toast.error(e?.message || "Export failed");
                      }
                    }}
                  >
                    <FileDown className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export filtered to CSV ({filtered.length})</TooltipContent>
              </Tooltip>

              {/* Bulk ATS scan */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 text-primary hover:text-primary"
                    disabled={bulkScan.running || apps.length === 0}
                    onClick={() => runBulkScan("unscanned")}
                  >
                    <Sparkles className={`w-5 h-5 ${bulkScan.running ? "animate-pulse" : ""}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {bulkScan.running
                    ? `Scanning ${bulkScan.done}/${bulkScan.total}…`
                    : `Bulk ATS scan unscanned${atsStats.unscanned ? ` (${atsStats.unscanned})` : ""}`}
                </TooltipContent>
              </Tooltip>

              {/* Rejection tools popover */}
              <Popover open={rejectToolsOpen} onOpenChange={setRejectToolsOpen}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11 text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={bulkReject.running || apps.length === 0}
                      >
                        <UserX className={`w-5 h-5 ${bulkReject.running ? "animate-pulse" : ""}`} />
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    {bulkReject.running ? `Rejecting ${bulkReject.done}/${bulkReject.total}…` : "Rejection tools"}
                  </TooltipContent>
                </Tooltip>
                <PopoverContent align="end" className="w-80 p-0">
                  <div className="p-3 border-b">
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <UserX className="w-4 h-4 text-destructive" /> Rejection tools
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Bulk reject candidates by ATS score or current filter.</p>
                  </div>

                  {/* ATS-score based */}
                  <div className="p-3 space-y-2">
                    <p className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground uppercase tracking-wide">
                      <Gauge className="w-3.5 h-3.5" /> By ATS score
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Score &lt;</span>
                      <Input
                        type="number"
                        min={1}
                        max={99}
                        value={rejectThreshold}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          if (Number.isFinite(n)) setRejectThreshold(Math.max(1, Math.min(99, Math.round(n))));
                        }}
                        className="h-9 w-20"
                        aria-label="ATS reject threshold"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="ml-auto"
                        disabled={bulkReject.running || lowScoreRejectCount === 0}
                        onClick={() => { setRejectToolsOpen(false); setRejectConfirm({ open: true, mode: "score", notify: true }); }}
                      >
                        Reject {lowScoreRejectCount}
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Filter-based */}
                  <div className="p-3 space-y-2">
                    <p className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground uppercase tracking-wide">
                      <Filter className="w-3.5 h-3.5" /> By current filter
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Rejects every candidate currently visible in the table (after status, country, ATS match & search filters).
                    </p>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      disabled={bulkReject.running || filtered.filter((a) => a.status !== "rejected").length === 0}
                      onClick={() => { setRejectToolsOpen(false); setRejectConfirm({ open: true, mode: "filter", notify: true }); }}
                    >
                      Reject {filtered.filter((a) => a.status !== "rejected").length} filtered
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              </div>
            </div>
          </div>
        </TooltipProvider>

        {/* Bulk reject confirm */}
        <Dialog open={rejectConfirm.open} onOpenChange={(v) => !v && !bulkReject.running && setRejectConfirm({ open: false, mode: "score", notify: true })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserX className="w-5 h-5 text-destructive" />
                {rejectConfirm.mode === "score" ? "Auto-reject low ATS matches" : "Reject filtered candidates"}
              </DialogTitle>
              <DialogDescription>
                {rejectConfirm.mode === "score" ? (
                  <>This will set the status to <span className="font-semibold">rejected</span> for{" "}
                  <span className="font-semibold text-destructive">{lowScoreRejectCount}</span> candidate{lowScoreRejectCount === 1 ? "" : "s"} with an ATS score below <span className="font-semibold">{rejectThreshold}</span> who aren't already rejected. This cannot be undone in bulk.</>
                ) : (
                  <>This will set the status to <span className="font-semibold">rejected</span> for{" "}
                  <span className="font-semibold text-destructive">{filtered.filter((a) => a.status !== "rejected").length}</span> candidate{filtered.filter((a) => a.status !== "rejected").length === 1 ? "" : "s"} matching the current filter. This cannot be undone in bulk.</>
                )}
              </DialogDescription>
            </DialogHeader>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={rejectConfirm.notify}
                onChange={(e) => setRejectConfirm((s) => ({ ...s, notify: e.target.checked }))}
              />
              Send polite rejection email to each candidate
            </label>
            <DialogFooter>
              <Button variant="outline" disabled={bulkReject.running} onClick={() => setRejectConfirm({ open: false, mode: "score", notify: true })}>Cancel</Button>
              <Button
                variant="destructive"
                disabled={
                  bulkReject.running ||
                  (rejectConfirm.mode === "score"
                    ? lowScoreRejectCount === 0
                    : filtered.filter((a) => a.status !== "rejected").length === 0)
                }
                onClick={() => runBulkReject(rejectConfirm.mode, rejectConfirm.notify)}
              >
                {bulkReject.running
                  ? `Rejecting ${bulkReject.done}/${bulkReject.total}…`
                  : `Reject ${rejectConfirm.mode === "score" ? lowScoreRejectCount : filtered.filter((a) => a.status !== "rejected").length}`}
              </Button>
            </DialogFooter>
          </DialogContent>

        </Dialog>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>ATS match</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Loading…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No applications match the current filters.</TableCell></TableRow>
                ) : filtered.map((a) => {
                  const b = atsBadge(a.ats_match_level, a.ats_score);
                  return (
                  <TableRow key={a.id} className="cursor-pointer hover:bg-muted/40" onClick={() => openDetail(a)}>
                    <TableCell>
                      <div className="font-medium">{a.full_name}</div>
                      <div className="text-xs text-muted-foreground">{a.email}</div>
                    </TableCell>
                    <TableCell className="text-sm">{a.career_title || "—"}</TableCell>
                    <TableCell><Badge className={b.className} variant="secondary">{b.label}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.country || "—"}</TableCell>
                    <TableCell><Badge className={statusColor(a.status) + " capitalize"} variant="secondary">{a.status}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {a.resume_url && <FileText className="w-4 h-4 text-primary" />}
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between gap-3">
                  <span>{selected.full_name}</span>
                  <Badge className={statusColor(selected.status) + " capitalize"} variant="secondary">{selected.status}</Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wider text-primary font-semibold">Applied for</p>
                  <p className="font-medium">{selected.career_title || "—"}</p>
                </div>

                {/* ATS panel */}
                {(() => {
                  const b = atsBadge(selected.ats_match_level, selected.ats_score);
                  return (
                    <div className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-primary" />
                          <span className="text-xs uppercase tracking-wider text-primary font-semibold">ATS scan</span>
                          <Badge className={b.className} variant="secondary">{b.label}</Badge>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => runScan(selected.id)} disabled={rescanning}>
                          <RefreshCw className={`w-3.5 h-3.5 mr-2 ${rescanning ? "animate-spin" : ""}`} />
                          {selected.ats_scanned_at ? "Rescan" : "Run scan"}
                        </Button>
                      </div>
                      {selected.ats_summary && (
                        <p className="text-xs text-muted-foreground">{selected.ats_summary}</p>
                      )}
                      {selected.ats_match_level === "low" && (
                        <div className="flex items-start gap-2 text-xs text-destructive">
                          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          <span>This candidate looks off-target for the posted role. Review carefully before shortlisting.</span>
                        </div>
                      )}
                      {(selected.ats_matched_keywords?.length || 0) > 0 && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Matched</p>
                          <div className="flex flex-wrap gap-1">
                            {selected.ats_matched_keywords!.slice(0, 20).map((k) => (
                              <Badge key={k} variant="secondary" className="bg-emerald-500/10 text-emerald-700 text-[10px]">{k}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {(selected.ats_missing_keywords?.length || 0) > 0 && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Missing</p>
                          <div className="flex flex-wrap gap-1">
                            {selected.ats_missing_keywords!.slice(0, 20).map((k) => (
                              <Badge key={k} variant="outline" className="text-[10px] text-muted-foreground">{k}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {selected.ats_scanned_at && (
                        <p className="text-[10px] text-muted-foreground">Scanned {new Date(selected.ats_scanned_at).toLocaleString()}</p>
                      )}
                    </div>
                  );
                })()}

                {/* AI-extracted insights */}
                {(selected.ats_recommendation ||
                  (selected.ats_highlights?.length || 0) > 0 ||
                  (selected.ats_red_flags?.length || 0) > 0 ||
                  (selected.ats_detected_skills?.length || 0) > 0 ||
                  (selected.ats_detected_titles?.length || 0) > 0 ||
                  selected.ats_education ||
                  selected.ats_detected_experience_years != null) && (
                  <div className="rounded-lg border border-border/60 bg-background p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span className="text-xs uppercase tracking-wider text-primary font-semibold">AI parsed profile</span>
                    </div>
                    {selected.ats_recommendation && (
                      <p className="text-sm text-foreground/90 italic">"{selected.ats_recommendation}"</p>
                    )}
                    {selected.ats_detected_experience_years != null && (
                      <p className="text-xs text-muted-foreground">
                        Detected experience: <span className="font-medium text-foreground">{selected.ats_detected_experience_years} years</span>
                        {selected.experience_years != null && Math.abs(Number(selected.ats_detected_experience_years) - Number(selected.experience_years)) >= 2 && (
                          <span className="ml-2 text-destructive">(applicant claimed {selected.experience_years}y)</span>
                        )}
                      </p>
                    )}
                    {selected.ats_education && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Education</p>
                        <p className="text-xs text-foreground/85">{selected.ats_education}</p>
                      </div>
                    )}
                    {(selected.ats_detected_titles?.length || 0) > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Past titles</p>
                        <div className="flex flex-wrap gap-1">
                          {selected.ats_detected_titles!.slice(0, 12).map((t) => (
                            <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {(selected.ats_detected_skills?.length || 0) > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Skills detected</p>
                        <div className="flex flex-wrap gap-1">
                          {selected.ats_detected_skills!.slice(0, 30).map((s) => (
                            <Badge key={s} variant="secondary" className="bg-primary/10 text-primary text-[10px]">{s}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {(selected.ats_highlights?.length || 0) > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-emerald-600 mb-1">Strengths</p>
                        <ul className="text-xs text-foreground/85 list-disc pl-4 space-y-1">
                          {selected.ats_highlights!.slice(0, 6).map((h, i) => <li key={i}>{h}</li>)}
                        </ul>
                      </div>
                    )}
                    {(selected.ats_red_flags?.length || 0) > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-destructive mb-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Red flags
                        </p>
                        <ul className="text-xs text-destructive/90 list-disc pl-4 space-y-1">
                          {selected.ats_red_flags!.slice(0, 6).map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                      </div>
                    )}
                    {selected.ats_contact_links && (
                      (selected.ats_contact_links.linkedin?.length ||
                       selected.ats_contact_links.github?.length ||
                       selected.ats_contact_links.portfolio?.length ||
                       selected.ats_contact_links.other?.length) ? (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Links found in resume</p>
                          <div className="flex flex-wrap gap-2 text-xs">
                            {[
                              ...(selected.ats_contact_links.linkedin || []),
                              ...(selected.ats_contact_links.github || []),
                              ...(selected.ats_contact_links.portfolio || []),
                              ...(selected.ats_contact_links.other || []),
                            ].slice(0, 12).map((u) => (
                              <a key={u} href={u} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline truncate max-w-[240px]">
                                <ExternalLink className="w-3 h-3 shrink-0" /> <span className="truncate">{u}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : null
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <a href={`mailto:${selected.email}`} className="flex items-center gap-2 hover:text-primary"><Mail className="w-4 h-4" /> {selected.email}</a>
                  {selected.phone && <a href={`tel:${selected.phone}`} className="flex items-center gap-2 hover:text-primary"><Phone className="w-4 h-4" /> {selected.phone}</a>}
                  {selected.country && <div className="flex items-center gap-2"><Globe className="w-4 h-4" /> {selected.country}</div>}
                  {selected.current_position && <div className="text-muted-foreground">Now: {selected.current_position}</div>}
                  {selected.experience_years != null && <div className="text-muted-foreground">{selected.experience_years} yrs experience</div>}
                  {selected.expected_salary && <SalaryDisplay raw={selected.expected_salary} />}
                  {selected.linkedin_url && <a href={selected.linkedin_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-primary"><Linkedin className="w-4 h-4" /> LinkedIn <ExternalLink className="w-3 h-3" /></a>}
                  {selected.portfolio_url && <a href={selected.portfolio_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-primary"><Globe className="w-4 h-4" /> Portfolio <ExternalLink className="w-3 h-3" /></a>}
                </div>

                {selected.resume_url && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-1">Resume</p>
                    {resumeUrl ? (
                      <div className="space-y-3">
                        {resumeMeta?.type.includes("pdf") && resumeUrl.startsWith("data:") && (
                          <iframe
                            title={`${selected.full_name} resume`}
                            src={resumeUrl}
                            className="h-[70vh] w-full rounded-lg border border-border bg-background"
                          />
                        )}
                        <div className="flex flex-wrap items-center gap-3">
                          <a href={resumeUrl} download={resumeMeta?.name || true} className="inline-flex items-center gap-2 text-primary hover:underline">
                            <Download className="w-4 h-4" /> Download resume
                          </a>
                          {!resumeUrl.startsWith("data:") && (
                            <a href={resumeUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline">
                              <ExternalLink className="w-4 h-4" /> Open direct link
                            </a>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Generating signed link…</p>
                    )}
                  </div>
                )}

                {selected.cover_letter && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-1">Cover letter</p>
                    <p className="whitespace-pre-wrap text-foreground/85 leading-relaxed">{selected.cover_letter}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-border/60">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Status</label>
                    <Select
                      value={selected.status}
                      onValueChange={(v) => {
                        if (v === selected.status) return;
                        setStatusChange({ newStatus: v, note: "" });
                      }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Applied on</label>
                    <p className="text-sm py-2">{new Date(selected.created_at).toLocaleString()}</p>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Internal notes</label>
                  <Textarea
                    rows={3}
                    defaultValue={selected.admin_notes || ""}
                    onBlur={(e) => {
                      const v = e.target.value;
                      if (v !== (selected.admin_notes || "")) {
                        updateMutation.mutate({ id: selected.id, admin_notes: v });
                      }
                    }}
                    placeholder="Notes visible to admins/HR only"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm("Delete this application? This cannot be undone.")) {
                        deleteMutation.mutate(selected.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Status change confirmation with optional note */}
      <Dialog open={!!statusChange} onOpenChange={(v) => !v && setStatusChange(null)}>
        <DialogContent className="max-w-md">
          {statusChange && selected && (
            <>
              <DialogHeader>
                <DialogTitle className="capitalize">Change status to "{statusChange.newStatus}"</DialogTitle>
                <DialogDescription>
                  An email will be sent to {selected.email}. Add an optional note to include in the email.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted-foreground">Note to candidate (optional)</label>
                  {(() => {
                    const presets = getStatusNotePresets(statusChange.newStatus, {
                      name: selected.full_name?.split(" ")[0] || selected.full_name || "there",
                      role: selected.career_title || "the role",
                    });
                    if (!presets.length) return null;
                    return (
                      <div className="flex flex-wrap gap-1 justify-end max-w-[60%]">
                        {presets.map((p) => (
                          <button
                            key={p.label}
                            type="button"
                            onClick={() => setStatusChange({ ...statusChange, note: p.text })}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-muted hover:bg-muted/70 border border-border text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                <Textarea
                  rows={6}
                  value={statusChange.note}
                  onChange={(e) => setStatusChange({ ...statusChange, note: e.target.value })}
                  placeholder="Pick a template above or write a personal note…"
                />
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setStatusChange(null)} disabled={updateMutation.isPending}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const { newStatus, note } = statusChange;
                    updateMutation.mutate(
                      { id: selected.id, status: newStatus, notifyStatus: true, emailNote: note },
                      {
                        onSuccess: () => {
                          setSelected((s) => (s ? { ...s, status: newStatus } : s));
                          setStatusChange(null);
                        },
                      }
                    );
                  }}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Sending…" : "Update & send email"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
};

export default AdminJobApplications;

import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import {
  Users, FileText, Printer, Mail, Trash2, Plus, Pencil, Send,
  Loader2, Briefcase, Banknote, ScrollText, ReceiptText, FileSignature,
  Check, ChevronsUpDown, RefreshCw, IdCard, UserCircle2, AlertTriangle, Download,
  FileUp, FileWarning, Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import HRDocumentPreview, { type HRDocKind } from "@/components/admin/hr/HRDocumentPreview";
import { computePayslip, numberToWords, type PayLine } from "@/lib/payslip-math";
import { printWithSignatureFonts } from "@/lib/print-with-fonts";
import { downloadHRDocumentPdf } from "@/lib/download-hr-pdf";
import type { TeamMember } from "@/lib/home-sections-defaults";
import { HOME_SECTIONS_KEY } from "@/hooks/use-home-sections";
import type { Database, Json } from "@/integrations/db/types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import TeamAvatarUploader from "@/components/admin/TeamAvatarUploader";
import { useIdCardBrand } from "@/hooks/use-id-card-brand";
import { DEFAULT_ID_CARD_BRAND } from "@/lib/id-card-brand";
import { generateIdCardPdf, type CardSubject } from "@/lib/id-card-pdf";

// Stable Section component — kept at module scope so it doesn't remount on every keystroke
// inside InlineEmployeeEditor (which would cause inputs to lose focus / scroll jump).
const Section = ({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) => (
  <details open={defaultOpen} className="group border border-border rounded-md bg-background/50 [&_summary::-webkit-details-marker]:hidden">
    <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium flex items-center justify-between hover:bg-muted/40 rounded-md">
      <span>{title}</span>
      <ChevronsUpDown className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-180" />
    </summary>
    <div className="px-3 pb-3 pt-1">{children}</div>
  </details>
);

// Designation combobox — synced with posted jobs in the `careers` table
// so adding a new job posting automatically makes that title available
// here. Free text still allowed for one-off internal roles.
const useCareerTitles = () => {
  const { data } = useQuery({
    queryKey: ["careers-titles-for-hr"],
    queryFn: async () => {
      const data = await apiGet<{ title: string; department: string | null }[]>('/hrm/careers');
      return data || [];
    },
    staleTime: 60_000,
  });
  return data || [];
};

const DesignationField = ({
  value,
  onChange,
  onDepartmentSuggest,
}: {
  value: string;
  onChange: (v: string) => void;
  onDepartmentSuggest?: (dept: string) => void;
}) => {
  const titles = useCareerTitles();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState(value || "");
  useEffect(() => { setTyped(value || ""); }, [value]);
  const exists = titles.some((t) => t.title.toLowerCase() === typed.toLowerCase());
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || "Select role from posted jobs…"}
          </span>
          <ChevronsUpDown className="w-4 h-4 opacity-50 shrink-0 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
        <Command shouldFilter>
          <CommandInput
            placeholder="Search or type a custom role…"
            value={typed}
            onValueChange={setTyped}
          />
          <CommandList>
            <CommandEmpty>
              {typed.trim() ? (
                <button
                  type="button"
                  className="w-full text-left text-xs px-2 py-1.5 hover:bg-muted rounded"
                  onClick={() => { onChange(typed.trim()); setOpen(false); }}
                >
                  Use custom role: <strong>{typed.trim()}</strong>
                </button>
              ) : "No roles found."}
            </CommandEmpty>
            <CommandGroup heading="Posted jobs">
              {titles.map((t) => (
                <CommandItem
                  key={t.title}
                  value={t.title}
                  onSelect={() => {
                    onChange(t.title);
                    if (t.department && onDepartmentSuggest) onDepartmentSuggest(t.department);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 w-4 h-4", value === t.title ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{t.title}</span>
                  {t.department && <span className="ml-auto text-xs text-muted-foreground">{t.department}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
            {typed.trim() && !exists && (
              <div className="border-t p-1">
                <button
                  type="button"
                  className="w-full text-left text-xs px-2 py-1.5 hover:bg-muted rounded"
                  onClick={() => { onChange(typed.trim()); setOpen(false); }}
                >
                  Use custom role: <strong>{typed.trim()}</strong>
                </button>
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const COLOR_PRESETS = [
  "from-blue-500/20 to-indigo-500/20",
  "from-violet-500/20 to-purple-500/20",
  "from-pink-500/20 to-rose-500/20",
  "from-amber-500/20 to-orange-500/20",
  "from-cyan-500/20 to-sky-500/20",
  "from-emerald-500/20 to-teal-500/20",
  "from-slate-500/20 to-gray-500/20",
  "from-rose-500/20 to-pink-500/20",
  "from-yellow-500/20 to-amber-500/20",
  "from-fuchsia-500/20 to-pink-500/20",
  "from-green-500/20 to-emerald-500/20",
  "from-indigo-500/20 to-blue-500/20",
];

type Employee = {
  id: string;
  full_name: string;
  employee_code: string | null;
  email: string | null;
  phone: string | null;
  designation: string | null;
  department: string | null;
  employment_type: string;
  job_type: string | null;
  work_location: string | null;
  joining_date: string | null;
  probation_end_date: string | null;
  status: string;
  last_working_day: string | null;
  reporting_to: string | null;
  currency: string;
  gross_salary: number;
  pay_cycle: string;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_routing: string | null;
  address: string | null;
  nid_passport: string | null;
  dob: string | null;
  photo_url: string | null;
  allowances: PayLine[];
  deductions: PayLine[];
  user_id: string | null;
  team_member_key: string | null;
  metadata: Record<string, unknown> | null;
};

type TeamUser = {
  user_id: string;
  email: string;
  full_name: string | null;
  role: string | null;
};

type TeamSourceEmployee = {
  user_id: string | null;
  team_member_key: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  designation: string | null;
  department: string | null;
  work_location: string | null;
  joining_date: string | null;
  status: string;
  source: string;
  metadata: Record<string, unknown>;
};

const EMPTY_TEAM_MEMBERS: TeamMember[] = [];
type EmployeeInsert = Database["public"]["Tables"]["employees"]["Insert"];
type EmployeeUpdate = Database["public"]["Tables"]["employees"]["Update"];

type HRDoc = {
  id: string;
  employee_id: string;
  kind: HRDocKind;
  doc_number: string | null;
  title: string | null;
  issue_date: string;
  effective_date: string | null;
  period_month: string | null;
  status: string;
  sent_to_email: string | null;
  sent_at: string | null;
  pdf_storage_path: string | null;
  snapshot: Record<string, unknown>;
  computed: Record<string, unknown>;
  created_at: string;
};

const KIND_META: Record<HRDocKind, { label: string; icon: any }> = {
  offer: { label: "Offer Letter", icon: FileSignature },
  agreement: { label: "Employment Agreement", icon: ScrollText },
  payslip: { label: "Payslip", icon: ReceiptText },
  experience: { label: "Experience Letter", icon: FileText },
  relieving: { label: "Relieving Letter", icon: FileText },
  promotion: { label: "Promotion Letter", icon: FileUp },
  termination: { label: "Termination Letter", icon: FileWarning },
};

const DEFAULT_AGREEMENT_CLAUSES = [
  { title: "Probation", body: "The Employee shall serve a probation period of 3 (three) months from the date of joining. Either party may terminate employment during this period with 7 (seven) days' written notice." },
  { title: "Working Hours", body: "Standard working hours are 9:00 AM to 6:00 PM, Sunday through Thursday, with a 1-hour lunch break. The Employee may be required to work additional hours as business needs demand." },
  { title: "Confidentiality", body: "The Employee shall maintain strict confidentiality regarding all proprietary information, client data, business strategies and any non-public information of the Company, both during and after the term of employment." },
  { title: "Intellectual Property", body: "All work product, inventions, software and creative works produced by the Employee during the course of employment shall be the exclusive property of the Company." },
  { title: "Non-compete & Non-solicitation", body: "For a period of 12 (twelve) months after termination, the Employee shall not directly or indirectly solicit any clients or employees of the Company, nor engage in any business that directly competes with the Company." },
  { title: "Notice Period", body: "After confirmation, either party may terminate this Agreement by giving 30 (thirty) days' written notice or payment in lieu thereof." },
  { title: "Termination for Cause", body: "The Company reserves the right to terminate this Agreement immediately and without notice in case of misconduct, fraud, breach of confidentiality, or violation of company policies." },
  { title: "Governing Law", body: "This Agreement shall be governed by and construed in accordance with the laws of England and Wales. Any dispute shall be subject to the exclusive jurisdiction of the courts of London, United Kingdom." },
];

const todayStr = () => new Date().toISOString().slice(0, 10);
const currentMonthStr = () => new Date().toISOString().slice(0, 7);

const normalizeEmail = (value?: string | null) => (value || "").trim().toLowerCase();
const normalizeRole = (role?: string | null) => role ? role.replace(/_/g, " ") : null;

const initials = (name: string) =>
  name.trim().split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";

const toHrStatus = (status?: string | null) => {
  if (status === "on_leave") return "on_leave";
  if (["resigned", "terminated", "suspended"].includes(status || "")) return "terminated";
  return "active";
};

// Roles that represent platform owners/super admins — they manage HR but are
// not themselves employees to be issued payslips / offer letters.
const EXCLUDED_TEAM_ROLES = new Set<string>([]);

const sourceRowsFromTeam = (teamUsers: TeamUser[], publicMembers: TeamMember[]): TeamSourceEmployee[] => {
  const accountRows = teamUsers
    .filter((u) => u.role && !EXCLUDED_TEAM_ROLES.has(String(u.role).toLowerCase()))
    .map((u) => ({
      user_id: u.user_id,
      team_member_key: null,
      full_name: u.full_name || u.email.split("@")[0] || "Team Member",
      email: u.email || null,
      phone: null,
      photo_url: null,
      designation: normalizeRole(u.role),
      department: null,
      work_location: null,
      joining_date: null,
      status: "active",
      source: "team_account",
      metadata: { synced_from: "team_account", role: u.role },
    }));
  const accountByName = new Map(accountRows.map((row) => [row.full_name.trim().toLowerCase(), row]));

  // Migrate ALL public team members (including paused / suspended) into the
  // HR employees table. The team section is being deprecated — every member
  // must live in HR. Paused / hidden status is preserved via metadata.paused.
  const sectionRows = publicMembers
    .filter((m) => m.name?.trim())
    .map((m) => {
      const matchedAccount = accountByName.get(m.name.trim().toLowerCase());
      return ({
      user_id: matchedAccount?.user_id || null,
      team_member_key: m.employeeKey || null,
      full_name: m.name.trim(),
      email: m.email || matchedAccount?.email || null,
      phone: m.phone || null,
      photo_url: m.photoUrl || null,
      designation: m.role || null,
      department: m.specialty || null,
      work_location: m.country || null,
      joining_date: m.joinedAt || null,
      status: toHrStatus(m.status),
      source: "team_section",
      metadata: {
        synced_from: "team_section",
        employee_key: m.employeeKey || null,
        specialty: m.specialty || null,
        initials: m.initials || initials(m.name),
        bio: m.bio || null,
        country: m.country || null,
        public_status: m.status || "active",
        paused: Boolean(m.paused),
      },
    });
    });

  const sectionEmails = new Set(sectionRows.map(r => normalizeEmail(r.email)).filter(Boolean));
  const sectionUserIds = new Set(sectionRows.map(r => r.user_id).filter(Boolean));

  const unmatchedAccountRows = accountRows.filter(r => 
    !sectionUserIds.has(r.user_id) && 
    (!r.email || !sectionEmails.has(normalizeEmail(r.email)))
  );

  const byIdentity = new Map<string, TeamSourceEmployee>();
  [...sectionRows, ...unmatchedAccountRows].forEach((row) => {
    const key = syncKeyFor(row);
    const prev = byIdentity.get(key);
    byIdentity.set(key, prev ? {
      ...prev,
      user_id: row.user_id || prev.user_id,
      email: row.email || prev.email,
      full_name: prev.source === "team_section" ? prev.full_name : row.full_name,
      designation: prev.source === "team_section" ? prev.designation : row.designation,
      department: prev.department || row.department,
      phone: prev.phone || row.phone,
      photo_url: prev.photo_url || row.photo_url,
      work_location: prev.work_location || row.work_location,
      joining_date: prev.joining_date || row.joining_date,
      status: prev.status === "active" ? row.status : prev.status,
      source: prev.source === "team_section" ? "team_section" : row.source,
      metadata: { ...prev.metadata, ...row.metadata },
    } : row);
  });
  return [...byIdentity.values()];
};

const valuesEqual = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const syncKeyFor = (row: { email?: string | null; user_id?: string | null; team_member_key?: string | null; full_name?: string | null }) => {
  if (row.team_member_key) return `team:${row.team_member_key}`;
  const email = normalizeEmail(row.email);
  return email || (row.user_id ? `user:${row.user_id}` : `name:${(row.full_name || "").toLowerCase()}`);
};

// ----------------------------------------------------------------
// PUBLIC TEAM WRITE-BACK
// The HR Employee dialog is the single source of truth. After saving an
// employee row we mirror the public-facing fields (name, role, photo, bio,
// socials, paused/status, etc.) onto site_settings.home_sections.team.items
// so the About page reflects the change immediately.
// ----------------------------------------------------------------
const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const memberMatchesEmployee = (m: TeamMember, emp: Partial<Employee>): boolean => {
  if (emp.team_member_key && m.employeeKey) {
    return m.employeeKey === emp.team_member_key;
  }
  if (emp.team_member_key || m.employeeKey) {
    return false;
  }
  const e1 = (m.email || "").trim().toLowerCase();
  const e2 = (emp.email || "").trim().toLowerCase();
  if (e1 && e2 && e1 === e2) return true;
  return (m.name || "").trim().toLowerCase() === (emp.full_name || "").trim().toLowerCase();
};

const fromHrStatusToPublic = (s?: string | null): TeamMember["status"] => {
  if (s === "on_leave") return "on_leave";
  if (s === "resigned") return "resigned";
  if (s === "terminated") return "terminated";
  if (s === "suspended") return "suspended";
  return "active";
};

const buildMemberFromEmployee = (emp: Partial<Employee>, prev?: TeamMember): TeamMember => {
  const meta = (emp.metadata || {}) as Record<string, unknown>;
  const get = (k: string) => (meta[k] as string | undefined) || undefined;
  return {
    ...(prev || {}),
    name: emp.full_name || prev?.name || "",
    role: emp.designation || prev?.role || "",
    initials: get("initials") || prev?.initials || initials(emp.full_name || ""),
    specialty: emp.department || prev?.specialty || "",
    color: get("color") || prev?.color || "from-primary/30 to-primary/10",
    employeeKey: emp.team_member_key || prev?.employeeKey || `cms-${slugify(emp.full_name || "member")}`,
    photoUrl: emp.photo_url || prev?.photoUrl,
    email: emp.email || prev?.email,
    phone: emp.phone || prev?.phone,
    country: emp.work_location || prev?.country,
    joinedAt: emp.joining_date || prev?.joinedAt,
    expiresAt: get("expires_at") || prev?.expiresAt,
    bio: get("bio") || prev?.bio,
    linkedinUrl: get("linkedin_url") || prev?.linkedinUrl,
    twitterUrl: get("twitter_url") || prev?.twitterUrl,
    githubUrl: get("github_url") || prev?.githubUrl,
    status: fromHrStatusToPublic(emp.status),
    statusNote: get("status_note") || prev?.statusNote,
    statusChangedAt: (meta.status_changed_at as string | undefined) || prev?.statusChangedAt,
    paused: meta.paused === true ? true : meta.paused === false ? false : prev?.paused,
  };
};

const writePublicTeamFromEmployee = async (emp: Partial<Employee>, options: { showOnPublic: boolean }) => {
  // 1. Read current home_sections.
  const result = await apiGet<{ value: any } | null>(`/hrm/site-settings?key=${HOME_SECTIONS_KEY}`);
  let raw: unknown = result?.value ?? null;
  while (typeof raw === "string") {
    try { raw = JSON.parse(raw); } catch { break; }
  }
  const sections = (raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}) as {
    team?: { items?: TeamMember[]; enabled?: boolean; [k: string]: unknown };
    [k: string]: unknown;
  };
  const team = sections.team || { enabled: true, items: [] };
  const items: TeamMember[] = Array.isArray(team.items) ? [...team.items] : [];

  // 2. Find matching member.
  const idx = items.findIndex((m) => memberMatchesEmployee(m, emp));

  if (!options.showOnPublic) {
    // Hide from public — drop the entry if it exists. We keep the employee row.
    if (idx === -1) return;
    items.splice(idx, 1);
  } else if (idx === -1) {
    items.push(buildMemberFromEmployee(emp));
  } else {
    items[idx] = buildMemberFromEmployee(emp, items[idx]);
  }

  const next = { ...sections, team: { ...team, items } };
  await apiPost('/hrm/site-settings', { key: HOME_SECTIONS_KEY, value: JSON.stringify(next) });
};

const EmployeeDialog = ({
  open, onOpenChange, initial, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: Partial<Employee> | null;
  onSaved: () => void;
}) => {
  const makeInitial = (src: Partial<Employee> | null): Partial<Employee> =>
    src || { employment_type: "full-time", status: "active", currency: "USD", pay_cycle: "monthly", gross_salary: 0, allowances: [], deductions: [], metadata: {} };
  const [f, setF] = useState<Partial<Employee>>(() => makeInitial(initial));
  const [showOnPublic, setShowOnPublic] = useState<boolean>(() => {
    const meta = (initial?.metadata || {}) as Record<string, unknown>;
    // Default: show on public if we already have any public-profile data, or
    // if this is a brand-new employee being added through HR.
    if (meta.paused === true) return false;
    if (initial?.team_member_key) return true;
    return !initial?.id;
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setF(makeInitial(initial));
      const meta = (initial?.metadata || {}) as Record<string, unknown>;
      setShowOnPublic(meta.paused === true ? false : Boolean(initial?.team_member_key) || !initial?.id);
    }
  }, [open, initial]);

  const set = <K extends keyof Employee>(k: K, v: Employee[K]) => setF((p) => ({ ...p, [k]: v }));
  const setMeta = (k: string, v: unknown) =>
    setF((p) => ({ ...p, metadata: { ...((p.metadata || {}) as Record<string, unknown>), [k]: v } }));
  const meta = (f.metadata || {}) as Record<string, unknown>;
  const metaStr = (k: string) => (meta[k] as string | undefined) ?? "";
  const addLine = (key: "allowances" | "deductions") =>
    setF((p) => ({ ...p, [key]: [...((p[key] as PayLine[]) || []), { label: "", type: "fixed", value: 0 }] }));
  const setLine = (key: "allowances" | "deductions", i: number, patch: Partial<PayLine>) =>
    setF((p) => ({ ...p, [key]: ((p[key] as PayLine[]) || []).map((l, idx) => idx === i ? { ...l, ...patch } : l) }));
  const removeLine = (key: "allowances" | "deductions", i: number) =>
    setF((p) => ({ ...p, [key]: ((p[key] as PayLine[]) || []).filter((_, idx) => idx !== i) }));

  const save = async () => {
    if (!f.full_name?.trim()) { toast.error("Full name is required"); return; }
    setBusy(true);
    try {
      // Compose metadata: existing meta + public-profile fields + paused flag.
      const prevMeta = (f.metadata || {}) as Record<string, unknown>;
      const statusChanged = initial?.status && initial.status !== f.status;
      const composedMeta: Record<string, unknown> = {
        ...prevMeta,
        synced_from: prevMeta.synced_from || "hr_dialog",
        paused: !showOnPublic,
        public_status: f.status || "active",
        ...(statusChanged ? { status_changed_at: new Date().toISOString() } : {}),
      };
      // Ensure a stable team_member_key when the employee is shown publicly so
      // future writebacks find the same item.
      let teamMemberKey = f.team_member_key || null;
      if (showOnPublic && !teamMemberKey) {
        teamMemberKey = `cms-${slugify(f.full_name.trim())}-${Date.now().toString(36)}`;
      }

      const payload = {
        full_name: f.full_name.trim(),
        employee_code: f.employee_code || null,
        email: f.email || null,
        phone: f.phone || null,
        designation: f.designation || null,
        department: f.department || null,
        employment_type: f.employment_type || "full-time",
        job_type: f.job_type || null,
        work_location: f.work_location || null,
        joining_date: f.joining_date || null,
        probation_end_date: f.probation_end_date || null,
        status: f.status || "active",
        last_working_day: f.last_working_day || null,
        reporting_to: f.reporting_to || null,
        currency: f.currency || "USD",
        gross_salary: Number(f.gross_salary) || 0,
        pay_cycle: f.pay_cycle || "monthly",
        bank_name: f.bank_name || null,
        bank_account_name: f.bank_account_name || null,
        bank_account_number: f.bank_account_number || null,
        bank_routing: f.bank_routing || null,
        address: f.address || null,
        nid_passport: f.nid_passport || null,
        dob: f.dob || null,
        photo_url: f.photo_url || null,
        team_member_key: teamMemberKey,
        metadata: composedMeta as Json,
        allowances: f.allowances || [],
        deductions: f.deductions || [],
      };
      const savedRow = initial?.id
        ? await apiPatch(`/hrm/employees/${initial.id}`, payload as any)
        : await apiPost('/hrm/employees', payload as any);

      // Mirror the public-facing fields onto site_settings.home_sections.team
      // so the About page updates instantly — no second screen needed.
      try {
        const fullEmp: Partial<Employee> = {
          ...f,
          ...payload,
          id: initial?.id || (savedRow as any)?.id,
        } as Partial<Employee>;
        await writePublicTeamFromEmployee(fullEmp, { showOnPublic });
      } catch (mirrorErr) {
        console.warn("Public team writeback failed", mirrorErr);
      }

      toast.success(initial?.id ? "Employee updated — public team synced" : "Employee added — public team synced");
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally { setBusy(false); }
  };

  const lineRows = (key: "allowances" | "deductions") => {
    const arr = (f[key] as PayLine[]) || [];
    return (
      <div className="space-y-2">
        {arr.map((l, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input className="flex-1" placeholder="Label" value={l.label} onChange={(e) => setLine(key, i, { label: e.target.value })} />
            <Select value={l.type} onValueChange={(v) => setLine(key, i, { type: v as "fixed" | "percent" })}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fixed</SelectItem>
                <SelectItem value="percent">% of basic</SelectItem>
              </SelectContent>
            </Select>
            <Input className="w-28" type="number" step="0.01" value={l.value} onChange={(e) => setLine(key, i, { value: Number(e.target.value) })} />
            <Button variant="ghost" size="icon" onClick={() => removeLine(key, i)}><Trash2 className="w-4 h-4" /></Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => addLine(key)}><Plus className="w-3 h-3 mr-1" /> Add line</Button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial?.id ? "Edit Employee" : "Add Employee"}</DialogTitle></DialogHeader>

        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>Full name *</Label><Input value={f.full_name || ""} onChange={(e) => set("full_name", e.target.value)} /></div>
            <div><Label>Employee code</Label><Input value={f.employee_code || ""} onChange={(e) => set("employee_code", e.target.value)} placeholder="EMP-001" /></div>
            <div><Label>Email</Label><Input type="email" value={f.email || ""} onChange={(e) => set("email", e.target.value)} /></div>
            <div><Label>Phone</Label><Input value={f.phone || ""} onChange={(e) => set("phone", e.target.value)} /></div>
            <div><Label>Designation</Label><DesignationField value={f.designation || ""} onChange={(v) => set("designation", v)} onDepartmentSuggest={(d) => { if (!f.department) set("department", d); }} /></div>
            <div><Label>Department</Label><Input value={f.department || ""} onChange={(e) => set("department", e.target.value)} /></div>
            <div>
              <Label>Employment type</Label>
              <Select value={f.employment_type || "full-time"} onValueChange={(v) => set("employment_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full-time">Full-time</SelectItem>
                  <SelectItem value="part-time">Part-time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="intern">Intern</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Job type</Label>
              <Select value={f.job_type || "unspecified"} onValueChange={(v) => set("job_type", v === "unspecified" ? null : v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unspecified">— Not set —</SelectItem>
                  <SelectItem value="On-site">On-site</SelectItem>
                  <SelectItem value="Remote">Remote</SelectItem>
                  <SelectItem value="Hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Work location</Label><Input value={f.work_location || ""} onChange={(e) => set("work_location", e.target.value)} /></div>
            <div><Label>Joining date</Label><Input type="date" value={f.joining_date || ""} onChange={(e) => set("joining_date", e.target.value)} /></div>
            <div><Label>Probation end</Label><Input type="date" value={f.probation_end_date || ""} onChange={(e) => set("probation_end_date", e.target.value)} /></div>
            <div><Label>Reporting to</Label><Input value={f.reporting_to || ""} onChange={(e) => set("reporting_to", e.target.value)} /></div>
            <div>
              <Label>Status</Label>
              <Select value={f.status || "active"} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_leave">On leave</SelectItem>
                  <SelectItem value="resigned">Resigned</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Last working day</Label><Input type="date" value={f.last_working_day || ""} onChange={(e) => set("last_working_day", e.target.value)} /></div>
          </div>

          {/* Public profile — mirrors directly to the About-page team carousel */}
          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold flex items-center gap-1.5">
                <UserCircle2 className="w-4 h-4" /> Public profile (About page)
              </div>
              <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={showOnPublic}
                  onChange={(e) => setShowOnPublic(e.target.checked)}
                />
                Show on public team section
              </label>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              These fields populate the team carousel on the homepage and About page in realtime.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><Label>Profile photo</Label><TeamAvatarUploader value={f.photo_url || ""} onChange={(url) => set("photo_url", url)} /></div>
              <div><Label>Initials (fallback avatar)</Label><Input value={metaStr("initials")} onChange={(e) => setMeta("initials", e.target.value.toUpperCase())} placeholder="JK" maxLength={3} /></div>
              <div>
                <Label>Color theme</Label>
                <Select value={metaStr("color") || COLOR_PRESETS[0]} onValueChange={(v) => setMeta("color", v)}>
                  <SelectTrigger>
                    <SelectValue>
                      <span className="flex items-center gap-2">
                        <span className={`inline-block w-4 h-4 rounded bg-gradient-to-br ${metaStr("color") || COLOR_PRESETS[0]}`} />
                        <span className="text-xs">{(metaStr("color") || COLOR_PRESETS[0]).replace(/from-|to-|\/20/g, "")}</span>
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_PRESETS.map((c) => (
                      <SelectItem key={c} value={c}>
                        <span className="flex items-center gap-2">
                          <span className={`inline-block w-4 h-4 rounded bg-gradient-to-br ${c}`} />
                          <span className="text-xs">{c.replace(/from-|to-|\/20/g, "")}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Country</Label><Input value={f.work_location || ""} onChange={(e) => set("work_location", e.target.value)} placeholder="Bangladesh" /></div>
              <div><Label>Public status note</Label><Input value={metaStr("status_note")} onChange={(e) => setMeta("status_note", e.target.value)} placeholder="On parental leave until Aug" /></div>
              <div className="sm:col-span-2"><Label>Bio</Label><Textarea rows={2} value={metaStr("bio")} onChange={(e) => setMeta("bio", e.target.value)} placeholder="Short public bio shown on the About page" /></div>
              <div><Label>LinkedIn URL</Label><Input value={metaStr("linkedin_url")} onChange={(e) => setMeta("linkedin_url", e.target.value)} placeholder="https://linkedin.com/in/…" /></div>
              <div><Label>Twitter / X URL</Label><Input value={metaStr("twitter_url")} onChange={(e) => setMeta("twitter_url", e.target.value)} placeholder="https://twitter.com/…" /></div>
              <div><Label>GitHub URL</Label><Input value={metaStr("github_url")} onChange={(e) => setMeta("github_url", e.target.value)} placeholder="https://github.com/…" /></div>
              <div><Label>Contract expires</Label><Input type="date" value={metaStr("expires_at")} onChange={(e) => setMeta("expires_at", e.target.value)} /></div>
            </div>
          </div>

          <div className="border-t pt-3">

            <div className="grid sm:grid-cols-3 gap-3">
              <div><Label>Currency</Label><Input value={f.currency || "USD"} onChange={(e) => set("currency", e.target.value.toUpperCase())} /></div>
              <div><Label>Gross salary / month</Label><Input type="number" step="0.01" value={f.gross_salary ?? 0} onChange={(e) => set("gross_salary", Number(e.target.value))} /></div>
              <div>
                <Label>Pay cycle</Label>
                <Select value={f.pay_cycle || "monthly"} onValueChange={(v) => set("pay_cycle", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="border-t pt-3">
            <div className="text-sm font-semibold mb-2">Allowances</div>
            {lineRows("allowances")}
          </div>
          <div className="border-t pt-3">
            <div className="text-sm font-semibold mb-2">Deductions</div>
            {lineRows("deductions")}
          </div>

          <div className="border-t pt-3 grid sm:grid-cols-2 gap-3">
            <div><Label>Bank name</Label><Input value={f.bank_name || ""} onChange={(e) => set("bank_name", e.target.value)} /></div>
            <div><Label>Account name</Label><Input value={f.bank_account_name || ""} onChange={(e) => set("bank_account_name", e.target.value)} /></div>
            <div><Label>Account number</Label><Input value={f.bank_account_number || ""} onChange={(e) => set("bank_account_number", e.target.value)} /></div>
            <div><Label>Routing / SWIFT</Label><Input value={f.bank_routing || ""} onChange={(e) => set("bank_routing", e.target.value)} /></div>
          </div>

          <div><Label>Address</Label><Textarea rows={2} value={f.address || ""} onChange={(e) => set("address", e.target.value)} /></div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={busy}>{busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============================================================
//  Inline Employee Editor — same fields as the dialog, but
//  rendered in-page under the selected row. All sections are
//  collapsed by default; the user expands the ones they need.
// ============================================================
const InlineEmployeeEditor = ({
  initial, onSaved, onCancel,
}: {
  initial: Partial<Employee> | null;
  onSaved: () => void;
  onCancel: () => void;
}) => {
  const makeInitial = (src: Partial<Employee> | null): Partial<Employee> =>
    src || { employment_type: "full-time", status: "active", currency: "USD", pay_cycle: "monthly", gross_salary: 0, allowances: [], deductions: [], metadata: {} };
  const [f, setF] = useState<Partial<Employee>>(() => makeInitial(initial));
  const initialShowOnPublic = (() => {
    const meta = (initial?.metadata || {}) as Record<string, unknown>;
    if (meta.paused === true) return false;
    if (initial?.team_member_key) return true;
    return !initial?.id;
  })();
  const [showOnPublic, setShowOnPublic] = useState<boolean>(initialShowOnPublic);
  const [busy, setBusy] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const baseline = React.useRef<string>(JSON.stringify({ f: makeInitial(initial), showOnPublic: initialShowOnPublic }));

  useEffect(() => {
    const fresh = makeInitial(initial);
    const meta = (initial?.metadata || {}) as Record<string, unknown>;
    const sop = meta.paused === true ? false : Boolean(initial?.team_member_key) || !initial?.id;
    setF(fresh);
    setShowOnPublic(sop);
    baseline.current = JSON.stringify({ f: fresh, showOnPublic: sop });
  }, [initial?.id]);

  const isDirty = () => JSON.stringify({ f, showOnPublic }) !== baseline.current;
  const handleCancel = () => {
    if (isDirty()) setConfirmDiscard(true);
    else onCancel();
  };

  const set = <K extends keyof Employee>(k: K, v: Employee[K]) => setF((p) => ({ ...p, [k]: v }));
  const setMeta = (k: string, v: unknown) =>
    setF((p) => ({ ...p, metadata: { ...((p.metadata || {}) as Record<string, unknown>), [k]: v } }));
  const meta = (f.metadata || {}) as Record<string, unknown>;
  const metaStr = (k: string) => (meta[k] as string | undefined) ?? "";
  const addLine = (key: "allowances" | "deductions") =>
    setF((p) => ({ ...p, [key]: [...((p[key] as PayLine[]) || []), { label: "", type: "fixed", value: 0 }] }));
  const setLine = (key: "allowances" | "deductions", i: number, patch: Partial<PayLine>) =>
    setF((p) => ({ ...p, [key]: ((p[key] as PayLine[]) || []).map((l, idx) => idx === i ? { ...l, ...patch } : l) }));
  const removeLine = (key: "allowances" | "deductions", i: number) =>
    setF((p) => ({ ...p, [key]: ((p[key] as PayLine[]) || []).filter((_, idx) => idx !== i) }));

  const save = async () => {
    if (!f.full_name?.trim()) { toast.error("Full name is required"); return; }
    setBusy(true);
    try {
      const prevMeta = (f.metadata || {}) as Record<string, unknown>;
      const statusChanged = initial?.status && initial.status !== f.status;
      const composedMeta: Record<string, unknown> = {
        ...prevMeta,
        synced_from: prevMeta.synced_from || "hr_inline",
        paused: !showOnPublic,
        public_status: f.status || "active",
        ...(statusChanged ? { status_changed_at: new Date().toISOString() } : {}),
      };
      let teamMemberKey = f.team_member_key || null;
      if (showOnPublic && !teamMemberKey) {
        teamMemberKey = `cms-${slugify(f.full_name.trim())}-${Date.now().toString(36)}`;
      }
      const payload = {
        full_name: f.full_name.trim(),
        employee_code: f.employee_code || null,
        email: f.email || null,
        phone: f.phone || null,
        designation: f.designation || null,
        department: f.department || null,
        employment_type: f.employment_type || "full-time",
        job_type: f.job_type || null,
        work_location: f.work_location || null,
        joining_date: f.joining_date || null,
        probation_end_date: f.probation_end_date || null,
        status: f.status || "active",
        last_working_day: f.last_working_day || null,
        reporting_to: f.reporting_to || null,
        currency: f.currency || "USD",
        gross_salary: Number(f.gross_salary) || 0,
        pay_cycle: f.pay_cycle || "monthly",
        bank_name: f.bank_name || null,
        bank_account_name: f.bank_account_name || null,
        bank_account_number: f.bank_account_number || null,
        bank_routing: f.bank_routing || null,
        address: f.address || null,
        nid_passport: f.nid_passport || null,
        dob: f.dob || null,
        photo_url: f.photo_url || null,
        team_member_key: teamMemberKey,
        metadata: composedMeta as Json,
        allowances: f.allowances || [],
        deductions: f.deductions || [],
      };
      const savedRow = initial?.id
        ? await apiPatch(`/hrm/employees/${initial.id}`, payload as any)
        : await apiPost('/hrm/employees', payload as any);
      try {
        const fullEmp: Partial<Employee> = { ...f, ...payload, id: initial?.id || (savedRow as any)?.id } as Partial<Employee>;
        await writePublicTeamFromEmployee(fullEmp, { showOnPublic });
      } catch (mirrorErr) { console.warn("Public team writeback failed", mirrorErr); }
      toast.success(initial?.id ? "Employee updated — public team synced" : "Employee added — public team synced");
      onSaved();
      onCancel();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally { setBusy(false); }
  };

  const lineRows = (key: "allowances" | "deductions") => {
    const arr = (f[key] as PayLine[]) || [];
    return (
      <div className="space-y-2">
        {arr.map((l, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input className="flex-1" placeholder="Label" value={l.label} onChange={(e) => setLine(key, i, { label: e.target.value })} />
            <Select value={l.type} onValueChange={(v) => setLine(key, i, { type: v as "fixed" | "percent" })}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fixed</SelectItem>
                <SelectItem value="percent">% of basic</SelectItem>
              </SelectContent>
            </Select>
            <Input className="w-28" type="number" step="0.01" value={l.value} onChange={(e) => setLine(key, i, { value: Number(e.target.value) })} />
            <Button variant="ghost" size="icon" onClick={() => removeLine(key, i)}><Trash2 className="w-4 h-4" /></Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => addLine(key)}><Plus className="w-3 h-3 mr-1" /> Add line</Button>
      </div>
    );
  };

  // Section is defined at module scope (below) so its identity is stable across renders
  // — declaring it inside this component caused inputs to lose focus / scroll jump on every keystroke.

  return (
    <div className="border border-primary/40 rounded-lg p-3 bg-muted/20 space-y-2">
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="text-sm font-semibold">
          {initial?.id ? `Editing: ${initial.full_name}` : "New Employee"}
          <span className="ml-2 text-xs text-muted-foreground font-normal">Click a section header to collapse</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleCancel} disabled={busy}>Cancel</Button>
          <Button size="sm" onClick={save} disabled={busy}>
            {busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Save
          </Button>
        </div>
      </div>

      {/* Always-visible essentials so the row stays useful even when sections are collapsed. */}
      <div className="grid sm:grid-cols-2 gap-3 px-1 pb-1">
        <div><Label>Full name *</Label><Input value={f.full_name || ""} onChange={(e) => set("full_name", e.target.value)} /></div>
        <div><Label>Employee code</Label><Input value={f.employee_code || ""} onChange={(e) => set("employee_code", e.target.value)} placeholder="DTLE001021" /></div>
      </div>

      <Section title="Basic info & employment">
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label>Email</Label><Input type="email" value={f.email || ""} onChange={(e) => set("email", e.target.value)} /></div>
          <div><Label>Phone</Label><Input value={f.phone || ""} onChange={(e) => set("phone", e.target.value)} /></div>
          <div><Label>Designation</Label><DesignationField value={f.designation || ""} onChange={(v) => set("designation", v)} onDepartmentSuggest={(d) => { if (!f.department) set("department", d); }} /></div>
          <div><Label>Department</Label><Input value={f.department || ""} onChange={(e) => set("department", e.target.value)} /></div>
          <div>
            <Label>Employment type</Label>
            <Select value={f.employment_type || "full-time"} onValueChange={(v) => set("employment_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="full-time">Full-time</SelectItem>
                <SelectItem value="part-time">Part-time</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="intern">Intern</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Job type</Label>
            <Select value={f.job_type || "unspecified"} onValueChange={(v) => set("job_type", v === "unspecified" ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unspecified">— Not set —</SelectItem>
                <SelectItem value="On-site">On-site</SelectItem>
                <SelectItem value="Remote">Remote</SelectItem>
                <SelectItem value="Hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Work location</Label><Input value={f.work_location || ""} onChange={(e) => set("work_location", e.target.value)} /></div>
          <div><Label>Joining date</Label><Input type="date" value={f.joining_date || ""} onChange={(e) => set("joining_date", e.target.value)} /></div>
          <div><Label>Probation end</Label><Input type="date" value={f.probation_end_date || ""} onChange={(e) => set("probation_end_date", e.target.value)} /></div>
          <div><Label>Reporting to</Label><Input value={f.reporting_to || ""} onChange={(e) => set("reporting_to", e.target.value)} /></div>
          <div>
            <Label>Status</Label>
            <Select value={f.status || "active"} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_leave">On leave</SelectItem>
                <SelectItem value="resigned">Resigned</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Last working day</Label><Input type="date" value={f.last_working_day || ""} onChange={(e) => set("last_working_day", e.target.value)} /></div>
          <div><Label>NID / Passport</Label><Input value={f.nid_passport || ""} onChange={(e) => set("nid_passport", e.target.value)} /></div>
          <div><Label>Date of birth</Label><Input type="date" value={f.dob || ""} onChange={(e) => set("dob", e.target.value)} /></div>
        </div>
      </Section>

      <Section title="Public profile (About page)">
        <div className="flex items-center justify-end mb-2">
          <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
            <input type="checkbox" className="h-4 w-4 accent-primary" checked={showOnPublic} onChange={(e) => setShowOnPublic(e.target.checked)} />
            Show on public team section
          </label>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2"><Label>Profile photo</Label><TeamAvatarUploader value={f.photo_url || ""} onChange={(url) => set("photo_url", url)} /></div>
          <div><Label>Initials (fallback avatar)</Label><Input value={metaStr("initials")} onChange={(e) => setMeta("initials", e.target.value.toUpperCase())} placeholder="JK" maxLength={3} /></div>
          <div>
            <Label>Color theme</Label>
            <Select value={metaStr("color") || COLOR_PRESETS[0]} onValueChange={(v) => setMeta("color", v)}>
              <SelectTrigger>
                <SelectValue>
                  <span className="flex items-center gap-2">
                    <span className={`inline-block w-4 h-4 rounded bg-gradient-to-br ${metaStr("color") || COLOR_PRESETS[0]}`} />
                    <span className="text-xs">{(metaStr("color") || COLOR_PRESETS[0]).replace(/from-|to-|\/20/g, "")}</span>
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {COLOR_PRESETS.map((c) => (
                  <SelectItem key={c} value={c}>
                    <span className="flex items-center gap-2">
                      <span className={`inline-block w-4 h-4 rounded bg-gradient-to-br ${c}`} />
                      <span className="text-xs">{c.replace(/from-|to-|\/20/g, "")}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Country</Label><Input value={f.work_location || ""} onChange={(e) => set("work_location", e.target.value)} placeholder="Bangladesh" /></div>
          <div><Label>Public status note</Label><Input value={metaStr("status_note")} onChange={(e) => setMeta("status_note", e.target.value)} placeholder="On parental leave until Aug" /></div>
          <div className="sm:col-span-2"><Label>Bio</Label><Textarea rows={2} value={metaStr("bio")} onChange={(e) => setMeta("bio", e.target.value)} placeholder="Short public bio shown on the About page" /></div>
          <div><Label>LinkedIn URL</Label><Input value={metaStr("linkedin_url")} onChange={(e) => setMeta("linkedin_url", e.target.value)} placeholder="https://linkedin.com/in/…" /></div>
          <div><Label>Twitter / X URL</Label><Input value={metaStr("twitter_url")} onChange={(e) => setMeta("twitter_url", e.target.value)} placeholder="https://twitter.com/…" /></div>
          <div><Label>GitHub URL</Label><Input value={metaStr("github_url")} onChange={(e) => setMeta("github_url", e.target.value)} placeholder="https://github.com/…" /></div>
          <div><Label>Contract expires</Label><Input type="date" value={metaStr("expires_at")} onChange={(e) => setMeta("expires_at", e.target.value)} /></div>
        </div>
      </Section>

      <Section title="Salary & pay cycle">
        <div className="grid sm:grid-cols-3 gap-3">
          <div><Label>Currency</Label><Input value={f.currency || "USD"} onChange={(e) => set("currency", e.target.value.toUpperCase())} /></div>
          <div><Label>Gross salary / month</Label><Input type="number" step="0.01" value={f.gross_salary ?? 0} onChange={(e) => set("gross_salary", Number(e.target.value))} /></div>
          <div>
            <Label>Pay cycle</Label>
            <Select value={f.pay_cycle || "monthly"} onValueChange={(v) => set("pay_cycle", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Section>

      <Section title="Allowances">{lineRows("allowances")}</Section>
      <Section title="Deductions">{lineRows("deductions")}</Section>

      <Section title="Bank details">
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label>Bank name</Label><Input value={f.bank_name || ""} onChange={(e) => set("bank_name", e.target.value)} /></div>
          <div><Label>Account name</Label><Input value={f.bank_account_name || ""} onChange={(e) => set("bank_account_name", e.target.value)} /></div>
          <div><Label>Account number</Label><Input value={f.bank_account_number || ""} onChange={(e) => set("bank_account_number", e.target.value)} /></div>
          <div><Label>Routing / SWIFT</Label><Input value={f.bank_routing || ""} onChange={(e) => set("bank_routing", e.target.value)} /></div>
        </div>
      </Section>

      <Section title="Address">
        <Textarea rows={2} value={f.address || ""} onChange={(e) => set("address", e.target.value)} />
      </Section>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={handleCancel} disabled={busy}>Cancel</Button>
        <Button size="sm" onClick={save} disabled={busy}>
          {busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Save changes
        </Button>
      </div>

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved edits to this employee. If you leave now, your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmDiscard(false); onCancel(); }}>
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
// ============================================================
//  Employees tab
// ============================================================
const EmployeesTab = ({ employees, refetch }: { employees: Employee[]; refetch: () => void }) => {
  // editingId === "new"  → inline editor for a new employee at the top
  // editingId === uuid   → inline editor expanded under that row
  // editingId === null   → no editor open
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showIssues, setShowIssues] = useState(false);

  const issues = useMemo(() => employees.filter((e) => {
    if (!e.employee_code?.trim()) return true;
    const meta = (e.metadata || {}) as Record<string, any>;
    const isPaused = Boolean(meta.paused) || meta.public_status === "paused";
    if (!isPaused && !e.team_member_key?.trim()) return true;
    return false;
  }), [employees]);
  const editingEmployee = useMemo(
    () => (editingId && editingId !== "new" ? employees.find((e) => e.id === editingId) || null : null),
    [editingId, employees],
  );

  const remove = async (id: string) => {
    if (!confirm("Delete this employee and all their HR documents?")) return;
    const emp = employees.find((e) => e.id === id);
    try {
      await apiDelete(`/hrm/employees/${id}`);
      if (emp) {
        try {
          await writePublicTeamFromEmployee(emp, { showOnPublic: false });
        } catch (err) {
          console.warn("Failed to remove from public team", err);
        }
      }
      toast.success("Employee deleted"); refetch();
    } catch (e: any) { toast.error(e.message); }
  };

  const togglePause = async (e: Employee, paused: boolean) => {
    const prevMeta = (e.metadata || {}) as Record<string, unknown>;
    const nextMeta = { ...prevMeta, paused, public_status: paused ? "paused" : (prevMeta.public_status || "active") };
    try { await apiPatch(`/hrm/employees/${e.id}`, { metadata: nextMeta as Json }); }
    catch (err: any) { toast.error(err.message); return; }
    try {
      await writePublicTeamFromEmployee({ ...e, metadata: nextMeta }, { showOnPublic: !paused });
    } catch (err) { console.warn("Public team writeback failed", err); }
    toast.success(paused ? "Paused — hidden from public team" : "Resumed — visible on public team");
    refetch();
  };

  const { data: brandData } = useIdCardBrand();
  const brand = brandData ?? DEFAULT_ID_CARD_BRAND;
  const [issuingId, setIssuingId] = useState<string | null>(null);
  const [cardIds, setCardIds] = useState<Record<string, string>>({});

  const loadCardIds = useCallback(async () => {
    const keys = employees.map((e) => e.team_member_key || e.id).filter(Boolean);
    if (keys.length === 0) { setCardIds({}); return; }
    const data = await apiGet<any[]>(`/hrm/id-card-assignments?kind=EMP&keys=${keys.join(',')}`);
    const map: Record<string, string> = {};
    for (const row of data || []) {
      map[(row as any).subject_key] = (row as any).card_id;
    }
    setCardIds(map);
  }, [employees]);

  useEffect(() => { loadCardIds(); }, [loadCardIds]);
  const [confirmIssue, setConfirmIssue] = useState<{
    employee: Employee;
    existingCardId: string | null;
  } | null>(null);

  const requestIssueCard = async (e: Employee) => {
    setIssuingId(e.id);
    try {
      const subjectKey = e.team_member_key || e.id;
      const existing = await apiGet<any>(`/hrm/id-card-assignments/single?kind=EMP&subject_key=${subjectKey}`);
      setConfirmIssue({
        employee: e,
        existingCardId: (existing?.card_id as string | undefined) || null,
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to check existing ID card");
    } finally {
      setIssuingId(null);
    }
  };

  const performIssueCard = async (e: Employee) => {
    setIssuingId(e.id);
    try {
      const meta = (e.metadata || {}) as Record<string, unknown>;
      const subject: CardSubject = {
        id: e.team_member_key || e.id,
        name: e.full_name,
        role: e.designation || "Team Member",
        email: e.email,
        phone: e.phone,
        country: (meta.country as string | undefined) || e.work_location || null,
        joinedAt: e.joining_date,
        expiresAt: (meta.contract_expires as string | undefined) || null,
        photo: e.photo_url,
        source: e.team_member_key ? "team_section" : "employee",
      };
      const { id } = await generateIdCardPdf({ subject, brand, kind: "EMP" });
      setCardIds((prev) => ({ ...prev, [e.team_member_key || e.id]: id }));
      toast.success(`ID card issued · ${id}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to issue ID card");
    } finally {
      setIssuingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <div className="text-sm text-muted-foreground">{employees.length} employee{employees.length === 1 ? "" : "s"}</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowIssues((v) => !v)}>
            <AlertTriangle className="w-4 h-4 mr-1" />
            Scan Issues {issues.length > 0 && <Badge variant="destructive" className="ml-2">{issues.length}</Badge>}
          </Button>
          <Button onClick={() => setEditingId("new")}><Plus className="w-4 h-4 mr-1" /> Add Employee</Button>
        </div>
      </div>

      {editingId === "new" && (
        <InlineEmployeeEditor initial={null} onSaved={refetch} onCancel={() => setEditingId(null)} />
      )}

      {showIssues && (
        <div className="border border-border rounded-lg p-3 bg-muted/20">
          <div className="text-sm font-medium mb-2">Missing employee_code / team_member_key</div>
          {issues.length === 0 ? (
            <div className="text-xs text-muted-foreground">All employees have an employee code and team key. ✓</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left py-1">Name</th>
                  <th className="text-left py-1">Designation</th>
                  <th className="text-left py-1">Missing</th>
                  <th className="text-right py-1"></th>
                </tr>
              </thead>
              <tbody>
                {issues.map((e) => {
                  const meta = (e.metadata || {}) as Record<string, any>;
                  const isPaused = Boolean(meta.paused) || meta.public_status === "paused";
                  const missing = [
                    !e.employee_code?.trim() && "employee_code",
                    (!isPaused && !e.team_member_key?.trim()) && "team_member_key",
                  ].filter(Boolean).join(", ");
                  return (
                    <tr key={e.id} className="border-t border-border">
                      <td className="py-1.5">{e.full_name}</td>
                      <td className="py-1.5">{e.designation || "—"}</td>
                      <td className="py-1.5"><Badge variant="destructive" className="text-[10px]">{missing}</Badge></td>
                      <td className="py-1.5 text-right">
                        <Button size="sm" variant="outline" onClick={() => setEditingId(e.id)}>Fix</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2">Name</th>
              <th className="text-left px-3 py-2">Designation</th>
              <th className="text-left px-3 py-2">Department</th>
              <th className="text-left px-3 py-2">Joined</th>
              <th className="text-right px-3 py-2">Salary</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-center px-3 py-2">Public</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 && (
              <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">No employees yet. Add your first one.</td></tr>
            )}
            {employees.map((e) => {
              const meta = (e.metadata || {}) as Record<string, unknown>;
              const isPaused = Boolean(meta.paused) || meta.public_status === "paused";
              const isEditing = editingId === e.id;
              return (
              <React.Fragment key={e.id}>
                <tr className={cn("border-t border-border hover:bg-muted/30", isPaused && "opacity-70", isEditing && "bg-primary/5")}>
                  <td className="px-3 py-2">
                    <div className="font-medium flex items-center gap-2">
                      {e.full_name}
                      {isPaused && <Badge variant="outline" className="text-[10px] py-0">Paused</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">{e.employee_code || e.email || ""}</div>
                  </td>
                  <td className="px-3 py-2">{e.designation || "—"}</td>
                  <td className="px-3 py-2">{e.department || "—"}</td>
                  <td className="px-3 py-2">{e.joining_date || "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    <div>{e.currency} {Number(e.gross_salary).toLocaleString()}</div>
                    {(() => {
                      const allow = Array.isArray(e.allowances) ? e.allowances : [];
                      const deduct = Array.isArray(e.deductions) ? e.deductions : [];
                      const gross = Number(e.gross_salary) || 0;
                      const lineAmount = (l: PayLine) =>
                        l?.type === "percent" ? (gross * (Number(l.value) || 0)) / 100 : Number(l?.value) || 0;
                      const sum = (arr: PayLine[]) => arr.reduce((t, l) => t + lineAmount(l), 0);
                      const fmtList = (arr: PayLine[]) =>
                        arr.length
                          ? arr.map((l) => `${l.label || "—"}: ${e.currency} ${lineAmount(l).toLocaleString()}${l.type === "percent" ? ` (${l.value}%)` : ""}`).join("\n")
                          : "None";
                      return (
                        <div className="mt-1 flex flex-wrap gap-1 justify-end text-[10px]">
                          {allow.length > 0 ? (
                            <Badge
                              variant="outline"
                              className="font-normal text-emerald-700 border-emerald-300"
                              title={fmtList(allow)}
                            >
                              +{allow.length} allow · {e.currency} {sum(allow).toLocaleString()}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="font-normal text-muted-foreground">Allowances: N/A</Badge>
                          )}
                          {deduct.length > 0 ? (
                            <Badge
                              variant="outline"
                              className="font-normal text-rose-700 border-rose-300"
                              title={fmtList(deduct)}
                            >
                              −{deduct.length} deduct · {e.currency} {sum(deduct).toLocaleString()}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="font-normal text-muted-foreground">Deductions: N/A</Badge>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={e.status === "active" ? "default" : "secondary"} className="capitalize">{e.status.replace("_", " ")}</Badge>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Switch
                      checked={!isPaused}
                      onCheckedChange={(v) => togglePause(e, !v)}
                      aria-label={isPaused ? "Resume on public team" : "Pause on public team"}
                    />
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {cardIds[e.team_member_key || e.id] && (
                      <Badge
                        variant="secondary"
                        className="mr-2 font-mono text-[10px]"
                        title="Allocated ID card number"
                      >
                        {cardIds[e.team_member_key || e.id]}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => requestIssueCard(e)}
                      disabled={issuingId === e.id}
                      title="Issue ID card & download PDF"
                      className="mr-1"
                    >
                      {issuingId === e.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <IdCard className="w-4 h-4 mr-1" />}
                      Issue ID
                    </Button>
                    <Button
                      variant={isEditing ? "default" : "ghost"}
                      size="icon"
                      onClick={() => setEditingId(isEditing ? null : e.id)}
                      aria-label={isEditing ? "Close editor" : "Edit employee"}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(e.id)}><Trash2 className="w-4 h-4" /></Button>
                  </td>
                </tr>
                {isEditing && editingEmployee && (
                  <tr className="bg-muted/10">
                    <td colSpan={8} className="px-3 py-3">
                      <InlineEmployeeEditor
                        initial={editingEmployee}
                        onSaved={refetch}
                        onCancel={() => setEditingId(null)}
                      />
                    </td>
                  </tr>
                )}
              </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <AlertDialog open={!!confirmIssue} onOpenChange={(o) => { if (!o) setConfirmIssue(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmIssue?.existingCardId ? "Reissue ID card?" : "Issue ID card?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmIssue?.existingCardId ? (
                <>
                  <strong>{confirmIssue.employee.full_name}</strong> already has an ID card
                  assigned: <span className="font-mono">{confirmIssue.existingCardId}</span>.
                  Continuing will re-download the same card PDF (no new ID will be allocated).
                </>
              ) : (
                <>
                  Issue a new ID card for <strong>{confirmIssue?.employee.full_name}</strong> and
                  download the PDF? A permanent card ID will be allocated.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmIssue) {
                  const emp = confirmIssue.employee;
                  setConfirmIssue(null);
                  performIssueCard(emp);
                }
              }}
            >
              {confirmIssue?.existingCardId ? "Re-download PDF" : "Issue & download"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ============================================================
//  Builder tab
// ============================================================
const BuilderTab = ({ employees, onIssued }: { employees: Employee[]; onIssued: () => void }) => {
  const formatMonthLabel = (mStr: string) => {
    try {
      return new Date(mStr + "-01").toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase();
    } catch {
      return mStr;
    }
  };

  const [employeeId, setEmployeeId] = useState<string>("");
  const [kind, setKind] = useState<HRDocKind>("offer");
  const [issueDate, setIssueDate] = useState(todayStr());
  // Effective date for offer/agreement is derived from the employee's joining date.
  // For other doc kinds it falls back to the issue date.
  const [startMonth, setStartMonth] = useState(currentMonthStr());
  const [endMonth, setEndMonth] = useState(currentMonthStr());
  const [monthlySalaries, setMonthlySalaries] = useState<Record<string, number>>({});
  const [bodyText, setBodyText] = useState("");
  const [validityDate, setValidityDate] = useState("");
  const [clausesRaw, setClausesRaw] = useState(
    DEFAULT_AGREEMENT_CLAUSES.map((c) => `${c.title}: ${c.body}`).join("\n\n"),
  );
  const [earnings, setEarnings] = useState<{ label: string; amount: number }[]>([]);
  const [deductions, setDeductions] = useState<{ label: string; amount: number }[]>([]);
  const [tillNow, setTillNow] = useState(false);
  const [lastWorkingDay, setLastWorkingDay] = useState("");
  
  const [signatureTypedName, setSignatureTypedName] = useState("");
  const [signatureImageUrl, setSignatureImageUrl] = useState("");
  const [issuing, setIssuing] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [revisedDesignation, setRevisedDesignation] = useState("");
  const [revisedGrossSalary, setRevisedGrossSalary] = useState("");
  const [noticePeriodDays, setNoticePeriodDays] = useState("");
  const [severanceAmount, setSeveranceAmount] = useState("");
  const [reason, setReason] = useState("");

  // Per-document overrides for fields that may be missing on the employee
  // record. These only affect the rendered preview / exported PDF — the
  // employee row is not modified. When the picker switches, we reset overrides
  // so each document starts from the employee's actual values.
  type OverrideKey = "designation" | "department" | "employment_type" | "job_type" | "work_location" | "reporting_to";
  const [overrides, setOverrides] = useState<Record<OverrideKey, string>>({
    designation: "", department: "", employment_type: "", job_type: "", work_location: "", reporting_to: "",
  });
  const setOverride = (k: OverrideKey, v: string) => setOverrides((p) => ({ ...p, [k]: v }));

  const rawEmployee = useMemo(() => employees.find((e) => e.id === employeeId) || null, [employees, employeeId]);
  const monthRange = useMemo(() => {
    if (!startMonth || !endMonth) return [];
    const res: string[] = [];
    let curr = new Date(startMonth + "-01");
    const last = new Date(endMonth + "-01");
    let limit = 0;
    while (curr <= last && limit < 24) {
      res.push(curr.toISOString().slice(0, 7)); // YYYY-MM
      curr.setMonth(curr.getMonth() + 1);
      limit++;
    }
    return res;
  }, [startMonth, endMonth]);

  useEffect(() => {
    if (!rawEmployee) return;
    const base = Number(rawEmployee.gross_salary || 0);
    setMonthlySalaries((prev) => {
      const next = { ...prev };
      monthRange.forEach((m) => {
        if (next[m] === undefined) {
          next[m] = base;
        }
      });
      return next;
    });
  }, [rawEmployee, monthRange]);

  useEffect(() => {
    if (!rawEmployee) {
      setEarnings([]);
      setDeductions([]);
      return;
    }
    setOverrides({
      designation: rawEmployee.designation || "",
      department: rawEmployee.department || "",
      employment_type: rawEmployee.employment_type || "",
      job_type: rawEmployee.job_type || "",
      work_location: rawEmployee.work_location || "",
      reporting_to: rawEmployee.reporting_to || "",
    });

    const base = Number(rawEmployee.gross_salary || 0);
    const initialEarnings: { label: string; amount: number }[] = [];
    const allowances = Array.isArray(rawEmployee.allowances) ? (rawEmployee.allowances as any[]) : [];
    allowances.forEach((a: any) => {
      const val = Number(a.value) || 0;
      const amt = a.type === "percent" ? (base * val) / 100 : val;
      initialEarnings.push({ label: a.label, amount: Math.round(amt * 100) / 100 });
    });
    setEarnings(initialEarnings);

    const initialDeductions: { label: string; amount: number }[] = [];
    const de = Array.isArray(rawEmployee.deductions) ? (rawEmployee.deductions as any[]) : [];
    de.forEach((d: any) => {
      const val = Number(d.value) || 0;
      const amt = d.type === "percent" ? (base * val) / 100 : val;
      initialDeductions.push({ label: d.label, amount: Math.round(amt * 100) / 100 });
    });
    setDeductions(initialDeductions);
  }, [rawEmployee, kind]);

  const employee = useMemo(() => {
    if (!rawEmployee) return null;
    const merged: any = { ...rawEmployee };
    (Object.keys(overrides) as OverrideKey[]).forEach((k) => {
      const v = overrides[k].trim();
      if (v) merged[k] = v;
    });
    return merged as typeof rawEmployee;
  }, [rawEmployee, overrides]);
  const effectiveDate =
    (kind === "offer" || kind === "agreement") && employee?.joining_date && String(employee.joining_date).trim() !== ""
      ? employee.joining_date
      : (issueDate && issueDate.trim() !== "" ? issueDate : todayStr());

  // Deduplicate the picker list so the same person doesn't appear twice when
  // they were synced from multiple sources (team account + team section, or
  // duplicate historical inserts). Also drop paused / hidden members.
  const pickerEmployees = useMemo(() => {
    const isPaused = (e: Employee) => {
      const meta = (e.metadata || {}) as Record<string, unknown>;
      return Boolean(meta.paused) || meta.public_status === "paused";
    };
    const keyOf = (e: Employee) => {
      const email = (e.email || "").trim().toLowerCase();
      if (email) return `email:${email}`;
      if (e.user_id) return `user:${e.user_id}`;
      if (e.team_member_key) return `team:${e.team_member_key}`;
      return `name:${(e.full_name || "").trim().toLowerCase()}`;
    };
    const score = (e: Employee) => {
      // Prefer the most complete record when collapsing duplicates
      let s = 0;
      if (e.email) s += 4;
      if (e.designation) s += 2;
      if (e.department) s += 1;
      if (e.photo_url) s += 1;
      if (e.gross_salary) s += 1;
      return s;
    };
    const map = new Map<string, Employee>();
    for (const e of employees) {
      if (isPaused(e)) continue;
      const k = keyOf(e);
      const prev = map.get(k);
      if (!prev || score(e) > score(prev)) map.set(k, e);
    }
    return [...map.values()].sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [employees]);

  const clauses = useMemo(() => {
    return clausesRaw
      .split(/\n{2,}/)
      .map((block) => {
        const idx = block.indexOf(":");
        if (idx === -1) return { title: block.trim().slice(0, 40), body: block.trim() };
        return { title: block.slice(0, idx).trim(), body: block.slice(idx + 1).trim() };
      })
      .filter((c) => c.title || c.body);
  }, [clausesRaw]);

  const payslip = useMemo(() => {
    if (kind !== "payslip" || !employee) return undefined;
    
    // Construct Basic Salary earnings for each month in the range
    const basicEarnings = monthRange.map((m) => ({
      label: `Basic Salary (${formatMonthLabel(m)})`,
      amount: Math.round((Number(monthlySalaries[m]) || 0) * 100) / 100
    }));

    // Other earnings/allowances
    const otherEarnings = earnings.map(e => ({ label: e.label, amount: Number(e.amount) || 0 }));
    const combinedEarnings = [...basicEarnings, ...otherEarnings];

    const gross = Math.round(combinedEarnings.reduce((s, e) => s + e.amount, 0) * 100) / 100;
    const totalDeductions = Math.round(deductions.reduce((s, d) => s + (Number(d.amount) || 0), 0) * 100) / 100;
    const net = Math.round((gross - totalDeductions) * 100) / 100;

    return {
      basic: Number(monthlySalaries[monthRange[0] || ""] || 0),
      earnings: combinedEarnings,
      deductions: deductions.map(d => ({ label: d.label, amount: Number(d.amount) || 0 })),
      gross,
      totalDeductions,
      net,
      netInWords: numberToWords(Math.floor(net)) + (net % 1 ? " and " + Math.round((net % 1) * 100) + "/100" : "") + " only",
    };
  }, [kind, employee, monthRange, monthlySalaries, earnings, deductions]);

  const issueAndEmail = async (sendEmail: boolean) => {
    if (!employee) { toast.error("Pick an employee first"); return null; }
    sendEmail ? setEmailing(true) : setIssuing(true);
    try {
      const data = await apiPost<any>('/hrm/issue-document', {
        employee_id: employee.id,
        kind,
        issue_date: issueDate && issueDate.trim() !== "" ? issueDate : todayStr(),
        effective_date: effectiveDate && String(effectiveDate).trim() !== "" ? effectiveDate : null,
        period_month: kind === "payslip" ? (startMonth === endMonth ? startMonth : `${startMonth} to ${endMonth}`) : null,
        computed: {
          body_text: bodyText || null,
          clauses: kind === "agreement" ? clauses : null,
          validity_date: kind === "offer" ? (validityDate && validityDate.trim() !== "" ? validityDate : null) : null,
          revised_designation: kind === "promotion" ? revisedDesignation : null,
          revised_gross_salary: kind === "promotion" ? Number(revisedGrossSalary) || null : null,
          notice_period_days: kind === "termination" ? Number(noticePeriodDays) || null : null,
          severance_amount: kind === "termination" ? Number(severanceAmount) || null : null,
          reason: kind === "termination" ? reason : null,
          till_now: tillNow,
          last_working_day: lastWorkingDay || null,
          payslip_earnings: kind === "payslip" ? earnings : null,
          payslip_deductions: kind === "payslip" ? deductions : null,
          start_month: kind === "payslip" ? startMonth : null,
          end_month: kind === "payslip" ? endMonth : null,
          monthly_salaries: kind === "payslip" ? monthlySalaries : null,
          month_range: kind === "payslip" ? monthRange : null,
        },
        send_email: sendEmail,
      });
      toast.success(sendEmail
        ? `Document ${data?.doc_number || ""} issued and emailed`
        : `Document ${data?.doc_number || ""} saved`);
      onIssued();
      return data;
    } catch (e: any) {
      toast.error(e.message || "Failed to issue document");
      return null;
    } finally {
      setEmailing(false); setIssuing(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="space-y-4 print:hidden">
        <section className="border border-border rounded-lg p-4 space-y-3 bg-card">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Employee</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn("w-full justify-between font-normal", !employeeId && "text-muted-foreground")}
                  >
                    <span className="truncate">
                      {employee
                        ? `${employee.full_name}${employee.designation ? ` — ${employee.designation}` : ""}`
                        : "Search by name, title, email…"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command
                    filter={(value, search) => value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0}
                  >
                    <CommandInput
                      placeholder="Search name, title, email, code…"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      name="hr-employee-search"
                      data-1p-ignore
                      data-lpignore="true"
                      data-form-type="other"
                    />
                    <CommandList>
                      <CommandEmpty>No employees found.</CommandEmpty>
                      <CommandGroup>
                        {pickerEmployees.map((e) => (
                          <CommandItem
                            key={e.id}
                            value={[e.full_name, e.designation, e.department, e.email, e.employee_code].filter(Boolean).join(" ")}
                            onSelect={() => setEmployeeId(e.id)}
                            className="flex items-center gap-2"
                          >
                            <Check className={cn("h-4 w-4 shrink-0", employeeId === e.id ? "opacity-100" : "opacity-0")} />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{e.full_name}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {[e.designation, e.department, e.email].filter(Boolean).join(" · ") || "—"}
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Document type</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as HRDocKind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(KIND_META) as HRDocKind[]).map((k) => (
                    <SelectItem key={k} value={k}>{KIND_META[k].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="flex items-center gap-2">
                Re-issue / override date
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">optional</span>
              </Label>
              <Input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                placeholder="Defaults to today"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                {kind === "offer" || kind === "agreement"
                  ? "Effective date is taken from the employee's joining date automatically. Set this only when back-dating or re-issuing."
                  : "Leave as today unless re-issuing for a past date."}
              </p>
            </div>
            {(kind === "experience" || kind === "relieving") && (
              <>
                <div>
                  <Label className="flex items-center gap-2">
                    Last working day override
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">optional</span>
                  </Label>
                  <Input
                    type="date"
                    value={lastWorkingDay}
                    onChange={(e) => setLastWorkingDay(e.target.value)}
                    disabled={tillNow}
                    placeholder="Defaults to employee last working day"
                  />
                </div>
                <div className="flex items-center gap-2 pt-2 col-span-2">
                  <input
                    type="checkbox"
                    id="till-now-checkbox"
                    checked={tillNow}
                    onChange={(e) => setTillNow(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="till-now-checkbox" className="font-medium cursor-pointer">
                    Till Now (Present / Ongoing)
                  </Label>
                </div>
              </>
            )}
            {kind === "payslip" && (
              <>
                <div>
                  <Label>Pay period (From month)</Label>
                  <Input type="month" value={startMonth} onChange={(e) => setStartMonth(e.target.value)} />
                </div>
                <div>
                  <Label>Pay period (To month)</Label>
                  <Input type="month" value={endMonth} onChange={(e) => setEndMonth(e.target.value)} />
                </div>
              </>
            )}
            {kind === "offer" && (
              <div>
                <Label>Offer valid until</Label>
                <Input type="date" value={validityDate} onChange={(e) => setValidityDate(e.target.value)} />
              </div>
            )}
            {kind === "promotion" && (
              <>
                <div>
                  <Label>Revised Designation</Label>
                  <Input
                    placeholder="e.g. Senior Software Engineer"
                    value={revisedDesignation}
                    onChange={(e) => setRevisedDesignation(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Revised Gross Salary</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 5000"
                    value={revisedGrossSalary}
                    onChange={(e) => setRevisedGrossSalary(e.target.value)}
                  />
                </div>
              </>
            )}
            {kind === "termination" && (
              <>
                <div>
                  <Label>Notice Period (Days)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 30"
                    value={noticePeriodDays}
                    onChange={(e) => setNoticePeriodDays(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Severance Amount</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 1500"
                    value={severanceAmount}
                    onChange={(e) => setSeveranceAmount(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Reason for Termination</Label>
                  <Select value={reason} onValueChange={setReason}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select reason…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="redundancy">Redundancy</SelectItem>
                      <SelectItem value="performance">Performance Issues</SelectItem>
                      <SelectItem value="misconduct">Misconduct</SelectItem>
                      <SelectItem value="mutual_agreement">Mutual Agreement</SelectItem>
                      <SelectItem value="resignation">Resignation</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        </section>

        {employee && (
          <section className="border border-border rounded-lg bg-card">
            <details className="group [&_summary::-webkit-details-marker]:hidden" open={!rawEmployee?.job_type || !rawEmployee?.reporting_to || !rawEmployee?.work_location}>
              <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium flex items-center justify-between hover:bg-muted/40 rounded-lg">
                <span className="flex items-center gap-2">
                  Quick-fill missing fields
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">overrides this document only</span>
                </span>
                <ChevronsUpDown className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <div className="px-4 pb-4 pt-1 space-y-3">
                <p className="text-[11px] text-muted-foreground">
                  Any value you type here replaces the corresponding "—" placeholder in the preview and exported PDF. The employee record is not modified — to save permanently, edit the employee in the Employees tab.
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Designation</Label>
                    <Input value={overrides.designation} onChange={(e) => setOverride("designation", e.target.value)} placeholder="e.g. Project Manager" />
                  </div>
                  <div>
                    <Label>Department</Label>
                    <Input value={overrides.department} onChange={(e) => setOverride("department", e.target.value)} placeholder="e.g. Agile & Delivery" />
                  </div>
                  <div>
                    <Label>Employment type</Label>
                    <Select value={overrides.employment_type || "unspecified"} onValueChange={(v) => setOverride("employment_type", v === "unspecified" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unspecified">— None —</SelectItem>
                        <SelectItem value="full-time">Full-Time</SelectItem>
                        <SelectItem value="part-time">Part-Time</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="intern">Intern</SelectItem>
                        <SelectItem value="freelance">Freelance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Job type</Label>
                    <Select value={overrides.job_type || "unspecified"} onValueChange={(v) => setOverride("job_type", v === "unspecified" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unspecified">— None —</SelectItem>
                        <SelectItem value="On-site">On-site</SelectItem>
                        <SelectItem value="Remote">Remote</SelectItem>
                        <SelectItem value="Hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Work location</Label>
                    <Input value={overrides.work_location} onChange={(e) => setOverride("work_location", e.target.value)} placeholder="e.g. Dhaka, Bangladesh" />
                  </div>
                  <div>
                    <Label>Reporting to</Label>
                    <Input value={overrides.reporting_to} onChange={(e) => setOverride("reporting_to", e.target.value)} placeholder="e.g. Jane Cooper, CTO" />
                  </div>
                </div>
              </div>
            </details>
          </section>
        )}



        {(kind === "offer" || kind === "experience" || kind === "relieving") && (
          <section className="border border-border rounded-lg p-4 bg-card">
            <Label>Custom paragraph (optional, appended to the body)</Label>
            <Textarea rows={4} value={bodyText} onChange={(e) => setBodyText(e.target.value)} placeholder="Add any extra context, benefits, or notes…" />
          </section>
        )}

        {kind === "agreement" && (
          <section className="border border-border rounded-lg p-4 bg-card space-y-2">
            <div>
              <Label>Preamble (optional)</Label>
              <Textarea rows={3} value={bodyText} onChange={(e) => setBodyText(e.target.value)} />
            </div>
            <div>
              <Label>Clauses (one per block, use blank line between, format "Title: body")</Label>
              <Textarea rows={10} value={clausesRaw} onChange={(e) => setClausesRaw(e.target.value)} className="font-mono text-xs" />
            </div>
          </section>
        )}

        {kind === "payslip" && employee && (
          <section className="border border-border rounded-lg p-4 bg-card space-y-4">
            <div className="text-sm font-semibold">Basic Salary per Month (editable)</div>
            <div className="space-y-2">
              {monthRange.map((m) => {
                const label = formatMonthLabel(m);
                return (
                  <div key={m} className="flex gap-2 items-center">
                    <span className="flex-1 text-xs font-semibold px-2.5 py-1.5 bg-primary/10 text-primary rounded shrink-0 self-start sm:self-auto text-left">
                      Basic Salary ({label})
                    </span>
                    <Input 
                      className="w-32" 
                      type="number" 
                      step="0.01" 
                      value={monthlySalaries[m] !== undefined ? monthlySalaries[m] : Number(employee.gross_salary || 0)} 
                      onChange={(e) => setMonthlySalaries((p) => ({ ...p, [m]: Number(e.target.value) || 0 }))} 
                    />
                  </div>
                );
              })}
            </div>

            <div className="text-sm font-semibold pt-2 border-t border-border">Allowances / Other Earnings (editable)</div>
            <div className="space-y-2">
              {earnings.map((l, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input 
                    className="flex-1" 
                    placeholder="Earning name" 
                    value={l.label} 
                    onChange={(e) => setEarnings((p) => p.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x))} 
                  />
                  <Input 
                    className="w-32" 
                    type="number" 
                    step="0.01" 
                    value={l.amount} 
                    onChange={(e) => setEarnings((p) => p.map((x, idx) => idx === i ? { ...x, amount: Number(e.target.value) } : x))} 
                  />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setEarnings((p) => p.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setEarnings((p) => [...p, { label: "", amount: 0 }])}>
                <Plus className="w-3 h-3 mr-1" /> Add custom earning
              </Button>
            </div>

            <div className="text-sm font-semibold pt-2 border-t border-border">Deductions Breakdown (editable)</div>
            <div className="space-y-2">
              {deductions.map((l, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input 
                    className="flex-1" 
                    placeholder="Deduction name" 
                    value={l.label} 
                    onChange={(e) => setDeductions((p) => p.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x))} 
                  />
                  <Input 
                    className="w-32" 
                    type="number" 
                    step="0.01" 
                    value={l.amount} 
                    onChange={(e) => setDeductions((p) => p.map((x, idx) => idx === i ? { ...x, amount: Number(e.target.value) } : x))} 
                  />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setDeductions((p) => p.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setDeductions((p) => [...p, { label: "", amount: 0 }])}>
                <Plus className="w-3 h-3 mr-1" /> Add custom deduction
              </Button>
            </div>
          </section>
        )}

        {kind !== "payslip" && (
          <section className="border border-border rounded-lg bg-card">
            <details className="group [&_summary::-webkit-details-marker]:hidden">
              <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium flex items-center justify-between hover:bg-muted/40 rounded-lg">
                <span className="flex items-center gap-2"><FileSignature className="w-4 h-4" /> Authorised signature (optional)</span>
                <ChevronsUpDown className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <div className="px-4 pb-4 pt-1 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Leave both blank to show the default "system generated" note. Provide either a typed name (rendered in handwriting) or upload a signature image — the upload takes priority.
                </p>
                <div>
                  <Label>Typed signatory name</Label>
                  <Input
                    value={signatureTypedName}
                    onChange={(e) => setSignatureTypedName(e.target.value)}
                    placeholder="e.g. A. Rahman"
                  />
                </div>
                <div>
                  <Label>Upload signature image (PNG with transparent background works best)</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const reader = new FileReader();
                        reader.onload = () => setSignatureImageUrl(typeof reader.result === "string" ? reader.result : "");
                        reader.readAsDataURL(f);
                      }}
                    />
                    {signatureImageUrl && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setSignatureImageUrl("")}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  {signatureImageUrl && (
                    <img src={signatureImageUrl} alt="Signature preview" className="mt-2 h-12 object-contain" />
                  )}
                </div>
              </div>
            </details>
          </section>
        )}

        <section className="border border-border rounded-lg p-4 bg-card flex flex-wrap gap-2">
          <Button
            onClick={async () => {
              if (!employee) return;
              setDownloading(true);
              try {
                // Auto-save to history first
                const docData = await issueAndEmail(false);
                if (!docData) throw new Error("Auto-save to history failed");
                const docNum = docData.doc_number || "doc";
                const fname = `${kind}_${docNum}_${employee.full_name.toLowerCase().replace(/\s+/g, "_")}.pdf`;
                await downloadHRDocumentPdf(fname);
              } catch (e: any) {
                toast.error(e?.message || "Download failed");
              } finally {
                setDownloading(false);
              }
            }}
            disabled={!employee || downloading}
          >
            {downloading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
            Download PDF
          </Button>
          <Button
            onClick={async () => {
              if (!employee) return;
              try {
                // Auto-save to history first
                await issueAndEmail(false);
              } catch {}
              printWithSignatureFonts();
            }}
            variant="outline"
            disabled={!employee}
          >
            <Printer className="w-4 h-4 mr-1.5" /> Print
          </Button>
          <Button onClick={() => issueAndEmail(false)} variant="secondary" disabled={!employee || issuing}>
            {issuing ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <FileText className="w-4 h-4 mr-1.5" />}
            Save to history
          </Button>
          <Button onClick={() => issueAndEmail(true)} disabled={!employee || emailing || !employee?.email}>
            {emailing ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Send className="w-4 h-4 mr-1.5" />}
            Issue & email employee
          </Button>
          {!employee?.email && employee && <span className="text-xs text-muted-foreground self-center">Add an email to enable sending</span>}
        </section>
      </div>

      <div className="lg:sticky lg:top-4 self-start print:static overflow-auto max-h-[calc(100vh-2rem)] print:max-h-none">
        {employee ? (
          <HRDocumentPreview
            kind={kind}
            issueDate={issueDate}
            effectiveDate={effectiveDate}
            periodMonth={kind === "payslip" ? periodMonth : undefined}
            employee={employee}
            bodyText={bodyText}
            clauses={kind === "agreement" ? clauses : undefined}
            validityDate={kind === "offer" ? validityDate : undefined}
            payslip={kind === "payslip" ? payslip : undefined}
            signatureTypedName={signatureTypedName || undefined}
            signatureImageUrl={signatureImageUrl || undefined}
            revisedDesignation={kind === "promotion" ? revisedDesignation : undefined}
            revisedGrossSalary={kind === "promotion" ? Number(revisedGrossSalary) || undefined : undefined}
            noticePeriodDays={kind === "termination" ? Number(noticePeriodDays) || undefined : undefined}
            severanceAmount={kind === "termination" ? Number(severanceAmount) || undefined : undefined}
            reason={kind === "termination" ? reason : undefined}
            lastWorkingDay={lastWorkingDay || undefined}
            tillNow={tillNow}
          />
        ) : (
          <div className="border border-dashed border-border rounded-lg p-10 text-center text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
            Pick an employee to start
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
//  History tab
// ============================================================
const HistoryTab = ({ employees, docs, refetch }: { employees: Employee[]; docs: HRDoc[]; refetch: () => void }) => {
  const empById = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);

  const resend = async (doc: HRDoc) => {
    const emp = empById[doc.employee_id];
    if (!emp?.email) { toast.error("Employee has no email"); return; }
    try {
      await apiPost('/hrm/issue-document', { resend_document_id: doc.id });
      toast.success("Resent");
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Failed to resend");
    }
  };

  const voidDoc = async (id: string) => {
    if (!confirm("Mark this document as void?")) return;
    try {
      await apiPatch(`/hrm/hr-documents/${id}/void`, {});
      toast.success("Marked void"); refetch();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="text-left px-3 py-2">Doc #</th>
            <th className="text-left px-3 py-2">Type</th>
            <th className="text-left px-3 py-2">Employee</th>
            <th className="text-left px-3 py-2">Issued</th>
            <th className="text-left px-3 py-2">Status</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {docs.length === 0 && (
            <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No documents issued yet.</td></tr>
          )}
          {docs.map((d) => {
            const emp = empById[d.employee_id];
            const Icon = KIND_META[d.kind].icon;
            return (
              <tr key={d.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-3 py-2 font-mono text-xs">{d.doc_number || "—"}</td>
                <td className="px-3 py-2"><span className="inline-flex items-center gap-1.5"><Icon className="w-3.5 h-3.5 text-primary" /> {KIND_META[d.kind].label}</span></td>
                <td className="px-3 py-2">{emp?.full_name || "—"}</td>
                <td className="px-3 py-2">{d.issue_date}</td>
                <td className="px-3 py-2">
                  <Badge variant={d.status === "sent" ? "default" : d.status === "void" ? "destructive" : "secondary"} className="capitalize">{d.status}</Badge>
                  {d.sent_at && <div className="text-[10px] text-muted-foreground mt-0.5">{new Date(d.sent_at).toLocaleString()}</div>}
                </td>
                <td className="px-3 py-2 text-right space-x-1">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-3.5 h-3.5 mr-1" /> View
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[225mm] max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Document Preview: {d.doc_number}</DialogTitle>
                      </DialogHeader>
                      <div className="bg-white p-4 rounded-md border border-neutral-200 overflow-x-auto">
                        <HRDocumentPreview
                          kind={d.kind}
                          docNumber={d.doc_number || undefined}
                          issueDate={d.issue_date}
                          effectiveDate={d.effective_date || undefined}
                          periodMonth={d.period_month || undefined}
                          employee={d.snapshot as any}
                          bodyText={d.computed?.body_text as string}
                          clauses={d.computed?.clauses as any}
                          validityDate={d.computed?.validity_date as string}
                          payslip={
                            d.kind === "payslip"
                              ? (d.computed?.payslip_earnings
                                ? {
                                    basic: Number(d.computed?.payslip_earnings[0]?.amount || 0),
                                    earnings: d.computed?.payslip_earnings,
                                    deductions: d.computed?.payslip_deductions || [],
                                    gross: Math.round(d.computed?.payslip_earnings.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0) * 100) / 100,
                                    totalDeductions: Math.round((d.computed?.payslip_deductions || []).reduce((s: number, de: any) => s + (Number(de.amount) || 0), 0) * 100) / 100,
                                    net: Math.round((d.computed?.payslip_earnings.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0) - (d.computed?.payslip_deductions || []).reduce((s: number, de: any) => s + (Number(de.amount) || 0), 0)) * 100) / 100,
                                    netInWords: numberToWords(Math.floor(Math.round((d.computed?.payslip_earnings.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0) - (d.computed?.payslip_deductions || []).reduce((s: number, de: any) => s + (Number(de.amount) || 0), 0)) * 100) / 100)) + " only",
                                  } as any
                                : computePayslip(
                                    Number(d.snapshot?.gross_salary || 0),
                                    (d.snapshot?.allowances || []) as any,
                                    (d.snapshot?.deductions || []) as any,
                                    (d.computed?.extra_earnings || []) as any,
                                    (d.computed?.extra_deductions || []) as any
                                  ))
                              : undefined
                          }
                          revisedDesignation={d.computed?.revised_designation as string}
                          revisedGrossSalary={d.computed?.revised_gross_salary as number}
                          noticePeriodDays={d.computed?.notice_period_days as number}
                          severanceAmount={d.computed?.severance_amount as number}
                          reason={d.computed?.reason as string}
                          tillNow={Boolean(d.computed?.till_now)}
                          lastWorkingDay={d.computed?.last_working_day as string || undefined}
                        />
                      </div>
                      <DialogFooter className="print:hidden">
                        <Button
                          onClick={() => {
                            window.print();
                          }}
                        >
                          <Printer className="w-4 h-4 mr-1.5" /> Print
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  {emp?.email && d.status !== "void" && (
                    <Button variant="ghost" size="sm" onClick={() => resend(d)}><Mail className="w-3.5 h-3.5 mr-1" /> Resend</Button>
                  )}
                  {d.status !== "void" && (
                    <Button variant="ghost" size="sm" onClick={() => voidDoc(d.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ============================================================
//  Page
// ============================================================
export default function AdminHR() {
  const qc = useQueryClient();

  const { data: publicTeamItems = EMPTY_TEAM_MEMBERS, isFetched: publicTeamFetched } = useQuery({
    queryKey: ["hr-public-team-source"],
    queryFn: async () => {
      const result = await apiGet<{ value: any } | null>('/hrm/site-settings?key=home_sections');
      let raw: unknown = result?.value ?? null;
      while (typeof raw === "string") {
        try { raw = JSON.parse(raw); } catch { break; }
      }
      const parsed = raw && typeof raw === "object" && !Array.isArray(raw)
        ? raw as { team?: { items?: TeamMember[] } }
        : null;
      return parsed?.team?.items || EMPTY_TEAM_MEMBERS;
    },
  });

  const { data: employees = [], refetch: refetchEmployees } = useQuery({
    queryKey: ["hr-employees"],
    queryFn: async () => {
      const data = await apiGet<any[]>('/hrm/employees');
      return (data || []) as unknown as Employee[];
    },
  });

  const { data: docs = [] } = useQuery({
    queryKey: ["hr-documents"],
    queryFn: async () => {
      const data = await apiGet<any[]>('/hrm/hr-documents');
      return (data || []) as unknown as HRDoc[];
    },
  });

  // Auto-sync: Team/Employees is the source of truth. HR mirrors both staff
  // accounts and the public Team Section, updating existing HR rows and hiding
  // stale synced rows when somebody is removed from the team source.
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [syncSummary, setSyncSummary] = useState<{ added: number; updated: number; retired: number } | null>(null);

  const runSync = async (opts: { silent?: boolean } = {}) => {
    if (!publicTeamFetched) return;
    setSyncing(true);
    try {
      const [teamUsers, freshEmployees] = await Promise.all([
        apiGet<any[]>('/hrm/team-users'),
        apiGet<any[]>('/hrm/employees'),
      ]);
      const teamRes = { users: teamUsers || [] };
      if (!teamUsers) throw new Error("Could not load team accounts");
      const currentEmployees = (freshEmployees || []) as unknown as Employee[];
      const sourceRows = sourceRowsFromTeam(teamRes.users as TeamUser[], publicTeamItems);
      const sourceKeys = new Set(sourceRows.map(syncKeyFor));
      let added = 0, updated = 0, retired = 0;

      for (const row of sourceRows) {
        const existing = currentEmployees.find((e) => {
          if (row.team_member_key && e.team_member_key) {
            return e.team_member_key === row.team_member_key;
          }
          if (row.team_member_key || e.team_member_key) {
            return false;
          }
          return (row.user_id && e.user_id === row.user_id)
            || (normalizeEmail(row.email) && normalizeEmail(e.email) === normalizeEmail(row.email));
        });
        const metadata = { ...row.metadata, ...(existing?.metadata || {}), sync_source: existing?.metadata?.sync_source || row.source } as Json;
        const payload: EmployeeInsert = {
          user_id: existing?.user_id || row.user_id || null,
          team_member_key: existing?.team_member_key || row.team_member_key || null,
          full_name: existing?.full_name || row.full_name,
          email: existing?.email || row.email,
          phone: existing?.phone || row.phone,
          photo_url: existing?.photo_url || row.photo_url,
          designation: existing?.designation || row.designation,
          department: existing?.department || row.department,
          work_location: existing?.work_location || row.work_location,
          joining_date: existing?.joining_date || row.joining_date,
          status: existing?.status || row.status,
          employment_type: existing?.employment_type || "full-time",
          currency: existing?.currency || "USD",
          gross_salary: existing?.gross_salary || 0,
          pay_cycle: existing?.pay_cycle || "monthly",
          allowances: (existing?.allowances || []) as unknown as Json,
          deductions: (existing?.deductions || []) as unknown as Json,
          metadata,
        };
        const existingValues = existing as unknown as Record<string, unknown> | undefined;
        const needsUpdate = !existing || Object.entries(payload).some(([key, value]) => !valuesEqual(existingValues?.[key], value));
        if (!needsUpdate) continue;
        if (existing?.id) {
          try { await apiPatch(`/hrm/employees/${existing.id}`, payload); updated++; } catch {}
        } else {
          // Upsert on email (or team_member_key / user_id) so a concurrent sync
          // run or a stale local cache can't create a duplicate row — the DB
          // now has partial unique indexes that back these conflict targets.
          const conflictTarget = payload.email
            ? "email"
            : payload.user_id
              ? "user_id"
              : payload.team_member_key
                ? "team_member_key"
                : undefined;
          try {
            if (conflictTarget) {
              await apiPost('/hrm/employees/upsert', { ...payload, conflict_on: conflictTarget });
            } else {
              await apiPost('/hrm/employees', payload);
            }
            added++;
          } catch {}
        }
      }

      const staleSynced = currentEmployees.filter((e) => {
        const meta = e.metadata || {};
        if (!["team", "team_account", "team_section"].includes(String(meta.synced_from || meta.sync_source || ""))) return false;
        const key = syncKeyFor(e);
        return !sourceKeys.has(key) && e.status !== "terminated";
      });
      if (staleSynced.length) {
        const stalePayload: EmployeeUpdate = { status: "terminated", last_working_day: todayStr() };
        try {
          await apiPost('/hrm/employees/bulk-update', { ids: staleSynced.map(e => e.id), data: stalePayload });
          retired = staleSynced.length;
        } catch {}
      }

      setLastSyncedAt(new Date());
      setSyncSummary({ added, updated, retired });
      if (added || updated || retired) {
        refetchEmployees();
        if (!opts.silent) toast.success(`Synced — ${added} added, ${updated} updated, ${retired} retired`);
      } else if (!opts.silent) {
        toast.success("Already up to date");
      }
    } catch (e: unknown) {
      if (!opts.silent) toast.error(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  // Initial + reactive sync (silent). Depends only on team sources, not on
  // employees, to avoid re-running on every write we make ourselves.
  useEffect(() => {
    if (!publicTeamFetched) return;
    runSync({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicTeamFetched, publicTeamItems]);

  const refetchAll = () => {
    qc.invalidateQueries({ queryKey: ["hr-employees"] });
    qc.invalidateQueries({ queryKey: ["hr-documents"] });
  };

  // Realtime: any change to employees or the home_sections row (from another
  // browser tab or another admin) re-fetches the affected queries so both the
  // HR list and the public Team Section stay in sync without a refresh.
  // Realtime subscriptions removed — NestJS WebSocket pub/sub pending.
  // Queries invalidate after each mutation above.


  // Tab state synced with ?tab= so deep links / refresh land correctly.
  const location = useLocation();
  const navigate = useNavigate();
  const VALID_TABS = ["employees", "builder", "history"] as const;
  type TabVal = typeof VALID_TABS[number];
  const tab: TabVal = useMemo(() => {
    const t = new URLSearchParams(location.search).get("tab") as TabVal | null;
    return t && (VALID_TABS as readonly string[]).includes(t) ? t : "employees";
  }, [location.search]);
  const setTab = (v: string) => {
    if (v === tab) return;
    navigate({ pathname: location.pathname, search: `?tab=${v}` }, { replace: true });
  };

  return (
    <SuperAdminLayout>
      <div className="mb-5 flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Briefcase className="w-6 h-6 text-primary" />
          <div>
            <h1 className="font-heading text-2xl font-bold leading-tight">HR & Employees</h1>
            <p className="text-xs text-muted-foreground">
              Global employee center — manage staff, public team profiles, ID cards and HR documents.
              {lastSyncedAt && (
                <> · Last sync {lastSyncedAt.toLocaleTimeString()}{syncSummary && ` (+${syncSummary.added} / ~${syncSummary.updated} / -${syncSummary.retired})`}</>
              )}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => runSync()} disabled={syncing}>
          {syncing ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
          Sync now
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="employees" className="gap-1.5"><Users className="w-4 h-4" /> Employees</TabsTrigger>
          <TabsTrigger value="builder" className="gap-1.5"><FileSignature className="w-4 h-4" /> Document Builder</TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5"><FileText className="w-4 h-4" /> History</TabsTrigger>
        </TabsList>
        <TabsContent value="employees" className="mt-4">
          <EmployeesTab employees={employees} refetch={refetchAll} />
        </TabsContent>
        <TabsContent value="builder" className="mt-4">
          <BuilderTab
            employees={employees.filter((e) => e.status !== "terminated" && e.status !== "suspended")}
            onIssued={refetchAll}
          />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <HistoryTab employees={employees} docs={docs} refetch={refetchAll} />
        </TabsContent>
      </Tabs>
    </SuperAdminLayout>
  );
}


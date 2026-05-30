import { useMemo, useState } from "react";
import AccountLayout from "@/components/account/AccountLayout";
import { useCustomerServices, daysUntil, type CustomerService } from "@/hooks/use-customer-services";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2, CheckCircle2, Circle, FileText, Calendar, Plus, Download,
  MapPin, Hash, Users, Copy, Search, ChevronRight, Clock, Sparkles,
  Building, BadgeCheck, Banknote,
} from "lucide-react";
import { Link } from "react-router-dom";
import { usePageTitle } from "@/hooks/use-page-title";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import DocumentManager from "@/components/account/DocumentManager";

const FORMATION_STEPS = [
  "Order received",
  "Documents prepared",
  "State filing",
  "EIN / Tax ID",
  "Bank introduction",
  "Delivered",
];

const stepIndex = (status: string) => {
  switch (status) {
    case "pending": return 0;
    case "in_progress": return 2;
    case "active":
    case "delivered": return 5;
    default: return 1;
  }
};

const statusTone = (status: string) => {
  if (status === "active" || status === "delivered" || status === "completed") return "bg-emerald-500/15 text-emerald-700 border-emerald-500/30";
  if (status === "in_progress") return "bg-blue-500/15 text-blue-700 border-blue-500/30";
  if (status === "pending") return "bg-yellow-500/15 text-yellow-700 border-yellow-500/30";
  if (status === "expired" || status === "cancelled") return "bg-destructive/10 text-destructive border-destructive/30";
  return "bg-muted text-muted-foreground border-border";
};

type CompanyDoc = {
  key: string;
  label: string;
  icon: any;
  // status derived from milestone index
  requiredStep: number;
  url?: string | null;
};

const companyMeta = (s: CustomerService) => {
  const m = (s.metadata || {}) as any;
  const itm = m.source_item || {};
  const company = m.company || itm.company || {};
  return {
    name: company.name || itm.company_name || s.service_name,
    state: company.state || itm.state || (m.state as string) || "—",
    address: company.address || itm.address || "—",
    ein: company.ein || itm.ein || null as string | null,
    formedOn: company.formed_on || s.delivered_at || s.started_at,
    members: (company.members || itm.members || []) as Array<{ name?: string; role?: string }>,
    documents: (company.documents || m.documents || []) as Array<{ key: string; label?: string; url?: string }>,
  };
};

const DEFAULT_DOCS: CompanyDoc[] = [
  { key: "certification", label: "Certification of Formation", icon: FileText, requiredStep: 2 },
  { key: "operating_agreement", label: "Operating Agreement", icon: FileText, requiredStep: 1 },
  { key: "ein_letter", label: "EIN Confirmation Letter", icon: BadgeCheck, requiredStep: 3 },
  { key: "bank_intro", label: "Bank Introduction Pack", icon: Banknote, requiredStep: 4 },
];

const AccountFormation = () => {
  usePageTitle("Company Formation");
  const { data: services, isLoading } = useCustomerServices({ category: "company_formation" });
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const list = services || [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((s) => {
      const c = companyMeta(s);
      return c.name.toLowerCase().includes(q) || c.state.toLowerCase().includes(q) || s.service_name.toLowerCase().includes(q);
    });
  }, [services, search]);

  const selected = useMemo(
    () => filtered.find((s) => s.id === selectedId) || filtered[0] || null,
    [filtered, selectedId]
  );

  const stats = useMemo(() => {
    const list = services || [];
    const active = list.filter((s) => s.status === "active" || s.status === "delivered").length;
    const inProgress = list.filter((s) => s.status === "in_progress" || s.status === "pending").length;
    const renewSoon = list.filter((s) => {
      const d = daysUntil(s.current_period_end);
      return d !== null && d <= 30 && d >= 0;
    }).length;
    return { active, inProgress, renewSoon, total: list.length };
  }, [services]);

  const copy = async (text: string, label = "Copied") => {
    try { await navigator.clipboard.writeText(text); toast.success(label); } catch { toast.error("Copy failed"); }
  };

  return (
    <AccountLayout
      title="Company Formation"
      description="Manage your companies, documents, and annual compliance — all in one place."
    >
      {/* Header CTA */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex-1 min-w-[200px] relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search companies, state…"
            className="pl-9 h-10 rounded-xl"
          />
        </div>
        <Button asChild variant="hero" className="rounded-full h-10 px-5">
          <Link to="/services?category=dcs">
            <Plus className="w-4 h-4 mr-1.5" /> Register a new company
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total companies" value={stats.total} Icon={Building2} tone="primary" />
        <StatCard label="Active" value={stats.active} Icon={CheckCircle2} tone="emerald" />
        <StatCard label="In progress" value={stats.inProgress} Icon={Clock} tone="blue" />
        <StatCard label="Renewing ≤30d" value={stats.renewSoon} Icon={Calendar} tone="yellow" />
      </div>

      {isLoading ? (
        <div className="grid lg:grid-cols-[320px_1fr] gap-5">
          <Skeleton className="h-[420px] rounded-2xl" />
          <Skeleton className="h-[420px] rounded-2xl" />
        </div>
      ) : !services || services.length === 0 ? (
        <EmptyState />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card text-center py-12">
          <Search className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No companies match "{search}"</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[340px_1fr] gap-5">
          {/* Left: Company list */}
          <aside className="space-y-2 lg:max-h-[calc(100vh-220px)] lg:overflow-y-auto lg:pr-1">
            {filtered.map((s) => {
              const c = companyMeta(s);
              const active = selected?.id === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={cn(
                    "w-full text-left rounded-2xl border p-4 transition-all group",
                    active
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      active ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                    )}>
                      <Building className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-heading font-semibold text-sm truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {c.state !== "—" ? `${c.state} · ` : ""}{s.service_name}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className={cn("text-[10px] capitalize", statusTone(s.status))}>
                          {s.status.replace("_", " ")}
                        </Badge>
                        <ChevronRight className={cn("w-3.5 h-3.5 ml-auto text-muted-foreground/60 transition-transform", active && "translate-x-0.5 text-primary")} />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </aside>

          {/* Right: Company detail */}
          {selected && (
            <CompanyDetail service={selected} onCopy={copy} />
          )}
        </div>
      )}
    </AccountLayout>
  );
};

const StatCard = ({ label, value, Icon, tone }: { label: string; value: number; Icon: any; tone: "primary" | "emerald" | "blue" | "yellow" }) => {
  const toneMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald-500/10 text-emerald-600",
    blue: "bg-blue-500/10 text-blue-600",
    yellow: "bg-yellow-500/10 text-yellow-700",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", toneMap[tone])}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-heading text-xl font-bold leading-tight">{value}</p>
      </div>
    </div>
  );
};

const EmptyState = () => (
  <div className="rounded-2xl border border-border bg-card text-center py-16 px-6">
    <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
      <Sparkles className="w-7 h-7" />
    </div>
    <h3 className="font-heading text-xl font-bold mb-2">Start your first company</h3>
    <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
      Form a US LLC, C-Corp, or UK Ltd in days. Track every document, EIN, and renewal from one beautiful dashboard.
    </p>
    <Button asChild variant="hero" className="rounded-full px-6">
      <Link to="/services?category=dcs"><Plus className="w-4 h-4 mr-1.5" /> Register a new company</Link>
    </Button>
  </div>
);

const CompanyDetail = ({ service, onCopy }: { service: CustomerService; onCopy: (v: string, label?: string) => void }) => {
  const c = companyMeta(service);
  const idx = stepIndex(service.status);
  const d = daysUntil(service.current_period_end);
  const progress = Math.round(((idx + 1) / FORMATION_STEPS.length) * 100);

  // Documents are managed via Supabase Storage; <DocumentManager /> handles list/download.

  return (
    <div className="space-y-5">
      {/* Hero card */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6 md:p-7">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
              <Building className="w-7 h-7" />
            </div>
            <div className="min-w-0">
              <h2 className="font-heading text-2xl font-bold truncate">{c.name}</h2>
              <p className="text-sm text-muted-foreground truncate">{service.service_name}</p>
            </div>
          </div>
          <Badge variant="outline" className={cn("capitalize", statusTone(service.status))}>
            {service.status.replace("_", " ")}
          </Badge>
        </div>

        {/* Progress */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Formation progress</span>
            <span className="font-semibold text-foreground">{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Company info */}
      <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
        <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" /> Company information
        </h3>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <InfoRow label="Company name" value={c.name} onCopy={() => onCopy(c.name, "Name copied")} />
          <InfoRow label="State / Jurisdiction" value={c.state} icon={MapPin} />
          <InfoRow label="Registered address" value={c.address} icon={MapPin} multiline />
          <InfoRow label="Formation date" value={c.formedOn ? new Date(c.formedOn).toLocaleDateString() : "—"} icon={Calendar} />
          <InfoRow
            label="EIN / Tax ID"
            value={c.ein || (idx >= 3 ? "Issued — pending upload" : "Pending")}
            icon={Hash}
            onCopy={c.ein ? () => onCopy(c.ein!, "EIN copied") : undefined}
          />
          <InfoRow
            label="Members"
            value={c.members.length ? c.members.map((m) => `${m.name || "Member"}${m.role ? ` · ${m.role}` : ""}`).join(", ") : "Not listed"}
            icon={Users}
          />
        </div>
      </section>

      {/* Document status */}
      <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> Document status
          </h3>
          <p className="text-xs text-muted-foreground">Access all your important files here</p>
        </div>
        <DocumentManager serviceId={service.id} variant="customer" />

      </section>

      {/* Milestones + Renewal */}
      <div className="grid md:grid-cols-2 gap-5">
        <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
          <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" /> Milestones
          </h3>
          <div className="space-y-3">
            {FORMATION_STEPS.map((step, i) => {
              const done = i <= idx;
              const current = i === idx + 1 || (idx === 0 && i === 0);
              return (
                <div key={step} className="flex items-center gap-3">
                  {done ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <Circle className={cn("w-4 h-4 shrink-0", current ? "text-primary animate-pulse" : "text-muted-foreground/40")} />
                  )}
                  <span className={cn("text-sm", done ? "text-foreground font-medium" : current ? "text-foreground" : "text-muted-foreground")}>
                    {step}
                  </span>
                  {current && !done && (
                    <Badge variant="outline" className="ml-auto text-[10px] bg-primary/10 text-primary border-primary/30">In progress</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 md:p-6 flex flex-col">
          <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> Compliance & renewals
          </h3>
          {service.type === "recurring" && service.current_period_end ? (
            <>
              <div className="rounded-xl border border-border bg-secondary/30 p-4 mb-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium">Annual compliance</p>
                  <Badge variant="outline" className={cn("text-[10px]", d !== null && d <= 14 ? "bg-yellow-500/15 text-yellow-700 border-yellow-500/30" : "")}>
                    {d !== null ? `${d}d remaining` : "—"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Renews on {new Date(service.current_period_end).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Auto-renew: <span className="font-semibold text-foreground">{service.auto_renew ? "On" : "Off"}</span>
                </p>
              </div>
              <Button asChild variant="outline" className="rounded-full mt-auto">
                <Link to="/account/services/recurring">Manage subscription</Link>
              </Button>
            </>
          ) : (
            <div className="text-sm text-muted-foreground flex-1 flex items-center justify-center text-center">
              No recurring renewal on this package.
            </div>
          )}
          {service.invoice_number && (
            <Button asChild variant="ghost" size="sm" className="mt-3 self-start">
              <Link to={`/invoice/${service.invoice_number}`}>
                <FileText className="w-3.5 h-3.5 mr-1" /> View invoice
              </Link>
            </Button>
          )}
        </section>
      </div>
    </div>
  );
};

const InfoRow = ({
  label, value, icon: Icon, onCopy, multiline,
}: { label: string; value: string; icon?: any; onCopy?: () => void; multiline?: boolean }) => (
  <div>
    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
      {Icon && <Icon className="w-3 h-3" />} {label}
    </p>
    <div className="flex items-start gap-2">
      <p className={cn("font-medium text-foreground/90 flex-1 min-w-0", multiline ? "whitespace-pre-wrap" : "truncate")}>
        {value}
      </p>
      {onCopy && (
        <button
          onClick={onCopy}
          className="text-muted-foreground hover:text-primary transition-colors shrink-0 mt-0.5"
          aria-label={`Copy ${label}`}
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  </div>
);

export default AccountFormation;

import { useMemo, useState } from "react";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Mail, RotateCw, Search, Building2, Repeat, ShoppingBag, Layers,
  CheckCircle2, Clock, AlertTriangle, MoreHorizontal, FileText, Calendar,
  TrendingUp, Pencil, Sparkles, X,
} from "lucide-react";
import DocumentManager from "@/components/account/DocumentManager";
import { cn } from "@/lib/utils";

const STATUSES = ["pending", "in_progress", "active", "delivered", "pending_renewal", "expired", "cancelled"] as const;
const CATEGORIES = ["all", "company_formation", "web", "marketing", "gateway", "other"] as const;

type Svc = any;

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  in_progress: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  delivered: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  pending_renewal: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  expired: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  cancelled: "bg-muted text-muted-foreground border-border",
};

const CAT_ICON: Record<string, any> = {
  company_formation: Building2,
  web: Layers,
  marketing: Sparkles,
  gateway: ShoppingBag,
  other: FileText,
};

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : "—");
const daysUntil = (d?: string | null) =>
  d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : null;

const AdminCustomerServices = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [statusTab, setStatusTab] = useState<string>("all");
  const [editing, setEditing] = useState<Svc | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-customer-services", cat],
    queryFn: () => {
      const qs = cat !== "all" ? `?category=${cat}` : "";
      return apiGet<Svc[]>(`/subscriptions${qs}`);
    },
  });

  const update = async (id: string, patch: any) => {
    try {
      await apiPatch(`/subscriptions/${id}`, patch);
      toast.success("Service updated");
      qc.invalidateQueries({ queryKey: ["admin-customer-services"] });
      setEditing(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update");
    }
  };

  const quickStatus = async (id: string, status: string) => {
    const patch: any = { status };
    if (status === "delivered") patch.delivered_at = new Date().toISOString();
    try {
      await apiPatch(`/subscriptions/${id}`, patch);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
      return;
    }
    {
      toast.success(`Marked ${status.replace("_", " ")}`);
      qc.invalidateQueries({ queryKey: ["admin-customer-services"] });
    }
  };

  const sendReminder = async (svc: Svc) => {
    const { error } = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "service-renewal-reminder",
        recipientEmail: svc.customer_email,
        templateData: {
          name: svc.customer_email.split("@")[0],
          serviceName: svc.service_name,
          renewalDate: svc.current_period_end ? new Date(svc.current_period_end).toLocaleDateString() : "",
          daysRemaining: daysUntil(svc.current_period_end) ?? 7,
          amount: `${svc.currency} ${Number(svc.price).toFixed(2)}`,
          cycle: svc.billing_cycle,
        },
      },
    });
    if (error) toast.error(error.message);
    else toast.success("Reminder sent");
  };

  const stats = useMemo(() => {
    const list = data || [];
    return {
      total: list.length,
      active: list.filter((s) => ["active", "delivered"].includes(s.status)).length,
      inProgress: list.filter((s) => ["pending", "in_progress"].includes(s.status)).length,
      renewals: list.filter((s) => {
        const d = daysUntil(s.current_period_end);
        return s.type === "recurring" && d !== null && d <= 30 && d >= 0;
      }).length,
      revenue: list.reduce((sum, s) => sum + Number(s.price || 0), 0),
    };
  }, [data]);

  const filtered = useMemo(() => {
    return (data || []).filter((s) => {
      if (statusTab !== "all" && s.status !== statusTab) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        s.customer_email?.toLowerCase().includes(q) ||
        s.service_name?.toLowerCase().includes(q) ||
        (s.invoice_number || "").toLowerCase().includes(q)
      );
    });
  }, [data, search, statusTab]);

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Hero header */}
        <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6 md:p-8 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-2">
                <Sparkles className="w-3 h-3" /> Operations Hub
              </div>
              <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight">
                Customer Services
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">
                Manage delivery, documents, renewals and auto-renew across every customer subscription.
              </p>
            </div>
            <Button
              onClick={() => qc.invalidateQueries({ queryKey: ["admin-customer-services"] })}
              variant="outline"
              className="rounded-full"
            >
              <RotateCw className="w-4 h-4 mr-1.5" /> Refresh
            </Button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Layers} label="Total services" value={stats.total} tone="default" loading={isLoading} />
          <StatCard icon={CheckCircle2} label="Active" value={stats.active} tone="emerald" loading={isLoading} />
          <StatCard icon={Clock} label="In progress" value={stats.inProgress} tone="blue" loading={isLoading} />
          <StatCard icon={AlertTriangle} label="Renew ≤ 30d" value={stats.renewals} tone="amber" loading={isLoading} />
        </div>

        {/* Toolbar */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by email, service, invoice…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 rounded-full bg-background"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger className="w-[200px] h-10 rounded-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">
                    {c.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs value={statusTab} onValueChange={setStatusTab}>
            <TabsList className="bg-secondary/50 h-auto p-1 flex-wrap">
              <TabsTrigger value="all" className="rounded-full">All</TabsTrigger>
              {STATUSES.map((s) => (
                <TabsTrigger key={s} value={s} className="rounded-full capitalize">
                  {s.replace("_", " ")}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* List */}
        <div className="space-y-2">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center">
              <Layers className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">No services match your filters</p>
              <p className="text-sm text-muted-foreground mt-1">Try clearing the search or switching tabs.</p>
            </div>
          ) : (
            filtered.map((s) => (
              <ServiceRow
                key={s.id}
                svc={s}
                onEdit={() => setEditing(s)}
                onReminder={() => sendReminder(s)}
                onQuickStatus={(st) => quickStatus(s.id, st)}
              />
            ))
          )}
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0 gap-0">
          {editing && (
            <>
              <div className="p-6 border-b border-border bg-gradient-to-br from-primary/5 to-transparent">
                <DialogHeader>
                  <DialogTitle className="font-heading text-xl">{editing.service_name}</DialogTitle>
                  <DialogDescription className="flex flex-wrap gap-2 items-center pt-1">
                    <span className="font-mono text-xs">{editing.customer_email}</span>
                    <span className="text-muted-foreground">·</span>
                    <Badge variant="outline" className="capitalize">
                      {editing.category?.replace("_", " ")}
                    </Badge>
                    <Badge variant="outline" className={cn("capitalize", STATUS_STYLES[editing.status])}>
                      {editing.status?.replace("_", " ")}
                    </Badge>
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="p-6 space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</label>
                    <Select
                      value={editing.status}
                      onValueChange={(v) => setEditing({ ...editing, status: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {editing.type === "recurring" && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Next renewal
                      </label>
                      <Input
                        type="date"
                        value={editing.current_period_end ? editing.current_period_end.slice(0, 10) : ""}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            current_period_end: e.target.value ? new Date(e.target.value).toISOString() : null,
                          })
                        }
                      />
                    </div>
                  )}
                </div>

                {editing.type === "recurring" && (
                  <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">Auto-renew</p>
                      <p className="text-xs text-muted-foreground">
                        Automatically charge the customer at the next renewal date.
                      </p>
                    </div>
                    <Switch
                      checked={!!editing.auto_renew}
                      onCheckedChange={(v) => setEditing({ ...editing, auto_renew: v })}
                    />
                  </div>
                )}

                <Button
                  onClick={() =>
                    update(editing.id, {
                      status: editing.status,
                      current_period_end: editing.current_period_end,
                      auto_renew: editing.auto_renew,
                    })
                  }
                  className="w-full"
                  size="lg"
                >
                  <RotateCw className="w-4 h-4 mr-1.5" /> Save changes
                </Button>

                {editing.category === "company_formation" && (
                  <div className="pt-5 border-t border-border space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-semibold flex items-center gap-1.5">
                          <FileText className="w-4 h-4" /> Formation documents
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Drag & drop to upload. Each upload marks the slot Completed and notifies the customer.
                        </p>
                      </div>
                    </div>
                    <DocumentManager serviceId={editing.id} variant="admin" editable />
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
};

/* ---------- sub-components ---------- */

const StatCard = ({
  icon: Icon, label, value, tone, loading,
}: { icon: any; label: string; value: number | string; tone: "default" | "emerald" | "blue" | "amber"; loading?: boolean }) => {
  const toneMap: Record<string, string> = {
    default: "bg-primary/10 text-primary",
    emerald: "bg-emerald-500/10 text-emerald-600",
    blue: "bg-blue-500/10 text-blue-600",
    amber: "bg-amber-500/10 text-amber-600",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", toneMap[tone])}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-2">
        {loading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold tabular-nums">{value}</p>}
      </div>
    </div>
  );
};

const ServiceRow = ({
  svc, onEdit, onReminder, onQuickStatus,
}: { svc: Svc; onEdit: () => void; onReminder: () => void; onQuickStatus: (s: string) => void }) => {
  const Icon = CAT_ICON[svc.category] || FileText;
  const days = daysUntil(svc.current_period_end);
  const renewSoon = svc.type === "recurring" && days !== null && days <= 14;

  return (
    <div className="group rounded-2xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-md transition-all">
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center text-primary shrink-0">
          <Icon className="w-5 h-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold truncate">{svc.service_name}</p>
            <Badge variant="outline" className={cn("capitalize text-[10px] h-5", STATUS_STYLES[svc.status])}>
              {svc.status?.replace("_", " ")}
            </Badge>
            {svc.type === "recurring" && (
              <Badge variant="outline" className="text-[10px] h-5 gap-1">
                <Repeat className="w-3 h-3" /> {svc.billing_cycle}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
            <span className="truncate">{svc.customer_email}</span>
            {svc.invoice_number && (
              <>
                <span>·</span>
                <span className="font-mono">{svc.invoice_number}</span>
              </>
            )}
            {svc.type === "recurring" && (
              <>
                <span>·</span>
                <span className={cn("flex items-center gap-1", renewSoon && "text-amber-600 font-medium")}>
                  <Calendar className="w-3 h-3" />
                  {days !== null ? `Renews in ${days}d` : "no renewal date"}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="hidden md:flex flex-col items-end shrink-0">
          <p className="text-sm font-semibold tabular-nums">
            {svc.currency} {Number(svc.price).toFixed(2)}
          </p>
          <p className="text-[11px] text-muted-foreground">{fmtDate(svc.created_at)}</p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button size="sm" variant="outline" className="rounded-full" onClick={onEdit}>
            <Pencil className="w-3.5 h-3.5 mr-1" /> Manage
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="rounded-full h-9 w-9">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Quick status</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onQuickStatus("in_progress")}>
                <Clock className="w-4 h-4 mr-2" /> In progress
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onQuickStatus("active")}>
                <TrendingUp className="w-4 h-4 mr-2" /> Active
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onQuickStatus("delivered")}>
                <CheckCircle2 className="w-4 h-4 mr-2" /> Delivered
              </DropdownMenuItem>
              {svc.type === "recurring" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onReminder}>
                    <Mail className="w-4 h-4 mr-2" /> Send renewal reminder
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

export default AdminCustomerServices;

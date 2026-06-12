import { useState } from "react";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/integrations/db/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, FileText, Download, CheckCircle2, XCircle, ChevronDown, ChevronRight, Pencil } from "lucide-react";
import { toast } from "sonner";

const fmt = (n: number, cur = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(Number(n) || 0);

const AdminFlexPay = () => {
  return (
    <SuperAdminLayout>
      <div className="mb-6">
        <h1 className="font-heading text-2xl md:text-3xl font-bold">FlexPay</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage financing settings, applications, KYC and EMI accounts.</p>
      </div>
      <Tabs defaultValue="tracking" className="w-full">
        <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full md:w-auto">
          <TabsTrigger value="tracking">Tracking</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="accounts">Credit Accounts</TabsTrigger>
          <TabsTrigger value="cards">Virtual Cards</TabsTrigger>
          <TabsTrigger value="plans">EMI Plans</TabsTrigger>
        </TabsList>

        <TabsContent value="tracking" className="mt-4"><TrackingTab /></TabsContent>
        <TabsContent value="settings" className="mt-4"><SettingsTab /></TabsContent>
        <TabsContent value="applications" className="mt-4"><ApplicationsTab /></TabsContent>
        <TabsContent value="accounts" className="mt-4"><AccountsTab /></TabsContent>
        <TabsContent value="cards" className="mt-4"><CardsTab /></TabsContent>
        <TabsContent value="plans" className="mt-4"><PlansTab /></TabsContent>
      </Tabs>
    </SuperAdminLayout>
  );
};

/* -------------------- Tracking -------------------- */

const TrackingTab = () => {
  const { data: accounts } = useQuery({
    queryKey: ["flexpay-tracking-accounts"],
    queryFn: async () => {
      const { data } = await db.from("flexpay_credit_accounts").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });
  const { data: installments } = useQuery({
    queryKey: ["flexpay-tracking-installments"],
    queryFn: async () => {
      const { data } = await db.from("flexpay_emi_installments").select("plan_id, amount, status, due_date");
      return data || [];
    },
  });
  const { data: plans } = useQuery({
    queryKey: ["flexpay-tracking-plans"],
    queryFn: async () => {
      const { data } = await db.from("flexpay_emi_plans").select("id, user_id, status");
      return data || [];
    },
  });

  const [search, setSearch] = useState("");

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const totalCustomers = (accounts || []).length;
  const totalLimit = (accounts || []).reduce((s: number, a: any) => s + Number(a.total_limit), 0);
  const totalUsed = (accounts || []).reduce((s: number, a: any) => s + Number(a.used_limit), 0);
  const utilization = totalLimit > 0 ? Math.round((totalUsed / totalLimit) * 100) : 0;
  const activePlans = (plans || []).filter((p: any) => p.status === "active").length;
  const outstanding = (installments || []).filter((i: any) => i.status === "pending").reduce((s: number, i: any) => s + Number(i.amount), 0);
  const overdueAmount = (installments || []).filter((i: any) => i.status === "pending" && new Date(i.due_date) < today).reduce((s: number, i: any) => s + Number(i.amount), 0);
  const overdueCount = (installments || []).filter((i: any) => i.status === "pending" && new Date(i.due_date) < today).length;
  const collected = (installments || []).filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + Number(i.amount), 0);

  const planByUser = new Map<string, number>();
  (plans || []).forEach((p: any) => planByUser.set(p.user_id, (planByUser.get(p.user_id) || 0) + 1));

  const rows = (accounts || [])
    .filter((a: any) => !search.trim() || a.email?.toLowerCase().includes(search.toLowerCase()))
    .map((a: any) => {
      const avail = Math.max(0, Number(a.total_limit) - Number(a.used_limit));
      const util = Number(a.total_limit) > 0 ? Math.round((Number(a.used_limit) / Number(a.total_limit)) * 100) : 0;
      return { ...a, available: avail, utilization: util, plan_count: planByUser.get(a.user_id) || 0 };
    });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Credit customers" value={String(totalCustomers)} hint={`${activePlans} active plans`} />
        <MetricCard label="Total credit issued" value={fmt(totalLimit)} hint={`${utilization}% utilized`} />
        <MetricCard label="Outstanding" value={fmt(outstanding)} hint={`Collected: ${fmt(collected)}`} accent />
        <MetricCard label="Overdue" value={fmt(overdueAmount)} hint={`${overdueCount} installment${overdueCount === 1 ? "" : "s"}`} danger={overdueCount > 0} />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Credit-limit customers</CardTitle>
            <CardDescription>Track utilization, plan count and account status.</CardDescription>
          </div>
          <Input placeholder="Search by email…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Limit</TableHead>
                <TableHead>Used</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Utilization</TableHead>
                <TableHead>Plans</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="text-xs">{a.email}</TableCell>
                  <TableCell>{fmt(a.total_limit, a.currency)}</TableCell>
                  <TableCell>{fmt(a.used_limit, a.currency)}</TableCell>
                  <TableCell className="font-medium">{fmt(a.available, a.currency)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden flex-1">
                        <div
                          className={"h-full " + (a.utilization > 80 ? "bg-destructive" : a.utilization > 50 ? "bg-yellow-500" : "bg-primary")}
                          style={{ width: `${a.utilization}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-9 text-right">{a.utilization}%</span>
                    </div>
                  </TableCell>
                  <TableCell>{a.plan_count}</TableCell>
                  <TableCell><Badge variant={a.status === "active" ? "default" : "secondary"} className="capitalize">{a.status}</Badge></TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No customers match.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

const MetricCard = ({ label, value, hint, accent, danger }: { label: string; value: string; hint?: string; accent?: boolean; danger?: boolean }) => (
  <Card className={danger ? "border-destructive/40 bg-destructive/5" : accent ? "border-primary/40 bg-primary/5" : ""}>
    <CardContent className="p-4">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
      <div className={"text-2xl font-bold mt-1 " + (danger ? "text-destructive" : accent ? "text-primary" : "")}>{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
    </CardContent>
  </Card>
);

/* -------------------- Settings -------------------- */

const SettingsTab = () => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["flexpay-settings-admin"],
    queryFn: async () => {
      const { data } = await db.from("flexpay_settings").select("*").eq("id", 1).maybeSingle();
      return data;
    },
  });
  const [form, setForm] = useState<any>(null);
  const f = form || data || {};
  const upd = (k: string, v: any) => setForm({ ...(form || data || {}), [k]: v });

  const save = async () => {
    const payload: any = {
      ...f,
      allowed_tenures: typeof f.allowed_tenures === "string"
        ? f.allowed_tenures.split(",").map((n: string) => Number(n.trim())).filter(Boolean)
        : f.allowed_tenures,
      paylater_terms: typeof f.paylater_terms === "string"
        ? f.paylater_terms.split(",").map((n: string) => Number(n.trim())).filter(Boolean)
        : f.paylater_terms,
      updated_at: new Date().toISOString(),
    };
    delete payload.created_at;
    const { error } = await db.from("flexpay_settings").update(payload).eq("id", 1);
    if (error) return toast.error(error.message);
    toast.success("Settings saved");
    qc.invalidateQueries({ queryKey: ["flexpay-settings-admin"] });
    qc.invalidateQueries({ queryKey: ["flexpay-settings-public"] });
  };

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <Card>
      <CardHeader><CardTitle>Global FlexPay configuration</CardTitle><CardDescription>Toggle modules, set fees and tenures.</CardDescription></CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-5">
        <Toggle label="FlexPay enabled" checked={!!f.enabled} onChange={(v) => upd("enabled", v)} />
        <Toggle label="EMI enabled" checked={!!f.emi_enabled} onChange={(v) => upd("emi_enabled", v)} />
        <Toggle label="Pay Later enabled" checked={!!f.paylater_enabled} onChange={(v) => upd("paylater_enabled", v)} />
        <Toggle label="Credit limit system" checked={!!f.credit_system_enabled} onChange={(v) => upd("credit_system_enabled", v)} />
        <Toggle label="Auto-approval enabled" checked={!!f.auto_approval_enabled} onChange={(v) => upd("auto_approval_enabled", v)} />

        <NumField label="Processing fee %" value={f.processing_fee_percent} onChange={(v) => upd("processing_fee_percent", v)} />
        <NumField label="Down payment %" value={f.down_payment_percent} onChange={(v) => upd("down_payment_percent", v)} />
        <NumField label="Late fee amount" value={f.late_fee_amount} onChange={(v) => upd("late_fee_amount", v)} />
        <NumField label="Minimum order amount" value={f.min_order_amount} onChange={(v) => upd("min_order_amount", v)} />
        <NumField label="Maximum credit limit" value={f.max_credit_limit} onChange={(v) => upd("max_credit_limit", v)} />
        <NumField label="Auto-approval max limit" value={f.auto_approval_max_limit} onChange={(v) => upd("auto_approval_max_limit", v)} />

        <div className="space-y-1.5">
          <Label>Default currency</Label>
          <Input value={f.default_currency || "USD"} onChange={(e) => upd("default_currency", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>KYC provider</Label>
          <Input value={f.kyc_provider || "manual"} onChange={(e) => upd("kyc_provider", e.target.value)} placeholder="manual | sumsub | veriff | jumio | onfido" />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>Allowed EMI tenures (months, comma-separated)</Label>
          <Input value={Array.isArray(f.allowed_tenures) ? f.allowed_tenures.join(", ") : f.allowed_tenures || ""}
            onChange={(e) => upd("allowed_tenures", e.target.value)} />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>Pay Later terms (days, comma-separated)</Label>
          <Input value={Array.isArray(f.paylater_terms) ? f.paylater_terms.join(", ") : f.paylater_terms || ""}
            onChange={(e) => upd("paylater_terms", e.target.value)} />
        </div>

        <div className="md:col-span-2 space-y-2 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Processing fee by tenure</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Per-tenure fee percentages. Used by the EMI calculator and checkout.</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => {
              const list = Array.isArray(f.tenure_fee_tiers) ? [...f.tenure_fee_tiers] : [];
              list.push({ tenure: 0, fee_percent: 0 });
              upd("tenure_fee_tiers", list);
            }}>Add tier</Button>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
            {(Array.isArray(f.tenure_fee_tiers) ? f.tenure_fee_tiers : []).map((tier: any, idx: number) => (
              <div key={idx} className="rounded-md border border-border p-3 space-y-2 bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tier {idx + 1}</span>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive"
                    onClick={() => {
                      const list = [...f.tenure_fee_tiers];
                      list.splice(idx, 1);
                      upd("tenure_fee_tiers", list);
                    }}>Remove</Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Tenure (mo)</Label>
                    <Input type="number" value={tier.tenure ?? ""} onChange={(e) => {
                      const list = [...f.tenure_fee_tiers];
                      list[idx] = { ...list[idx], tenure: Number(e.target.value) };
                      upd("tenure_fee_tiers", list);
                    }} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Fee %</Label>
                    <Input type="number" step="0.01" value={tier.fee_percent ?? ""} onChange={(e) => {
                      const list = [...f.tenure_fee_tiers];
                      list[idx] = { ...list[idx], fee_percent: Number(e.target.value) };
                      upd("tenure_fee_tiers", list);
                    }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-2 flex justify-end">
          <Button onClick={save}>Save settings</Button>
        </div>
      </CardContent>
    </Card>
  );
};

const Toggle = ({ label, checked, onChange }: any) => (
  <div className="flex items-center justify-between rounded-lg border border-border p-3">
    <Label className="cursor-pointer">{label}</Label>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

const NumField = ({ label, value, onChange }: any) => (
  <div className="space-y-1.5">
    <Label>{label}</Label>
    <Input type="number" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} />
  </div>
);

/* -------------------- Applications -------------------- */

const ApplicationsTab = () => {
  const qc = useQueryClient();
  const { data: apps } = useQuery({
    queryKey: ["flexpay-apps-admin"],
    queryFn: async () => {
      const { data } = await db.from("flexpay_credit_applications").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const [approveApp, setApproveApp] = useState<any>(null);
  const [limit, setLimit] = useState("2000");
  const [maxTenure, setMaxTenure] = useState("12");
  const [risk, setRisk] = useState("standard");
  const [docsApp, setDocsApp] = useState<any>(null);

  const reject = async (id: string) => {
    const reason = window.prompt("Rejection reason?");
    if (reason === null) return;
    const { error } = await db.from("flexpay_credit_applications")
      .update({ status: "rejected", rejection_reason: reason }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Rejected");
    qc.invalidateQueries({ queryKey: ["flexpay-apps-admin"] });
  };

  const approve = async () => {
    if (!approveApp) return;
    const { error } = await db.rpc("flexpay_approve_application", {
      _app_id: approveApp.id,
      _limit: Number(limit),
      _max_tenure: Number(maxTenure),
      _risk_rating: risk,
    });
    if (error) return toast.error(error.message);
    toast.success("Application approved and credit account created");
    setApproveApp(null);
    qc.invalidateQueries({ queryKey: ["flexpay-apps-admin"] });
    qc.invalidateQueries({ queryKey: ["flexpay-accounts-admin"] });
  };

  return (
    <Card>
      <CardHeader><CardTitle>Credit applications</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Applicant</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(apps || []).map((a: any) => (
              <TableRow key={a.id}>
                <TableCell className="font-mono text-xs font-bold">{a.reference_no || a.id.slice(0,8).toUpperCase()}</TableCell>
                <TableCell className="font-medium">{a.full_name}</TableCell>
                <TableCell className="text-xs">{a.email}</TableCell>
                <TableCell className="text-xs">{a.country || "—"}</TableCell>
                <TableCell>{fmt(a.requested_limit)}</TableCell>
                <TableCell><Badge variant={a.status === "approved" ? "default" : a.status === "rejected" ? "destructive" : "secondary"} className="capitalize">{a.status}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="secondary" onClick={() => setDocsApp(a)}>
                    <FileText className="w-3.5 h-3.5 mr-1" /> Documents
                  </Button>
                  <Button size="sm" disabled={!a.user_id || a.status === "approved"} onClick={() => { setApproveApp(a); setLimit(String(a.requested_limit)); }}>
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" disabled={a.status === "rejected"} onClick={() => reject(a.id)}>Reject</Button>
                </TableCell>
              </TableRow>
            ))}
            {(!apps || apps.length === 0) && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No applications yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>

        <Dialog open={!!approveApp} onOpenChange={(o) => !o && setApproveApp(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve credit application</DialogTitle>
              <DialogDescription>Assign a credit limit and supported tenure.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="text-sm"><strong>{approveApp?.full_name}</strong> — {approveApp?.email}</div>
              <div className="space-y-1.5"><Label>Credit limit (USD)</Label><Input type="number" value={limit} onChange={(e) => setLimit(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Max tenure (months)</Label><Input type="number" value={maxTenure} onChange={(e) => setMaxTenure(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Risk rating</Label><Input value={risk} onChange={(e) => setRisk(e.target.value)} placeholder="low | standard | high" /></div>
              {!approveApp?.user_id && <p className="text-xs text-destructive">This application has no linked user account. Ask the applicant to sign up with the same email first.</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setApproveApp(null)}>Cancel</Button>
              <Button onClick={approve} disabled={!approveApp?.user_id}>Approve</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <AdminDocumentsDialog app={docsApp} onClose={() => setDocsApp(null)} />
      </CardContent>
    </Card>
  );
};

/* -------------------- Admin documents dialog -------------------- */

const DOC_TYPES = [
  { value: "identity", label: "Identity verification (ID / Passport)" },
  { value: "address", label: "Present address verification" },
  { value: "profession", label: "Profession / employment verification" },
  { value: "income", label: "Income proof (payslip / bank statement)" },
  { value: "business", label: "Business registration" },
  { value: "other", label: "Other (specify)" },
];

const AdminDocumentsDialog = ({ app, onClose }: { app: any; onClose: () => void }) => {
  const qc = useQueryClient();
  const [picks, setPicks] = useState<Record<string, boolean>>({});
  const [customLabel, setCustomLabel] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: docs, refetch } = useQuery({
    enabled: !!app?.id,
    queryKey: ["flexpay-app-docs", app?.id],
    queryFn: async () => {
      const { data } = await db
        .from("flexpay_application_documents")
        .select("*")
        .eq("application_id", app.id)
        .order("requested_at", { ascending: false });
      return data || [];
    },
  });

  const requestDocs = async () => {
    if (!app) return;
    const selected = DOC_TYPES.filter((t) => picks[t.value]);
    if (selected.length === 0) return toast.error("Select at least one document type");
    setBusy(true);
    const rows = selected.map((t) => ({
      application_id: app.id,
      document_type: t.value,
      label: t.value === "other" ? (customLabel.trim() || "Additional document") : t.label,
      description: note.trim() || null,
      status: "requested",
    }));
    const { error } = await db.from("flexpay_application_documents").insert(rows);
    if (error) { setBusy(false); return toast.error(error.message); }

    // Email the applicant
    try {
      await db.functions.invoke("send-transactional-email", {
        body: {
          templateName: "flexpay-document-request",
          recipientEmail: app.email,
          templateData: {
            name: app.full_name,
            referenceNo: app.reference_no || app.id.slice(0, 8).toUpperCase(),
            documents: rows.map((r) => ({ label: r.label, description: r.description || undefined })),
            uploadUrl: `${window.location.origin}/account/flexpay`,
            adminNote: note.trim() || undefined,
          },
        },
      });
      toast.success("Requested and applicant notified by email");
    } catch (e: any) {
      toast.warning("Requested, but email could not be sent");
    }
    setBusy(false);
    setPicks({}); setCustomLabel(""); setNote("");
    refetch();
    qc.invalidateQueries({ queryKey: ["flexpay-apps-admin"] });
  };

  const review = async (id: string, status: "approved" | "rejected") => {
    const review_note = status === "rejected" ? window.prompt("Reason for rejection?") || "" : null;
    const { error } = await db.from("flexpay_application_documents")
      .update({ status, review_note, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "approved" ? "Approved" : "Rejected");
    refetch();
  };

  const removeReq = async (id: string) => {
    if (!confirm("Remove this document request?")) return;
    const { error } = await db.from("flexpay_application_documents").delete().eq("id", id);
    if (error) return toast.error(error.message);
    refetch();
  };

  const viewFile = async (path: string) => {
    const { data, error } = await db.storage.from("flexpay-documents").createSignedUrl(path, 300);
    if (error || !data?.signedUrl) return toast.error("Could not load file");
    window.open(data.signedUrl, "_blank");
  };

  return (
    <Dialog open={!!app} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Supporting documents</DialogTitle>
          <DialogDescription>
            Request and review verification documents for <strong>{app?.full_name}</strong> ({app?.email}).
          </DialogDescription>
        </DialogHeader>

        {/* Existing requests */}
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Existing requests</Label>
          {!docs?.length ? (
            <p className="text-sm text-muted-foreground py-2">No documents requested yet.</p>
          ) : (
            <div className="divide-y rounded-lg border">
              {docs.map((d: any) => (
                <div key={d.id} className="p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{d.label}</span>
                      <Badge variant={
                        d.status === "approved" ? "default"
                        : d.status === "rejected" ? "destructive"
                        : d.status === "uploaded" ? "secondary" : "outline"
                      } className="capitalize">{d.status}</Badge>
                      <span className="text-[10px] font-mono uppercase text-muted-foreground">{d.document_type}</span>
                    </div>
                    {d.description && <p className="text-xs text-muted-foreground mt-1">{d.description}</p>}
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Requested {new Date(d.requested_at).toLocaleString()}
                      {d.uploaded_at && <> · Uploaded {new Date(d.uploaded_at).toLocaleString()}</>}
                      {d.file_name && <> · {d.file_name}</>}
                    </p>
                    {d.review_note && <p className="text-xs text-destructive mt-1">Note: {d.review_note}</p>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {d.file_path && (
                      <Button size="icon" variant="ghost" onClick={() => viewFile(d.file_path)} title="View file">
                        <Download className="w-4 h-4" />
                      </Button>
                    )}
                    {d.status === "uploaded" && (
                      <>
                        <Button size="icon" variant="ghost" onClick={() => review(d.id, "approved")} title="Approve">
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => review(d.id, "rejected")} title="Reject">
                          <XCircle className="w-4 h-4 text-destructive" />
                        </Button>
                      </>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => removeReq(d.id)} title="Remove">
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Request more */}
        <div className="space-y-3 pt-4 border-t">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Request new documents</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {DOC_TYPES.map((t) => (
              <label key={t.value} className="flex items-start gap-2 rounded-lg border p-2.5 cursor-pointer hover:bg-muted/40">
                <Checkbox
                  checked={!!picks[t.value]}
                  onCheckedChange={(c) => setPicks((p) => ({ ...p, [t.value]: !!c }))}
                />
                <span className="text-sm leading-tight">{t.label}</span>
              </label>
            ))}
          </div>
          {picks.other && (
            <div className="space-y-1.5">
              <Label>Other document label</Label>
              <Input value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} placeholder="e.g. Tax certificate" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Note to applicant (optional)</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any specifics, e.g. recent within 3 months" rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={requestDocs} disabled={busy}>
            <Plus className="w-4 h-4 mr-1" /> Request &amp; notify
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* -------------------- Accounts -------------------- */

const AccountsTab = () => {
  const qc = useQueryClient();
  const { data: accounts } = useQuery({
    queryKey: ["flexpay-accounts-admin"],
    queryFn: async () => {
      const { data } = await db.from("flexpay_credit_accounts").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const updateField = async (id: string, patch: any) => {
    const { error } = await db.from("flexpay_credit_accounts").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    qc.invalidateQueries({ queryKey: ["flexpay-accounts-admin"] });
  };

  return (
    <Card>
      <CardHeader><CardTitle>Credit accounts</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Limit</TableHead>
              <TableHead>Used</TableHead>
              <TableHead>Available</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead>Max tenure</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(accounts || []).map((a: any) => {
              const avail = Math.max(0, Number(a.total_limit) - Number(a.used_limit));
              return (
                <TableRow key={a.id}>
                  <TableCell className="text-xs">{a.email}</TableCell>
                  <TableCell>{fmt(a.total_limit, a.currency)}</TableCell>
                  <TableCell>{fmt(a.used_limit, a.currency)}</TableCell>
                  <TableCell className="font-medium">{fmt(avail, a.currency)}</TableCell>
                  <TableCell>{a.risk_rating}</TableCell>
                  <TableCell>{a.max_tenure_months}m</TableCell>
                  <TableCell><Badge variant={a.status === "active" ? "default" : "secondary"} className="capitalize">{a.status}</Badge></TableCell>
                  <TableCell className="text-right space-x-2">
                    {a.status === "active" ? (
                      <Button size="sm" variant="outline" onClick={() => updateField(a.id, { status: "suspended" })}>Suspend</Button>
                    ) : (
                      <Button size="sm" onClick={() => updateField(a.id, { status: "active" })}>Reactivate</Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {(!accounts || accounts.length === 0) && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No credit accounts yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

/* -------------------- Plans -------------------- */

const PlansTab = () => {
  const qc = useQueryClient();
  const { data: plans } = useQuery({
    queryKey: ["flexpay-plans-admin"],
    queryFn: async () => {
      const { data } = await db.from("flexpay_emi_plans").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });
  const { data: accounts } = useQuery({
    queryKey: ["flexpay-accounts-for-plans"],
    queryFn: async () => {
      const { data } = await db.from("flexpay_credit_accounts").select("id, user_id, email, total_limit, used_limit, currency, status");
      return data || [];
    },
  });
  const planIds = (plans || []).map((p: any) => p.id);
  const { data: installments, refetch: refetchInstallments } = useQuery({
    enabled: planIds.length > 0,
    queryKey: ["flexpay-installments-admin", planIds.join(",")],
    queryFn: async () => {
      const { data } = await db.from("flexpay_emi_installments").select("*").in("plan_id", planIds).order("sequence");
      return data || [];
    },
  });

  const [openPlan, setOpenPlan] = useState<string | null>(null);
  const [usedEdit, setUsedEdit] = useState<{ accountId: string; value: string } | null>(null);
  const [editInst, setEditInst] = useState<any | null>(null);

  const refetchAll = () => {
    qc.invalidateQueries({ queryKey: ["flexpay-plans-admin"] });
    qc.invalidateQueries({ queryKey: ["flexpay-accounts-for-plans"] });
    refetchInstallments();
  };

  const saveUsedLimit = async () => {
    if (!usedEdit) return;
    const v = Number(usedEdit.value);
    if (!Number.isFinite(v) || v < 0) return toast.error("Invalid value");
    const { error } = await db.rpc("flexpay_admin_set_used_limit", { _account_id: usedEdit.accountId, _new_used_limit: v });
    if (error) return toast.error(error.message);
    toast.success("Used credit updated");
    setUsedEdit(null);
    refetchAll();
  };

  const setInstallmentStatus = async (id: string, status: string) => {
    const { error } = await db.rpc("flexpay_admin_update_installment", { _installment_id: id, _status: status });
    if (error) return toast.error(error.message);
    toast.success(`Marked ${status}`);
    refetchAll();
  };

  const saveInstallment = async () => {
    if (!editInst) return;
    const { error } = await db.rpc("flexpay_admin_update_installment", {
      _installment_id: editInst.id,
      _amount: Number(editInst.amount),
      _due_date: editInst.due_date,
      _status: editInst.status,
    });
    if (error) return toast.error(error.message);
    toast.success("Installment updated");
    setEditInst(null);
    refetchAll();
  };

  const deletePlan = async (planId: string) => {
    if (!confirm("Delete this plan and release its credit back to the user? This cannot be undone.")) return;
    const plan = (plans || []).find((p: any) => p.id === planId);
    if (!plan) return;
    const acct = (accounts || []).find((a: any) => a.user_id === plan.user_id);
    const { error: delErr } = await db.from("flexpay_emi_plans").delete().eq("id", planId);
    if (delErr) return toast.error(delErr.message);
    if (acct) {
      const newUsed = Math.max(0, Number(acct.used_limit) - Number(plan.financed_amount));
      await db.rpc("flexpay_admin_set_used_limit", { _account_id: acct.id, _new_used_limit: newUsed });
    }
    toast.success("Plan deleted and credit released");
    refetchAll();
  };

  return (
    <div className="space-y-4">
      {/* Accounts overview with used-limit editor */}
      <Card>
        <CardHeader>
          <CardTitle>User credit usage</CardTitle>
          <CardDescription>Manually edit a user's used credit limit if a transaction needs correction.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>User</TableHead>
              <TableHead>Total limit</TableHead>
              <TableHead>Used</TableHead>
              <TableHead>Available</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(accounts || []).map((a: any) => {
                const avail = Math.max(0, Number(a.total_limit) - Number(a.used_limit));
                return (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs">{a.email || `${a.user_id?.slice(0,8)}…`}</TableCell>
                    <TableCell>{fmt(a.total_limit, a.currency)}</TableCell>
                    <TableCell className="font-medium">{fmt(a.used_limit, a.currency)}</TableCell>
                    <TableCell>{fmt(avail, a.currency)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setUsedEdit({ accountId: a.id, value: String(a.used_limit) })}>
                        <Pencil className="w-3 h-3 mr-1" /> Edit used
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!accounts || accounts.length === 0) && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No accounts.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Plans + installments */}
      <Card>
        <CardHeader><CardTitle>EMI plans</CardTitle><CardDescription>Click a plan to view and edit its installments.</CardDescription></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>User</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Principal</TableHead>
                <TableHead>Financed</TableHead>
                <TableHead>Monthly</TableHead>
                <TableHead>Tenure</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(plans || []).map((p: any) => {
                const planInst = (installments || []).filter((i: any) => i.plan_id === p.id);
                const isOpen = openPlan === p.id;
                return (
                  <>
                    <TableRow key={p.id} className="cursor-pointer" onClick={() => setOpenPlan(isOpen ? null : p.id)}>
                      <TableCell>{isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</TableCell>
                      <TableCell className="text-xs">{p.user_id?.slice(0, 8)}…</TableCell>
                      <TableCell className="text-xs font-mono">{p.order_id ? p.order_id.slice(0, 8) + "…" : <span className="text-destructive">none</span>}</TableCell>
                      <TableCell>{fmt(p.principal, p.currency)}</TableCell>
                      <TableCell>{fmt(p.financed_amount, p.currency)}</TableCell>
                      <TableCell className="font-medium">{fmt(p.monthly_amount, p.currency)}</TableCell>
                      <TableCell>{p.tenure_months}m</TableCell>
                      <TableCell><Badge variant={p.status === "active" ? "default" : "secondary"} className="capitalize">{p.status}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(p.started_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="destructive" onClick={() => deletePlan(p.id)}>Delete</Button>
                      </TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow>
                        <TableCell colSpan={10} className="bg-muted/30 p-3">
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Installments</p>
                            <Table>
                              <TableHeader><TableRow>
                                <TableHead>#</TableHead>
                                <TableHead>Due</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Paid at</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow></TableHeader>
                              <TableBody>
                                {planInst.map((i: any) => (
                                  <TableRow key={i.id}>
                                    <TableCell>{i.sequence}</TableCell>
                                    <TableCell className="text-xs">{new Date(i.due_date).toLocaleDateString()}</TableCell>
                                    <TableCell>{fmt(i.amount, p.currency)}</TableCell>
                                    <TableCell><Badge variant={i.status === "paid" ? "default" : "secondary"} className="capitalize">{i.status}</Badge></TableCell>
                                    <TableCell className="text-xs">{i.paid_at ? new Date(i.paid_at).toLocaleDateString() : "—"}</TableCell>
                                    <TableCell className="text-right space-x-1">
                                      {i.status !== "paid" && <Button size="sm" variant="outline" onClick={() => setInstallmentStatus(i.id, "paid")}>Mark paid</Button>}
                                      {i.status === "paid" && <Button size="sm" variant="outline" onClick={() => setInstallmentStatus(i.id, "pending")}>Unmark</Button>}
                                      <Button size="sm" variant="outline" onClick={() => setEditInst({ ...i })}><Pencil className="w-3 h-3" /></Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                                {planInst.length === 0 && (
                                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-3 text-xs">No installments.</TableCell></TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
              {(!plans || plans.length === 0) && (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-6">No EMI plans yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!usedEdit} onOpenChange={(o) => !o && setUsedEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit used credit</DialogTitle>
            <DialogDescription>Set the user's currently-used credit amount. Use this to fix mismatches.</DialogDescription>
          </DialogHeader>
          <Input type="number" step="0.01" value={usedEdit?.value || ""} onChange={(e) => setUsedEdit(usedEdit ? { ...usedEdit, value: e.target.value } : null)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setUsedEdit(null)}>Cancel</Button>
            <Button onClick={saveUsedLimit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editInst} onOpenChange={(o) => !o && setEditInst(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit installment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Amount</Label><Input type="number" step="0.01" value={editInst?.amount ?? ""} onChange={(e) => setEditInst({ ...editInst, amount: e.target.value })} /></div>
            <div><Label>Due date</Label><Input type="date" value={editInst?.due_date ?? ""} onChange={(e) => setEditInst({ ...editInst, due_date: e.target.value })} /></div>
            <div>
              <Label>Status</Label>
              <select className="w-full border rounded-md h-10 px-3 bg-background" value={editInst?.status ?? "pending"} onChange={(e) => setEditInst({ ...editInst, status: e.target.value })}>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditInst(null)}>Cancel</Button>
            <Button onClick={saveInstallment}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* -------------------- Virtual Cards -------------------- */
const CardsTab = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: cards } = useQuery({
    queryKey: ["flexpay-admin-cards"],
    queryFn: async () => {
      const { data } = await db
        .from("flexpay_virtual_cards")
        .select("*")
        .order("issued_at", { ascending: false });
      return data || [];
    },
  });

  const counts = {
    total: cards?.length || 0,
    active: (cards || []).filter((c: any) => c.status === "active").length,
    frozen: (cards || []).filter((c: any) => c.status === "frozen").length,
    suspended: (cards || []).filter((c: any) => c.status === "suspended").length,
    replaced: (cards || []).filter((c: any) => c.status === "replaced").length,
    closed: (cards || []).filter((c: any) => c.status === "closed").length,
  };

  const filtered = (cards || []).filter((c: any) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      c.cardholder_name?.toLowerCase().includes(q) ||
      c.last4?.includes(q) ||
      c.card_number?.includes(q.replace(/\s/g, ""))
    );
  });

  const act = async (id: string, action: "freeze" | "unfreeze" | "suspend" | "close" | "reissue") => {
    try {
      if (action === "freeze" || action === "unfreeze") {
        const { error } = await db.rpc("flexpay_set_card_freeze", { _card_id: id, _freeze: action === "freeze" });
        if (error) throw error;
      } else if (action === "reissue") {
        const { error } = await db.rpc("flexpay_reissue_card", { _card_id: id });
        if (error) throw error;
      } else {
        const { error } = await db
          .from("flexpay_virtual_cards")
          .update({ status: action === "suspend" ? "suspended" : "closed", closed_at: action === "close" ? new Date().toISOString() : null })
          .eq("id", id);
        if (error) throw error;
      }
      toast.success(`Card ${action}d`);
      qc.invalidateQueries({ queryKey: ["flexpay-admin-cards"] });
    } catch (e: any) {
      toast.error(e.message || "Action failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { l: "Total", v: counts.total },
          { l: "Active", v: counts.active },
          { l: "Frozen", v: counts.frozen },
          { l: "Suspended", v: counts.suspended },
          { l: "Replaced", v: counts.replaced },
          { l: "Closed", v: counts.closed },
        ].map((s) => (
          <Card key={s.l}><CardContent className="p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.l}</div>
            <div className="text-xl font-bold">{s.v}</div>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Issued cards</CardTitle>
          <CardDescription>Search, freeze, reissue or close any FlexPay virtual card.</CardDescription>
          <div className="pt-3"><Input placeholder="Search by name or last4…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" /></div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Cardholder</TableHead>
              <TableHead>Card</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Issued</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.cardholder_name}</TableCell>
                  <TableCell className="font-mono">•••• {c.last4}</TableCell>
                  <TableCell className="font-mono text-xs">{String(c.exp_month).padStart(2,"0")}/{c.exp_year}</TableCell>
                  <TableCell className="capitalize">{c.tier}</TableCell>
                  <TableCell><Badge variant={c.status === "active" ? "default" : c.status === "frozen" ? "secondary" : "destructive"} className="capitalize">{c.status}</Badge></TableCell>
                  <TableCell className="text-xs">{new Date(c.issued_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right space-x-1">
                    {c.status === "active" && <Button size="sm" variant="outline" onClick={() => act(c.id, "freeze")}>Freeze</Button>}
                    {c.status === "frozen" && <Button size="sm" variant="outline" onClick={() => act(c.id, "unfreeze")}>Unfreeze</Button>}
                    {["active","frozen"].includes(c.status) && <Button size="sm" variant="outline" onClick={() => act(c.id, "suspend")}>Suspend</Button>}
                    {["active","frozen","suspended"].includes(c.status) && <Button size="sm" variant="outline" onClick={() => act(c.id, "reissue")}>Reissue</Button>}
                    {["active","frozen","suspended"].includes(c.status) && <Button size="sm" variant="destructive" onClick={() => act(c.id, "close")}>Close</Button>}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No cards match.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminFlexPay;

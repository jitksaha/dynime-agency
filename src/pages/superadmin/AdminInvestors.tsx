import { useMemo, useState } from "react";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Banknote, Check, FileText, Users, X, Plus, Download, UserPlus } from "lucide-react";
import { toast } from "sonner";
import ManualInvestorDialog from "@/components/admin/ManualInvestorDialog";

type Investment = {
  id: string;
  investor_id: string;
  plan_name: string;
  plan_slug: string | null;
  amount: number;
  currency: string;
  status: string;
  agreement_status: string;
  agreement_pdf_path: string | null;
  monthly_return_percent: number | null;
  bonus_percent_biannual: number | null;
  lock_period_months: number | null;
  payout_frequency: string | null;
  started_at: string | null;
  created_at: string;
  notes: string | null;
};

type Payout = {
  id: string;
  investment_id: string;
  investor_id: string;
  period_start: string | null;
  period_end: string | null;
  payout_type: string;
  amount: number;
  currency: string;
  status: string;
  paid_at: string | null;
  notes: string | null;
  statement_pdf_path: string | null;
};

type Withdrawal = {
  id: string;
  investor_id: string;
  investment_id: string | null;
  amount: number;
  currency: string;
  method: string;
  status: string;
  admin_notes: string | null;
  bank_details: any;
  created_at: string;
  processed_at: string | null;
};

type Profile = { id: string; email: string; full_name: string | null };

const fmt = (n: number | null | undefined, c = "USD") =>
  n == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: c, maximumFractionDigits: 2 }).format(Number(n));

const fmtDate = (s: string | null) => s ? new Date(s).toLocaleDateString() : "—";

const statusColor = (s: string) => {
  if (["paid", "approved", "active", "signed"].includes(s)) return "bg-emerald-500/10 text-emerald-600 border-emerald-500/30";
  if (["pending", "scheduled", "unsigned"].includes(s)) return "bg-amber-500/10 text-amber-600 border-amber-500/30";
  if (["rejected", "cancelled", "skipped"].includes(s)) return "bg-rose-500/10 text-rose-600 border-rose-500/30";
  return "bg-muted text-muted-foreground border-border";
};

const AdminInvestors = () => {
  const qc = useQueryClient();

  const investmentsQ = useQuery({
    queryKey: ["admin-investments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("investments" as any).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) as Investment[];
    },
  });
  const payoutsQ = useQuery({
    queryKey: ["admin-payouts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("investment_payouts" as any).select("*").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return (data as any[]) as Payout[];
    },
  });
  const withdrawalsQ = useQuery({
    queryKey: ["admin-withdrawals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("withdrawal_requests" as any).select("*").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return (data as any[]) as Withdrawal[];
    },
  });

  const investorIds = useMemo(() => {
    const s = new Set<string>();
    investmentsQ.data?.forEach((i) => s.add(i.investor_id));
    payoutsQ.data?.forEach((p) => s.add(p.investor_id));
    withdrawalsQ.data?.forEach((w) => s.add(w.investor_id));
    return Array.from(s);
  }, [investmentsQ.data, payoutsQ.data, withdrawalsQ.data]);

  const profilesQ = useQuery({
    queryKey: ["admin-investor-profiles", investorIds],
    enabled: investorIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id,email,full_name").in("id", investorIds);
      if (error) throw error;
      const map: Record<string, Profile> = {};
      (data ?? []).forEach((p: any) => { map[p.id] = p; });
      return map;
    },
  });

  const profileLabel = (id: string) => {
    const p = profilesQ.data?.[id];
    return p ? `${p.full_name || p.email}` : id.slice(0, 8);
  };

  // KPIs
  const kpi = useMemo(() => {
    const inv = investmentsQ.data ?? [];
    const totalRaised = inv.reduce((s, i) => s + Number(i.amount || 0), 0);
    const active = inv.filter((i) => i.status === "active").length;
    const pendingAgreements = inv.filter((i) => i.agreement_status !== "signed").length;
    const pendingWithdrawals = (withdrawalsQ.data ?? []).filter((w) => w.status === "pending").length;
    return { totalRaised, active, pendingAgreements, pendingWithdrawals };
  }, [investmentsQ.data, withdrawalsQ.data]);

  // ---- Investment actions ----
  const updateInvestment = async (id: string, patch: Partial<Investment>) => {
    const { error } = await supabase.from("investments" as any).update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["admin-investments"] });
    }
  };

  // ---- Manual investor dialog ----
  const [manualOpen, setManualOpen] = useState(false);

  // ---- Payout add ----
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [newPayout, setNewPayout] = useState<Partial<Payout>>({ payout_type: "monthly", status: "scheduled", amount: 0, currency: "USD" });
  const [payoutInvestmentId, setPayoutInvestmentId] = useState<string>("");

  const createPayout = async () => {
    const inv = investmentsQ.data?.find((i) => i.id === payoutInvestmentId);
    if (!inv) { toast.error("Pick an investment"); return; }
    if (!newPayout.amount || Number(newPayout.amount) <= 0) { toast.error("Enter amount"); return; }
    const { error } = await supabase.from("investment_payouts" as any).insert({
      investment_id: inv.id,
      investor_id: inv.investor_id,
      payout_type: newPayout.payout_type ?? "monthly",
      amount: Number(newPayout.amount),
      currency: newPayout.currency ?? inv.currency,
      status: newPayout.status ?? "scheduled",
      period_start: newPayout.period_start || null,
      period_end: newPayout.period_end || null,
      notes: newPayout.notes ?? null,
    } as any);
    if (error) toast.error(error.message);
    else {
      toast.success("Payout created");
      setPayoutOpen(false);
      setNewPayout({ payout_type: "monthly", status: "scheduled", amount: 0, currency: "USD" });
      setPayoutInvestmentId("");
      qc.invalidateQueries({ queryKey: ["admin-payouts"] });
    }
  };

  const markPayoutPaid = async (p: Payout) => {
    const { error } = await supabase
      .from("investment_payouts" as any)
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", p.id);
    if (error) toast.error(error.message);
    else { toast.success("Marked paid"); qc.invalidateQueries({ queryKey: ["admin-payouts"] }); }
  };

  // ---- Withdrawal actions ----
  const decideWithdrawal = async (w: Withdrawal, status: "approved" | "rejected" | "paid", notes?: string) => {
    const { error } = await supabase
      .from("withdrawal_requests" as any)
      .update({
        status,
        admin_notes: notes ?? w.admin_notes,
        processed_at: new Date().toISOString(),
      })
      .eq("id", w.id);
    if (error) toast.error(error.message);
    else { toast.success(`Withdrawal ${status}`); qc.invalidateQueries({ queryKey: ["admin-withdrawals"] }); }
  };

  // ---- Agreement signed URL ----
  const openAgreement = async (path: string) => {
    const { data, error } = await supabase.storage.from("investor-documents").createSignedUrl(path, 60 * 10);
    if (error || !data?.signedUrl) { toast.error("Could not open file"); return; }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Investor Management
            </h1>
            <p className="text-sm text-muted-foreground">
              Approve agreements, schedule payouts, process withdrawals, and add investors onboarded offline.
            </p>
          </div>
          <Button onClick={() => setManualOpen(true)} className="shrink-0">
            <UserPlus className="h-4 w-4 mr-1.5" /> Add manual investor
          </Button>
        </div>

        <ManualInvestorDialog
          open={manualOpen}
          onOpenChange={setManualOpen}
          onCreated={() => {
            qc.invalidateQueries({ queryKey: ["admin-investments"] });
            qc.invalidateQueries({ queryKey: ["admin-investor-profiles"] });
          }}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Total raised" value={fmt(kpi.totalRaised)} />
          <KpiCard label="Active investments" value={String(kpi.active)} />
          <KpiCard label="Pending agreements" value={String(kpi.pendingAgreements)} accent={kpi.pendingAgreements > 0} />
          <KpiCard label="Pending withdrawals" value={String(kpi.pendingWithdrawals)} accent={kpi.pendingWithdrawals > 0} />
        </div>

        <Tabs defaultValue="investments">
          <TabsList>
            <TabsTrigger value="investments">Investments</TabsTrigger>
            <TabsTrigger value="payouts">Payouts</TabsTrigger>
            <TabsTrigger value="withdrawals">
              Withdrawals
              {kpi.pendingWithdrawals > 0 && <Badge className="ml-2" variant="destructive">{kpi.pendingWithdrawals}</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* INVESTMENTS */}
          <TabsContent value="investments">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Investor</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Agreement</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {investmentsQ.isLoading && <TableRow><TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">Loading…</TableCell></TableRow>}
                    {investmentsQ.data?.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">No investments yet.</TableCell></TableRow>}
                    {investmentsQ.data?.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell>
                          <div className="font-medium text-sm">{profileLabel(i.investor_id)}</div>
                          <div className="text-xs text-muted-foreground">{profilesQ.data?.[i.investor_id]?.email ?? ""}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{i.plan_name}</div>
                          <div className="text-xs text-muted-foreground">{i.plan_slug}</div>
                        </TableCell>
                        <TableCell className="font-semibold">{fmt(i.amount, i.currency)}</TableCell>
                        <TableCell>
                          <Select value={i.status} onValueChange={(v) => updateInvestment(i.id, { status: v })}>
                            <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {["pending", "active", "completed", "cancelled"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusColor(i.agreement_status)}>{i.agreement_status}</Badge>
                          {i.agreement_pdf_path && (
                            <Button variant="link" size="sm" className="ml-1 h-auto p-0" onClick={() => openAgreement(i.agreement_pdf_path!)}>
                              <FileText className="h-3 w-3 mr-1" /> View
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fmtDate(i.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => { setPayoutInvestmentId(i.id); setNewPayout({ payout_type: "monthly", status: "scheduled", amount: Number(i.amount) * (Number(i.monthly_return_percent || 0) / 100), currency: i.currency }); setPayoutOpen(true); }}>
                            <Plus className="h-3 w-3 mr-1" /> Payout
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PAYOUTS */}
          <TabsContent value="payouts">
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base">Scheduled & paid payouts</CardTitle>
                <Button size="sm" onClick={() => setPayoutOpen(true)}><Plus className="h-4 w-4 mr-1" /> New payout</Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Investor</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payoutsQ.data?.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">No payouts yet.</TableCell></TableRow>}
                    {payoutsQ.data?.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm">{profileLabel(p.investor_id)}</TableCell>
                        <TableCell><Badge variant="outline">{p.payout_type}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fmtDate(p.period_start)} → {fmtDate(p.period_end)}</TableCell>
                        <TableCell className="font-semibold">{fmt(p.amount, p.currency)}</TableCell>
                        <TableCell><Badge variant="outline" className={statusColor(p.status)}>{p.status}</Badge></TableCell>
                        <TableCell className="text-right">
                          {p.status !== "paid" && (
                            <Button size="sm" variant="ghost" onClick={() => markPayoutPaid(p)}>
                              <Check className="h-4 w-4 mr-1 text-emerald-500" /> Mark paid
                            </Button>
                          )}
                          {p.statement_pdf_path && (
                            <Button size="sm" variant="ghost" onClick={() => openAgreement(p.statement_pdf_path!)}>
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* WITHDRAWALS */}
          <TabsContent value="withdrawals">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Investor</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawalsQ.data?.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">No withdrawal requests.</TableCell></TableRow>}
                    {withdrawalsQ.data?.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell className="text-sm">{profileLabel(w.investor_id)}</TableCell>
                        <TableCell className="font-semibold">{fmt(w.amount, w.currency)}</TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline">{w.method}</Badge>
                          {w.bank_details && Object.keys(w.bank_details).length > 0 && (
                            <div className="text-muted-foreground mt-1 max-w-[220px] truncate">
                              {Object.entries(w.bank_details).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                            </div>
                          )}
                        </TableCell>
                        <TableCell><Badge variant="outline" className={statusColor(w.status)}>{w.status}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fmtDate(w.created_at)}</TableCell>
                        <TableCell className="text-right space-x-1">
                          {w.status === "pending" && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => decideWithdrawal(w, "approved")}>
                                <Check className="h-4 w-4 mr-1" /> Approve
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => decideWithdrawal(w, "rejected")}>
                                <X className="h-4 w-4 mr-1" /> Reject
                              </Button>
                            </>
                          )}
                          {w.status === "approved" && (
                            <Button size="sm" onClick={() => decideWithdrawal(w, "paid")}>
                              <Banknote className="h-4 w-4 mr-1" /> Mark paid
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Payout dialog */}
        <Dialog open={payoutOpen} onOpenChange={setPayoutOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>New payout</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Investment</Label>
                <Select value={payoutInvestmentId} onValueChange={setPayoutInvestmentId}>
                  <SelectTrigger><SelectValue placeholder="Pick investment" /></SelectTrigger>
                  <SelectContent>
                    {investmentsQ.data?.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {profileLabel(i.investor_id)} · {i.plan_name} · {fmt(i.amount, i.currency)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Type</Label>
                  <Select value={newPayout.payout_type} onValueChange={(v) => setNewPayout({ ...newPayout, payout_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["monthly", "bonus", "profit_share", "principal", "adjustment", "fee", "penalty", "loss"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label className="text-xs">Status</Label>
                  <Select value={newPayout.status} onValueChange={(v) => setNewPayout({ ...newPayout, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["scheduled", "paid", "skipped"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label className="text-xs">Amount <span className="text-muted-foreground">(use negative for fees / penalties / loss)</span></Label>
                  <Input type="number" step="0.01" value={newPayout.amount ?? 0} onChange={(e) => setNewPayout({ ...newPayout, amount: Number(e.target.value) })} />
                </div>
                <div className="space-y-1"><Label className="text-xs">Currency</Label>
                  <Input value={newPayout.currency ?? "USD"} onChange={(e) => setNewPayout({ ...newPayout, currency: e.target.value.toUpperCase() })} />
                </div>
                <div className="space-y-1"><Label className="text-xs">Period start</Label>
                  <Input type="date" value={(newPayout.period_start as any) ?? ""} onChange={(e) => setNewPayout({ ...newPayout, period_start: e.target.value })} />
                </div>
                <div className="space-y-1"><Label className="text-xs">Period end</Label>
                  <Input type="date" value={(newPayout.period_end as any) ?? ""} onChange={(e) => setNewPayout({ ...newPayout, period_end: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1"><Label className="text-xs">Notes</Label>
                <Textarea rows={2} value={newPayout.notes ?? ""} onChange={(e) => setNewPayout({ ...newPayout, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPayoutOpen(false)}>Cancel</Button>
              <Button onClick={createPayout}>Create payout</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SuperAdminLayout>
  );
};

const KpiCard = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
  <Card className={accent ? "border-primary/40 bg-primary/5" : ""}>
    <CardContent className="p-4">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-xl font-bold ${accent ? "text-primary" : ""}`}>{value}</div>
    </CardContent>
  </Card>
);

export default AdminInvestors;

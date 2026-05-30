import { useState, useMemo, useEffect } from "react";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  ChevronDown, ChevronRight, Download, Banknote, Plus, FileDown, RefreshCw, Lock, Unlock, CheckCircle2,
  Wallet, TrendingUp, TrendingDown, Users, DollarSign, Clock, AlertCircle, Search, Loader2, FileText,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart as RPieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend, ResponsiveContainer,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { downloadPayslip, type PayslipData } from "@/lib/payslip-pdf";
import ExcelJS from "exceljs";

// ---------- types ----------
type Run = {
  id: string; period_year: number; period_month: number; currency: string;
  working_days: number; status: string; locked: boolean; totals: any;
  approved_at: string | null; paid_at: string | null; notes: string | null; created_at: string;
};
type Item = {
  id: string; run_id: string; employee_id: string; employee_name: string; department: string | null;
  designation: string | null; currency: string;
  base_salary: number; allowances_total: number; deductions_total: number;
  attendance_present: number; attendance_absent: number; attendance_late: number; overtime_hours: number;
  leave_paid_days: number; leave_unpaid_days: number; prorate_deduction: number;
  taxable_income: number; tax: number; net_pay: number; paid_amount: number; status: string;
  payment_method: string | null; paid_at: string | null; notes: string | null; breakdown: any;
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtMoney = (n: number | null | undefined, c = "USD") =>
  `${c} ${(Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
const STATUS_COLORS: Record<string, string> = {
  paid: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  processing: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  partial_paid: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  cancelled: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  draft: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  approved: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
};

// ---------- hooks ----------
function useRuns() {
  return useQuery({
    queryKey: ["payroll_runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_runs").select("*")
        .order("period_year", { ascending: false })
        .order("period_month", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as Run[];
    },
  });
}
function useItems(runId: string | null) {
  return useQuery({
    queryKey: ["payroll_items", runId],
    enabled: !!runId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_items").select("*")
        .eq("run_id", runId!).order("employee_name");
      if (error) throw error;
      return data as Item[];
    },
  });
}
function useAdjustments(itemId: string | null) {
  return useQuery({
    queryKey: ["payroll_adj", itemId],
    enabled: !!itemId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_adjustments").select("*")
        .eq("item_id", itemId!).order("created_at");
      if (error) throw error;
      return data as any[];
    },
  });
}
function useAudit(runId: string | null) {
  return useQuery({
    queryKey: ["payroll_audit", runId],
    enabled: !!runId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_audit_logs").select("*")
        .eq("run_id", runId!).order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data as any[];
    },
  });
}
function useEmployeesCount() {
  return useQuery({
    queryKey: ["employees_count_active"],
    queryFn: async () => {
      const { count } = await supabase.from("employees").select("id", { count: "exact", head: true }).eq("status", "active");
      return count ?? 0;
    },
  });
}

// ---------- main ----------
export default function AdminPayroll() {
  const qc = useQueryClient();
  const runs = useRuns();
  const empCount = useEmployeesCount();
  const today = new Date();
  const currentYear = today.getUTCFullYear();
  const currentMonth = today.getUTCMonth() + 1;
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [ensuredKey, setEnsuredKey] = useState<string | null>(null);

  // Auto-ensure current month exists & sync newly added employees (runs once per month per session).
  useEffect(() => {
    if (!runs.data) return;
    const key = `${currentYear}-${currentMonth}`;
    if (ensuredKey === key) return;
    setEnsuredKey(key);
    (async () => {
      try {
        const { data, error } = await supabase.rpc("payroll_ensure_current_month", { _currency: "USD", _working_days: 22 });
        if (error) throw error;
        await qc.invalidateQueries({ queryKey: ["payroll_runs"] });
        await qc.invalidateQueries({ queryKey: ["payroll_items"] });
        if (!selectedRunId && data) setSelectedRunId(data as string);
      } catch (e: any) {
        // Non-fatal: user can still operate manually.
        console.warn("ensure current month failed:", e?.message);
      }
    })();
  }, [runs.data, currentYear, currentMonth, ensuredKey, qc, selectedRunId]);

  // default to current month when available, otherwise most recent historical run
  useEffect(() => {
    if (!selectedRunId && runs.data && runs.data.length) {
      const current = runs.data.find(r => r.period_year === currentYear && r.period_month === currentMonth);
      setSelectedRunId((current ?? runs.data[0]).id);
    }
  }, [runs.data, selectedRunId, currentYear, currentMonth]);

  const syncCurrent = async () => {
    if (!currentRun) return;
    setSyncing(true);
    try {
      const { data, error } = await supabase.rpc("payroll_sync_run", { _run: currentRun.id });
      if (error) throw error;
      const added = Number(data ?? 0);
      toast.success(added > 0 ? `Added ${added} new employee${added === 1 ? "" : "s"} to this run` : "Already up to date");
      qc.invalidateQueries({ queryKey: ["payroll_runs"] });
      qc.invalidateQueries({ queryKey: ["payroll_items", currentRun.id] });
    } catch (e: any) {
      toast.error(e.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const currentRun = runs.data?.find(r => r.id === selectedRunId) ?? null;
  const items = useItems(selectedRunId);
  const audit = useAudit(selectedRunId);

  // filters
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [minSalary, setMinSalary] = useState<string>("");
  const [maxSalary, setMaxSalary] = useState<string>("");

  const departments = useMemo(() => {
    const set = new Set((items.data ?? []).map(i => i.department).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [items.data]);

  const filteredItems = useMemo(() => {
    return (items.data ?? []).filter(it => {
      if (search && !it.employee_name.toLowerCase().includes(search.toLowerCase())) return false;
      if (deptFilter !== "all" && it.department !== deptFilter) return false;
      if (statusFilter !== "all" && it.status !== statusFilter) return false;
      if (minSalary && it.net_pay < Number(minSalary)) return false;
      if (maxSalary && it.net_pay > Number(maxSalary)) return false;
      return true;
    });
  }, [items.data, search, deptFilter, statusFilter, minSalary, maxSalary]);

  // KPIs computed from current run + history
  const kpi = useMemo(() => {
    const t = currentRun?.totals ?? {};
    const allRuns = runs.data ?? [];
    const cur = allRuns[0];
    const prev = allRuns[1];
    const growth = cur && prev && (prev.totals?.net ?? 0) > 0
      ? (((cur.totals?.net ?? 0) - (prev.totals?.net ?? 0)) / (prev.totals?.net ?? 1)) * 100
      : 0;
    return {
      totalCost: Number(t.net ?? 0) + Number(t.tax ?? 0) + Number(t.deductions ?? 0),
      totalPaid: Number(t.paid ?? 0),
      pending: Number(t.pending ?? 0),
      employees: Number(t.employee_count ?? 0),
      avgSalary: t.employee_count ? Number(t.net ?? 0) / Number(t.employee_count) : 0,
      totalAllowances: Number(t.allowances ?? 0),
      totalDeductions: Number(t.deductions ?? 0),
      growth,
    };
  }, [currentRun, runs.data]);

  // chart data — monthly trend last 24, dept distribution from current items, since-2020 trend
  const monthlyTrend = useMemo(() => {
    const sorted = [...(runs.data ?? [])].sort(
      (a, b) => a.period_year - b.period_year || a.period_month - b.period_month
    );
    return sorted.slice(-24).map(r => ({
      label: `${MONTHS[r.period_month - 1]} ${String(r.period_year).slice(2)}`,
      net: Number(r.totals?.net ?? 0),
      tax: Number(r.totals?.tax ?? 0),
      allowances: Number(r.totals?.allowances ?? 0),
      deductions: Number(r.totals?.deductions ?? 0),
    }));
  }, [runs.data]);
  const trendSince2020 = useMemo(() => {
    const sorted = [...(runs.data ?? [])].sort(
      (a, b) => a.period_year - b.period_year || a.period_month - b.period_month
    );
    return sorted.map(r => ({
      label: `${r.period_year}-${String(r.period_month).padStart(2, "0")}`,
      net: Number(r.totals?.net ?? 0),
    }));
  }, [runs.data]);
  const deptDist = useMemo(() => {
    const m = new Map<string, number>();
    (items.data ?? []).forEach(it => m.set(it.department || "Other", (m.get(it.department || "Other") ?? 0) + it.net_pay));
    return Array.from(m.entries()).map(([name, value]) => ({ name, value }));
  }, [items.data]);
  const COLORS = ["hsl(var(--primary))","hsl(var(--chart-2,200_70%_50%))","hsl(var(--accent))","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#ec4899","#84cc16"];

  // ---------- actions ----------
  const seed = async () => {
    if (!confirm("Seed full payroll history from Jan 2020 → current month for all active employees? This is idempotent.")) return;
    setSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke("payroll-history-seed", { body: {} });
      if (error) throw error;
      toast.success(`Seeded ${data?.months ?? "?"} months of payroll`);
      qc.invalidateQueries({ queryKey: ["payroll_runs"] });
    } catch (e: any) {
      toast.error(e.message || "Seed failed");
    } finally {
      setSeeding(false);
    }
  };

  const [genYear, setGenYear] = useState(currentYear);
  const [genMonth, setGenMonth] = useState(currentMonth);
  const [genDays, setGenDays] = useState(22);
  const isFutureGenerate = genYear > currentYear || (genYear === currentYear && genMonth > currentMonth);

  const generate = async () => {
    if (isFutureGenerate) {
      toast.error("Future payroll periods are blocked. Generate only up to the current month.");
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.rpc("payroll_generate_run", {
        _year: genYear, _month: genMonth, _currency: "USD",
        _working_days: genDays, _employee_ids: null, _replace: true,
      });
      if (error) throw error;
      toast.success("Run generated");
      await qc.invalidateQueries({ queryKey: ["payroll_runs"] });
      setSelectedRunId(data as string);
    } catch (e: any) { toast.error(e.message); }
    finally { setGenerating(false); }
  };

  const approveRun = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.rpc("payroll_approve_run", { _run: id }); if (error) throw error; },
    onSuccess: () => { toast.success("Run approved"); qc.invalidateQueries({ queryKey: ["payroll_runs"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const markPaidAll = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.rpc("payroll_mark_paid", { _run: id, _item_ids: null, _method: "bank" }); if (error) throw error; },
    onSuccess: () => { toast.success("Marked paid"); qc.invalidateQueries({ queryKey: ["payroll_runs"] }); qc.invalidateQueries({ queryKey: ["payroll_items"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const markPaidOne = useMutation({
    mutationFn: async (item: Item) => { const { error } = await supabase.rpc("payroll_mark_paid", { _run: item.run_id, _item_ids: [item.id], _method: "bank" }); if (error) throw error; },
    onSuccess: () => { toast.success("Paid"); qc.invalidateQueries({ queryKey: ["payroll_runs"] }); qc.invalidateQueries({ queryKey: ["payroll_items"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const cancelItem = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.rpc("payroll_cancel_item", { _item: id, _reason: "Cancelled by admin" }); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payroll_items"] }); qc.invalidateQueries({ queryKey: ["payroll_runs"] }); toast.success("Cancelled"); },
    onError: (e: any) => toast.error(e.message),
  });
  const lockRun = useMutation({
    mutationFn: async ({ id, lock }: { id: string; lock: boolean }) => { const { error } = await supabase.rpc("payroll_lock_run", { _run: id, _lock: lock }); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payroll_runs"] }); toast.success("Updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  // ---------- exports ----------
  const rowsToCsv = (rows: Record<string, unknown>[]) => {
    if (!rows.length) return "";
    const headers = Object.keys(rows[0]);
    const escape = (v: unknown) => JSON.stringify(v ?? "");
    return [headers.join(","), ...rows.map(r => headers.map(h => escape(r[h])).join(","))].join("\n");
  };
  const downloadCsv = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  };
  const exportItemsCsv = () => {
    const rows = filteredItems.map(i => ({
      Employee: i.employee_name, Department: i.department, Designation: i.designation,
      Currency: i.currency, Base: i.base_salary, Allowances: i.allowances_total,
      Deductions: i.deductions_total, Present: i.attendance_present, Absent: i.attendance_absent,
      Late: i.attendance_late, Overtime: i.overtime_hours, PaidLeave: i.leave_paid_days,
      UnpaidLeave: i.leave_unpaid_days, Prorate: i.prorate_deduction, Tax: i.tax,
      Net: i.net_pay, Paid: i.paid_amount, Status: i.status, PaymentMethod: i.payment_method,
    }));
    downloadCsv(rowsToCsv(rows), `payroll-${currentRun?.period_year}-${String(currentRun?.period_month).padStart(2, "0")}.csv`);
  };
  const exportItemsXlsx = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Payroll");
    if (filteredItems.length > 0) {
      worksheet.columns = Object.keys(filteredItems[0]).map(key => ({ header: key, key }));
      worksheet.addRows(filteredItems as Record<string, unknown>[]);
    }
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `payroll-${currentRun?.period_year}-${String(currentRun?.period_month).padStart(2, "0")}.xlsx`;
    a.click();
  };
  const exportRunsCsv = () => {
    const rows = (runs.data ?? []).map(r => ({
      Period: `${r.period_year}-${String(r.period_month).padStart(2, "0")}`,
      Status: r.status, Currency: r.currency, WorkingDays: r.working_days,
      Employees: r.totals?.employee_count ?? 0, Gross: r.totals?.gross ?? 0,
      Allowances: r.totals?.allowances ?? 0, Deductions: r.totals?.deductions ?? 0,
      Tax: r.totals?.tax ?? 0, Net: r.totals?.net ?? 0, Paid: r.totals?.paid ?? 0, Pending: r.totals?.pending ?? 0,
    }));
    downloadCsv(rowsToCsv(rows), "payroll-runs.csv");
  };

  const downloadPayslipFor = async (item: Item) => {
    const { data: adj } = await supabase.from("payroll_adjustments").select("*").eq("item_id", item.id);
    const allowances = (adj ?? []).filter(a => a.category === "allowance").map(a => ({ label: a.label, amount: Number(a.amount) }));
    const deductions = (adj ?? []).filter(a => a.category === "deduction").map(a => ({ label: a.label, amount: Number(a.amount) }));
    const data: PayslipData = {
      company: { name: "Dynime" },
      payslip_number: `PSL-${currentRun?.period_year}${String(currentRun?.period_month).padStart(2,"0")}-${item.id.slice(0,6).toUpperCase()}`,
      period: { year: currentRun!.period_year, month: currentRun!.period_month },
      employee: { name: item.employee_name, designation: item.designation ?? undefined, department: item.department ?? undefined },
      currency: item.currency,
      base_salary: Number(item.base_salary),
      allowances: allowances.length ? allowances : [{ label: "Allowances (total)", amount: Number(item.allowances_total) }],
      deductions: deductions.length ? deductions : (Number(item.deductions_total) > 0 ? [{ label: "Deductions (total)", amount: Number(item.deductions_total) }] : []),
      attendance: {
        present: Number(item.attendance_present), absent: Number(item.attendance_absent), late: Number(item.attendance_late),
        leave_paid: Number(item.leave_paid_days), leave_unpaid: Number(item.leave_unpaid_days), overtime_hours: Number(item.overtime_hours),
      },
      prorate_deduction: Number(item.prorate_deduction),
      tax: Number(item.tax),
      net_pay: Number(item.net_pay),
      paid_amount: Number(item.paid_amount),
      status: item.status,
    };
    downloadPayslip(data);
  };

  return (
    <SuperAdminLayout>
      <TooltipProvider>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Banknote className="h-6 w-6 text-primary" /> Payroll</h1>
            <p className="text-sm text-muted-foreground">
              {empCount.data ?? 0} active employees · {runs.data?.length ?? 0} monthly runs since 2020
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedRunId ?? ""} onValueChange={setSelectedRunId}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Pick period" /></SelectTrigger>
              <SelectContent className="max-h-[400px]">
                {(runs.data ?? []).length === 0 && <SelectItem value="empty" disabled>No payroll history yet</SelectItem>}
                {(runs.data ?? []).map(r => (
                  <SelectItem key={r.id} value={r.id}>
                    {MONTHS[r.period_month - 1]} {r.period_year} · {r.status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => qc.invalidateQueries()}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline"><FileDown className="h-4 w-4 mr-2" />Export</Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportItemsCsv}>Current items (CSV)</DropdownMenuItem>
                <DropdownMenuItem onClick={exportItemsXlsx}>Current items (Excel)</DropdownMenuItem>
                <DropdownMenuItem onClick={exportRunsCsv}>All runs (CSV)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={seed} disabled={seeding} variant="secondary">
              {seeding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Seed history
            </Button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total payroll cost", value: fmtMoney(kpi.totalCost), icon: Wallet, color: "text-primary" },
            { label: "Total paid", value: fmtMoney(kpi.totalPaid), icon: CheckCircle2, color: "text-emerald-500" },
            { label: "Pending", value: fmtMoney(kpi.pending), icon: Clock, color: "text-amber-500" },
            { label: "Employees paid", value: String(kpi.employees), icon: Users, color: "text-sky-500" },
            { label: "Avg net salary", value: fmtMoney(kpi.avgSalary), icon: DollarSign, color: "text-violet-500" },
            { label: "Total allowances", value: fmtMoney(kpi.totalAllowances), icon: TrendingUp, color: "text-emerald-500" },
            { label: "Total deductions", value: fmtMoney(kpi.totalDeductions), icon: TrendingDown, color: "text-rose-500" },
            { label: "Growth vs prev", value: `${kpi.growth >= 0 ? "+" : ""}${kpi.growth.toFixed(1)}%`, icon: kpi.growth >= 0 ? TrendingUp : TrendingDown, color: kpi.growth >= 0 ? "text-emerald-500" : "text-rose-500" },
          ].map((c) => (
            <Card key={c.label} className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">{c.label}</div>
                <c.icon className={`h-4 w-4 ${c.color}`} />
              </div>
              <div className="mt-2 text-xl font-bold">{c.value}</div>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="text-sm font-semibold mb-2">Monthly payroll cost (last 24 months)</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="label" fontSize={10} />
                <YAxis fontSize={10} />
                <RTooltip />
                <Bar dataKey="net" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card className="p-4">
            <div className="text-sm font-semibold mb-2">Department-wise salary distribution</div>
            <ResponsiveContainer width="100%" height={240}>
              <RPieChart>
                <Pie data={deptDist} dataKey="value" nameKey="name" outerRadius={90} label={(e) => e.name}>
                  {deptDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <RTooltip formatter={(v: any) => fmtMoney(v)} />
              </RPieChart>
            </ResponsiveContainer>
          </Card>
          <Card className="p-4">
            <div className="text-sm font-semibold mb-2">Salary trend since 2020</div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={trendSince2020}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="label" fontSize={9} interval={Math.max(1, Math.floor(trendSince2020.length / 12))} />
                <YAxis fontSize={10} />
                <RTooltip />
                <Area type="monotone" dataKey="net" stroke="hsl(var(--primary))" fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
          <Card className="p-4">
            <div className="text-sm font-semibold mb-2">Allowances vs deductions</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="label" fontSize={10} />
                <YAxis fontSize={10} />
                <RTooltip />
                <Legend />
                <Bar dataKey="allowances" fill="#10b981" />
                <Bar dataKey="deductions" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="current">
          <TabsList>
            <TabsTrigger value="current">Current period</TabsTrigger>
            <TabsTrigger value="runs">All runs</TabsTrigger>
            <TabsTrigger value="generate">Generate</TabsTrigger>
            <TabsTrigger value="audit">Audit log</TabsTrigger>
          </TabsList>

          {/* Current period */}
          <TabsContent value="current" className="space-y-4">
            {/* Run summary */}
            {currentRun && (
              <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Badge className={STATUS_COLORS[currentRun.status]}>{currentRun.status}</Badge>
                  <div className="text-sm">
                    <span className="font-semibold">{MONTHS[currentRun.period_month - 1]} {currentRun.period_year}</span>
                    <span className="text-muted-foreground"> · {currentRun.working_days} working days · {currentRun.currency}</span>
                  </div>
                  {currentRun.locked && <Badge variant="outline"><Lock className="h-3 w-3 mr-1" />Locked</Badge>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {currentRun.status === "draft" && (
                    <Button size="sm" onClick={() => approveRun.mutate(currentRun.id)}>Approve</Button>
                  )}
                  {(currentRun.status === "approved" || currentRun.status === "partial_paid") && (
                    <Button size="sm" onClick={() => markPaidAll.mutate(currentRun.id)}>Mark all paid</Button>
                  )}
                  {!currentRun.locked && (
                    <Button size="sm" variant="outline" onClick={syncCurrent} disabled={syncing} title="Add newly hired employees to this run without touching existing items">
                      {syncing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                      Sync new employees
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => lockRun.mutate({ id: currentRun.id, lock: !currentRun.locked })}>
                    {currentRun.locked ? <><Unlock className="h-4 w-4 mr-1" />Unlock</> : <><Lock className="h-4 w-4 mr-1" />Lock</>}
                  </Button>
                </div>
              </Card>
            )}

            {/* Filters */}
            <Card className="p-3">
              <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                <div className="md:col-span-2 relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-8" placeholder="Search employee…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Select value={deptFilter} onValueChange={setDeptFilter}>
                  <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All departments</SelectItem>
                    {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All status</SelectItem>
                    {["paid","pending","partial_paid","cancelled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input placeholder="Min net" value={minSalary} onChange={e => setMinSalary(e.target.value)} type="number" />
                <Input placeholder="Max net" value={maxSalary} onChange={e => setMaxSalary(e.target.value)} type="number" />
              </div>
            </Card>

            {/* Items table */}
            <Card className="overflow-hidden">
              {items.isLoading ? (
                <div className="p-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Loading…</div>
              ) : filteredItems.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No payroll items. {(runs.data ?? []).length === 0 && <span>Click <b>Seed history</b> above to populate 2020 → today.</span>}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs">
                      <tr>
                        <th className="text-left p-3 w-8"></th>
                        <th className="text-left p-3">Employee</th>
                        <th className="text-left p-3">Department</th>
                        <th className="text-right p-3">Base</th>
                        <th className="text-right p-3">Allow.</th>
                        <th className="text-right p-3">Deduct.</th>
                        <th className="text-right p-3">Net</th>
                        <th className="text-center p-3">Status</th>
                        <th className="text-right p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map(it => (
                        <ItemRow
                          key={it.id}
                          item={it}
                          expanded={expanded === it.id}
                          onToggle={() => setExpanded(expanded === it.id ? null : it.id)}
                          onPay={() => markPaidOne.mutate(it)}
                          onCancel={() => cancelItem.mutate(it.id)}
                          onPayslip={() => downloadPayslipFor(it)}
                          run={currentRun}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* All runs */}
          <TabsContent value="runs">
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs">
                  <tr>
                    <th className="text-left p-3">Period</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-right p-3">Employees</th>
                    <th className="text-right p-3">Gross</th>
                    <th className="text-right p-3">Net</th>
                    <th className="text-right p-3">Paid</th>
                    <th className="text-right p-3">Pending</th>
                    <th className="text-right p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {(runs.data ?? []).map(r => (
                    <tr key={r.id} className="border-t hover:bg-muted/30">
                      <td className="p-3 font-medium">{MONTHS[r.period_month - 1]} {r.period_year}</td>
                      <td className="p-3"><Badge className={STATUS_COLORS[r.status]}>{r.status}</Badge>{r.locked && <Lock className="h-3 w-3 ml-1 inline" />}</td>
                      <td className="p-3 text-right">{r.totals?.employee_count ?? 0}</td>
                      <td className="p-3 text-right">{fmtMoney(r.totals?.gross, r.currency)}</td>
                      <td className="p-3 text-right font-semibold">{fmtMoney(r.totals?.net, r.currency)}</td>
                      <td className="p-3 text-right text-emerald-600">{fmtMoney(r.totals?.paid, r.currency)}</td>
                      <td className="p-3 text-right text-amber-600">{fmtMoney(r.totals?.pending, r.currency)}</td>
                      <td className="p-3 text-right">
                        <Button size="sm" variant="ghost" onClick={() => setSelectedRunId(r.id)}>Open</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </TabsContent>

          {/* Generate */}
          <TabsContent value="generate">
            <Card className="p-4 max-w-xl space-y-3">
              <div>
                <h3 className="font-semibold">Generate payroll run</h3>
                <p className="text-sm text-muted-foreground">Creates or regenerates payroll from existing employee salary, attendance, and leave records. Future months are blocked.</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>Year</Label>
                  <Input type="number" value={genYear} onChange={e => setGenYear(Number(e.target.value))} />
                </div>
                <div>
                  <Label>Month</Label>
                  <Select value={String(genMonth)} onValueChange={v => setGenMonth(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m, i) => {
                        const monthValue = i + 1;
                        const future = genYear === currentYear && monthValue > currentMonth;
                        return <SelectItem key={m} value={String(monthValue)} disabled={future}>{m}{future ? " · future" : ""}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Working days</Label>
                  <Input type="number" value={genDays} onChange={e => setGenDays(Number(e.target.value))} />
                </div>
              </div>
              <Button onClick={generate} disabled={generating}>
                {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Generate / Regenerate
              </Button>
              {isFutureGenerate && <p className="text-xs text-destructive">Future payroll periods cannot be generated before that month starts.</p>}
            </Card>
          </TabsContent>

          {/* Audit */}
          <TabsContent value="audit">
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs">
                  <tr>
                    <th className="text-left p-3">Time</th>
                    <th className="text-left p-3">Action</th>
                    <th className="text-left p-3">Payload</th>
                  </tr>
                </thead>
                <tbody>
                  {(audit.data ?? []).map(a => (
                    <tr key={a.id} className="border-t">
                      <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(a.created_at).toLocaleString()}</td>
                      <td className="p-3"><Badge variant="outline">{a.action}</Badge></td>
                      <td className="p-3 font-mono text-xs text-muted-foreground max-w-[600px] truncate">{JSON.stringify(a.payload)}</td>
                    </tr>
                  ))}
                  {(audit.data ?? []).length === 0 && (
                    <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">No audit events for this run.</td></tr>
                  )}
                </tbody>
              </table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      </TooltipProvider>
    </SuperAdminLayout>
  );
}

// ---------- expandable row ----------
function ItemRow({ item, expanded, onToggle, onPay, onCancel, onPayslip, run }: {
  item: Item; expanded: boolean; onToggle: () => void; onPay: () => void; onCancel: () => void;
  onPayslip: () => void; run: Run | null;
}) {
  const adj = useAdjustments(expanded ? item.id : null);
  return (
    <>
      <tr className="border-t hover:bg-muted/30 cursor-pointer" onClick={onToggle}>
        <td className="p-3">{expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</td>
        <td className="p-3 font-medium">{item.employee_name}<div className="text-xs text-muted-foreground">{item.designation}</div></td>
        <td className="p-3 text-xs">{item.department}</td>
        <td className="p-3 text-right">{fmtMoney(item.base_salary, item.currency)}</td>
        <td className="p-3 text-right text-emerald-600">+{fmtMoney(item.allowances_total, item.currency)}</td>
        <td className="p-3 text-right text-rose-600">-{fmtMoney(item.deductions_total + item.prorate_deduction, item.currency)}</td>
        <td className="p-3 text-right font-bold">{fmtMoney(item.net_pay, item.currency)}</td>
        <td className="p-3 text-center"><Badge className={STATUS_COLORS[item.status]}>{item.status}</Badge></td>
        <td className="p-3 text-right" onClick={e => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button size="sm" variant="ghost">•••</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {item.status !== "paid" && <DropdownMenuItem onClick={onPay}>Mark paid</DropdownMenuItem>}
              <DropdownMenuItem onClick={onPayslip}><FileText className="h-4 w-4 mr-2" />Download payslip</DropdownMenuItem>
              {item.status !== "cancelled" && <DropdownMenuItem onClick={onCancel} className="text-rose-600">Cancel item</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-muted/20">
          <td colSpan={9} className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-3">
                <div className="text-xs font-semibold mb-2">Breakdown</div>
                <Row label="Base" v={fmtMoney(item.base_salary, item.currency)} />
                <Row label="Allowances" v={fmtMoney(item.allowances_total, item.currency)} pos />
                <Row label="Deductions" v={fmtMoney(item.deductions_total, item.currency)} neg />
                <Row label="Prorate" v={fmtMoney(item.prorate_deduction, item.currency)} neg />
                <Row label="Tax" v={fmtMoney(item.tax, item.currency)} neg />
                <div className="border-t mt-2 pt-2 flex justify-between"><b>Net</b><b>{fmtMoney(item.net_pay, item.currency)}</b></div>
              </Card>
              <Card className="p-3">
                <div className="text-xs font-semibold mb-2">Attendance</div>
                <Row label="Present" v={String(item.attendance_present)} />
                <Row label="Absent" v={String(item.attendance_absent)} />
                <Row label="Late" v={String(item.attendance_late)} />
                <Row label="Overtime (hrs)" v={String(item.overtime_hours)} />
                <Row label="Paid leave" v={String(item.leave_paid_days)} />
                <Row label="Unpaid leave" v={String(item.leave_unpaid_days)} />
              </Card>
              <Card className="p-3 md:col-span-2">
                <div className="text-xs font-semibold mb-2">Adjustments ({adj.data?.length ?? 0})</div>
                <div className="max-h-40 overflow-auto space-y-1 text-xs">
                  {(adj.data ?? []).map(a => (
                    <div key={a.id} className="flex justify-between border-b border-border/50 py-1">
                      <span>
                        <Badge variant="outline" className="mr-1 text-[10px]">{a.kind}</Badge>
                        {a.label}
                      </span>
                      <span className={a.category === "allowance" ? "text-emerald-600" : "text-rose-600"}>
                        {a.category === "allowance" ? "+" : "-"}{fmtMoney(a.amount, item.currency)}
                      </span>
                    </div>
                  ))}
                  {(adj.data?.length ?? 0) === 0 && <div className="text-muted-foreground">No adjustments.</div>}
                </div>
                {item.paid_at && <div className="mt-2 text-xs text-muted-foreground">Paid on {new Date(item.paid_at).toLocaleString()} via {item.payment_method ?? "—"}</div>}
              </Card>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function Row({ label, v, pos, neg }: { label: string; v: string; pos?: boolean; neg?: boolean }) {
  return (
    <div className="flex justify-between text-xs py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={pos ? "text-emerald-600" : neg ? "text-rose-600" : ""}>{v}</span>
    </div>
  );
}

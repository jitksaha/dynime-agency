import { useMemo, useState } from "react";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useExchangeRates } from "@/hooks/use-exchange-rates";
import { useSiteSettings } from "@/hooks/use-data";
import { toast } from "sonner";
import {
  ArrowLeftRight, Plus, Search, Download, TrendingUp, TrendingDown, Wallet,
  CheckCircle2, XCircle, Pencil, Trash2,
} from "lucide-react";
import { format } from "date-fns";

type FxOrder = {
  id: string;
  order_no: string | null;
  order_date: string;
  base_currency: string;
  base_amount: number;
  quote_currency: string;
  quote_amount: number;
  cost_rate_usd: number;
  sell_rate_usd: number;
  cost_usd: number;
  revenue_usd: number;
  fee_usd: number;
  profit_usd: number;
  status: "completed" | "pending" | "cancelled";
  counterparty_name: string | null;
  counterparty_contact: string | null;
  payment_method_in: string | null;
  payment_method_out: string | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
};

const CCY = ["USD", "USDT", "USDC", "BTC", "ETH", "BNB", "BDT", "EUR", "GBP", "INR", "AED", "SAR"];

const money = (n: number, c = "USD") =>
  new Intl.NumberFormat(undefined, {
    style: "currency", currency: c, maximumFractionDigits: 2,
  }).format(Number(n || 0));

const emptyForm = {
  order_date: new Date().toISOString().slice(0, 16),
  base_currency: "BDT",
  base_amount: "",
  quote_currency: "USDT",
  quote_amount: "",
  cost_rate_usd: "",
  sell_rate_usd: "",
  fee_usd: "0",
  status: "completed" as FxOrder["status"],
  counterparty_name: "",
  counterparty_contact: "",
  payment_method_in: "",
  payment_method_out: "",
  reference: "",
  notes: "",
};

export default function AdminFxOrders() {
  const qc = useQueryClient();
  const { data: settings = {} } = useSiteSettings();
  const parseList = (s?: string) =>
    (s || "").split(",").map((x) => x.trim()).filter(Boolean);
  const paymentInOptions = useMemo(
    () => {
      const base = parseList(settings.fx_payment_in_options) ;
      return base.length ? base : ["bKash", "Nagad", "Rocket", "Bank", "Cash"];
    },
    [settings.fx_payment_in_options]
  );
  const paymentOutOptions = useMemo(
    () => {
      const base = parseList(settings.fx_payment_out_options);
      return base.length ? base : ["Binance", "Wallet", "Redotpay", "Bank"];
    },
    [settings.fx_payment_out_options]
  );

  const addPaymentOption = async (kind: "in" | "out", value: string) => {
    const key = kind === "in" ? "fx_payment_in_options" : "fx_payment_out_options";
    const list = kind === "in" ? paymentInOptions : paymentOutOptions;
    const next = Array.from(new Set([...list, value.trim()].filter(Boolean)));
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key, value: JSON.stringify(next.join(",")) }, { onConflict: "key" });
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["site-settings"] });
    toast.success("Option added");
  };

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FxOrder | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["fx-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fx_orders" as any)
        .select("*")
        .order("order_date", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data || []) as unknown as FxOrder[];
    },
  });

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (!s) return true;
      return [
        o.order_no, o.base_currency, o.quote_currency, o.counterparty_name,
        o.reference, o.payment_method_in, o.payment_method_out,
      ].some((v) => (v || "").toString().toLowerCase().includes(s));
    });
  }, [orders, search, statusFilter]);

  const { rateFor } = useExchangeRates();

  // Convert an amount from `ccy` to USD using live USD-based rates.
  // Rates are USD-based (1 USD = rate units of ccy), so USD = amount / rate.
  const toUsd = (amt: number, ccy: string) => {
    const c = (ccy || "USD").toUpperCase();
    if (c === "USD") return amt;
    const r = rateFor(c as any);
    return r > 0 ? amt / r : amt;
  };

  const totals = useMemo(() => {
    const completed = orders.filter((o) => o.status === "completed");
    const byCcy: Record<string, { revenue: number; cost: number; profit: number; fees: number }> = {};
    let revenueUsd = 0, costUsd = 0, profitUsd = 0, feesUsd = 0;
    for (const o of completed) {
      const c = o.base_currency || "USD";
      byCcy[c] ||= { revenue: 0, cost: 0, profit: 0, fees: 0 };
      byCcy[c].revenue += Number(o.revenue_usd || 0);
      byCcy[c].cost += Number(o.cost_usd || 0);
      byCcy[c].profit += Number(o.profit_usd || 0);
      byCcy[c].fees += Number(o.fee_usd || 0);
      revenueUsd += toUsd(Number(o.revenue_usd || 0), c);
      costUsd += toUsd(Number(o.cost_usd || 0), c);
      profitUsd += toUsd(Number(o.profit_usd || 0), c);
      feesUsd += toUsd(Number(o.fee_usd || 0), c);
    }
    const pending = orders.filter((o) => o.status === "pending").length;
    return { byCcy, count: completed.length, pending, revenueUsd, costUsd, profitUsd, feesUsd };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, rateFor]);

  const fmtCcyMap = (m: Record<string, number>) =>
    Object.entries(m).map(([c, v]) => money(v, c)).join(" · ") || "—";

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (o: FxOrder) => {
    setEditing(o);
    setForm({
      order_date: new Date(o.order_date).toISOString().slice(0, 16),
      base_currency: o.base_currency,
      base_amount: String(o.base_amount),
      quote_currency: o.quote_currency,
      quote_amount: String(o.quote_amount),
      cost_rate_usd: String(o.cost_rate_usd),
      sell_rate_usd: String(o.sell_rate_usd),
      fee_usd: String(o.fee_usd ?? 0),
      status: o.status,
      counterparty_name: o.counterparty_name || "",
      counterparty_contact: o.counterparty_contact || "",
      payment_method_in: o.payment_method_in || "",
      payment_method_out: o.payment_method_out || "",
      reference: o.reference || "",
      notes: o.notes || "",
    });
    setDialogOpen(true);
  };

  // Live computed previews
  const previewCost = (Number(form.quote_amount) || 0) * (Number(form.cost_rate_usd) || 0);
  const previewRevenue = (Number(form.quote_amount) || 0) * (Number(form.sell_rate_usd) || 0);
  const previewProfit = previewRevenue - previewCost - (Number(form.fee_usd) || 0);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        order_date: new Date(form.order_date).toISOString(),
        base_currency: form.base_currency.toUpperCase(),
        base_amount: Number(form.base_amount),
        quote_currency: form.quote_currency.toUpperCase(),
        quote_amount: Number(form.quote_amount),
        cost_rate_usd: Number(form.cost_rate_usd) || 0,
        sell_rate_usd: Number(form.sell_rate_usd) || 0,
        cost_usd: previewCost,
        revenue_usd: previewRevenue,
        fee_usd: Number(form.fee_usd) || 0,
        profit_usd: previewProfit,
        status: form.status,
        counterparty_name: form.counterparty_name || null,
        counterparty_contact: form.counterparty_contact || null,
        payment_method_in: form.payment_method_in || null,
        payment_method_out: form.payment_method_out || null,
        reference: form.reference || null,
        notes: form.notes || null,
      };
      if (!payload.base_amount || !payload.quote_amount) {
        throw new Error("Base and quote amounts are required");
      }
      if (editing) {
        const { error } = await supabase.from("fx_orders" as any).update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("fx_orders" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "FX order updated" : "FX order recorded");
      setDialogOpen(false);
      qc.invalidateQueries({ queryKey: ["fx-orders"] });
      qc.invalidateQueries({ queryKey: ["dash-fx-totals"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to save"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fx_orders" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["fx-orders"] });
      qc.invalidateQueries({ queryKey: ["dash-fx-totals"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: FxOrder["status"] }) => {
      const { error } = await supabase.from("fx_orders" as any).update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fx-orders"] });
      qc.invalidateQueries({ queryKey: ["dash-fx-totals"] });
    },
  });

  const exportCsv = () => {
    const rows = [
      ["Order #","Date","Base Ccy","Base Amount","Quote Ccy","Quote Amount","Cost Rate","Sell Rate","Cost USD","Revenue USD","Fee USD","Profit USD","Status","Counterparty","Reference"],
      ...filtered.map((o) => [
        o.order_no, o.order_date, o.base_currency, o.base_amount, o.quote_currency, o.quote_amount,
        o.cost_rate_usd, o.sell_rate_usd, o.cost_usd, o.revenue_usd, o.fee_usd, o.profit_usd,
        o.status, o.counterparty_name || "", o.reference || "",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `fx-orders-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const statusBadge = (s: FxOrder["status"]) => (
    <Badge variant={s === "completed" ? "default" : s === "pending" ? "secondary" : "destructive"}>
      {s}
    </Badge>
  );

  return (
    <SuperAdminLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
              <ArrowLeftRight className="h-6 w-6 text-primary" />
              FX Order
            </h1>
            <p className="text-sm text-muted-foreground">
              Manual currency exchange POS — records sync into overall revenue & profit.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCsv}>
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> New FX Order
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total Sales (completed)</CardTitle></CardHeader>
            <CardContent>
              <div className="text-xl font-bold flex items-center gap-1 flex-wrap"><TrendingUp className="h-4 w-4 text-green-600" />{money(totals.revenueUsd, "USD")}</div>
              <div className="text-xs text-muted-foreground truncate" title={fmtCcyMap(Object.fromEntries(Object.entries(totals.byCcy).map(([c, v]) => [c, v.revenue])))}>
                {totals.count} orders · {fmtCcyMap(Object.fromEntries(Object.entries(totals.byCcy).map(([c, v]) => [c, v.revenue])))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Cost</CardTitle></CardHeader>
            <CardContent>
              <div className="text-xl font-bold flex items-center gap-1 flex-wrap"><TrendingDown className="h-4 w-4 text-orange-500" />{money(totals.costUsd, "USD")}</div>
              <div className="text-xs text-muted-foreground truncate" title={fmtCcyMap(Object.fromEntries(Object.entries(totals.byCcy).map(([c, v]) => [c, v.cost])))}>
                Fees: {money(totals.feesUsd, "USD")}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Profit / Loss</CardTitle></CardHeader>
            <CardContent>
              <div className={`text-xl font-bold flex flex-wrap items-center gap-1 ${totals.profitUsd >= 0 ? "text-green-600" : "text-red-600"}`}>
                {money(totals.profitUsd, "USD")}
              </div>
              <div className="text-xs text-muted-foreground truncate" title={fmtCcyMap(Object.fromEntries(Object.entries(totals.byCcy).map(([c, v]) => [c, v.profit])))}>
                Net of fees · combined USD
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Pending</CardTitle></CardHeader>
            <CardContent>
              <div className="text-xl font-bold flex items-center gap-1"><Wallet className="h-4 w-4 text-muted-foreground" />{totals.pending}</div>
              <div className="text-xs text-muted-foreground">Awaiting completion</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search order #, currency, counterparty, reference…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>From → To</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
                )}
                {!isLoading && filtered.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No FX orders yet.</TableCell></TableRow>
                )}
                {filtered.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.order_no}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{format(new Date(o.order_date), "dd MMM yyyy HH:mm")}</TableCell>
                    <TableCell className="text-xs">
                      <div>{Number(o.base_amount).toLocaleString()} {o.base_currency}</div>
                      <div className="text-muted-foreground">→ {Number(o.quote_amount).toLocaleString()} {o.quote_currency}</div>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">{money(o.revenue_usd, o.base_currency)}</TableCell>
                    <TableCell className={`text-right whitespace-nowrap ${Number(o.profit_usd) >= 0 ? "text-green-600" : "text-red-600"}`}>{money(o.profit_usd, o.base_currency)}</TableCell>
                    <TableCell>{statusBadge(o.status)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {o.status !== "completed" && (
                        <Button variant="ghost" size="icon" title="Mark completed" onClick={() => setStatus.mutate({ id: o.id, status: "completed" })}>
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                      {o.status !== "cancelled" && (
                        <Button variant="ghost" size="icon" title="Cancel" onClick={() => setStatus.mutate({ id: o.id, status: "cancelled" })}>
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => openEdit(o)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete this FX order?")) deleteMutation.mutate(o.id); }}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? `Edit ${editing.order_no}` : "New FX Order"}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Date & time</Label>
                <Input type="datetime-local" value={form.order_date} onChange={(e) => setForm({ ...form, order_date: e.target.value })} />
              </div>

              <div>
                <Label>You receive (currency)</Label>
                <Select value={form.base_currency} onValueChange={(v) => setForm({ ...form, base_currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CCY.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Amount received</Label>
                <Input type="number" step="any" value={form.base_amount} onChange={(e) => setForm({ ...form, base_amount: e.target.value })} />
              </div>

              <div>
                <Label>You give (currency)</Label>
                <Select value={form.quote_currency} onValueChange={(v) => setForm({ ...form, quote_currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CCY.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Amount given</Label>
                <Input type="number" step="any" value={form.quote_amount} onChange={(e) => setForm({ ...form, quote_amount: e.target.value })} />
              </div>

              <div>
                <Label>Cost rate ({form.base_currency || "—"} per 1 {form.quote_currency || "unit"})</Label>
                <Input type="number" step="any" value={form.cost_rate_usd} onChange={(e) => setForm({ ...form, cost_rate_usd: e.target.value })} />
              </div>
              <div>
                <Label>Sell rate ({form.base_currency || "—"} per 1 {form.quote_currency || "unit"})</Label>
                <Input type="number" step="any" value={form.sell_rate_usd} onChange={(e) => setForm({ ...form, sell_rate_usd: e.target.value })} />
              </div>

              <div>
                <Label>Fee ({form.base_currency || "—"})</Label>
                <Input type="number" step="any" value={form.fee_usd} onChange={(e) => setForm({ ...form, fee_usd: e.target.value })} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Counterparty name</Label>
                <Input value={form.counterparty_name} onChange={(e) => setForm({ ...form, counterparty_name: e.target.value })} />
              </div>
              <div>
                <Label>Counterparty contact</Label>
                <Input value={form.counterparty_contact} onChange={(e) => setForm({ ...form, counterparty_contact: e.target.value })} />
              </div>

              <div>
                <Label>Payment in</Label>
                <Select
                  value={form.payment_method_in || undefined}
                  onValueChange={async (v) => {
                    if (v === "__add__") {
                      const name = window.prompt("New payment-in option name");
                      if (name?.trim()) {
                        await addPaymentOption("in", name.trim());
                        setForm({ ...form, payment_method_in: name.trim() });
                      }
                      return;
                    }
                    setForm({ ...form, payment_method_in: v });
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select payment in" /></SelectTrigger>
                  <SelectContent>
                    {paymentInOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    <SelectItem value="__add__" className="text-primary">+ Add new…</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Payment out</Label>
                <Select
                  value={form.payment_method_out || undefined}
                  onValueChange={async (v) => {
                    if (v === "__add__") {
                      const name = window.prompt("New payment-out option name");
                      if (name?.trim()) {
                        await addPaymentOption("out", name.trim());
                        setForm({ ...form, payment_method_out: name.trim() });
                      }
                      return;
                    }
                    setForm({ ...form, payment_method_out: v });
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select payment out" /></SelectTrigger>
                  <SelectContent>
                    {paymentOutOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    <SelectItem value="__add__" className="text-primary">+ Add new…</SelectItem>
                  </SelectContent>
                </Select>
              </div>


              <div className="col-span-2">
                <Label>Reference / txn id</Label>
                <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Notes</Label>
                <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>

              <div className="col-span-2 rounded-lg border bg-muted/30 p-3 text-sm">
                <div className="flex justify-between"><span>Cost ({form.base_currency})</span><span>{money(previewCost, form.base_currency)}</span></div>
                <div className="flex justify-between"><span>Sales / Revenue ({form.base_currency})</span><span>{money(previewRevenue, form.base_currency)}</span></div>
                <div className={`flex justify-between font-semibold ${previewProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                  <span>Profit ({form.base_currency})</span><span>{money(previewProfit, form.base_currency)}</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving…" : editing ? "Save changes" : "Record FX Order"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SuperAdminLayout>
  );
}

import { useState } from "react";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/integrations/db/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Star, Layers } from "lucide-react";
import { toast } from "sonner";

type Plan = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  min_amount: number;
  max_amount: number | null;
  currency: string;
  roi_percent: number;
  profit_share_percent: number;
  lock_period_days: number;
  payout_frequency: string;
  risk_level: string;
  tier: string;
  capacity: number | null;
  allocated: number;
  withdrawal_policy: string | null;
  highlights: string[];
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
};

const empty = (): Partial<Plan> => ({
  slug: "",
  name: "",
  tagline: "",
  description: "",
  min_amount: 500,
  max_amount: null,
  currency: "USD",
  roi_percent: 30,
  profit_share_percent: 0,
  lock_period_days: 365,
  payout_frequency: "monthly",
  risk_level: "moderate",
  tier: "standard",
  capacity: null,
  withdrawal_policy: "",
  highlights: [],
  is_active: true,
  is_featured: false,
  sort_order: 0,
});

const fmt = (n: number | null | undefined, c = "USD") =>
  n == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(n);

const AdminInvestmentPlans = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Plan>>(empty());

  const { data: plans, isLoading } = useQuery({
    queryKey: ["admin-investment-plans"],
    queryFn: async () => {
      const { data, error } = await db
        .from("investment_plans" as any)
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return ((data as any[]) ?? []).map((r) => ({
        ...r,
        highlights: Array.isArray(r.highlights) ? r.highlights : [],
      })) as Plan[];
    },
  });

  const startNew = () => { setEditing(empty()); setOpen(true); };
  const startEdit = (p: Plan) => { setEditing({ ...p }); setOpen(true); };

  const save = async () => {
    if (!editing.slug || !editing.name) {
      toast.error("Slug and name are required");
      return;
    }
    const payload = {
      ...editing,
      slug: String(editing.slug).toLowerCase().trim(),
      min_amount: Number(editing.min_amount) || 0,
      max_amount: editing.max_amount === null || editing.max_amount === undefined || (editing.max_amount as any) === "" ? null : Number(editing.max_amount),
      capacity: editing.capacity === null || editing.capacity === undefined || (editing.capacity as any) === "" ? null : Number(editing.capacity),
      roi_percent: Number(editing.roi_percent) || 0,
      profit_share_percent: Number(editing.profit_share_percent) || 0,
      lock_period_days: Number(editing.lock_period_days) || 0,
      sort_order: Number(editing.sort_order) || 0,
      highlights: Array.isArray(editing.highlights) ? editing.highlights : [],
    };
    const { error } = editing.id
      ? await db.from("investment_plans" as any).update(payload).eq("id", editing.id)
      : await db.from("investment_plans" as any).insert(payload as any);
    if (error) { toast.error(error.message); return; }
    toast.success(editing.id ? "Plan updated" : "Plan created");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["admin-investment-plans"] });
    qc.invalidateQueries({ queryKey: ["investment-plans"] });
  };

  const toggle = async (p: Plan, field: "is_active" | "is_featured") => {
    const { error } = await db
      .from("investment_plans" as any)
      .update({ [field]: !p[field] })
      .eq("id", p.id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["admin-investment-plans"] });
  };

  const remove = async (p: Plan) => {
    if (!confirm(`Delete plan "${p.name}"?`)) return;
    const { error } = await db.from("investment_plans" as any).delete().eq("id", p.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin-investment-plans"] });
    }
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" /> Investment Plans
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage Dynime LLC. investment tiers shown on /invest.
            </p>
          </div>
          <Button onClick={startNew}><Plus className="h-4 w-4 mr-1" /> New plan</Button>
        </div>

        <InvestmentTargetsCard />

        <FundraisingCard />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">All plans</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Range</TableHead>
                  <TableHead>ROI / Share</TableHead>
                  <TableHead>Lock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Loading…</TableCell></TableRow>
                )}
                {plans?.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.slug} · tier {p.tier}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{fmt(p.min_amount, p.currency)} – {p.max_amount ? fmt(p.max_amount, p.currency) : "∞"}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{p.roi_percent}% / yr</div>
                      {p.profit_share_percent > 0 && (
                        <div className="text-xs text-muted-foreground">+{p.profit_share_percent}% share</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{Math.round(p.lock_period_days / 30)} mo</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch checked={p.is_active} onCheckedChange={() => toggle(p, "is_active")} />
                        <Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Active" : "Off"}</Badge>
                        {p.is_featured && <Badge variant="outline" className="border-primary/40 text-primary"><Star className="h-3 w-3 mr-1" />Featured</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => toggle(p, "is_featured")} title="Toggle featured">
                        <Star className={`h-4 w-4 ${p.is_featured ? "fill-primary text-primary" : ""}`} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => startEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing.id ? "Edit plan" : "New plan"}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Slug">
                <Input value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="growth" />
              </Field>
              <Field label="Name">
                <Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Growth Plan" />
              </Field>
              <Field label="Tagline" full>
                <Input value={editing.tagline ?? ""} onChange={(e) => setEditing({ ...editing, tagline: e.target.value })} />
              </Field>
              <Field label="Description" full>
                <Textarea rows={3} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </Field>

              <Field label="Min amount">
                <Input type="number" value={editing.min_amount ?? 0} onChange={(e) => setEditing({ ...editing, min_amount: Number(e.target.value) })} />
              </Field>
              <Field label="Max amount (blank = unlimited)">
                <Input type="number" value={editing.max_amount ?? ""} onChange={(e) => setEditing({ ...editing, max_amount: e.target.value === "" ? null : Number(e.target.value) })} />
              </Field>

              <Field label="Currency">
                <Input value={editing.currency ?? "USD"} onChange={(e) => setEditing({ ...editing, currency: e.target.value.toUpperCase() })} />
              </Field>
              <Field label="Annual ROI %">
                <Input type="number" step="0.01" value={editing.roi_percent ?? 0} onChange={(e) => setEditing({ ...editing, roi_percent: Number(e.target.value) })} />
              </Field>

              <Field label="Profit share %">
                <Input type="number" step="0.01" value={editing.profit_share_percent ?? 0} onChange={(e) => setEditing({ ...editing, profit_share_percent: Number(e.target.value) })} />
              </Field>
              <Field label="Lock period (days)">
                <Input type="number" value={editing.lock_period_days ?? 0} onChange={(e) => setEditing({ ...editing, lock_period_days: Number(e.target.value) })} />
              </Field>

              <Field label="Payout frequency">
                <Select value={editing.payout_frequency ?? "monthly"} onValueChange={(v) => setEditing({ ...editing, payout_frequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["monthly", "quarterly", "yearly", "biannual"].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Risk level">
                <Select value={editing.risk_level ?? "moderate"} onValueChange={(v) => setEditing({ ...editing, risk_level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["low", "moderate", "high"].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Tier">
                <Input value={editing.tier ?? ""} onChange={(e) => setEditing({ ...editing, tier: e.target.value })} placeholder="standard | premium | profit-share" />
              </Field>
              <Field label="Capacity (blank = unlimited)">
                <Input type="number" value={editing.capacity ?? ""} onChange={(e) => setEditing({ ...editing, capacity: e.target.value === "" ? null : Number(e.target.value) })} />
              </Field>

              <Field label="Withdrawal policy" full>
                <Textarea rows={2} value={editing.withdrawal_policy ?? ""} onChange={(e) => setEditing({ ...editing, withdrawal_policy: e.target.value })} />
              </Field>

              <Field label="Highlights (one per line)" full>
                <Textarea
                  rows={4}
                  value={(editing.highlights ?? []).join("\n")}
                  onChange={(e) => setEditing({ ...editing, highlights: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
                />
              </Field>

              <Field label="Sort order">
                <Input type="number" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} />
              </Field>
              <div className="flex items-center gap-4 pt-6">
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={!!editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /> Active
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={!!editing.is_featured} onCheckedChange={(v) => setEditing({ ...editing, is_featured: v })} /> Featured
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save}>{editing.id ? "Save changes" : "Create plan"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SuperAdminLayout>
  );
};

const Field = ({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) => (
  <div className={`space-y-1 ${full ? "col-span-2" : ""}`}>
    <Label className="text-xs">{label}</Label>
    {children}
  </div>
);

type Target = {
  slug: string;
  name: string;
  description?: string;
  roi_multiplier: number;
  profit_share_multiplier: number;
  enabled: boolean;
};

const InvestmentTargetsCard = () => {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin-invest-targets"],
    queryFn: async () => {
      const { data, error } = await db
        .from("invest_settings" as any)
        .select("value")
        .eq("key", "targets")
        .maybeSingle();
      if (error) throw error;
      const v = (data as any)?.value;
      return (v?.items ?? []) as Target[];
    },
  });
  const [draft, setDraft] = useState<Target[] | null>(null);
  const rows = draft ?? items;

  const update = (i: number, patch: Partial<Target>) => {
    const next = rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
    setDraft(next);
  };
  const add = () => {
    setDraft([
      ...rows,
      { slug: `target-${rows.length + 1}`, name: "New target", description: "", roi_multiplier: 1, profit_share_multiplier: 1, enabled: true },
    ]);
  };
  const remove = (i: number) => setDraft(rows.filter((_, idx) => idx !== i));

  const save = async () => {
    const payload = rows.map((r) => ({
      ...r,
      slug: String(r.slug).toLowerCase().trim(),
      roi_multiplier: Number(r.roi_multiplier) || 1,
      profit_share_multiplier: Number(r.profit_share_multiplier) || 1,
      enabled: r.enabled !== false,
    }));
    const { error } = await db
      .from("invest_settings" as any)
      .upsert({ key: "targets", value: { items: payload } } as any, { onConflict: "key" });
    if (error) { toast.error(error.message); return; }
    toast.success("Investment targets saved");
    setDraft(null);
    qc.invalidateQueries({ queryKey: ["admin-invest-targets"] });
    qc.invalidateQueries({ queryKey: ["invest-settings"] });
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-base">Investment targets</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Where investors can allocate capital (Dynime LLC., Dynime OS, upcoming products). Multipliers tweak each plan&apos;s profit % per target.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={add}><Plus className="h-4 w-4 mr-1" /> Add target</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {rows.map((t, i) => (
          <div key={i} className="grid gap-2 rounded-lg border p-3 md:grid-cols-12">
            <div className="md:col-span-2 space-y-1">
              <Label className="text-xs">Slug</Label>
              <Input value={t.slug} onChange={(e) => update(i, { slug: e.target.value })} />
            </div>
            <div className="md:col-span-3 space-y-1">
              <Label className="text-xs">Name</Label>
              <Input value={t.name} onChange={(e) => update(i, { name: e.target.value })} />
            </div>
            <div className="md:col-span-4 space-y-1">
              <Label className="text-xs">Description</Label>
              <Input value={t.description ?? ""} onChange={(e) => update(i, { description: e.target.value })} />
            </div>
            <div className="md:col-span-1 space-y-1">
              <Label className="text-xs">ROI ×</Label>
              <Input type="number" step="0.01" value={t.roi_multiplier} onChange={(e) => update(i, { roi_multiplier: Number(e.target.value) })} />
            </div>
            <div className="md:col-span-1 space-y-1">
              <Label className="text-xs">Share ×</Label>
              <Input type="number" step="0.01" value={t.profit_share_multiplier} onChange={(e) => update(i, { profit_share_multiplier: Number(e.target.value) })} />
            </div>
            <div className="md:col-span-1 flex items-end justify-between gap-1 pb-1">
              <Switch checked={t.enabled !== false} onCheckedChange={(v) => update(i, { enabled: v })} />
              <Button variant="ghost" size="icon" onClick={() => remove(i)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
        {draft && (
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
            <Button onClick={save}>Save targets</Button>
          </div>
        )}
        {!draft && rows.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Edit any field above to start changing targets — Save button appears when you make a change.
          </p>
        )}
      </CardContent>
    </Card>
  );
};


type Fundraising = {
  goal_amount: number;
  currency: string;
  goal_title: string;
  goal_subtitle: string;
  goal_uses: string[];
  investor_distribution: { label: string; amount: number }[];
  profit_allocation: { label: string; percent: number }[];
  monthly_revenue_allocation: { label: string; percent: number }[];
  equity_structure: { amount: number; equity: string }[];
  equity_cap_note: string;
  return_targets: { risk: string; return: string }[];
  phases: { name: string; items: string[] }[];
  messaging_note: string;
};

const emptyFundraising = (): Fundraising => ({
  goal_amount: 50000,
  currency: "USD",
  goal_title: "",
  goal_subtitle: "",
  goal_uses: [],
  investor_distribution: [],
  profit_allocation: [],
  monthly_revenue_allocation: [],
  equity_structure: [],
  equity_cap_note: "",
  return_targets: [],
  phases: [],
  messaging_note: "",
});

const FundraisingCard = () => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-invest-fundraising"],
    queryFn: async () => {
      const { data, error } = await db
        .from("invest_settings" as any)
        .select("value")
        .eq("key", "fundraising")
        .maybeSingle();
      if (error) throw error;
      return ((data as any)?.value ?? null) as Fundraising | null;
    },
  });
  const [draft, setDraft] = useState<Fundraising | null>(null);
  const f: Fundraising = draft ?? { ...emptyFundraising(), ...(data ?? {}) };
  const set = (patch: Partial<Fundraising>) => setDraft({ ...f, ...patch });

  const save = async () => {
    const { error } = await db
      .from("invest_settings" as any)
      .upsert({ key: "fundraising", value: f } as any, { onConflict: "key" });
    if (error) { toast.error(error.message); return; }
    toast.success("Fundraising plan saved");
    setDraft(null);
    qc.invalidateQueries({ queryKey: ["admin-invest-fundraising"] });
    qc.invalidateQueries({ queryKey: ["invest-settings"] });
  };

  if (isLoading) {
    return <Card><CardContent className="p-6 text-sm text-muted-foreground">Loading fundraising plan…</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Fundraising plan</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Controls the goal, investor tiers, allocations, equity structure, return targets and phases on the public Invest page.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Goal */}
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Goal amount">
            <Input type="number" value={f.goal_amount} onChange={(e) => set({ goal_amount: Number(e.target.value) })} />
          </Field>
          <Field label="Currency">
            <Input value={f.currency} onChange={(e) => set({ currency: e.target.value.toUpperCase() })} />
          </Field>
          <Field label="Goal title" full>
            <Input value={f.goal_title} onChange={(e) => set({ goal_title: e.target.value })} />
          </Field>
          <Field label="Goal subtitle" full>
            <Textarea rows={2} value={f.goal_subtitle} onChange={(e) => set({ goal_subtitle: e.target.value })} />
          </Field>
          <Field label="Goal uses (one per line)" full>
            <Textarea
              rows={4}
              value={f.goal_uses.join("\n")}
              onChange={(e) => set({ goal_uses: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
            />
          </Field>
          <Field label="Equity cap note" full>
            <Textarea rows={2} value={f.equity_cap_note} onChange={(e) => set({ equity_cap_note: e.target.value })} />
          </Field>
          <Field label="Messaging note" full>
            <Textarea rows={2} value={f.messaging_note} onChange={(e) => set({ messaging_note: e.target.value })} />
          </Field>
        </div>

        {/* Investor distribution */}
        <RepeaterAmount
          title="Investor distribution (tiers)"
          rows={f.investor_distribution}
          onChange={(rows) => set({ investor_distribution: rows })}
          labelHint="e.g. Small Investors"
          valueLabel="Amount"
        />

        {/* Profit allocation */}
        <RepeaterPercent
          title="Profit allocation"
          rows={f.profit_allocation}
          onChange={(rows) => set({ profit_allocation: rows })}
        />

        {/* Monthly revenue allocation */}
        <RepeaterPercent
          title="Monthly revenue allocation"
          rows={f.monthly_revenue_allocation}
          onChange={(rows) => set({ monthly_revenue_allocation: rows })}
        />

        {/* Equity structure */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Equity structure</Label>
            <Button size="sm" variant="outline" onClick={() => set({ equity_structure: [...f.equity_structure, { amount: 0, equity: "" }] })}>
              <Plus className="h-4 w-4 mr-1" /> Add tier
            </Button>
          </div>
          {f.equity_structure.map((row, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-5">
                <Label className="text-xs">Amount</Label>
                <Input type="number" value={row.amount} onChange={(e) => {
                  const next = [...f.equity_structure]; next[i] = { ...row, amount: Number(e.target.value) }; set({ equity_structure: next });
                }} />
              </div>
              <div className="col-span-6">
                <Label className="text-xs">Equity</Label>
                <Input value={row.equity} onChange={(e) => {
                  const next = [...f.equity_structure]; next[i] = { ...row, equity: e.target.value }; set({ equity_structure: next });
                }} placeholder="e.g. 2%" />
              </div>
              <div className="col-span-1">
                <Button variant="ghost" size="icon" onClick={() => set({ equity_structure: f.equity_structure.filter((_, x) => x !== i) })}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Return targets */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Return targets</Label>
            <Button size="sm" variant="outline" onClick={() => set({ return_targets: [...f.return_targets, { risk: "", return: "" }] })}>
              <Plus className="h-4 w-4 mr-1" /> Add row
            </Button>
          </div>
          {f.return_targets.map((row, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-5">
                <Label className="text-xs">Risk</Label>
                <Input value={row.risk} onChange={(e) => {
                  const next = [...f.return_targets]; next[i] = { ...row, risk: e.target.value }; set({ return_targets: next });
                }} />
              </div>
              <div className="col-span-6">
                <Label className="text-xs">Return</Label>
                <Input value={row.return} onChange={(e) => {
                  const next = [...f.return_targets]; next[i] = { ...row, return: e.target.value }; set({ return_targets: next });
                }} placeholder="e.g. 10–15%" />
              </div>
              <div className="col-span-1">
                <Button variant="ghost" size="icon" onClick={() => set({ return_targets: f.return_targets.filter((_, x) => x !== i) })}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Phases */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Phases</Label>
            <Button size="sm" variant="outline" onClick={() => set({ phases: [...f.phases, { name: `Phase ${f.phases.length + 1}`, items: [] }] })}>
              <Plus className="h-4 w-4 mr-1" /> Add phase
            </Button>
          </div>
          {f.phases.map((p, i) => (
            <div key={i} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Input value={p.name} onChange={(e) => {
                  const next = [...f.phases]; next[i] = { ...p, name: e.target.value }; set({ phases: next });
                }} placeholder="Phase name" />
                <Button variant="ghost" size="icon" onClick={() => set({ phases: f.phases.filter((_, x) => x !== i) })}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <Textarea
                rows={3}
                placeholder="One milestone per line"
                value={p.items.join("\n")}
                onChange={(e) => {
                  const next = [...f.phases];
                  next[i] = { ...p, items: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) };
                  set({ phases: next });
                }}
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          {draft && <Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button>}
          <Button onClick={save} disabled={!draft}>Save fundraising plan</Button>
        </div>
      </CardContent>
    </Card>
  );
};

const RepeaterAmount = ({
  title, rows, onChange, labelHint, valueLabel,
}: {
  title: string;
  rows: { label: string; amount: number }[];
  onChange: (rows: { label: string; amount: number }[]) => void;
  labelHint?: string;
  valueLabel?: string;
}) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <Label className="text-sm font-semibold">{title}</Label>
      <Button size="sm" variant="outline" onClick={() => onChange([...rows, { label: "", amount: 0 }])}>
        <Plus className="h-4 w-4 mr-1" /> Add row
      </Button>
    </div>
    {rows.map((row, i) => (
      <div key={i} className="grid grid-cols-12 gap-2 items-end">
        <div className="col-span-7">
          <Label className="text-xs">Label</Label>
          <Input value={row.label} placeholder={labelHint} onChange={(e) => {
            const next = [...rows]; next[i] = { ...row, label: e.target.value }; onChange(next);
          }} />
        </div>
        <div className="col-span-4">
          <Label className="text-xs">{valueLabel ?? "Amount"}</Label>
          <Input type="number" value={row.amount} onChange={(e) => {
            const next = [...rows]; next[i] = { ...row, amount: Number(e.target.value) }; onChange(next);
          }} />
        </div>
        <div className="col-span-1">
          <Button variant="ghost" size="icon" onClick={() => onChange(rows.filter((_, x) => x !== i))}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
    ))}
  </div>
);

const RepeaterPercent = ({
  title, rows, onChange,
}: {
  title: string;
  rows: { label: string; percent: number }[];
  onChange: (rows: { label: string; percent: number }[]) => void;
}) => {
  const total = rows.reduce((s, r) => s + (Number(r.percent) || 0), 0);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-semibold">{title}</Label>
          <span className={`ml-2 text-xs ${total === 100 ? "text-muted-foreground" : "text-destructive"}`}>
            total {total}%
          </span>
        </div>
        <Button size="sm" variant="outline" onClick={() => onChange([...rows, { label: "", percent: 0 }])}>
          <Plus className="h-4 w-4 mr-1" /> Add row
        </Button>
      </div>
      {rows.map((row, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 items-end">
          <div className="col-span-8">
            <Label className="text-xs">Label</Label>
            <Input value={row.label} onChange={(e) => {
              const next = [...rows]; next[i] = { ...row, label: e.target.value }; onChange(next);
            }} />
          </div>
          <div className="col-span-3">
            <Label className="text-xs">Percent</Label>
            <Input type="number" step="0.1" value={row.percent} onChange={(e) => {
              const next = [...rows]; next[i] = { ...row, percent: Number(e.target.value) }; onChange(next);
            }} />
          </div>
          <div className="col-span-1">
            <Button variant="ghost" size="icon" onClick={() => onChange(rows.filter((_, x) => x !== i))}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdminInvestmentPlans;


import { useState } from "react";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Tag, Copy } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type MilestoneStage = { label: string; percent: number };

type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_amount: number;
  max_discount_amount: number | null;
  usage_limit: number | null;
  usage_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  is_milestone: boolean;
  milestone_mode: "two_step" | "custom" | null;
  advance_percent: number | null;
  milestone_stages: MilestoneStage[] | null;
};

type CouponForm = {
  code: string;
  description: string;
  discount_type: "percentage" | "fixed";
  discount_value: string;
  min_order_amount: string;
  max_discount_amount: string;
  usage_limit: string;
  starts_at: string;
  expires_at: string;
  is_active: boolean;
  is_milestone: boolean;
  milestone_mode: "two_step" | "custom";
  advance_percent: string;
  milestone_stages: MilestoneStage[];
};

const emptyForm: CouponForm = {
  code: "",
  description: "",
  discount_type: "percentage",
  discount_value: "0",
  min_order_amount: "0",
  max_discount_amount: "",
  usage_limit: "",
  starts_at: "",
  expires_at: "",
  is_active: true,
  is_milestone: false,
  milestone_mode: "two_step",
  advance_percent: "40",
  milestone_stages: [
    { label: "Advance", percent: 30 },
    { label: "Mid delivery", percent: 40 },
    { label: "Final", percent: 30 },
  ],
};

const toIso = (v: string) => (v ? new Date(v).toISOString() : null);
const toLocalInput = (v: string | null) => {
  if (!v) return "";
  const d = new Date(v);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const AdminCoupons = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState<CouponForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const { data: coupons, isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]).map((d) => ({
        ...d,
        milestone_stages: Array.isArray(d.milestone_stages) ? d.milestone_stages : [],
      })) as Coupon[];
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (c: Coupon) => {
    setEditing(c);
    setForm({
      code: c.code,
      description: c.description || "",
      discount_type: c.discount_type,
      discount_value: String(c.discount_value),
      min_order_amount: String(c.min_order_amount ?? 0),
      max_discount_amount: c.max_discount_amount != null ? String(c.max_discount_amount) : "",
      usage_limit: c.usage_limit != null ? String(c.usage_limit) : "",
      starts_at: toLocalInput(c.starts_at),
      expires_at: toLocalInput(c.expires_at),
      is_active: c.is_active,
      is_milestone: !!c.is_milestone,
      milestone_mode: c.milestone_mode || "two_step",
      advance_percent: c.advance_percent != null ? String(c.advance_percent) : "40",
      milestone_stages: c.milestone_stages?.length
        ? c.milestone_stages
        : emptyForm.milestone_stages,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.code.trim()) { toast.error("Code is required"); return; }
    const value = Number(form.discount_value);
    if (!Number.isFinite(value) || value < 0) {
      toast.error("Discount value must be ≥ 0"); return;
    }
    if (form.discount_type === "percentage" && value > 100) {
      toast.error("Percentage cannot exceed 100"); return;
    }
    if (!form.is_milestone && value <= 0) {
      toast.error("Discount value must be > 0 for non-milestone coupons"); return;
    }

    let milestone_stages: MilestoneStage[] = [];
    let advance_percent: number | null = null;
    if (form.is_milestone) {
      if (form.milestone_mode === "two_step") {
        const adv = Number(form.advance_percent);
        if (!Number.isFinite(adv) || adv <= 0 || adv >= 100) {
          toast.error("Advance percent must be between 1 and 99"); return;
        }
        advance_percent = adv;
        milestone_stages = [
          { label: "Advance", percent: adv },
          { label: "Final", percent: 100 - adv },
        ];
      } else {
        const cleaned = form.milestone_stages
          .map((s) => ({ label: s.label.trim() || "Stage", percent: Number(s.percent) }))
          .filter((s) => Number.isFinite(s.percent) && s.percent > 0);
        const sum = cleaned.reduce((a, b) => a + b.percent, 0);
        if (cleaned.length < 2) { toast.error("Add at least 2 stages"); return; }
        if (Math.round(sum) !== 100) { toast.error(`Stages must sum to 100% (currently ${sum}%)`); return; }
        milestone_stages = cleaned;
      }
    }

    setSaving(true);
    const payload: any = {
      code: form.code.trim().toUpperCase(),
      description: form.description.trim() || null,
      discount_type: form.discount_type,
      discount_value: value,
      min_order_amount: Number(form.min_order_amount) || 0,
      max_discount_amount: form.max_discount_amount ? Number(form.max_discount_amount) : null,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      starts_at: toIso(form.starts_at),
      expires_at: toIso(form.expires_at),
      is_active: form.is_active,
      is_milestone: form.is_milestone,
      milestone_mode: form.is_milestone ? form.milestone_mode : null,
      advance_percent,
      milestone_stages,
    };
    try {
      if (editing) {
        const { error } = await supabase.from("coupons").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Coupon updated");
      } else {
        const { error } = await supabase.from("coupons").insert(payload);
        if (error) throw error;
        toast.success("Coupon created");
      }
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-coupons"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to save coupon");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: Coupon) => {
    if (!confirm(`Delete coupon ${c.code}?`)) return;
    const { error } = await supabase.from("coupons").delete().eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Coupon deleted");
    qc.invalidateQueries({ queryKey: ["admin-coupons"] });
  };

  const toggleActive = async (c: Coupon) => {
    const { error } = await supabase
      .from("coupons")
      .update({ is_active: !c.is_active })
      .eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["admin-coupons"] });
  };

  const copyCode = async (code: string) => {
    try { await navigator.clipboard.writeText(code); toast.success("Copied"); }
    catch { toast.error("Copy failed"); }
  };

  return (
    <SuperAdminLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
              <Tag className="w-6 h-6 text-primary" /> Coupon Codes
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create discount codes customers can apply at checkout.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}>
                <Plus className="w-4 h-4 mr-2" /> New Coupon
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Coupon" : "New Coupon"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Code *</Label>
                  <Input
                    value={form.code}
                    onChange={(e) => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="SAVE20"
                    className="uppercase"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="20% off for new customers"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Discount Type</Label>
                    <Select
                      value={form.discount_type}
                      onValueChange={(v: "percentage" | "fixed") => setForm(f => ({ ...f, discount_type: v }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="fixed">Fixed amount ($)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Value *</Label>
                    <Input
                      type="number" step="0.01" min="0"
                      value={form.discount_value}
                      onChange={(e) => setForm(f => ({ ...f, discount_value: e.target.value }))}
                      placeholder={form.discount_type === "percentage" ? "20" : "10.00"}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Minimum Order ($)</Label>
                    <Input
                      type="number" step="0.01" min="0"
                      value={form.min_order_amount}
                      onChange={(e) => setForm(f => ({ ...f, min_order_amount: e.target.value }))}
                    />
                  </div>
                  {form.discount_type === "percentage" && (
                    <div className="space-y-1.5">
                      <Label>Max Discount ($)</Label>
                      <Input
                        type="number" step="0.01" min="0"
                        value={form.max_discount_amount}
                        onChange={(e) => setForm(f => ({ ...f, max_discount_amount: e.target.value }))}
                        placeholder="Optional"
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Usage Limit</Label>
                  <Input
                    type="number" min="1"
                    value={form.usage_limit}
                    onChange={(e) => setForm(f => ({ ...f, usage_limit: e.target.value }))}
                    placeholder="Unlimited"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Starts At</Label>
                    <Input
                      type="datetime-local"
                      value={form.starts_at}
                      onChange={(e) => setForm(f => ({ ...f, starts_at: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Expires At</Label>
                    <Input
                      type="datetime-local"
                      value={form.expires_at}
                      onChange={(e) => setForm(f => ({ ...f, expires_at: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <div className="text-sm font-medium">Active</div>
                    <div className="text-xs text-muted-foreground">Inactive coupons cannot be redeemed.</div>
                  </div>
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(v) => setForm(f => ({ ...f, is_active: v }))}
                  />
                </div>

                <div className="rounded-lg border border-border p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Milestone payments</div>
                      <div className="text-xs text-muted-foreground">Split the order total into multiple payment stages.</div>
                    </div>
                    <Switch
                      checked={form.is_milestone}
                      onCheckedChange={(v) => setForm(f => ({ ...f, is_milestone: v }))}
                    />
                  </div>
                  {form.is_milestone && (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label>Mode</Label>
                        <Select
                          value={form.milestone_mode}
                          onValueChange={(v: "two_step" | "custom") => setForm(f => ({ ...f, milestone_mode: v }))}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="two_step">Two-step (advance + final)</SelectItem>
                            <SelectItem value="custom">Custom multi-stage</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {form.milestone_mode === "two_step" && (
                        <div className="space-y-1.5">
                          <Label>Advance %</Label>
                          <Input
                            type="number" min="1" max="99"
                            value={form.advance_percent}
                            onChange={(e) => setForm(f => ({ ...f, advance_percent: e.target.value }))}
                          />
                          <p className="text-xs text-muted-foreground">
                            Customer pays {form.advance_percent || 0}% upfront, {Math.max(0, 100 - Number(form.advance_percent || 0))}% on delivery.
                          </p>
                        </div>
                      )}

                      {form.milestone_mode === "custom" && (
                        <div className="space-y-2">
                          <Label>Stages</Label>
                          {form.milestone_stages.map((s, i) => (
                            <div key={i} className="flex gap-2 items-center">
                              <Input
                                placeholder="Label (e.g. Advance)"
                                value={s.label}
                                onChange={(e) => setForm(f => ({
                                  ...f,
                                  milestone_stages: f.milestone_stages.map((x, xi) => xi === i ? { ...x, label: e.target.value } : x),
                                }))}
                              />
                              <Input
                                type="number" min="1" max="100" className="w-24"
                                value={s.percent}
                                onChange={(e) => setForm(f => ({
                                  ...f,
                                  milestone_stages: f.milestone_stages.map((x, xi) => xi === i ? { ...x, percent: Number(e.target.value) } : x),
                                }))}
                              />
                              <span className="text-xs text-muted-foreground">%</span>
                              <Button
                                type="button" variant="ghost" size="sm"
                                onClick={() => setForm(f => ({ ...f, milestone_stages: f.milestone_stages.filter((_, xi) => xi !== i) }))}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                          <div className="flex items-center justify-between">
                            <Button
                              type="button" variant="outline" size="sm"
                              onClick={() => setForm(f => ({ ...f, milestone_stages: [...f.milestone_stages, { label: "", percent: 0 }] }))}
                            >
                              <Plus className="w-3 h-3 mr-1" /> Add stage
                            </Button>
                            <span className="text-xs text-muted-foreground">
                              Sum: {form.milestone_stages.reduce((a, b) => a + Number(b.percent || 0), 0)}% (must equal 100%)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : editing ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Min Order</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow>
              )}
              {!isLoading && (!coupons || coupons.length === 0) && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No coupons yet. Create one to get started.</TableCell></TableRow>
              )}
              {coupons?.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold">{c.code}</span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyCode(c.code)}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                    {c.is_milestone && (
                      <div className="mt-0.5">
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                          Milestone · {c.milestone_stages?.map(s => `${s.percent}%`).join(" / ") || c.milestone_mode}
                        </Badge>
                      </div>
                    )}
                    {c.description && <div className="text-xs text-muted-foreground mt-0.5">{c.description}</div>}
                  </TableCell>
                  <TableCell>
                    {c.discount_type === "percentage" ? `${c.discount_value}%` : `$${Number(c.discount_value).toFixed(2)}`}
                    {c.max_discount_amount != null && c.discount_type === "percentage" && (
                      <span className="text-xs text-muted-foreground"> (max ${Number(c.max_discount_amount).toFixed(2)})</span>
                    )}
                  </TableCell>
                  <TableCell>${Number(c.min_order_amount).toFixed(2)}</TableCell>
                  <TableCell>
                    {c.usage_count}{c.usage_limit ? ` / ${c.usage_limit}` : ""}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.expires_at ? format(new Date(c.expires_at), "MMM d, yyyy") : "Never"}
                  </TableCell>
                  <TableCell>
                    <button onClick={() => toggleActive(c)}>
                      <Badge variant={c.is_active ? "default" : "secondary"} className="cursor-pointer">
                        {c.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(c)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </SuperAdminLayout>
  );
};

export default AdminCoupons;

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Globe2 } from "lucide-react";
import { toast } from "sonner";

interface Row {
  id: string;
  name: string;
  aliases: string[];
  status: "blocked" | "review" | "eligible";
  category: string;
  reason: string;
  is_active: boolean;
  sort_order: number;
}

const empty: Omit<Row, "id"> = {
  name: "",
  aliases: [],
  status: "blocked",
  category: "FATF Blacklist",
  reason: "",
  is_active: true,
  sort_order: 0,
};

const STATUS_BADGE: Record<Row["status"], string> = {
  blocked: "bg-destructive/10 text-destructive border-destructive/30",
  review: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  eligible: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
};

const AdminCountryEligibility = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Omit<Row, "id">>(empty);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["country-eligibility-admin"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("country_eligibility")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data as Row[]) ?? [];
    },
  });

  const upsert = useMutation({
    mutationFn: async (payload: Omit<Row, "id"> & { id?: string }) => {
      if (payload.id) {
        const { id, ...rest } = payload;
        const { error } = await (supabase as any)
          .from("country_eligibility").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("country_eligibility").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["country-eligibility-admin"] });
      qc.invalidateQueries({ queryKey: ["country-eligibility-public"] });
      toast.success("Saved");
      setOpen(false);
      setEditing(null);
      setForm(empty);
    },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("country_eligibility").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["country-eligibility-admin"] });
      qc.invalidateQueries({ queryKey: ["country-eligibility-public"] });
      toast.success("Deleted");
    },
    onError: (e: any) => toast.error(e.message ?? "Delete failed"),
  });

  const openNew = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };

  const openEdit = (r: Row) => {
    setEditing(r);
    setForm({
      name: r.name,
      aliases: r.aliases ?? [],
      status: r.status,
      category: r.category,
      reason: r.reason,
      is_active: r.is_active,
      sort_order: r.sort_order,
    });
    setOpen(true);
  };

  const submit = () => {
    if (!form.name.trim()) {
      toast.error("Country name is required");
      return;
    }
    upsert.mutate({ ...form, id: editing?.id });
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
              <Globe2 className="w-6 h-6 text-primary" /> Country Eligibility
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage which countries are blocked, require enhanced review, or are explicitly eligible.
              Updates reflect on the contact page in real time.
            </p>
          </div>
          <Button onClick={openNew}>
            <Plus className="w-4 h-4 mr-1" /> Add Country
          </Button>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Country</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Category</th>
                  <th className="text-left px-4 py-3">Reason</th>
                  <th className="text-left px-4 py-3">Active</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
                )}
                {!isLoading && rows.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No entries yet.</td></tr>
                )}
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border/60">
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.name}</div>
                      {r.aliases?.length > 0 && (
                        <div className="text-xs text-muted-foreground">aka {r.aliases.join(", ")}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={STATUS_BADGE[r.status]}>{r.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.category}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-md">{r.reason}</td>
                    <td className="px-4 py-3">
                      <Switch
                        checked={r.is_active}
                        onCheckedChange={(v) => upsert.mutate({ ...r, is_active: v, id: r.id })}
                      />
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => {
                          if (confirm(`Delete ${r.name}?`)) remove.mutate(r.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Country" : "Add Country"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Country name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} />
            </div>
            <div>
              <Label>Aliases (comma separated)</Label>
              <Input
                value={form.aliases.join(", ")}
                onChange={(e) =>
                  setForm({
                    ...form,
                    aliases: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  })
                }
                placeholder="DPRK, Burma…"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v: Row["status"]) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blocked">Blocked</SelectItem>
                    <SelectItem value="review">Enhanced Review</SelectItem>
                    <SelectItem value="eligible">Eligible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sort order</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FATF Blacklist">FATF Blacklist</SelectItem>
                  <SelectItem value="OFAC Comprehensive Sanctions">OFAC Comprehensive Sanctions</SelectItem>
                  <SelectItem value="Active Conflict Zone">Active Conflict Zone</SelectItem>
                  <SelectItem value="Severe Payment / Digital Restrictions">Severe Payment / Digital Restrictions</SelectItem>
                  <SelectItem value="Enhanced Review">Enhanced Review</SelectItem>
                  <SelectItem value="Eligible">Eligible</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reason</Label>
              <Textarea
                value={form.reason}
                maxLength={500}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="Shown to visitors when their country matches"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label className="m-0">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={upsert.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
};

export default AdminCountryEligibility;

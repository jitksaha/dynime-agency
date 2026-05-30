import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Building2, Plus, Trash2, Edit2 } from "lucide-react";

export interface OfficeLocation {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  address: string | null;
  timezone: string | null;
  is_active: boolean;
  sort_order: number;
}

const EMPTY: Omit<OfficeLocation, "id"> = {
  name: "",
  city: "",
  country: "",
  address: "",
  timezone: "",
  is_active: true,
  sort_order: 0,
};

export const useOfficeLocations = (opts: { onlyActive?: boolean } = {}) =>
  useQuery({
    queryKey: ["office-locations", opts.onlyActive ?? null],
    queryFn: async () => {
      let q = supabase.from("office_locations").select("*").order("sort_order").order("name");
      if (opts.onlyActive) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as OfficeLocation[];
    },
    staleTime: 30_000,
  });

interface Props {
  trigger?: React.ReactNode;
}

const OfficeLocationsDialog = ({ trigger }: Props) => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OfficeLocation | null>(null);
  const [form, setForm] = useState({ ...EMPTY });

  const { data: offices = [], isLoading } = useOfficeLocations();

  const reset = () => {
    setEditing(null);
    setForm({ ...EMPTY });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Office name is required");
      const payload = {
        name: form.name.trim(),
        city: form.city?.trim() || null,
        country: form.country?.trim() || null,
        address: form.address?.trim() || null,
        timezone: form.timezone?.trim() || null,
        is_active: form.is_active,
        sort_order: Number(form.sort_order) || 0,
      };
      if (editing) {
        const { error } = await supabase.from("office_locations").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("office_locations").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Office updated" : "Office added");
      qc.invalidateQueries({ queryKey: ["office-locations"] });
      reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("office_locations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Office removed");
      qc.invalidateQueries({ queryKey: ["office-locations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" variant="outline" size="sm" className="gap-2">
            <Building2 className="w-4 h-4" /> Manage offices
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" /> Office locations
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Head Office" />
          </div>
          <div className="space-y-1.5">
            <Label>City</Label>
            <Input value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Dhaka" />
          </div>
          <div className="space-y-1.5">
            <Label>Country</Label>
            <Input value={form.country ?? ""} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="Bangladesh" />
          </div>
          <div className="space-y-1.5">
            <Label>Timezone</Label>
            <Input value={form.timezone ?? ""} onChange={(e) => setForm({ ...form, timezone: e.target.value })} placeholder="Asia/Dhaka" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Address</Label>
            <Input value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Street, area" />
          </div>
          <div className="space-y-1.5">
            <Label>Sort order</Label>
            <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 0 })} />
          </div>
          <div className="flex items-center gap-3 pt-6">
            <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            <Label>Active</Label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {editing && <Button type="button" variant="ghost" onClick={reset}>Cancel</Button>}
          <Button type="button" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {editing ? <><Edit2 className="w-4 h-4 mr-2" /> Update office</> : <><Plus className="w-4 h-4 mr-2" /> Add office</>}
          </Button>
        </DialogFooter>

        <div className="border-t border-border/60 pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>City / Country</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Loading…</TableCell></TableRow>
              ) : offices.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No offices yet.</TableCell></TableRow>
              ) : offices.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {[o.city, o.country].filter(Boolean).join(", ") || "—"}
                  </TableCell>
                  <TableCell>{o.is_active ? "Yes" : "No"}</TableCell>
                  <TableCell className="text-right">
                    <Button type="button" variant="ghost" size="icon" onClick={() => { setEditing(o); setForm({
                      name: o.name, city: o.city, country: o.country, address: o.address, timezone: o.timezone, is_active: o.is_active, sort_order: o.sort_order,
                    }); }}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => {
                      if (confirm(`Remove office "${o.name}"?`)) deleteMutation.mutate(o.id);
                    }}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OfficeLocationsDialog;

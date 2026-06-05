import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, ChevronUp, ChevronDown, Package, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Addon {
  id: string;
  service_slug: string;
  name: string;
  description: string | null;
  price_usd: number;
  period: string;
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
  _dirty?: boolean;
  _new?: boolean;
}

const blank = (slug: string, order: number): Addon => ({
  id: crypto.randomUUID(),
  service_slug: slug,
  name: "New add-on",
  description: "",
  price_usd: 49,
  period: "one-time",
  is_popular: false,
  is_active: true,
  sort_order: order,
  _dirty: true,
  _new: true,
});

interface Props {
  serviceSlug: string;
  serviceTitle: string;
}

const AddonsManager = ({ serviceSlug, serviceTitle }: Props) => {
  const { toast } = useToast();
  const { session } = useAuth();
  const token = session?.access_token;
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/cms/service-addons/${serviceSlug}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error("Failed to load add-ons");
        const data = await res.json();
        if (cancel) return;
        setAddons((data ?? []).map((a: any) => ({ ...a })));
      } catch (error: any) {
        if (!cancel) {
          toast({ title: "Failed to load add-ons", description: error.message, variant: "destructive" });
        }
      }
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [serviceSlug, token, toast]);

  const update = (idx: number, patch: Partial<Addon>) => {
    setAddons((prev) => prev.map((a, i) => (i === idx ? { ...a, ...patch, _dirty: true } : a)));
  };

  const move = (idx: number, dir: -1 | 1) => {
    setAddons((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next.map((a, i) => ({ ...a, sort_order: i, _dirty: true }));
    });
  };

  const add = () => setAddons((prev) => [...prev, blank(serviceSlug, prev.length)]);

  const remove = async (idx: number) => {
    const a = addons[idx];
    if (!a._new) {
      if (!token) {
        toast({ title: "Delete failed", description: "Not authenticated", variant: "destructive" });
        return;
      }
      try {
        const res = await fetch(`/api/v1/cms/service-addons/${a.id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Failed to delete add-on");
        }
      } catch (error: any) {
        toast({ title: "Delete failed", description: error.message, variant: "destructive" });
        return;
      }
    }
    setAddons((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveAll = async () => {
    if (!token) {
      toast({ title: "Save failed", description: "Not authenticated", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = addons.map((a, i) => ({
        id: a.id,
        service_slug: serviceSlug,
        name: a.name,
        description: a.description,
        price_usd: Number(a.price_usd) || 0,
        period: a.period || "one-time",
        is_popular: !!a.is_popular,
        is_active: !!a.is_active,
        sort_order: i,
      }));
      const res = await fetch(`/api/v1/cms/service-addons/${serviceSlug}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ addons: payload }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to save add-ons");
      }
      setAddons((prev) => prev.map((a) => ({ ...a, _dirty: false, _new: false })));
      toast({ title: "Add-ons saved", description: `${payload.length} item(s) updated for ${serviceTitle}.` });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const dirtyCount = addons.filter((a) => a._dirty).length;

  return (
    <div className="bg-card border border-border rounded-2xl">
      <div className="flex items-center justify-between p-5 border-b border-border">
        <div>
          <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            Add-ons
            <span className="text-xs text-muted-foreground font-normal">({addons.length})</span>
            {dirtyCount > 0 && (
              <Badge variant="secondary" className="text-[10px]">{dirtyCount} unsaved</Badge>
            )}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Optional stackable extras shown beneath the pricing tiers (e.g. EIN, Registered Agent, Extra Revisions).
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={add}>
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
          <Button variant="hero" size="sm" onClick={saveAll} disabled={saving || dirtyCount === 0}>
            <Save className="w-4 h-4 mr-1" /> {saving ? "Saving…" : "Save add-ons"}
          </Button>
        </div>
      </div>

      <div className="p-5">
        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading add-ons…</p>
        ) : addons.length === 0 ? (
          <div className="text-sm text-muted-foreground py-10 text-center border-2 border-dashed border-border/60 rounded-xl">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
            No add-ons yet. Click <strong>Add</strong> to create one.
          </div>
        ) : (
          <div className="space-y-3">
            {addons.map((a, idx) => (
              <div
                key={a.id}
                className={`border rounded-xl p-4 ${
                  a.is_popular ? "border-primary/40 bg-primary/5" : "border-border bg-background/40"
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold text-muted-foreground">Add-on #{idx + 1}</span>
                  {a.is_popular && (
                    <Badge variant="default" className="text-[10px] gap-1">
                      <Star className="w-3 h-3 fill-current" /> Popular
                    </Badge>
                  )}
                  {!a.is_active && <Badge variant="secondary" className="text-[10px]">Hidden</Badge>}
                  <div className="ml-auto flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(idx, -1)} disabled={idx === 0}>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(idx, 1)} disabled={idx === addons.length - 1}>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => remove(idx)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Name</Label>
                    <Input value={a.name} onChange={(e) => update(idx, { name: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Price (USD)</Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                      <Input
                        type="number"
                        className="pl-6"
                        value={a.price_usd ?? ""}
                        onChange={(e) => update(idx, { price_usd: e.target.value === "" ? 0 : Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Billing period</Label>
                    <Input
                      value={a.period}
                      onChange={(e) => update(idx, { period: e.target.value })}
                      placeholder="one-time / month / year"
                    />
                  </div>
                  <div className="flex items-center gap-4 pt-6">
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <Checkbox
                        checked={!!a.is_popular}
                        onCheckedChange={(v) => update(idx, { is_popular: !!v })}
                      />
                      <Star className="w-3 h-3" /> Popular
                    </label>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <Switch
                        checked={!!a.is_active}
                        onCheckedChange={(v) => update(idx, { is_active: v })}
                      />
                      Visible
                    </label>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Description</Label>
                    <Textarea
                      rows={2}
                      value={a.description ?? ""}
                      onChange={(e) => update(idx, { description: e.target.value })}
                      placeholder="What does this add-on include?"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AddonsManager;

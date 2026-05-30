import { useEffect, useState } from "react";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAllProductUrls, type ProductUrl, fetchProductUrls } from "@/hooks/use-product-urls";
import { Plus, Save, Trash2, ExternalLink, Link2, Globe } from "lucide-react";

type Draft = Partial<ProductUrl> & { _isNew?: boolean };

const emptyDraft = (): Draft => ({
  _isNew: true,
  key: "",
  label: "",
  description: "",
  internal_path: "",
  external_url: "",
  open_in_new_tab: true,
  is_active: true,
  sort_order: 100,
});

const AdminProductUrls = () => {
  const { data: rows, isLoading, refetch } = useAllProductUrls();
  const qc = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [newDraft, setNewDraft] = useState<Draft>(emptyDraft());
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (rows) {
      const next: Record<string, Draft> = {};
      for (const r of rows) next[r.id] = { ...r };
      setDrafts(next);
    }
  }, [rows]);

  const refreshAll = async () => {
    await refetch();
    await fetchProductUrls();
    qc.invalidateQueries({ queryKey: ["product-urls"] });
  };

  const update = (id: string, patch: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const saveExisting = async (id: string) => {
    const d = drafts[id];
    if (!d) return;
    if (!d.key?.trim() || !d.label?.trim() || !d.external_url?.trim()) {
      toast.error("Key, label and external URL are required");
      return;
    }
    setSavingId(id);
    try {
      const { error } = await supabase
        .from("product_urls")
        .update({
          key: d.key.trim(),
          label: d.label.trim(),
          description: d.description?.trim() || null,
          internal_path: d.internal_path?.trim() || null,
          external_url: d.external_url.trim(),
          open_in_new_tab: !!d.open_in_new_tab,
          is_active: !!d.is_active,
          sort_order: Number(d.sort_order) || 0,
        })
        .eq("id", id);
      if (error) throw error;
      toast.success("Saved — links update site-wide on next page render.");
      await refreshAll();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSavingId(null);
    }
  };

  const createNew = async () => {
    const d = newDraft;
    if (!d.key?.trim() || !d.label?.trim() || !d.external_url?.trim()) {
      toast.error("Key, label and external URL are required");
      return;
    }
    setSavingId("new");
    try {
      const { error } = await supabase.from("product_urls").insert({
        key: d.key.trim(),
        label: d.label.trim(),
        description: d.description?.trim() || null,
        internal_path: d.internal_path?.trim() || null,
        external_url: d.external_url.trim(),
        open_in_new_tab: !!d.open_in_new_tab,
        is_active: !!d.is_active,
        sort_order: Number(d.sort_order) || 0,
      });
      if (error) throw error;
      toast.success("Product URL added.");
      setNewDraft(emptyDraft());
      await refreshAll();
    } catch (e: any) {
      toast.error(e.message || "Create failed");
    } finally {
      setSavingId(null);
    }
  };

  const remove = async (id: string) => {
    try {
      const { error } = await supabase.from("product_urls").delete().eq("id", id);
      if (error) throw error;
      toast.success("Removed");
      await refreshAll();
    } catch (e: any) {
      toast.error(e.message || "Delete failed");
    }
  };

  return (
    <SuperAdminLayout>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
          <Globe className="w-6 h-6 text-primary" /> Product URL Manager
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
          Every external product (Dynime OS, Dynime Self-Hosted Payment Gateway,
          and any future product) is referenced site-wide by a short <strong>identifier</strong>{" "}
          (e.g. <code className="px-1 rounded bg-secondary">dbm</code>,{" "}
          <code className="px-1 rounded bg-secondary">dshg</code>). Update the{" "}
          <strong>External URL</strong> here once and every button, link and CTA on the public site
          that references that identifier — header, footer, landing pages, content pages — instantly
          points to the new destination. No code changes, no broken links.
        </p>
        <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground space-y-1">
          <div><strong className="text-foreground">In code, use the identifier — not the URL:</strong></div>
          <div><code className="px-1 rounded bg-secondary">{"<ProductLink productKey=\"dbm\">Open Dynime OS</ProductLink>"}</code></div>
          <div>or on any existing button/anchor: <code className="px-1 rounded bg-secondary">data-product-key="dbm"</code></div>
          <div>The legacy <em>internal path</em> field below is optional — it auto-redirects old in-app links (e.g. <code>/products/dbm</code>) to the external URL, and is safe to leave blank for new products.</div>
        </div>
      </div>

      {/* Create new */}
      <div className="glass-card p-6 mb-8 border-2 border-dashed border-primary/30">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
          <Plus className="w-5 h-5 text-primary" /> Add a new product
        </h2>
        <DraftForm draft={newDraft} onChange={(p) => setNewDraft({ ...newDraft, ...p })} />
        <div className="mt-4 flex justify-end">
          <Button onClick={createNew} disabled={savingId === "new"}>
            <Plus className="w-4 h-4 mr-1" />
            {savingId === "new" ? "Adding…" : "Add product URL"}
          </Button>
        </div>
      </div>

      {/* Existing list */}
      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : !rows || rows.length === 0 ? (
        <p className="text-muted-foreground">No product URLs yet — add your first above.</p>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => {
            const d = drafts[r.id] || r;
            return (
              <div key={r.id} className="glass-card p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-semibold text-foreground truncate">{r.label}</h3>
                      <Badge variant={r.is_active ? "default" : "secondary"}>
                        {r.is_active ? "Active" : "Disabled"}
                      </Badge>
                      <code className="text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                        {r.key}
                      </code>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1.5">
                      <Link2 className="w-3 h-3 shrink-0" />
                      <span className="truncate">{r.internal_path || "(no internal path)"}</span>
                      <span>→</span>
                      <a
                        href={r.external_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1 truncate"
                      >
                        {r.external_url} <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove "{r.label}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Links pointing to <code>{r.internal_path}</code> will go back to opening
                          their original on-site page (which may be missing or outdated).
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove(r.id)}>Remove</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                <DraftForm draft={d} onChange={(p) => update(r.id, p)} />

                <div className="mt-4 flex justify-end">
                  <Button onClick={() => saveExisting(r.id)} disabled={savingId === r.id}>
                    <Save className="w-4 h-4 mr-1" />
                    {savingId === r.id ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SuperAdminLayout>
  );
};

const DraftForm = ({
  draft,
  onChange,
}: {
  draft: Draft;
  onChange: (patch: Partial<Draft>) => void;
}) => (
  <div className="grid md:grid-cols-2 gap-4">
    <div>
      <Label className="text-xs">
        Identifier <span className="text-primary">*</span>
      </Label>
      <Input
        value={draft.key || ""}
        onChange={(e) => onChange({ key: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") })}
        placeholder="dbm"
      />
      <p className="text-[11px] text-muted-foreground mt-1">
        Short lowercase code used site-wide (<code>dbm</code>, <code>dshg</code>, …).
        Referenced from buttons / links via <code>productKey</code> or <code>data-product-key</code>.
      </p>
    </div>
    <div>
      <Label className="text-xs">Display label <span className="text-primary">*</span></Label>
      <Input
        value={draft.label || ""}
        onChange={(e) => onChange({ label: e.target.value })}
        placeholder="Dynime OS"
      />
    </div>
    <div>
      <Label className="text-xs">External URL (where the product lives) <span className="text-primary">*</span></Label>
      <Input
        value={draft.external_url || ""}
        onChange={(e) => onChange({ external_url: e.target.value })}
        placeholder="https://app.dynime.com"
      />
      <p className="text-[11px] text-muted-foreground mt-1">
        Change this any time — every button using this identifier follows immediately.
      </p>
    </div>
    <div>
      <Label className="text-xs">Legacy internal path (optional)</Label>
      <Input
        value={draft.internal_path || ""}
        onChange={(e) => onChange({ internal_path: e.target.value })}
        placeholder="/products/dbm"
      />
      <p className="text-[11px] text-muted-foreground mt-1">
        Auto-redirects old in-app routes to the external URL. Safe to leave blank for new products.
      </p>
    </div>
    <div className="md:col-span-2">
      <Label className="text-xs">Description (internal note)</Label>
      <Textarea
        rows={2}
        value={draft.description || ""}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder="What this product is, who manages it, etc."
      />
    </div>
    <div className="flex items-center gap-3">
      <Switch
        checked={!!draft.open_in_new_tab}
        onCheckedChange={(v) => onChange({ open_in_new_tab: v })}
      />
      <span className="text-sm text-foreground">Open in new tab</span>
    </div>
    <div className="flex items-center gap-3">
      <Switch
        checked={!!draft.is_active}
        onCheckedChange={(v) => onChange({ is_active: v })}
      />
      <span className="text-sm text-foreground">Active</span>
    </div>
    <div>
      <Label className="text-xs">Sort order</Label>
      <Input
        type="number"
        value={String(draft.sort_order ?? 0)}
        onChange={(e) => onChange({ sort_order: Number(e.target.value) || 0 })}
      />
    </div>
  </div>
);

export default AdminProductUrls;

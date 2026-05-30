import { useEffect, useState } from "react";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, Save, ChevronUp, ChevronDown, Loader2, Milestone } from "lucide-react";
import { useAboutTimeline } from "@/hooks/use-about-timeline";
import {
  ABOUT_TIMELINE_KEY,
  TIMELINE_ICON_NAMES,
  getTimelineIcon,
  type TimelineItem,
} from "@/lib/about-timeline-defaults";

const blank = (): TimelineItem => ({
  year: "",
  tag: "",
  icon: "Sparkles",
  title: "",
  desc: "",
});

const AdminAboutTimeline = () => {
  const { data } = useAboutTimeline();
  const qc = useQueryClient();
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setItems(data);
  }, [data]);

  const update = (i: number, patch: Partial<TimelineItem>) =>
    setItems((arr) => arr.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));

  const add = () => setItems((arr) => [...arr, blank()]);
  const remove = (i: number) => setItems((arr) => arr.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) =>
    setItems((arr) => {
      const j = i + dir;
      if (j < 0 || j >= arr.length) return arr;
      const next = arr.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const save = async () => {
    setSaving(true);
    try {
      const cleaned = items.filter((it) => it.title.trim() || it.year.trim());
      const { error } = await supabase
        .from("site_settings")
        .upsert([{ key: ABOUT_TIMELINE_KEY, value: JSON.stringify(cleaned) }], { onConflict: "key" });
      if (error) throw error;
      toast.success("Timeline saved. About page will update automatically.");
      qc.invalidateQueries({ queryKey: ["about-timeline"] });
      qc.invalidateQueries({ queryKey: ["site-settings"] });
    } catch (e: any) {
      toast.error(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Milestone className="w-6 h-6 text-primary" /> About Page Timeline
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Edit the “Our Story” timeline shown on the About page. Changes go live instantly.
            </p>
          </div>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save changes
          </Button>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <div>
              <CardTitle className="text-base">Timeline entries ({items.length})</CardTitle>
              <CardDescription>Add, edit, reorder or delete milestones.</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={add}>
              <Plus className="w-4 h-4 mr-1" /> Add entry
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No entries — click “Add entry” to begin.</p>
            )}
            {items.map((it, i) => {
              const Icon = getTimelineIcon(it.icon);
              return (
                <div key={i} className="rounded-xl border border-border bg-card/40 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center gap-1 pt-1">
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                      <button title="Move up" className="text-muted-foreground hover:text-foreground" onClick={() => move(i, -1)}>
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button title="Move down" className="text-muted-foreground hover:text-foreground" onClick={() => move(i, 1)}>
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid flex-1 gap-3 md:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Year / Date</Label>
                        <Input value={it.year} onChange={(e) => update(i, { year: e.target.value })} placeholder="2024" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Tag / Highlight</Label>
                        <Input value={it.tag} onChange={(e) => update(i, { tag: e.target.value })} placeholder="Launch" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Icon</Label>
                        <Select value={it.icon} onValueChange={(v) => update(i, { icon: v })}>
                          <SelectTrigger>
                            <span className="flex items-center gap-2">
                              <Icon className="w-4 h-4 text-primary" />
                              <SelectValue />
                            </span>
                          </SelectTrigger>
                          <SelectContent className="max-h-72">
                            {TIMELINE_ICON_NAMES.map((name) => {
                              const I = getTimelineIcon(name);
                              return (
                                <SelectItem key={name} value={name}>
                                  <span className="flex items-center gap-2">
                                    <I className="w-4 h-4" /> {name}
                                  </span>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5 md:col-span-3">
                        <Label className="text-xs">Heading</Label>
                        <Input value={it.title} onChange={(e) => update(i, { title: e.target.value })} placeholder="Officially registered in London" />
                      </div>
                      <div className="space-y-1.5 md:col-span-3">
                        <Label className="text-xs">Description</Label>
                        <Textarea rows={2} value={it.desc} onChange={(e) => update(i, { desc: e.target.value })} placeholder="Short story for this milestone" />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm(`Delete “${it.title || it.year || "this entry"}”?`)) remove(i);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save changes
          </Button>
        </div>
      </div>
    </SuperAdminLayout>
  );
};

export default AdminAboutTimeline;

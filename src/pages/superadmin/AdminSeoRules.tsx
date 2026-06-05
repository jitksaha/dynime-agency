import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Save, RotateCcw, Sliders, Gauge } from "lucide-react";
import {
  DEFAULT_SEO_RULES,
  SEO_CHECK_LABELS,
  mergeRules,
  type SeoRules,
} from "@/lib/seo-rules";

const thresholdGroups: { title: string; keys: (keyof SeoRules["thresholds"])[] }[] = [
  {
    title: "Title & Meta",
    keys: [
      "titleMin", "titleMax", "titleSoftMin", "titleSoftMax",
      "descMin", "descMax", "descSoftMin", "descSoftMax",
    ],
  },
  {
    title: "URL & Structure",
    keys: ["slugMaxChars", "slugMaxParts", "h2Pass"],
  },
  {
    title: "Content Depth & Density",
    keys: [
      "wordCountPass", "wordCountWarn",
      "densityMin", "densityMax", "densityHardMax",
      "paraMaxWords",
    ],
  },
  {
    title: "Readability & Links",
    keys: [
      "fleschPass", "fleschWarn",
      "internalLinksMin", "externalLinksMin", "externalLinksMax",
    ],
  },
  {
    title: "FAQs & Keywords",
    keys: ["faqsPass", "faqsWarn", "secondaryKwPass", "secondaryKwWarn"],
  },
];

const AdminSeoRules = () => {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<SeoRules>(DEFAULT_SEO_RULES);

  const { data: rules } = useQuery({
    queryKey: ["site-settings-row", "seo_rules"],
    queryFn: async () => {
      const res = await apiGet<any>("/cms/site-settings/seo_rules");
      let val: any = res?.value;
      while (typeof val === "string") {
        try { val = JSON.parse(val); } catch { break; }
      }
      return mergeRules(val);
    },
  });

  useEffect(() => {
    if (rules) setDraft(rules);
  }, [rules]);

  const save = useMutation({
    mutationFn: async (next: SeoRules) => {
      await apiPost("/cms/site-settings", { key: "seo_rules", value: next });
    },
    onSuccess: () => {
      toast.success("SEO scoring rules updated");
      qc.invalidateQueries({ queryKey: ["site-settings-row", "seo_rules"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to save"),
  });

  const totalWeight = Object.values(draft.weights).reduce((a, b) => a + b, 0);

  return (
    <SuperAdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">SEO Scoring Rules</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tune how the live SEO analyzer scores every Page, Blog post, and Per-Page SEO entry.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDraft(DEFAULT_SEO_RULES)}
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset to defaults
          </Button>
          <Button size="sm" onClick={() => save.mutate(draft)} disabled={save.isPending}>
            <Save className="w-3.5 h-3.5 mr-1" />
            {save.isPending ? "Saving..." : "Save & Sync"}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 mb-6 flex items-center gap-3">
        <Gauge className="w-5 h-5 text-primary" />
        <div className="text-sm">
          Total weight pool: <span className="font-bold">{totalWeight}</span> points · Higher
          weight = bigger impact on the 0–100 score.
        </div>
      </div>

      <Tabs defaultValue="weights">
        <TabsList>
          <TabsTrigger value="weights">
            <Sliders className="w-3.5 h-3.5 mr-1" /> Check weights
          </TabsTrigger>
          <TabsTrigger value="thresholds">
            <Gauge className="w-3.5 h-3.5 mr-1" /> Thresholds
          </TabsTrigger>
        </TabsList>

        <TabsContent value="weights" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(draft.weights).map(([id, w]) => (
              <div
                key={id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-foreground truncate">
                    {SEO_CHECK_LABELS[id] || id}
                  </div>
                  <div className="text-[10px] text-muted-foreground">{id}</div>
                </div>
                <Input
                  type="number"
                  min={0}
                  max={20}
                  value={w}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      weights: { ...d.weights, [id]: Number(e.target.value) || 0 },
                    }))
                  }
                  className="h-8 w-20 text-xs text-right"
                />
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="thresholds" className="mt-4 space-y-6">
          {thresholdGroups.map((g) => (
            <div key={g.title}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                {g.title}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {g.keys.map((k) => (
                  <div key={k}>
                    <Label className="text-[11px]">{k}</Label>
                    <Input
                      type="number"
                      step={k.includes("density") ? 0.1 : 1}
                      value={draft.thresholds[k] as number}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          thresholds: {
                            ...d.thresholds,
                            [k]: Number(e.target.value) || 0,
                          },
                        }))
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </SuperAdminLayout>
  );
};

export default AdminSeoRules;

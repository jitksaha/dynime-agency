import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Search, Save, RotateCcw, AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";
import { PAGE_SEO_REGISTRY, type PageSEORegistryEntry } from "@/lib/page-seo-registry";
import SeoScorePanel from "@/components/admin/SeoScorePanel";
import OgImageUploader from "@/components/admin/OgImageUploader";

interface OverrideRecord {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  ogImageAlt?: string;
  twitterCard?: "summary" | "summary_large_image";
  noIndex?: boolean;
}

const groups: PageSEORegistryEntry["group"][] = ["Core", "Product", "Service", "Legal"];

const AdminPageSEO = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeKey, setActiveKey] = useState<string>(PAGE_SEO_REGISTRY[0]?.key ?? "");
  const [draft, setDraft] = useState<OverrideRecord>({});

  const { data: row } = useQuery({
    queryKey: ["site-settings-row", "page_seo"],
    queryFn: async () => {
      const res = await apiGet<any>("/cms/site-settings/page_seo");
      let val: any = res?.value;
      while (typeof val === "string") {
        try { val = JSON.parse(val); } catch { break; }
      }
      return (val && typeof val === "object" ? val : {}) as Record<string, OverrideRecord>;
    },
  });

  const overrides = row || {};
  const activeEntry = PAGE_SEO_REGISTRY.find((e) => e.key === activeKey);
  const activeOverride = overrides[activeKey] || {};

  useEffect(() => {
    setDraft({
      title: activeOverride.title ?? "",
      description: activeOverride.description ?? "",
      keywords: Array.isArray(activeOverride.keywords)
        ? (activeOverride.keywords as any).join(", ")
        : (activeOverride.keywords ?? ""),
      ogImage: activeOverride.ogImage ?? "",
      ogImageAlt: activeOverride.ogImageAlt ?? "",
      twitterCard: activeOverride.twitterCard ?? "summary_large_image",
      noIndex: !!activeOverride.noIndex,
    });
  }, [activeKey, JSON.stringify(activeOverride)]);

  const save = useMutation({
    mutationFn: async (next: Record<string, OverrideRecord>) => {
      await apiPost("/cms/site-settings", { key: "page_seo", value: next });
    },
    onSuccess: () => {
      toast.success("Page SEO synced site-wide");
      qc.invalidateQueries({ queryKey: ["site-settings"] });
      qc.invalidateQueries({ queryKey: ["site-settings-row", "page_seo"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to save"),
  });

  const handleSave = () => {
    if (!activeEntry) return;
    const cleaned: OverrideRecord = {
      title: draft.title?.trim() || undefined,
      description: draft.description?.trim() || undefined,
      keywords: typeof draft.keywords === "string" && draft.keywords.trim()
        ? draft.keywords as any
        : undefined,
      ogImage: draft.ogImage?.trim() || undefined,
      ogImageAlt: draft.ogImageAlt?.trim() || undefined,
      twitterCard:
        draft.twitterCard && draft.twitterCard !== "summary_large_image"
          ? draft.twitterCard
          : undefined,
      noIndex: draft.noIndex || undefined,
    };
    // Convert keywords string -> array on save
    const stored: any = { ...cleaned };
    if (typeof stored.keywords === "string") {
      stored.keywords = stored.keywords.split(",").map((k: string) => k.trim()).filter(Boolean);
      if (stored.keywords.length === 0) delete stored.keywords;
    }

    const next = { ...overrides };
    if (Object.values(stored).every((v) => v === undefined)) {
      delete next[activeEntry.key];
    } else {
      next[activeEntry.key] = stored;
    }
    save.mutate(next);
  };

  const handleReset = () => {
    if (!activeEntry) return;
    const next = { ...overrides };
    delete next[activeEntry.key];
    save.mutate(next);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return PAGE_SEO_REGISTRY;
    return PAGE_SEO_REGISTRY.filter(
      (e) =>
        e.label.toLowerCase().includes(q) ||
        e.path.toLowerCase().includes(q) ||
        e.key.toLowerCase().includes(q),
    );
  }, [search]);

  const titleLen = (draft.title || activeEntry?.defaults.title || "").length;
  const descLen = (draft.description || activeEntry?.defaults.description || "").length;

  return (
    <SuperAdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Per-Page SEO</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Edit meta titles & descriptions for every page. Changes auto-sync site-wide.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px,1fr] gap-6">
        {/* Left: page list */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search pages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

          <Tabs defaultValue="Core">
            <TabsList className="w-full">
              {groups.map((g) => (
                <TabsTrigger key={g} value={g} className="flex-1 text-xs">
                  {g}
                </TabsTrigger>
              ))}
            </TabsList>
            {groups.map((g) => (
              <TabsContent key={g} value={g} className="mt-3">
                <div className="max-h-[60vh] overflow-y-auto space-y-1">
                  {filtered
                    .filter((e) => e.group === g)
                    .map((e) => {
                      const has = !!overrides[e.key];
                      return (
                        <button
                          key={e.key}
                          onClick={() => setActiveKey(e.key)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                            activeKey === e.key
                              ? "bg-primary/10 text-foreground border border-primary/30"
                              : "bg-card border border-border hover:bg-secondary/50 text-foreground"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium truncate">{e.label}</span>
                            {has && (
                              <Badge variant="secondary" className="text-[9px] shrink-0">
                                Custom
                              </Badge>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground">{e.path}</span>
                        </button>
                      );
                    })}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* Right: editor */}
        {activeEntry && (
          <div className="space-y-6">
            <div className="p-6 bg-card border border-border rounded-xl space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-heading text-lg font-bold text-foreground">{activeEntry.label}</h2>
                  <a
                    href={activeEntry.path}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary mt-0.5 hover:underline"
                  >
                    {activeEntry.path} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleReset} disabled={!overrides[activeKey]}>
                    <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={save.isPending}>
                    <Save className="w-3.5 h-3.5 mr-1" />
                    {save.isPending ? "Saving..." : "Save & Sync"}
                  </Button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Meta Title</Label>
                  <span
                    className={`text-[10px] ${
                      titleLen > 60 ? "text-destructive" : titleLen < 30 ? "text-yellow-500" : "text-muted-foreground"
                    }`}
                  >
                    {titleLen}/60
                  </span>
                </div>
                <Input
                  value={draft.title || ""}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                  placeholder={activeEntry.defaults.title}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Default: {activeEntry.defaults.title}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Meta Description</Label>
                  <span
                    className={`text-[10px] ${
                      descLen > 160 ? "text-destructive" : descLen < 70 ? "text-yellow-500" : "text-muted-foreground"
                    }`}
                  >
                    {descLen}/160
                  </span>
                </div>
                <Textarea
                  rows={3}
                  value={draft.description || ""}
                  onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                  placeholder={activeEntry.defaults.description}
                />
                <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                  Default: {activeEntry.defaults.description}
                </p>
              </div>

              <div>
                <Label className="text-xs">Keywords (comma-separated)</Label>
                <Input
                  value={typeof draft.keywords === "string" ? draft.keywords : ""}
                  onChange={(e) => setDraft((d) => ({ ...d, keywords: e.target.value }))}
                  placeholder={(activeEntry.defaults.keywords || []).join(", ")}
                />
              </div>

              <OgImageUploader
                value={draft.ogImage || ""}
                onChange={(url) => setDraft((d) => ({ ...d, ogImage: url }))}
                context={{
                  title: draft.title || activeEntry.defaults.title,
                  description: draft.description || activeEntry.defaults.description,
                }}
                folder={`og/pages/${activeEntry.key}`}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">OG / Twitter Image Alt</Label>
                  <Input
                    value={draft.ogImageAlt || ""}
                    onChange={(e) => setDraft((d) => ({ ...d, ogImageAlt: e.target.value }))}
                    placeholder={`${draft.title || activeEntry.defaults.title} — social preview`}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Branded alt text crawlers and screen readers see for this page's social card.
                  </p>
                </div>
                <div>
                  <Label className="text-xs">Twitter Card Style</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={draft.twitterCard || "summary_large_image"}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        twitterCard: e.target.value as OverrideRecord["twitterCard"],
                      }))
                    }
                  >
                    <option value="summary_large_image">Large image (recommended)</option>
                    <option value="summary">Summary (small thumbnail)</option>
                  </select>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    How Twitter / X renders the share card.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <div>
                  <Label className="text-xs">Hide from search engines (noindex)</Label>
                  <p className="text-[10px] text-muted-foreground">
                    Tells Google, Bing & AI crawlers not to index this page.
                  </p>
                </div>
                <Switch
                  checked={!!draft.noIndex}
                  onCheckedChange={(v) => setDraft((d) => ({ ...d, noIndex: v }))}
                />
              </div>
            </div>

            {/* Google preview */}
            <div className="p-6 bg-card border border-border rounded-xl space-y-3">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Google Search Preview
              </h3>
              <div className="p-4 bg-white dark:bg-secondary/30 rounded-lg max-w-xl">
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  {draft.title || activeEntry.defaults.title} | Dynime LLC.
                </p>
                <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
                  {window.location.origin}
                  {activeEntry.path}
                </p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
                  {draft.description || activeEntry.defaults.description}
                </p>
              </div>
              {(titleLen > 60 || descLen > 160) && (
                <div className="flex items-center gap-2 text-xs text-yellow-600">
                  <AlertTriangle className="w-3.5 h-3.5" /> Some values exceed recommended length and may be truncated.
                </div>
              )}
            </div>

            {/* Social share preview (Facebook / LinkedIn / Twitter X) */}
            <div className="p-6 bg-card border border-border rounded-xl space-y-3">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Social Share Preview
              </h3>
              <div className="max-w-md rounded-xl overflow-hidden border border-border bg-white dark:bg-secondary/30">
                {draft.ogImage ? (
                  <img
                    src={draft.ogImage}
                    alt={draft.ogImageAlt || `${draft.title || activeEntry.defaults.title} — social preview`}
                    className="w-full aspect-[1200/630] object-cover bg-secondary"
                  />
                ) : (
                  <div className="w-full aspect-[1200/630] flex items-center justify-center text-xs text-muted-foreground bg-gradient-to-br from-primary/10 to-secondary">
                    Site default image will be used
                  </div>
                )}
                <div className="p-3 space-y-1">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {new URL(window.location.origin).host}
                  </p>
                  <p className="text-sm font-semibold text-foreground line-clamp-2">
                    {draft.title || activeEntry.defaults.title}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {draft.description || activeEntry.defaults.description}
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Card style: <span className="font-medium text-foreground">{draft.twitterCard || "summary_large_image"}</span>{" "}
                · alt: <span className="font-medium text-foreground">{draft.ogImageAlt?.trim() || `${draft.title || activeEntry.defaults.title} — social preview`}</span>
              </p>
            </div>

            <SeoScorePanel
              input={{
                title: draft.title || activeEntry.defaults.title,
                metaDescription: draft.description || activeEntry.defaults.description,
                slug: activeEntry.path.replace(/^\//, ""),
                primaryKeyword: typeof draft.keywords === "string"
                  ? draft.keywords.split(",")[0]?.trim()
                  : Array.isArray(activeEntry.defaults.keywords) ? activeEntry.defaults.keywords[0] : undefined,
                secondaryKeywords: typeof draft.keywords === "string"
                  ? draft.keywords.split(",").slice(1).map((s) => s.trim()).filter(Boolean)
                  : (activeEntry.defaults.keywords || []).slice(1),
              }}
            />
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
};

export default AdminPageSEO;

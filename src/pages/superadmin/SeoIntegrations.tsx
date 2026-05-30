import { useEffect, useState } from "react";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, Search, Flame, BarChart3, ExternalLink, Sparkles } from "lucide-react";

type Status = {
  ok: boolean;
  configured: boolean;
  latencyMs: number;
  status?: number;
  detail?: string;
  error?: string;
  note?: string;
  sample?: string[];
};
type Result = { ok: boolean; checkedAt: string; integrations: { gsc?: Status; firecrawl?: Status; semrush?: Status } };

const integrationsMeta = [
  { id: "gsc" as const, name: "Google Search Console", desc: "Indexing, queries, CTR, sitemaps.", icon: Search, manageHref: "/superadmin/search-console", connectorTitle: "Linked via Connectors" },
  { id: "firecrawl" as const, name: "Firecrawl", desc: "JS-rendered scraping, sitemap discovery, structured extraction.", icon: Flame, manageHref: undefined, connectorTitle: "Connect under Connectors" },
  { id: "semrush" as const, name: "Semrush", desc: "Keyword research, domain analysis, SERP, backlinks.", icon: BarChart3, manageHref: undefined, connectorTitle: "Built-in Lovable agent tool" },
];

export default function SeoIntegrations() {
  const [data, setData] = useState<Result | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [auto, setAuto] = useState<boolean>(() => localStorage.getItem("seo:int:auto") === "1");

  async function run(target: "all" | "gsc" | "firecrawl" | "semrush" = "all") {
    setLoading(target);
    try {
      const { data: res, error } = await supabase.functions.invoke("seo-integrations", { body: { target } });
      if (error) throw error;
      setData(prev => {
        if (target === "all" || !prev) return res as Result;
        return { ...prev, checkedAt: res.checkedAt, integrations: { ...prev.integrations, ...res.integrations } };
      });
      if (target !== "all") toast.success(`Tested ${target}`);
    } catch (e: any) {
      toast.error(e.message ?? "Test failed");
    } finally {
      setLoading(null);
    }
  }

  useEffect(() => { run("all"); }, []);
  useEffect(() => {
    localStorage.setItem("seo:int:auto", auto ? "1" : "0");
    if (!auto) return;
    const id = window.setInterval(() => run("all"), 60_000);
    return () => window.clearInterval(id);
  }, [auto]);

  const summary = data ? Object.values(data.integrations).reduce(
    (acc, s) => { if (!s) return acc; if (!s.configured) acc.missing++; else if (s.ok) acc.healthy++; else acc.failing++; return acc; },
    { healthy: 0, failing: 0, missing: 0 },
  ) : null;

  return (
    <SuperAdminLayout>
      <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="h-6 w-6 text-primary" />SEO Integrations</h1>
            <p className="text-muted-foreground text-sm">Status of connected SEO tools and test runs to keep your dashboard live.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch id="auto" checked={auto} onCheckedChange={setAuto} />
              <Label htmlFor="auto" className="text-xs cursor-pointer">Auto-refresh (60s)</Label>
            </div>
            <Button size="sm" onClick={() => run("all")} disabled={loading !== null}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading === "all" ? "animate-spin" : ""}`} />
              Test all
            </Button>
          </div>
        </div>

        {summary && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryStat label="Healthy" value={summary.healthy} tone="ok" />
            <SummaryStat label="Failing" value={summary.failing} tone="bad" />
            <SummaryStat label="Not configured" value={summary.missing} tone="warn" />
            <SummaryStat label="Last checked" value={data ? new Date(data.checkedAt).toLocaleTimeString() : "—"} />
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {integrationsMeta.map(meta => {
            const s = data?.integrations[meta.id];
            const Icon = meta.icon;
            const isLoading = loading === meta.id || loading === "all";
            const tone = !s ? "muted" : !s.configured ? "warn" : s.ok ? "ok" : "bad";
            return (
              <Card key={meta.id} className={`relative overflow-hidden border-l-4 ${
                tone === "ok" ? "border-l-emerald-500" : tone === "bad" ? "border-l-destructive" : tone === "warn" ? "border-l-yellow-500" : "border-l-muted"
              }`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="rounded-md bg-primary/10 p-2 text-primary"><Icon className="h-4 w-4" /></div>
                      <div>
                        <CardTitle className="text-base">{meta.name}</CardTitle>
                        <p className="text-[11px] text-muted-foreground">{meta.connectorTitle}</p>
                      </div>
                    </div>
                    <StatusBadge s={s} />
                  </div>
                  <CardDescription>{meta.desc}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {s ? (
                    <>
                      <div className="rounded-md bg-muted/40 p-2 text-xs space-y-1">
                        <div><span className="text-muted-foreground">Detail:</span> {s.detail || s.error || "—"}</div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Latency: {s.latencyMs} ms</span>
                          {s.status ? <span>HTTP {s.status}</span> : null}
                        </div>
                        {s.note && <div className="text-muted-foreground italic">{s.note}</div>}
                        {s.sample && s.sample.length > 0 && (
                          <div className="pt-1"><span className="text-muted-foreground">Sites:</span> {s.sample.join(", ")}</div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">Not yet tested.</div>
                  )}
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => run(meta.id)} disabled={isLoading}>
                      <RefreshCw className={`mr-1 h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                      Test run
                    </Button>
                    {meta.manageHref && (
                      <Button size="sm" variant="ghost" asChild>
                        <a href={meta.manageHref}>Manage <ExternalLink className="ml-1 h-3 w-3" /></a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">How to add or fix integrations</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• <strong>Google Search Console</strong> — already connected. Manage in <a className="text-primary underline" href="/superadmin/search-console">Search Console</a>.</p>
            <p>• <strong>Firecrawl</strong> — open <strong>Connectors</strong> from the workspace sidebar and link the Firecrawl connector. The <code className="px-1 rounded bg-muted">FIRECRAWL_API_KEY</code> will be injected automatically.</p>
            <p>• <strong>Semrush</strong> — exposed as a Lovable agent tool. Just ask in chat (e.g. "Run a Semrush domain analysis on dynime.com").</p>
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
}

function StatusBadge({ s }: { s?: Status }) {
  if (!s) return <Badge variant="outline">Pending</Badge>;
  if (!s.configured) return <Badge className="bg-yellow-500 text-black"><AlertCircle className="mr-1 h-3 w-3" />Not configured</Badge>;
  if (s.ok) return <Badge className="bg-emerald-500 text-white"><CheckCircle2 className="mr-1 h-3 w-3" />Connected</Badge>;
  return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Failing</Badge>;
}

function SummaryStat({ label, value, tone }: { label: string; value: number | string; tone?: "ok" | "bad" | "warn" }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold ${tone === "ok" ? "text-emerald-500" : tone === "bad" ? "text-destructive" : tone === "warn" ? "text-yellow-600" : ""}`}>{value}</div>
    </div>
  );
}

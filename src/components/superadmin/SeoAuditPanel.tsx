import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, AlertOctagon, Info, ShieldCheck, RefreshCw, ExternalLink } from "lucide-react";

type Severity = "critical" | "high" | "medium" | "low";
type Issue = { id: string; severity: Severity; category: string; title: string; detail: string; url: string; fix: string };
type AuditResult = {
  origin: string;
  checkedAt: string;
  summary: { pagesScanned: number; linksChecked: number; counts: Record<Severity, number> };
  issues: Issue[];
  pages: { url: string; status: number; title?: string; h1Count?: number; imgsNoAlt?: number }[];
};

const sevStyles: Record<Severity, string> = {
  critical: "bg-destructive text-destructive-foreground",
  high: "bg-orange-500 text-white",
  medium: "bg-yellow-500 text-black",
  low: "bg-muted text-muted-foreground",
};
const sevIcon = (s: Severity) =>
  s === "critical" ? <AlertOctagon className="h-3.5 w-3.5" /> :
  s === "high" ? <AlertTriangle className="h-3.5 w-3.5" /> :
  s === "medium" ? <Info className="h-3.5 w-3.5" /> :
  <ShieldCheck className="h-3.5 w-3.5" />;

export default function SeoAuditPanel() {
  const [origin, setOrigin] = useState("https://dynime.com");
  const [maxPages, setMaxPages] = useState(20);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AuditResult | null>(null);
  const [filter, setFilter] = useState<Severity | "all">("all");

  async function runAudit() {
    setLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("seo-audit", { body: { origin, maxPages } });
      if (error) throw error;
      setData(res as AuditResult);
      toast.success(`Scanned ${res.summary.pagesScanned} pages — ${res.issues.length} issues`);
    } catch (e: any) {
      toast.error(e.message ?? "Audit failed");
    } finally {
      setLoading(false);
    }
  }

  const issues = data?.issues.filter(i => filter === "all" || i.severity === filter) ?? [];
  const grouped = issues.reduce<Record<string, Issue[]>>((acc, i) => {
    (acc[i.category] ||= []).push(i); return acc;
  }, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>Technical SEO Audit</CardTitle>
        <CardDescription>Crawls your site for missing headers, duplicate meta tags, broken links and render-blocking issues. Lists prioritized fixes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <Label>Origin</Label>
            <Input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="https://dynime.com" />
          </div>
          <div className="w-28">
            <Label>Max pages</Label>
            <Input type="number" min={1} max={50} value={maxPages} onChange={(e) => setMaxPages(Number(e.target.value))} />
          </div>
          <Button onClick={runAudit} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Auditing…" : "Run audit"}
          </Button>
        </div>

        {data && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
              <Stat label="Pages" value={data.summary.pagesScanned} />
              <Stat label="Links checked" value={data.summary.linksChecked} />
              <Stat label="Critical" value={data.summary.counts.critical} tone="critical" />
              <Stat label="High" value={data.summary.counts.high} tone="high" />
              <Stat label="Medium" value={data.summary.counts.medium} tone="medium" />
              <Stat label="Low" value={data.summary.counts.low} tone="low" />
            </div>
            <p className="text-xs text-muted-foreground">Audited {data.origin} at {new Date(data.checkedAt).toLocaleString()}</p>

            <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
              <TabsList>
                <TabsTrigger value="all">All ({data.issues.length})</TabsTrigger>
                <TabsTrigger value="critical">Critical</TabsTrigger>
                <TabsTrigger value="high">High</TabsTrigger>
                <TabsTrigger value="medium">Medium</TabsTrigger>
                <TabsTrigger value="low">Low</TabsTrigger>
              </TabsList>
              <TabsContent value={filter} className="mt-4">
                <ScrollArea className="h-[520px] rounded-md border">
                  <div className="p-3 space-y-4">
                    {Object.keys(grouped).length === 0 && (
                      <p className="p-6 text-center text-sm text-muted-foreground">No issues match this filter. 🎉</p>
                    )}
                    {Object.entries(grouped).map(([cat, list]) => (
                      <div key={cat}>
                        <h4 className="mb-2 text-sm font-semibold">{cat} <span className="text-muted-foreground">({list.length})</span></h4>
                        <div className="space-y-2">
                          {list.map(i => (
                            <div key={i.id} className="rounded-md border p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <Badge className={sevStyles[i.severity]}>{sevIcon(i.severity)}<span className="ml-1 capitalize">{i.severity}</span></Badge>
                                  <span className="font-medium text-sm">{i.title}</span>
                                </div>
                                <a href={i.url} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1">
                                  Open <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                              {i.detail && <p className="mt-1 text-xs text-muted-foreground break-all">{i.detail}</p>}
                              <p className="mt-2 text-xs"><span className="font-medium">Fix:</span> {i.fix}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </>
        )}

        {!data && !loading && (
          <p className="text-sm text-muted-foreground">Click <strong>Run audit</strong> to crawl your site and surface prioritized SEO fixes.</p>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: Severity }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold ${tone === "critical" ? "text-destructive" : tone === "high" ? "text-orange-500" : tone === "medium" ? "text-yellow-600" : ""}`}>{value}</div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { toast } from "sonner";
import { RefreshCw, ExternalLink, Search, MousePointerClick, Eye, AlertTriangle, CheckCircle2, Send, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Row = { keys?: string[]; clicks: number; impressions: number; ctr: number; position: number };
type SaResp = { rows?: Row[]; responseAggregationType?: string };
type Sitemap = {
  path: string;
  lastSubmitted?: string;
  isPending?: boolean;
  errors?: string;
  warnings?: string;
  contents?: { type: string; submitted: string; indexed: string }[];
};

const RANGES = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 28 days", days: 28 },
  { label: "Last 90 days", days: 90 },
];

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function rangeDates(days: number) {
  const end = new Date();
  end.setDate(end.getDate() - 2); // GSC data lags ~2 days
  const start = new Date(end);
  start.setDate(end.getDate() - (days - 1));
  return { startDate: fmtDate(start), endDate: fmtDate(end) };
}

async function callGsc(payload: Record<string, unknown>) {
  const data = await apiPost<any>("/seo/gsc-data", payload);
  if (!data?.ok) throw new Error(data?.error || "Request failed");
  return { data: data.data, cached: !!data.cached, fetchedAt: data.fetchedAt as string | undefined };
}

const AUTO_REFRESH_OPTIONS = [
  { label: "Off", ms: 0 },
  { label: "1 min", ms: 60_000 },
  { label: "5 min", ms: 5 * 60_000 },
  { label: "15 min", ms: 15 * 60_000 },
];

const SearchConsole = () => {
  const [sites, setSites] = useState<{ siteUrl: string; permissionLevel: string }[]>([]);
  const [siteUrl, setSiteUrl] = useState<string>("");
  const [days, setDays] = useState<number>(28);
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<SaResp | null>(null);
  const [byDate, setByDate] = useState<SaResp | null>(null);
  const [queries, setQueries] = useState<SaResp | null>(null);
  const [pages, setPages] = useState<SaResp | null>(null);
  const [sitemaps, setSitemaps] = useState<Sitemap[]>([]);
  const [newSite, setNewSite] = useState("");
  const [submittingSm, setSubmittingSm] = useState(false);
  const [smPath, setSmPath] = useState("sitemap.xml");
  const [setupError, setSetupError] = useState<string | null>(null);
  const [autoMs, setAutoMs] = useState<number>(() => {
    if (typeof window === "undefined") return 5 * 60_000;
    const saved = parseInt(localStorage.getItem("gsc:autoMs") || "");
    return Number.isFinite(saved) ? saved : 5 * 60_000;
  });
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem("gsc:autoMs", String(autoMs));
  }, [autoMs]);

  const loadSites = async () => {
    try {
      const { data } = await callGsc({ action: "sites" });
      const list = (data?.siteEntry || []).filter((s: any) => s.permissionLevel !== "siteUnverifiedUser");
      setSites(list);
      if (!siteUrl && list.length) setSiteUrl(list[0].siteUrl);
      setSetupError(null);
    } catch (e: any) {
      setSetupError(e.message);
    }
  };

  useEffect(() => {
    loadSites();
  }, []);

  const loadAll = async (force = false) => {
    if (!siteUrl) return;
    setLoading(true);
    try {
      const { startDate, endDate } = rangeDates(days);
      const base = { action: "searchAnalytics", siteUrl, startDate, endDate, ...(force ? { force: true } : {}) };
      const [ov, dt, q, p, sm] = await Promise.all([
        callGsc({ ...base, dimensions: [], rowLimit: 1 }),
        callGsc({ ...base, dimensions: ["date"], rowLimit: days }),
        callGsc({ ...base, dimensions: ["query"], rowLimit: 25 }),
        callGsc({ ...base, dimensions: ["page"], rowLimit: 25 }),
        callGsc({ action: "sitemaps", siteUrl, ...(force ? { force: true } : {}) }),
      ]);
      setOverview(ov.data);
      setByDate(dt.data);
      setQueries(q.data);
      setPages(p.data);
      setSitemaps(sm.data?.sitemap || []);
      setFromCache([ov, dt, q, p, sm].every((r) => r.cached));
      setLastUpdated(ov.fetchedAt || new Date().toISOString());
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (siteUrl) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteUrl, days]);

  // Auto-refresh on an interval — uses cache, so it's cheap
  useEffect(() => {
    if (!siteUrl || autoMs <= 0) return;
    const id = window.setInterval(() => {
      loadAll(false);
    }, autoMs);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteUrl, days, autoMs]);

  // Pause refresh when tab is hidden, refresh on return
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible" && siteUrl) loadAll(false);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteUrl, days]);

  const totals = overview?.rows?.[0];
  const dateChart = useMemo(
    () =>
      (byDate?.rows || []).map((r) => ({
        date: r.keys?.[0] ?? "",
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: +(r.ctr * 100).toFixed(2),
        position: +r.position.toFixed(1),
      })),
    [byDate],
  );

  const addAndVerifySite = async () => {
    if (!newSite) return;
    const url = newSite.endsWith("/") ? newSite : newSite + "/";
    try {
      const { data: tok } = await callGsc({ action: "verifyToken", siteUrl: url });
      toast.message("Add this meta tag to your site <head>, deploy, then click Verify.", {
        description: tok?.token,
      });
      navigator.clipboard?.writeText(tok?.token || "").catch(() => {});
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const verifySite = async () => {
    if (!newSite) return;
    const url = newSite.endsWith("/") ? newSite : newSite + "/";
    try {
      await callGsc({ action: "verifySite", siteUrl: url });
      await callGsc({ action: "addSite", siteUrl: url });
      toast.success("Site verified and added.");
      setNewSite("");
      loadSites();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const submitSitemap = async () => {
    if (!siteUrl || !smPath) return;
    setSubmittingSm(true);
    try {
      await callGsc({ action: "submitSitemap", siteUrl, feedpath: smPath });
      toast.success("Sitemap submitted.");
      const { data: sm } = await callGsc({ action: "sitemaps", siteUrl, force: true });
      setSitemaps(sm?.sitemap || []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmittingSm(false);
    }
  };

  return (
    <SuperAdminLayout>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Google Search Console</h1>
          <p className="text-xs text-muted-foreground">Indexing coverage, queries, CTR & sitemaps.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={siteUrl} onValueChange={setSiteUrl}>
            <SelectTrigger className="w-[260px]"><SelectValue placeholder="Select site" /></SelectTrigger>
            <SelectContent>
              {sites.map((s) => (
                <SelectItem key={s.siteUrl} value={s.siteUrl}>{s.siteUrl}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(days)} onValueChange={(v) => setDays(parseInt(v))}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {RANGES.map((r) => <SelectItem key={r.days} value={String(r.days)}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(autoMs)} onValueChange={(v) => setAutoMs(parseInt(v))}>
            <SelectTrigger className="w-[130px]" title="Auto-refresh interval"><SelectValue /></SelectTrigger>
            <SelectContent>
              {AUTO_REFRESH_OPTIONS.map((o) => (
                <SelectItem key={o.ms} value={String(o.ms)}>Auto: {o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => loadAll(true)} disabled={loading} title="Force refresh, bypass cache">
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={loading || !siteUrl} title="Purge cached results for this site & date range">
                <Trash2 className="w-4 h-4 mr-1" /> Clear cache
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear cached results?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will purge cached Search Console data for{" "}
                  <strong className="text-foreground">{siteUrl || "this site"}</strong> over the{" "}
                  <strong className="text-foreground">last {days} days</strong>. The next load will
                  fetch fresh data from Google (slower, uses API quota).
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    try {
                      const { startDate, endDate } = rangeDates(days);
                      const res = await callGsc({ action: "purgeCache", siteUrl, startDate, endDate });
                      const purged = res.data?.purged ?? 0;
                      toast.success(purged > 0 ? `Cleared ${purged} cached entries` : "Cache was already empty");
                      await loadAll(true);
                    } catch (e: any) {
                      toast.error(e.message ?? "Failed to clear cache");
                    }
                  }}
                >
                  Clear cache
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
        {lastUpdated && (
          <span>
            Last updated {new Date(lastUpdated).toLocaleTimeString()}
            {fromCache ? " · served from cache" : " · live"}
          </span>
        )}
        {autoMs > 0 && <span>· auto-refresh every {AUTO_REFRESH_OPTIONS.find((o) => o.ms === autoMs)?.label.toLowerCase()}</span>}
      </div>

      {setupError && (
        <div className="glass-card p-4 mb-6 border-destructive/40">
          <div className="flex items-start gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-destructive mt-0.5" />
            <div>
              <div className="font-semibold text-foreground">Search Console connection issue</div>
              <div className="text-muted-foreground">{setupError}</div>
            </div>
          </div>
        </div>
      )}

      {sites.length === 0 && !setupError && (
        <div className="glass-card p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-2">Add your first site</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Enter your site origin (e.g. <code>https://dynime.com/</code>). We'll generate a meta-tag verification token —
            paste it into your site head, publish, then click Verify.
          </p>
          <div className="flex flex-wrap gap-2">
            <Input value={newSite} onChange={(e) => setNewSite(e.target.value)} placeholder="https://dynime.com/" className="max-w-md" />
            <Button onClick={addAndVerifySite} variant="outline">Get token</Button>
            <Button onClick={verifySite}><CheckCircle2 className="w-4 h-4 mr-1" /> Verify & add</Button>
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard icon={MousePointerClick} label="Clicks" value={totals?.clicks ?? 0} />
        <KpiCard icon={Eye} label="Impressions" value={totals?.impressions ?? 0} />
        <KpiCard icon={Search} label="Avg CTR" value={totals ? `${(totals.ctr * 100).toFixed(2)}%` : "—"} />
        <KpiCard icon={Search} label="Avg Position" value={totals ? totals.position.toFixed(1) : "—"} />
      </div>

      {/* Performance over time */}
      <div className="glass-card p-4 mb-6">
        <h2 className="text-sm font-semibold text-foreground mb-3">Performance over time</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dateChart}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis yAxisId="l" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis yAxisId="r" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Legend />
              <Line yAxisId="l" type="monotone" dataKey="clicks" stroke="hsl(var(--primary))" dot={false} />
              <Line yAxisId="r" type="monotone" dataKey="impressions" stroke="hsl(var(--muted-foreground))" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <Tabs defaultValue="queries" className="mb-6">
        <TabsList>
          <TabsTrigger value="queries">Top queries</TabsTrigger>
          <TabsTrigger value="pages">Top pages</TabsTrigger>
          <TabsTrigger value="sitemaps">Sitemaps & coverage</TabsTrigger>
        </TabsList>

        <TabsContent value="queries">
          <RowsTable label="Query" rows={queries?.rows} />
        </TabsContent>

        <TabsContent value="pages">
          <RowsTable label="Page" rows={pages?.rows} link />
        </TabsContent>

        <TabsContent value="sitemaps">
          <div className="glass-card p-4 mb-4">
            <Label className="text-xs text-muted-foreground">Submit / re-submit a sitemap</Label>
            <div className="flex gap-2 mt-2">
              <Input value={smPath} onChange={(e) => setSmPath(e.target.value)} placeholder="sitemap.xml" className="max-w-sm" />
              <Button onClick={submitSitemap} disabled={submittingSm || !siteUrl}>
                <Send className="w-4 h-4 mr-1" /> Submit
              </Button>
            </div>
          </div>
          <div className="glass-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sitemap</TableHead>
                  <TableHead>Last submitted</TableHead>
                  <TableHead className="text-right">Submitted URLs</TableHead>
                  <TableHead className="text-right">Indexed URLs</TableHead>
                  <TableHead className="text-right">Errors</TableHead>
                  <TableHead className="text-right">Warnings</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sitemaps.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground">No sitemaps yet.</TableCell></TableRow>
                )}
                {sitemaps.map((sm) => {
                  const c = sm.contents?.[0];
                  return (
                    <TableRow key={sm.path}>
                      <TableCell className="font-mono text-xs break-all">{sm.path}</TableCell>
                      <TableCell className="text-xs">{sm.lastSubmitted ? new Date(sm.lastSubmitted).toLocaleDateString() : "—"}</TableCell>
                      <TableCell className="text-right">{c?.submitted ?? "—"}</TableCell>
                      <TableCell className="text-right">{c?.indexed ?? "—"}</TableCell>
                      <TableCell className={`text-right ${Number(sm.errors) > 0 ? "text-destructive font-semibold" : ""}`}>{sm.errors ?? 0}</TableCell>
                      <TableCell className={`text-right ${Number(sm.warnings) > 0 ? "text-yellow-500" : ""}`}>{sm.warnings ?? 0}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </SuperAdminLayout>
  );
};

function KpiCard({ icon: Icon, label, value }: { icon: any; label: string; value: number | string }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <div className="text-2xl font-bold text-foreground">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
    </div>
  );
}

function RowsTable({ label, rows, link }: { label: string; rows?: Row[]; link?: boolean }) {
  return (
    <div className="glass-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{label}</TableHead>
            <TableHead className="text-right">Clicks</TableHead>
            <TableHead className="text-right">Impressions</TableHead>
            <TableHead className="text-right">CTR</TableHead>
            <TableHead className="text-right">Position</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(!rows || rows.length === 0) && (
            <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground">No data yet.</TableCell></TableRow>
          )}
          {rows?.map((r, i) => {
            const k = r.keys?.[0] || "—";
            return (
              <TableRow key={i}>
                <TableCell className="max-w-[420px] truncate">
                  {link ? (
                    <a href={k} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                      {k} <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : k}
                </TableCell>
                <TableCell className="text-right">{r.clicks.toLocaleString()}</TableCell>
                <TableCell className="text-right">{r.impressions.toLocaleString()}</TableCell>
                <TableCell className="text-right">{(r.ctr * 100).toFixed(2)}%</TableCell>
                <TableCell className="text-right">{r.position.toFixed(1)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export default SearchConsole;

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { apiGet, apiPost } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { toast } from "sonner";
import {
  RefreshCw, Search, MousePointerClick, Eye, TrendingUp, FileText, FileWarning,
  CheckCircle2, AlertTriangle, Activity, ExternalLink, Map, Wifi,
} from "lucide-react";

type Row = { keys?: string[]; clicks: number; impressions: number; ctr: number; position: number };
type SaResp = { rows?: Row[] };
type Sitemap = {
  path: string;
  lastSubmitted?: string;
  errors?: string;
  warnings?: string;
  contents?: { type: string; submitted: string; indexed: string }[];
};

const AUTO_REFRESH = [
  { label: "Off", ms: 0 },
  { label: "30s", ms: 30_000 },
  { label: "1 min", ms: 60_000 },
  { label: "5 min", ms: 5 * 60_000 },
];

const fmtDate = (d: Date) => d.toISOString().slice(0, 10);
function rangeDates(days: number) {
  const end = new Date();
  end.setDate(end.getDate() - 2);
  const start = new Date(end);
  start.setDate(end.getDate() - (days - 1));
  return { startDate: fmtDate(start), endDate: fmtDate(end) };
}

async function callGsc(payload: Record<string, unknown>) {
  const data = await apiPost<any>("/seo/gsc-data", payload);
  if (!data?.ok) throw new Error(data?.error || "Request failed");
  return { data: data.data, cached: !!data.cached, fetchedAt: data.fetchedAt as string | undefined };
}

type PageRow = { id: string; title: string | null; slug: string | null; meta_title: string | null; meta_description: string | null; og_image: string | null; is_published: boolean | null };
type BlogRow = { id: string; title: string | null; slug: string | null; excerpt: string | null; cover_image_url: string | null; is_published: boolean | null };

function pageScore(p: PageRow) {
  const checks = [!!p.meta_title, !!p.meta_description, !!p.og_image, !!p.title, !!p.slug];
  return checks.filter(Boolean).length / checks.length;
}
function blogScore(b: BlogRow) {
  const checks = [!!b.title, !!b.slug, !!b.excerpt, !!b.cover_image_url];
  return checks.filter(Boolean).length / checks.length;
}

const SeoDashboard = () => {
  const [siteUrl, setSiteUrl] = useState<string>("https://dynime.com/");
  const [sites, setSites] = useState<string[]>([]);
  const [days] = useState(28);
  const [autoMs, setAutoMs] = useState<number>(() => {
    if (typeof window === "undefined") return 60_000;
    const saved = parseInt(localStorage.getItem("seo:autoMs") || "");
    return Number.isFinite(saved) ? saved : 60_000;
  });
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<SaResp | null>(null);
  const [byDate, setByDate] = useState<SaResp | null>(null);
  const [topQueries, setTopQueries] = useState<SaResp | null>(null);
  const [topPages, setTopPages] = useState<SaResp | null>(null);
  const [sitemaps, setSitemaps] = useState<Sitemap[]>([]);
  const [pages, setPages] = useState<PageRow[]>([]);
  const [blogs, setBlogs] = useState<BlogRow[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => { localStorage.setItem("seo:autoMs", String(autoMs)); }, [autoMs]);

  const loadSites = useCallback(async () => {
    try {
      const { data } = await callGsc({ action: "sites" });
      const list = (data?.siteEntry || [])
        .filter((s: any) => s.permissionLevel !== "siteUnverifiedUser")
        .map((s: any) => s.siteUrl as string);
      setSites(list);
      if (list.length && !list.includes(siteUrl)) setSiteUrl(list[0]);
      setSetupError(null);
    } catch (e: any) {
      setSetupError(e.message);
    }
  }, [siteUrl]);

  const loadGsc = useCallback(async (force = false) => {
    if (!siteUrl) return;
    setLoading(true);
    try {
      const { startDate, endDate } = rangeDates(days);
      const base: Record<string, unknown> = { action: "searchAnalytics", siteUrl, startDate, endDate };
      if (force) base.force = true;
      const [ov, dt, q, p, sm] = await Promise.all([
        callGsc({ ...base, dimensions: [], rowLimit: 1 }),
        callGsc({ ...base, dimensions: ["date"], rowLimit: days }),
        callGsc({ ...base, dimensions: ["query"], rowLimit: 5 }),
        callGsc({ ...base, dimensions: ["page"], rowLimit: 5 }),
        callGsc({ action: "sitemaps", siteUrl, ...(force ? { force: true } : {}) }),
      ]);
      setOverview(ov.data);
      setByDate(dt.data);
      setTopQueries(q.data);
      setTopPages(p.data);
      setSitemaps(sm.data?.sitemap || []);
      setFromCache([ov, dt, q, p, sm].every((r) => r.cached));
      setLastUpdated(ov.fetchedAt || new Date().toISOString());
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [siteUrl, days]);

  const loadContent = useCallback(async () => {
    try {
      const [pageRows, blogRows] = await Promise.all([
        apiGet<PageRow[]>("/seo/pages"),
        apiGet<BlogRow[]>("/cms/blog-posts/admin"),
      ]);
      setPages(pageRows || []);
      setBlogs(blogRows || []);
    } catch (e: any) {
      toast.error(e.message || "Failed to load pages and posts");
    }
  }, []);

  useEffect(() => { loadSites(); loadContent(); }, [loadSites, loadContent]);
  useEffect(() => { if (siteUrl) loadGsc(); }, [siteUrl, loadGsc]);

  // Auto-refresh
  useEffect(() => {
    if (autoMs <= 0 || !siteUrl) return;
    const id = window.setInterval(() => { loadGsc(false); loadContent(); }, autoMs);
    return () => window.clearInterval(id);
  }, [autoMs, siteUrl, loadGsc, loadContent]);

  // Pause + refresh on tab visibility
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") { loadGsc(false); loadContent(); }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [loadGsc, loadContent]);

  // Realtime state placeholder
  useEffect(() => {
    setLive(true);
  }, []);

  const totals = overview?.rows?.[0];
  const series = useMemo(
    () =>
      (byDate?.rows || []).map((r) => ({
        date: r.keys?.[0] ?? "",
        clicks: r.clicks,
        impressions: r.impressions,
      })),
    [byDate],
  );

  const pubPages = pages.filter((p) => p.is_published);
  const pubBlogs = blogs.filter((b) => b.is_published);
  const pageAvg = pubPages.length ? Math.round((pubPages.reduce((a, p) => a + pageScore(p), 0) / pubPages.length) * 100) : 0;
  const blogAvg = pubBlogs.length ? Math.round((pubBlogs.reduce((a, b) => a + blogScore(b), 0) / pubBlogs.length) * 100) : 0;
  const pagesMissing = pubPages.filter((p) => pageScore(p) < 1);
  const blogsMissing = pubBlogs.filter((b) => blogScore(b) < 1);

  const sitemapTotals = sitemaps.reduce(
    (a, s) => {
      (s.contents || []).forEach((c) => {
        a.submitted += +c.submitted || 0;
        a.indexed += +c.indexed || 0;
      });
      a.errors += +(s.errors || 0);
      a.warnings += +(s.warnings || 0);
      return a;
    },
    { submitted: 0, indexed: 0, errors: 0, warnings: 0 },
  );
  const indexRate = sitemapTotals.submitted ? Math.round((sitemapTotals.indexed / sitemapTotals.submitted) * 100) : 0;

  return (
    <SuperAdminLayout>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Realtime SEO Dashboard</h1>
          <p className="text-xs text-muted-foreground">Live indexing, search performance and on-page SEO health.</p>
        </div>
        <div className="flex items-center gap-2">
          {sites.length > 1 && (
            <Select value={siteUrl} onValueChange={setSiteUrl}>
              <SelectTrigger className="w-[260px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {sites.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Select value={String(autoMs)} onValueChange={(v) => setAutoMs(parseInt(v))}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {AUTO_REFRESH.map((o) => <SelectItem key={o.ms} value={String(o.ms)}>Auto: {o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => { loadGsc(true); loadContent(); }} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4 text-xs text-muted-foreground">
        <Badge variant={live ? "default" : "secondary"} className="gap-1">
          <Wifi className={`w-3 h-3 ${live ? "text-green-500" : ""}`} /> {live ? "Realtime on" : "Realtime off"}
        </Badge>
        {lastUpdated && (
          <span>Updated {new Date(lastUpdated).toLocaleTimeString()} {fromCache ? "· cache" : "· live"}</span>
        )}
        {autoMs > 0 && <span>· auto every {AUTO_REFRESH.find((o) => o.ms === autoMs)?.label.toLowerCase()}</span>}
      </div>

      {setupError && (
        <Card className="mb-6 border-destructive/40">
          <CardContent className="pt-4 flex items-start gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-destructive mt-0.5" />
            <div>
              <div className="font-semibold">Search Console connection issue</div>
              <div className="text-muted-foreground">{setupError}</div>
              <Link to="/superadmin/search-console" className="text-primary hover:underline">Open Search Console setup →</Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Kpi icon={MousePointerClick} label="Clicks (28d)" value={totals?.clicks ?? 0} />
        <Kpi icon={Eye} label="Impressions (28d)" value={totals?.impressions ?? 0} />
        <Kpi icon={Search} label="Avg CTR" value={totals ? `${(totals.ctr * 100).toFixed(2)}%` : "—"} />
        <Kpi icon={TrendingUp} label="Avg Position" value={totals ? totals.position.toFixed(1) : "—"} />
      </div>

      {/* Performance + index rate */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4" /> Search performance</CardTitle>
            <CardDescription>Clicks & impressions over the last {days} days</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="gClicks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gImp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Area type="monotone" dataKey="impressions" stroke="hsl(var(--muted-foreground))" fill="url(#gImp)" />
                <Area type="monotone" dataKey="clicks" stroke="hsl(var(--primary))" fill="url(#gClicks)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Map className="w-4 h-4" /> Sitemap & coverage</CardTitle>
            <CardDescription>{sitemaps.length} sitemap{sitemaps.length === 1 ? "" : "s"} submitted</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Stat label="URLs submitted" value={sitemapTotals.submitted.toLocaleString()} />
            <Stat label="URLs indexed" value={sitemapTotals.indexed.toLocaleString()} />
            <div>
              <div className="flex justify-between text-xs mb-1"><span>Index rate</span><span>{indexRate}%</span></div>
              <Progress value={indexRate} />
            </div>
            <div className="flex gap-2 pt-1">
              {sitemapTotals.errors > 0 && <Badge variant="destructive">{sitemapTotals.errors} errors</Badge>}
              {sitemapTotals.warnings > 0 && <Badge variant="secondary">{sitemapTotals.warnings} warnings</Badge>}
              {sitemapTotals.errors === 0 && sitemapTotals.warnings === 0 && sitemaps.length > 0 && (
                <Badge variant="default" className="gap-1"><CheckCircle2 className="w-3 h-3" /> Clean</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* On-page SEO health (realtime from DB) */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <CoverageCard
          title="Pages SEO completeness"
          icon={FileText}
          published={pubPages.length}
          score={pageAvg}
          missing={pagesMissing.length}
          link="/superadmin/page-seo"
          missingItems={pagesMissing.slice(0, 5).map((p) => ({ label: p.title || p.slug || p.id, href: `/superadmin/page-seo` }))}
        />
        <CoverageCard
          title="Blog SEO completeness"
          icon={FileText}
          published={pubBlogs.length}
          score={blogAvg}
          missing={blogsMissing.length}
          link="/superadmin/blog"
          missingItems={blogsMissing.slice(0, 5).map((b) => ({ label: b.title || b.slug || b.id, href: `/superadmin/blog` }))}
        />
      </div>

      {/* Top queries / pages */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top queries</CardTitle>
            <CardDescription>By clicks · last {days} days</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Query</TableHead><TableHead className="text-right">Clicks</TableHead><TableHead className="text-right">Pos</TableHead></TableRow></TableHeader>
              <TableBody>
                {(topQueries?.rows || []).map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="max-w-[260px] truncate">{r.keys?.[0]}</TableCell>
                    <TableCell className="text-right">{r.clicks}</TableCell>
                    <TableCell className="text-right">{r.position.toFixed(1)}</TableCell>
                  </TableRow>
                ))}
                {!topQueries?.rows?.length && <TableRow><TableCell colSpan={3} className="text-xs text-muted-foreground text-center py-6">No data yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top pages</CardTitle>
            <CardDescription>By clicks · last {days} days</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Page</TableHead><TableHead className="text-right">Clicks</TableHead><TableHead className="text-right">CTR</TableHead></TableRow></TableHeader>
              <TableBody>
                {(topPages?.rows || []).map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="max-w-[260px] truncate">
                      <a href={r.keys?.[0]} target="_blank" rel="noreferrer" className="hover:underline inline-flex items-center gap-1">
                        {r.keys?.[0]?.replace(/^https?:\/\/[^/]+/, "") || "/"}
                        <ExternalLink className="w-3 h-3 opacity-50" />
                      </a>
                    </TableCell>
                    <TableCell className="text-right">{r.clicks}</TableCell>
                    <TableCell className="text-right">{(r.ctr * 100).toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
                {!topPages?.rows?.length && <TableRow><TableCell colSpan={3} className="text-xs text-muted-foreground text-center py-6">No data yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
};

function Kpi({ icon: Icon, label, value }: { icon: any; label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Icon className="w-3.5 h-3.5" /> {label}</div>
        <div className="text-2xl font-bold tabular-nums">{typeof value === "number" ? value.toLocaleString() : value}</div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function CoverageCard({
  title, icon: Icon, published, score, missing, link, missingItems,
}: {
  title: string; icon: any; published: number; score: number; missing: number; link: string;
  missingItems: { label: string; href: string }[];
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2"><Icon className="w-4 h-4" /> {title}</CardTitle>
          <Link to={link} className="text-xs text-primary hover:underline">Manage →</Link>
        </div>
        <CardDescription>{published} published · {missing} need attention</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="flex justify-between text-xs mb-1"><span>Avg completeness</span><span>{score}%</span></div>
          <Progress value={score} />
        </div>
        {missingItems.length > 0 ? (
          <ul className="space-y-1 text-xs">
            {missingItems.map((m) => (
              <li key={m.label} className="flex items-center gap-2 text-muted-foreground">
                <FileWarning className="w-3 h-3 text-amber-500" />
                <Link to={m.href} className="truncate hover:underline">{m.label}</Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> All published items have full SEO metadata.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SeoDashboard;

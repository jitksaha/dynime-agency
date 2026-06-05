import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Plus, RefreshCw, Trash2, TrendingDown, TrendingUp, Minus, Search, ExternalLink, LineChart as LineChartIcon, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface TrackedKeyword {
  id: string;
  keyword: string;
  site_url: string;
  country: string | null;
  device: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  keyword_rank_history?: RankSnapshot[];
}

interface RankSnapshot {
  id: string;
  keyword_id: string;
  position: number | null;
  impressions: number;
  clicks: number;
  ctr: number;
  top_page: string | null;
  captured_for: string;
}

const COUNTRY_OPTIONS = [
  { v: "", l: "All countries" },
  { v: "usa", l: "United States" }, { v: "gbr", l: "United Kingdom" }, { v: "ind", l: "India" },
  { v: "bgd", l: "Bangladesh" }, { v: "can", l: "Canada" }, { v: "aus", l: "Australia" },
  { v: "deu", l: "Germany" }, { v: "fra", l: "France" }, { v: "are", l: "UAE" },
];
const DEVICE_OPTIONS = [
  { v: "", l: "All devices" }, { v: "desktop", l: "Desktop" }, { v: "mobile", l: "Mobile" }, { v: "tablet", l: "Tablet" },
];

function trendIcon(latest: number | null, prev: number | null) {
  if (latest == null || prev == null) return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  // Lower position = better
  if (latest < prev - 0.5) return <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />;
  if (latest > prev + 0.5) return <TrendingDown className="h-3.5 w-3.5 text-destructive" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
}

function posBadge(p: number | null | undefined) {
  if (p == null) return <Badge variant="outline">—</Badge>;
  const rounded = Math.round(p * 10) / 10;
  if (p <= 3) return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15">#{rounded}</Badge>;
  if (p <= 10) return <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-400 hover:bg-sky-500/15">#{rounded}</Badge>;
  if (p <= 20) return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/15">#{rounded}</Badge>;
  return <Badge variant="destructive">#{rounded}</Badge>;
}

export default function KeywordTracker() {
  const [keywords, setKeywords] = useState<TrackedKeyword[]>([]);
  const [history, setHistory] = useState<Record<string, RankSnapshot[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [chartFor, setChartFor] = useState<TrackedKeyword | null>(null);

  // Add form
  const [kw, setKw] = useState("");
  const [country, setCountry] = useState("");
  const [device, setDevice] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => { document.title = "Keyword Tracker — Admin"; load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const kws = await apiGet<TrackedKeyword[]>("/seo/keywords");
      setKeywords(kws || []);

      const byId: Record<string, RankSnapshot[]> = {};
      for (const k of (kws || [])) {
        byId[k.id] = k.keyword_rank_history || [];
      }
      setHistory(byId);
    } catch (e: any) {
      toast.error(e.message || "Failed to load keywords");
    } finally {
      setLoading(false);
    }
  }

  async function addKeyword() {
    const value = kw.trim().toLowerCase();
    if (!value) { toast.error("Enter a keyword"); return; }
    try {
      await apiPost("/seo/keywords", {
        keyword: value,
        site_url: "https://dynime.com/",
        country: country || null,
        device: device || null,
        notes: notes || null,
      });
      toast.success(`Tracking "${value}"`);
      setKw(""); setCountry(""); setDevice(""); setNotes("");
      setAddOpen(false);
      await load();
      // Auto-refresh the new keyword
      refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to add keyword");
    }
  }

  async function removeKeyword(id: string, label: string) {
    if (!confirm(`Stop tracking "${label}"? This deletes its rank history.`)) return;
    try {
      await apiDelete(`/seo/keywords/${id}`);
      toast.success("Removed");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Failed to remove keyword");
    }
  }

  async function refresh(keywordId?: string) {
    setRefreshing(true);
    try {
      const data = await apiPost<any>("/seo/keywords/refresh", { keywordId });
      const failed = (data?.results || []).filter((r: any) => !r.ok);
      if (failed.length > 0) {
        toast.warning(`${failed.length} keyword(s) failed — check that GSC is connected and the site is verified.`);
      } else {
        toast.success(`Refreshed ${data?.refreshed ?? 0} keyword${data?.refreshed === 1 ? "" : "s"}`);
      }
      await load();
    } catch (e: any) {
      toast.error(e.message || "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  }

  const rows = useMemo(() => keywords.map((k) => {
    const snaps = history[k.id] || [];
    const latest = snaps[snaps.length - 1];
    const prev = snaps[snaps.length - 2];
    return {
      k, snaps,
      latestPos: latest?.position ?? null,
      prevPos: prev?.position ?? null,
      impressions: latest?.impressions ?? 0,
      clicks: latest?.clicks ?? 0,
      ctr: latest?.ctr ?? 0,
      topPage: latest?.top_page ?? null,
      lastCapturedAt: latest?.captured_for ?? null,
    };
  }), [keywords, history]);

  const chartData = useMemo(() => {
    if (!chartFor) return [];
    return (history[chartFor.id] || []).map((s) => ({
      date: s.captured_for,
      position: s.position,
      impressions: s.impressions,
      clicks: s.clicks,
    }));
  }, [chartFor, history]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Keyword Tracker</h1>
          <p className="text-muted-foreground">
            Monitor where dynime.com ranks for the keywords you care about. Powered by Google Search Console — refreshes pull the latest 7-day position.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refresh()} disabled={refreshing || keywords.length === 0}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh all
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Add keyword</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Track a new keyword</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Keyword</Label>
                  <Input value={kw} onChange={(e) => setKw(e.target.value)} placeholder="e.g. company formation usa" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Country</Label>
                    <Select value={country || "any"} onValueChange={(v) => setCountry(v === "any" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="All countries" /></SelectTrigger>
                      <SelectContent>{COUNTRY_OPTIONS.map(o => <SelectItem key={o.v || "any"} value={o.v || "any"}>{o.l}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Device</Label>
                    <Select value={device || "any"} onValueChange={(v) => setDevice(v === "any" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="All devices" /></SelectTrigger>
                      <SelectContent>{DEVICE_OPTIONS.map(o => <SelectItem key={o.v || "any"} value={o.v || "any"}>{o.l}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Notes (optional)</Label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="why you're tracking this" />
                </div>
                <Button className="w-full" onClick={addKeyword}>Add & start tracking</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tracked keywords</CardTitle>
          <CardDescription>{keywords.length} keyword{keywords.length === 1 ? "" : "s"} · click a row to see the trend chart</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>
          ) : keywords.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Search className="h-10 w-10 mx-auto text-muted-foreground/50" />
              <div className="text-sm text-muted-foreground">No keywords tracked yet. Add your first one above.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Keyword</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Δ</TableHead>
                    <TableHead className="text-right">Impressions</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">CTR</TableHead>
                    <TableHead>Top page</TableHead>
                    <TableHead>Last update</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(({ k, snaps, latestPos, prevPos, impressions, clicks, ctr, topPage, lastCapturedAt }) => (
                    <TableRow key={k.id} className="cursor-pointer" onClick={() => setChartFor(k)}>
                      <TableCell>
                        <div className="font-medium">{k.keyword}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                          {k.country && <Badge variant="outline" className="text-[10px] px-1 h-4">{k.country.toUpperCase()}</Badge>}
                          {k.device && <Badge variant="outline" className="text-[10px] px-1 h-4">{k.device}</Badge>}
                          {snaps.length > 0 && <span>{snaps.length} snapshot{snaps.length === 1 ? "" : "s"}</span>}
                        </div>
                      </TableCell>
                      <TableCell>{posBadge(latestPos)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs">
                          {trendIcon(latestPos, prevPos)}
                          {prevPos != null && latestPos != null && (
                            <span className="text-muted-foreground">{(prevPos - latestPos).toFixed(1)}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">{impressions.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{clicks.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{(ctr * 100).toFixed(1)}%</TableCell>
                      <TableCell className="max-w-[200px]">
                        {topPage ? (
                          <a href={topPage} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                             className="text-xs text-primary hover:underline truncate flex items-center gap-1">
                            {topPage.replace(/^https?:\/\/[^/]+/, "") || "/"} <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {lastCapturedAt ? new Date(lastCapturedAt).toLocaleDateString() : <span className="italic">never</span>}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" onClick={() => refresh(k.id)} disabled={refreshing} title="Refresh now">
                            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => removeKeyword(k.id, k.keyword)} title="Stop tracking">
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!chartFor} onOpenChange={(o) => !o && setChartFor(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LineChartIcon className="h-4 w-4" />
              "{chartFor?.keyword}" — rank trend
            </DialogTitle>
          </DialogHeader>
          {chartData.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No history yet. Click "Refresh" to capture the first snapshot.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis dataKey="date" fontSize={11} />
                    <YAxis reversed domain={[1, "auto"]} fontSize={11} label={{ value: "Position", angle: -90, position: "insideLeft", fontSize: 11 }} />
                    <Tooltip />
                    <ReferenceLine y={10} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" label={{ value: "Page 1", fontSize: 10, position: "right" }} />
                    <Line type="monotone" dataKey="position" stroke="hsl(var(--primary))" strokeWidth={2} dot />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Lower is better. Page 1 = positions 1–10.
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

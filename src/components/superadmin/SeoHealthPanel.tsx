import { useEffect, useState } from "react";
import { apiPost } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle2, AlertTriangle, XCircle, ExternalLink, Clock } from "lucide-react";
import { toast } from "sonner";

interface RedirectHop { url: string; status: number; location?: string }
interface CheckResult {
  url: string;
  ok: boolean;
  finalUrl: string;
  finalStatus: number;
  redirects: RedirectHop[];
  contentType?: string;
  contentLength?: number;
  responseTimeMs: number;
  warnings: string[];
  error?: string;
  checkedAt: string;
  stats?: any;
}
interface Report {
  origin: string;
  checkedAt: string;
  results: { sitemap: CheckResult; robots: CheckResult; home: CheckResult };
}

const statusBadge = (r: CheckResult) => {
  if (r.error || r.finalStatus === 0) return <Badge variant="destructive">Error</Badge>;
  if (r.finalStatus >= 200 && r.finalStatus < 300)
    return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15">{r.finalStatus} OK</Badge>;
  if (r.finalStatus >= 300 && r.finalStatus < 400)
    return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/15">{r.finalStatus} Redirect</Badge>;
  return <Badge variant="destructive">{r.finalStatus}</Badge>;
};

const Icon = ({ r }: { r: CheckResult }) => {
  if (r.error || r.finalStatus >= 400) return <XCircle className="h-5 w-5 text-destructive" />;
  if (r.warnings.length > 0 || (r.finalStatus >= 300 && r.finalStatus < 400))
    return <AlertTriangle className="h-5 w-5 text-amber-500" />;
  return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
};

function CheckCard({ title, r }: { title: string; r: CheckResult }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <Icon r={r} />
            <div className="min-w-0">
              <CardTitle className="text-base flex items-center gap-2">
                {title}
                <a href={r.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </CardTitle>
              <CardDescription className="truncate">{r.url}</CardDescription>
            </div>
          </div>
          {statusBadge(r)}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div><div className="text-muted-foreground">Response time</div><div className="font-mono">{r.responseTimeMs} ms</div></div>
          <div><div className="text-muted-foreground">Content-Type</div><div className="font-mono truncate">{r.contentType || "—"}</div></div>
          <div><div className="text-muted-foreground">Size</div><div className="font-mono">{r.contentLength != null ? `${r.contentLength.toLocaleString()} B` : "—"}</div></div>
          <div><div className="text-muted-foreground">Redirects</div><div className="font-mono">{r.redirects.length}</div></div>
        </div>

        {r.stats && (
          <div className="rounded border bg-muted/30 p-2 text-xs">
            {"urls" in r.stats && <div>URLs in sitemap: <span className="font-mono">{r.stats.urls}</span>{r.stats.sitemaps > 0 && <> · child sitemaps: <span className="font-mono">{r.stats.sitemaps}</span></>}</div>}
            {"hasSitemap" in r.stats && (
              <div>
                Sitemap directive: <span className="font-mono">{r.stats.hasSitemap ? "yes" : "no"}</span>
                {r.stats.sitemapDirectives?.length > 0 && (
                  <ul className="mt-1 ml-4 list-disc text-muted-foreground">
                    {r.stats.sitemapDirectives.map((s: string) => <li key={s} className="font-mono">{s}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {r.redirects.length > 0 && (
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">Redirect chain</div>
            <ol className="space-y-1 text-xs font-mono">
              {r.redirects.map((h, i) => (
                <li key={i} className="truncate">
                  <Badge variant="outline" className="mr-1.5 capitalize">{h.status}</Badge>
                  {h.url} → {h.location}
                </li>
              ))}
              <li className="truncate"><Badge variant="outline" className="mr-1.5">{r.finalStatus}</Badge>{r.finalUrl}</li>
            </ol>
          </div>
        )}

        {r.warnings.length > 0 && (
          <div className="rounded border border-amber-500/30 bg-amber-500/5 p-2">
            <div className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> {r.warnings.length} warning{r.warnings.length > 1 ? "s" : ""}
            </div>
            <ul className="text-xs space-y-0.5 list-disc ml-5">
              {r.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}

        {r.error && (
          <div className="rounded border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
            {r.error}
          </div>
        )}

        <div className="flex items-center gap-1 text-[11px] text-muted-foreground pt-1 border-t">
          <Clock className="h-3 w-3" /> Checked {new Date(r.checkedAt).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SeoHealthPanel() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<Report | null>(null);

  const run = async () => {
    setLoading(true);
    try {
      const data = await apiPost<any>("/seo/health", { origin: "https://dynime.com" });
      setReport(data as Report);
    } catch (e: any) {
      toast.error(e.message || "Health check failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { run(); /* eslint-disable-next-line */ }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-base">SEO Health Checks</CardTitle>
            <CardDescription>
              Server-side fetch of <code className="rounded bg-muted px-1">sitemap.xml</code>,{" "}
              <code className="rounded bg-muted px-1">robots.txt</code>, and homepage. Follows redirects and surfaces indexing warnings.
            </CardDescription>
          </div>
          <Button size="sm" onClick={run} disabled={loading}>
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Checking…" : "Re-run checks"}
          </Button>
        </CardHeader>
        {report && (
          <CardContent className="text-xs text-muted-foreground border-t pt-3 flex items-center gap-1.5">
            <Clock className="h-3 w-3" /> Last full check: {new Date(report.checkedAt).toLocaleString()} · origin {report.origin}
          </CardContent>
        )}
      </Card>

      {loading && !report && (
        <div className="text-sm text-muted-foreground py-8 text-center">Running checks…</div>
      )}

      {report && (
        <div className="grid gap-4 lg:grid-cols-3">
          <CheckCard title="sitemap.xml" r={report.results.sitemap} />
          <CheckCard title="robots.txt" r={report.results.robots} />
          <CheckCard title="Homepage" r={report.results.home} />
        </div>
      )}
    </div>
  );
}

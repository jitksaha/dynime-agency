import { useState } from "react";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle, ExternalLink, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type Check = { id: string; label: string; status: "pass" | "warn" | "fail"; detail?: string };
type Result = {
  ok: boolean;
  url?: string;
  meta?: Record<string, string | undefined>;
  checks?: Check[];
  summary?: { pass: number; warn: number; fail: number };
  error?: string;
};

const PRESETS = [
  { label: "Home", path: "/" },
  { label: "About", path: "/about" },
  { label: "Services", path: "/services" },
  { label: "Portfolio", path: "/portfolio" },
  { label: "Blog", path: "/blog" },
  { label: "Contact", path: "/contact" },
];

const OgValidator = () => {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://dynime.com";
  const [url, setUrl] = useState(`${origin}/`);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const run = async (target?: string) => {
    const u = target || url;
    setLoading(true);
    setResult(null);
    try {
      const data = await apiPost<any>("/seo/validate-og", { url: u });
      setResult(data);
      if (!data.ok) toast.error(data.error || "Validation failed");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const m = result?.meta || {};
  const ogImg = m.image as string | undefined;

  return (
    <SuperAdminLayout>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">OpenGraph & Social Preview Validator</h1>
        <p className="text-xs text-muted-foreground">
          Validates og:image, dimensions, file size, MIME type and ratio against Google, Facebook, and Twitter requirements.
        </p>
      </div>

      <div className="glass-card p-4 mb-6">
        <div className="flex flex-wrap gap-2 mb-3">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://dynime.com/" className="flex-1 min-w-[280px]" />
          <Button onClick={() => run()} disabled={loading}>
            {loading ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
            Validate
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.path}
              type="button"
              onClick={() => { const u = `${origin}${p.path}`; setUrl(u); run(u); }}
              className="text-xs px-3 py-1 rounded-full border border-border bg-secondary/40 text-muted-foreground hover:text-foreground hover:border-primary/40"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {result?.ok && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Preview card */}
          <div className="glass-card p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Social preview</h2>
            <div className="rounded-xl overflow-hidden border border-border bg-secondary/40">
              {ogImg ? (
                <img
                  src={ogImg}
                  alt={(m.imageAlt as string) || "Social preview"}
                  className="w-full aspect-[1.91/1] object-cover bg-muted"
                />
              ) : (
                <div className="w-full aspect-[1.91/1] flex items-center justify-center text-xs text-muted-foreground">
                  No og:image found
                </div>
              )}
              <div className="p-3 text-xs">
                <div className="text-muted-foreground uppercase tracking-wide truncate">{result.url}</div>
                <div className="text-sm font-semibold text-foreground line-clamp-2 mt-1">{m.title || "—"}</div>
                <div className="text-muted-foreground line-clamp-2 mt-1">{m.description || "—"}</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <Pill label="Pass" value={result.summary?.pass ?? 0} tone="pass" />
              <Pill label="Warn" value={result.summary?.warn ?? 0} tone="warn" />
              <Pill label="Fail" value={result.summary?.fail ?? 0} tone="fail" />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <a target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                 href={`https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(result.url || "")}`}>
                Facebook Debugger <ExternalLink className="w-3 h-3" />
              </a>
              <a target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                 href={`https://www.linkedin.com/post-inspector/inspect/${encodeURIComponent(result.url || "")}`}>
                LinkedIn Post Inspector <ExternalLink className="w-3 h-3" />
              </a>
              <a target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                 href={`https://search.google.com/test/rich-results?url=${encodeURIComponent(result.url || "")}`}>
                Google Rich Results <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Checks list */}
          <div className="glass-card p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Checks</h2>
            <ul className="space-y-2">
              {result.checks?.map((c) => (
                <li key={c.id} className="flex items-start gap-2 text-sm">
                  <StatusIcon s={c.status} />
                  <div className="flex-1 min-w-0">
                    <div className="text-foreground">{c.label}</div>
                    {c.detail && <div className="text-xs text-muted-foreground break-all">{c.detail}</div>}
                  </div>
                  <Badge variant={c.status === "pass" ? "default" : c.status === "warn" ? "secondary" : "destructive"}>
                    {c.status}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </SuperAdminLayout>
  );
};

function StatusIcon({ s }: { s: "pass" | "warn" | "fail" }) {
  if (s === "pass") return <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />;
  if (s === "warn") return <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />;
  return <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />;
}
function Pill({ label, value, tone }: { label: string; value: number; tone: "pass" | "warn" | "fail" }) {
  const cls =
    tone === "pass" ? "bg-emerald-500/10 text-emerald-500"
    : tone === "warn" ? "bg-yellow-500/10 text-yellow-500"
    : "bg-destructive/10 text-destructive";
  return (
    <div className={`rounded-lg p-2 ${cls}`}>
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-wider">{label}</div>
    </div>
  );
}

export default OgValidator;

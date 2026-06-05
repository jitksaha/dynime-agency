import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiPost } from "@/lib/api";
import { analyzeSeo, type SeoInput, type SeoCheck } from "@/lib/seo-analyzer";
import { useSeoRules } from "@/hooks/use-seo-rules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle, Sparkles, Loader2, Info } from "lucide-react";
import { toast } from "sonner";

interface Props {
  input: SeoInput;
  /** Called when AI analyzer returns suggestions for the primary keyword etc. */
  onApplyAi?: (patch: { primaryKeyword?: string; secondaryKeywords?: string[]; suggestions?: string[] }) => void;
}

const sevIcon = (s: SeoCheck["severity"]) => {
  if (s === "pass") return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
  if (s === "warn") return <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />;
  if (s === "fail") return <XCircle className="w-3.5 h-3.5 text-destructive" />;
  return <Info className="w-3.5 h-3.5 text-muted-foreground" />;
};

const gradeColor = (g: string) =>
  g === "A" ? "text-emerald-500" : g === "B" ? "text-emerald-500" :
  g === "C" ? "text-amber-500" : g === "D" ? "text-orange-500" : "text-destructive";

const SeoScorePanel = ({ input, onApplyAi }: Props) => {
  const [primary, setPrimary] = useState(input.primaryKeyword || "");
  const [secondary, setSecondary] = useState((input.secondaryKeywords || []).join(", "));
  const [aiTips, setAiTips] = useState<string[]>([]);

  const merged: SeoInput = useMemo(() => ({
    ...input,
    primaryKeyword: primary || input.primaryKeyword,
    secondaryKeywords: secondary.split(",").map((s) => s.trim()).filter(Boolean),
  }), [input, primary, secondary]);

  const rules = useSeoRules();
  const report = useMemo(() => analyzeSeo(merged, rules), [merged, rules]);

  const ai = useMutation({
    mutationFn: async () => {
      const data = await apiPost<any>("/seo/analyze", {
        title: merged.title,
        metaDescription: merged.metaDescription,
        slug: merged.slug,
        content: merged.content,
        primaryKeyword: merged.primaryKeyword,
      });
      return data as { primaryKeyword?: string; secondaryKeywords?: string[]; suggestions?: string[] };
    },
    onSuccess: (data) => {
      if (data?.suggestions?.length) setAiTips(data.suggestions);
      if (data?.primaryKeyword && !primary) setPrimary(data.primaryKeyword);
      if (data?.secondaryKeywords?.length && !secondary) {
        setSecondary(data.secondaryKeywords.join(", "));
      }
      onApplyAi?.(data);
      toast.success("AI deep audit complete");
    },
    onError: (e: any) => toast.error(e?.message || "AI audit failed"),
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative w-14 h-14 rounded-full border-4 border-border flex items-center justify-center">
            <span className={`font-heading text-lg font-bold ${gradeColor(report.grade)}`}>
              {report.grade}
            </span>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">SEO Score</div>
            <div className={`font-heading text-2xl font-bold ${gradeColor(report.grade)}`}>
              {report.score}<span className="text-sm text-muted-foreground">/100</span>
            </div>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => ai.mutate()} disabled={ai.isPending}>
          {ai.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
          Deep AI Audit
        </Button>
      </div>

      <Progress value={report.score} className="h-2" />

      <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
        <div className="rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 py-1.5">
          <span className="font-bold">{report.summary.passes}</span> passed
        </div>
        <div className="rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 py-1.5">
          <span className="font-bold">{report.summary.warns}</span> warnings
        </div>
        <div className="rounded-md bg-destructive/10 text-destructive py-1.5">
          <span className="font-bold">{report.summary.fails}</span> failed
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[11px]">Primary keyword</Label>
          <Input
            value={primary}
            onChange={(e) => setPrimary(e.target.value)}
            placeholder="e.g. usa company formation"
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label className="text-[11px]">Secondary keywords (comma-separated)</Label>
          <Input
            value={secondary}
            onChange={(e) => setSecondary(e.target.value)}
            placeholder="ein, registered agent, llc filing"
            className="h-8 text-xs"
          />
        </div>
      </div>

      <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
        {Object.entries(report.groupedScores).map(([group, g]) => (
          <div key={group} className="rounded-lg border border-border/60 bg-background/50 p-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider">{group}</span>
              <Badge variant="outline" className="text-[10px]">
                {Math.round((g.earned / Math.max(g.total, 1)) * 100)}%
              </Badge>
            </div>
            <ul className="space-y-1">
              {report.checks
                .filter((c) => c.group === group)
                .map((c) => (
                  <li key={c.id} className="flex items-start gap-2 text-[11px]">
                    <span className="mt-0.5">{sevIcon(c.severity)}</span>
                    <div className="flex-1">
                      <div className="font-medium text-foreground">{c.label}</div>
                      <div className="text-muted-foreground">{c.message}</div>
                    </div>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>

      {aiTips.length > 0 && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary mb-2">
            <Sparkles className="w-3.5 h-3.5" /> AI Suggestions
          </div>
          <ul className="list-disc pl-5 space-y-1 text-xs text-foreground">
            {aiTips.map((t, i) => (<li key={i}>{t}</li>))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SeoScorePanel;

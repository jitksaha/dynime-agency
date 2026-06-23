/**
 * SectionHelp — Inline contextual help panel
 *
 * Renders a collapsible "How to use this section" bar directly
 * on the page. Dismissal is persisted to localStorage per key.
 *
 * Usage:
 *   <SectionHelp
 *     storageKey="orders-help"
 *     title="How to use Orders"
 *     steps={["Do this first", "Then do this"]}
 *     tips={["Pro tip one", "Pro tip two"]}
 *     warnings={["Be careful about this"]}
 *   />
 */
import { useState, useEffect } from "react";
import {
  HelpCircle, ChevronDown, ChevronUp, X,
  Lightbulb, ListOrdered, AlertTriangle, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SectionHelpProps {
  /** Unique localStorage key — prevents re-show after dismiss */
  storageKey: string;
  /** Bold heading shown in the collapsed bar */
  title: string;
  /** Short sentence shown collapsed so admin knows what it is */
  subtitle?: string;
  /** Numbered how-to steps */
  steps?: string[];
  /** Green pro-tip bullets */
  tips?: string[];
  /** Amber warning bullets */
  warnings?: string[];
}

export default function SectionHelp({
  storageKey,
  title,
  subtitle,
  steps,
  tips,
  warnings,
}: SectionHelpProps) {
  const [dismissed, setDismissed] = useState(false);
  const [open, setOpen] = useState(false);

  // Don't show if user dismissed this panel before
  useEffect(() => {
    const val = localStorage.getItem(`help-dismissed-${storageKey}`);
    if (val === "1") setDismissed(true);
  }, [storageKey]);

  const dismiss = () => {
    localStorage.setItem(`help-dismissed-${storageKey}`, "1");
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 backdrop-blur-sm overflow-hidden transition-all duration-300">
      {/* ── Collapsed bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3">
        <HelpCircle className="w-4 h-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          {!open && subtitle && (
            <span className="text-xs text-muted-foreground ml-2">{subtitle}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-primary hover:bg-primary/10"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? (
              <><ChevronUp className="w-3.5 h-3.5 mr-1" /> Hide guide</>
            ) : (
              <><ChevronDown className="w-3.5 h-3.5 mr-1" /> Show guide</>
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/50"
            title="Dismiss (won't show again)"
            onClick={dismiss}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Expanded content ──────────────────────────────────────────────── */}
      {open && (
        <div className="border-t border-primary/15 px-4 pb-4 pt-3 space-y-4">

          {/* Steps */}
          {steps && steps.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">
                <ListOrdered className="w-3.5 h-3.5" /> How to use
              </div>
              <ol className="space-y-2">
                {steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                    <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="leading-snug">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Tips */}
          {tips && tips.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-2">
                <Lightbulb className="w-3.5 h-3.5" /> Tips
              </div>
              <ul className="space-y-1.5">
                {tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2" />
                    <span className="leading-snug">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {warnings && warnings.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-2">
                <AlertTriangle className="w-3.5 h-3.5" /> Important
              </div>
              <ul className="space-y-1.5">
                {warnings.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <AlertTriangle className="shrink-0 w-3.5 h-3.5 text-amber-500 mt-0.5" />
                    <span className="leading-snug">{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground pt-1">
            ✕ Click the X to dismiss permanently. Full reference is available at{" "}
            <a href="/superadmin/docs" className="text-primary hover:underline">
              Admin Docs
            </a>
            .
          </p>
        </div>
      )}
    </div>
  );
}

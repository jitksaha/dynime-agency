import { useEffect, useState } from "react";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Sparkles, Check, Loader2, Wand2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useSiteSettings } from "@/hooks/use-data";
import { useHomeSections, HOME_SECTIONS_KEY } from "@/hooks/use-home-sections";
import { apiPost } from "@/lib/api";
import {
  BRAND_TONE_LABELS,
  BRAND_TONE_PRESETS,
  BrandTone,
  applyBrandTone,
} from "@/lib/brand-tone-presets";

const TONE_KEY = "brand_tone";

const AdminBrandTone = () => {
  const { data: settings } = useSiteSettings();
  const { data: sections } = useHomeSections();
  const qc = useQueryClient();
  const [applying, setApplying] = useState<BrandTone | null>(null);
  const [active, setActive] = useState<BrandTone>("premium");

  useEffect(() => {
    const v = settings?.[TONE_KEY] as BrandTone | undefined;
    if (v && BRAND_TONE_PRESETS[v]) setActive(v);
  }, [settings]);

  const apply = async (tone: BrandTone) => {
    setApplying(tone);
    try {
      const next = applyBrandTone(tone, sections);
      await apiPost("/cms/site-settings/bulk", {
        settings: [
          { key: HOME_SECTIONS_KEY, value: JSON.stringify(next) },
          { key: TONE_KEY, value: JSON.stringify(tone) },
        ],
      });
      setActive(tone);
      toast.success(`${BRAND_TONE_LABELS[tone].label} tone applied site-wide.`);
      qc.invalidateQueries({ queryKey: ["home-sections"] });
      qc.invalidateQueries({ queryKey: ["site-settings"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to apply tone");
    } finally {
      setApplying(null);
    }
  };

  return (
    <SuperAdminLayout>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
          <Wand2 className="w-6 h-6 text-primary" /> Brand Voice
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          One click rewrites every headline, subheadline, and CTA on the homepage in your chosen tone — auto synced everywhere.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(Object.keys(BRAND_TONE_LABELS) as BrandTone[]).map((tone) => {
          const meta = BRAND_TONE_LABELS[tone];
          const preset = BRAND_TONE_PRESETS[tone];
          const isActive = active === tone;
          const isLoading = applying === tone;
          return (
            <div
              key={tone}
              className={`glass-card p-5 transition-all ${
                isActive ? "border-primary/60 shadow-[var(--shadow-glow)]" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <h3 className="font-heading font-semibold text-lg">{meta.label}</h3>
                    {isActive && (
                      <span className="inline-flex items-center gap-1 text-xs text-primary font-medium px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                        <Check className="w-3 h-3" /> Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{meta.desc}</p>
                </div>
              </div>

              <div className="rounded-lg border border-border/50 bg-background/40 p-3 space-y-2 mb-4">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Hero preview</p>
                <p className="font-heading font-bold text-sm leading-snug">
                  {preset.hero.headline.replace(/\{\{|\}\}/g, "")}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2">{preset.hero.subheadline}</p>
              </div>

              <Button
                onClick={() => apply(tone)}
                disabled={isLoading || isActive}
                variant={isActive ? "outline" : "hero"}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Applying...
                  </>
                ) : isActive ? (
                  "Currently active"
                ) : (
                  `Apply ${meta.label}`
                )}
              </Button>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground mt-6">
        Tip: After applying a tone, you can still fine-tune individual headlines from the homepage section editors.
      </p>
    </SuperAdminLayout>
  );
};

export default AdminBrandTone;

import { useEffect, useMemo, useState } from "react";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { useSiteSettings } from "@/hooks/use-data";
import { db } from "@/integrations/db/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Save, Receipt, Percent, Info } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { computeTax, parseTaxSettings } from "@/lib/tax";
import { apiPost } from "@/lib/api";

const AdminTaxSettings = () => {
  const { data: settings, isLoading } = useSiteSettings();
  const qc = useQueryClient();
  const [enabled, setEnabled] = useState(false);
  const [label, setLabel] = useState("VAT");
  const [percent, setPercent] = useState("0");
  const [mode, setMode] = useState<"inclusive" | "exclusive">("exclusive");
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!settings) return;
    const t = parseTaxSettings(settings as Record<string, unknown>);
    setEnabled(t.enabled);
    setLabel(t.label);
    setPercent(String(t.percent));
    setMode(t.mode);
    setShowBreakdown(t.showBreakdown);
  }, [settings]);

  const preview = useMemo(() => {
    return computeTax(100, {
      enabled,
      label,
      percent: parseFloat(percent) || 0,
      mode,
      showBreakdown,
    });
  }, [enabled, label, percent, mode, showBreakdown]);

  const save = async () => {
    setSaving(true);
    try {
      const rows = [
        { key: "tax_enabled", value: JSON.stringify(enabled ? "true" : "false") },
        { key: "tax_label", value: JSON.stringify(label.trim() || "VAT") },
        { key: "tax_percent", value: JSON.stringify(String(parseFloat(percent) || 0)) },
        { key: "tax_mode", value: JSON.stringify(mode) },
        { key: "tax_show_breakdown", value: JSON.stringify(showBreakdown ? "true" : "false") },
      ];
      await apiPost("/cms/site-settings/bulk", { settings: rows });
      toast.success("Tax settings saved — now live across the site.");
      qc.invalidateQueries({ queryKey: ["site-settings"] });
    } catch (err: any) {
      toast.error(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SuperAdminLayout>
        <p className="text-muted-foreground">Loading...</p>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <Receipt className="w-6 h-6 text-primary" /> Tax &amp; VAT
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Global tax engine. Applies to every order, invoice and checkout in real time.
          </p>
        </div>
        <Button variant="hero" size="sm" onClick={save} disabled={saving}>
          <Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 max-w-5xl">
        <div className="lg:col-span-2 glass-card p-6 space-y-6">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-border">
            <div>
              <Label className="text-base font-semibold">Enable VAT / Tax</Label>
              <p className="text-xs text-muted-foreground mt-1">
                When off, no tax is calculated or shown anywhere on the site.
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">Tax label</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="VAT, GST, Sales Tax…"
                className="mt-1"
              />
              <p className="text-[11px] text-muted-foreground mt-1">Shown on invoices and checkout.</p>
            </div>
            <div>
              <Label className="text-sm">Tax percent</Label>
              <div className="relative mt-1">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={percent}
                  onChange={(e) => setPercent(e.target.value)}
                  className="pr-9"
                />
                <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          <div>
            <Label className="text-sm mb-2 block">Price mode</Label>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                {
                  val: "exclusive" as const,
                  title: "Exclusive",
                  desc: "Listed prices do NOT include tax. VAT is added on top at checkout.",
                },
                {
                  val: "inclusive" as const,
                  title: "Inclusive",
                  desc: "Listed prices ALREADY include tax. Total stays the same; VAT is shown as a breakdown.",
                },
              ].map((opt) => {
                const active = mode === opt.val;
                return (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setMode(opt.val)}
                    className={`text-left rounded-xl border-2 p-4 transition-colors ${
                      active
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="text-sm font-semibold text-foreground">{opt.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">{opt.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-4 border-t border-border">
            <div>
              <Label className="text-sm font-semibold">Show tax breakdown on invoices / orders</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Display the net + VAT split on receipts and the customer-facing invoice page.
              </p>
            </div>
            <Switch checked={showBreakdown} onCheckedChange={setShowBreakdown} />
          </div>
        </div>

        {/* Live preview */}
        <div className="glass-card p-6 space-y-4 h-fit">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Live preview</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Example for a $100.00 order with your current settings:
          </p>
          <div className="rounded-xl bg-secondary/40 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Listed price</span>
              <span className="font-medium">$100.00</span>
            </div>
            {preview.enabled ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Net (excl. {label})
                  </span>
                  <span className="font-medium">${preview.net.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-primary">
                  <span>
                    {label} ({preview.percent}%) {preview.inclusive ? "incl." : "added"}
                  </span>
                  <span className="font-medium">
                    {preview.inclusive ? "" : "+"}${preview.tax.toFixed(2)}
                  </span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between font-semibold">
                  <span>Customer pays</span>
                  <span>${preview.gross.toFixed(2)}</span>
                </div>
              </>
            ) : (
              <div className="text-xs text-muted-foreground italic">
                Tax disabled — customer pays $100.00, no breakdown shown.
              </div>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Existing orders keep their original tax record — only new orders use these settings.
          </p>
        </div>
      </div>
    </SuperAdminLayout>
  );
};

export default AdminTaxSettings;

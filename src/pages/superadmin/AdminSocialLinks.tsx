import { useEffect, useState } from "react";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { useSiteSettings } from "@/hooks/use-data";
import { db } from "@/integrations/db/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Share2, Link2, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { SOCIAL_DEFINITIONS } from "@/components/shared/SocialIcons";
import { apiPost } from "@/lib/api";

const AdminSocialLinks = () => {
  const { data: settings, isLoading } = useSiteSettings();
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    if (!settings) return;
    const next: Record<string, string> = {};
    for (const d of SOCIAL_DEFINITIONS) {
      next[d.key] = (settings[d.key] || "").replace(/^"|"$/g, "");
    }
    setValues(next);
  }, [settings]);

  const save = async () => {
    setSaving(true);
    try {
      const rows = SOCIAL_DEFINITIONS.map((d) => ({
        key: d.key,
        value: JSON.stringify((values[d.key] || "").trim()),
      }));
      await apiPost("/cms/site-settings/bulk", { settings: rows });
      toast.success("Social links updated everywhere — auto synced.");
      qc.invalidateQueries({ queryKey: ["site-settings"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SuperAdminLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <Share2 className="w-6 h-6 text-primary" /> Social Media Links
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Update once — links auto-sync across the entire website (footer, contact, etc.) in real time.
          </p>
        </div>
        <Button variant="hero" onClick={save} disabled={saving || isLoading}>
          <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save & Sync"}
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {SOCIAL_DEFINITIONS.map((d) => (
            <div key={d.key} className="glass-card p-4">
              <Label htmlFor={d.key} className="flex items-center gap-2 mb-2">
                <span
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                  style={{ backgroundColor: d.color }}
                >
                  {d.icon}
                </span>
                <span className="font-medium">{d.label}</span>
              </Label>
              <div className="relative">
                <Link2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id={d.key}
                  type="url"
                  placeholder={`https://… (leave empty to hide ${d.label})`}
                  className="pl-9"
                  value={values[d.key] || ""}
                  onChange={(e) => setValues((v) => ({ ...v, [d.key]: e.target.value }))}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 flex items-start gap-2 text-xs text-muted-foreground">
        <RefreshCw className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>Empty fields hide that platform's icon site-wide. Changes propagate instantly via Supabase Realtime.</span>
      </div>
    </SuperAdminLayout>
  );
};

export default AdminSocialLinks;

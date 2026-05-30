import { useState, useEffect } from "react";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import SiteLogoUploader, { FaviconUploader } from "@/components/admin/SiteLogoUploader";
import OgImageUploader from "@/components/admin/OgImageUploader";
import { useSiteSettings } from "@/hooks/use-data";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Save, ShieldAlert, X, ExternalLink, CreditCard, Sun, Moon, Share2, MessageCircle, Building2, Plus, Trash2, Languages, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

const generalSettings = [
  { key: "site_name", label: "Site Name (Main brand — used everywhere)", type: "text" },
  { key: "site_tagline", label: "Tagline", type: "text" },
  { key: "hero_headline", label: "Hero Headline", type: "text" },
  { key: "hero_subheadline", label: "Hero Subheadline", type: "textarea" },
];

type RegisteredEntity = {
  label: string;
  name: string;
  country: string;
  license_number: string;
};

const DEFAULT_ENTITIES: RegisteredEntity[] = [
  { label: "Main", name: "Dynime Inc.", country: "United States", license_number: "DYN-INC-00000000" },
  { label: "UK", name: "Dynime UK Ltd.", country: "United Kingdom", license_number: "UK-00000000" },
  { label: "BD", name: "Dynime BD Ltd.", country: "Bangladesh", license_number: "BD-00000000" },
];

const parseEntities = (raw: unknown): RegisteredEntity[] => {
  if (Array.isArray(raw)) return raw as RegisteredEntity[];
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p : DEFAULT_ENTITIES;
    } catch { return DEFAULT_ENTITIES; }
  }
  return DEFAULT_ENTITIES;
};

const AdminSettings = () => {
  const { data: settings, isLoading } = useSiteSettings();
  const [values, setValues] = useState<Record<string, string>>({});
  const [entities, setEntities] = useState<RegisteredEntity[]>(DEFAULT_ENTITIES);
  const [maskLicenses, setMaskLicenses] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<{ message: string; isRls: boolean } | null>(null);
  const qc = useQueryClient();

  useEffect(() => {
    if (settings) {
      const cleaned: Record<string, string> = {};
      for (const [k, v] of Object.entries(settings)) {
        cleaned[k] = (v as string).replace(/^"|"$/g, "");
      }
      setValues(cleaned);
      // Entities can be stored as a JSON string in the value column.
      const rawEntities = (settings as any).registered_entities;
      setEntities(parseEntities(rawEntities));
      const rawMask = (settings as any).registered_entities_mask;
      const maskStr = typeof rawMask === "string" ? rawMask.replace(/^"|"$/g, "") : rawMask;
      setMaskLicenses(maskStr === undefined ? true : String(maskStr).toLowerCase() !== "false");
    }
  }, [settings]);

  const updateEntity = (idx: number, patch: Partial<RegisteredEntity>) => {
    setEntities((prev) => prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  };
  const addEntity = () => {
    setEntities((prev) => [...prev, { label: "", name: "", country: "", license_number: "" }]);
  };
  const removeEntity = (idx: number) => {
    setEntities((prev) => prev.filter((_, i) => i !== idx));
  };

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const keysToSave = [...generalSettings.map((s) => s.key), "default_theme", "portfolio_per_page", "default_og_image", "live_chat_embed", "live_chat_enabled", "auto_currency_switcher_enabled", "auto_language_switcher_enabled"];
      const rows: { key: string; value: any }[] = keysToSave
        .filter((k) => values[k] !== undefined)
        .map((key) => ({ key, value: JSON.stringify(values[key] ?? "") }));
      // Registered entities (stored as a real jsonb array) + mask toggle
      rows.push({ key: "registered_entities", value: entities });
      rows.push({ key: "registered_entities_mask", value: maskLicenses ? "true" : "false" });
      const { error } = await supabase.from("site_settings").upsert(rows, { onConflict: "key" });
      if (error) throw error;
      toast.success("Settings saved.");
      qc.invalidateQueries({ queryKey: ["site-settings"] });
    } catch (err: any) {
      const message = err?.message || "Save failed";
      const isRls =
        /row-level security|violates row-level|permission denied|policy/i.test(message) ||
        err?.code === "42501" ||
        err?.code === "PGRST301";
      setSaveError({ message, isRls });
      toast.error(isRls ? "Permission denied — super_admin role required." : message);
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
        <h1 className="font-heading text-2xl font-bold text-foreground">Site Settings</h1>
        <Button variant="hero" size="sm" onClick={save} disabled={saving}>
          <Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      {saveError && (
        <div
          role="alert"
          className={`max-w-2xl mb-6 rounded-lg border p-4 ${
            saveError.isRls ? "border-destructive/40 bg-destructive/10" : "border-border bg-secondary/40"
          }`}
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className={`w-5 h-5 mt-0.5 shrink-0 ${saveError.isRls ? "text-destructive" : "text-muted-foreground"}`} />
            <div className="flex-1 min-w-0">
              {saveError.isRls ? (
                <>
                  <h3 className="text-sm font-semibold text-foreground">Permission denied — super_admin role required</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your account doesn't have the <code className="px-1 py-0.5 rounded bg-secondary text-foreground">super_admin</code> role.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="hero">
                      <Link to="/superadmin/login">
                        Create first admin <ExternalLink className="w-3.5 h-3.5 ml-1" />
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link to="/superadmin/team">Manage team roles</Link>
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-sm font-semibold text-foreground">Save failed</h3>
                  <p className="text-xs text-muted-foreground mt-1 break-words">{saveError.message}</p>
                </>
              )}
            </div>
            <button type="button" onClick={() => setSaveError(null)} className="text-muted-foreground hover:text-foreground shrink-0" aria-label="Dismiss">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <SiteLogoUploader />
      <FaviconUploader />

      <div className="glass-card p-6 space-y-6 max-w-2xl mb-6">
        <h2 className="text-lg font-semibold text-foreground">General</h2>
        {generalSettings.map((s) => (
          <div key={s.key}>
            <label className="text-sm text-muted-foreground block mb-1">{s.label}</label>
            {s.type === "textarea" ? (
              <textarea
                value={values[s.key] || ""}
                onChange={(e) => setValues({ ...values, [s.key]: e.target.value })}
                rows={3}
                className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            ) : (
              <input
                value={values[s.key] || ""}
                onChange={(e) => setValues({ ...values, [s.key]: e.target.value })}
                className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            )}
          </div>
        ))}
      </div>

      {/* Registered entities — shown on the About page and used in legal copy */}
      <div className="glass-card p-6 max-w-2xl mb-6">
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Registered Entities</h2>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={maskLicenses}
              onChange={(e) => setMaskLicenses(e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            Mask licence numbers on public pages
          </label>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          These appear on the About page in the "Registered Entities" card. Toggle masking to hide
          or reveal licence numbers to visitors.
        </p>

        <div className="space-y-3">
          {entities.map((e, idx) => (
            <div key={idx} className="rounded-lg border border-border bg-secondary/30 p-3">
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input
                  value={e.label}
                  onChange={(ev) => updateEntity(idx, { label: ev.target.value })}
                  placeholder="Tag (Main / UK / BD)"
                  className="px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <input
                  value={e.country}
                  onChange={(ev) => updateEntity(idx, { country: ev.target.value })}
                  placeholder="Country"
                  className="px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <input
                value={e.name}
                onChange={(ev) => updateEntity(idx, { name: ev.target.value })}
                placeholder="Legal name (e.g. Dynime Inc.)"
                className="w-full px-3 py-2 mb-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <div className="flex items-center gap-2">
                <input
                  value={e.license_number}
                  onChange={(ev) => updateEntity(idx, { license_number: ev.target.value })}
                  placeholder="Registration / licence number"
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-md text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  type="button"
                  onClick={() => removeEntity(idx)}
                  className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  aria-label="Remove entity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addEntity}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add entity
          </button>
        </div>
      </div>


      {/* Default theme selector — applied to first-time visitors */}
      <div className="glass-card p-6 max-w-2xl mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-1">Default Theme</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Sets the theme new visitors see on their first visit. Visitors can still toggle their preference, which is saved in their browser.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { val: "dark", label: "Dark", icon: Moon },
            { val: "light", label: "Light", icon: Sun },
          ].map((opt) => {
            const Icon = opt.icon;
            const active = (values.default_theme || "dark") === opt.val;
            return (
              <button
                type="button"
                key={opt.val}
                onClick={() => setValues({ ...values, default_theme: opt.val })}
                className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
                  active
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground hover:border-primary/40"
                }`}
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-md ${active ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <span className="text-sm font-medium">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Portfolio pagination */}
      <div className="glass-card p-6 max-w-2xl mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-1">Portfolio Page Size</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Number of portfolio projects to show per page on the public Portfolio page (all categories).
        </p>
        <div className="flex flex-wrap gap-2">
          {[6, 9, 12, 15, 18, 24, 36].map((n) => {
            const current = parseInt(values.portfolio_per_page || "12", 10) || 12;
            const active = current === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => setValues({ ...values, portfolio_per_page: String(n) })}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground hover:border-primary/40"
                }`}
              >
                {n}
              </button>
            );
          })}
          <input
            type="number"
            min={1}
            max={100}
            value={values.portfolio_per_page || "12"}
            onChange={(e) => setValues({ ...values, portfolio_per_page: e.target.value })}
            className="w-24 px-3 py-2 bg-secondary border border-border rounded-full text-sm text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
            aria-label="Custom per-page count"
          />
        </div>
      </div>

      {/* Site-wide default social/OG image */}
      <div className="glass-card p-6 max-w-2xl mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Share2 className="w-4 h-4 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Default Social Share Image</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Used when a page or blog post doesn't define its own image. Shown on Facebook, X/Twitter,
          LinkedIn, WhatsApp, Slack and Google previews.
        </p>
        <OgImageUploader
          value={values.default_og_image || ""}
          onChange={(url) => setValues({ ...values, default_og_image: url })}
          context={{ title: values.site_name || "Dynime", description: values.site_tagline }}
          folder="og-default"
          label=""
        />
      </div>

      {/* Auto currency + language switcher master toggles */}
      <div className="glass-card p-6 max-w-2xl mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Languages className="w-4 h-4 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Auto Currency & Language</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          When enabled, new visitors automatically see prices in their local currency and the site in their
          local language based on geo-IP. Turning these off forces everyone to the site default (USD / English)
          until they pick their own. Changes apply live across the site.
        </p>
        <div className="space-y-3">
          {[
            {
              key: "auto_currency_switcher_enabled",
              label: "Auto currency switcher",
              hint: "Detect visitor country and switch the displayed currency.",
              icon: DollarSign,
            },
            {
              key: "auto_language_switcher_enabled",
              label: "Auto language switcher",
              hint: "Detect visitor country and translate the site automatically.",
              icon: Languages,
            },
          ].map((row) => {
            const Icon = row.icon;
            const enabled = (values[row.key] ?? "true") !== "false";
            return (
              <label
                key={row.key}
                className="flex items-start gap-3 rounded-lg border border-border bg-secondary/30 p-3 cursor-pointer hover:border-primary/40 transition-colors"
              >
                <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${enabled ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-foreground">{row.label}</span>
                  <span className="block text-xs text-muted-foreground">{row.hint}</span>
                </span>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setValues({ ...values, [row.key]: e.target.checked ? "true" : "false" })}
                  className="mt-1 w-4 h-4 accent-primary"
                />
              </label>
            );
          })}
        </div>
      </div>

      {/* Live Chat embed (LiveChat.com or any third-party widget snippet) */}
      <div className="glass-card p-6 max-w-2xl mb-6">
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Live Chat Embed</h2>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={(values.live_chat_enabled ?? "true") !== "false"}
              onChange={(e) => setValues({ ...values, live_chat_enabled: e.target.checked ? "true" : "false" })}
              className="w-4 h-4 accent-primary"
            />
            Enabled
          </label>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Paste the full embed snippet from <a href="https://mylivechat.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline">MyLiveChat.com</a> (free), <a href="https://www.livechat.com/help/setting-up-livechat-on-your-website/" target="_blank" rel="noopener noreferrer" className="text-primary underline">LiveChat.com</a>, Tawk.to, Crisp, or any provider that gives a {`<script>`} tag. It auto-loads on every page and you can update it here any time.
        </p>
        <textarea
          value={values.live_chat_embed || ""}
          onChange={(e) => setValues({ ...values, live_chat_embed: e.target.value })}
          rows={10}
          spellCheck={false}
          placeholder={`<!-- Start of LiveChat code -->\n<script>...</script>\n<!-- End of LiveChat code -->`}
          className="w-full px-4 py-3 bg-secondary border border-border rounded-lg text-xs font-mono text-foreground resize-y focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <p className="text-[11px] text-muted-foreground mt-2">
          Changes apply across the site after saving (visitors may need to refresh).
        </p>
      </div>

      <Link
        to="/superadmin/payment-gateways"
        className="glass-card p-4 max-w-2xl flex items-center gap-3 hover:border-primary/50 transition-colors"
      >
        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <CreditCard className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-foreground">Payment Gateways</div>
          <div className="text-xs text-muted-foreground">Configure Stripe, SSLCommerz, bKash, DodoPayment and bank transfer.</div>
        </div>
        <ExternalLink className="w-4 h-4 text-muted-foreground" />
      </Link>
    </SuperAdminLayout>
  );
};

export default AdminSettings;

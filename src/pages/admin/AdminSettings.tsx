import { useState, useEffect } from "react";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import SiteLogoUploader, { FaviconUploader } from "@/components/admin/SiteLogoUploader";
import OgImageUploader from "@/components/admin/OgImageUploader";
import { useSiteSettings } from "@/hooks/use-data";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Save, ShieldAlert, X, ExternalLink, CreditCard, Sun, Moon, Share2, MessageCircle, Building2, Plus, Trash2, Languages, DollarSign, Cloud, CheckCircle2, AlertTriangle, Database, Mail, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { apiPost, apiGet } from "@/lib/api";

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
  const [backupStatus, setBackupStatus] = useState<any>(null);
  const [backingUp, setBackingUp] = useState(false);
  const [clientIdInput, setClientIdInput] = useState("");
  const [clientSecretInput, setClientSecretInput] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);
  const [smtpTab, setSmtpTab] = useState<"general" | "careers" | "orders">("general");
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [showSmtpCareersPass, setShowSmtpCareersPass] = useState(false);
  const [showSmtpOrdersPass, setShowSmtpOrdersPass] = useState(false);
  const [showZohoSecret, setShowZohoSecret] = useState(false);
  const [showZohoRefreshToken, setShowZohoRefreshToken] = useState(false);
  const qc = useQueryClient();

  const getZohoVal = (field: string): string => {
    try {
      if (!values.zoho_credentials) {
        return field === "accounts_domain" ? "https://accounts.zoho.com" : field === "api_domain" ? "https://www.zohoapis.com" : "";
      }
      const parsed = JSON.parse(values.zoho_credentials);
      return parsed[field] || (field === "accounts_domain" ? "https://accounts.zoho.com" : field === "api_domain" ? "https://www.zohoapis.com" : "");
    } catch {
      return field === "accounts_domain" ? "https://accounts.zoho.com" : field === "api_domain" ? "https://www.zohoapis.com" : "";
    }
  };

  const handleZohoChange = (field: string, val: string) => {
    let current: Record<string, string> = {};
    try {
      if (values.zoho_credentials) {
        current = JSON.parse(values.zoho_credentials);
      }
    } catch {}
    current[field] = val;
    setValues({ ...values, zoho_credentials: JSON.stringify(current) });
  };

  const loadBackupStatus = async () => {
    try {
      const res = await apiGet<any>("/backup/google/status");
      setBackupStatus(res);
      if (res.clientId) setClientIdInput(res.clientId);
      if (res.clientSecret) setClientSecretInput(res.clientSecret);
    } catch (err) {
      console.error("Failed to load backup status:", err);
    }
  };

  const saveConfigOnly = async () => {
    if (!clientIdInput.trim() || !clientSecretInput.trim()) {
      toast.error("Please fill in both Client ID and Client Secret.");
      return false;
    }
    setSavingConfig(true);
    try {
      await apiPost("/backup/google/configure", {
        clientId: clientIdInput,
        clientSecret: clientSecretInput,
      });
      toast.success("API credentials saved successfully.");
      loadBackupStatus();
      return true;
    } catch (err: any) {
      toast.error(err.message || "Failed to save credentials.");
      return false;
    } finally {
      setSavingConfig(false);
    }
  };

  const handleConnectGoogle = async () => {
    if (!clientIdInput.trim() || !clientSecretInput.trim()) {
      toast.error("Please fill in both Client ID and Client Secret to connect.");
      return;
    }
    const saved = await saveConfigOnly();
    if (!saved) return;
    
    const apiBaseUrl = import.meta.env.VITE_API_URL || window.location.origin;
    window.location.href = apiBaseUrl.replace(/\/$/, '') + '/api/v1/backup/google/auth';
  };

  useEffect(() => {
    loadBackupStatus();
    
    const params = new URLSearchParams(window.location.search);
    const conn = params.get("backup_connection");
    if (conn) {
      if (conn === "success") {
        toast.success("Google Drive connected for automated backups!");
      } else {
        toast.error("Failed to connect Google Drive.");
      }
      window.history.replaceState({}, document.title, window.location.pathname);
      loadBackupStatus();
    }
  }, []);

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
      const keysToSave = [
        ...generalSettings.map((s) => s.key),
        "default_theme",
        "portfolio_per_page",
        "default_og_image",
        "live_chat_embed",
        "live_chat_enabled",
        "auto_currency_switcher_enabled",
        "auto_language_switcher_enabled",
        "referral_cooling_period_days",
        "maintenance_mode",
        "smtp_host",
        "smtp_port",
        "smtp_username",
        "smtp_password",
        "smtp_encryption",
        "smtp_from_address",
        "smtp_from_name",
        "smtp_careers_host",
        "smtp_careers_port",
        "smtp_careers_username",
        "smtp_careers_password",
        "smtp_careers_encryption",
        "smtp_careers_from_address",
        "smtp_careers_from_name",
        "smtp_orders_host",
        "smtp_orders_port",
        "smtp_orders_username",
        "smtp_orders_password",
        "smtp_orders_encryption",
        "smtp_orders_from_address",
        "smtp_orders_from_name",
        "zoho_credentials"
      ];
      const rows: { key: string; value: any }[] = keysToSave
        .filter((k) => values[k] !== undefined)
        .map((key) => ({ key, value: JSON.stringify(values[key] ?? "") }));
      // Registered entities (stored as a real jsonb array) + mask toggle
      rows.push({ key: "registered_entities", value: entities });
      rows.push({ key: "registered_entities_mask", value: maskLicenses ? "true" : "false" });
      
      await apiPost("/cms/site-settings/bulk", { settings: rows });
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

      {/* Referral Program settings */}
      <div className="glass-card p-6 max-w-2xl mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Share2 className="w-4 h-4 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Referral Program</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Configure the rules and payouts parameters for the Dynime Partner & Referral Program.
        </p>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground block mb-1">
              Commission Cooling-Off Period (Days)
            </label>
            <input
              type="number"
              min={0}
              max={90}
              value={values.referral_cooling_period_days || "14"}
              onChange={(e) => setValues({ ...values, referral_cooling_period_days: e.target.value })}
              className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="14"
            />
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Number of days after order payment before a pending referral commission is automatically approved and made available for partner payout request. Use 0 for instant approval.
            </p>
          </div>
        </div>
      </div>

      {/* Zoho CRM Integration */}
      <div className="glass-card p-6 max-w-2xl mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Database className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Zoho CRM Integration</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Connect your website form submissions with Zoho CRM. Submissions from the contact form are instantly saved locally and automatically synced to Zoho in the background.
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground block mb-1">Client ID</label>
            <input
              type="text"
              value={getZohoVal("client_id")}
              onChange={(e) => handleZohoChange("client_id", e.target.value)}
              placeholder="e.g. 1000.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
              className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground block mb-1">Client Secret</label>
            <div className="relative">
              <input
                type={showZohoSecret ? "text" : "password"}
                value={getZohoVal("client_secret")}
                onChange={(e) => handleZohoChange("client_secret", e.target.value)}
                placeholder="••••••••••••••••••••••••••••••••"
                className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground pr-10 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                type="button"
                onClick={() => setShowZohoSecret(!showZohoSecret)}
                className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground"
              >
                {showZohoSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground block mb-1">Refresh Token</label>
            <div className="relative">
              <input
                type={showZohoRefreshToken ? "text" : "password"}
                value={getZohoVal("refresh_token")}
                onChange={(e) => handleZohoChange("refresh_token", e.target.value)}
                placeholder="e.g. 1000.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground pr-10 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                type="button"
                onClick={() => setShowZohoRefreshToken(!showZohoRefreshToken)}
                className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground"
              >
                {showZohoRefreshToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Accounts Domain</label>
              <select
                value={getZohoVal("accounts_domain")}
                onChange={(e) => handleZohoChange("accounts_domain", e.target.value)}
                className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="https://accounts.zoho.com">US (.com)</option>
                <option value="https://accounts.zoho.eu">EU (.eu)</option>
                <option value="https://accounts.zoho.in">India (.in)</option>
                <option value="https://accounts.zoho.com.cn">China (.com.cn)</option>
                <option value="https://accounts.zoho.com.au">Australia (.com.au)</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">API Domain</label>
              <select
                value={getZohoVal("api_domain")}
                onChange={(e) => handleZohoChange("api_domain", e.target.value)}
                className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="https://www.zohoapis.com">US (.com)</option>
                <option value="https://www.zohoapis.eu">EU (.eu)</option>
                <option value="https://www.zohoapis.in">India (.in)</option>
                <option value="https://www.zohoapis.com.cn">China (.com.cn)</option>
                <option value="https://www.zohoapis.com.au">Australia (.com.au)</option>
              </select>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-secondary/10 p-3.5 mt-2 space-y-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground block">Webhook Configuration:</span>
            <p>
              To enable <strong>two-way sync</strong> (so that representative assignments and status changes in Zoho CRM are synced back to this dashboard in real-time), configure a workflow rule in Zoho CRM that calls this webhook:
            </p>
            <div className="flex items-center gap-2 bg-background p-2 rounded border border-border font-mono text-[11px] text-foreground select-all">
              {`${import.meta.env.VITE_API_URL || window.location.origin}/api/v1/webhooks/zoho`}
            </div>
          </div>

          <details className="mt-3 group border border-border/60 rounded-lg overflow-hidden bg-secondary/5">
            <summary className="flex items-center justify-between px-4 py-3 text-xs font-semibold text-foreground hover:bg-secondary/15 cursor-pointer select-none">
              <span>Detailed Setup & Integration Guide</span>
              <span className="text-muted-foreground transition-transform group-open:rotate-180">▼</span>
            </summary>
            <div className="p-4 border-t border-border/40 space-y-4 text-xs text-muted-foreground leading-relaxed">
              <div>
                <h4 className="font-bold text-foreground mb-1">Step 1: Get OAuth Credentials</h4>
                <ol className="list-decimal pl-4 space-y-1.5">
                  <li>Go to the <a href="https://api-console.zoho.com" target="_blank" rel="noopener noreferrer" className="text-primary underline font-medium">Zoho API Console</a>.</li>
                  <li>Click <strong>Add Client</strong> and choose <strong>Self Client</strong>.</li>
                  <li>In the popup, copy your <strong>Client ID</strong> and <strong>Client Secret</strong> and paste them above.</li>
                  <li>Go to the <strong>Generate Code</strong> tab.</li>
                  <li>Under <strong>Scope</strong>, paste: <code className="bg-secondary px-1 py-0.5 rounded font-mono text-[10px] text-foreground">ZohoCRM.modules.leads.CREATE,ZohoCRM.modules.leads.UPDATE,ZohoCRM.modules.leads.READ,ZohoCRM.settings.READ</code></li>
                  <li>Choose the maximum duration (e.g. 10 minutes), add a description, and click <strong>Generate</strong>. Copy the Authorization Code immediately.</li>
                </ol>
              </div>

              <div>
                <h4 className="font-bold text-foreground mb-1">Step 2: Generate the Refresh Token</h4>
                <p className="mb-2">Run the following cURL command in your terminal (replacing placeholders) to receive your permanent Refresh Token:</p>
                <pre className="bg-background p-2.5 rounded border border-border text-[10px] font-mono text-foreground overflow-x-auto whitespace-pre-wrap select-all">
{`curl -X POST "https://accounts.zoho.com/oauth/v2/token" \\
  -d "code=YOUR_AUTHORIZATION_CODE" \\
  -d "client_id=YOUR_CLIENT_ID" \\
  -d "client_secret=YOUR_CLIENT_SECRET" \\
  -d "grant_type=authorization_code"`}
                </pre>
                <p className="mt-1.5 text-[10px] text-amber-500">
                  Note: Change <code className="bg-secondary px-0.5 py-0.2 rounded font-mono">accounts.zoho.com</code> if you are on EU/IN servers (e.g. <code className="bg-secondary px-0.5 py-0.2 rounded font-mono">accounts.zoho.eu</code>). Copy the returned <code className="bg-secondary px-0.5 py-0.2 rounded font-mono">refresh_token</code> and paste it above.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-foreground mb-1">Step 3: Enable Two-Way Webhook Sync</h4>
                <ol className="list-decimal pl-4 space-y-1.5">
                  <li>In Zoho CRM, go to <strong>Settings</strong> ➔ <strong>Developer Space</strong> ➔ <strong>Webhooks</strong> and click <strong>Configure Webhook</strong>.</li>
                  <li>Set the URL to: <code className="bg-secondary px-1 py-0.5 rounded font-mono text-[10px] text-foreground font-semibold select-all">{`${import.meta.env.VITE_API_URL || window.location.origin}/api/v1/webhooks/zoho`}</code></li>
                  <li>Set Method to <strong>POST</strong>.</li>
                  <li>Under <strong>Body ➔ Raw ➔ JSON</strong>, configure it to send the following payload:</li>
                </ol>
                <pre className="bg-background p-2.5 mt-2 rounded border border-border text-[10px] font-mono text-foreground overflow-x-auto select-all">
{`{
  "id": "\${Leads.Lead Id}",
  "status": "\${Leads.Lead Status}",
  "assigned_rep": "\${Leads.Lead Owner}"
}`}
                </pre>
                <p className="mt-2">
                  Finally, create a <strong>Workflow Rule</strong> in Zoho CRM triggered on Lead Edit/Update, and associate it with this Webhook to keep representatives and stages synced dynamically.
                </p>
              </div>
            </div>
          </details>
        </div>
      </div>

      {/* Automated Google Drive Backups */}
      <div className="glass-card p-6 max-w-2xl mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Cloud className="w-4 h-4 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Google Drive Backups</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Configure Google Cloud OAuth credentials and connect your Google Drive to automatically run daily backups.
        </p>
        
        {backupStatus && (
          <div className="space-y-4">
            {/* OAuth Credentials Form */}
            <div className="space-y-3 p-4 rounded-lg border border-border bg-secondary/15">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Google Cloud API Credentials</h3>
              
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Google OAuth Client ID</label>
                <input
                  type="text"
                  value={clientIdInput}
                  onChange={(e) => setClientIdInput(e.target.value)}
                  placeholder="e.g. 123456-abcdef.apps.googleusercontent.com"
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1">Google OAuth Client Secret</label>
                <input
                  type="password"
                  value={clientSecretInput}
                  onChange={(e) => setClientSecretInput(e.target.value)}
                  placeholder="e.g. GOCSPX-abcdefghijklmnopqrstuvwxyz"
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <a
                  href="https://console.cloud.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-primary hover:underline flex items-center gap-1"
                >
                  Create credentials on Google Cloud Console <ExternalLink className="w-3 h-3" />
                </a>
                
                {backupStatus.connected && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 px-2.5"
                    disabled={savingConfig}
                    onClick={saveConfigOnly}
                  >
                    {savingConfig ? "Saving..." : "Save Credentials"}
                  </Button>
                )}
              </div>
            </div>

            {/* Google Drive Status & Connection */}
            {backupStatus.connected ? (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <div>
                      <span className="text-sm font-semibold text-foreground block">Google Drive Connected</span>
                      <span className="text-xs text-muted-foreground">{backupStatus.email}</span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs border-destructive/20 text-destructive hover:bg-destructive/10 hover:border-destructive/40 h-8"
                    onClick={async () => {
                      if (confirm("Are you sure you want to disconnect Google Drive? Auto-backups to Drive will be disabled.")) {
                        try {
                          await apiPost("/backup/google/disconnect");
                          toast.success("Google Drive disconnected.");
                          loadBackupStatus();
                        } catch (err: any) {
                          toast.error(err.message || "Failed to disconnect");
                        }
                      }
                    }}
                  >
                    Disconnect
                  </Button>
                </div>

                <div className="border-t border-border/40 pt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <div>
                    <span className="block">Last Backup Status: <strong className={backupStatus.lastBackupStatus === 'success' ? 'text-emerald-500 font-semibold' : backupStatus.lastBackupStatus === 'failed' ? 'text-destructive font-semibold' : 'font-semibold'}>{backupStatus.lastBackupStatus}</strong></span>
                    {backupStatus.lastBackupTime && (
                      <span className="block mt-0.5">Last Run: {new Date(backupStatus.lastBackupTime).toLocaleString()}</span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="hero"
                    size="sm"
                    className="text-xs h-8"
                    disabled={backingUp}
                    onClick={async () => {
                      setBackingUp(true);
                      const t = toast.loading("Running backup and uploading to Google Drive...");
                      try {
                        await apiPost("/backup/run");
                        toast.success("Backup uploaded to Google Drive successfully!", { id: t });
                        loadBackupStatus();
                      } catch (err: any) {
                        toast.error(err.message || "Backup failed.", { id: t });
                      } finally {
                        setBackingUp(false);
                      }
                    }}
                  >
                    <Database className="w-3.5 h-3.5 mr-1" />
                    {backingUp ? "Backing up..." : "Backup Now"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-secondary/20">
                <span className="text-sm text-muted-foreground">No Google Account Connected</span>
                <Button
                  type="button"
                  variant="hero"
                  size="sm"
                  onClick={handleConnectGoogle}
                  disabled={savingConfig}
                >
                  Save & Connect Google Drive
                </Button>
              </div>
            )}

            {/* Quick Setup documentation helper */}
            <div className="rounded-lg border border-border/40 bg-secondary/5 p-3.5 text-xs text-muted-foreground space-y-1.5">
              <span className="font-semibold text-foreground block">Quick Setup Guide:</span>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Go to the <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google Cloud Console</a> and create or select a project.</li>
                <li>Go to **APIs & Services → Library**, search for **Google Drive API** and enable it.</li>
                <li>Go to **OAuth consent screen**, set User Type to **External**, add your email, and add the scope <code className="bg-secondary px-1 py-0.2 rounded font-mono">.../auth/drive.file</code>. Under **Test Users**, add your backup Google Account.</li>
                <li>Go to **Credentials → Create Credentials → OAuth client ID**. Set Application type to **Web application**.</li>
                <li>Add the **Authorized redirect URI**: <code className="bg-secondary px-1 py-0.2 rounded font-mono font-semibold">{(import.meta.env.VITE_API_URL || window.location.origin).replace(/\/$/, '') + '/api/v1/backup/google/callback'}</code>.</li>
                <li>Copy the Client ID and Client Secret, paste them above, and click **Save & Connect**.</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* SMTP Configuration */}
      <div className="glass-card p-6 max-w-2xl mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Mail className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">SMTP Configuration</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Configure outgoing SMTP email settings. You can set up different credentials/accounts for general forms, job applications (careers), and orders.
        </p>

        {/* Tab switcher */}
        <div className="flex border-b border-border/60 mb-6">
          {(["general", "careers", "orders"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setSmtpTab(tab)}
              className={`px-4 py-2 text-sm font-semibold capitalize border-b-2 transition-colors ${
                smtpTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab} Mailer
            </button>
          ))}
        </div>

        {/* Form Fields for Active Tab */}
        <div className="space-y-4">
          {smtpTab === "general" && (
            <>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">SMTP Host</label>
                <input
                  type="text"
                  value={values.smtp_host || ""}
                  onChange={(e) => setValues({ ...values, smtp_host: e.target.value })}
                  placeholder="e.g. smtp.hostinger.com"
                  className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground block mb-1">SMTP Port</label>
                  <input
                    type="number"
                    value={values.smtp_port || ""}
                    onChange={(e) => setValues({ ...values, smtp_port: e.target.value })}
                    placeholder="e.g. 465 or 587"
                    className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground block mb-1">Encryption</label>
                  <select
                    value={values.smtp_encryption || "tls"}
                    onChange={(e) => setValues({ ...values, smtp_encryption: e.target.value })}
                    className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="tls">TLS (port 587)</option>
                    <option value="ssl">SSL (port 465)</option>
                    <option value="none">None</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">SMTP Username</label>
                <input
                  type="email"
                  value={values.smtp_username || ""}
                  onChange={(e) => setValues({ ...values, smtp_username: e.target.value })}
                  placeholder="e.g. contact@dynime.com"
                  className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">SMTP Password</label>
                <div className="relative">
                  <input
                    type={showSmtpPass ? "text" : "password"}
                    value={values.smtp_password || ""}
                    onChange={(e) => setValues({ ...values, smtp_password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground pr-10 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSmtpPass(!showSmtpPass)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  >
                    {showSmtpPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground block mb-1">From Email Address</label>
                  <input
                    type="email"
                    value={values.smtp_from_address || ""}
                    onChange={(e) => setValues({ ...values, smtp_from_address: e.target.value })}
                    placeholder="e.g. contact@dynime.com"
                    className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground block mb-1">From Name</label>
                  <input
                    type="text"
                    value={values.smtp_from_name || ""}
                    onChange={(e) => setValues({ ...values, smtp_from_name: e.target.value })}
                    placeholder="e.g. Dynime"
                    className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            </>
          )}

          {smtpTab === "careers" && (
            <>
              <p className="text-xs text-amber-500 font-semibold mb-2">
                Note: Optional. If host is left blank, the system will use General SMTP credentials with Careers From Address/Name to send.
              </p>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">SMTP Host (Optional)</label>
                <input
                  type="text"
                  value={values.smtp_careers_host || ""}
                  onChange={(e) => setValues({ ...values, smtp_careers_host: e.target.value })}
                  placeholder="Leave blank to fallback to General Host"
                  className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground block mb-1">SMTP Port (Optional)</label>
                  <input
                    type="number"
                    value={values.smtp_careers_port || ""}
                    onChange={(e) => setValues({ ...values, smtp_careers_port: e.target.value })}
                    placeholder="e.g. 465 or 587"
                    className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground block mb-1">Encryption</label>
                  <select
                    value={values.smtp_careers_encryption || "tls"}
                    onChange={(e) => setValues({ ...values, smtp_careers_encryption: e.target.value })}
                    className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="tls">TLS (port 587)</option>
                    <option value="ssl">SSL (port 465)</option>
                    <option value="none">None</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">SMTP Username (Optional)</label>
                <input
                  type="email"
                  value={values.smtp_careers_username || ""}
                  onChange={(e) => setValues({ ...values, smtp_careers_username: e.target.value })}
                  placeholder="e.g. careers@dynime.com"
                  className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">SMTP Password (Optional)</label>
                <div className="relative">
                  <input
                    type={showSmtpCareersPass ? "text" : "password"}
                    value={values.smtp_careers_password || ""}
                    onChange={(e) => setValues({ ...values, smtp_careers_password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground pr-10 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSmtpCareersPass(!showSmtpCareersPass)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  >
                    {showSmtpCareersPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground block mb-1">Careers From Email Address</label>
                  <input
                    type="email"
                    value={values.smtp_careers_from_address || ""}
                    onChange={(e) => setValues({ ...values, smtp_careers_from_address: e.target.value })}
                    placeholder="e.g. careers@dynime.com"
                    className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground block mb-1">Careers From Name</label>
                  <input
                    type="text"
                    value={values.smtp_careers_from_name || ""}
                    onChange={(e) => setValues({ ...values, smtp_careers_from_name: e.target.value })}
                    placeholder="e.g. Dynime Careers"
                    className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            </>
          )}

          {smtpTab === "orders" && (
            <>
              <p className="text-xs text-amber-500 font-semibold mb-2">
                Note: Optional. If host is left blank, the system will use General SMTP credentials with Orders From Address/Name to send.
              </p>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">SMTP Host (Optional)</label>
                <input
                  type="text"
                  value={values.smtp_orders_host || ""}
                  onChange={(e) => setValues({ ...values, smtp_orders_host: e.target.value })}
                  placeholder="Leave blank to fallback to General Host"
                  className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground block mb-1">SMTP Port (Optional)</label>
                  <input
                    type="number"
                    value={values.smtp_orders_port || ""}
                    onChange={(e) => setValues({ ...values, smtp_orders_port: e.target.value })}
                    placeholder="e.g. 465 or 587"
                    className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground block mb-1">Encryption</label>
                  <select
                    value={values.smtp_orders_encryption || "tls"}
                    onChange={(e) => setValues({ ...values, smtp_orders_encryption: e.target.value })}
                    className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="tls">TLS (port 587)</option>
                    <option value="ssl">SSL (port 465)</option>
                    <option value="none">None</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">SMTP Username (Optional)</label>
                <input
                  type="email"
                  value={values.smtp_orders_username || ""}
                  onChange={(e) => setValues({ ...values, smtp_orders_username: e.target.value })}
                  placeholder="e.g. notifications@dynime.com"
                  className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">SMTP Password (Optional)</label>
                <div className="relative">
                  <input
                    type={showSmtpOrdersPass ? "text" : "password"}
                    value={values.smtp_orders_password || ""}
                    onChange={(e) => setValues({ ...values, smtp_orders_password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground pr-10 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSmtpOrdersPass(!showSmtpOrdersPass)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  >
                    {showSmtpOrdersPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground block mb-1">Orders From Email Address</label>
                  <input
                    type="email"
                    value={values.smtp_orders_from_address || ""}
                    onChange={(e) => setValues({ ...values, smtp_orders_from_address: e.target.value })}
                    placeholder="e.g. notifications@dynime.com"
                    className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground block mb-1">Orders From Name</label>
                  <input
                    type="text"
                    value={values.smtp_orders_from_name || ""}
                    onChange={(e) => setValues({ ...values, smtp_orders_from_name: e.target.value })}
                    placeholder="e.g. Dynime Orders"
                    className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Maintenance Mode toggle */}
      <div className="glass-card p-6 max-w-2xl mb-6 border-red-500/25 bg-red-950/5">
        <div className="flex items-center gap-2 mb-1">
          <ShieldAlert className="w-5 h-5 text-red-500" />
          <h2 className="text-lg font-semibold text-foreground">Maintenance Mode</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Enable this to put the website under maintenance. Public visitors will be redirected to the
          Maintenance page. Admins, managers, employees, and investors can still access their dashboards.
        </p>
        <label
          className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-950/10 p-3 cursor-pointer hover:border-red-500/40 transition-colors"
        >
          <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${(values.maintenance_mode === "true") ? "bg-red-500/20 text-red-400" : "bg-secondary text-muted-foreground"}`}>
            <AlertTriangle className="w-4 h-4" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-medium text-foreground">Enable Maintenance Mode</span>
            <span className="block text-xs text-muted-foreground">Redirect all public pages to the maintenance page.</span>
          </span>
          <input
            type="checkbox"
            checked={values.maintenance_mode === "true"}
            onChange={(e) => setValues({ ...values, maintenance_mode: e.target.checked ? "true" : "false" })}
            className="mt-1 w-4 h-4 accent-red-500"
          />
        </label>
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

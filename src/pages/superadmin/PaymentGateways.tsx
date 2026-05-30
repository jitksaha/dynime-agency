import { useEffect, useState } from "react";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { useSiteSettings } from "@/hooks/use-data";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CreditCard, Save, Eye, EyeOff, PlayCircle, CheckCircle2, XCircle, AlertTriangle,
  Loader2, Plus, Trash2, Building2, Banknote, Globe, Smartphone, Landmark, Wallet,
  Sparkles, ArrowRight, ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

/**
 * Payment Gateways — rebuilt from scratch.
 *
 * Design goals:
 *  - One card per gateway, no nesting / no drag-reorder noise.
 *  - Only the fields each gateway actually needs to function.
 *  - Inline "Test connection" button per card — no separate diagnostics page.
 *  - Redirect URLs are auto-derived by the edge function from the request origin,
 *    so the admin doesn't enter success / fail / cancel URLs.
 */

type FieldType = "text" | "secret" | "toggle" | "textarea" | "number";
type Field = {
  key: string;          // site_settings key
  label: string;
  type: FieldType;
  placeholder?: string;
  // For the live test: which credential prop name the edge function expects.
  // If omitted, the field isn't sent to the tester (e.g. display_name).
  credKey?: string;
};

type Gateway = {
  id: "stripe" | "sslcommerz" | "bkash" | "dodopayment" | "bank_transfer";
  label: string;
  blurb: string;
  icon: typeof CreditCard;
  testable: boolean;
  fields: Field[];
};

const GATEWAYS: Gateway[] = [
  {
    id: "stripe",
    label: "Stripe",
    blurb: "International cards (Visa, Mastercard, Amex) via Stripe Checkout.",
    icon: CreditCard,
    testable: true,
    fields: [
      { key: "stripe_enabled", label: "Enable Stripe", type: "toggle" },
      { key: "stripe_publishable_key", label: "Publishable Key", type: "text", placeholder: "pk_test_… or pk_live_…", credKey: "publishable_key" },
      { key: "stripe_secret_key", label: "Secret Key", type: "secret", placeholder: "sk_test_… or sk_live_…", credKey: "secret_key" },
      { key: "stripe_webhook_secret", label: "Webhook Secret (optional)", type: "secret", placeholder: "whsec_…" },
      { key: "stripe_currency", label: "Currency", type: "text", placeholder: "usd" },
    ],
  },
  {
    id: "sslcommerz",
    label: "SSLCommerz",
    blurb: "Bangladesh cards, mobile banking and net banking via SSLCommerz.",
    icon: Globe,
    testable: true,
    fields: [
      { key: "sslcommerz_enabled", label: "Enable SSLCommerz", type: "toggle" },
      { key: "sslcommerz_store_id", label: "Store ID", type: "text", placeholder: "your_store_id", credKey: "store_id" },
      { key: "sslcommerz_store_password", label: "Store Password", type: "secret", placeholder: "your_store_password", credKey: "store_password" },
      { key: "sslcommerz_sandbox", label: "Sandbox Mode", type: "toggle", credKey: "sandbox" },
    ],
  },
  {
    id: "bkash",
    label: "bKash",
    blurb: "bKash tokenized checkout for direct mobile-wallet payments in BDT.",
    icon: Smartphone,
    testable: true,
    fields: [
      { key: "bkash_enabled", label: "Enable bKash", type: "toggle" },
      { key: "bkash_app_key", label: "App Key", type: "text", credKey: "app_key" },
      { key: "bkash_app_secret", label: "App Secret", type: "secret", credKey: "app_secret" },
      { key: "bkash_username", label: "Merchant Username", type: "text", credKey: "username" },
      { key: "bkash_password", label: "Merchant Password", type: "secret", credKey: "password" },
      { key: "bkash_sandbox", label: "Sandbox Mode", type: "toggle", credKey: "sandbox" },
    ],
  },
  {
    id: "dodopayment",
    label: "DodoPayment",
    blurb: "Cards, Apple Pay and Google Pay via DodoPayments.",
    icon: Landmark,
    testable: true,
    fields: [
      { key: "dodopayment_enabled", label: "Enable DodoPayment", type: "toggle" },
      { key: "dodopayment_api_key", label: "API Key", type: "secret", placeholder: "Your DodoPayments API key", credKey: "api_key" },
      { key: "dodopayment_sandbox", label: "Test Mode", type: "toggle", credKey: "sandbox" },
      { key: "dodopayment_webhook_secret", label: "Webhook Secret (optional)", type: "secret", placeholder: "Webhook secret from Dashboard → Webhooks" },
    ],
  },
  {
    id: "bank_transfer",
    label: "Bank Transfer",
    blurb: "Manual bank deposit. Customer transfers and you confirm the order.",
    icon: Banknote,
    testable: true,
    fields: [
      { key: "bank_transfer_enabled", label: "Enable Bank Transfer", type: "toggle" },
      { key: "bank_transfer_instructions", label: "Payment Instructions (shown to customer)", type: "textarea", placeholder: "After transferring, send the deposit slip to support@example.com." },
      // bank accounts handled separately
    ],
  },
];

interface BankAccount {
  id: string;
  country?: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  branch?: string;
  routing_number?: string;
  swift_code?: string;
  iban?: string;
  notes?: string;
}

type BankAccountField = keyof Omit<BankAccount, "id">;

const BANK_COUNTRIES = ["United States", "United Kingdom", "Bangladesh", "India", "Canada", "Australia", "Germany", "France", "Singapore", "UAE", "Other"];

type TestResult = {
  ok: boolean;
  status: "pass" | "fail" | "warn";
  summary: string;
  latency_ms: number;
  details?: Record<string, unknown>;
};

const PaymentGateways = () => {
  const { data: settings, isLoading } = useSiteSettings();
  const qc = useQueryClient();

  // ---- FlexPay enable/disable (lives in flexpay_settings) ----
  const { data: flexpaySettings, refetch: refetchFlex } = useQuery({
    queryKey: ["flexpay-settings-admin-gateways"],
    queryFn: async () => {
      const { data } = await supabase.from("flexpay_settings").select("*").eq("id", 1).maybeSingle();
      return data;
    },
  });
  const [flexSaving, setFlexSaving] = useState(false);
  const toggleFlexpay = async () => {
    if (!flexpaySettings) return;
    setFlexSaving(true);
    try {
      const next = !flexpaySettings.enabled;
      const { error } = await supabase
        .from("flexpay_settings")
        .update({ enabled: next })
        .eq("id", 1);
      if (error) throw error;
      toast.success(`FlexPay ${next ? "enabled" : "disabled"}.`);
      refetchFlex();
    } catch (e: any) {
      toast.error(e?.message || "Could not update FlexPay");
    } finally {
      setFlexSaving(false);
    }
  };


  const [values, setValues] = useState<Record<string, string>>({});
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bankCountryFilter, setBankCountryFilter] = useState("all");
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, TestResult | null>>({});

  useEffect(() => {
    if (!settings) return;
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(settings)) {
      cleaned[k] = (v as string).replace(/^"|"$/g, "");
    }
    setValues(cleaned);
    try {
      const accs = JSON.parse(cleaned.bank_transfer_accounts || "[]");
      if (Array.isArray(accs)) setBankAccounts(accs);
    } catch { /* ignore */ }
  }, [settings]);

  const isOn = (key: string) => values[key] === "true" || values[key] === "1";
  const setField = (key: string, v: string) => setValues((p) => ({ ...p, [key]: v }));
  const toggleSecret = (k: string) => setVisibleSecrets((p) => ({ ...p, [k]: !p[k] }));
  const filteredBankAccounts = bankCountryFilter === "all"
    ? bankAccounts
    : bankAccounts.filter((a) => (a.country || "Other") === bankCountryFilter);

  const saveGateway = async (gateway: Gateway) => {
    setSavingId(gateway.id);
    try {
      const keys = gateway.fields.map((f) => f.key);
      const rows = keys
        .filter((k) => values[k] !== undefined)
        .map((k) => ({ key: k, value: JSON.stringify(values[k] ?? "") }));
      if (gateway.id === "bank_transfer") {
        rows.push({ key: "bank_transfer_accounts", value: JSON.stringify(bankAccounts) });
      }
      if (rows.length === 0) {
        toast.message("Nothing to save yet.");
        return;
      }
      const { error } = await supabase.from("site_settings").upsert(rows, { onConflict: "key" });
      if (error) throw error;
      toast.success(`${gateway.label} saved.`);
      qc.invalidateQueries({ queryKey: ["site-settings"] });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Save failed";
      const code = typeof e === "object" && e !== null && "code" in e ? String((e as { code?: unknown }).code) : "";
      const isRls = /row-level security|permission denied|policy/i.test(msg) || code === "42501";
      toast.error(isRls ? "Permission denied — super_admin role required." : msg);
    } finally {
      setSavingId(null);
    }
  };

  const testGateway = async (gateway: Gateway) => {
    setTesting((p) => ({ ...p, [gateway.id]: true }));
    setResults((p) => ({ ...p, [gateway.id]: null }));

    let credentials: Record<string, unknown> = {};
    if (gateway.id === "bank_transfer") {
      credentials = { accounts: bankAccounts };
    } else {
      for (const f of gateway.fields) {
        if (!f.credKey) continue;
        const raw = values[f.key] ?? "";
        credentials[f.credKey] = f.type === "toggle" ? raw === "true" || raw === "1" : raw;
      }
    }

    try {
      const { data, error } = await supabase.functions.invoke<TestResult>(
        "payment-gateway-test",
        { body: { gateway: gateway.id, credentials } },
      );
      if (error) throw new Error(error.message);
      if (!data) throw new Error("No response from test endpoint");
      setResults((p) => ({ ...p, [gateway.id]: data }));
      if (data.ok) toast.success(`${gateway.label}: ${data.summary}`);
      else toast.error(`${gateway.label}: ${data.summary}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setResults((p) => ({ ...p, [gateway.id]: { ok: false, status: "fail", summary: msg, latency_ms: 0 } }));
      toast.error(`${gateway.label}: ${msg}`);
    } finally {
      setTesting((p) => ({ ...p, [gateway.id]: false }));
    }
  };

  const renderField = (f: Field) => {
    if (f.type === "toggle") {
      return (
        <div key={f.key} className="flex items-center justify-between py-1">
          <label className="text-sm text-foreground">{f.label}</label>
          <button
            type="button"
            onClick={() => setField(f.key, isOn(f.key) ? "false" : "true")}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isOn(f.key) ? "bg-primary" : "bg-muted"}`}
            aria-pressed={isOn(f.key)}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${isOn(f.key) ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
      );
    }
    if (f.type === "secret") {
      const visible = visibleSecrets[f.key];
      return (
        <div key={f.key}>
          <label className="text-sm text-muted-foreground block mb-1">{f.label}</label>
          <div className="relative">
            <input
              type={visible ? "text" : "password"}
              value={values[f.key] || ""}
              onChange={(e) => setField(f.key, e.target.value)}
              placeholder={f.placeholder}
              className="w-full px-4 py-2.5 pr-10 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button type="button" onClick={() => toggleSecret(f.key)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      );
    }
    if (f.type === "textarea") {
      return (
        <div key={f.key}>
          <label className="text-sm text-muted-foreground block mb-1">{f.label}</label>
          <textarea
            value={values[f.key] || ""}
            onChange={(e) => setField(f.key, e.target.value)}
            placeholder={f.placeholder}
            rows={3}
            className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      );
    }
    return (
      <div key={f.key}>
        <label className="text-sm text-muted-foreground block mb-1">{f.label}</label>
        <input
          type={f.type === "number" ? "number" : "text"}
          value={values[f.key] || ""}
          onChange={(e) => setField(f.key, e.target.value)}
          placeholder={f.placeholder}
          className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>
    );
  };

  const renderBankAccounts = () => (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <label className="text-sm text-foreground font-medium">Bank Accounts</label>
          <select
            value={bankCountryFilter}
            onChange={(e) => setBankCountryFilter(e.target.value)}
            className="mt-1 w-full sm:w-44 px-3 py-2 bg-background border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          >
            <option value="all">All countries</option>
            {BANK_COUNTRIES.map((country) => <option key={country} value={country}>{country}</option>)}
          </select>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setBankAccounts((p) => [...p, { id: crypto.randomUUID(), country: bankCountryFilter === "all" ? "Bangladesh" : bankCountryFilter, bank_name: "", account_name: "", account_number: "" }])}
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Account
        </Button>
      </div>
      {bankAccounts.length === 0 ? (
        <p className="text-xs text-muted-foreground italic py-3 text-center border border-dashed border-border rounded-lg">
          No bank accounts yet.
        </p>
      ) : filteredBankAccounts.length === 0 ? (
        <p className="text-xs text-muted-foreground italic py-3 text-center border border-dashed border-border rounded-lg">
          No bank accounts for this country.
        </p>
      ) : (
        <div className="space-y-3">
          {filteredBankAccounts.map((a, idx) => (
            <div key={a.id} className="p-3 rounded-lg border border-border bg-secondary/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Account #{idx + 1}{a.country ? ` · ${a.country}` : ""}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setBankAccounts((p) => p.filter((x) => x.id !== a.id))}
                  className="text-destructive hover:text-destructive/80"
                  aria-label="Remove account"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={a.country || "Other"}
                  onChange={(e) =>
                    setBankAccounts((prev) => prev.map((x) => (x.id === a.id ? { ...x, country: e.target.value } : x)))
                  }
                  className="px-3 py-2 bg-background border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                >
                  {BANK_COUNTRIES.map((country) => <option key={country} value={country}>{country}</option>)}
                </select>
                {([
                  { k: "bank_name", p: "Bank Name" },
                  { k: "account_name", p: "Account Holder Name" },
                  { k: "account_number", p: "Account Number" },
                  { k: "branch", p: "Branch (optional)" },
                  { k: "routing_number", p: "Routing Number (optional)" },
                  { k: "swift_code", p: "SWIFT / BIC (optional)" },
                ] as { k: BankAccountField; p: string }[]).map(({ k, p }) => (
                  <input
                    key={k}
                    value={a[k] || ""}
                    onChange={(e) =>
                      setBankAccounts((prev) => prev.map((x) => (x.id === a.id ? { ...x, [k]: e.target.value } : x)))
                    }
                    placeholder={p}
                    className="px-3 py-2 bg-background border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                ))}
                <input
                  value={a.iban || ""}
                  onChange={(e) =>
                    setBankAccounts((prev) => prev.map((x) => (x.id === a.id ? { ...x, iban: e.target.value } : x)))
                  }
                  placeholder="IBAN (optional)"
                  className="px-3 py-2 bg-background border border-border rounded text-xs text-foreground sm:col-span-2 focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
                <textarea
                  value={a.notes || ""}
                  onChange={(e) =>
                    setBankAccounts((prev) => prev.map((x) => (x.id === a.id ? { ...x, notes: e.target.value } : x)))
                  }
                  placeholder="Notes (optional)"
                  rows={2}
                  className="px-3 py-2 bg-background border border-border rounded text-xs text-foreground resize-none sm:col-span-2 focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <SuperAdminLayout>
        <p className="text-muted-foreground">Loading…</p>
      </SuperAdminLayout>
    );
  }

  const flexOn = !!flexpaySettings?.enabled;
  const enabledCount = GATEWAYS.filter((g) => isOn(`${g.id}_enabled`)).length + (flexOn ? 1 : 0);
  const totalCount = GATEWAYS.length + 1;

  return (
    <SuperAdminLayout>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Payment Gateways</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure each gateway independently. Save and test inline — redirect URLs are derived from your domain
            automatically.
          </p>
        </div>
        <Badge variant="secondary" className="shrink-0">
          {enabledCount} / {totalCount} active
        </Badge>
      </div>

      <div className="space-y-4 max-w-2xl">
        {GATEWAYS.map((g) => {
          const enabled = isOn(`${g.id}_enabled`);
          const Icon = g.icon;
          const result = results[g.id];
          const isTesting = !!testing[g.id];
          const isSaving = savingId === g.id;
          return (
            <section key={g.id} className="glass-card p-5 space-y-4">
              <header className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${enabled ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-foreground">{g.label}</h2>
                      <Badge variant={enabled ? "default" : "outline"} className="text-[10px] uppercase">
                        {enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{g.blurb}</p>
                  </div>
                </div>
              </header>

              <div className="space-y-3">
                {g.fields.map(renderField)}
                {g.id === "bank_transfer" && renderBankAccounts()}
              </div>

              {result && (
                <div
                  className={`flex items-start gap-2 rounded-md border p-3 text-xs ${
                    result.ok
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : result.status === "warn"
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                      : "border-destructive/30 bg-destructive/10 text-destructive"
                  }`}
                >
                  {result.ok ? (
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  ) : result.status === "warn" ? (
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium">{result.summary}</div>
                    <div className="opacity-70 mt-0.5">Latency: {result.latency_ms} ms</div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                {g.testable && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => testGateway(g)}
                    disabled={isTesting}
                  >
                    {isTesting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <PlayCircle className="w-4 h-4 mr-1" />}
                    Test connection
                  </Button>
                )}
                <Button
                  type="button"
                  variant="hero"
                  size="sm"
                  onClick={() => saveGateway(g)}
                  disabled={isSaving}
                >
                  <Save className="w-4 h-4 mr-1" />
                  {isSaving ? "Saving…" : "Save"}
                </Button>
              </div>
            </section>
          );
        })}

        {/* ============ FlexPay (BNPL / Credit Limit) ============ */}
        <section className="glass-card p-5 space-y-4 relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl bg-primary/20 pointer-events-none" />
          <header className="flex items-start justify-between gap-3 relative">
            <div className="flex items-start gap-3 min-w-0">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${flexOn ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`}>
                <Wallet className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-semibold text-foreground">Dynime FlexPay</h2>
                  <Badge variant={flexOn ? "default" : "outline"} className="text-[10px] uppercase">
                    {flexOn ? "Enabled" : "Disabled"}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] uppercase gap-1">
                    <Sparkles className="w-3 h-3" /> BNPL
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Buy Now, Pay Later via approved credit limit. Customer must have an active FlexPay account with enough available credit to cover the cart total.
                </p>
              </div>
            </div>
          </header>

          <div className="flex items-center justify-between py-1 relative">
            <label className="text-sm text-foreground">Enable FlexPay at checkout</label>
            <button
              type="button"
              onClick={toggleFlexpay}
              disabled={flexSaving || !flexpaySettings}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${flexOn ? "bg-primary" : "bg-muted"} disabled:opacity-60`}
              aria-pressed={flexOn}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${flexOn ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground flex items-start gap-2 relative">
            <ShieldCheck className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
            <span>
              <strong className="text-foreground">Eligibility rule:</strong> at checkout, FlexPay is only offered to signed-in customers whose approved credit limit ≥ cart total. Tenures, fees and credit caps are configured in the FlexPay control panel.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border relative">
            <Button asChild type="button" variant="outline" size="sm">
              <Link to="/superadmin/flexpay">
                Open FlexPay control panel <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </SuperAdminLayout>
  );
};

export default PaymentGateways;

import { useEffect, useMemo, useState } from "react";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { useSiteSettings } from "@/hooks/use-data";
import { supabase } from "@/integrations/supabase/client";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CreditCard, Save, Eye, EyeOff, PlayCircle, CheckCircle2, XCircle, AlertTriangle,
  Loader2, Plus, Trash2, Building2, Banknote, Globe, Smartphone, Landmark, Wallet,
  Sparkles, ArrowRight, ShieldCheck, Copy, ChevronUp, ChevronDown, GripVertical,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useCountryEligibility } from "@/hooks/use-cms-data";
import { ELIGIBLE_COUNTRIES } from "@/data/eligible-countries";

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
  id: "stripe" | "sslcommerz" | "bkash" | "dodopayment" | "bank_transfer" | "keeal";
  label: string;
  blurb: string;
  icon: typeof CreditCard;
  testable: boolean;
  fields: Field[];
};

// Gateway IDs eligible for reordering in checkout
const REORDERABLE_IDS = ["stripe", "stripe_onsite", "sslcommerz", "bkash", "dodopayment", "bank_transfer", "keeal"] as const;
type ReorderableId = typeof REORDERABLE_IDS[number];

const GATEWAYS: Gateway[] = [
  {
    id: "stripe",
    label: "Stripe",
    blurb: "International cards (Visa, Mastercard, Amex) via Stripe Checkout.",
    icon: CreditCard,
    testable: true,
    fields: [
      { key: "stripe_hosted_enabled", label: "Enable Stripe Hosted Checkout", type: "toggle" },
      { key: "stripe_onsite_enabled", label: "Enable Stripe On-Site Card & Express Checkout", type: "toggle" },
      { key: "stripe_sandbox", label: "Test Mode", type: "toggle", credKey: "sandbox" },
      // Live keys
      { key: "stripe_publishable_key", label: "Live Publishable Key", type: "text", placeholder: "pk_live_…", credKey: "publishable_key" },
      { key: "stripe_secret_key", label: "Live Secret Key", type: "secret", placeholder: "sk_live_…", credKey: "secret_key" },
      { key: "stripe_webhook_secret", label: "Live Webhook Secret (optional)", type: "secret", placeholder: "whsec_…" },
      // Test keys
      { key: "stripe_test_publishable_key", label: "Test Publishable Key", type: "text", placeholder: "pk_test_…", credKey: "test_publishable_key" },
      { key: "stripe_test_secret_key", label: "Test Secret Key", type: "secret", placeholder: "sk_test_…", credKey: "test_secret_key" },
      { key: "stripe_test_webhook_secret", label: "Test Webhook Secret (optional)", type: "secret", placeholder: "whsec_…" },
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
      { key: "sslcommerz_sandbox", label: "Sandbox Mode", type: "toggle", credKey: "sandbox" },
      // Live keys
      { key: "sslcommerz_store_id", label: "Live Store ID", type: "text", placeholder: "your_live_store_id", credKey: "store_id" },
      { key: "sslcommerz_store_password", label: "Live Store Password", type: "secret", placeholder: "your_live_store_password", credKey: "store_password" },
      // Test keys
      { key: "sslcommerz_test_store_id", label: "Test Store ID", type: "text", placeholder: "your_test_store_id", credKey: "test_store_id" },
      { key: "sslcommerz_test_store_password", label: "Test Store Password", type: "secret", placeholder: "your_test_store_password", credKey: "test_store_password" },
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
      { key: "bkash_sandbox", label: "Sandbox Mode", type: "toggle", credKey: "sandbox" },
      // Live keys
      { key: "bkash_app_key", label: "Live App Key", type: "text", credKey: "app_key" },
      { key: "bkash_app_secret", label: "Live App Secret", type: "secret", credKey: "app_secret" },
      { key: "bkash_username", label: "Live Merchant Username", type: "text", credKey: "username" },
      { key: "bkash_password", label: "Live Merchant Password", type: "secret", credKey: "password" },
      // Test keys
      { key: "bkash_test_app_key", label: "Test App Key", type: "text", credKey: "test_app_key" },
      { key: "bkash_test_app_secret", label: "Test App Secret", type: "secret", credKey: "test_app_secret" },
      { key: "bkash_test_username", label: "Test Merchant Username", type: "text", credKey: "test_username" },
      { key: "bkash_test_password", label: "Test Merchant Password", type: "secret", credKey: "test_password" },
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
      { key: "dodopayment_sandbox", label: "Test Mode", type: "toggle", credKey: "sandbox" },
      // Live keys
      { key: "dodopayment_api_key", label: "Live API Key", type: "secret", placeholder: "Live API key", credKey: "api_key" },
      { key: "dodopayment_webhook_secret", label: "Live Webhook Secret (optional)", type: "secret", placeholder: "Live Webhook secret", credKey: "webhook_secret" },
      // Test keys
      { key: "dodopayment_test_api_key", label: "Test API Key", type: "secret", placeholder: "Test API key", credKey: "test_api_key" },
      { key: "dodopayment_test_webhook_secret", label: "Test Webhook Secret (optional)", type: "secret", placeholder: "Test Webhook secret", credKey: "test_webhook_secret" },
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
    ],
  },
  {
    id: "keeal",
    label: "Keeal",
    blurb: "Cards and alternative payment methods via Keeal hosted checkout.",
    icon: CreditCard,
    testable: true,
    fields: [
      { key: "keeal_enabled", label: "Enable Keeal", type: "toggle" },
      { key: "keeal_sandbox", label: "Sandbox Mode", type: "toggle", credKey: "sandbox" },
      // Live keys
      { key: "keeal_secret_key", label: "Live Secret Key", type: "secret", placeholder: "keeal_sec_live_...", credKey: "secret_key" },
      { key: "keeal_webhook_secret", label: "Live Webhook Secret (optional)", type: "secret", placeholder: "keeal_whsec_live_..." },
      // Test keys
      { key: "keeal_test_secret_key", label: "Test Secret Key", type: "secret", placeholder: "keeal_sec_test_...", credKey: "test_secret_key" },
      { key: "keeal_test_webhook_secret", label: "Test Webhook Secret (optional)", type: "secret", placeholder: "keeal_whsec_test_..." },
      { key: "keeal_currency", label: "Currency", type: "text", placeholder: "usd" },
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

// Fallback — used only while the dynamic list from DB hasn't loaded yet.
const BANK_COUNTRIES_FALLBACK = [...ELIGIBLE_COUNTRIES, "Other"];

type TestResult = {
  ok: boolean;
  status: "pass" | "fail" | "warn";
  summary: string;
  latency_ms: number;
  details?: Record<string, unknown>;
};

const WebhookUrlInfo = ({ label, url }: { label: string; url: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success(`${label} copied to clipboard`);
  };
  return (
    <div className="mt-3 p-3 rounded-lg border border-border bg-muted/20 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="text-xs text-primary hover:underline focus:outline-none"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <div className="text-xs font-mono break-all text-foreground select-all bg-secondary/50 p-1.5 rounded border border-border/40">
        {url}
      </div>
    </div>
  );
};

const PaymentGateways = () => {
  const { data: settings, isLoading } = useSiteSettings();
  const qc = useQueryClient();
  const apiBaseUrl = (import.meta.env.VITE_API_URL as string) || `${window.location.origin}/api/v1`;

  // Dynamic country list from the database — replaces hardcoded ELIGIBLE_COUNTRIES for bank transfer
  const { data: countryEligibilityRows } = useCountryEligibility();
  const BANK_COUNTRIES = useMemo(() => {
    if (!countryEligibilityRows || countryEligibilityRows.length === 0) return BANK_COUNTRIES_FALLBACK;
    const eligible = countryEligibilityRows
      .filter((r: any) => r.status === 'eligible' && r.is_active)
      .map((r: any) => r.name)
      .sort();
    return [...eligible, "Other"];
  }, [countryEligibilityRows]);

  const renderMaskedText = (val: string, isSecret = false) => {
    if (!val) return null;
    const chunks: { text: string; blur: boolean }[] = [];
    let index = 0;
    let isBlur = false;
    const chunkSize = 12;
    while (index < val.length) {
      chunks.push({
        text: val.substring(index, index + chunkSize),
        blur: isBlur
      });
      index += chunkSize;
      isBlur = !isBlur;
    }

    return (
      <div className="flex items-center overflow-hidden whitespace-nowrap font-mono select-none pointer-events-none text-xs leading-none">
        {chunks.map((c, i) => (
          <span
            key={i}
            className={c.blur ? "opacity-75" : ""}
            style={c.blur ? { filter: "blur(2px)" } : undefined}
          >
            {c.text}
          </span>
        ))}
      </div>
    );
  };

  // ---- FlexPay enable/disable (lives in flexpay_settings) ----
  const { data: flexpaySettings, refetch: refetchFlex } = useQuery({
    queryKey: ["flexpay-settings-admin-gateways"],
    queryFn: async () => {
      return apiGet<any>("/cms/flexpay-settings");
    },
  });
  const [flexSaving, setFlexSaving] = useState(false);
  const toggleFlexpay = async () => {
    if (!flexpaySettings) return;
    setFlexSaving(true);
    try {
      const next = !flexpaySettings.enabled;
      await apiPatch("/cms/flexpay-settings", { enabled: next });
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
  const [revealedFields, setRevealedFields] = useState<Record<string, boolean>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, TestResult | null>>({});

  // Gateway order state for reorder panel
  const [gatewayOrder, setGatewayOrder] = useState<ReorderableId[]>([...REORDERABLE_IDS]);
  const [orderSaving, setOrderSaving] = useState(false);

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

    // Restore saved order
    try {
      const raw = cleaned.gateway_order || "[]";
      let savedOrder: ReorderableId[] = [];
      if (raw.startsWith("[")) {
        savedOrder = JSON.parse(raw);
      } else {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) savedOrder = parsed;
      }
      if (Array.isArray(savedOrder) && savedOrder.length > 0) {
        // Merge: keep saved order, append any missing IDs at the end
        const merged = [
          ...savedOrder.filter((id) => (REORDERABLE_IDS as readonly string[]).includes(id)) as ReorderableId[],
          ...REORDERABLE_IDS.filter((id) => !savedOrder.includes(id)),
        ];
        setGatewayOrder(merged);
      }
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
      // Also include custom label and description overrides
      const extraKeys = [`gateway_label_${gateway.id}`, `gateway_desc_${gateway.id}`];
      if (gateway.id === "stripe") {
        extraKeys.push("gateway_label_stripe_onsite", "gateway_desc_stripe_onsite");
      }
      const allKeys = [...keys, ...extraKeys];
      const rows = allKeys
        .filter((k) => values[k] !== undefined)
        .map((k) => ({ key: k, value: JSON.stringify(values[k] ?? "") }));
      if (gateway.id === "bank_transfer") {
        rows.push({ key: "bank_transfer_accounts", value: JSON.stringify(bankAccounts) });
      }
      if (rows.length === 0) {
        toast.message("Nothing to save yet.");
        return;
      }
      await apiPost("/cms/site-settings/bulk", { settings: rows });
      toast.success(`${gateway.label} saved.`);
      qc.invalidateQueries({ queryKey: ["site-settings"] });
      qc.invalidateQueries({ queryKey: ["enabled-gateways"] });
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally {
      setSavingId(null);
    }
  };

  const saveGatewayOrder = async () => {
    setOrderSaving(true);
    try {
      await apiPost("/cms/site-settings/bulk", {
        settings: [{ key: "gateway_order", value: JSON.stringify(gatewayOrder) }],
      });
      toast.success("Gateway order saved.");
      qc.invalidateQueries({ queryKey: ["site-settings"] });
      qc.invalidateQueries({ queryKey: ["enabled-gateways"] });
    } catch (e: any) {
      toast.error(e?.message || "Could not save order");
    } finally {
      setOrderSaving(false);
    }
  };

  const moveGateway = (id: ReorderableId, direction: "up" | "down") => {
    setGatewayOrder((prev) => {
      const idx = prev.indexOf(id);
      if (idx === -1) return prev;
      const next = [...prev];
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
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
      const data = await apiPost<TestResult>(
        "/cms/site-settings/test-gateway",
        { gateway: gateway.id, credentials },
      );
      if (!data) throw new Error("No response from test endpoint");
      setResults((p) => ({ ...p, [gateway.id]: data }));
      if (data.ok) toast.success(`${gateway.label}: ${data.summary}`);
      else toast.error(`${gateway.label}: ${data.summary}`);
    } catch (e: any) {
      const msg = e?.message || String(e);
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

    const isSensitive = (f.type === "text" || f.type === "secret" || f.type === "textarea" || f.type === "number") && f.key !== "stripe_currency" && f.key !== "keeal_currency";
    const hasValue = !!values[f.key];
    const isRevealed = revealedFields[f.key];
    const isSecret = f.type === "secret";
    const visible = visibleSecrets[f.key];

    // If it is sensitive and has value, we show copy button inside + full blur
    if (isSensitive && hasValue) {
      return (
        <div key={f.key} className="space-y-1">
          <label className="text-sm text-muted-foreground block">{f.label}</label>
          <div className="relative flex items-center w-full bg-secondary border border-border rounded-lg focus-within:ring-2 focus-within:ring-primary/50 overflow-hidden">
            {/* Input display area */}
            <div className="flex-1 min-w-0 h-10 flex items-center pl-4 pr-2">
              {!isRevealed ? (
                <div
                  onClick={() => setRevealedFields((p) => ({ ...p, [f.key]: true }))}
                  style={{ filter: "blur(1.2px)", select: "none", cursor: "pointer" }}
                  className="w-full font-mono text-sm overflow-hidden whitespace-nowrap text-muted-foreground/50"
                >
                  {values[f.key]}
                </div>
              ) : (
                <input
                  ref={(el) => {
                    if (el && document.activeElement !== el) {
                      el.focus();
                    }
                  }}
                  type={isSecret && !visible ? "password" : "text"}
                  value={values[f.key] || ""}
                  onChange={(e) => setField(f.key, e.target.value)}
                  onBlur={() => setRevealedFields((p) => ({ ...p, [f.key]: false }))}
                  placeholder={f.placeholder}
                  className="w-full bg-transparent border-none text-sm text-foreground focus:outline-none focus-visible:outline-none focus-visible:ring-0 p-0"
                />
              )}
            </div>

            {/* Actions area inside the input box on the right, with a soft left border */}
            <div className="h-6 flex items-center border-l border-foreground/25 px-3 shrink-0 gap-3 text-muted-foreground">
              {isSecret && isRevealed && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => toggleSecret(f.key)}
                  className="hover:text-foreground transition-colors"
                >
                  {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              )}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  navigator.clipboard.writeText(values[f.key] || "");
                  toast.success("Copied to clipboard");
                }}
                className="hover:text-foreground transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (f.type === "secret") {
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
            <button
              type="button"
              onClick={() => toggleSecret(f.key)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10"
            >
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
                  { k: "bank_name", p: "Bank Name", s: false },
                  { k: "account_name", p: "Account Holder Name", s: true },
                  { k: "account_number", p: "Account Number", s: true },
                  { k: "branch", p: "Branch (optional)", s: false },
                  { k: "routing_number", p: "Routing Number (optional)", s: true },
                  { k: "swift_code", p: "SWIFT / BIC (optional)", s: true },
                ] as { k: BankAccountField; p: string; s: boolean }[]).map(({ k, p, s }) => {
                  const val = a[k] || "";
                  const fieldKey = `bank_account_${a.id}_${k}`;
                  const isRevealed = revealedFields[fieldKey];

                  if (s && val) {
                    return (
                      <div key={k} className="relative flex items-center w-full bg-background border border-border rounded focus-within:ring-1 focus-within:ring-primary/50 overflow-hidden h-9">
                        <div className="flex-1 min-w-0 px-3 flex items-center">
                          {!isRevealed ? (
                            <div
                              onClick={() => setRevealedFields((prev) => ({ ...prev, [fieldKey]: true }))}
                              style={{ filter: "blur(1.2px)", select: "none", cursor: "pointer" }}
                              className="w-full font-mono text-xs overflow-hidden whitespace-nowrap text-muted-foreground/50"
                            >
                              {val}
                            </div>
                          ) : (
                            <input
                              ref={(el) => {
                                if (el && document.activeElement !== el) el.focus();
                              }}
                              value={val}
                              onChange={(e) =>
                                setBankAccounts((prev) => prev.map((x) => (x.id === a.id ? { ...x, [k]: e.target.value } : x)))
                              }
                              onBlur={() => setRevealedFields((prev) => ({ ...prev, [fieldKey]: false }))}
                              placeholder={p}
                              className="w-full bg-transparent border-none text-xs text-foreground focus:outline-none focus-visible:outline-none focus-visible:ring-0 p-0"
                            />
                          )}
                        </div>
                        <div className="h-5 flex items-center border-l border-foreground/25 px-2 shrink-0 text-muted-foreground">
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              navigator.clipboard.writeText(val);
                              toast.success("Copied to clipboard");
                            }}
                            className="hover:text-foreground transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <input
                      key={k}
                      value={val}
                      onChange={(e) =>
                        setBankAccounts((prev) => prev.map((x) => (x.id === a.id ? { ...x, [k]: e.target.value } : x)))
                      }
                      placeholder={p}
                      className="px-3 py-2 bg-background border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  );
                })}
                {(() => {
                  const val = a.iban || "";
                  const fieldKey = `bank_account_${a.id}_iban`;
                  const isRevealed = revealedFields[fieldKey];

                  if (val) {
                    return (
                      <div className="relative flex items-center w-full bg-background border border-border rounded focus-within:ring-1 focus-within:ring-primary/50 overflow-hidden h-9 sm:col-span-2">
                        <div className="flex-1 min-w-0 px-3 flex items-center">
                          {!isRevealed ? (
                            <div
                              onClick={() => setRevealedFields((prev) => ({ ...prev, [fieldKey]: true }))}
                              style={{ filter: "blur(1.2px)", select: "none", cursor: "pointer" }}
                              className="w-full font-mono text-xs overflow-hidden whitespace-nowrap text-muted-foreground/50"
                            >
                              {val}
                            </div>
                          ) : (
                            <input
                              ref={(el) => {
                                if (el && document.activeElement !== el) el.focus();
                              }}
                              value={val}
                              onChange={(e) =>
                                setBankAccounts((prev) => prev.map((x) => (x.id === a.id ? { ...x, iban: e.target.value } : x)))
                              }
                              onBlur={() => setRevealedFields((prev) => ({ ...prev, [fieldKey]: false }))}
                              placeholder="IBAN (optional)"
                              className="w-full bg-transparent border-none text-xs text-foreground focus:outline-none focus-visible:outline-none focus-visible:ring-0 p-0"
                            />
                          )}
                        </div>
                        <div className="h-5 flex items-center border-l border-foreground/25 px-2 shrink-0 text-muted-foreground">
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              navigator.clipboard.writeText(val);
                              toast.success("Copied to clipboard");
                            }}
                            className="hover:text-foreground transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <input
                      value={val}
                      onChange={(e) =>
                        setBankAccounts((prev) => prev.map((x) => (x.id === a.id ? { ...x, iban: e.target.value } : x)))
                      }
                      placeholder="IBAN (optional)"
                      className="px-3 py-2 bg-background border border-border rounded text-xs text-foreground sm:col-span-2 focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  );
                })()}
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

  const isGatewayEnabled = (gId: string) => {
    if (gId === "stripe") {
      return isOn("stripe_hosted_enabled") || isOn("stripe_onsite_enabled");
    }
    return isOn(`${gId}_enabled`);
  };

  const flexOn = !!flexpaySettings?.enabled;
  const enabledCount = GATEWAYS.filter((g) => isGatewayEnabled(g.id)).length + (flexOn ? 1 : 0);
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

      {/* ======== Checkout Display Order ======== */}
      <section className="glass-card p-5 mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              Checkout Display Order
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Drag or use arrows to set the order customers see payment methods.</p>
          </div>
          <Button
            type="button"
            variant="hero"
            size="sm"
            onClick={saveGatewayOrder}
            disabled={orderSaving}
          >
            {orderSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            Save Order
          </Button>
        </div>

        <div className="space-y-1.5">
          {gatewayOrder.map((id, idx) => {
            const gwMeta: Record<string, { label: string; icon: typeof CreditCard }> = {
              stripe: { label: "Stripe Hosted Checkout", icon: CreditCard },
              stripe_onsite: { label: "Direct Credit Card & Express Pay", icon: CreditCard },
              sslcommerz: { label: "SSLCommerz", icon: Globe },
              bkash: { label: "bKash", icon: Smartphone },
              dodopayment: { label: "DodoPayment", icon: Landmark },
              bank_transfer: { label: "Bank Transfer", icon: Banknote },
            };
            const info = gwMeta[id];
            const customLabel = values[`gateway_label_${id}`];
            const displayLabel = customLabel || info?.label || id;
            const Icon = info?.icon || CreditCard;
            return (
              <div key={id} className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/30 border border-border/50">
                <GripVertical className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                  isGatewayEnabled(id as any) ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
                }`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="flex-1 text-sm font-medium text-foreground truncate">{displayLabel}</span>
                <span className={`text-[10px] uppercase font-medium px-1.5 py-0.5 rounded-full ${
                  isGatewayEnabled(id as any) ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"
                }`}>
                  {isGatewayEnabled(id as any) ? "on" : "off"}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveGateway(id, "up")}
                    disabled={idx === 0}
                    className="w-6 h-6 flex items-center justify-center rounded border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Move up"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveGateway(id, "down")}
                    disabled={idx === gatewayOrder.length - 1}
                    className="w-6 h-6 flex items-center justify-center rounded border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Move down"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="space-y-4 max-w-2xl">
        {GATEWAYS.map((g) => {
          const enabled = isGatewayEnabled(g.id);
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

                {/* Stripe publishable key validation warning */}
                {g.id === "stripe" && (() => {
                  const sandboxOn = isOn("stripe_sandbox");
                  const pkKey = sandboxOn ? "stripe_test_publishable_key" : "stripe_publishable_key";
                  const pkVal = values[pkKey] || "";
                  const isInvalidPk = pkVal && pkVal.length > 0 && (!pkVal.startsWith("pk_") || pkVal.length < 90);
                  if (!isInvalidPk) return null;
                  return (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-amber-500">
                          {sandboxOn ? "Test Publishable Key" : "Live Publishable Key"} appears invalid or truncated ({pkVal.length} chars, need ~107+)
                        </p>
                        <p className="text-xs text-amber-400/80 mt-0.5">
                          Stripe On-Site Card checkout requires a valid publishable key (starts with <code className="font-mono">pk_test_</code> or <code className="font-mono">pk_live_</code>). Please re-enter the full key from your <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="underline">Stripe Dashboard → API keys</a>.
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* Keeal sandbox/key configuration warning */}
                {g.id === "keeal" && (() => {
                  const keealSandbox = isOn("keeal_sandbox");
                  const liveKey = values["keeal_secret_key"] || "";
                  const testKey = values["keeal_test_secret_key"] || "";
                  if (keealSandbox && !testKey && liveKey) {
                    return (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-amber-500">Sandbox mode is ON but no Test Secret Key is configured</p>
                          <p className="text-xs text-amber-400/80 mt-0.5">
                            Either add a Keeal Test Secret Key, or turn off Sandbox Mode to use the Live Secret Key. Without this, Keeal payments will fail.
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Gateway Display Customization */}
                <div className="pt-2 border-t border-border/40 space-y-4">
                  {g.id === "stripe" ? (
                    <>
                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Checkout Display - Stripe Hosted Checkout</p>
                        <div className="grid grid-cols-1 gap-2">
                          <div>
                            <label className="text-sm text-muted-foreground block mb-1">Custom Name (shown in checkout)</label>
                            <input
                              type="text"
                              value={values[`gateway_label_stripe`] || ""}
                              onChange={(e) => setField(`gateway_label_stripe`, e.target.value)}
                              placeholder="Stripe Hosted Checkout"
                              className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                          </div>
                          <div>
                            <label className="text-sm text-muted-foreground block mb-1">Custom Description (shown in checkout)</label>
                            <input
                              type="text"
                              value={values[`gateway_desc_stripe`] || ""}
                              onChange={(e) => setField(`gateway_desc_stripe`, e.target.value)}
                              placeholder="Pay using Stripe secure hosted checkout."
                              className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-border/20">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Checkout Display - Stripe On-Site / Card Checkout</p>
                        <div className="grid grid-cols-1 gap-2">
                          <div>
                            <label className="text-sm text-muted-foreground block mb-1">Custom Name (shown in checkout)</label>
                            <input
                              type="text"
                              value={values[`gateway_label_stripe_onsite`] || ""}
                              onChange={(e) => setField(`gateway_label_stripe_onsite`, e.target.value)}
                              placeholder="Credit Card"
                              className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                          </div>
                          <div>
                            <label className="text-sm text-muted-foreground block mb-1">Custom Description (shown in checkout)</label>
                            <input
                              type="text"
                              value={values[`gateway_desc_stripe_onsite`] || ""}
                              onChange={(e) => setField(`gateway_desc_stripe_onsite`, e.target.value)}
                              placeholder="Pay directly using your credit or debit card."
                              className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Checkout Display</p>
                      <div className="grid grid-cols-1 gap-2">
                        <div>
                          <label className="text-sm text-muted-foreground block mb-1">Custom Name (shown in checkout)</label>
                          <input
                            type="text"
                            value={values[`gateway_label_${g.id}`] || ""}
                            onChange={(e) => setField(`gateway_label_${g.id}`, e.target.value)}
                            placeholder={g.label}
                            className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground block mb-1">Custom Description (shown in checkout)</label>
                          <input
                            type="text"
                            value={values[`gateway_desc_${g.id}`] || ""}
                            onChange={(e) => setField(`gateway_desc_${g.id}`, e.target.value)}
                            placeholder={g.blurb}
                            className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {g.id === "stripe" && (
                <WebhookUrlInfo
                  label="Stripe Webhook URL"
                  url={`${apiBaseUrl}/orders/public/stripe-webhook`}
                />
              )}
              {g.id === "dodopayment" && (
                <WebhookUrlInfo
                  label="DodoPayments Webhook URL"
                  url={`${apiBaseUrl}/orders/public/dodopayment-webhook`}
                />
              )}
              {g.id === "sslcommerz" && (
                <WebhookUrlInfo
                  label="SSLCommerz Callback/IPN URL"
                  url={`${apiBaseUrl}/orders/public/sslcommerz-callback?status=success&origin=${window.location.origin}`}
                />
              )}
              {g.id === "bkash" && (
                <WebhookUrlInfo
                  label="bKash Callback URL"
                  url={`${apiBaseUrl}/orders/public/bkash-callback?origin=${window.location.origin}`}
                />
              )}
              {g.id === "keeal" && (
                <WebhookUrlInfo
                  label="Keeal Webhook URL"
                  url={`${apiBaseUrl}/orders/public/keeal-webhook`}
                />
              )}

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

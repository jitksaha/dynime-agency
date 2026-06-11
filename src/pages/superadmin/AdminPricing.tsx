import { useEffect, useMemo, useState } from "react";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import AddonsManager from "@/components/admin/AddonsManager";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { SERVICE_PRICING_PACKS } from "@/data/service-pricing-packs";
import type { PricingTier, QuoteSettings } from "@/components/services/ServicePricingSection";
import {
  Search, Plus, Trash2, ChevronUp, ChevronDown, Save, ExternalLink,
  Star, Loader2, CheckCircle2,
} from "lucide-react";

// ──────────────── Live service catalog (matches mega-menu + real routes) ────────────────
type Svc = { slug: string; title: string; url: string; defaultPack?: string };
type CatKey = "dws" | "des" | "dms" | "dss" | "dcs";

const CATEGORIES: Record<CatKey, { label: string; services: Svc[] }> = {
  dws: {
    label: "DWS — Dynime Web Services",
    services: [
      { slug: "web-design-development", title: "Web Design & Development", url: "/web-design-development", defaultPack: "wordpress-design" },
      { slug: "wordpress-woocommerce", title: "WordPress & WooCommerce", url: "/wordpress-woocommerce", defaultPack: "woocommerce" },
      { slug: "react-mern-apps", title: "React / MERN Apps", url: "/react-mern-apps", defaultPack: "custom-web-apps" },
      { slug: "ui-ux-design", title: "UI/UX Design", url: "/ui-ux-design", defaultPack: "ui-ux-design" },
      { slug: "maintenance-security", title: "Maintenance & Security", url: "/maintenance-security", defaultPack: "wordpress-maintenance" },
      { slug: "website-redesign", title: "Website Redesign", url: "/website-redesign", defaultPack: "website-redesign" },
      { slug: "shopify", title: "Shopify Development", url: "/shopify", defaultPack: "shopify" },
      { slug: "saas-development", title: "SaaS Development", url: "/saas-development", defaultPack: "custom-web-apps" },
      { slug: "webflow-development", title: "Webflow Development", url: "/webflow-development", defaultPack: "ui-ux-design" },
      { slug: "speed-optimization", title: "Page Speed Optimization", url: "/speed-optimization", defaultPack: "speed-optimization" },
    ],
  },
  des: {
    label: "DES — Dynime Ecommerce Solution",
    services: [
      { slug: "shopify-ecommerce", title: "Shopify Ecommerce", url: "/shopify-ecommerce", defaultPack: "shopify-ecommerce" },
      { slug: "wordpress-ecommerce", title: "WordPress Ecommerce", url: "/wordpress-ecommerce", defaultPack: "wordpress-ecommerce" },
      { slug: "nodejs-mern-ecommerce", title: "Nodejs / MERN Ecommerce", url: "/nodejs-mern-ecommerce", defaultPack: "nodejs-mern-ecommerce" },
      { slug: "laravel-ecommerce", title: "Laravel Ecommerce", url: "/laravel-ecommerce", defaultPack: "laravel-ecommerce" },
    ],
  },
  dms: {
    label: "DMS — Dynime Marketing Services",
    services: [
      { slug: "social-media", title: "Social Media", url: "/social-media", defaultPack: "social-media" },
      { slug: "facebook-ads", title: "Meta Ads", url: "/facebook-ads", defaultPack: "facebook-ads" },
      { slug: "google-ads", title: "Google Ads", url: "/google-ads", defaultPack: "google-ads" },
      { slug: "seo", title: "SEO", url: "/seo", defaultPack: "seo" },
      { slug: "brand-strategy", title: "Brand Strategy", url: "/brand-strategy", defaultPack: "brand-strategy" },
      { slug: "content-marketing", title: "Content Marketing", url: "/content-marketing", defaultPack: "content-marketing" },
      { slug: "email-marketing", title: "Email Marketing", url: "/email-marketing", defaultPack: "email-marketing" },
      { slug: "analytics", title: "Analytics & CRO", url: "/analytics", defaultPack: "analytics" },
    ],
  },
  dss: {
    label: "DSS — Dynime Software & AI",
    services: [
      { slug: "ai-software-development", title: "AI Software Development", url: "/ai-software-development", defaultPack: "ai-software-development" },
      { slug: "custom-software-development", title: "Custom Software Development", url: "/custom-software-development", defaultPack: "custom-software-development" },
      { slug: "software-built-with-ai", title: "Software Built With AI", url: "/software-built-with-ai", defaultPack: "software-built-with-ai" },
      { slug: "software-testing-qa", title: "Software Testing & QA", url: "/software-testing-qa", defaultPack: "software-testing-qa" },
      { slug: "pay-open-source", title: "Dynime Pay (Self-Hosted)", url: "/pay-open-source", defaultPack: "payment-gateway" },
    ],
  },
  dcs: {
    label: "DCS — Dynime Consultancy Services",
    services: [
      { slug: "us-company", title: "US Company Formation", url: "/us-company", defaultPack: "us-company" },
      { slug: "uk-company", title: "UK Company Formation", url: "/uk-company", defaultPack: "uk-company" },
      { slug: "virtual-address", title: "US & UK Business Address", url: "/virtual-address", defaultPack: "virtual-address" },
      { slug: "itin-services", title: "ITIN Application Services", url: "/itin-services", defaultPack: "itin-services" },
      { slug: "dropshipping-solution", title: "Dropshipping Solution", url: "/dropshipping-solution", defaultPack: "dropshipping-solution" },
      { slug: "marketplace-solution", title: "Marketplace Selling Solution", url: "/marketplace-solution", defaultPack: "marketplace-solution" },
      { slug: "payment-gateway", title: "Payment Gateway Setup", url: "/payment-gateway", defaultPack: "payment-gateway" },
      { slug: "consulting", title: "Business Consulting", url: "/consulting", defaultPack: "consulting" },
    ],
  },
};

const ALL_SERVICES: (Svc & { category: CatKey; categoryLabel: string })[] =
  (Object.entries(CATEGORIES) as [CatKey, typeof CATEGORIES[CatKey]][]).flatMap(
    ([category, c]) => c.services.map((s) => ({ ...s, category, categoryLabel: c.label }))
  );

// ──────────────── Defaults ────────────────
const defaultQuoteSettings = (): QuoteSettings => ({
  enable_contact: true,
  enable_modal: true,
  enable_whatsapp: false,
  whatsapp_number: "",
  quote_message: "Tell us about your project and we'll send a tailored quote within 24 hours.",
});

const blankTier = (): PricingTier => ({
  id: crypto.randomUUID(),
  name: "New Tier",
  description: "",
  price_usd: 99,
  price_bdt: null,
  period: "one-time",
  features: [],
  highlighted: false,
  cta_type: "fixed",
  cta_label: "",
});

const getDefaultTiers = (svc: Svc): PricingTier[] => {
  if (svc.defaultPack && SERVICE_PRICING_PACKS[svc.defaultPack]) {
    // Re-id tiers so each service has unique tier IDs
    return SERVICE_PRICING_PACKS[svc.defaultPack]().map((t) => ({
      ...t,
      id: crypto.randomUUID(),
    }));
  }
  return [blankTier()];
};

// ──────────────── Component ────────────────
interface Row {
  service_slug: string;
  service_title: string;
  is_enabled: boolean;
  tiers: PricingTier[];
  quote_settings: QuoteSettings;
}

export default function AdminPricing() {
  const { toast } = useToast();
  const { session } = useAuth();
  const token = session?.access_token;
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSlug, setSelectedSlug] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("admin:pricing:selectedSlug");
      if (saved && ALL_SERVICES.some((s) => s.slug === saved)) return saved;
    }
    return ALL_SERVICES[0].slug;
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    sessionStorage.setItem("admin:pricing:selectedSlug", selectedSlug);
  }, [selectedSlug]);
  

  // Load all rows from DB
  const reload = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/v1/cms/service-pricing", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch service pricing");
      const data = await res.json();
      const map: Record<string, Row> = {};
      (data ?? []).forEach((r: any) => {
        map[r.service_slug] = {
          service_slug: r.service_slug,
          service_title: r.service_title,
          is_enabled: r.is_enabled ?? true,
          tiers: Array.isArray(r.tiers) ? r.tiers : [],
          quote_settings: r.quote_settings ?? defaultQuoteSettings(),
        };
      });
      setRows(map);
    } catch (error: any) {
      toast({ title: "Failed to load pricing", description: error.message, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (token) {
      reload();
    }
  }, [token]);


  // Selected service helpers
  const selectedSvc = ALL_SERVICES.find((s) => s.slug === selectedSlug)!;
  const current: Row = rows[selectedSlug] ?? {
    service_slug: selectedSvc.slug,
    service_title: selectedSvc.title,
    is_enabled: true,
    tiers: [],
    quote_settings: defaultQuoteSettings(),
  };

  const update = (patch: Partial<Row>) =>
    setRows((prev) => ({ ...prev, [selectedSlug]: { ...current, ...patch } }));

  const updateTier = (i: number, patch: Partial<PricingTier>) => {
    const next = [...current.tiers];
    next[i] = { ...next[i], ...patch };
    update({ tiers: next });
  };

  const moveTier = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= current.tiers.length) return;
    const next = [...current.tiers];
    [next[i], next[j]] = [next[j], next[i]];
    update({ tiers: next });
  };

  const addTier = () => update({ tiers: [...current.tiers, blankTier()] });
  const removeTier = (i: number) => update({ tiers: current.tiers.filter((_, k) => k !== i) });


  const save = async () => {
    if (!token) {
      toast({ title: "Save failed", description: "Not authenticated", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/v1/cms/service-pricing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          service_slug: current.service_slug,
          service_title: current.service_title,
          is_enabled: current.is_enabled,
          tiers: current.tiers,
          quote_settings: current.quote_settings,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to save");
      }
      toast({ title: "Saved", description: `${current.service_title} pricing updated.` });
    } catch (error: any) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    }
    setSaving(false);
  };

  // Filtered service list
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ALL_SERVICES.filter((s) => !q || s.title.toLowerCase().includes(q) || s.slug.includes(q));
  }, [search]);

  const grouped = useMemo(() => {
    const g: Record<string, typeof ALL_SERVICES> = {};
    filtered.forEach((s) => {
      g[s.categoryLabel] = g[s.categoryLabel] || [];
      g[s.categoryLabel].push(s);
    });
    return g;
  }, [filtered]);

  return (
    <SuperAdminLayout>
      <div className="p-6 max-w-[1500px] mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Service Pricing</h1>
            <p className="text-sm text-muted-foreground">
              Manage tiers, prices and quote settings for every service page.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
          {/* LEFT — service list */}
          <div className="lg:sticky lg:top-[80px] h-fit">
            <Card className="overflow-hidden">
              <div className="p-3 border-b">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search services…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
              </div>
              <div className="max-h-[calc(100vh-240px)] overflow-y-auto py-2">
                {Object.entries(grouped).map(([catLabel, list]) => (
                  <div key={catLabel} className="mb-3">
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {catLabel}
                    </div>
                    {list.map((s) => {
                      const row = rows[s.slug];
                      const tierCount = row?.tiers?.length ?? 0;
                      const isActive = selectedSlug === s.slug;
                      return (
                        <button
                          key={s.slug}
                          onClick={() => setSelectedSlug(s.slug)}
                          className={`w-full text-left px-3 py-2 flex items-center gap-2 text-sm transition-colors ${
                            isActive
                              ? "bg-primary/10 text-primary border-l-2 border-primary"
                              : "hover:bg-muted/50 border-l-2 border-transparent"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                              row?.is_enabled === false
                                ? "bg-muted-foreground/40"
                                : tierCount > 0
                                  ? "bg-emerald-500"
                                  : "bg-muted-foreground/30"
                            }`}
                          />
                          <span className="flex-1 truncate">{s.title}</span>
                          {tierCount > 0 ? (
                            <Badge variant="secondary" className="h-5 text-[10px] px-1.5">
                              {tierCount}
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* RIGHT — editor */}
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Service header */}
                <Card>
                  <CardContent className="p-4 flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[220px]">
                      <Label className="text-xs text-muted-foreground">Service title</Label>
                      <Input
                        value={current.service_title}
                        onChange={(e) => update({ service_title: e.target.value })}
                        className="mt-1 font-semibold"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Live page</Label>
                      <a
                        href={selectedSvc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 flex items-center gap-1.5 text-sm text-primary hover:underline h-10 px-3 rounded-md border bg-muted/30"
                      >
                        {selectedSvc.url}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                    <div className="flex items-center gap-2 h-10 px-3 rounded-md border">
                      <Switch
                        checked={current.is_enabled}
                        onCheckedChange={(v) => update({ is_enabled: v })}
                      />
                      <Label className="text-sm">Show on frontend</Label>
                    </div>
                  </CardContent>
                </Card>

                {/* Action bar */}
                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={addTier} variant="outline" size="sm" className="gap-1.5">
                    <Plus className="h-4 w-4" /> Add tier
                  </Button>
                  <div className="flex-1" />
                  <Button onClick={save} disabled={saving} className="gap-1.5">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save changes
                  </Button>
                </div>

                {/* Tiers */}
                {current.tiers.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-muted-foreground mb-4">No pricing tiers yet for this service.</p>
                      <Button onClick={addTier} variant="outline" className="gap-1.5">
                        <Plus className="h-4 w-4" /> Add first tier
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {current.tiers.map((tier, i) => (
                      <Card key={tier.id} className={tier.highlighted ? "border-primary" : ""}>
                        <CardHeader className="flex flex-row items-center justify-between gap-2 py-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">#{i + 1}</Badge>
                            <CardTitle className="text-base">{tier.name || "Untitled tier"}</CardTitle>
                            {tier.highlighted && (
                              <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/15">
                                <Star className="h-3 w-3" /> Featured
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" onClick={() => moveTier(i, -1)} disabled={i === 0}>
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => moveTier(i, 1)}
                              disabled={i === current.tiers.length - 1}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => removeTier(i)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-0">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Tier name</Label>
                              <Input
                                value={tier.name}
                                onChange={(e) => updateTier(i, { name: e.target.value })}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Period</Label>
                              {(() => {
                                const RECURRING = ["/week", "/month", "/quarter", "/year"];
                                const ONE_TIME = [
                                  "one-time",
                                  "per project",
                                  "/hour",
                                  "one-time + 30-day support",
                                  "one-time + 90-day care",
                                  "+ state fee",
                                  "+ yearly compliance",
                                ];
                                const ALL = [...RECURRING, ...ONE_TIME];
                                const current = tier.period || "";
                                const isCustom = current !== "" && !ALL.includes(current);
                                const selectValue = current === "" ? "" : isCustom ? "__custom__" : current;
                                const isRecurring = RECURRING.includes(current);
                                return (
                                  <div className="space-y-2 mt-1">
                                    <Select
                                      value={selectValue}
                                      onValueChange={(v) => {
                                        if (v === "__custom__") {
                                          updateTier(i, { period: isCustom ? current : "" });
                                        } else {
                                          updateTier(i, { period: v });
                                        }
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select period" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
                                          Recurring · auto-billed
                                        </div>
                                        {RECURRING.map((p) => (
                                          <SelectItem key={p} value={p}>{p}</SelectItem>
                                        ))}
                                        <div className="px-2 py-1.5 mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-t border-border">
                                          One-time
                                        </div>
                                        {ONE_TIME.map((p) => (
                                          <SelectItem key={p} value={p}>{p}</SelectItem>
                                        ))}
                                        <SelectItem value="__custom__">Custom…</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    {(isCustom || selectValue === "__custom__") && (
                                      <Input
                                        value={current}
                                        onChange={(e) => updateTier(i, { period: e.target.value })}
                                        placeholder="Custom period label"
                                      />
                                    )}
                                    {isRecurring && (
                                      <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        Auto recurring order — a subscription will be created and billed every {current.replace("/", "")}.
                                      </p>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>


                          <div>
                            <Label className="text-xs">Short description</Label>
                            <Input
                              value={tier.description || ""}
                              onChange={(e) => updateTier(i, { description: e.target.value })}
                              className="mt-1"
                              placeholder="One-line value statement"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">CTA type</Label>
                              <Select
                                value={tier.cta_type}
                                onValueChange={(v: "fixed" | "quote") =>
                                  updateTier(i, {
                                    cta_type: v,
                                    price_usd: v === "quote" ? null : (tier.price_usd ?? 99),
                                  })
                                }
                              >
                                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="fixed">Fixed price (buy)</SelectItem>
                                  <SelectItem value="quote">Custom quote</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Price (USD)</Label>
                              <Input
                                type="number"
                                disabled={tier.cta_type === "quote"}
                                value={tier.price_usd ?? ""}
                                onChange={(e) =>
                                  updateTier(i, {
                                    price_usd: e.target.value === "" ? null : Number(e.target.value),
                                  })
                                }
                                className="mt-1"
                              />
                              <p className="text-[11px] text-muted-foreground mt-1">
                                Other currencies are auto-converted dynamically.
                              </p>
                            </div>
                          </div>

                          <div>
                            <Label className="text-xs">Button label</Label>
                            <Input
                              value={tier.cta_label || ""}
                              onChange={(e) => updateTier(i, { cta_label: e.target.value })}
                              className="mt-1"
                              placeholder={tier.cta_type === "quote" ? "Get Custom Quote" : "Choose plan"}
                            />
                          </div>

                          <div>
                            <Label className="text-xs">Features (one per line)</Label>
                            <Textarea
                              rows={5}
                              value={tier.features.join("\n")}
                              onChange={(e) =>
                                updateTier(i, {
                                  features: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                                })
                              }
                              className="mt-1 font-mono text-xs"
                              placeholder={"Feature one\nFeature two\nFeature three"}
                            />
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {tier.features.length} feature{tier.features.length === 1 ? "" : "s"}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <Switch
                              checked={!!tier.highlighted}
                              onCheckedChange={(v) => {
                                // Only one highlighted tier at a time
                                const next = current.tiers.map((t, k) => ({
                                  ...t,
                                  highlighted: k === i ? v : false,
                                }));
                                update({ tiers: next });
                              }}
                            />
                            <Label className="text-sm">Mark as featured / most popular</Label>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Quote settings */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">Quote request settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={current.quote_settings.enable_contact}
                          onCheckedChange={(v) =>
                            update({ quote_settings: { ...current.quote_settings, enable_contact: v } })
                          }
                        />
                        <Label className="text-sm">Contact form link</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={current.quote_settings.enable_modal}
                          onCheckedChange={(v) =>
                            update({ quote_settings: { ...current.quote_settings, enable_modal: v } })
                          }
                        />
                        <Label className="text-sm">Quote modal</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={current.quote_settings.enable_whatsapp}
                          onCheckedChange={(v) =>
                            update({ quote_settings: { ...current.quote_settings, enable_whatsapp: v } })
                          }
                        />
                        <Label className="text-sm">WhatsApp button</Label>
                      </div>
                    </div>
                    {current.quote_settings.enable_whatsapp && (
                      <div>
                        <Label className="text-xs">WhatsApp number (with country code)</Label>
                        <Input
                          value={current.quote_settings.whatsapp_number}
                          onChange={(e) =>
                            update({
                              quote_settings: { ...current.quote_settings, whatsapp_number: e.target.value },
                            })
                          }
                          className="mt-1"
                          placeholder="+8801XXXXXXXXX"
                        />
                      </div>
                    )}
                    <div>
                      <Label className="text-xs">Quote prompt message</Label>
                      <Textarea
                        rows={2}
                        value={current.quote_settings.quote_message}
                        onChange={(e) =>
                          update({
                            quote_settings: { ...current.quote_settings, quote_message: e.target.value },
                          })
                        }
                        className="mt-1"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Add-ons (dynamic per service) */}
                <AddonsManager
                  serviceSlug={current.service_slug}
                  serviceTitle={current.service_title}
                />


                {/* Sticky save bar */}
                <div className="sticky bottom-4 z-10">
                  <Card className="shadow-lg border-primary/20">
                    <CardContent className="p-3 flex items-center justify-between gap-3">
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        Editing <strong className="text-foreground">{current.service_title}</strong> —{" "}
                        {current.tiers.length} tier{current.tiers.length === 1 ? "" : "s"}
                      </div>
                      <Button onClick={save} disabled={saving} className="gap-1.5">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
}

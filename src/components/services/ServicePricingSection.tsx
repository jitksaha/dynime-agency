import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import useEmblaCarousel from "embla-carousel-react";
import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { ArrowRight, ArrowLeft, CheckCircle2, MessageCircle, Sparkles, Mail, Eye, Copy, Info, X, ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react";
import CurrencySwitcher from "@/components/shared/CurrencySwitcher";
import { Checkbox } from "@/components/ui/checkbox";
import { useCart } from "@/hooks/use-cart";
import { useExchangeRates } from "@/hooks/use-exchange-rates";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { STATES, type StateRecord } from "@/data/usa-formation";
import { useUsaStatePricing } from "@/hooks/use-usa-state-pricing";
import {
  convertFromUsd,
  detectCurrencyInfo,
  detectDefaultCurrency,
  formatCurrency,
  getCurrencyMeta,
  persistCurrency,
  resolveBaseUsd,
  type CurrencyCode,
  type CurrencyDetectionInfo,
} from "@/lib/currency";
import { SERVICE_PRICING_PACKS } from "@/data/service-pricing-packs";
import ServiceAddonsSection from "@/components/services/ServiceAddonsSection";
import { useLocation as useGeoLocationContext } from "@/contexts/LocationContext";

/** @deprecated kept for backward compat — use CurrencyCode from lib/currency */
export type Currency = CurrencyCode;

export interface PricingTier {
  id: string;
  name: string;
  description?: string;
  price_usd: number | null;
  price_bdt: number | null;
  period?: string;
  features: string[];
  highlighted?: boolean;
  cta_type: "fixed" | "quote";
  cta_label?: string;
}

export interface QuoteSettings {
  enable_contact: boolean;
  enable_modal: boolean;
  enable_whatsapp: boolean;
  whatsapp_number: string;
  quote_message: string;
}

interface ServicePricingRow {
  service_slug: string;
  service_title: string;
  is_enabled: boolean;
  tiers: PricingTier[];
  quote_settings: QuoteSettings;
}

/**
 * Format a tier's stored price (USD or BDT) into the visitor's currency,
 * converting from USD-base when needed. Returns null if no price is set.
 */
const formatTierPrice = (
  priceUsd: number | null | undefined,
  priceBdt: number | null | undefined,
  currency: CurrencyCode,
  rates: Record<string, number>,
): { display: string; isConverted: boolean; baseUsd: number } | null => {
  const baseUsd = resolveBaseUsd(priceUsd, priceBdt, rates);
  if (baseUsd === null) return null;
  const converted = convertFromUsd(baseUsd, currency, rates);
  const meta = getCurrencyMeta(currency);
  const isConverted = !meta.native;
  return {
    display: formatCurrency(converted, currency),
    isConverted,
    baseUsd,
  };
};

/**
 * Build a sensible default 3-tier pricing structure from a service's features.
 * Tier 1 (Starter): basic price showcase, ~half features
 * Tier 2 (Professional): highlighted, full features
 * Tier 3 (Enterprise): custom quote, all features + dedicated support
 */
const buildDefaultTiers = (
  serviceTitle: string,
  serviceFeatures: string[] = [],
  serviceSlug?: string,
): PricingTier[] => {
  // ── Per-service hand-crafted packs (5 tiers each, with Custom Quote) ──
  if (serviceSlug && SERVICE_PRICING_PACKS[serviceSlug]) {
    return SERVICE_PRICING_PACKS[serviceSlug]();
  }
  // ── UK Company Formation — preset packages ──
  if (serviceSlug === "uk-company") {
    return [
      {
        id: "uk-starter",
        name: "Starter",
        description: "Best for individuals, freelancers, early-stage founders",
        price_usd: 299,
        price_bdt: 29900,
        period: "+ yearly compliance",
        features: [
          "Incorporation of Your Company",
          "UK Registered Office Address for One Year",
          "Directors Service Address for All Directors for 1 Year",
          "PSC Register with Companies House",
          "Soft Copy of Certificate of Incorporation",
          "Web Authentication Code to Update Companies House Records",
          "UTR Number",
          "UK Wise Business Account",
          "Basic Tax Consultation",
        ],
        highlighted: false,
        cta_type: "fixed",
        cta_label: "Start with Starter",
      },
      {
        id: "uk-pro",
        name: "Professional",
        description: "Best for serious startups, international founders, scaling businesses",
        price_usd: 449,
        price_bdt: 44900,
        period: "+ yearly compliance",
        features: [
          "Incorporation of Your Company",
          "UK Registered Office Address for One Year",
          "Directors Service Address for All Directors for 1 Year",
          "Annual Compliance with Companies House",
          "PSC Register with Companies House",
          "Soft Copy of Certificate of Incorporation",
          "Web Authentication Code to Update Companies House Records",
          "UTR Number",
          "UK Wise / Airwallex Business Account",
          "Guidance to Business Stripe Account with Expert Hand",
          "Basic Tax Consultation",
        ],
        highlighted: true,
        cta_type: "fixed",
        cta_label: "Most Popular",
      },
      {
        id: "uk-premium",
        name: "Premium",
        description: "For growing businesses needing accounting, VAT & ongoing compliance",
        price_usd: 799,
        price_bdt: 79900,
        period: "+ yearly compliance",
        features: [
          "Incorporation of Your Company",
          "UK Registered Office Address for One Year",
          "Directors Service Address for All Directors for 1 Year",
          "Annual Compliance with Companies House",
          "PSC Register with Companies House",
          "Soft Copy of Certificate of Incorporation",
          "Web Authentication Code to Update Companies House Records",
          "UTR Number",
          "UK Wise / Airwallex Business Account",
          "Guidance to Business Stripe Account with Expert Hand",
          "Guidance to Business PayPal Account with Expert Hand",
          "Premium Business Consultation For UK",
          "Basic Tax Consultation",
        ],
        highlighted: false,
        cta_type: "fixed",
        cta_label: "Go Premium",
      },
      {
        id: "uk-custom",
        name: "Enterprise / Custom",
        description: "Multi-director, holding structures, regulated industries",
        price_usd: null,
        price_bdt: null,
        period: "",
        features: [
          "Everything in Premium",
          "Custom share structures & multi-class shares",
          "Holding company / group structuring",
          "Cross-border tax structuring guidance",
          "Dedicated account manager",
        ],
        highlighted: false,
        cta_type: "quote",
        cta_label: "Get Custom Quote",
      },
    ];
  }

  // ── US Company Formation — preset packages ──
  if (serviceSlug === "us-company") {
    return [
      {
        id: "us-starter",
        name: "Starter",
        description: "Best for low-cost entry, testing business ideas",
        price_usd: 199,
        price_bdt: 19900,
        period: "+ state fee",
        features: [
          "Incorporation of Your US Company",
          "Guidance on Annual Compliance for State Renewal",
          "Registered Agent for One Year",
          "Business Address for One Year",
          "Mail Forwarding for One Year",
          "Employer Identification Number (EIN)",
          "Expert Guidance on Managing Your Financial Accounts",
          "Basic Tax Consultation",
        ],
        highlighted: false,
        cta_type: "fixed",
        cta_label: "Start with Starter",
      },
      {
        id: "us-pro",
        name: "Professional",
        description: "Best for SaaS founders, international businesses, scaling startups",
        price_usd: 349,
        price_bdt: 34900,
        period: "+ state fee",
        features: [
          "Incorporation of Your US Company",
          "Guidance on Annual Compliance with the State Renewal",
          "Registered Agent for One Year",
          "Business Address for One Year",
          "Mail Forwarding for One Year",
          "Employer Identification Number (EIN)",
          "Expert Guidance on Managing Your Financial Accounts",
          "Bank Account Application Process",
          "Business Bank Account – (Fintech)",
          "Business Stripe Account with Expert Hand",
          "Business Debit Card",
          "BOI Filing",
          "Basic Tax Consultation",
        ],
        highlighted: true,
        cta_type: "fixed",
        cta_label: "Most Popular",
      },
      {
        id: "us-premium",
        name: "Premium",
        description: "For founders needing ITIN, bookkeeping & full compliance",
        price_usd: 749,
        price_bdt: 74900,
        period: "+ state fee",
        features: [
          "Incorporation of Your US Company",
          "Guidance on Annual Compliance with the State Renewal",
          "Registered Agent for One Year",
          "Business Address for One Year",
          "Mail Forwarding for One Year",
          "Employer Identification Number (EIN)",
          "Business Bank Account (Fintech)",
          "Business Debit Card",
          "Bank Account Application Process",
          "Expert Guidance on Managing Your Financial Accounts",
          "ITIN (Individual Taxpayer Identification Number)",
          "Business Stripe Account with Expert Hand",
          "Business PayPal Account with Expert Hand",
          "Premium Business Consultation",
          "BOI Filing",
          "Basic Tax Consultation",
        ],
        highlighted: false,
        cta_type: "fixed",
        cta_label: "Go Premium",
      },
      {
        id: "us-custom",
        name: "Enterprise / Custom",
        description: "C-Corp, multi-state, investor-ready structures",
        price_usd: null,
        price_bdt: null,
        period: "",
        features: [
          "Everything in Premium",
          "Delaware C-Corp for fundraising",
          "Multi-state registrations & nexus planning",
          "Cap table & investor-ready docs",
          "Dedicated account manager",
        ],
        highlighted: false,
        cta_type: "quote",
        cta_label: "Get Custom Quote",
      },
    ];
  }

  // Generic preset: 6 tiers (Starter → Custom Quote) built from the service's
  // own features, so every service page ships with a rich pricing slider.
  const baseFeatures = serviceFeatures.length > 0
    ? serviceFeatures
    : [
        "Custom solution tailored to your goals",
        "Dedicated project manager",
        "Quality assurance & testing",
        "On-time delivery",
        "Free revisions",
        "Post-launch support",
      ];

  const total = baseFeatures.length;
  const sliceUpTo = (count: number) =>
    baseFeatures.slice(0, Math.min(total, Math.max(2, count)));
  const lower = serviceTitle.toLowerCase();

  return [
    {
      id: "tier-starter",
      name: "Starter",
      description: `Entry-level ${lower} for small projects and quick wins`,
      price_usd: 199,
      price_bdt: 19900,
      period: "one-time",
      features: [
        ...sliceUpTo(Math.ceil(total * 0.35)),
        "Email support",
        "1 round of revisions",
        "Standard delivery timeline",
      ],
      highlighted: false,
      cta_type: "fixed",
      cta_label: "Start Small",
    },
    {
      id: "tier-basic",
      name: "Basic",
      description: `Solid foundation for growing brands needing more from ${lower}`,
      price_usd: 399,
      price_bdt: 39900,
      period: "one-time",
      features: [
        ...sliceUpTo(Math.ceil(total * 0.55)),
        "Priority email support",
        "2 rounds of revisions",
        "Faster turnaround",
      ],
      highlighted: false,
      cta_type: "fixed",
      cta_label: "Choose Basic",
    },
    {
      id: "tier-pro",
      name: "Professional",
      description: `Best value — full ${lower} package for serious businesses`,
      price_usd: 799,
      price_bdt: 79900,
      period: "one-time",
      features: [
        ...sliceUpTo(Math.ceil(total * 0.8)),
        "Priority chat & email support",
        "3 rounds of revisions",
        "30-day post-launch support",
        "Performance & SEO tuning",
      ],
      highlighted: true,
      cta_type: "fixed",
      cta_label: "Most Popular",
    },
    {
      id: "tier-premium",
      name: "Premium",
      description: `Advanced ${lower} with full feature scope and ongoing care`,
      price_usd: 1499,
      price_bdt: 149900,
      period: "one-time + 90-day care",
      features: [
        ...baseFeatures,
        "Dedicated project manager",
        "Unlimited revisions for 30 days",
        "90-day post-launch care",
        "Advanced analytics & reporting setup",
      ],
      highlighted: false,
      cta_type: "fixed",
      cta_label: "Go Premium",
    },
    {
      id: "tier-enterprise",
      name: "Enterprise",
      description: `Scalable ${lower} for high-traffic & multi-team operations`,
      price_usd: 2999,
      price_bdt: 299900,
      period: "one-time + SLA",
      features: [
        ...baseFeatures,
        "Dedicated account manager",
        "SLA-backed support (24×5)",
        "Custom integrations & APIs",
        "Quarterly strategy reviews",
        "Onboarding & team training",
      ],
      highlighted: false,
      cta_type: "fixed",
      cta_label: "Scale Up",
    },
    {
      id: "tier-custom",
      name: "Custom Quote",
      description: "Bespoke scope, complex requirements, or multi-service bundles",
      price_usd: null,
      price_bdt: null,
      period: "",
      features: [
        "Everything in Enterprise",
        "Fully tailored scope & deliverables",
        "Custom timeline & milestones",
        "Dedicated multi-disciplinary team",
        "Long-term partnership pricing",
        "NDAs & compliance support",
      ],
      highlighted: false,
      cta_type: "quote",
      cta_label: "Get Custom Quote",
    },
  ];
};

// ── Add-ons / upsell items shown beneath pricing tiers ──
interface AddOnItem {
  id: string;
  name: string;
  price: string;       // display price (may be a range)
  priceUsd?: number;   // numeric price used when adding to cart (omit if range/varies)
  desc?: string;
  highlight?: boolean;
}
const ADDONS_BY_SLUG: Record<string, { title: string; items: AddOnItem[] }> = {
  "uk-company": {
    title: "Optional UK Add-ons",
    items: [
      { id: "uk-addr-basic", name: "UK Registered Office — Basic", price: "$49/yr", priceUsd: 49, desc: "Companies House registered office + statutory mail handling." },
      { id: "uk-addr-pro", name: "UK Business Address — Pro", price: "$99/yr", priceUsd: 99, desc: "Registered office + director service address + worldwide mail forwarding." },
      { id: "uk-vat-resident", name: "VAT Registration (Resident)", price: "$90", priceUsd: 90, desc: "If not included in your package" },
      { id: "uk-vat-nonresident", name: "VAT Registration (Non-resident)", price: "$150", priceUsd: 150, desc: "Non-UK resident founders" },
      { id: "uk-accounting", name: "Accounting & Annual Filing", price: "$150 – $800/yr", desc: "Bookkeeping + statutory accounts (custom quote)" },
      { id: "uk-virtual-office", name: "Virtual Office Upgrade", price: "$50 – $200/yr", desc: "Mail handling, meeting rooms, phone (custom quote)" },
    ],
  },
  "us-company": {
    title: "Optional US Add-ons",
    items: [
      { id: "us-addr-basic", name: "US Business Address — Basic", price: "$79/yr", priceUsd: 79, desc: "Real US street address + mail scanning (up to 25 items/yr)." },
      { id: "us-addr-pro", name: "US Business Address — Pro", price: "$149/yr", priceUsd: 149, desc: "Unlimited mail scanning + worldwide forwarding." },
      {
        id: "us-itin-standard",
        name: "ITIN Application — Standard",
        price: "$350",
        priceUsd: 350,
        desc: "Document review & CAA verification (no passport mailing) · Complete W-7 prep · Submission within 5–7 business days · No hidden fees",
      },
      {
        id: "us-itin-priority",
        name: "ITIN Application — Priority",
        price: "$450",
        priceUsd: 450,
        desc: "Everything in Standard · Fast-track prep (2–3 business days) · 100% Money-Back Guarantee · Priority handling · FedEx tracking · Step-by-step updates",
        highlight: true,
      },
      { id: "us-bookkeeping", name: "Bookkeeping", price: "$100 – $300/mo", desc: "Monthly books, P&L, reconciliations (custom quote)" },
      { id: "us-state-filing", name: "State Annual Filing", price: "Varies by state", desc: "Annual reports, franchise tax, registered agent renewals (custom quote)" },
    ],
  },
};

// Address-only IDs sourced from each country's addon list — used by the
// virtual-address page so the same items stay in sync across all three pages.
const ADDRESS_ADDON_IDS = new Set([
  "uk-addr-basic",
  "uk-addr-pro",
  "us-addr-basic",
  "us-addr-pro",
]);

/** Build PricingTier cards from the address add-ons of a country. */
const buildAddressTiers = (country: "uk" | "us"): PricingTier[] => {
  const sourceSlug = country === "uk" ? "uk-company" : "us-company";
  const items = ADDONS_BY_SLUG[sourceSlug]?.items.filter((i) => ADDRESS_ADDON_IDS.has(i.id)) ?? [];
  return items.map((it, idx) => ({
    id: `va-${it.id}`,
    name: it.name.replace(/^US |^UK /, "").replace(" — Basic", " (Basic)").replace(" — Pro", " (Pro)"),
    description: it.desc,
    price_usd: it.priceUsd ?? null,
    price_bdt: null,
    period: "/yr",
    features:
      it.id.endsWith("addr-basic")
        ? [
            country === "uk"
              ? "Companies House registered office address"
              : "Real US street address (no PO Box)",
            "Statutory & official mail handling",
            "Director / home address privacy",
            "Online dashboard access",
          ]
        : [
            country === "uk"
              ? "Registered office + director service address"
              : "Premium US street address",
            country === "uk"
              ? "Worldwide mail forwarding"
              : "Unlimited mail scanning + worldwide forwarding",
            country === "us" ? "Worldwide mail forwarding" : "Priority statutory mail handling",
            "Director / home address privacy",
            "Online dashboard access",
          ],
    highlighted: idx === 1,
    cta_type: "fixed",
    cta_label: idx === 1 ? "Most Popular" : "Add to Cart",
  }));
};

const buildPrefillMessage = (serviceTitle: string, tierName?: string) => {
  const base = `Hi Dynime team,\n\nI'm interested in your ${serviceTitle} service`;
  const tier = tierName ? ` — specifically the ${tierName} tier` : "";
  return `${base}${tier}.\n\nCould you please share more details and a tailored quote?\n\nThanks!`;
};

const buildContactLink = (serviceSlug: string, serviceTitle: string, tierName?: string) => {
  const subject = tierName
    ? `Quote request: ${serviceTitle} — ${tierName}`
    : `Quote request: ${serviceTitle}`;
  const message = buildPrefillMessage(serviceTitle, tierName);
  const params = new URLSearchParams({
    service: serviceTitle,
    subject,
    message,
  });
  return `/contact?${params.toString()}#contact-form`;
};

const ServicePricingSection = ({
  serviceSlug,
  serviceTitle,
  serviceFeatures = [],
}: {
  serviceSlug: string;
  serviceTitle: string;
  serviceFeatures?: string[];
}) => {
  const { toast } = useToast();
  const { rates, isLoading: ratesLoading, isFetching: ratesFetching } = useExchangeRates();
  const { currency: ctxCurrency, isGeoLoading, currencyAuto } = useGeoLocationContext();
  const [currency, setCurrency] = useState<CurrencyCode>(() => detectDefaultCurrency(serviceSlug));
  // Show a skeleton while we're still resolving the right currency or fetching
  // first-ever FX rates, so visitors don't briefly see a wrong-currency number.
  const pricesLoading = ratesLoading || (isGeoLoading && currencyAuto);
  const pricesRefreshing = ratesFetching && !ratesLoading;
  const [detection, setDetection] = useState<CurrencyDetectionInfo>(() => detectCurrencyInfo(serviceSlug));
  const [unsupportedDismissed, setUnsupportedDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("currency_unsupported_dismissed") === "1";
  });

  // Re-resolve when navigating between service pages so each slug restores its own choice.
  // A per-service scoped override wins; otherwise use the live ctxCurrency (geo or footer).
  useEffect(() => {
    const info = detectCurrencyInfo(serviceSlug);
    setDetection(info);
    setCurrency(info.source === "scoped" ? info.code : ctxCurrency);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceSlug]);

  // Sync from global LocationContext (geo auto-detect + footer switcher).
  // A manual global override (footer switcher → currencyAuto=false) ALWAYS wins
  // and clears any stale per-service scoped key so every pricing page stays in sync.
  // Auto/geo updates yield to a per-service scoped override when present.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const scopedKey = `preferred_currency:${serviceSlug}`;
    if (!currencyAuto) {
      // User picked a currency in the footer → force-sync and drop scoped override.
      try { window.localStorage.removeItem(scopedKey); } catch { /* ignore */ }
      setCurrency(ctxCurrency);
      setDetection({ code: ctxCurrency, source: "global" });
      return;
    }
    const scoped = window.localStorage.getItem(scopedKey);
    if (scoped) return; // per-service override wins over geo auto-detect
    setCurrency(ctxCurrency);
  }, [ctxCurrency, currencyAuto, serviceSlug]);

  // Listen for cross-tab / external currencychange events (footer switcher fires one).
  // Guarantees instant sync even if ctxCurrency hasn't propagated yet.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onCurrency = (e: Event) => {
      const detail = (e as CustomEvent).detail as { code?: CurrencyCode; source?: string; scope?: string } | undefined;
      if (!detail?.code) return;
      if (detail.source === "user") {
        try { window.localStorage.removeItem(`preferred_currency:${serviceSlug}`); } catch { /* ignore */ }
        setCurrency(detail.code);
        setDetection({ code: detail.code, source: "global" });
      } else if (detail.source === "geo") {
        const scoped = window.localStorage.getItem(`preferred_currency:${serviceSlug}`);
        if (!scoped) {
          setCurrency(detail.code);
          setDetection({ code: detail.code, source: "global" });
        }
      }
    };
    window.addEventListener("currencychange", onCurrency);
    return () => window.removeEventListener("currencychange", onCurrency);
  }, [serviceSlug]);

  // Per-service currency overrides are STICKY and ISOLATED:
  //   • Stored only under `preferred_currency:<slug>` — never overwrites the
  //     global preference, so geo auto-detect keeps driving every other page.
  //   • Geo updates to ctxCurrency are skipped for this slug because the
  //     [ctxCurrency] effect above bails out when a scoped key exists.
  //   • A `currencychange` event is still dispatched so FX rates refetch.
  const handleCurrencyChange = (next: CurrencyCode) => {
    setCurrency(next);
    setDetection({ code: next, source: "scoped" });
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(`preferred_currency:${serviceSlug}`, next);
        window.dispatchEvent(
          new CustomEvent("currencychange", { detail: { code: next, source: "scoped", scope: serviceSlug } }),
        );
      } catch { /* ignore */ }
    }
    if (detection.source === "unsupported-region") {
      setUnsupportedDismissed(true);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("currency_unsupported_dismissed", "1");
      }
    }
  };

  const showUnsupportedNotice =
    detection.source === "unsupported-region" && !unsupportedDismissed;

  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["service-pricing", serviceSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_pricing")
        .select("service_slug, service_title, is_enabled, tiers, quote_settings")
        .eq("service_slug", serviceSlug)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as ServicePricingRow | null;
    },
  });

  // Realtime: admin pricing edits push to this service page instantly
  useEffect(() => {
    const channel = supabase
      .channel(`service-pricing-${serviceSlug}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_pricing", filter: `service_slug=eq.${serviceSlug}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["service-pricing", serviceSlug] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [serviceSlug, queryClient]);

  const [quoteOpen, setQuoteOpen] = useState(false);
  const [activeTierForQuote, setActiveTierForQuote] = useState<PricingTier | null>(null);
  const [quoteForm, setQuoteForm] = useState({ name: "", email: "", phone: "", budget: "", message: "" });
  const [submittingQuote, setSubmittingQuote] = useState(false);

  // Preview modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTier, setPreviewTier] = useState<PricingTier | null>(null);

  // US formation: per-state fee selector (only active for the us-company slug)
  const isUSFormation = serviceSlug === "us-company";
  const { data: dynamicStates } = useUsaStatePricing();
  const statesList: StateRecord[] = dynamicStates && dynamicStates.length > 0 ? dynamicStates : STATES;
  const [entityType, setEntityType] = useState<"llc" | "corp">("llc");
  const [stateAbbr, setStateAbbr] = useState<string>("WY");
  const selectedState: StateRecord | undefined = useMemo(
    () => statesList.find((s) => s.abbr === stateAbbr),
    [stateAbbr, statesList],
  );
  const stateFeeUsd = selectedState
    ? entityType === "llc"
      ? selectedState.llcFormation
      : selectedState.corpFormation
    : 0;
  const stateAnnualUsd = selectedState
    ? entityType === "llc"
      ? selectedState.llcAnnual
      : selectedState.corpAnnual
    : 0;
  const stateAnnualLabel = selectedState
    ? entityType === "llc"
      ? selectedState.llcAnnualLabel
      : selectedState.corpAnnualLabel
    : "";
  const stateFeeLabel = selectedState
    ? entityType === "llc"
      ? `${selectedState.state} LLC: $${selectedState.llcFormation} filing (year 1) · ${stateAnnualLabel}/yr from year 2`
      : `${selectedState.state} Corp: $${selectedState.corpFormation} filing (year 1) · ${stateAnnualLabel}/yr from year 2`
    : "";


  // Virtual address: tabbed UK/US picker — tiers built from address add-ons
  // so any pricing change in ADDONS_BY_SLUG flows to all three pages.
  const isVirtualAddress = serviceSlug === "virtual-address";
  const [vaCountry, setVaCountry] = useState<"uk" | "us">("us");

  // Resolve tiers: DB (if enabled) → virtual-address synced tiers → default 3-tier
  const adminTiers = data?.tiers ?? [];
  const useDbConfig = !!(data?.is_enabled && adminTiers.length > 0);
  const tiers: PricingTier[] = useDbConfig
    ? adminTiers
    : isVirtualAddress
    ? buildAddressTiers(vaCountry)
    : buildDefaultTiers(serviceTitle, serviceFeatures, serviceSlug);

  const addons = ADDONS_BY_SLUG[serviceSlug];
  const { addItem } = useCart();
  const [selectedAddons, setSelectedAddons] = useState<Record<string, boolean>>({});
  const toggleAddon = (id: string) => setSelectedAddons((p) => ({ ...p, [id]: !p[id] }));

  const handleAddTierToCart = (t: PricingTier, baseUsd: number) => {
    addItem({ id: `${serviceSlug}-${t.id}`, name: `${serviceTitle} — ${t.name}`, price: baseUsd, slug: serviceSlug, period: t.period }, { silent: true });
    if (isUSFormation && selectedState && stateFeeUsd > 0) {
      addItem({
        id: `${serviceSlug}-statefee-${selectedState.abbr}-${entityType}`,
        name: `${selectedState.state} ${entityType.toUpperCase()} state filing fee (year 1)`,
        price: stateFeeUsd,
        slug: serviceSlug,
      }, { silent: true });
    }
    if (addons) {
      addons.items.forEach((a) => {
        if (selectedAddons[a.id] && typeof a.priceUsd === "number") {
          addItem({ id: `${serviceSlug}-addon-${a.id}`, name: a.name, price: a.priceUsd, slug: serviceSlug }, { silent: true });
        }
      });
    }
    // Send the buyer straight to multi-step checkout — no toast, no delay
    window.location.href = "/checkout";
  };

  const settings: QuoteSettings = data?.quote_settings ?? {
    enable_contact: true,
    enable_modal: true,
    enable_whatsapp: false,
    whatsapp_number: "",
    quote_message: `Hi, I would like a custom quote for ${serviceTitle}.`,
  };

  const whatsappLink = useMemo(() => {
    const num = (settings.whatsapp_number || "").replace(/\D/g, "");
    if (!num) return null;
    const msg = (settings.quote_message || "").replace(/\{service\}/g, serviceTitle);
    return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
  }, [settings.whatsapp_number, settings.quote_message, serviceTitle]);

  const openPreview = (tier: PricingTier) => {
    setPreviewTier(tier);
    setPreviewOpen(true);
  };

  const openQuoteModal = (tier: PricingTier | null) => {
    setActiveTierForQuote(tier);
    setQuoteForm((prev) => ({
      ...prev,
      message: buildPrefillMessage(serviceTitle, tier?.name),
    }));
    setQuoteOpen(true);
  };

  const submitQuote = async () => {
    if (!quoteForm.name || !quoteForm.email) {
      toast({ title: "Name and email required", variant: "destructive" });
      return;
    }
    setSubmittingQuote(true);
    try {
      const { data: tmpl } = await supabase
        .from("form_templates")
        .select("id")
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!tmpl) {
        toast({
          title: "Quote system not configured",
          description: "No active form template exists. Use contact form instead.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("form_submissions").insert({
        form_id: tmpl.id,
        data: {
          type: "service_quote",
          service_slug: serviceSlug,
          service_title: serviceTitle,
          tier_name: activeTierForQuote?.name ?? null,
          ...quoteForm,
        },
      });
      if (error) throw error;
      toast({ title: "Quote request sent!", description: "We'll get back to you within 24 hours." });
      setQuoteOpen(false);
      setQuoteForm({ name: "", email: "", phone: "", budget: "", message: "" });
    } catch (e: any) {
      toast({ title: "Could not send quote", description: e.message, variant: "destructive" });
    } finally {
      setSubmittingQuote(false);
    }
  };

  // ── Slider mode (when more than 3 tiers) ──
  const isSlider = tiers.length > 3;
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      align: "start",
      loop: false,
      containScroll: "trimSnaps",
      // Free-drag with snap-on-release gives a natural flick/momentum feel
      // on both touch and mouse — the carriage glides, then snaps to the
      // nearest slide instead of stopping abruptly at a fixed step.
      dragFree: true,
      watchDrag: (api, evt) => {
        const e = evt as PointerEvent;
        if (e.pointerType === "mouse") return true;
        // Touch/pen: allow drag; vertical page scroll is preserved via
        // touch-action: pan-y on the viewport element.
        return true;
      },
      skipSnaps: false,
      // Slightly snappier glide so momentum decays naturally without feeling sluggish.
      duration: 22,
      // Require clear horizontal intent before hijacking the gesture.
      dragThreshold: 14,
      inViewThreshold: 0.6,
    },
    [WheelGesturesPlugin({ forceWheelAxis: "x" })],
  );

  // After a free-drag flick, snap to the nearest slide so the slider
  // always rests on a clean position (consistent feel across devices).
  useEffect(() => {
    if (!emblaApi) return;
    const snapToNearest = () => {
      const closest = emblaApi.scrollSnapList().reduce((bestIdx, snap, idx, arr) => {
        const progress = emblaApi.scrollProgress();
        return Math.abs(snap - progress) < Math.abs(arr[bestIdx] - progress) ? idx : bestIdx;
      }, 0);
      emblaApi.scrollTo(closest);
    };
    emblaApi.on("pointerUp", snapToNearest);
    return () => {
      emblaApi.off("pointerUp", snapToNearest);
    };
  }, [emblaApi]);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanPrev(emblaApi.canScrollPrev());
    setCanNext(emblaApi.canScrollNext());
  }, [emblaApi]);
  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className="py-6 md:py-8 bg-card/30 scroll-mt-24 focus:outline-none"
    >
      <div className="container-custom">
        <ScrollReveal>
          <div className="mb-4 flex flex-col md:flex-row md:items-end md:justify-between gap-3 md:gap-6">
            <div className="min-w-0 md:max-w-2xl">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-primary text-[10px] font-semibold uppercase tracking-[0.18em]">Pricing</span>
                <span className="h-px flex-1 bg-border/60" />
              </div>
              <h2 id="pricing-heading" className="font-heading text-xl md:text-2xl font-bold leading-tight">
                Choose the Right Plan for Your {serviceTitle}
              </h2>
              <p className="text-muted-foreground/80 text-[12.5px] leading-snug mt-1">
                Transparent pricing, no hidden fees — pick what fits your budget and goals.
              </p>
            </div>

            <div className="flex flex-col items-start md:items-end gap-1 flex-shrink-0">
              <CurrencySwitcher value={currency} onChange={handleCurrencyChange} />
              <p className="text-[10px] text-muted-foreground/70">
                Auto-detected · converted from USD
              </p>



              {showUnsupportedNotice && (
                <div
                  role="status"
                  className="relative max-w-md w-full text-left rounded-xl border border-primary/30 bg-primary/5 p-3 pr-8 flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1 duration-300"
                >
                  <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-foreground/90 leading-relaxed">
                    <p>
                      We don't have your local currency
                      {detection.detectedRegionName ? (
                        <> for <strong>{detection.detectedRegionName}</strong></>
                      ) : (
                        <> set up</>
                      )}{" "}
                      yet — showing prices in <strong>USD</strong> for now. Pick the closest match from the dropdown above and we'll remember it for next time.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUnsupportedDismissed(true);
                      if (typeof window !== "undefined") {
                        window.localStorage.setItem("currency_unsupported_dismissed", "1");
                      }
                    }}
                    aria-label="Dismiss notice"
                    className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {isUSFormation && (
              <div className="mt-6 max-w-2xl mx-auto rounded-xl border border-border bg-background/40 p-4 text-left">
                <p className="text-xs font-semibold text-foreground mb-3 text-center">
                  Add your state's official filing & annual fees
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Entity type</Label>
                    <Select value={entityType} onValueChange={(v) => setEntityType(v as "llc" | "corp")}>
                      <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="llc">LLC</SelectItem>
                        <SelectItem value="corp">C-Corporation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">State of formation</Label>
                    <Select value={stateAbbr} onValueChange={setStateAbbr}>
                      <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        {statesList.map((s) => (
                          <SelectItem key={s.abbr} value={s.abbr}>
                            {s.state} ({s.abbr})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {selectedState && (
                  <p className="text-[11px] text-muted-foreground/80 mt-3 text-center">
                    {stateFeeLabel} · paid directly to the state
                  </p>
                )}
              </div>
            )}

            {isVirtualAddress && (
              <div className="mt-6 max-w-md mx-auto">
                <Tabs value={vaCountry} onValueChange={(v) => setVaCountry(v as "uk" | "us")}>
                  <TabsList className="grid grid-cols-2 w-full">
                    <TabsTrigger value="us">🇺🇸 USA Address</TabsTrigger>
                    <TabsTrigger value="uk">🇬🇧 UK Address</TabsTrigger>
                  </TabsList>
                </Tabs>
                <p className="text-[11px] text-muted-foreground/70 mt-2 text-center">
                  Same plans &amp; pricing as the {vaCountry === "us" ? "US" : "UK"} formation add-ons — auto-synced.
                </p>
              </div>
            )}
          </div>
        </ScrollReveal>

        {(() => {
          const renderTierCard = (t: PricingTier, idx: number) => {
            const priceInfo = formatTierPrice(t.price_usd, t.price_bdt, currency, rates);
            const isQuote = t.cta_type === "quote" || priceInfo === null;
            const tierContactLink = buildContactLink(serviceSlug, serviceTitle, t.name);
            return (
              <div
                key={t.id || `${t.name}-${idx}`}
                className={`relative glass-card-hover p-6 h-full flex flex-col ${
                  t.highlighted
                    ? "border-primary/40 shadow-[0_0_40px_-12px_hsl(var(--primary)/0.35)]"
                    : ""
                }`}
              >
                {t.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-primary text-primary-foreground">
                    Most Popular
                  </span>
                )}
                <h3 className="font-heading text-xl font-bold text-foreground">{t.name}</h3>
                {t.description && (
                  <p className="text-xs text-muted-foreground mt-1.5 mb-4">{t.description}</p>
                )}
                <div className="my-4">
                  {isQuote ? (
                    <div>
                      <p className="font-heading text-3xl font-bold gradient-text">Custom</p>
                      <p className="text-xs text-muted-foreground mt-1">Tailored to your needs</p>
                      {isUSFormation && selectedState && (
                        <p className="text-[11px] text-muted-foreground/80 mt-2 pt-2 border-t border-border/60">
                          + {selectedState.abbr} filing fee (year 1):{" "}
                          <span className="text-foreground font-medium">
                            {formatCurrency(convertFromUsd(stateFeeUsd, currency, rates), currency)}
                          </span>
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        {pricesLoading ? (
                          <span
                            className="inline-block h-9 sm:h-10 w-28 rounded-md bg-muted/70 animate-pulse"
                            aria-label="Loading price"
                          />
                        ) : (
                          <span className="font-heading text-3xl sm:text-4xl font-bold text-foreground whitespace-nowrap leading-none tracking-tight">{priceInfo!.display}</span>
                        )}
                        {t.period && !pricesLoading && (
                          <span className="text-xs text-muted-foreground">{t.period}</span>
                        )}
                      </div>
                      {!pricesLoading && priceInfo!.isConverted && (
                        <p className="text-[10px] text-muted-foreground/70 mt-1 flex items-center gap-1.5">
                          ≈ converted from ${Math.round(priceInfo!.baseUsd).toLocaleString()} USD
                          {pricesRefreshing && (
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" aria-label="Updating rate" />
                          )}
                        </p>
                      )}
                      {pricesLoading && (
                        <p className="text-[10px] text-muted-foreground/70 mt-1">Detecting your currency…</p>
                      )}
                      {isUSFormation && selectedState && (() => {
                        const totalUsd = priceInfo!.baseUsd + stateFeeUsd;
                        const totalConverted = convertFromUsd(totalUsd, currency, rates);
                        return (
                          <div className="mt-2 pt-2 border-t border-border/60 space-y-0.5">
                            <p className="text-[11px] text-muted-foreground flex items-baseline justify-between gap-2">
                              <span>+ {selectedState.abbr} filing fee (year 1)</span>
                              <span className="font-medium text-foreground">
                                {formatCurrency(convertFromUsd(stateFeeUsd, currency, rates), currency)}
                              </span>
                            </p>
                            <p className="text-[11px] flex items-baseline justify-between gap-2 font-semibold">
                              <span className="text-foreground">Total est.</span>
                              <span className="text-primary">
                                {formatCurrency(totalConverted, currency)}
                              </span>
                            </p>
                            <p className="text-[10px] text-muted-foreground/70 leading-snug">
                              {entityType === "llc"
                                ? `${selectedState.state}: $${selectedState.llcFormation} filing (year 1) · ${selectedState.llcAnnualLabel}/yr from year 2`
                                : `${selectedState.state}: $${selectedState.corpFormation} filing (year 1) · ${selectedState.corpAnnualLabel}/yr from year 2`}
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
                {t.features?.length > 0 && (
                  <ul className="space-y-2 mb-6 flex-1">
                    {t.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {isQuote ? (
                  <QuoteActions
                    settings={settings}
                    onModalOpen={() => openQuoteModal(t)}
                    contactLink={tierContactLink}
                    whatsappLink={whatsappLink}
                    ctaLabel={t.cta_label}
                    highlighted={t.highlighted}
                    onPreview={() => openPreview(t)}
                  />
                ) : (() => {
                  const chosenAddons = addons
                    ? addons.items.filter((a) => selectedAddons[a.id] && typeof a.priceUsd === "number")
                    : [];
                  const addonsTotalUsd = chosenAddons.reduce((s, a) => s + (a.priceUsd || 0), 0);
                  const stateUsd = isUSFormation && selectedState ? stateFeeUsd : 0;
                  const grandUsd = priceInfo!.baseUsd + stateUsd + addonsTotalUsd;
                  const showBreakdown = chosenAddons.length > 0;
                  return (
                    <div className="space-y-2 mt-auto">
                      {showBreakdown && (
                        <div className="rounded-lg border border-border/60 bg-background/40 p-3 space-y-1">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                            Your invoice preview
                          </p>
                          <div className="text-[11px] flex items-baseline justify-between gap-2 text-muted-foreground">
                            <span>{t.name} package</span>
                            <span className="text-foreground">{formatCurrency(convertFromUsd(priceInfo!.baseUsd, currency, rates), currency)}</span>
                          </div>
                          {stateUsd > 0 && selectedState && (
                            <div className="text-[11px] flex items-baseline justify-between gap-2 text-muted-foreground">
                              <span>+ {selectedState.abbr} filing fee (year 1)</span>
                              <span className="text-foreground">{formatCurrency(convertFromUsd(stateUsd, currency, rates), currency)}</span>
                            </div>
                          )}
                          {chosenAddons.map((a) => (
                            <div key={a.id} className="text-[11px] flex items-baseline justify-between gap-2 text-muted-foreground">
                              <span>+ {a.name}</span>
                              <span className="text-foreground">{formatCurrency(convertFromUsd(a.priceUsd!, currency, rates), currency)}</span>
                            </div>
                          ))}
                          <div className="border-t border-border/60 pt-1 mt-1 text-[12px] flex items-baseline justify-between gap-2 font-semibold">
                            <span className="text-foreground">Total</span>
                            <span className="text-primary">{formatCurrency(convertFromUsd(grandUsd, currency, rates), currency)}</span>
                          </div>
                        </div>
                      )}
                      <Button
                        variant={t.highlighted ? "hero" : "glass"}
                        size="sm"
                        onClick={() => handleAddTierToCart(t, priceInfo!.baseUsd)}
                        className="w-full"
                      >
                        <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
                        {t.cta_label || "Add to Cart"}
                      </Button>
                    </div>
                  );
                })()}
              </div>
            );
          };

          if (isLoading) {
            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="glass-card p-6 h-64 animate-pulse" />
                ))}
              </div>
            );
          }

          if (!isSlider) {
            return (
              <div className={`grid grid-cols-1 md:grid-cols-${Math.min(tiers.length, 3)} gap-5 max-w-5xl mx-auto`}>
                {tiers.map((t, idx) => (
                  <ScrollReveal key={t.id || `${t.name}-${idx}`} delay={idx * 0.08} className="h-full">
                    {renderTierCard(t, idx)}
                  </ScrollReveal>
                ))}
              </div>
            );
          }

          // Slider mode (more than 3 tiers)
          return (
            <div className="max-w-6xl mx-auto">
              {/* Header row with arrows top-right */}
              <div className="flex items-center justify-between gap-4 mb-5 px-1">
                <p className="text-xs text-muted-foreground">
                  Showing {tiers.length} plans · drag, scroll, or use arrows to explore
                </p>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    aria-label="Previous plan"
                    aria-controls="pricing-slider-viewport"
                    onClick={() => emblaApi?.scrollPrev()}
                    disabled={!canPrev}
                    className="h-10 w-10 rounded-full border border-border bg-background/60 hover:bg-primary hover:text-primary-foreground hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next plan"
                    aria-controls="pricing-slider-viewport"
                    onClick={() => emblaApi?.scrollNext()}
                    disabled={!canNext}
                    className="h-10 w-10 rounded-full border border-border bg-background/60 hover:bg-primary hover:text-primary-foreground hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div
                id="pricing-slider-viewport"
                ref={emblaRef}
                role="region"
                aria-roledescription="carousel"
                aria-label={`${serviceTitle} pricing plans`}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "ArrowLeft") {
                    e.preventDefault();
                    emblaApi?.scrollPrev();
                  } else if (e.key === "ArrowRight") {
                    e.preventDefault();
                    emblaApi?.scrollNext();
                  } else if (e.key === "Home") {
                    e.preventDefault();
                    emblaApi?.scrollTo(0);
                  } else if (e.key === "End") {
                    e.preventDefault();
                    const last = (emblaApi?.scrollSnapList().length ?? 1) - 1;
                    emblaApi?.scrollTo(Math.max(0, last));
                  }
                }}
                className="overflow-hidden -mx-2 cursor-grab active:cursor-grabbing select-none [touch-action:pan-y_pinch-zoom] rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <div className="flex">
                  {tiers.map((t, idx) => (
                    <div
                      key={t.id || `${t.name}-${idx}`}
                      role="group"
                      aria-roledescription="slide"
                      aria-label={`${idx + 1} of ${tiers.length}: ${t.name}`}
                      // Peek of next slide: ~88% on mobile, ~46% on tablet (2 + peek), ~30% on desktop (3 + peek)
                      className="flex-[0_0_88%] sm:flex-[0_0_46%] lg:flex-[0_0_30%] min-w-0 px-2"
                    >
                      <div className="h-full pt-3">{renderTierCard(t, idx)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {addons && (
          <ScrollReveal>
            <div className="mt-12 max-w-5xl mx-auto">
              <div className="text-center mb-6">
                <span className="text-primary text-xs font-semibold uppercase tracking-wider">Upsell</span>
                <h3 className="font-heading text-2xl md:text-3xl font-bold mt-2">{addons.title}</h3>
                <p className="text-muted-foreground/80 text-sm mt-2">
                  Add only what you need — bolt-on services to extend your package.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {addons.items.map((a) => {
                  const isCheckable = typeof a.priceUsd === "number";
                  const checked = !!selectedAddons[a.id];
                  return (
                    <div
                      key={a.id}
                      className={`glass-card-hover p-5 flex flex-col ${
                        a.highlight ? "border-primary/40 shadow-[0_0_30px_-12px_hsl(var(--primary)/0.35)]" : ""
                      } ${checked ? "ring-2 ring-primary/50" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-start gap-2">
                          {isCheckable && (
                            <Checkbox
                              id={`addon-${a.id}`}
                              checked={checked}
                              onCheckedChange={() => toggleAddon(a.id)}
                              className="mt-1"
                            />
                          )}
                          <Label htmlFor={`addon-${a.id}`} className="font-heading text-base font-bold text-foreground cursor-pointer">
                            {a.name}
                          </Label>
                        </div>
                        <span className="text-primary font-bold text-sm whitespace-nowrap">{a.price}</span>
                      </div>
                      {a.desc && (
                        <p className="text-xs text-muted-foreground leading-relaxed">{a.desc}</p>
                      )}
                      {isCheckable ? (
                        <Button
                          variant={checked ? "hero" : "glass"}
                          size="sm"
                          className="mt-3 w-full"
                          onClick={() => {
                            addItem({ id: `${serviceSlug}-addon-${a.id}`, name: a.name, price: a.priceUsd!, slug: serviceSlug });
                            setSelectedAddons((p) => ({ ...p, [a.id]: true }));
                          }}
                        >
                          <ShoppingCart className="w-3.5 h-3.5 mr-1.5" /> Add to Cart
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" asChild className="mt-3 w-full text-xs">
                          <Link to={buildContactLink(serviceSlug, serviceTitle, a.name)}>
                            Request quote <ArrowRight className="w-3 h-3 ml-1" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-center text-[11px] text-muted-foreground/70 mt-4">
                Tip: tick add-ons before clicking "Add to Cart" on a package — they'll be bundled together. Or add them individually here.
              </p>
            </div>
          </ScrollReveal>
        )}

      </div>

      {/* Quote modal */}
      <Dialog open={quoteOpen} onOpenChange={setQuoteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request a Custom Quote</DialogTitle>
            <DialogDescription>
              Tell us about your project for <strong>{serviceTitle}</strong>
              {activeTierForQuote ? ` — ${activeTierForQuote.name} tier` : ""}. We'll respond within 24 hours.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="q-name" className="text-xs">Name *</Label>
              <Input id="q-name" value={quoteForm.name} onChange={(e) => setQuoteForm({ ...quoteForm, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="q-email" className="text-xs">Email *</Label>
              <Input id="q-email" type="email" value={quoteForm.email} onChange={(e) => setQuoteForm({ ...quoteForm, email: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="q-phone" className="text-xs">Phone</Label>
                <Input id="q-phone" value={quoteForm.phone} onChange={(e) => setQuoteForm({ ...quoteForm, phone: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="q-budget" className="text-xs">Budget</Label>
                <Input id="q-budget" placeholder="e.g. $500-1000" value={quoteForm.budget} onChange={(e) => setQuoteForm({ ...quoteForm, budget: e.target.value })} />
              </div>
            </div>
            <div>
              <Label htmlFor="q-msg" className="text-xs">Project details</Label>
              <Textarea id="q-msg" rows={5} value={quoteForm.message} onChange={(e) => setQuoteForm({ ...quoteForm, message: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setQuoteOpen(false)}>Cancel</Button>
            <Button variant="hero" onClick={submitQuote} disabled={submittingQuote}>
              {submittingQuote ? "Sending..." : "Send Quote Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview modal — shows EXACTLY what the prefilled contact form will contain */}
      <QuotePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        tier={previewTier}
        serviceTitle={serviceTitle}
        serviceSlug={serviceSlug}
      />

      {/* Optional service add-ons (DB-driven, managed via Admin → Pricing → Add-ons) */}
      <ServiceAddonsSection serviceSlug={serviceSlug} serviceTitle={serviceTitle} />
    </section>
  );
};

const QuoteActions = ({
  settings,
  onModalOpen,
  contactLink,
  whatsappLink,
  ctaLabel,
  highlighted,
  onPreview,
}: {
  settings: QuoteSettings;
  onModalOpen: () => void;
  contactLink: string;
  whatsappLink: string | null;
  ctaLabel?: string;
  highlighted?: boolean;
  onPreview?: () => void;
}) => {
  const variant = highlighted ? "hero" : "glass";
  const primary = settings.enable_modal
    ? { type: "modal" as const }
    : settings.enable_contact
    ? { type: "contact" as const }
    : settings.enable_whatsapp && whatsappLink
    ? { type: "whatsapp" as const }
    : { type: "contact" as const };

  return (
    <div className="flex flex-col gap-2 mt-auto">
      {primary.type === "modal" && (
        <Button variant={variant} size="sm" onClick={onModalOpen} className="w-full">
          <Mail className="w-3.5 h-3.5 mr-1.5" />
          {ctaLabel || "Request Quote"}
        </Button>
      )}
      {primary.type === "contact" && (
        <Button variant={variant} size="sm" asChild className="w-full">
          <Link to={contactLink}>
            {ctaLabel || "Get a Quote"}
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </Button>
      )}
      {primary.type === "whatsapp" && whatsappLink && (
        <Button variant={variant} size="sm" asChild className="w-full">
          <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
            {ctaLabel || "Chat on WhatsApp"}
          </a>
        </Button>
      )}

      <div className="flex items-center justify-center gap-3 text-[11px] text-muted-foreground">
        {primary.type !== "whatsapp" && settings.enable_whatsapp && whatsappLink && (
          <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors inline-flex items-center gap-1">
            <MessageCircle className="w-3 h-3" /> WhatsApp
          </a>
        )}
        {primary.type !== "modal" && settings.enable_modal && (
          <button onClick={onModalOpen} className="hover:text-primary transition-colors inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Quick form
          </button>
        )}
      </div>
    </div>
  );
};

/* ── Quote Preview Dialog ──
 * Shows the user EXACTLY what the contact form will contain before they
 * navigate to /contact. Loads the active form template fields and renders
 * a non-editable preview with the prefilled values.
 */
const QuotePreviewDialog = ({
  open,
  onOpenChange,
  tier,
  serviceTitle,
  serviceSlug,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tier: PricingTier | null;
  serviceTitle: string;
  serviceSlug: string;
}) => {
  const { toast } = useToast();
  const { data: tmpl } = useQuery({
    queryKey: ["preview-form-template"],
    queryFn: async () => {
      const { data } = await supabase
        .from("form_templates")
        .select("name, slug, fields")
        .eq("slug", "contact")
        .eq("is_active", true)
        .maybeSingle();
      return data as { name: string; slug: string; fields: any[] } | null;
    },
    enabled: open,
  });

  if (!tier) return null;

  const subject = `Quote request: ${serviceTitle} — ${tier.name}`;
  const message = buildPrefillMessage(serviceTitle, tier.name);
  const contactLink = buildContactLink(serviceSlug, serviceTitle, tier.name);
  const fields = (tmpl?.fields as any[]) ?? [];

  // Compute per-field prefill exactly the way DynamicForm does
  const computePrefill = (field: any): string => {
    const labelSlug = String(field.label || "").toLowerCase().trim();
    if (labelSlug.includes("subject") || labelSlug.includes("topic")) return subject;
    if (labelSlug.includes("service")) return serviceTitle;
    if (field.type === "textarea" || labelSlug.includes("message") || labelSlug.includes("detail")) return message;
    return "";
  };

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast({ title: "Copied to clipboard" });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            Quote Preview — {tier.name}
          </DialogTitle>
          <DialogDescription>
            This is exactly what your contact form will look like, prefilled and ready to send. You can edit anything before submitting.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
          {/* Subject summary chip */}
          <div className="rounded-lg border border-border bg-background/40 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Subject line</p>
            <p className="text-sm text-foreground font-medium">{subject}</p>
          </div>

          {/* Form field preview — read-only */}
          {fields.length > 0 ? (
            <div className="rounded-lg border border-border bg-background/40 p-3 space-y-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Contact form fields ({tmpl?.name})
              </p>
              {fields.map((f: any) => {
                const prefill = computePrefill(f);
                const filled = prefill.length > 0;
                return (
                  <div key={f.id}>
                    <Label className="text-[11px] text-muted-foreground">
                      {f.label}
                      {f.required && " *"}
                      {filled && (
                        <span className="ml-2 inline-block text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">
                          Prefilled
                        </span>
                      )}
                    </Label>
                    {f.type === "textarea" ? (
                      <Textarea
                        readOnly
                        rows={5}
                        value={prefill}
                        placeholder={f.placeholder || "(you'll fill this in)"}
                        className="mt-1 text-xs bg-secondary/40 cursor-default"
                      />
                    ) : f.type === "select" ? (
                      <Input
                        readOnly
                        value={prefill || "(select an option)"}
                        className="mt-1 text-xs bg-secondary/40 cursor-default"
                      />
                    ) : (
                      <Input
                        readOnly
                        value={prefill}
                        placeholder={f.placeholder || "(you'll fill this in)"}
                        className="mt-1 text-xs bg-secondary/40 cursor-default"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-background/40 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Prefilled message</p>
              <p className="text-sm text-foreground whitespace-pre-line">{message}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={copyMessage}>
            <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy message
          </Button>
          <Button variant="glass" size="sm" onClick={() => onOpenChange(false)}>Close</Button>
          <Button variant="hero" size="sm" asChild>
            <Link to={contactLink} onClick={() => onOpenChange(false)}>
              Continue to contact form <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ServicePricingSection;

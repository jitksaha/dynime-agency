import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ClipboardCheck, XCircle } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AuthDialog from "@/components/auth/AuthDialog";
import { useAuth } from "@/hooks/use-auth";
import { ELIGIBLE_COUNTRIES, isCountryEligible } from "@/data/eligible-countries";
import {
  ArrowLeft, ArrowRight, ShoppingCart, User, CreditCard,
  CheckCircle2, Trash2, Tag, Loader2, ShieldCheck, Sparkles, ChevronDown,
  Copy, HelpCircle, Lock,
} from "lucide-react";
import SiteLogo from "@/components/shared/SiteLogo";
import { getFeePercentForTenure } from "@/lib/flexpay-fees";
import payIconSslcommerz from "@/assets/pay-sslcommerz.webp";
import payIconBkash from "@/assets/pay-bkash.webp";
import payIconDodo from "@/assets/pay-dodo.webp";
import payIconBank from "@/assets/pay-bank.webp";
import { motion, AnimatePresence } from "framer-motion";
import BankDepositDialog, { type BankAccount } from "@/components/checkout/BankDepositDialog";
import { getServiceBySlug } from "@/data/services";
import { usePageSEO } from "@/hooks/use-page-seo";
import { useExchangeRates } from "@/hooks/use-exchange-rates";
import { computeTax, useTaxSettings } from "@/lib/tax";

type StepKey = "cart" | "contact" | "pay";
type MilestoneStage = { label: string; percent: number; amount: number };

const STEPS: { key: StepKey; label: string; icon: any }[] = [
  { key: "cart", label: "Cart", icon: ShoppingCart },
  { key: "contact", label: "Contact", icon: User },
  { key: "pay", label: "Pay", icon: CreditCard },
];

const COUNTRIES = ELIGIBLE_COUNTRIES;

const TIMEZONE_OPTIONS: string[] = (() => {
  try {
    const anyIntl = Intl as any;
    if (typeof anyIntl.supportedValuesOf === "function") {
      return anyIntl.supportedValuesOf("timeZone") as string[];
    }
  } catch {}
  return [
    "UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
    "America/Toronto", "America/Sao_Paulo", "Europe/London", "Europe/Berlin", "Europe/Paris",
    "Europe/Madrid", "Europe/Moscow", "Africa/Cairo", "Africa/Lagos", "Asia/Dubai",
    "Asia/Karachi", "Asia/Dhaka", "Asia/Kolkata", "Asia/Bangkok", "Asia/Singapore",
    "Asia/Hong_Kong", "Asia/Shanghai", "Asia/Tokyo", "Asia/Seoul", "Australia/Sydney",
    "Pacific/Auckland",
  ];
})();

const tzOffsetLabel = (tz: string): string => {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, timeZoneName: "shortOffset",
    }).formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value || "";
  } catch {
    return "";
  }
};

const roundMoney = (value: number) => Math.round(value * 100) / 100;

type CategoryKey = "dws" | "dms" | "dcs" | "dss";

type IntakeField =
  | { key: string; label: string; type: "text" | "textarea" | "url" | "date"; placeholder?: string; required?: boolean }
  | { key: string; label: string; type: "select"; options: string[]; placeholder?: string; required?: boolean }
  | { key: string; label: string; type: "multiselect"; options: string[]; required?: boolean };

const CATEGORY_INTAKE: Record<CategoryKey, { title: string; subtitle: string; fields: IntakeField[] }> = {
  dws: {
    title: "Web project details",
    subtitle: "A few details so our web team can hit the ground running.",
    fields: [
      { key: "project_type", label: "Project type", type: "select", options: ["New website", "Redesign", "Migration", "Maintenance / fixes"], placeholder: "Select project type", required: true },
      { key: "platform", label: "Preferred platform", type: "select", options: ["WordPress", "Shopify", "Webflow", "Custom (React/Next)", "Not sure — recommend"], placeholder: "Select platform" },
      { key: "existing_url", label: "Existing website (if any)", type: "url", placeholder: "https://example.com" },
      { key: "launch_date", label: "Target launch date", type: "date" },
      { key: "references", label: "Reference sites / inspiration", type: "textarea", placeholder: "Links or notes about styles you like." },
    ],
  },
  dms: {
    title: "Marketing campaign details",
    subtitle: "Helps us scope channels, budget and creative direction.",
    fields: [
      { key: "business_url", label: "Business website", type: "url", placeholder: "https://yourbrand.com" },
      { key: "channels", label: "Channels you need", type: "multiselect", options: ["SEO", "Google Ads", "Meta Ads", "TikTok Ads", "Social Media", "Email", "Content"] },
      { key: "monthly_budget", label: "Monthly ad/marketing budget", type: "select", options: ["< $500", "$500 – $1,500", "$1,500 – $5,000", "$5,000 – $15,000", "$15,000+"], placeholder: "Select budget range" },
      { key: "target_region", label: "Target country / region", type: "text", placeholder: "e.g. United States, GCC, Europe" },
      { key: "goals", label: "Primary goal", type: "textarea", placeholder: "Leads, sales, brand awareness, app installs…" },
    ],
  },
  dcs: {
    title: "Consultancy / formation details",
    subtitle: "Required so we can file paperwork and reach the right authority.",
    fields: [
      { key: "entity_type", label: "Entity type", type: "select", options: ["LLC", "C-Corp", "S-Corp", "UK Ltd", "Sole proprietor", "Other / not sure"], placeholder: "Select entity type" },
      { key: "jurisdiction", label: "Jurisdiction", type: "select", options: ["United States — Delaware", "United States — Wyoming", "United States — Other state", "United Kingdom", "Other"], placeholder: "Select jurisdiction" },
      { key: "business_name", label: "Proposed business name", type: "text", placeholder: "e.g. Acme Holdings LLC" },
      { key: "needs_ein_itin", label: "Also need EIN / ITIN?", type: "select", options: ["Yes — EIN", "Yes — ITIN", "Yes — both", "No"], placeholder: "Select" },
      { key: "notes", label: "Anything else we should know?", type: "textarea", placeholder: "Owners, residency, banking needs…" },
    ],
  },
  dss: {
    title: "Software project details",
    subtitle: "Scope, stack and timeline so we can plan engineering.",
    fields: [
      { key: "product_type", label: "Product type", type: "select", options: ["Web app / SaaS", "Mobile app", "AI / ML feature", "API / backend", "Internal tool / dashboard", "Other"], placeholder: "Select product type" },
      { key: "stack_pref", label: "Tech / stack preference", type: "text", placeholder: "e.g. Next.js + Supabase, Flutter, Python…" },
      { key: "timeline", label: "Timeline", type: "select", options: ["ASAP (< 2 weeks)", "1 month", "1 – 3 months", "3+ months", "Flexible"], placeholder: "Select timeline" },
      { key: "repo_url", label: "Existing repo / docs (optional)", type: "url", placeholder: "https://github.com/..." },
      { key: "brief", label: "Project brief", type: "textarea", placeholder: "What should it do? Who's the user?" },
    ],
  },
};

const mapMilestoneStages = (
  projectTotal: number,
  stages: Array<{ label?: string; percent?: number }> = []
): MilestoneStage[] => {
  const cleaned = stages
    .map((stage, index) => ({
      label: stage.label?.trim() || `Stage ${index + 1}`,
      percent: Number(stage.percent),
    }))
    .filter((stage) => Number.isFinite(stage.percent) && stage.percent > 0);

  let allocated = 0;
  return cleaned.map((stage, index) => {
    const isLast = index === cleaned.length - 1;
    const amount = isLast
      ? roundMoney(projectTotal - allocated)
      : roundMoney((projectTotal * stage.percent) / 100);
    allocated = roundMoney(allocated + amount);
    return { ...stage, amount };
  });
};

const Checkout = () => {
  const { items, removeItem, updateQuantity, total, clearCart } = useCart();
  const navigate = useNavigate();
  const { rateFor } = useExchangeRates();
  const [searchParams, setSearchParams] = useSearchParams();
  const paymentResult = searchParams.get("payment") as "success" | "failed" | "cancelled" | null;
  usePageSEO("checkout");

  const closePaymentResult = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("payment");
    setSearchParams(next, { replace: true });
  };

  const [step, setStep] = useState<StepKey>("cart");
  const [details, setDetails] = useState({
    full_name: "", email: "", phone: "", company: "",
    line1: "", city: "", state: "", postal_code: "", country: "United States", tax_id: "",
  });
  const [briefNote, setBriefNote] = useState("");
  const [bookingDate, setBookingDate] = useState<Date | undefined>(undefined);
  const [bookingTime, setBookingTime] = useState<string>("");
  const [bookingTimezone, setBookingTimezone] = useState<string>(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; }
  });
  const [liveTimeInTz, setLiveTimeInTz] = useState<string>("");
  useEffect(() => {
    const fmt = () => {
      try {
        setLiveTimeInTz(new Intl.DateTimeFormat(undefined, {
          timeZone: bookingTimezone,
          weekday: "short", hour: "2-digit", minute: "2-digit", second: "2-digit",
          hour12: false, timeZoneName: "short",
        }).format(new Date()));
      } catch { setLiveTimeInTz(""); }
    };
    fmt();
    const id = setInterval(fmt, 1000);
    return () => clearInterval(id);
  }, [bookingTimezone]);
  const [categoryDetails, setCategoryDetails] = useState<Record<string, Record<string, string | string[]>>>({});
  const setCatField = (cat: string, key: string, value: string | string[]) =>
    setCategoryDetails((prev) => ({ ...prev, [cat]: { ...(prev[cat] || {}), [key]: value } }));
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
    is_milestone?: boolean;
    milestone_mode?: "two_step" | "custom" | null;
    milestone_stages?: Array<{ label: string; percent: number }>;
  } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [gateway, setGateway] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [showBilling, setShowBilling] = useState(false);
  const [showCoupon, setShowCoupon] = useState(false);
  const [bankDeposit, setBankDeposit] = useState<{
    open: boolean;
    orderNumber: string;
    amount: number;
    accounts: BankAccount[];
    instructions?: string;
    displayName?: string;
    customerEmail?: string;
  } | null>(null);

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [authOpen, setAuthOpen] = useState(false);

  // Pre-fill from logged-in user and refetch user-scoped data on sign-in.
  useEffect(() => {
    if (!user) return;
    setDetails((d) => ({
      ...d,
      email: d.email || user.email || "",
      full_name: d.full_name || (user.user_metadata?.full_name as string) || "",
    }));
    // Refresh FlexPay account (and anything else user-scoped) now that we have a session.
    queryClient.invalidateQueries({ queryKey: ["flexpay-account-checkout"] });
  }, [user, queryClient]);

  const serviceCategory = useMemo(() => {
    for (const it of items) {
      const svc = getServiceBySlug(it.slug);
      if (svc) return svc.category;
    }
    return "generic";
  }, [items]);

  const primaryService = useMemo(() => {
    for (const it of items) {
      const svc = getServiceBySlug(it.slug);
      if (svc) return svc;
    }
    return null;
  }, [items]);

  const categoriesInCart = useMemo<CategoryKey[]>(() => {
    const set = new Set<CategoryKey>();
    for (const it of items) {
      const svc = getServiceBySlug(it.slug);
      const cat = svc?.category as CategoryKey | undefined;
      if (cat && CATEGORY_INTAKE[cat]) set.add(cat);
    }
    return Array.from(set);
  }, [items]);

  const isConsultancyBooking = useMemo(() => {
    return items.some((it) => {
      const slug = (it.slug || "").toLowerCase();
      const name = (it.name || "").toLowerCase();
      if (slug === "consulting" || slug.includes("consult") || slug.includes("booking")) return true;
      if (name.includes("consult") || name.includes("booking") || name.includes("session")) return true;
      const svc = getServiceBySlug(it.slug);
      return (svc?.title || "").toLowerCase().includes("consult");
    });
  }, [items]);

  const TIME_SLOTS = useMemo(() => {
    const slots: string[] = [];
    for (let h = 9; h <= 18; h++) {
      slots.push(`${String(h).padStart(2, "0")}:00`);
      if (h < 18) slots.push(`${String(h).padStart(2, "0")}:30`);
    }
    return slots;
  }, []);

  const { data: gateways } = useQuery({
    queryKey: ["enabled-gateways"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("key, value");
      const map: Record<string, string> = {};
      (data || []).forEach((r: any) => {
        const v = typeof r.value === "string" ? r.value.replace(/^"|"$/g, "") : String(r.value);
        map[r.key] = v;
      });
      const ids = ["dodopayment", "sslcommerz", "bkash", "bank_transfer", "stripe"];
      const meta: Record<string, { label: string; desc: string }> = {
        stripe: { label: "Stripe", desc: "Global cards in USD." },
        sslcommerz: { label: "SSLCommerz", desc: "BD cards & mobile banking." },
        bkash: { label: "bKash", desc: "Mobile wallet (auto BDT)." },
        dodopayment: { label: "DodoPayment", desc: "Cards, Apple & Google Pay." },
        bank_transfer: { label: "Bank Transfer", desc: "Direct deposit, manual." },
      };
      return ids
        .filter((id) => map[`${id}_enabled`] === "true")
        .map((id) => ({ id, ...meta[id] }));
    },
  });

  // FlexPay — only available to logged-in customers with an active credit account
  const { data: flexpaySettings } = useQuery({
    queryKey: ["flexpay-settings-checkout"],
    queryFn: async () => {
      const { data } = await supabase.from("flexpay_settings").select("*").eq("id", 1).maybeSingle();
      return data;
    },
  });
  const { data: flexpayAccount, refetch: refetchFlexAccount } = useQuery({
    queryKey: ["flexpay-account-checkout"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) return null;
      const { data } = await supabase
        .from("flexpay_credit_accounts")
        .select("*")
        .eq("user_id", u.user.id)
        .eq("status", "active")
        .maybeSingle();
      return data;
    },
  });
  const flexpayAvailable = flexpayAccount
    ? Math.max(0, Number(flexpayAccount.total_limit) - Number(flexpayAccount.used_limit))
    : 0;
  const flexpayEligible = !!flexpayAccount && !!flexpaySettings?.enabled && flexpaySettings?.emi_enabled !== false;
  const flexpayAllowedTenures: number[] = useMemo(() => {
    const all = (flexpaySettings?.allowed_tenures as number[]) || [3, 6, 9, 12, 24, 36];
    const max = Number(flexpayAccount?.max_tenure_months || 36);
    return all.filter((t) => t <= max);
  }, [flexpaySettings, flexpayAccount]);
  const [flexpayTenure, setFlexpayTenure] = useState<number>(0);
  useEffect(() => {
    if (!flexpayTenure && flexpayAllowedTenures.length) {
      setFlexpayTenure(flexpayAllowedTenures[Math.floor(flexpayAllowedTenures.length / 2)]);
    }
  }, [flexpayAllowedTenures, flexpayTenure]);

  useEffect(() => {
    if (!gateway && gateways && gateways.length) setGateway(gateways[0].id);
  }, [gateways, gateway]);

  useEffect(() => {
    if (paymentResult === "success") clearCart();
  }, [paymentResult, clearCart]);

  const taxSettings = useTaxSettings();
  const trxId = useMemo(() => {
    const seed = items.map((i) => `${i.id}x${i.quantity}`).join("|") || "checkout";
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    return `${h.toString(16).padStart(8, "0")}-${Date.now().toString(36).slice(-4)}-dynime`;
  }, [items]);
  const [trxCopied, setTrxCopied] = useState(false);
  const subtotal = total;
  const discount = appliedCoupon?.discount || 0;
  // Discount applies to subtotal first; tax is computed on the discounted amount.
  const discountedSubtotal = Math.max(0, Math.round((subtotal - discount) * 100) / 100);
  const taxBreakdown = computeTax(discountedSubtotal, taxSettings);
  // Final total: in exclusive mode tax is added on top; in inclusive mode the
  // listed (discounted) subtotal already contains the tax, so total stays the same.
  const finalTotal = taxBreakdown.enabled && !taxBreakdown.inclusive
    ? taxBreakdown.gross
    : discountedSubtotal;

  // Milestone breakdown — first stage is what the customer pays now.
  const milestoneStages = appliedCoupon?.is_milestone
    ? mapMilestoneStages(finalTotal, appliedCoupon.milestone_stages)
    : [];
  const advanceAmount = milestoneStages.length
    ? Math.round(finalTotal * milestoneStages[0].percent) / 100
    : finalTotal;
  const chargeNow = appliedCoupon?.is_milestone ? advanceAmount : finalTotal;

  const bdtRate = rateFor("BDT" as any);
  const isBkash = gateway === "bkash";
  const bdtTotal = Math.round(chargeNow * (bdtRate || 0) * 100) / 100;

  const canNext = useMemo(() => {
    if (step === "cart") return items.length > 0;
    if (step === "contact") {
      const baseValid = details.full_name.trim().length > 1 &&
        /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(details.email);
      if (!baseValid) return false;
      if (isConsultancyBooking && (!bookingDate || !bookingTime)) return false;
      // If a billing country is provided, it must be on the eligible list.
      if (details.country && !isCountryEligible(details.country)) return false;
      // Each cart category may declare required intake fields.
      for (const cat of categoriesInCart) {
        for (const f of CATEGORY_INTAKE[cat].fields) {
          if (!("required" in f) || !f.required) continue;
          const v = categoryDetails[cat]?.[f.key];
          if (Array.isArray(v) ? v.length === 0 : !v || !String(v).trim()) return false;
        }
      }
      return true;
    }
    return true;
  }, [step, items, details, isConsultancyBooking, bookingDate, bookingTime, categoriesInCart, categoryDetails]);

  const goNext = () => {
    const idx = STEPS.findIndex((s) => s.key === step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1].key);
  };
  const goBack = () => {
    const idx = STEPS.findIndex((s) => s.key === step);
    if (idx > 0) setStep(STEPS[idx - 1].key);
  };

  const applyCoupon = async () => {
    if (!coupon.trim()) return;
    setCouponLoading(true);
    try {
      const { data, error } = await supabase.rpc("validate_coupon", {
        _code: coupon.trim(), _order_total: subtotal,
      });
      if (error) throw error;
      const v = data as any;
      if (!v?.valid) { toast.error(v?.error || "Invalid coupon"); setAppliedCoupon(null); return; }
      const stages = Array.isArray(v.milestone_stages)
        ? mapMilestoneStages(Math.max(0, roundMoney(subtotal - Number(v.discount_amount || 0))), v.milestone_stages)
        : [];
      if (v.is_milestone && stages.length < 2) {
        toast.error("Milestone coupon needs at least 2 payment stages");
        setAppliedCoupon(null);
        return;
      }
      setAppliedCoupon({
        code: v.code,
        discount: Number(v.discount_amount || 0),
        is_milestone: !!v.is_milestone,
        milestone_mode: v.milestone_mode,
        milestone_stages: stages,
      });
      const note = v.is_milestone
        ? ` — milestone billing enabled`
        : v.discount_amount > 0 ? ` — save $${Number(v.discount_amount).toFixed(2)}` : "";
      toast.success(`Coupon ${v.code} applied${note}`);
    } catch (err: any) {
      toast.error(err?.message || "Could not validate coupon");
    } finally {
      setCouponLoading(false);
    }
  };

  const submit = async () => {
    if (!gateway) { toast.error("Choose a payment method"); return; }

    // FlexPay branch — uses approved credit limit, no external gateway
    if (gateway === "flexpay") {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) { toast.error("Please sign in to use FlexPay"); setAuthOpen(true); return; }
      if (!flexpayEligible) { toast.error("FlexPay is not available for your account"); return; }
      if (chargeNow > flexpayAvailable) {
        toast.error(`Insufficient FlexPay limit. Available $${flexpayAvailable.toFixed(2)}`);
        return;
      }
      if (!flexpayTenure) { toast.error("Please choose a tenure"); return; }
      setSubmitting(true);
      try {
        const serviceBrief = {
          note: briefNote,
          category: serviceCategory,
          primary_service: primaryService?.title || null,
          booking: isConsultancyBooking && bookingDate && bookingTime ? {
            date: format(bookingDate, "yyyy-MM-dd"),
            time: bookingTime,
            timezone: bookingTimezone,
            iso: `${format(bookingDate, "yyyy-MM-dd")}T${bookingTime}:00`,
          } : null,
          categories: categoriesInCart,
          category_details: categoriesInCart.reduce((acc, cat) => {
            const def = CATEGORY_INTAKE[cat];
            const values = categoryDetails[cat] || {};
            acc[cat] = {
              title: def.title,
              values: def.fields.reduce((v, f) => {
                v[f.key] = { label: f.label, value: values[f.key] ?? (f.type === "multiselect" ? [] : "") };
                return v;
              }, {} as Record<string, { label: string; value: any }>),
            };
            return acc;
          }, {} as Record<string, any>),
        };
        const billingAddress = {
          line1: details.line1, city: details.city, state: details.state,
          postal_code: details.postal_code, country: details.country, company: details.company,
          tax_id: details.tax_id, phone: details.phone,
        };
        const { data, error } = await supabase.rpc("flexpay_checkout", {
          _items: items.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })) as any,
          _customer_name: details.full_name,
          _customer_email: details.email.trim().toLowerCase(),
          _subtotal: subtotal,
          _total: chargeNow,
          _tenure_months: flexpayTenure,
          _service_brief: serviceBrief as any,
          _billing_address: billingAddress as any,
          _notes: briefNote || null,
          _coupon_code: appliedCoupon?.code || null,
          _discount_amount: appliedCoupon?.discount || 0,
          _currency: "USD",
          _down_payment: 0,
          _tax_amount: taxBreakdown.enabled ? taxBreakdown.tax : 0,
          _tax_percent: taxBreakdown.enabled ? taxBreakdown.percent : 0,
          _tax_mode: taxBreakdown.enabled ? taxBreakdown.mode : null,
          _tax_label: taxBreakdown.enabled ? taxBreakdown.label : null,
          _service_category: serviceCategory || null,
        });
        if (error) throw error;
        toast.success("Order placed — FlexPay plan created");
        clearCart();
        await refetchFlexAccount();
        navigate("/account/flexpay");
        return;
      } catch (err: any) {
        toast.error(err?.message || "Could not complete FlexPay checkout");
      } finally {
        setSubmitting(false);
      }
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-payment", {
        body: {
          gateway,
          customer_name: details.full_name,
          customer_email: details.email.trim().toLowerCase(),
          items: items.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
          total: finalTotal,
          charge_now: chargeNow,
          coupon_code: appliedCoupon?.code || null,
          tax: taxBreakdown.enabled ? {
            amount: taxBreakdown.tax,
            percent: taxBreakdown.percent,
            mode: taxBreakdown.mode,
            label: taxBreakdown.label,
          } : null,
          milestone: appliedCoupon?.is_milestone ? {
            mode: appliedCoupon.milestone_mode,
            stages: milestoneStages,
            total: finalTotal,
          } : null,
          service_brief: {
            note: briefNote,
            category: serviceCategory,
            primary_service: primaryService?.title || null,
            booking: isConsultancyBooking && bookingDate && bookingTime ? {
              date: format(bookingDate, "yyyy-MM-dd"),
              time: bookingTime,
              timezone: bookingTimezone,
              iso: `${format(bookingDate, "yyyy-MM-dd")}T${bookingTime}:00`,
            } : null,
            categories: categoriesInCart,
            category_details: categoriesInCart.reduce((acc, cat) => {
              const def = CATEGORY_INTAKE[cat];
              const values = categoryDetails[cat] || {};
              acc[cat] = {
                title: def.title,
                values: def.fields.reduce((v, f) => {
                  v[f.key] = { label: f.label, value: values[f.key] ?? (f.type === "multiselect" ? [] : "") };
                  return v;
                }, {} as Record<string, { label: string; value: any }>),
              };
              return acc;
            }, {} as Record<string, any>),
          },
          billing_address: {
            line1: details.line1, city: details.city, state: details.state,
            postal_code: details.postal_code, country: details.country, company: details.company,
            tax_id: details.tax_id, phone: details.phone,
          },
          notes: briefNote,
          currency: "USD",
          success_url: `${window.location.origin}/checkout?payment=success`,
          cancel_url: `${window.location.origin}/checkout?payment=cancelled`,
        },
      });
      if (error) throw error;
      const r: any = data;
      // Bank transfer — show admin-configured deposit info inline.
      if (r?.gateway === "bank_transfer" && r?.session_id) {
        clearCart();
        setBankDeposit({
          open: true,
          orderNumber: r.session_id,
          amount: chargeNow,
          accounts: (r.accounts as BankAccount[]) || [],
          instructions: r.instructions,
          displayName: r.display_name,
          customerEmail: details.email,
        });
        return;
      }
      // All automatic gateways return a hosted checkout URL (Stripe, SSLCommerz,
      // bKash, DodoPayment) — redirect the buyer; gateway will redirect back.
      const checkoutUrl = r?.url || r?.checkout_url;
      if (checkoutUrl) {
        try { localStorage.setItem("lastOrderType", "service"); } catch { /* storage may be unavailable */ }
        try {
          if (window.top && window.top !== window.self) window.top.location.assign(checkoutUrl);
          else window.location.assign(checkoutUrl);
        } catch {
          window.location.assign(checkoutUrl);
        }
        return;
      }
      toast.success("Order placed");
    } catch (err: any) {
      toast.error(err?.message || "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  };

  const PaymentResultDialog = (
    <Dialog open={paymentResult !== null} onOpenChange={(o) => { if (!o) closePaymentResult(); }}>
      <DialogContent className="max-w-sm rounded-2xl">
        {paymentResult === "success" && (
          <div className="py-8 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <ClipboardCheck className="w-10 h-10 text-primary" />
            </div>
            <h2 className="font-heading text-xl font-bold text-foreground">Thank you — your project is in our hands!</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Payment received. Since this is a human-delivered service, our team will review your brief and reach out by email within 24 hours to kick off the work. You'll get progress updates at every stage until your project is completed.
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => { closePaymentResult(); navigate("/track"); }} className="w-full h-11 rounded-xl">Track my order</Button>
              <Button variant="outline" onClick={() => { closePaymentResult(); navigate("/account"); }} className="w-full h-11 rounded-xl">View my orders</Button>
              <Button variant="ghost" onClick={() => { closePaymentResult(); navigate("/services"); }} className="w-full h-11 rounded-xl">Browse more services</Button>
            </div>
          </div>
        )}
        {paymentResult === "failed" && (
          <div className="py-7 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>
            <h2 className="font-heading text-xl font-bold text-foreground">Payment didn't go through</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Don't worry — no charge was made and your service brief is safe. This usually happens because of a card decline, an expired card, or a temporary gateway issue.
            </p>
            <div className="rounded-xl bg-muted/50 p-3 text-left text-xs text-muted-foreground space-y-1.5">
              <p className="font-semibold text-foreground">Try one of these next:</p>
              <p>• Retry the payment with the same method.</p>
              <p>• Pick a different gateway (Stripe, bKash, SSLCommerz, DodoPayment, or bank transfer).</p>
              <p>• Contact our team — we'll help you complete the order manually.</p>
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={() => { closePaymentResult(); setStep("pay"); }} className="w-full h-11 rounded-xl">Retry payment</Button>
              <Button variant="outline" onClick={() => { closePaymentResult(); navigate("/contact"); }} className="w-full h-11 rounded-xl">Contact support</Button>
            </div>
          </div>
        )}
        {paymentResult === "cancelled" && (
          <div className="py-7 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto">
              <XCircle className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="font-heading text-xl font-bold text-foreground">Checkout cancelled</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You closed the payment window before completing the order — no charge was made. Your service brief is still saved, so you can resume from exactly where you left off.
            </p>
            <div className="rounded-xl bg-muted/50 p-3 text-left text-xs text-muted-foreground space-y-1.5">
              <p className="font-semibold text-foreground">Need a hand?</p>
              <p>• Resume checkout to finish placing the order.</p>
              <p>• Want to talk to a human first? Reach out and we'll guide you through scope, pricing and payment.</p>
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={() => { closePaymentResult(); setStep("pay"); }} className="w-full h-11 rounded-xl">Resume checkout</Button>
              <Button variant="outline" onClick={() => { closePaymentResult(); navigate("/contact"); }} className="w-full h-11 rounded-xl">Talk to our team</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  if (items.length === 0) {
    const emptyHeading =
      bankDeposit ? "Order placed — awaiting your deposit" :
      paymentResult === "success" ? "Order received!" :
      paymentResult === "failed" ? "Payment didn't go through" :
      paymentResult === "cancelled" ? "Checkout cancelled" :
      "Your cart is empty";
    const emptyBody =
      bankDeposit ? "Use the bank details in the dialog to complete your transfer. We'll confirm your order once the deposit lands." :
      paymentResult === "success" ? "Thanks — our team will be in touch shortly." :
      paymentResult === "failed" ? "No charge was made. You can retry the payment or talk to our team for help." :
      paymentResult === "cancelled" ? "No charge was made. Pick the service you'd like to start with." :
      "Browse services and add a plan to get started.";
    return (
      <Layout>
        <div className="container-custom py-14 text-center">
          <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="font-heading text-3xl font-bold mb-2">{emptyHeading}</h1>
          <p className="text-muted-foreground mb-6">{emptyBody}</p>
          <div className="flex items-center justify-center gap-2">
            <Button asChild variant="hero"><Link to="/services">Explore Services</Link></Button>
            {(paymentResult === "failed" || paymentResult === "cancelled") && (
              <Button asChild variant="outline"><Link to="/contact">Contact support</Link></Button>
            )}
          </div>
        </div>
        {PaymentResultDialog}
        {bankDeposit && (
          <BankDepositDialog
            open={bankDeposit.open}
            onClose={() => { setBankDeposit(null); navigate("/services"); }}
            orderNumber={bankDeposit.orderNumber}
            amount={bankDeposit.amount}
            accounts={bankDeposit.accounts}
            instructions={bankDeposit.instructions}
            displayName={bankDeposit.displayName}
            customerEmail={bankDeposit.customerEmail}
          />
        )}
      </Layout>
    );
  }

  const currentIdx = STEPS.findIndex((s) => s.key === step);

  const copyTrx = async () => {
    try { await navigator.clipboard.writeText(trxId); setTrxCopied(true); toast.success("Transaction ID copied"); setTimeout(() => setTrxCopied(false), 1400); } catch { toast.error("Copy failed"); }
  };
  const activeGateway = gateways?.find((g) => g.id === gateway);

  return (
    <Layout>
      <section className="py-10 md:py-14 bg-muted/30 min-h-screen">
        <div className="container-custom max-w-6xl">
          <div className="rounded-3xl bg-card border border-border shadow-[0_20px_60px_-30px_hsl(var(--primary)/0.25)] overflow-hidden grid lg:grid-cols-[5fr_7fr] divide-y lg:divide-y-0 lg:divide-x divide-border">

            {/* LEFT — Order summary panel */}
            <aside className="p-6 md:p-8 space-y-5 bg-background/60">
              <div className="flex items-start gap-3">
                <Link to="/" className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 ring-1 ring-primary/20">
                  <SiteLogo className="h-6 w-auto" />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="font-heading font-bold text-base text-foreground truncate">Dynime Checkout</div>
                  <button type="button" onClick={copyTrx} className="mt-0.5 inline-flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground hover:text-primary transition-colors max-w-full">
                    <span className="truncate">Trx ID: {trxId}</span>
                    {trxCopied ? <CheckCircle2 className="w-3 h-3 shrink-0" /> : <Copy className="w-3 h-3 shrink-0" />}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl bg-primary/5 border border-primary/15 p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">You are paying</div>
                  <div className="font-heading text-2xl md:text-3xl font-bold text-foreground mt-0.5">
                    {isBkash ? `৳${bdtTotal.toFixed(2)}` : `$${chargeNow.toFixed(2)}`}
                  </div>
                </div>
                {(() => {
                  const list = [
                    ...(gateways || []),
                    ...(flexpayEligible && chargeNow <= flexpayAvailable
                      ? [{ id: "flexpay", label: "FlexPay (BNPL)", desc: "Use your approved credit limit." }]
                      : []),
                  ];
                  if (list.length === 0) return null;
                  return (
                    <div className="shrink-0 inline-flex flex-col items-end text-right">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Pay with</span>
                      <Select value={gateway} onValueChange={setGateway}>
                        <SelectTrigger className="mt-0.5 h-auto py-1 px-2.5 bg-card border border-border rounded-md text-xs font-semibold gap-1.5 w-auto">
                          <CreditCard className="w-3.5 h-3.5 text-primary" />
                          <SelectValue placeholder="Choose gateway" />
                        </SelectTrigger>
                        <SelectContent align="end">
                          {list.map((g) => (
                            <SelectItem key={g.id} value={g.id} className="text-xs">
                              {g.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })()}
              </div>

              {items.length > 0 && (
                <div className="space-y-1.5 text-sm max-h-44 overflow-y-auto pr-1">
                  {items.map((it) => (
                    <div key={it.id} className="flex justify-between gap-2">
                      <span className="text-muted-foreground truncate">{it.name} × {it.quantity}</span>
                      <span className="font-medium whitespace-nowrap">${(it.price * it.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2.5 text-sm border-t border-border pt-4">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-medium">${subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Convenience Charge</span><span className="font-medium">$0.00</span></div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600"><span>Discount ({appliedCoupon?.code})</span><span>−${discount.toFixed(2)}</span></div>
                )}
                {taxBreakdown.enabled && (
                  taxBreakdown.inclusive ? (
                    <>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Net (excl. {taxBreakdown.label})</span>
                        <span>${taxBreakdown.net.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-primary">
                        <span>{taxBreakdown.label} ({taxBreakdown.percent}%) — included</span>
                        <span>${taxBreakdown.tax.toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-primary">
                      <span>{taxBreakdown.label} ({taxBreakdown.percent}%)</span>
                      <span className="font-medium">+${taxBreakdown.tax.toFixed(2)}</span>
                    </div>
                  )
                )}
                <div className="border-t border-border pt-2.5 flex justify-between items-center">
                  <span className="font-semibold text-foreground">Total amount</span>
                  <span className="font-heading font-bold text-lg">${finalTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
                <button type="button" onClick={() => setShowCoupon((v) => !v)} className="w-full flex items-center justify-between gap-2 text-left">
                  <div>
                    <div className="font-semibold text-sm text-foreground flex items-center gap-2"><Tag className="w-3.5 h-3.5 text-primary" /> Special Offers & Savings</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">Apply a coupon to unlock a discount</div>
                  </div>
                  <span className="shrink-0 inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
                    {appliedCoupon ? "1" : "0"}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {showCoupon && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="flex gap-2 pt-1">
                        <Input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="ENTER CODE" className="h-9" />
                        <Button onClick={applyCoupon} disabled={couponLoading || !coupon.trim()} variant="outline" size="sm" className="h-9">
                          {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                        </Button>
                      </div>
                      {appliedCoupon && (
                        <div className="text-xs text-emerald-600 flex items-center gap-2 mt-2">
                          <CheckCircle2 className="w-3.5 h-3.5" /> {appliedCoupon.code} — −${appliedCoupon.discount.toFixed(2)}
                          <button className="underline ml-1" onClick={() => { setAppliedCoupon(null); setCoupon(""); }}>remove</button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {appliedCoupon?.is_milestone && milestoneStages.length > 0 && (
                <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 text-xs space-y-1">
                  <div className="font-semibold text-foreground flex items-center gap-1"><Sparkles className="w-3 h-3" /> Milestone payments</div>
                  {milestoneStages.map((s, i) => (
                    <div key={i} className="flex justify-between">
                      <span className={i === 0 ? "text-foreground font-medium" : "text-muted-foreground"}>
                        {i + 1}. {s.label} ({s.percent}%) {i === 0 && "— pay now"}
                      </span>
                      <span className={i === 0 ? "font-semibold" : ""}>${s.amount.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="text-[11px] text-muted-foreground pt-1 border-t border-primary/20">
                    Remaining stages will be invoiced as work progresses.
                  </div>
                </div>
              )}

              {isBkash && (
                <div className="rounded-xl bg-pink-500/10 border border-pink-500/30 p-3 text-xs space-y-0.5">
                  <div className="flex justify-between font-medium text-foreground">
                    <span>bKash amount (BDT)</span>
                    <span>৳{bdtTotal.toFixed(2)}</span>
                  </div>
                  <div className="text-muted-foreground">1 USD ≈ ৳{bdtRate?.toFixed(2) || "—"} (live rate)</div>
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border">
                <div className="flex items-center gap-3">
                  <Link to="/contact" className="hover:text-primary inline-flex items-center gap-1"><HelpCircle className="w-3 h-3" /> Support</Link>
                  <Link to="/legal" className="hover:text-primary">FAQ</Link>
                </div>
                <div className="inline-flex items-center gap-1"><Lock className="w-3 h-3" /> SSL Secured</div>
              </div>
            </aside>

            {/* RIGHT — Step content */}
            <div className="p-6 md:p-8 space-y-5">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-border">
                {STEPS.map((s, i) => {
                  const done = i < currentIdx;
                  const active = i === currentIdx;
                  const Icon = s.icon;
                  return (
                    <div key={s.key} className="flex-1 flex items-center min-w-0">
                      <div className={`flex items-center gap-2 ${active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground"}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 flex-shrink-0 ${active ? "border-primary bg-primary/10" : done ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                          {done ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
                        </div>
                        <div className="hidden sm:block text-xs font-semibold">{s.label}</div>
                      </div>
                      {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-2 ${done ? "bg-primary" : "bg-border"}`} />}
                    </div>
                  );
                })}
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className=""
                >
                  {/* STEP 1 — Cart */}
                  {step === "cart" && (
                    <div className="space-y-4">
                      <div>
                        <h2 className="font-heading text-xl md:text-2xl font-bold">Your selection</h2>
                        <p className="text-sm text-muted-foreground">Adjust quantities or remove items.</p>
                      </div>
                      <div className="space-y-2">
                        {items.map((it) => (
                          <div key={it.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-background/40">
                            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Sparkles className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm text-foreground truncate">{it.name}</div>
                              <div className="text-xs text-muted-foreground">${it.price.toFixed(2)} × {it.quantity}</div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => updateQuantity(it.id, it.quantity - 1)}>−</Button>
                              <span className="w-6 text-center text-sm">{it.quantity}</span>
                              <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => updateQuantity(it.id, it.quantity + 1)}>+</Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeItem(it.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Need more? <Link to="/services" className="text-primary underline">Add another service</Link>
                      </div>
                    </div>
                  )}

                  {/* STEP 2 — Contact (only 2 required fields) */}
                  {step === "contact" && (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="font-heading text-xl md:text-2xl font-bold">How do we reach you?</h2>
                          <p className="text-sm text-muted-foreground">Just two fields — we'll email your invoice & account link.</p>
                        </div>
                        {!user && (
                          <button
                            type="button"
                            onClick={() => setAuthOpen(true)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary hover:bg-primary/15 transition-colors"
                          >
                            <Lock className="w-3.5 h-3.5" /> Already a customer? Sign in
                          </button>
                        )}
                      </div>
                      {user && (
                        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Signed in as <strong className="text-foreground">{user.email}</strong> — your details were pre-filled.
                        </div>
                      )}
                      <div className="grid md:grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="cn">Full name *</Label>
                          <Input id="cn" autoComplete="name" placeholder="e.g. Jane Cooper" value={details.full_name}
                            onChange={(e) => setDetails({ ...details, full_name: e.target.value })} />
                        </div>
                        <div>
                          <Label htmlFor="ce">Email *</Label>
                          <Input id="ce" type="email" autoComplete="email" inputMode="email"
                            placeholder="you@company.com"
                            value={details.email}
                            onChange={(e) => setDetails({ ...details, email: e.target.value })} />
                        </div>
                      </div>
                      {isConsultancyBooking && (
                        <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4 text-primary" />
                            <h3 className="font-heading font-semibold text-sm">Schedule your consultation *</h3>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Pick a date and time that works for you. We'll confirm by email and send a calendar invite.
                          </p>
                          <div className="grid sm:grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Date *</Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className={cn("w-full justify-start text-left font-normal mt-1", !bookingDate && "text-muted-foreground")}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {bookingDate ? format(bookingDate, "PPP") : <span>Pick a date</span>}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={bookingDate}
                                    onSelect={setBookingDate}
                                    disabled={(date) => {
                                      const today = new Date(); today.setHours(0, 0, 0, 0);
                                      const max = new Date(); max.setDate(max.getDate() + 60);
                                      return date < today || date > max || date.getDay() === 0;
                                    }}
                                    initialFocus
                                    className={cn("p-3 pointer-events-auto")}
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                            <div>
                              <Label className="text-xs">Time slot *</Label>
                              <Select value={bookingTime} onValueChange={setBookingTime}>
                                <SelectTrigger className="mt-1">
                                  <Clock className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                                  <SelectValue placeholder="Select time" />
                                </SelectTrigger>
                                <SelectContent>
                                  {TIME_SLOTS.map((t) => (
                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">Your timezone</Label>
                            <Select value={bookingTimezone} onValueChange={setBookingTimezone}>
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select your timezone" />
                              </SelectTrigger>
                              <SelectContent className="max-h-72">
                                {TIMEZONE_OPTIONS.map((tz) => (
                                  <SelectItem key={tz} value={tz}>
                                    {tz.replace(/_/g, " ")} ({tzOffsetLabel(tz)})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-[11px] text-muted-foreground mt-1">
                              Current time: {liveTimeInTz}
                            </p>
                          </div>
                          {bookingDate && bookingTime && (
                            <div className="text-xs text-emerald-600 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Booking: {format(bookingDate, "EEE, MMM d")} at {bookingTime} ({bookingTimezone})
                            </div>
                          )}
                        </div>
                      )}

                      {categoriesInCart.map((cat) => {
                        const def = CATEGORY_INTAKE[cat];
                        const vals = categoryDetails[cat] || {};
                        return (
                          <div key={cat} className="rounded-xl border bg-muted/30 p-4 space-y-3">
                            <div>
                              <h3 className="font-heading font-semibold text-sm">{def.title}</h3>
                              <p className="text-xs text-muted-foreground">{def.subtitle}</p>
                            </div>
                            <div className="grid sm:grid-cols-2 gap-3">
                              {def.fields.map((f) => {
                                const id = `${cat}-${f.key}`;
                                const value = vals[f.key];
                                const wrapperClass =
                                  f.type === "textarea" || f.type === "multiselect" ? "sm:col-span-2" : "";
                                return (
                                  <div key={f.key} className={wrapperClass}>
                                    <Label htmlFor={id} className="text-xs">
                                      {f.label}{("required" in f && f.required) ? " *" : ""}
                                    </Label>
                                    {f.type === "textarea" ? (
                                      <Textarea
                                        id={id}
                                        rows={2}
                                        className="mt-1"
                                        placeholder={f.placeholder}
                                        value={(value as string) || ""}
                                        onChange={(e) => setCatField(cat, f.key, e.target.value)}
                                      />
                                    ) : f.type === "select" ? (
                                      <Select
                                        value={(value as string) || ""}
                                        onValueChange={(v) => setCatField(cat, f.key, v)}
                                      >
                                        <SelectTrigger className="mt-1">
                                          <SelectValue placeholder={f.placeholder || "Select"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {f.options.map((opt) => (
                                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    ) : f.type === "multiselect" ? (
                                      <div className="mt-1 flex flex-wrap gap-1.5">
                                        {f.options.map((opt) => {
                                          const arr = Array.isArray(value) ? value : [];
                                          const on = arr.includes(opt);
                                          return (
                                            <button
                                              type="button"
                                              key={opt}
                                              onClick={() => {
                                                const next = on ? arr.filter((x) => x !== opt) : [...arr, opt];
                                                setCatField(cat, f.key, next);
                                              }}
                                              className={cn(
                                                "px-2.5 py-1 rounded-full text-xs border transition-colors",
                                                on
                                                  ? "bg-primary text-primary-foreground border-primary"
                                                  : "bg-background text-foreground border-border hover:border-primary/50"
                                              )}
                                            >
                                              {opt}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <Input
                                        id={id}
                                        type={f.type === "url" ? "url" : f.type === "date" ? "date" : "text"}
                                        className="mt-1"
                                        placeholder={f.placeholder}
                                        value={(value as string) || ""}
                                        onChange={(e) => setCatField(cat, f.key, e.target.value)}
                                      />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}


                      <div>
                        <Label htmlFor="brief">
                          {isConsultancyBooking ? "What would you like to discuss? (optional)" : "Project note (optional)"}
                        </Label>
                        <Textarea id="brief" rows={2} value={briefNote}
                          placeholder={isConsultancyBooking
                            ? "Topics, questions, or context for the call."
                            : "Goal, deadline, references — anything we should know."}
                          onChange={(e) => setBriefNote(e.target.value)} />
                      </div>

                      <button type="button" onClick={() => setShowBilling((v) => !v)}
                        className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                        <ChevronDown className={`w-4 h-4 transition-transform ${showBilling ? "rotate-180" : ""}`} />
                        {showBilling ? "Hide" : "Add"} billing address (optional)
                      </button>
                      <AnimatePresence initial={false}>
                        {showBilling && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="grid md:grid-cols-2 gap-3 pt-1">
                              <div><Label>Phone</Label><Input autoComplete="tel" placeholder="+1 555 123 4567" value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })} /></div>
                              <div><Label>Company</Label><Input autoComplete="organization" placeholder="Acme Inc." value={details.company} onChange={(e) => setDetails({ ...details, company: e.target.value })} /></div>
                              <div className="md:col-span-2"><Label>Address</Label><Input autoComplete="address-line1" placeholder="123 Main Street, Apt 4B" value={details.line1} onChange={(e) => setDetails({ ...details, line1: e.target.value })} /></div>
                              <div><Label>City</Label><Input autoComplete="address-level2" placeholder="San Francisco" value={details.city} onChange={(e) => setDetails({ ...details, city: e.target.value })} /></div>
                              <div><Label>Postal code</Label><Input autoComplete="postal-code" placeholder="94103" value={details.postal_code} onChange={(e) => setDetails({ ...details, postal_code: e.target.value })} /></div>
                              <div className="md:col-span-2">
                                <Label>Country</Label>
                                <Select value={details.country} onValueChange={(v) => setDetails({ ...details, country: v })}>
                                  <SelectTrigger><SelectValue placeholder="Select your country" /></SelectTrigger>
                                  <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                </Select>
                                {details.country && !isCountryEligible(details.country) && (
                                  <p className="mt-1.5 text-xs text-destructive">
                                    Sorry — we can't accept orders from {details.country} due to payment restrictions.
                                  </p>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* STEP 3 — Pay */}
                  {step === "pay" && (
                    <div className="space-y-4">
                      <div>
                        <h2 className="font-heading text-xl md:text-2xl font-bold">Choose payment</h2>
                        <p className="text-sm text-muted-foreground">Select a method and complete your order.</p>
                      </div>

                      {gateways && gateways.length > 0 ? (
                        <div className="grid sm:grid-cols-2 gap-3">
                          {gateways.map((g) => {
                            const imgSrc: Record<string, string> = {
                              sslcommerz: payIconSslcommerz,
                              bkash: payIconBkash,
                              dodopayment: payIconDodo,
                              bank_transfer: payIconBank,
                            };
                            const src = imgSrc[g.id];
                            const selected = gateway === g.id;
                            return (
                              <button key={g.id} onClick={() => setGateway(g.id)}
                                className={`text-left p-4 rounded-xl border-2 transition-all ${selected ? "border-primary bg-primary/10 shadow-sm" : "border-border hover:border-primary/40 hover:bg-muted/30"}`}>
                                <div className="flex items-center gap-4">
                                  <div className="w-24 h-20 rounded-lg flex items-center justify-center flex-shrink-0 bg-white border border-border overflow-hidden p-2">
                                    {src ? (
                                      <img src={src} alt={`${g.label} logo`} loading="lazy" decoding="async" className="max-w-full max-h-full object-contain" />
                                    ) : (
                                      <CreditCard className="w-8 h-8 text-primary" />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm text-foreground leading-snug">{g.desc}</p>
                                  </div>
                                  {selected && <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />}
                                </div>
                              </button>
                            );
                          })}

                          {/* FlexPay tile */}
                          {flexpayEligible && (() => {
                            const selected = gateway === "flexpay";
                            const insufficient = chargeNow > flexpayAvailable;
                            return (
                              <button
                                type="button"
                                disabled={insufficient}
                                onClick={() => setGateway("flexpay")}
                                className={`text-left p-3 rounded-xl border-2 transition-all sm:col-span-2 relative ${
                                  selected ? "border-primary bg-primary/10 shadow-sm"
                                  : insufficient ? "border-border opacity-60 cursor-not-allowed"
                                  : "border-border hover:border-primary/40 hover:bg-muted/30"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-md">
                                    <div className="text-center">
                                      <CreditCard className="w-5 h-5 mx-auto" />
                                      <div className="text-[8px] font-bold mt-0.5 tracking-wider">FLEXPAY</div>
                                    </div>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-foreground">Dynime FlexPay — Buy Now, Pay Later</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      Available limit: <span className="font-semibold text-foreground">${flexpayAvailable.toFixed(2)}</span>
                                      {insufficient && <span className="text-destructive ml-1.5">· Not enough for this order</span>}
                                    </p>
                                  </div>
                                  {selected && <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />}
                                </div>

                                {selected && !insufficient && (
                                  <div className="mt-3 pt-3 border-t border-border/60 space-y-2"
                                    onClick={(e) => e.stopPropagation()}>
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Choose tenure</p>
                                    <div
                                      className="grid gap-1.5"
                                      style={{ gridTemplateColumns: `repeat(${Math.max(flexpayAllowedTenures.length, 1)}, minmax(0, 1fr))` }}
                                    >
                                      {flexpayAllowedTenures.map((m) => {
                                        const active = flexpayTenure === m;
                                        const tiers = (flexpaySettings?.tenure_fee_tiers as any[]) || [];
                                        const feePct = Math.max(0, getFeePercentForTenure(m, tiers, Number(flexpaySettings?.processing_fee_percent || 0)));
                                        return (
                                          <button
                                            key={m}
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); setFlexpayTenure(m); }}
                                            className={`rounded-md border px-1 py-1.5 text-center leading-tight ${
                                              active ? "border-primary bg-primary text-primary-foreground"
                                              : "border-border bg-background hover:border-primary/50"
                                            }`}
                                          >
                                            <div className="font-bold text-xs">{m}m</div>
                                            <div className={`text-[10px] ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{feePct}%</div>
                                          </button>
                                        );
                                      })}
                                    </div>
                                    {flexpayTenure > 0 && (() => {
                                      const tiers = (flexpaySettings?.tenure_fee_tiers as any[]) || [];
                                      const feePct = Math.max(0, getFeePercentForTenure(flexpayTenure, tiers, Number(flexpaySettings?.processing_fee_percent || 0)));
                                      const fee = Math.round(chargeNow * feePct) / 100;
                                      const financed = chargeNow + fee;
                                      const monthly = Math.round((financed / flexpayTenure) * 100) / 100;
                                      return (
                                        <div className="mt-2 rounded-lg bg-muted/40 p-3 text-xs grid grid-cols-3 gap-2">
                                          <div><div className="text-muted-foreground">Monthly</div><div className="font-bold text-base">${monthly.toFixed(2)}</div></div>
                                          <div><div className="text-muted-foreground">Fee ({feePct}%)</div><div className="font-semibold">${fee.toFixed(2)}</div></div>
                                          <div><div className="text-muted-foreground">Financed</div><div className="font-semibold">${financed.toFixed(2)}</div></div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                )}
                              </button>
                            );
                          })()}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No payment method configured. Contact support.</p>
                      )}

                      {/* FlexPay CTA for users without account */}
                      {!flexpayAccount && (
                        <Link to="/flexpay" className="block rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 text-sm hover:bg-primary/10 transition-colors">
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-primary" />
                            <span className="font-semibold text-foreground">Want to pay later?</span>
                            <span className="text-muted-foreground">Apply for a Dynime FlexPay credit limit →</span>
                          </div>
                        </Link>
                      )}

                      <button type="button" onClick={() => setShowCoupon((v) => !v)}
                        className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                        <Tag className="w-3.5 h-3.5" />
                        {appliedCoupon ? `Coupon ${appliedCoupon.code} applied` : "Have a coupon?"}
                      </button>
                      <AnimatePresence initial={false}>
                        {showCoupon && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="flex gap-2 pt-1">
                              <Input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="ENTER CODE" />
                              <Button onClick={applyCoupon} disabled={couponLoading || !coupon.trim()} variant="outline">
                                {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                              </Button>
                            </div>
                            {appliedCoupon && (
                              <div className="text-xs text-emerald-600 flex items-center gap-2 mt-2">
                                <CheckCircle2 className="w-3.5 h-3.5" /> {appliedCoupon.code} — −${appliedCoupon.discount.toFixed(2)}
                                <button className="underline ml-1" onClick={() => { setAppliedCoupon(null); setCoupon(""); }}>remove</button>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                        Secure SSL · invoice & account link emailed after payment.
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              <div className="flex items-center justify-between mt-5">
                <Button variant="ghost" onClick={goBack} disabled={step === "cart"}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                {step !== "pay" ? (
                  <Button variant="hero" onClick={goNext} disabled={!canNext}>
                    Continue <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button variant="hero" size="lg" onClick={submit} disabled={submitting || !gateway || (gateway === "flexpay" && (!flexpayTenure || chargeNow > flexpayAvailable))}>
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                    {gateway === "flexpay"
                      ? `Finance $${chargeNow.toFixed(2)} with FlexPay`
                      : isBkash ? `Pay ৳${bdtTotal.toFixed(2)} BDT` : `Pay $${chargeNow.toFixed(2)}`}
                    {appliedCoupon?.is_milestone && <span className="ml-2 text-xs opacity-80">(advance)</span>}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
      {bankDeposit && (
        <BankDepositDialog
          open={bankDeposit.open}
          onClose={() => { setBankDeposit(null); navigate("/services"); }}
          orderNumber={bankDeposit.orderNumber}
          amount={bankDeposit.amount}
          accounts={bankDeposit.accounts}
          instructions={bankDeposit.instructions}
          displayName={bankDeposit.displayName}
          customerEmail={bankDeposit.customerEmail}
        />
      )}
      {PaymentResultDialog}
      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        defaultEmail={details.email}
        title="Sign in to continue checkout"
        description="Sign in to use FlexPay, link this order to your account, and pre-fill your details — no page reload."
      />
    </Layout>
  );
};

export default Checkout;

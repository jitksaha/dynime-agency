import React, { useEffect, useMemo, useState, useRef } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { db } from "@/integrations/db/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AuthDialog from "@/components/auth/AuthDialog";
import { useAuth } from "@/hooks/use-auth";
import { ELIGIBLE_COUNTRIES, isCountryEligible } from "@/data/eligible-countries";
import { useCountryEligibility } from "@/hooks/use-cms-data";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  ArrowLeft, ArrowRight, ShoppingCart, User, CreditCard, Wallet,
  CheckCircle2, Trash2, Tag, Loader2, ShieldCheck, Sparkles, ChevronDown,
  Copy, HelpCircle, Lock, AlertTriangle, Info, Check, ChevronsUpDown,
} from "lucide-react";
import SiteLogo from "@/components/shared/SiteLogo";
import { getFeePercentForTenure } from "@/lib/flexpay-fees";
import payIconSslcommerz from "@/assets/pay-sslcommerz.webp";
import payIconBkash from "@/assets/pay-bkash.webp";
import payIconDodo from "@/assets/pay-dodo.webp";
import payIconBank from "@/assets/pay-bank.webp";
import payIconKeeal from "@/assets/pay-keeal.png";
import payIconApplePay from "@/assets/pay-apple-pay.png";
import payIconGooglePay from "@/assets/pay-google-pay.png";
import { motion, AnimatePresence } from "framer-motion";
import BankDepositDialog, { type BankAccount } from "@/components/checkout/BankDepositDialog";
import { getServiceBySlug } from "@/data/services";
import { usePageSEO } from "@/hooks/use-page-seo";
import { useExchangeRates } from "@/hooks/use-exchange-rates";
import { computeTax, useTaxSettings } from "@/lib/tax";
import { apiGet, apiPost } from "@/lib/api";
import { getReferralCode } from '@/components/shared/ReferralTracker';
import { COUNTRY_DIAL_CODES } from "@/data/country-dial-codes";

type StepKey = "cart" | "contact" | "pay";
type MilestoneStage = { label: string; percent: number; amount: number };

const STEPS: { key: StepKey; label: string; icon: any }[] = [
  { key: "cart", label: "Cart", icon: ShoppingCart },
  { key: "contact", label: "Contact", icon: User },
  { key: "pay", label: "Pay", icon: CreditCard },
];

const COUNTRIES_FALLBACK = ELIGIBLE_COUNTRIES;

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

type CategoryKey = "dws" | "des" | "dms" | "dcs" | "dss";

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
  des: {
    title: "E-Commerce project details",
    subtitle: "A few details so our e-commerce team can start planning your store.",
    fields: [
      { key: "store_type", label: "E-Commerce Platform Choice", type: "select", options: ["Shopify", "WordPress (WooCommerce, Surecart, etc.)", "Node.js / MERN (React, Next.js, Nest)", "Laravel", "Not sure — recommend"], placeholder: "Select platform option", required: true },
      { key: "existing_site", label: "Existing website / store URL (if any)", type: "url", placeholder: "https://example.com" },
      { key: "product_count", label: "Approximate number of products", type: "select", options: ["1 – 10", "11 – 100", "101 – 1000", "1000+"], placeholder: "Select product count" },
      { key: "brief", label: "Store details & goals", type: "textarea", placeholder: "Describe your store, target audience, payment gateways, custom features needed, etc." },
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

const JurisdictionDropdown = ({
  value,
  onChange,
  options,
  placeholder,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  id?: string;
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const s = search.toLowerCase();
    return options.filter(opt => opt.toLowerCase().includes(s));
  }, [options, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal mt-1 border-input bg-background h-10 px-3 py-2 text-sm"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || placeholder || "Select jurisdiction..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width] min-w-[280px]" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search jurisdiction..."
            value={search}
            onValueChange={setSearch}
            className="h-9"
          />
          <CommandList className="max-h-[250px] overflow-y-auto">
            <CommandEmpty>No jurisdiction found.</CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((opt) => (
                <CommandItem
                  key={opt}
                  value={opt}
                  onSelect={() => {
                    onChange(opt);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="cursor-pointer text-xs"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === opt ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span>{opt}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const CardLogos = () => (
  <div className="flex items-center gap-1">
    {/* Visa */}
    <div className="h-4 w-6 rounded bg-white border border-border/40 flex items-center justify-center p-0.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <svg viewBox="0 7 24 10" className="h-2.5 w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9.112 8.262L5.97 15.758H3.92L2.374 9.775c-.094-.368-.175-.503-.461-.658C1.447 8.864.677 8.627 0 8.479l.046-.217h3.3a.904.904 0 01.894.764l.817 4.338 2.018-5.102zm8.033 5.049c.008-1.979-2.736-2.088-2.717-2.972.006-.269.262-.555.822-.628a3.66 3.66 0 011.913.336l.34-1.59a5.207 5.207 0 00-1.814-.333c-1.917 0-3.266 1.02-3.278 2.479-.012 1.079.963 1.68 1.698 2.04.756.367 1.01.603 1.006.931-.005.504-.602.725-1.16.734-.975.015-1.54-.263-1.992-.473l-.351 1.642c.453.208 1.289.39 2.156.398 2.037 0 3.37-1.006 3.377-2.564m5.061 2.447H24l-1.565-7.496h-1.656a.883.883 0 00-.826.55l-2.909 6.946h2.036l.405-1.12h2.488zm-2.163-2.656l1.02-2.815.588 2.815zm-8.16-4.84l-1.603 7.496H8.34l1.605-7.496z" fill="#1A1F71"/>
      </svg>
    </div>
    {/* Mastercard */}
    <div className="h-4 w-6 rounded bg-white border border-border/40 flex items-center justify-center p-0.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <svg viewBox="0 0 24 15" className="h-2.5 w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="9" cy="7.5" r="5.5" fill="#EB001B"/>
        <circle cx="15" cy="7.5" r="5.5" fill="#F79E1B" fillOpacity="0.8"/>
      </svg>
    </div>
    {/* Amex */}
    <div className="h-4 w-6 rounded bg-[#1070d2] border border-[#1070d2] flex items-center justify-center p-0.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <span className="text-[5px] font-black text-white tracking-tighter">AMEX</span>
    </div>
    {/* JCB */}
    <div className="h-4 w-6 rounded bg-white border border-border/40 flex items-center justify-center p-0.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <svg viewBox="0 8.5 24 7" className="h-2.5 w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M13.05 9.8643c.9723.0736 1.7257.3671 2.3545.6843v-1.31s-1.2577-.3162-2.4408-.368c-4.1256-.1849-5.295 1.4344-5.295 3.1292 0 1.6947 1.1694 3.3145 5.295 3.1296 1.1831-.0536 2.4408-.3694 2.4408-.3694v-1.3086c-.6193.3081-1.3826.6107-2.3545.683-1.6793.1272-2.6898-.6907-2.6898-2.1342 0-1.4448 1.0105-2.2613 2.6898-2.1354m7.685 4.1223c-.0513.0105-.1581.02-.215.02h-1.8005V12.376H20.52c.0568 0 .1636.01.2149.02a.8056.8056 0 01.6325.7951c0 .4162-.2872.721-.6325.796zm-2.0155-4.0374h1.6325c.059 0 .1454.0077.1772.0137.3376.0572.6256.3307.6256.7392 0 .409-.288.6815-.626.7392a1.571 1.571 0 01-.1773.0137h-1.6311V9.9506zm3.4994 1.9856v-.0364c.9133-.1331 1.4149-.726 1.4149-1.4199 0-.8828-.7343-1.3916-1.7293-1.4416-.0772-.0032-.203-.011-.3044-.011h-5.3323v5.9467h5.7548c1.13 0 1.9774-.6043 1.9774-1.5466 0-.8701-.7724-1.4222-1.781-1.4917zm-17.8644.6788c0 .8787-.5906 1.5311-1.6656 1.5311-.917 0-1.8174-.2726-2.6889-.6938V14.76s1.4021.383 3.191.383c2.9714 0 3.8374-1.125 3.8374-2.529V9.0266H4.3541v3.5876Z" fill="#0F766E"/>
      </svg>
    </div>
  </div>
);

// Express wallet icon components using real brand logos
const ApplePayButton = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center justify-center h-11 w-full bg-black hover:bg-black/90 active:bg-black/80 transition-colors rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-1 overflow-hidden"
    aria-label="Pay with Apple Pay"
  >
    <img src={payIconApplePay} alt="Apple Pay" className="h-6 w-auto object-contain" style={{ filter: 'invert(1)' }} />
  </button>
);

const GooglePayButton = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center justify-center h-11 w-full bg-white hover:bg-gray-50 active:bg-gray-100 border border-gray-200 transition-colors rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1 overflow-hidden"
    aria-label="Pay with Google Pay"
  >
    <img src={payIconGooglePay} alt="Google Pay" className="h-6 w-auto object-contain" />
  </button>
);

const extractErrorMessage = (err: any): string => {
  if (err?.response?.data?.errors) {
    const errors = err.response.data.errors;
    const messages = Object.values(errors).flat();
    if (messages.length > 0) {
      return messages.join(" ");
    }
  }
  if (err?.response?.data?.message) {
    return err.response.data.message;
  }
  return err?.message || "An unexpected error occurred";
};

const Checkout = () => {
  const { items, removeItem, updateQuantity, total, clearCart } = useCart();
  const navigate = useNavigate();
  const { rateFor } = useExchangeRates();
  const [searchParams, setSearchParams] = useSearchParams();
  const paymentResult = searchParams.get("payment") as "success" | "failed" | "cancelled" | null;
  usePageSEO("checkout");

  // Dynamic country list from the database
  const { data: countryEligibilityRows } = useCountryEligibility();
  const COUNTRIES = useMemo(() => {
    if (!countryEligibilityRows || countryEligibilityRows.length === 0) return COUNTRIES_FALLBACK;
    return countryEligibilityRows
      .filter((r: any) => r.status === 'eligible' && r.is_active)
      .map((r: any) => r.name)
      .sort();
  }, [countryEligibilityRows]);

  const JURISDICTIONS = useMemo(() => {
    const usStates = [
      "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", 
      "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", 
      "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", 
      "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", 
      "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", 
      "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", 
      "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
    ];
    
    const usJurisdictions = usStates.map(state => `United States — ${state}`);
    
    // Sort usJurisdictions, keeping Delaware and Wyoming on top since they are the most popular
    const sortedUsJurisdictions = [
      "United States — Delaware",
      "United States — Wyoming",
      ...usJurisdictions.filter(j => j !== "United States — Delaware" && j !== "United States — Wyoming").sort()
    ];
    
    // Get all countries from database except US (which is covered by states) and UK (which has a dedicated option)
    const countryList = countryEligibilityRows
      ? countryEligibilityRows
          .filter((r: any) => r.is_active && r.name !== "United States" && r.name !== "United Kingdom")
          .map((r: any) => r.name)
      : ["Singapore", "Canada", "Germany", "Ireland", "Australia", "New Zealand", "Estonia", "Hong Kong", "United Arab Emirates", "Cayman Islands", "British Virgin Islands"];

    const otherJurisdictions = [...countryList].sort();
    
    return [
      ...sortedUsJurisdictions,
      "United Kingdom",
      ...otherJurisdictions,
      "Other"
    ];
  }, [countryEligibilityRows]);

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

  // Stripe On-Site Payment states
  const [cardholderName, setCardholderName] = useState("");
  const [stripeInstance, setStripeInstance] = useState<any>(null);
  const [cardElementInstance, setCardElementInstance] = useState<any>(null);
  const [expressAvailable, setExpressAvailable] = useState(false);
  const [paymentRequestInstance, setPaymentRequestInstance] = useState<any>(null);

  // Fetch public settings for Stripe publishable keys & sandbox status
  const { data: publicSettings } = useQuery({
    queryKey: ["public-settings-checkout"],
    queryFn: async () => {
      return await apiGet<Record<string, any>>("/site-settings");
    },
  });

  const stripePublishableKey = useMemo(() => {
    if (!publicSettings) return null;
    const cleanValue = (val: any) => typeof val === "string" ? val.replace(/^"|"$/g, "") : String(val);
    const sandboxVal = cleanValue(publicSettings.stripe_sandbox);
    const isSandbox = sandboxVal === "true" || sandboxVal === "1";
    const key = isSandbox ? publicSettings.stripe_test_publishable_key : publicSettings.stripe_publishable_key;
    if (!key) return null;
    const cleanedKey = cleanValue(key);
    // Validate key format: must start with pk_ and be at least 90 chars
    if (!cleanedKey.startsWith("pk_") || cleanedKey.length < 90) {
      console.warn("[Stripe] Publishable key appears invalid or truncated. Please update it in Payment Gateways settings.");
      return null;
    }
    return cleanedKey;
  }, [publicSettings]);

  // Load Stripe.js CDN
  useEffect(() => {
    const scriptId = "stripe-js-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://js.stripe.com/v3/";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Instantiate Stripe
  useEffect(() => {
    if (!stripePublishableKey) return;
    const checkStripe = () => {
      const stripeWindow = (window as any).Stripe;
      if (stripeWindow) {
        try {
          setStripeInstance(stripeWindow(stripePublishableKey));
        } catch (err) {
          console.error("[Stripe] Failed to initialize Stripe.js with publishable key:", err);
        }
      } else {
        setTimeout(checkStripe, 100);
      }
    };
    checkStripe();
  }, [stripePublishableKey]);


  const [bankDeposit, setBankDeposit] = useState<{
    open: boolean;
    orderNumber: string;
    amount: number;
    accounts: BankAccount[];
    instructions?: string;
    displayName?: string;
    customerEmail?: string;
  } | null>(null);

  const { user, signIn } = useAuth();
  const queryClient = useQueryClient();
  const [authOpen, setAuthOpen] = useState(false);
  const [createAccount, setCreateAccount] = useState(true);
  const [accountPassword, setAccountPassword] = useState("");
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);
  const [emailExists, setEmailExists] = useState<boolean | null>(null);

  const [dialCode, setDialCode] = useState("+1");
  const [selectedCountryCode, setSelectedCountryCode] = useState("US");
  const [openDial, setOpenDial] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");

  // Sync dialCode + phoneInput to details.phone
  useEffect(() => {
    const trimmedInput = phoneInput.trim();
    setDetails((d) => ({
      ...d,
      phone: trimmedInput ? `${dialCode} ${trimmedInput}` : "",
    }));
  }, [dialCode, phoneInput]);

  // IP GeoIP lookup on mount
  useEffect(() => {
    fetch("https://ipapi.co/json/")
      .then((res) => res.json())
      .then((data) => {
        if (data.country_calling_code) {
          setDialCode(data.country_calling_code);
          if (data.country) {
            setSelectedCountryCode(data.country);
          }
          if (data.country_name) {
            setDetails((d) => ({
              ...d,
              country: data.country_name,
            }));
          }
        }
      })
      .catch((err) => console.error("IP lookup failed:", err));
  }, []);

  const currentCountry = useMemo(() => {
    return COUNTRY_DIAL_CODES.find(
      (c) => c.code.toUpperCase() === selectedCountryCode.toUpperCase()
    ) || COUNTRY_DIAL_CODES.find(
      (c) => c.dial_code === dialCode
    ) || COUNTRY_DIAL_CODES[0];
  }, [dialCode, selectedCountryCode]);

  // Debounced abandoned cart tracking
  useEffect(() => {
    const email = details.email.trim();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return;

    const timer = setTimeout(async () => {
      try {
        await apiPost<any>("/checkout/track", {
          email,
          name: details.full_name,
          phone: details.phone,
          cart_data: items.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
          checkout_details: {
            company: details.company,
            line1: details.line1,
            city: details.city,
            state: details.state,
            postal_code: details.postal_code,
            country: details.country,
          },
        });
      } catch (err) {
        console.error("Failed to track checkout details:", err);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [details.email, details.full_name, details.phone, items]);

  // Debounced email check to verify if account already exists
  useEffect(() => {
    const trimmed = details.email.trim();
    if (!trimmed || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
      setEmailExists(null);
      setEmailCheckLoading(false);
      return;
    }

    setEmailCheckLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/auth/check-email?email=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json() as { exists: boolean };
          setEmailExists(data.exists);
        }
      } catch (err) {
        console.error("Failed to check email existence:", err);
      } finally {
        setEmailCheckLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [details.email]);

  // Pre-fill from logged-in user and refetch user-scoped data on sign-in.
  useEffect(() => {
    if (!user) return;
    setDetails((d) => ({
      ...d,
      email: d.email || user.email || "",
      full_name: d.full_name || (user.user_metadata?.full_name as string) || "",
    }));

    // Fetch user profile from Laravel to get saved billing address if any
    apiGet<any>("/auth/me")
      .then((res) => {
        if (res && res.billing_address) {
          const addr = res.billing_address;
          setDetails((d) => ({
            ...d,
            line1: addr.line1 || d.line1,
            city: addr.city || d.city,
            state: addr.state || d.state,
            postal_code: addr.postal_code || d.postal_code,
            country: addr.country || d.country,
            phone: addr.phone || d.phone,
            company: addr.company || d.company,
          }));
          if (addr.phone) {
            const parts = addr.phone.trim().split(" ");
            if (parts.length > 1 && parts[0].startsWith("+")) {
              setDialCode(parts[0]);
              setPhoneInput(parts.slice(1).join(" "));
            } else {
              setPhoneInput(addr.phone);
            }
          }
        }
      })
      .catch((err) => console.error("Failed to load user profile address:", err));

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
      const settings = await apiGet<Record<string, any>>("/site-settings");
      const cleanValue = (val: any) => typeof val === "string" ? val.replace(/^"|"$/g, "") : String(val ?? "");
      const ids = ["keeal", "dodopayment", "sslcommerz", "bkash", "bank_transfer", "stripe", "stripe_onsite"];
      const defaultMeta: Record<string, { label: string; desc: string }> = {
        keeal: { label: "Keeal", desc: "Pay securely via Keeal hosted checkout." },
        stripe: { label: "Stripe Checkout", desc: "Pay using Stripe secure hosted checkout." },
        stripe_onsite: { label: "Credit Card", desc: "Pay directly using your credit or debit card." },
        sslcommerz: { label: "SSLCommerz", desc: "BD cards & mobile banking." },
        bkash: { label: "bKash", desc: "Mobile wallet (auto BDT)." },
        dodopayment: { label: "DodoPayment", desc: "Cards, Apple & Google Pay." },
        bank_transfer: { label: "Bank Transfer", desc: "Direct deposit, manual." },
      };

      // Read admin-customized label and description overrides
      const meta: Record<string, { label: string; desc: string }> = {};
      for (const id of ids) {
        const customLabel = cleanValue(settings[`gateway_label_${id}`]);
        const customDesc = cleanValue(settings[`gateway_desc_${id}`]);
        meta[id] = {
          label: customLabel || defaultMeta[id].label,
          desc: customDesc || defaultMeta[id].desc,
        };
      }
      
      const enabledIds: string[] = [];
      ids.forEach((id) => {
        if (id === "stripe") {
          const hosted = settings["stripe_hosted_enabled"] !== undefined 
            ? cleanValue(settings["stripe_hosted_enabled"]) === "true"
            : cleanValue(settings["stripe_enabled"]) === "true";
          if (hosted) enabledIds.push(id);
        } else if (id === "stripe_onsite") {
          const onsite = settings["stripe_onsite_enabled"] !== undefined
            ? cleanValue(settings["stripe_onsite_enabled"]) === "true"
            : cleanValue(settings["stripe_enabled"]) === "true";
          if (onsite) enabledIds.push(id);
        } else if (cleanValue(settings[`${id}_enabled`]) === "true") {
          enabledIds.push(id);
        }
      });

      // Apply admin-defined ordering (stored as JSON array of gateway IDs)
      let orderedIds = enabledIds;
      try {
        const raw = settings["gateway_order"];
        let orderArr: string[] = [];
        if (Array.isArray(raw)) {
          orderArr = raw;
        } else if (typeof raw === "string" && raw) {
          let parsed = raw.replace(/^"|"$/g, "");
          if (parsed.startsWith("[")) {
            const dec = JSON.parse(parsed);
            if (Array.isArray(dec)) orderArr = dec;
          }
        }
        if (orderArr.length > 0) {
          const orderMap = new Map(orderArr.map((id, i) => [id, i]));
          orderedIds = [...enabledIds].sort((a, b) => {
            const ai = orderMap.has(a) ? orderMap.get(a)! : 999;
            const bi = orderMap.has(b) ? orderMap.get(b)! : 999;
            return ai - bi;
          });
        }
      } catch (err) {
        console.error("Error parsing gateway_order", err);
      }
      
      return orderedIds.map((id) => ({ id, ...meta[id] }));
    },
  });

  // FlexPay — only available to logged-in customers with an active credit account
  const { data: flexpaySettings } = useQuery({
    queryKey: ["flexpay-settings-checkout"],
    queryFn: async () => {
      const { data } = await db.from("flexpay_settings").select("*").eq("id", 1).maybeSingle();
      return data;
    },
  });
  const { data: flexpayAccount, refetch: refetchFlexAccount } = useQuery({
    queryKey: ["flexpay-account-checkout"],
    queryFn: async () => {
      const { data: u } = await db.auth.getUser();
      if (!u?.user) return null;
      const { data } = await db
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

  // Keep refs of form values to prevent Stripe Elements from reloading/unmounting when user types
  const detailsRef = React.useRef(details);
  const briefNoteRef = React.useRef(briefNote);
  const appliedCouponRef = React.useRef(appliedCoupon);
  const taxBreakdownRef = React.useRef(taxBreakdown);
  const milestoneStagesRef = React.useRef(milestoneStages);
  const finalTotalRef = React.useRef(finalTotal);

  React.useEffect(() => {
    detailsRef.current = details;
  }, [details]);
  React.useEffect(() => {
    briefNoteRef.current = briefNote;
  }, [briefNote]);
  React.useEffect(() => {
    appliedCouponRef.current = appliedCoupon;
  }, [appliedCoupon]);
  React.useEffect(() => {
    taxBreakdownRef.current = taxBreakdown;
  }, [taxBreakdown]);
  React.useEffect(() => {
    milestoneStagesRef.current = milestoneStages;
  }, [milestoneStages]);
  React.useEffect(() => {
    finalTotalRef.current = finalTotal;
  }, [finalTotal]);

  // 1. Mount Card Element when stripeInstance is available and gateway === "stripe_onsite"
  React.useEffect(() => {
    if (!stripeInstance || gateway !== "stripe_onsite") {
      if (cardElementInstance) {
        try { cardElementInstance.destroy(); } catch {}
        setCardElementInstance(null);
      }
      return;
    }

    const elements = stripeInstance.elements();
    const card = elements.create("card", {
      style: {
        base: {
          color: "hsl(var(--foreground))",
          fontFamily: 'Inter, sans-serif',
          fontSmoothing: "antialiased",
          fontSize: "14px",
          "::placeholder": {
            color: "hsl(var(--muted-foreground))",
          },
        },
        invalid: {
          color: "hsl(var(--destructive))",
          iconColor: "hsl(var(--destructive))",
        },
      },
    });

    const timer = setTimeout(() => {
      const container = document.getElementById("card-element");
      if (container) {
        try {
          card.mount("#card-element");
          setCardElementInstance(card);
        } catch (err) {
          console.warn("Card element mount error:", err);
        }
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      if (card) {
        try { card.destroy(); } catch {}
      }
    };
  }, [stripeInstance, gateway]);

  // 2. Mount Stripe paymentRequest for Express Checkout at the top of checkout page
  React.useEffect(() => {
    if (!stripeInstance) {
      setExpressAvailable(false);
      return;
    }

    const pr = stripeInstance.paymentRequest({
      country: "US",
      currency: "usd",
      total: {
        label: "Dynime Service Order",
        amount: Math.round(chargeNow * 100),
      },
      requestPayerName: true,
      requestPayerEmail: true,
    });

    let prButton: any = null;

    pr.canMakePayment().then((result: any) => {
      if (result) {
        setExpressAvailable(true);
        setPaymentRequestInstance(pr);

        const elements = stripeInstance.elements();
        prButton = elements.create("paymentRequestButton", {
          paymentRequest: pr,
          style: {
            paymentRequestButton: {
              type: "default",
              theme: "dark",
              height: "44px",
            },
          },
        });

        const prTimer = setTimeout(() => {
          const prContainer = document.getElementById("express-payment-request-button");
          if (prContainer) {
            try {
              prButton.mount("#express-payment-request-button");
            } catch (err) {
              console.warn("Express button mount error:", err);
            }
          }
        }, 300);

        return () => {
          clearTimeout(prTimer);
        };
      } else {
        setExpressAvailable(false);
      }
    });

    // Handle payment method completion
    pr.on("paymentmethod", async (ev: any) => {
      try {
        const currentDetails = detailsRef.current;
        const currentAppliedCoupon = appliedCouponRef.current;
        const currentTaxBreakdown = taxBreakdownRef.current;
        const currentMilestoneStages = milestoneStagesRef.current;
        const currentFinalTotal = finalTotalRef.current;
        const currentBriefNote = briefNoteRef.current;

        const r = await apiPost<any>("/orders/public/process-payment", {
          gateway: "stripe_onsite",
          customer_name: ev.payerName || currentDetails.full_name || "Express Customer",
          customer_email: (ev.payerEmail || currentDetails.email || "express@dynime.com").trim().toLowerCase(),
          items: items.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
          total: currentFinalTotal,
          charge_now: chargeNow,
          coupon_code: currentAppliedCoupon?.code || null,
          tax: currentTaxBreakdown.enabled ? {
            amount: currentTaxBreakdown.tax,
            percent: currentTaxBreakdown.percent,
            mode: currentTaxBreakdown.mode,
            label: currentTaxBreakdown.label,
          } : null,
          milestone: currentAppliedCoupon?.is_milestone ? {
            mode: currentAppliedCoupon.milestone_mode,
            stages: currentMilestoneStages,
            total: currentFinalTotal,
          } : null,
          billing_address: {
            line1: ev.shippingAddress?.addressLine?.[0] || currentDetails.line1 || "Express Billing",
            city: ev.shippingAddress?.city || currentDetails.city || "Express City",
            state: ev.shippingAddress?.region || currentDetails.state || "Express State",
            postal_code: ev.shippingAddress?.postalCode || currentDetails.postal_code || "00000",
            country: ev.shippingAddress?.country || currentDetails.country || "United States",
            company: currentDetails.company,
            tax_id: currentDetails.tax_id,
            phone: ev.payerPhone || currentDetails.phone,
          },
          notes: currentBriefNote,
          currency: "USD",
          referral_code: getReferralCode() || undefined,
        });

        if (!r?.client_secret) {
          throw new Error("Could not initialize Stripe PaymentIntent");
        }

        const { error: confirmError } = await stripeInstance.confirmCardPayment(
          r.client_secret,
          { payment_method: ev.paymentMethod.id },
          { handleActions: false }
        );

        if (confirmError) {
          ev.complete("fail");
          toast.error(confirmError.message);
        } else {
          ev.complete("success");
          clearCart();
          window.location.assign(`/invoice/${r.session_id || r.order_id || ""}`);
        }
      } catch (err: any) {
        ev.complete("fail");
        toast.error(extractErrorMessage(err) || "Express checkout failed");
      }
    });

    return () => {
      if (prButton) {
        try { prButton.destroy(); } catch {}
      }
    };
  }, [stripeInstance, chargeNow, step]);

  const handleExpressPay = (method: "apple" | "google") => {
    // If Stripe PaymentRequest is available, show native wallet sheet immediately
    if (paymentRequestInstance) {
      try {
        paymentRequestInstance.show();
        return;
      } catch (err) {
        console.warn("PaymentRequest.show() failed, falling back to manual flow", err);
      }
    }

    // Fallback: pre-fill details and jump to manual card entry step
    setDetails((prev) => ({
      ...prev,
      full_name: prev.full_name.trim() || `${method === "apple" ? "Apple" : "Google"} Pay User`,
      email: prev.email.trim() || `${method}-user@example.com`,
    }));

    if (!user) {
      setCreateAccount(true);
      if (!accountPassword) {
        setAccountPassword("SecurePass123!");
      }
    }

    setGateway("stripe_onsite");
    setStep("pay");
    toast.info(`${method === "apple" ? "Apple Pay" : "Google Pay"} is not available in this browser. Please use your card.`);

    setTimeout(() => {
      const el = document.getElementById("card-element");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 500);
  };

  const canNext = useMemo(() => {
    if (step === "cart") return items.length > 0;
    if (step === "contact") {
      const baseValid = details.full_name.trim().length > 1 &&
        /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(details.email) &&
        phoneInput.trim().length > 4;
      if (!baseValid) return false;

      // Enforce validation for new registration users
      if (!user) {
        if (emailExists === true) return false; // Must sign in instead of ordering as guest
        if (createAccount) {
          if (!accountPassword || accountPassword.length < 8) return false; // Must provide 8+ char password
        }
      }

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
  }, [step, items, details, isConsultancyBooking, bookingDate, bookingTime, categoriesInCart, categoryDetails, user, createAccount, accountPassword, emailExists]);

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
      const { data, error } = await db.rpc("validate_coupon", {
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
      toast.error(extractErrorMessage(err) || "Could not validate coupon");
    } finally {
      setCouponLoading(false);
    }
  };

  const submit = async () => {
    if (!gateway) { toast.error("Choose a payment method"); return; }

    const includedFeatures = items.reduce((acc, item) => {
      if (item.features && Array.isArray(item.features)) {
        return [...acc, ...item.features];
      }
      return acc;
    }, [] as string[]);

    const finalFeatures = includedFeatures.length > 0 
      ? includedFeatures 
      : (primaryService && Array.isArray(primaryService.features) ? primaryService.features : []);

    // FlexPay branch — uses approved credit limit, no external gateway
    if (gateway === "flexpay") {
      const { data: u } = await db.auth.getUser();
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
          included_services: finalFeatures,
        };
        const billingAddress = {
          line1: details.line1, city: details.city, state: details.state,
          postal_code: details.postal_code, country: details.country, company: details.company,
          tax_id: details.tax_id, phone: details.phone,
        };
        const { data, error } = await db.rpc("flexpay_checkout", {
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
        toast.error(extractErrorMessage(err) || "Could not complete FlexPay checkout");
      } finally {
        setSubmitting(false);
      }
      return;
    }
    setSubmitting(true);
    try {
      // 1. Automatic Account Creation & Login for Guest users if selected
      if (!user && createAccount) {
        if (!accountPassword || accountPassword.length < 8) {
          throw new Error("Password must be at least 8 characters long");
        }
        toast.loading("Creating your secure account…", { id: "checkout-auth" });
        try {
          await apiPost<any>("/auth/register", {
            email: details.email.trim().toLowerCase(),
            password: accountPassword,
            full_name: details.full_name,
          });
          const loginRes = await signIn(details.email.trim().toLowerCase(), accountPassword);
          if (loginRes.error) {
            throw new Error(loginRes.error);
          }
          toast.success("Account created and logged in!", { id: "checkout-auth" });
        } catch (err: any) {
          toast.error(extractErrorMessage(err) || "Failed to create account. Please check your password or use a different email.", { id: "checkout-auth" });
          setSubmitting(false);
          return;
        }
      }

      // Stripe Onsite branch
      if (gateway === "stripe_onsite") {
        if (!stripeInstance) {
          throw new Error("Stripe could not initialize. The Stripe publishable key may be missing or invalid — please contact support or update the key in Payment Gateway settings.");
        }
        if (!cardElementInstance) {
          throw new Error("Stripe card element has not loaded. Please wait or refresh the page.");
        }
        if (!cardholderName.trim()) {
          throw new Error("Please enter Cardholder Name.");
        }

        setSubmitting(true);
        toast.loading("Processing card payment...", { id: "stripe-onsite-pay" });

        try {
          const r = await apiPost<any>("/orders/public/process-payment", {
            gateway: "stripe_onsite",
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
              included_services: finalFeatures,
            },
            billing_address: {
              line1: details.line1, city: details.city, state: details.state,
              postal_code: details.postal_code, country: details.country, company: details.company,
              tax_id: details.tax_id, phone: details.phone,
            },
            notes: briefNote,
            currency: "USD",
            referral_code: getReferralCode() || undefined,
          });

          if (!r?.client_secret) {
            throw new Error("Could not initialize Stripe PaymentIntent");
          }

          const { error: confirmError, paymentIntent } = await stripeInstance.confirmCardPayment(
            r.client_secret,
            {
              payment_method: {
                card: cardElementInstance,
                billing_details: {
                  name: cardholderName.trim(),
                  email: details.email.trim().toLowerCase(),
                  address: {
                    line1: details.line1 || undefined,
                    city: details.city || undefined,
                    state: details.state || undefined,
                    postal_code: details.postal_code || undefined,
                    country: details.country || undefined,
                  },
                },
              },
            }
          );

          if (confirmError) {
            throw new Error(confirmError.message);
          }

          if (paymentIntent && paymentIntent.status === "succeeded") {
            toast.success("Payment succeeded!", { id: "stripe-onsite-pay" });
            clearCart();
            window.location.assign(`/invoice/${r.session_id || r.order_id || ""}`);
            return;
          } else {
            throw new Error("Payment is pending confirmation.");
          }
        } catch (err: any) {
          toast.error(extractErrorMessage(err) || "Card payment failed", { id: "stripe-onsite-pay" });
        } finally {
          setSubmitting(false);
        }
        return;
      }

      const r = await apiPost<any>("/orders/public/process-payment", {
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
          included_services: finalFeatures,
        },
        billing_address: {
          line1: details.line1, city: details.city, state: details.state,
          postal_code: details.postal_code, country: details.country, company: details.company,
          tax_id: details.tax_id, phone: details.phone,
        },
        notes: briefNote,
        currency: "USD",
        referral_code: getReferralCode() || undefined,
        success_url: `${window.location.origin}/checkout?payment=success`,
        cancel_url: `${window.location.origin}/checkout?payment=cancelled`,
      });
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
      toast.error(extractErrorMessage(err) || "Checkout failed");
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
      <Layout hideFooter={true}>
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
    <Layout hideFooter={true}>
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
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">You are paying</div>
                  <div className="font-heading text-2xl md:text-3xl font-bold text-foreground mt-0.5 whitespace-nowrap">
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
                    <div className="shrink-0 flex flex-col items-end text-right max-w-[180px] min-w-0">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">Pay with</span>
                      <Select value={gateway} onValueChange={setGateway}>
                        <SelectTrigger className="mt-0.5 h-auto py-1 px-2 bg-card border border-border rounded-md text-xs font-semibold gap-1.5 w-full max-w-[180px] min-w-0">
                          <CreditCard className="w-3.5 h-3.5 text-primary shrink-0" />
                          <div className="truncate"><SelectValue placeholder="Choose gateway" /></div>
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
              <div className="flex items-center justify-between w-full pb-3 border-b border-border">
                {STEPS.map((s, i) => {
                  const done = i < currentIdx;
                  const active = i === currentIdx;
                  const Icon = s.icon;
                  return (
                    <React.Fragment key={s.key}>
                      <div className={`flex items-center gap-2 shrink-0 ${active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground"}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 flex-shrink-0 transition-all duration-200 ${active ? "border-primary bg-primary/10" : done ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}>
                          {done ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
                        </div>
                        <div className="hidden sm:block text-xs font-semibold">{s.label}</div>
                      </div>
                      {i < STEPS.length - 1 && (
                        <div className="flex-1 h-px mx-4 bg-border relative">
                          <div className={`absolute inset-0 bg-primary transition-all duration-300 ${done ? "w-full" : "w-0"}`} />
                        </div>
                      )}
                    </React.Fragment>
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
                      {/* Contact form starts directly */}

                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="font-heading text-xl md:text-2xl font-bold">How do we reach you?</h2>
                          <p className="text-sm text-muted-foreground">Just two fields — we'll email your invoice & account link.</p>
                        </div>
                        {!user && (
                          <div className="text-right flex-shrink-0 pt-1">
                            <span className="block text-xs text-muted-foreground font-medium">Have an account?</span>
                            <button
                              type="button"
                              onClick={() => setAuthOpen(true)}
                              className="text-sm font-bold text-primary hover:underline hover:text-primary/90 transition-colors"
                            >
                              Sign In
                            </button>
                          </div>
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
                          <div className="relative">
                            <Input id="ce" type="email" autoComplete="email" inputMode="email"
                              placeholder="you@company.com"
                              value={details.email}
                              onChange={(e) => setDetails({ ...details, email: e.target.value })}
                              className={cn(
                                "pr-10",
                                emailExists === true && "border-amber-500 focus-visible:ring-amber-500",
                                emailExists === false && "border-emerald-500 focus-visible:ring-emerald-500"
                              )}
                            />
                            {emailCheckLoading && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                              </div>
                            )}
                            {!emailCheckLoading && emailExists === true && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                              </div>
                            )}
                            {!emailCheckLoading && emailExists === false && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <Label htmlFor="phone">Phone number *</Label>
                          <div className="flex mt-1 items-center rounded-md border border-primary/20 bg-background focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all overflow-hidden h-10 w-full">
                            <Popover open={openDial} onOpenChange={setOpenDial}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  className="h-full px-3 gap-1.5 flex items-center justify-between text-sm hover:bg-muted/30 active:bg-muted/50 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none focus:outline-none select-none min-w-[85px] max-w-[110px]"
                                >
                                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                                    <span className="text-base leading-none">{currentCountry?.flag}</span>
                                    <span>{dialCode}</span>
                                  </span>
                                  <ChevronDown className="w-3.5 h-3.5 opacity-50 flex-shrink-0" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[300px] p-0" align="start">
                                <Command>
                                  <CommandInput placeholder="Search country name or code..." className="h-9" />
                                  <CommandList className="max-h-[250px] overflow-y-auto">
                                    <CommandEmpty>No country found.</CommandEmpty>
                                    <CommandGroup>
                                      {COUNTRY_DIAL_CODES.map((c) => (
                                        <CommandItem
                                          key={`${c.code}-${c.dial_code}`}
                                          value={`${c.name} ${c.dial_code} ${c.code}`}
                                          onSelect={() => {
                                            setDialCode(c.dial_code);
                                            setSelectedCountryCode(c.code);
                                            setOpenDial(false);
                                          }}
                                          className="flex items-center justify-between py-2 px-3 cursor-pointer hover:bg-accent text-sm"
                                        >
                                          <span className="flex items-center gap-2">
                                            <span className="text-lg leading-none">{c.flag}</span>
                                            <span className="font-medium">{c.name}</span>
                                          </span>
                                          <span className="text-muted-foreground font-semibold">{c.dial_code}</span>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <div className="h-5 w-px bg-primary/20 flex-shrink-0" />
                            <Input
                              id="phone"
                              type="tel"
                              autoComplete="tel"
                              placeholder="Phone number"
                              value={phoneInput}
                              onChange={(e) => setPhoneInput(e.target.value)}
                              className="flex-1 h-full border-0 rounded-none bg-transparent px-3 py-2 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none focus:outline-none shadow-none focus-visible:border-0 focus:border-0"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Clean Single Notices below the fields */}
                      {!user && !emailCheckLoading && emailExists === true && (
                        <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center justify-between gap-3 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 animate-fade-in">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-500" />
                            <span>This email already has an account. Please sign in or use a different email.</span>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setAuthOpen(true)}
                            className="bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-semibold px-3 py-1.5 h-8 text-xs rounded-lg flex-shrink-0 flex items-center gap-1 border border-amber-600 hover:border-amber-700 transition-colors shadow-sm"
                          >
                            <Lock className="w-3 h-3 mr-1" /> Sign In Now
                          </Button>
                        </div>
                      )}

                      {!user && !emailCheckLoading && emailExists === false && (
                        <div className="space-y-4 bg-muted/20 p-4 rounded-xl border border-border/60 animate-fade-in">
                          <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            <span>New customer email! You can checkout as a guest or create an account.</span>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="guest-toggle" 
                              checked={!createAccount} 
                              onCheckedChange={(checked) => setCreateAccount(!checked)} 
                            />
                            <Label htmlFor="guest-toggle" className="text-sm font-medium cursor-pointer">
                              Checkout as guest instead of creating an account
                            </Label>
                          </div>

                          {createAccount ? (
                            <div className="w-full space-y-1.5 mt-2">
                              <Label htmlFor="create-account-pw" className="text-xs font-semibold text-primary">Choose a password *</Label>
                              <Input 
                                id="create-account-pw" 
                                type="password" 
                                placeholder="Min. 8 characters" 
                                value={accountPassword}
                                onChange={(e) => setAccountPassword(e.target.value)}
                                className="focus-visible:ring-primary border-primary/30 mt-1"
                              />
                              <p className="text-[11px] text-muted-foreground mt-1">
                                Creating an account lets you track your orders, manage services, and access support.
                              </p>
                              {accountPassword.length > 0 && accountPassword.length < 8 && (
                                <p className="text-xs text-rose-500 font-medium mt-1 animate-fade-in">
                                  Password must be at least 8 characters long to proceed.
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                              <span><strong>Guest Checkout:</strong> You won't have a portal account to view or manage your order. Invoices and tracking details will be sent via email.</span>
                            </div>
                          )}
                        </div>
                      )}

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
                                      f.key === "jurisdiction" ? (
                                        <JurisdictionDropdown
                                          id={id}
                                          value={(value as string) || ""}
                                          onChange={(v) => setCatField(cat, f.key, v)}
                                          options={JURISDICTIONS}
                                          placeholder={f.placeholder}
                                        />
                                      ) : (
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
                                      )
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
                              <div><Label>Phone</Label><Input disabled placeholder="Captured in step 2" value={details.phone} className="opacity-70" /></div>
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
                        <div className="border border-border rounded-xl bg-background overflow-hidden divide-y divide-border/60 shadow-sm">
                          {gateways.map((g) => {
                            const imgSrc: Record<string, string> = {
                              keeal: payIconKeeal,
                              sslcommerz: payIconSslcommerz,
                              bkash: payIconBkash,
                              dodopayment: payIconDodo,
                              bank_transfer: payIconBank,
                            };
                            const src = imgSrc[g.id];
                            const selected = gateway === g.id;

                            // Determine the logo/logos on the right
                            let rightContent = null;
                            if (g.id === "stripe_onsite") {
                              rightContent = (
                                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                  <CardLogos />
                                </div>
                              );
                            } else if (g.id === "stripe") {
                              rightContent = (
                                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                  <img src={payIconApplePay} alt="Apple Pay" className="h-4 w-auto object-contain" />
                                  <img src={payIconGooglePay} alt="Google Pay" className="h-4 w-auto object-contain" />
                                  <CardLogos />
                                </div>
                              );
                            } else if (src) {
                              rightContent = (
                                <div className="h-5 flex items-center justify-center overflow-hidden">
                                  <img src={src} alt={g.label} className="h-5 w-auto object-contain" />
                                </div>
                              );
                            } else {
                              rightContent = <CreditCard className="w-4 h-4 text-muted-foreground" />;
                            }

                            return (
                              <div key={g.id} className="transition-colors">
                                {/* Row Header */}
                                <div
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => setGateway(g.id)}
                                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setGateway(g.id); }}
                                  className={cn(
                                    "flex items-center justify-between p-4 cursor-pointer hover:bg-muted/15 select-none focus:outline-none focus:bg-muted/20",
                                    selected && "bg-primary/[0.02]"
                                  )}
                                >
                                  <div className="flex items-center gap-3">
                                    {/* Custom Radio Button */}
                                    <div className="flex-shrink-0">
                                      <div className={cn(
                                        "w-[18px] h-[18px] rounded-full border flex items-center justify-center transition-all",
                                        selected ? "border-primary bg-primary" : "border-muted-foreground/40 bg-background"
                                      )}>
                                        {selected && <div className="w-[8px] h-[8px] rounded-full bg-white" />}
                                      </div>
                                    </div>
                                    
                                    {/* Payment Method Text */}
                                    <div>
                                      <span className="text-sm font-medium text-foreground block">{g.label}</span>
                                      {g.desc && <span className="text-[11px] text-muted-foreground">{g.desc}</span>}
                                    </div>
                                  </div>

                                  {/* Right logos */}
                                  <div className="flex-shrink-0">{rightContent}</div>
                                </div>

                                {/* Selected Content Block (for Credit Card Inputs etc.) */}
                                {selected && g.id === "stripe_onsite" && (
                                  <div className="px-4 pb-5 pt-1 border-t border-border/40 bg-muted/5 space-y-4" onClick={(e) => e.stopPropagation()}>
                                    {/* Credit Card inputs */}
                                    <div className="space-y-3 w-full">
                                      <div>
                                        <Label className="text-xs font-semibold text-muted-foreground mb-1 block">Cardholder Name *</Label>
                                        <Input
                                          placeholder="John Doe"
                                          value={cardholderName}
                                          onChange={(e) => setCardholderName(e.target.value)}
                                          className="bg-background border-border text-sm h-10"
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-xs font-semibold text-muted-foreground mb-1 block">Card Information *</Label>
                                        <div id="card-element" className="p-3 rounded-lg border border-input bg-background">
                                          {/* Stripe unified Card Element will mount here */}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* FlexPay row inside selector */}
                          {flexpayEligible && (() => {
                            const selected = gateway === "flexpay";
                            const insufficient = chargeNow > flexpayAvailable;
                            return (
                              <div className={cn("transition-colors", insufficient && "opacity-60")}>
                                <div
                                  role="button"
                                  tabIndex={insufficient ? -1 : 0}
                                  onClick={() => { if (!insufficient) setGateway("flexpay"); }}
                                  onKeyDown={(e) => { if (!insufficient && (e.key === "Enter" || e.key === " ")) setGateway("flexpay"); }}
                                  className={cn(
                                    "flex items-center justify-between p-4",
                                    insufficient ? "cursor-not-allowed" : "cursor-pointer hover:bg-muted/15 select-none focus:outline-none focus:bg-muted/20",
                                    selected && "bg-primary/[0.02]"
                                  )}
                                >
                                  <div className="flex items-center gap-3">
                                    {/* Custom Radio Button */}
                                    <div className="flex-shrink-0">
                                      <div className={cn(
                                        "w-[18px] h-[18px] rounded-full border flex items-center justify-center transition-all",
                                        selected ? "border-primary bg-primary" : "border-muted-foreground/40 bg-background"
                                      )}>
                                        {selected && <div className="w-[8px] h-[8px] rounded-full bg-white" />}
                                      </div>
                                    </div>
                                    
                                    {/* Payment Method Text */}
                                    <div>
                                      <span className="text-sm font-medium text-foreground block">Dynime FlexPay — Buy Now, Pay Later</span>
                                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                                        Available limit: <span className="font-semibold text-foreground">${flexpayAvailable.toFixed(2)}</span>
                                        {insufficient && <span className="text-destructive ml-1.5">· Not enough for this order</span>}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Right logos */}
                                  <div className="flex-shrink-0 flex items-center gap-1.5">
                                    <Wallet className="w-4 h-4 text-primary" />
                                    <div className="h-5 flex items-center justify-center bg-gradient-to-br from-primary to-primary/60 text-primary-foreground rounded px-2 py-0.5 shadow-[0_1px_2.5px_rgba(0,0,0,0.04)]">
                                      <span className="text-[8px] font-bold tracking-wider">FLEXPAY</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Selected content (Choose tenure) */}
                                {selected && !insufficient && (
                                  <div className="px-4 pb-5 pt-1 border-t border-border/40 bg-muted/5 space-y-4" onClick={(e) => e.stopPropagation()}>
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Choose tenure</p>
                                    <div
                                      className="grid gap-1.5 w-full"
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
                                            onClick={() => setFlexpayTenure(m)}
                                            className={cn(
                                              "p-2.5 rounded-lg border text-center transition-all focus:outline-none",
                                              active ? "border-primary bg-primary/10 text-primary font-semibold shadow-sm"
                                              : "border-border bg-background hover:bg-muted/30 text-muted-foreground hover:text-foreground text-xs"
                                            )}
                                          >
                                            <div className="text-xs font-bold">{m} Months</div>
                                            <div className="text-[9px] mt-0.5 opacity-80">{feePct}% fee</div>
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
                                        <div className="mt-2 rounded-lg bg-muted/20 border border-border/40 p-3 text-xs grid grid-cols-3 gap-2 w-full">
                                          <div><div className="text-muted-foreground text-[10px]">Monthly</div><div className="font-bold text-sm text-foreground">${monthly.toFixed(2)}</div></div>
                                          <div><div className="text-muted-foreground text-[10px]">Fee ({feePct}%)</div><div className="font-semibold text-foreground">${fee.toFixed(2)}</div></div>
                                          <div><div className="text-muted-foreground text-[10px]">Financed</div><div className="font-semibold text-foreground">${financed.toFixed(2)}</div></div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No payment method configured. Contact support.</p>
                      )}

                      {/* Glassmorphic Low-Amount Notice for DodoPayment */}
                      {gateway === "dodopayment" && chargeNow < 0.50 && (
                        <div className="rounded-xl border border-primary/20 bg-primary/5 dark:bg-primary/5 backdrop-blur-md p-4 flex gap-3 items-start text-sm text-foreground/90 animate-fade-in shadow-lg">
                          <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="font-semibold text-foreground">DodoPayment Requirement</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              DodoPayment requires a transaction minimum of <strong className="text-foreground">$0.50 USD</strong>. 
                              Since your current amount is <strong className="text-foreground">${chargeNow.toFixed(2)} USD</strong>, you can add another service to your cart or choose a different payment method (such as SSLCommerz or bKash) to complete your checkout.
                            </p>
                          </div>
                        </div>
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
                  <Button 
                    variant="hero" 
                    size="lg" 
                    onClick={submit} 
                    disabled={
                      submitting || 
                      !gateway || 
                      (gateway === "flexpay" && (!flexpayTenure || chargeNow > flexpayAvailable)) || 
                      (gateway === "dodopayment" && chargeNow < 0.50)
                    }
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : gateway === "dodopayment" && chargeNow < 0.50 ? (
                      <Info className="w-4 h-4 mr-2" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                    )}
                    {gateway === "dodopayment" && chargeNow < 0.50
                      ? "Minimum $0.50 USD required"
                      : gateway === "flexpay"
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

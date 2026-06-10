import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { z } from "zod";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { usePageSEO } from "@/hooks/use-page-seo";
import { apiGet, apiPost } from "@/lib/api";
import {
  ShieldCheck, ArrowLeft, ArrowRight, CheckCircle2, Sparkles, Lock, Clock,
  User, Briefcase, Wallet, Loader2, AlertCircle, FileSearch, Shield, Gauge, BadgeCheck, Copy,
  Building2, CreditCard, HelpCircle
} from "lucide-react";

const schema = z.object({
  full_name: z.string().trim().min(2, "Please enter your full name").max(120),
  email: z.string().trim().email("Enter a valid email address").max(200),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  country: z.string().trim().max(80).optional().or(z.literal("")),
  occupation: z.string().trim().max(120).optional().or(z.literal("")),
  employer: z.string().trim().max(160).optional().or(z.literal("")),
  monthly_income: z.coerce.number().min(0).max(10_000_000).optional(),
  requested_limit: z.coerce.number().min(100, "Minimum 100").max(1_000_000, "Maximum 1,000,000"),
  purpose: z.string().trim().max(400).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

type Decision = {
  application_id: string;
  reference_no?: string | null;
  decision: "approved" | "review";
  approved_limit: number;
  currency: string;
  reason: string;
  signed_in: boolean;
};

type PipelineStep = {
  key: string;
  label: string;
  icon: any;
  desc: string;
};

const PIPELINE: PipelineStep[] = [
  { key: "intake", label: "Application intake", icon: FileSearch, desc: "Securely receiving your details" },
  { key: "identity", label: "KYC & KYB status checks", icon: BadgeCheck, desc: "Verifying live compliance profiles" },
  { key: "payment", label: "Compliance fee matching", icon: Wallet, desc: "Validating verification fee payment" },
  { key: "risk", label: "Risk & DTI score evaluation", icon: Gauge, desc: "Calculating affordability ratio" },
  { key: "decision", label: "Final decisioning engine", icon: Sparkles, desc: "Evaluating pre-approval status" },
];

const openCenteredPopup = (url: string, name: string) => {
  const w = 540;
  const h = 720;
  const left = Math.max(0, Math.round((window.screen.width - w) / 2));
  const top = Math.max(0, Math.round((window.screen.height - h) / 2));
  return window.open(
    url, name,
    `width=${w},height=${h},left=${left},top=${top},scrollbars=yes,resizable=yes`,
  );
};

const FlexPayApply = () => {
  usePageSEO("flexpay-apply");
  const { user, loading: authLoading } = useAuth();
  const [params, setParams] = useSearchParams();
  const paymentParam = params.get("payment");
  const orderIdParam = params.get("order_id");

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(-1); // -1 = idle
  const [decision, setDecision] = useState<Decision | null>(null);

  // Verifications statuses
  const [kycStatus, setKycStatus] = useState<string>("not_started");
  const [kybStatus, setKybStatus] = useState<string>("not_started");
  const [verificationsLoading, setVerificationsLoading] = useState(true);

  // Pollings
  const [kycPolling, setKycPolling] = useState(false);
  const [kybPolling, setKybPolling] = useState(false);

  // Step 4 payment config
  const [paymentGateway, setPaymentGateway] = useState<string>("stripe");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [submittedApp, setSubmittedApp] = useState(false);

  const [form, setForm] = useState(() => {
    let base = {
      full_name: (user?.user_metadata as any)?.full_name || "",
      email: user?.email || "",
      phone: "",
      country: "",
      occupation: "",
      employer: "",
      monthly_income: "" as string | number,
      requested_limit: 2000 as string | number,
      purpose: "",
      notes: "",
    };
    try {
      const saved = localStorage.getItem("dynime_flexpay_apply_draft");
      if (saved) {
        base = { ...base, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error("Failed to parse flexpay apply form draft", e);
    }
    return base;
  });

  const [kybForm, setKybForm] = useState(() => {
    let base = {
      company_name: "",
      registration_number: "",
      country: "",
      business_type: "",
      website: "",
      tax_id: "",
    };
    try {
      const saved = localStorage.getItem("dynime_flexpay_kyb_draft");
      if (saved) {
        base = { ...base, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error("Failed to parse flexpay kyb form draft", e);
    }
    return base;
  });

  useEffect(() => {
    if (submittedApp) return;
    try {
      localStorage.setItem("dynime_flexpay_apply_draft", JSON.stringify(form));
    } catch {}
  }, [form, submittedApp]);

  useEffect(() => {
    if (submittedApp) return;
    try {
      localStorage.setItem("dynime_flexpay_kyb_draft", JSON.stringify(kybForm));
    } catch {}
  }, [kybForm, submittedApp]);

  const upd = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const updKyb = (k: string, v: any) => setKybForm((f) => ({ ...f, [k]: v }));

  const kycFee = 0.99;
  const kybFee = 1.99;
  const showKycFee = kycStatus !== "verified";
  const showKybFee = kybStatus !== "verified";
  const totalFee = Number(((showKycFee ? kycFee : 0) + (showKybFee ? kybFee : 0) || kycFee).toFixed(2));

  const { data: gateways } = useQuery({
    queryKey: ["enabled-gateways-flexpay"],
    queryFn: async () => {
      const settings = await apiGet<Record<string, any>>("/site-settings");
      const cleanValue = (val: any) => typeof val === "string" ? val.replace(/^"|"$/g, "") : String(val);
      const ids = ["stripe", "keeal", "bkash", "sslcommerz", "dodopayment", "bank_transfer"];
      const meta: Record<string, { label: string; logo: any }> = {
        stripe: { label: "Credit/Debit Card (Stripe)", logo: CreditCard },
        keeal: { label: "Keeal Checkout", logo: CreditCard },
        bkash: { label: "bKash Checkout", logo: Wallet },
        sslcommerz: { label: "SSLCommerz Checkout", logo: CreditCard },
        dodopayment: { label: "DodoPayment (Apple/Google Pay)", logo: CreditCard },
        bank_transfer: { label: "Bank Transfer", logo: Building2 },
      };
      return ids
        .filter((id) => cleanValue(settings[`${id}_enabled`]) === "true")
        .map((id) => ({ id, ...meta[id] }));
    },
  });

  useEffect(() => {
    if (gateways && gateways.length && !gateways.some(g => g.id === paymentGateway)) {
      setPaymentGateway(gateways[0].id);
    }
  }, [gateways, paymentGateway]);

  // Load verification status on init
  const fetchVerifications = async () => {
    if (!user) return;
    try {
      const res = await apiGet<{ kyc: any; kyb: any[] }>("/verification/me");
      if (res) {
        setKycStatus(res.kyc?.status || "not_started");
        const isKybVerified = res.kyb && res.kyb.some((k: any) => k.status === "verified");
        setKybStatus(isKybVerified ? "verified" : (res.kyb?.[0]?.status || "not_started"));
      }
    } catch (e) {
      console.error("Failed to load verification status", e);
    } finally {
      setVerificationsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchVerifications();
      setForm((f) => ({
        ...f,
        full_name: f.full_name || (user.user_metadata as any)?.full_name || "",
        email: user.email || "",
      }));
    }
  }, [user]);

  // Restore step/form and save payment order ID on return from checkout
  useEffect(() => {
    if (paymentParam === "success" && user) {
      const savedStep = localStorage.getItem("flexpay_apply_current_step");
      setCurrentStep(savedStep ? Number(savedStep) : 3);
      
      const savedForm = localStorage.getItem("flexpay_apply_draft_form");
      if (savedForm) {
        try {
          setForm(JSON.parse(savedForm));
        } catch (e) {
          console.error(e);
        }
      }

      const resolveOrderId = async () => {
        if (orderIdParam) {
          localStorage.setItem("flexpay_compliance_order_id", orderIdParam);
          return;
        }

        // Fallback: search for the latest paid compliance order
        try {
          const orders = await apiGet<any[]>("/orders/mine");
          const complianceOrder = orders
            .filter((o: any) => {
              const isPaid = ["paid", "completed", "verified"].includes(o.status);
              const items = Array.isArray(o.items) ? o.items : [];
              const hasComplianceItem = items.some((item: any) =>
                item.id?.includes("flexpay-")
              );
              return isPaid && hasComplianceItem;
            })
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

          if (complianceOrder) {
            localStorage.setItem("flexpay_compliance_order_id", complianceOrder.id);
            console.log("Resolved compliance order ID via fallback:", complianceOrder.id);
          }
        } catch (e) {
          console.error("Failed to fallback-resolve compliance order ID", e);
        }
      };

      resolveOrderId();
      setParams({}, { replace: true });
      toast.success("Compliance payment verified! Please proceed with identity check.");
    } else if ((paymentParam === "cancelled" || paymentParam === "failed") && user) {
      toast.error("Compliance fee payment cancelled or failed. Please try again.");
      setCurrentStep(2); // Return to Payment step
      const savedForm = localStorage.getItem("flexpay_apply_draft_form");
      if (savedForm) {
        try {
          setForm(JSON.parse(savedForm));
        } catch (e) {
          console.error(e);
        }
      }
      setParams({}, { replace: true });
    }
  }, [paymentParam, orderIdParam, user, setParams]);

  // Animate pipeline loader
  useEffect(() => {
    if (!loading) return;
    setPipelineStep(0);
    const id = setInterval(() => {
      setPipelineStep((s) => (s < PIPELINE.length - 1 ? s + 1 : s));
    }, 850);
    return () => clearInterval(id);
  }, [loading]);

  // Step 1 validation & transition
  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || "Please review the intake form");
      return;
    }
    setCurrentStep(2);
  };

  // Step 2 KYC launch and poll
  const handleStartKyc = async () => {
    setKycPolling(true);
    try {
      const data = await apiPost<{ verification_url?: string }>("/verification/session", {
        type: "kyc",
        frontend_origin: window.location.origin,
      });
      const url = data?.verification_url;
      if (!url) throw new Error("No KYC verification URL returned.");

      const popup = openCenteredPopup(url, "didit_kyc");

      const interval = setInterval(async () => {
        // sync_mock=true triggers backend verification sync for testing
        const res = await apiGet<{ kyc: any; kyb: any[] }>("/verification/me?sync_mock=true");
        if (res?.kyc?.status === "verified") {
          clearInterval(interval);
          setKycStatus("verified");
          setKycPolling(false);
          toast.success("Identity (KYC) successfully verified!");
          setCurrentStep(4);
        } else if (res?.kyc?.status === "rejected" || res?.kyc?.status === "expired") {
          clearInterval(interval);
          setKycStatus(res.kyc.status);
          setKycPolling(false);
          toast.error("Identity verification declined or expired.");
        } else if (!popup || popup.closed) {
          clearInterval(interval);
          setKycPolling(false);
          fetchVerifications();
        }
      }, 2000);
    } catch (e: any) {
      toast.error(e?.message || "Failed to start identity validation");
      setKycPolling(false);
    }
  };

  // Step 3 KYB launch and poll
  const handleStartKyb = async () => {
    if (!kybForm.company_name.trim()) {
      toast.error("Company name is required for KYB verification.");
      return;
    }
    setKybPolling(true);
    try {
      const data = await apiPost<{ verification_url?: string }>("/verification/session", {
        type: "kyb",
        frontend_origin: window.location.origin,
        ...kybForm,
      });
      const url = data?.verification_url;
      if (!url) throw new Error("No KYB verification URL returned.");

      const popup = openCenteredPopup(url, "didit_kyb");

      const interval = setInterval(async () => {
        const res = await apiGet<{ kyc: any; kyb: any[] }>("/verification/me?sync_mock=true");
        const isKybVerified = res?.kyb && res.kyb.some((k: any) => k.status === "verified");
        if (isKybVerified) {
          clearInterval(interval);
          setKybStatus("verified");
          setKybPolling(false);
          toast.success("Business (KYB) successfully verified!");
        } else if (res?.kyb && res.kyb.some((k: any) => k.status === "rejected" || k.status === "expired")) {
          clearInterval(interval);
          setKybStatus("rejected");
          setKybPolling(false);
          toast.error("Business validation declined or expired.");
        } else if (!popup || popup.closed) {
          clearInterval(interval);
          setKybPolling(false);
          fetchVerifications();
        }
      }, 2000);
    } catch (e: any) {
      toast.error(e?.message || "Failed to initiate business compliance session");
      setKybPolling(false);
    }
  };

  // Step 4 payment trigger
  const handlePayComplianceFee = async () => {
    setPaymentLoading(true);
    try {
      localStorage.setItem("flexpay_apply_draft_form", JSON.stringify(form));
      localStorage.setItem("flexpay_apply_current_step", "3");
      localStorage.setItem("lastOrderType", "flexpay_compliance");

      const items = [];
      if (showKycFee) {
        items.push({ id: "flexpay-kyc-fee", name: "FlexPay KYC Compliance Fee", price: kycFee, quantity: 1 });
      }
      if (showKybFee) {
        items.push({ id: "flexpay-kyb-fee", name: "FlexPay KYB Compliance Fee", price: kybFee, quantity: 1 });
      }
      if (items.length === 0) {
        items.push({ id: "flexpay-compliance-processing", name: "FlexPay Compliance Processing Fee", price: kycFee, quantity: 1 });
      }

      const res = await apiPost<{ url?: string; checkout_url?: string; session_id?: string }>("/orders/public/process-payment", {
        gateway: paymentGateway,
        customer_name: form.full_name,
        customer_email: form.email,
        items,
        total: totalFee,
        currency: "USD",
        success_url: `${window.location.origin}/flexpay/apply?payment=success`,
        cancel_url: `${window.location.origin}/flexpay/apply?payment=cancelled`,
      });

      const checkoutUrl = res?.url || res?.checkout_url;
      if (checkoutUrl) {
        window.location.assign(checkoutUrl);
      } else {
        throw new Error("Invalid payment gateway response.");
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to trigger payment redirect.");
      setPaymentLoading(false);
    }
  };

  const handleSubmitApplication = async () => {
    setLoading(true);
    setPipelineStep(0);
    
    const savedOrderId = localStorage.getItem("flexpay_compliance_order_id") || "";
    if (!savedOrderId) {
      toast.error("Compliance payment not found. Please complete Step 2 first.");
      setLoading(false);
      setPipelineStep(-1);
      setCurrentStep(2);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("flexpay-apply", {
        body: {
          ...form,
          payment_order_id: savedOrderId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Animate scoring pipeline for at least ~4s
      await new Promise((r) => setTimeout(r, 4000));
      setPipelineStep(PIPELINE.length);
      setDecision(data as Decision);

      // Clear local storage
      setSubmittedApp(true);
      try {
        localStorage.removeItem("dynime_flexpay_apply_draft");
        localStorage.removeItem("dynime_flexpay_kyb_draft");
        localStorage.removeItem("flexpay_apply_draft_form");
        localStorage.removeItem("flexpay_apply_current_step");
        localStorage.removeItem("lastOrderType");
        localStorage.removeItem("flexpay_compliance_order_id");
      } catch {}
    } catch (err: any) {
      toast.error(err?.message || "Underwriting score invocation failed.");
      setPipelineStep(-1);
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground mt-2">Checking session status...</p>
        </div>
      </Layout>
    );
  }

  // ============ LOGIN WALL SCREEN ============
  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 max-w-md text-center">
          <Card className="rounded-3xl border-border/60 shadow-2xl p-8 backdrop-blur-sm bg-card/85 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/30 via-primary to-primary/30" />
            <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-5">
              <Lock className="w-6 h-6 animate-pulse" />
            </div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Sign in required</h1>
            <p className="text-muted-foreground text-sm mt-3 leading-relaxed">
              To apply for secure FlexPay credit limits, please sign in or create a Dynime account. This ensures your KYC and scoring data remains encrypted and private.
            </p>
            <Button asChild size="lg" className="w-full rounded-full mt-6 shadow-md">
              <Link to={`/account/login?next=${encodeURIComponent(window.location.pathname)}`}>
                Sign in / Register <ArrowRight className="w-4 h-4 ml-1.5" />
              </Link>
            </Button>
          </Card>
        </div>
      </Layout>
    );
  }

  // ============ DECISION SCREEN ============
  if (decision) {
    const approved = decision.decision === "approved";
    return (
      <Layout>
        <div className="container mx-auto px-4 py-14 max-w-2xl">
          <Card className="relative overflow-hidden border-border/60 rounded-3xl shadow-2xl bg-card/90">
            <div className={`absolute inset-x-0 top-0 h-1 ${approved ? "bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400" : "bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400"}`} />
            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-30"
              style={{ background: approved ? "hsl(160 80% 50%)" : "hsl(40 90% 55%)" }} />
            <CardContent className="p-10 text-center relative">
              <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg mb-5 ${approved ? "bg-emerald-500/15 text-emerald-500 shadow-emerald-500/30" : "bg-amber-500/15 text-amber-500 shadow-amber-500/20"}`}>
                {approved ? <CheckCircle2 className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
              </div>
              <Badge variant="secondary" className="rounded-full mb-3">
                {approved ? <><Sparkles className="w-3 h-3 mr-1" /> Instant pre-approval</> : <><Clock className="w-3 h-3 mr-1" /> Underwriter Review</>}
              </Badge>
              <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                {approved ? "You're pre-approved!" : "Application received"}
              </h1>
              {approved ? (
                <>
                  <p className="text-muted-foreground mt-3">Your Dynime FlexPay credit limit has been activated.</p>
                  <div className="mt-6 inline-flex flex-col items-center rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-primary/0 px-8 py-5">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Approved limit</div>
                    <div className="text-4xl md:text-5xl font-bold mt-1 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                      {new Intl.NumberFormat("en-US", { style: "currency", currency: decision.currency }).format(decision.approved_limit)}
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground mt-3 max-w-md mx-auto">
                  {decision.reason || "Our compliance underwriting team will review your details and respond within 1 business day."}
                </p>
              )}

              <div className="mt-8 flex flex-wrap gap-3 justify-center">
                {approved ? (
                  <>
                    <Button asChild size="lg" className="rounded-full">
                      <Link to="/account/flexpay">Open FlexPay dashboard <ArrowRight className="w-4 h-4 ml-1.5" /></Link>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="rounded-full">
                      <Link to="/services">Browse services</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button asChild size="lg" className="rounded-full">
                      <Link to="/account">Go to dashboard</Link>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="rounded-full">
                      <Link to="/flexpay">Back to FlexPay</Link>
                    </Button>
                  </>
                )}
              </div>

              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-4 py-2">
                <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Reference</span>
                <span className="font-mono text-sm font-bold">{decision.reference_no || decision.application_id.slice(0, 8).toUpperCase()}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(decision.reference_no || decision.application_id);
                    toast.success("Reference copied");
                  }}
                  className="ml-1 text-muted-foreground hover:text-foreground"
                  aria-label="Copy reference"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Quote this reference in any support conversation about your application.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // ============ PROCESSING SCORING ENGINE PIPELINE ============
  if (loading || pipelineStep >= 0) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-14 max-w-xl">
          <Card className="rounded-3xl border-border/60 shadow-2xl overflow-hidden bg-card/90">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/0 via-primary to-primary/0 animate-pulse" />
            <CardContent className="p-8 md:p-10">
              <div className="text-center mb-8">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
                <Badge variant="secondary" className="rounded-full mb-2">Automated decisioning</Badge>
                <h2 className="font-heading text-2xl md:text-3xl font-bold tracking-tight">Processing credit underwriting</h2>
                <p className="text-sm text-muted-foreground mt-2">Checking compliance status and evaluating affordability metrics. Please don't close this window.</p>
              </div>

              <ol className="space-y-3">
                {PIPELINE.map((p, i) => {
                  const Icon = p.icon;
                  const done = i < pipelineStep;
                  const active = i === pipelineStep;
                  return (
                    <li
                      key={p.key}
                      className={
                        "flex items-start gap-3 rounded-2xl border p-3.5 transition-all " +
                        (done
                          ? "border-emerald-500/30 bg-emerald-500/5"
                          : active
                            ? "border-primary/40 bg-primary/5 shadow-sm shadow-primary/10"
                            : "border-border/60 bg-muted/20")
                      }
                    >
                      <div className={
                        "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all " +
                        (done
                          ? "bg-emerald-500/15 text-emerald-500"
                          : active
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground")
                      }>
                        {done ? <CheckCircle2 className="w-4 h-4" /> : active ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={"text-sm font-medium " + (done ? "text-emerald-600 dark:text-emerald-400" : active ? "text-foreground" : "text-muted-foreground")}>
                          {p.label}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{p.desc}</div>
                      </div>
                      {done && <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Verified</span>}
                      {active && <span className="text-[11px] font-medium text-primary">Checking…</span>}
                    </li>
                  );
                })}
              </ol>

              <div className="mt-6 flex items-center justify-center gap-x-5 gap-y-2 text-[11px] text-muted-foreground flex-wrap">
                <span className="inline-flex items-center gap-1"><Lock className="w-3 h-3" /> Secure Pipeline</span>
                <span className="inline-flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Fully Compliant Check</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // ============ 4-STEP WIZARD UI ============
  return (
    <Layout>
      <div className="relative">
        <div aria-hidden className="absolute inset-x-0 top-0 h-[420px] -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.18),transparent_60%)]" />
        </div>

        <div className="container mx-auto px-4 py-10 md:py-14 max-w-3xl">
          <Link to="/flexpay" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to FlexPay
          </Link>

          {/* Wizard Progress Stepper */}
          <div className="mb-10">
            <div className="grid grid-cols-4 gap-2 md:gap-4">
              {[
                { id: 1, label: "Details", icon: User },
                { id: 2, label: "Payment", icon: CreditCard },
                { id: 3, label: "Identity", icon: ShieldCheck },
                { id: 4, label: "Business", icon: Building2 }
              ].map((s) => {
                const Icon = s.icon;
                const isCompleted = currentStep > s.id;
                const isActive = currentStep === s.id;
                return (
                  <div key={s.id} className="text-center relative">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isCompleted
                          ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                          : isActive
                            ? "bg-primary text-white shadow-lg shadow-primary/25 ring-2 ring-primary/20"
                            : "bg-muted text-muted-foreground border border-border"
                      }`}>
                        {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                      </div>
                      <span className={`text-[11px] font-semibold mt-2 hidden sm:inline ${isActive ? "text-primary font-bold" : "text-muted-foreground"}`}>
                        Step {s.id}: {s.label}
                      </span>
                      <span className={`text-[10px] font-semibold mt-1 sm:hidden ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                        {s.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="relative mt-4 h-1 bg-muted rounded-full">
              <div
                className="absolute top-0 left-0 h-full bg-primary transition-all duration-300 rounded-full"
                style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
              />
            </div>
          </div>

          <Card className="rounded-3xl border-border/60 shadow-xl backdrop-blur-sm bg-card/80">
            <CardContent className="p-6 md:p-8">

              {/* ============ STEP 1: DETAILS ============ */}
              {currentStep === 1 && (
                <form onSubmit={handleNextStep1} className="space-y-6">
                  <div>
                    <h2 className="text-xl font-heading font-bold text-foreground">Step 1: Credit Intake Details</h2>
                    <p className="text-xs text-muted-foreground mt-1">Please provide details regarding your financing request and income details.</p>
                  </div>

                  <section className="space-y-4">
                    <SectionTitle icon={User} title="Personal details" sub="How we'll reach you" />
                    <div className="grid md:grid-cols-2 gap-4">
                      <Field label="Full name *">
                        <Input value={form.full_name} onChange={(e) => upd("full_name", e.target.value)} placeholder="e.g. Alex Johnson" required />
                      </Field>
                      <Field label="Email *">
                        <Input type="email" value={form.email} disabled className="opacity-80 cursor-not-allowed" />
                      </Field>
                      <Field label="Mobile number">
                        <Input value={form.phone} onChange={(e) => upd("phone", e.target.value)} placeholder="+1 555 123 4567" />
                      </Field>
                      <Field label="Country">
                        <Input value={form.country} onChange={(e) => upd("country", e.target.value)} placeholder="e.g. United States" />
                      </Field>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <SectionTitle icon={Briefcase} title="Employment & income" sub="Required for instant pre-approval evaluation" />
                    <div className="grid md:grid-cols-2 gap-4">
                      <Field label="Occupation">
                        <Input value={form.occupation} onChange={(e) => upd("occupation", e.target.value)} placeholder="e.g. Software Engineer" />
                      </Field>
                      <Field label="Employer / business">
                        <Input value={form.employer} onChange={(e) => upd("employer", e.target.value)} placeholder="e.g. Acme Inc." />
                      </Field>
                      <Field className="md:col-span-2" label="Monthly income (USD)">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                          <Input type="number" min={0} className="pl-7" value={form.monthly_income} onChange={(e) => upd("monthly_income", e.target.value)} placeholder="e.g. 4500" />
                        </div>
                        <Hint>Kept fully confidential. Accurate monthly income unlocks larger limits.</Hint>
                      </Field>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <SectionTitle icon={Wallet} title="Financing request" sub="Requested credit limit on Dynime" />
                    <Field label="Requested limit (USD) *">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <Input
                          type="number"
                          min={100}
                          className="pl-7 text-lg font-semibold"
                          value={form.requested_limit}
                          onChange={(e) => upd("requested_limit", e.target.value)}
                          placeholder="2000"
                          required
                        />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {[500, 1000, 2500, 5000, 10000].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => upd("requested_limit", v)}
                            className={
                              "text-xs px-3 py-1.5 rounded-full border transition-all " +
                              (Number(form.requested_limit) === v
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border hover:border-primary/40 hover:bg-muted/50")
                            }
                          >
                            ${v.toLocaleString()}
                          </button>
                        ))}
                      </div>
                    </Field>
                    <div className="grid md:grid-cols-2 gap-4">
                      <Field label="Purpose of financing">
                        <Textarea
                          rows={3}
                          value={form.purpose}
                          onChange={(e) => upd("purpose", e.target.value)}
                          placeholder="e.g. Website redesign and SEO services"
                        />
                      </Field>
                      <Field label="Additional notes">
                        <Textarea
                          rows={3}
                          value={form.notes}
                          onChange={(e) => upd("notes", e.target.value)}
                          placeholder="Anything else we should know? (optional)"
                        />
                      </Field>
                    </div>
                  </section>

                  <div className="flex justify-between items-center pt-4 border-t">
                    <Button asChild variant="ghost" type="button">
                      <Link to="/flexpay"><ArrowLeft className="w-4 h-4 mr-1" /> Cancel</Link>
                    </Button>
                    <Button type="submit" size="lg" className="rounded-full shadow-md min-w-[140px]">
                      Next Step <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </div>
                </form>
              )}

              {/* ============ STEP 2: KYC IDENTITY ============ */}
              {/* ============ STEP 2: COMPLIANCE PAYMENT ============ */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-heading font-bold text-foreground">Step 2: Compliance Verification Fee</h2>
                    <p className="text-xs text-muted-foreground mt-1">Complete the identity validation process by matching compliance fees.</p>
                  </div>

                  <Card className="border-border/60 bg-muted/20 rounded-2xl p-6">
                    <div className="space-y-3 pb-4 border-b">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Fee Breakdown</div>
                      {showKycFee && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">KYC Identity Verification</span>
                          <span className="font-semibold text-foreground">$0.99</span>
                        </div>
                      )}
                      {showKybFee && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">KYB Business Verification</span>
                          <span className="font-semibold text-foreground">$1.99</span>
                        </div>
                      )}
                      {!showKycFee && !showKybFee && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Compliance Processing Fee</span>
                          <span className="font-semibold text-foreground">$0.99</span>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center pt-4 pb-1">
                      <div>
                        <div className="text-sm font-semibold text-foreground">Total Compliance Fee</div>
                        <div className="text-xs text-muted-foreground mt-0.5">Automated screening, registry lookup & AML check</div>
                      </div>
                      <div className="text-2xl font-bold text-foreground">
                        {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(totalFee)}
                      </div>
                    </div>

                    {/* REDESIGNED NOTE BANNER - HIGH EYE CATCHING DESIGN */}
                    <div className="mt-6 relative overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 p-5 shadow-lg shadow-amber-500/5 transition-all hover:shadow-amber-500/10">
                      {/* Decorative glowing background blob */}
                      <div className="absolute -right-10 -top-10 w-24 h-24 rounded-full bg-amber-500/10 blur-xl pointer-events-none" />
                      
                      <div className="flex gap-3 items-start relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0 shadow-inner">
                          <AlertCircle className="w-5 h-5 animate-pulse" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-xs uppercase tracking-widest font-bold text-amber-700 dark:text-amber-400">
                            Strict Compliance Disclosure
                          </h4>
                          <p className="text-xs text-foreground/90 leading-relaxed font-medium">
                            <span className="font-semibold underline decoration-amber-500/50">Please Note:</span> This payment is <span className="text-amber-600 dark:text-amber-400 font-semibold">NOT</span> a Dynime service fee or service charge. This fee is charged directly by the compliance validation engine (<span className="font-semibold">Didit</span>) to process corporate registry records, verify government identities, and run global AML/PEP checks. <span className="font-bold">Dynime does not markup, receive, or profit from this charge.</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <div className="space-y-3">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Select Payment Gateway</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {gateways && gateways.length > 0 ? (
                        gateways.map((g) => {
                          const Icon = g.logo;
                          const isSelected = paymentGateway === g.id;
                          return (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => setPaymentGateway(g.id)}
                              className={`flex items-center gap-3 border rounded-xl p-4 text-left transition-all ${
                                isSelected
                                  ? "border-primary bg-primary/5 text-primary shadow-sm ring-1 ring-primary"
                                  : "border-border hover:border-primary/30 hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <Icon className="w-5 h-5 flex-shrink-0" />
                              <span className="text-xs font-semibold">{g.label}</span>
                            </button>
                          );
                        })
                      ) : (
                        <div className="col-span-2 text-center py-4 border rounded-xl bg-muted/20">
                          <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                          <p className="text-xs text-muted-foreground mt-1">Loading payment methods...</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t">
                    <Button variant="ghost" onClick={() => setCurrentStep(1)}>
                      <ArrowLeft className="w-4 h-4 mr-1" /> Back
                    </Button>
                    {localStorage.getItem("flexpay_compliance_order_id") ? (
                      <Button onClick={() => setCurrentStep(3)} className="rounded-full shadow-lg shadow-primary/25 min-w-[220px]">
                        Next Step (Payment Verified) <ArrowRight className="w-4 h-4 ml-1.5" />
                      </Button>
                    ) : (
                      <Button onClick={handlePayComplianceFee} disabled={paymentLoading} className="rounded-full shadow-lg shadow-primary/25 min-w-[220px]">
                        {paymentLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
                        Pay Compliance Fee
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* ============ STEP 3: KYC IDENTITY ============ */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h2 className="text-xl font-heading font-bold text-foreground">Step 3: Identity Verification (KYC)</h2>
                        <p className="text-xs text-muted-foreground mt-1">We require identity validation to securely issue credit lines under global AML policies.</p>
                      </div>
                      {kycStatus !== "not_started" && (
                        <Badge variant={kycStatus === "verified" ? "default" : "secondary"} className="capitalize">
                          KYC: {kycStatus.replace("_", " ")}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {verificationsLoading ? (
                    <div className="py-10 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Checking compliance records...</p>
                    </div>
                  ) : kycStatus === "verified" ? (
                    <Card className="border-emerald-500/20 bg-emerald-500/5 rounded-2xl p-6 text-center">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-3">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <h3 className="font-heading font-bold text-foreground text-lg">Identity Verified</h3>
                      <p className="text-muted-foreground text-sm mt-1.5 max-w-sm mx-auto">
                        Your KYC profile is already validated in our database. You can proceed directly to business verification.
                      </p>
                      <div className="mt-6 flex justify-between">
                        <Button variant="outline" onClick={() => setCurrentStep(2)}>
                          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
                        </Button>
                        <Button onClick={() => setCurrentStep(4)} className="rounded-full">
                          Next Step <ArrowRight className="w-4 h-4 ml-1.5" />
                        </Button>
                      </div>
                    </Card>
                  ) : (
                    <div className="space-y-6">
                      <Card className="border-border/60 bg-muted/20 rounded-2xl p-6">
                        <h3 className="font-heading font-semibold text-foreground text-base">Instant Didit Validation</h3>
                        <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                          Dynime partners with **Didit** for bank-grade digital identity validation. The verification is fully automated and encrypted. Please have a government-issued photo ID (passport, national card, or driver's license) ready.
                        </p>
                        <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
                          <li className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-500" /> Secure SSL transmission with 256-bit encryption
                          </li>
                          <li className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-500" /> Fully automated document authenticity checking
                          </li>
                        </ul>
                      </Card>

                      {kycPolling && (
                        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                          <Card className="bg-background border rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center space-y-5">
                            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                            <div>
                              <h3 className="text-lg font-semibold">Verification Popup Opened</h3>
                              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                                Complete your KYC document upload and face matching inside the popup window. Keep this tab open.
                              </p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setKycPolling(false)}>
                              Cancel Polling
                            </Button>
                          </Card>
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-4 border-t">
                        <Button variant="ghost" onClick={() => setCurrentStep(2)}>
                          <ArrowLeft className="w-4 h-4 mr-1" /> Back
                        </Button>
                        <div className="flex gap-3">
                          <Button variant="outline" onClick={() => setCurrentStep(4)} className="rounded-full">
                            Next Step <ArrowRight className="w-4 h-4 ml-1.5" />
                          </Button>
                          <Button onClick={handleStartKyc} disabled={kycPolling} className="rounded-full shadow-lg shadow-primary/20 min-w-[200px]">
                            {kycPolling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
                            Verify Identity
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ============ STEP 4: KYB BUSINESS ============ */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h2 className="text-xl font-heading font-bold text-foreground">Step 4: Business Verification (KYB)</h2>
                        <p className="text-xs text-muted-foreground mt-1">Provide information about your business entity to align with corporate credit limits.</p>
                      </div>
                      {kybStatus !== "not_started" && (
                        <Badge variant={kybStatus === "verified" ? "default" : "secondary"} className="capitalize">
                          KYB: {kybStatus.replace("_", " ")}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {verificationsLoading ? (
                    <div className="py-10 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Checking compliance records...</p>
                    </div>
                  ) : kybStatus === "verified" ? (
                    <Card className="border-emerald-500/20 bg-emerald-500/5 rounded-2xl p-6 text-center">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-3">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <h3 className="font-heading font-bold text-foreground text-lg">Business Entity Verified</h3>
                      <p className="text-muted-foreground text-sm mt-1.5 max-w-sm mx-auto">
                        Your corporate profile has already been validated. You can submit your credit application now.
                      </p>
                      <div className="mt-6 flex justify-between">
                        <Button variant="outline" onClick={() => setCurrentStep(3)}>
                          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
                        </Button>
                        <Button onClick={handleSubmitApplication} className="rounded-full">
                          Submit Credit Application <ArrowRight className="w-4 h-4 ml-1.5" />
                        </Button>
                      </div>
                    </Card>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-4">
                        <Field label="Company Legal Name *">
                          <Input value={kybForm.company_name} onChange={e => updKyb("company_name", e.target.value)} placeholder="e.g. Acme Corp LLC" />
                        </Field>
                        <Field label="Registration Number">
                          <Input value={kybForm.registration_number} onChange={e => updKyb("registration_number", e.target.value)} placeholder="e.g. LLC-5928-C" />
                        </Field>
                        <Field label="Country of Registry">
                          <Input value={kybForm.country} onChange={e => updKyb("country", e.target.value)} placeholder="e.g. United Kingdom" />
                        </Field>
                        <Field label="Entity Type">
                          <Input value={kybForm.business_type} onChange={e => updKyb("business_type", e.target.value)} placeholder="e.g. LLC, PLC, Sole Trader" />
                        </Field>
                        <Field label="Business Website">
                          <Input value={kybForm.website} onChange={e => updKyb("website", e.target.value)} placeholder="e.g. https://mybusiness.com" />
                        </Field>
                        <Field label="Tax / VAT ID">
                          <Input value={kybForm.tax_id} onChange={e => updKyb("tax_id", e.target.value)} placeholder="e.g. GB-123456789" />
                        </Field>
                      </div>

                      {kybPolling && (
                        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                          <Card className="bg-background border rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center space-y-5">
                            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                            <div>
                              <h3 className="text-lg font-semibold">KYB Session Initiated</h3>
                              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                                Please submit corporate documents and verification in the popup window.
                              </p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setKybPolling(false)}>
                              Cancel Polling
                            </Button>
                          </Card>
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-4 border-t">
                        <Button variant="ghost" onClick={() => setCurrentStep(3)}>
                          <ArrowLeft className="w-4 h-4 mr-1" /> Back
                        </Button>
                        <div className="flex gap-3">
                          <Button variant="outline" onClick={handleSubmitApplication} className="rounded-full">
                            Submit Credit Application <ArrowRight className="w-4 h-4 ml-1.5" />
                          </Button>
                          <Button onClick={handleStartKyb} disabled={kybPolling} className="rounded-full shadow-lg shadow-primary/20 min-w-[200px]">
                            {kybPolling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
                            Verify Business Entity
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </CardContent>
          </Card>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Lock className="w-3 h-3" /> Bank-grade encryption</span>
            <span className="inline-flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Secure Didit Engine</span>
            <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> Automated Underwriting</span>
          </div>
        </div>
      </div>
    </Layout>
  );
};

const SectionTitle = ({ icon: Icon, title, sub }: { icon: any; title: string; sub: string }) => (
  <div className="flex items-start gap-3 pb-1 border-b border-border/60">
    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
      <Icon className="w-4 h-4" />
    </div>
    <div className="pb-3">
      <h2 className="font-semibold text-base leading-tight">{title}</h2>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
    </div>
  </div>
);

const Field = ({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) => (
  <div className={"space-y-1.5 " + (className || "")}>
    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</Label>
    {children}
  </div>
);

const Hint = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[11px] text-muted-foreground mt-1">{children}</p>
);

export default FlexPayApply;

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
import { usePageSEO } from "@/hooks/use-page-seo";
import {
  ShieldCheck, ArrowLeft, ArrowRight, CheckCircle2, Sparkles, Lock, Clock,
  User, Briefcase, Wallet, Loader2, AlertCircle, FileSearch, Shield, Gauge, BadgeCheck, Copy,
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
  { key: "intake", label: "Application intake", icon: FileSearch, desc: "Securely receiving your data" },
  { key: "identity", label: "Identity verification", icon: BadgeCheck, desc: "Validating contact details" },
  { key: "risk", label: "Risk & affordability check", icon: Gauge, desc: "Scoring against income & request" },
  { key: "policy", label: "Policy & limit review", icon: Shield, desc: "Matching to FlexPay credit policy" },
  { key: "decision", label: "Final decision", icon: Sparkles, desc: "Issuing your pre-approval" },
];

const FlexPayApply = () => {
  usePageSEO("flexpay-apply");
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(-1); // -1 = idle
  const [decision, setDecision] = useState<Decision | null>(null);
  const [form, setForm] = useState({
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
  });

  const upd = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  // Animate pipeline while loading
  useEffect(() => {
    if (!loading) return;
    setPipelineStep(0);
    const id = setInterval(() => {
      setPipelineStep((s) => (s < PIPELINE.length - 1 ? s + 1 : s));
    }, 700);
    return () => clearInterval(id);
  }, [loading]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || "Please review the form");
      return;
    }
    setLoading(true);
    setDecision(null);
    const startedAt = Date.now();
    try {
      const { data, error } = await supabase.functions.invoke("flexpay-apply", {
        body: parsed.data,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      // Ensure the pipeline animation runs at least ~3.5s for premium feel
      const elapsed = Date.now() - startedAt;
      const min = 3500;
      if (elapsed < min) await new Promise((r) => setTimeout(r, min - elapsed));
      setPipelineStep(PIPELINE.length);
      setDecision(data as Decision);
    } catch (err: any) {
      toast.error(err?.message || "Could not submit application");
    } finally {
      setLoading(false);
    }
  };

  const dpEst = useMemo(() => {
    const n = Number(form.requested_limit) || 0;
    return n;
  }, [form.requested_limit]);

  // ============ DECISION SCREEN ============
  if (decision) {
    const approved = decision.decision === "approved";
    return (
      <Layout>
        <div className="container mx-auto px-4 py-14 max-w-2xl">
          <Card className="relative overflow-hidden border-border/60 rounded-3xl shadow-2xl">
            <div className={`absolute inset-x-0 top-0 h-1 ${approved ? "bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400" : "bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400"}`} />
            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-30"
              style={{ background: approved ? "hsl(160 80% 50%)" : "hsl(40 90% 55%)" }} />
            <CardContent className="p-10 text-center relative">
              <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg mb-5 ${approved ? "bg-emerald-500/15 text-emerald-500 shadow-emerald-500/30" : "bg-amber-500/15 text-amber-500 shadow-amber-500/20"}`}>
                {approved ? <CheckCircle2 className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
              </div>
              <Badge variant="secondary" className="rounded-full mb-3">
                {approved ? <><Sparkles className="w-3 h-3 mr-1" /> Instant decision</> : <><Clock className="w-3 h-3 mr-1" /> Under review</>}
              </Badge>
              <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight">
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
                  {decision.reason || "Our team will review your application and respond within 1 business day."}
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
                    {!decision.signed_in && (
                      <Button asChild size="lg" className="rounded-full">
                        <Link to={`/account/login?next=${encodeURIComponent("/account/flexpay")}`}>Sign in to track</Link>
                      </Button>
                    )}
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

  // ============ PROCESSING PIPELINE ============
  if (loading || pipelineStep >= 0) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-14 max-w-xl">
          <Card className="rounded-3xl border-border/60 shadow-2xl overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/0 via-primary to-primary/0 animate-pulse" />
            <CardContent className="p-8 md:p-10">
              <div className="text-center mb-8">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
                <Badge variant="secondary" className="rounded-full mb-2">Automated decisioning</Badge>
                <h2 className="font-heading text-2xl md:text-3xl font-bold tracking-tight">Reviewing your application</h2>
                <p className="text-sm text-muted-foreground mt-2">This takes just a few seconds. Please don't close the window.</p>
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
                      {done && <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Done</span>}
                      {active && <span className="text-[11px] font-medium text-primary">Running…</span>}
                    </li>
                  );
                })}
              </ol>

              <div className="mt-6 flex items-center justify-center gap-x-5 gap-y-2 text-[11px] text-muted-foreground flex-wrap">
                <span className="inline-flex items-center gap-1"><Lock className="w-3 h-3" /> Encrypted</span>
                <span className="inline-flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> No hard credit check</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // ============ SINGLE-STEP FORM ============
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
          <div className="text-center mb-8">
            <Badge variant="secondary" className="mb-3 rounded-full">
              <ShieldCheck className="w-3 h-3 mr-1" /> Secure · Encrypted · Instant
            </Badge>
            <h1 className="font-heading text-3xl md:text-5xl font-bold tracking-tight">Apply for FlexPay credit</h1>
            <p className="text-muted-foreground mt-3 max-w-md mx-auto">
              Fill in once — our automated system handles verification, scoring and approval in seconds.
            </p>
          </div>

          <Card className="rounded-3xl border-border/60 shadow-xl backdrop-blur-sm bg-card/80">
            <CardContent className="p-6 md:p-8">
              <form onSubmit={submit} className="space-y-8">
                {/* Personal */}
                <section className="space-y-4">
                  <SectionTitle icon={User} title="Personal details" sub="How we'll reach you" />
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Full name *">
                      <Input value={form.full_name} onChange={(e) => upd("full_name", e.target.value)} placeholder="e.g. Alex Johnson" required />
                    </Field>
                    <Field label="Email *">
                      <Input type="email" value={form.email} onChange={(e) => upd("email", e.target.value)} placeholder="you@email.com" required />
                    </Field>
                    <Field label="Mobile number">
                      <Input value={form.phone} onChange={(e) => upd("phone", e.target.value)} placeholder="+1 555 123 4567" />
                    </Field>
                    <Field label="Country">
                      <Input value={form.country} onChange={(e) => upd("country", e.target.value)} placeholder="e.g. United States" />
                    </Field>
                  </div>
                </section>

                {/* Employment */}
                <section className="space-y-4">
                  <SectionTitle icon={Briefcase} title="Employment & income" sub="Required for instant pre-approval" />
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
                      <Hint>Kept fully confidential. Higher income unlocks larger instant limits.</Hint>
                    </Field>
                  </div>
                </section>

                {/* Financing */}
                <section className="space-y-4">
                  <SectionTitle icon={Wallet} title="Financing request" sub="Amount you'd like to spend on Dynime services" />
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

                {!user && (
                  <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
                    <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-muted-foreground">
                      <Link className="underline text-foreground hover:text-primary" to={`/account/login?next=${encodeURIComponent("/flexpay/apply")}`}>Sign in</Link>{" "}
                      first to unlock instant pre-approval and track your application in your dashboard.
                    </p>
                  </div>
                )}

                {/* What happens next */}
                <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    What happens after you submit
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {PIPELINE.map((p) => {
                      const Icon = p.icon;
                      return (
                        <div key={p.key} className="flex flex-col items-center text-center gap-1.5">
                          <div className="w-8 h-8 rounded-lg bg-background border border-border/60 flex items-center justify-center text-primary">
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="text-[10px] font-medium leading-tight">{p.label}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-2">
                  <Button asChild type="button" variant="ghost">
                    <Link to="/flexpay"><ArrowLeft className="w-4 h-4 mr-1" /> Cancel</Link>
                  </Button>
                  <Button type="submit" size="lg" className="rounded-full shadow-lg shadow-primary/25 w-full sm:w-auto sm:min-w-[220px]">
                    <Sparkles className="w-4 h-4 mr-1.5" /> Get instant decision
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Lock className="w-3 h-3" /> Bank-grade encryption</span>
            <span className="inline-flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> No hard credit check</span>
            <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> Decision in seconds</span>
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

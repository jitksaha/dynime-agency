import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { z } from "zod";
import { apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Send, ShieldCheck, Clock, CheckCircle2, Loader2, User, Mail, Phone, Building2, Globe, MapPin, Megaphone,
  Sparkles, MessageSquare, Calendar, ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import CountryAutocomplete from "@/components/shared/CountryAutocomplete";

const SERVICES = [
  "Web Development",
  "Digital Marketing & SEO",
  "AI & Custom Software",
  "Company Formation (US/UK)",
  "Business Manager / ERP",
  "General inquiry",
];

const BUDGETS = [
  "Under $500",
  "$500 – $2,000",
  "$2,000 – $5,000",
  "$5,000 – $15,000",
  "$15,000+",
  "Not sure yet",
];

const TIMELINES = ["ASAP", "Within 1 month", "1–3 months", "3+ months", "Just exploring"];

const DELIVERY_TYPES = [
  { value: "standard", label: "Standard delivery", hint: "Included — typical 2–4 weeks" },
  { value: "express", label: "Express delivery (2× faster)", hint: "Additional fee applies based on scope" },
];

const HEARD_FROM = [
  "Google search",
  "Social media",
  "Referral / word of mouth",
  "Existing client",
  "Blog / article",
  "Other",
];

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  company: z.string().trim().max(120).optional().or(z.literal("")),
  website: z
    .string()
    .trim()
    .max(255)
    .refine(
      (v) => !v || /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/i.test(v),
      "Enter a valid website URL",
    )
    .optional()
    .or(z.literal("")),
  country: z.string().trim().max(80).optional().or(z.literal("")),
  heardFrom: z.string().trim().max(80).optional().or(z.literal("")),
  service: z.string().min(1, "Please select a service"),
  budget: z.string().min(1, "Please select a budget"),
  timeline: z.string().min(1, "Please select a timeline"),
  delivery: z.enum(["standard", "express"]).default("standard"),
  message: z.string().trim().min(10, "A few sentences please (min 10 chars)").max(2000),
  consent: z.literal(true, { errorMap: () => ({ message: "Please accept to continue" }) }),
});

type FormState = {
  name: string; email: string; phone: string; company: string;
  website: string; country: string; heardFrom: string;
  service: string; budget: string; timeline: string; delivery: "standard" | "express"; message: string;
  consent: boolean;
};

const initial: FormState = {
  name: "", email: "", phone: "", company: "",
  website: "", country: "", heardFrom: "",
  service: "", budget: "", timeline: "", delivery: "standard", message: "", consent: false,
};

const ContactForm = ({ slug = "contact" }: { slug?: string }) => {
  const [params] = useSearchParams();
  const [values, setValues] = useState<FormState>(() => {
    let base = { ...initial };
    const saved = localStorage.getItem("dynime_contact_form_draft");
    if (saved) {
      try {
        base = { ...base, ...JSON.parse(saved) };
      } catch (e) {
        console.error("Failed to parse saved contact form draft", e);
      }
    }

    const serviceParam = params.get("service") || params.get("subject");
    if (serviceParam) base.service = serviceParam;

    const deliveryParam = params.get("delivery");
    if (deliveryParam === "express" || deliveryParam === "standard") {
      base.delivery = deliveryParam;
    }

    const messageParam = params.get("message");
    if (messageParam) base.message = messageParam;

    return base;
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setValues((p) => {
      const next = { ...p, [k]: v };
      localStorage.setItem("dynime_contact_form_draft", JSON.stringify(next));
      return next;
    });
    setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const fe: Partial<Record<keyof FormState, string>> = {};
      parsed.error.issues.forEach((i) => {
        const k = i.path[0] as keyof FormState;
        if (!fe[k]) fe[k] = i.message;
      });
      setErrors(fe);
      toast.error("Please review the highlighted fields.");
      return;
    }
    setSubmitting(true);
    try {
      const { consent, ...payload } = parsed.data;
      await apiPost("/public/forms/submit", {
        slug,
        data: { ...payload, consent, source: "contact-page", submitted_at: new Date().toISOString() },
      });
      setDone(true);
      localStorage.removeItem("dynime_contact_form_draft");
      toast.success("Thanks! We'll reply within one business day.");
      setTimeout(() => {
        document.getElementById("contact-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    } catch (err: any) {
      toast.error(err?.message || "Could not send. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    const firstName = values.name.split(" ")[0] || "there";
    const ticketId = `DYN-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    return (
      <div
        role="status"
        aria-live="polite"
        className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-background to-background p-8 sm:p-10 animate-in fade-in zoom-in-95 duration-500"
      >
        {/* Decorative glow */}
        <div className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative text-center">
          <div className="relative w-20 h-20 mx-auto mb-5">
            <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <span className="absolute inset-2 rounded-full bg-primary/15" />
            <span className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/30">
              <CheckCircle2 className="w-10 h-10 text-primary-foreground" strokeWidth={2.5} />
            </span>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 text-primary text-[11px] font-semibold uppercase tracking-wider px-3 py-1 mb-3">
            <Sparkles className="w-3 h-3" /> Message received
          </span>

          <h3 className="font-heading text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Thanks, {firstName}! 🎉
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            We've sent a confirmation to{" "}
            <span className="text-foreground font-medium">{values.email}</span>. A
            strategist will personally reply within{" "}
            <span className="text-foreground font-medium">1 business day</span>.
          </p>

          {/* Reference ID */}
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs">
            <span className="text-muted-foreground">Reference</span>
            <span className="font-mono font-semibold text-foreground tracking-wider">{ticketId}</span>
          </div>

          {/* What happens next */}
          <div className="mt-7 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            {[
              { icon: Mail, title: "Check your inbox", body: "Confirmation email is on its way." },
              { icon: MessageSquare, title: "We review", body: "Your brief gets matched to the right expert." },
              { icon: Calendar, title: "Reply in 24h", body: "With next steps, ideas & a clear quote." },
            ].map((s, i) => (
              <div
                key={s.title}
                className="rounded-xl border border-border/70 bg-card/60 backdrop-blur p-4 hover:border-primary/40 transition-colors"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <s.icon className="w-4 h-4 text-primary mb-2" />
                <p className="text-sm font-semibold text-foreground">{s.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.body}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setDone(false);
                setValues(initial);
                setErrors({});
                localStorage.removeItem("dynime_contact_form_draft");
              }}
            >
              Send another message
            </Button>
            <Button asChild variant="hero">
              <Link to="/portfolio">
                Explore our work <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>

          <p className="mt-5 text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-primary" />
            Your details are encrypted and never shared.
          </p>
        </div>
      </div>
    );
  }

  const inputErr = (k: keyof FormState) =>
    errors[k] ? "border-destructive focus-visible:ring-destructive" : "";

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="cf-name">Full name *</Label>
          <div className="relative mt-1.5">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="cf-name" value={values.name} onChange={(e) => update("name", e.target.value)}
              maxLength={100} placeholder="Jane Doe" className={`pl-9 ${inputErr("name")}`} />
          </div>
          {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
        </div>
        <div>
          <Label htmlFor="cf-email">Work email *</Label>
          <div className="relative mt-1.5">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="cf-email" type="email" value={values.email} onChange={(e) => update("email", e.target.value)}
              maxLength={255} placeholder="you@company.com" className={`pl-9 ${inputErr("email")}`} />
          </div>
          {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
        </div>
        <div>
          <Label htmlFor="cf-phone">Phone / WhatsApp</Label>
          <div className="relative mt-1.5">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="cf-phone" value={values.phone} onChange={(e) => update("phone", e.target.value)}
              maxLength={40} placeholder="+44 7000 000000" className="pl-9" />
          </div>
        </div>
        <div>
          <Label htmlFor="cf-company">Company</Label>
          <div className="relative mt-1.5">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="cf-company" value={values.company} onChange={(e) => update("company", e.target.value)}
              maxLength={120} placeholder="Acme Inc." className="pl-9" />
          </div>
        </div>
        <div>
          <Label htmlFor="cf-website">Website</Label>
          <div className="relative mt-1.5">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="cf-website" value={values.website} onChange={(e) => update("website", e.target.value)}
              maxLength={255} placeholder="https://yourcompany.com" className={`pl-9 ${inputErr("website")}`} />
          </div>
          {errors.website && <p className="text-xs text-destructive mt-1">{errors.website}</p>}
        </div>
        <div>
          <Label htmlFor="cf-country">Country</Label>
          <div className="mt-1.5">
            <CountryAutocomplete
              id="cf-country"
              value={values.country}
              onChange={(v) => update("country", v)}
              placeholder="Select your country"
            />
          </div>
        </div>

        <div>
          <Label>Service *</Label>
          <Select value={values.service} onValueChange={(v) => update("service", v)}>
            <SelectTrigger className={`mt-1.5 ${inputErr("service")}`}><SelectValue placeholder="What can we help with?" /></SelectTrigger>
            <SelectContent>{SERVICES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          {errors.service && <p className="text-xs text-destructive mt-1">{errors.service}</p>}
        </div>
        <div>
          <Label>Budget *</Label>
          <Select value={values.budget} onValueChange={(v) => update("budget", v)}>
            <SelectTrigger className={`mt-1.5 ${inputErr("budget")}`}><SelectValue placeholder="Estimated budget" /></SelectTrigger>
            <SelectContent>{BUDGETS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
          </Select>
          {errors.budget && <p className="text-xs text-destructive mt-1">{errors.budget}</p>}
        </div>
        <div className="md:col-span-2">
          <Label>Timeline *</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {TIMELINES.map((t) => {
              const active = values.timeline === t;
              return (
                <button
                  type="button"
                  key={t}
                  onClick={() => update("timeline", t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border text-foreground hover:border-primary/50 hover:bg-primary/5"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
          {errors.timeline && <p className="text-xs text-destructive mt-1">{errors.timeline}</p>}
        </div>

        <div className="md:col-span-2">
          <Label>Delivery type *</Label>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {DELIVERY_TYPES.map((d) => {
              const active = values.delivery === d.value;
              const isExpress = d.value === "express";
              return (
                <button
                  type="button"
                  key={d.value}
                  onClick={() => update("delivery", d.value as "standard" | "express")}
                  className={`text-left p-3 rounded-xl border-2 transition-all ${
                    active
                      ? isExpress
                        ? "bg-primary/5 border-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]"
                        : "bg-primary/5 border-primary"
                      : "bg-card border-border hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isExpress ? (
                      <Sparkles className={`w-4 h-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                    ) : (
                      <Clock className={`w-4 h-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                    )}
                    <span className="text-sm font-semibold text-foreground">{d.label}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">{d.hint}</p>
                </button>
              );
            })}
          </div>
          {values.delivery === "express" && (
            <p className="mt-2 text-[11px] text-primary inline-flex items-start gap-1.5">
              <Sparkles className="w-3 h-3 mt-0.5 flex-shrink-0" />
              Express delivery has an additional charge — we'll confirm the exact uplift with your quote.
            </p>
          )}
        </div>

        <div className="md:col-span-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="cf-message">Project details *</Label>
            <span className="text-xs text-muted-foreground">{values.message.length}/2000</span>
          </div>
          <Textarea
            id="cf-message"
            value={values.message}
            onChange={(e) => update("message", e.target.value)}
            maxLength={2000}
            rows={5}
            placeholder="Goals, deadlines, references — the more context, the better."
            className={`mt-1.5 ${inputErr("message")}`}
          />
          {errors.message && <p className="text-xs text-destructive mt-1">{errors.message}</p>}
        </div>

        <div className="md:col-span-2">
          <label className="flex items-start gap-3 text-sm text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={values.consent}
              onChange={(e) => update("consent", e.target.checked as any)}
              className="mt-1 w-4 h-4 rounded border-border accent-primary"
            />
            <span>
              I agree to be contacted by Dynime about my inquiry. We never share your data — see our{" "}
              <Link to="/privacy" className="text-primary hover:underline">privacy policy</Link>.
            </span>
          </label>
          {errors.consent && <p className="text-xs text-destructive mt-1">{errors.consent}</p>}
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-4 pt-2">
        <Button type="submit" variant="hero" size="lg" disabled={submitting} className="min-w-[180px]">
          {submitting ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</>) : (<>Send message <Send className="w-4 h-4 ml-1" /></>)}
        </Button>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground sm:ml-2">
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-primary" /> Spam-free, encrypted</span>
          <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-primary" /> Reply within 1 business day</span>
        </div>
      </div>
    </form>
  );
};

export default ContactForm;

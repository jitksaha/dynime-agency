import { useEffect, useState } from "react";
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
import { Send, ShieldCheck, Sparkles, Clock } from "lucide-react";

const SERVICE_OPTIONS = [
  "Web Development",
  "Digital Marketing",
  "AI & Custom Software",
  "Company Formation (US/UK)",
  "Business Manager / ERP",
  "Not sure — recommend the best fit",
];

const BUDGET_OPTIONS = [
  "Under $500",
  "$500 – $2,000",
  "$2,000 – $5,000",
  "$5,000 – $15,000",
  "$15,000+",
  "Not sure yet",
];

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  budget: z.string().min(1, "Select a budget"),
  service: z.string().min(1, "Select a service"),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
});

type FormState = z.infer<typeof schema>;

const ServicesLeadForm = ({ defaultService }: { defaultService?: string }) => {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [values, setValues] = useState<FormState>({
    name: "",
    email: "",
    budget: "",
    service: defaultService ?? "",
    message: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setValues((p) => ({ ...p, [k]: v }));
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
      return;
    }
    setSubmitting(true);
    try {
      await apiPost("/public/forms/submit", {
        slug: "services-lead",
        data: { ...parsed.data, source: "services-page" },
      });
      setDone(true);
      toast.success("Thanks! We'll reply within one business day.");
    } catch (err: any) {
      toast.error(err?.message || "Could not send. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-background p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-3">
          <Sparkles className="w-6 h-6 text-primary" />
        </div>
        <h3 className="font-heading text-2xl font-bold text-foreground mb-2">Got it — talk soon!</h3>
        <p className="text-muted-foreground">A strategist will reach out within one business day with next steps and a fixed quote.</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm"
      noValidate
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="lead-name">Full name *</Label>
          <Input
            id="lead-name"
            value={values.name}
            onChange={(e) => update("name", e.target.value)}
            maxLength={100}
            placeholder="Jane Doe"
            className="mt-1.5"
          />
          {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
        </div>
        <div>
          <Label htmlFor="lead-email">Work email *</Label>
          <Input
            id="lead-email"
            type="email"
            value={values.email}
            onChange={(e) => update("email", e.target.value)}
            maxLength={255}
            placeholder="you@company.com"
            className="mt-1.5"
          />
          {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
        </div>
        <div>
          <Label>Service *</Label>
          <Select value={values.service} onValueChange={(v) => update("service", v)}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="What do you need?" />
            </SelectTrigger>
            <SelectContent>
              {SERVICE_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.service && <p className="text-xs text-destructive mt-1">{errors.service}</p>}
        </div>
        <div>
          <Label>Budget *</Label>
          <Select value={values.budget} onValueChange={(v) => update("budget", v)}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Estimated budget" />
            </SelectTrigger>
            <SelectContent>
              {BUDGET_OPTIONS.map((b) => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.budget && <p className="text-xs text-destructive mt-1">{errors.budget}</p>}
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="lead-message">Project notes (optional)</Label>
          <Textarea
            id="lead-message"
            value={values.message}
            onChange={(e) => update("message", e.target.value)}
            maxLength={1000}
            rows={4}
            placeholder="A few lines about goals, deadlines, or links to references."
            className="mt-1.5"
          />
        </div>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-primary" /> Your info stays private</span>
          <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-primary" /> Reply within 1 business day</span>
        </div>
        <Button type="submit" variant="hero" size="lg" disabled={submitting}>
          {submitting ? "Sending…" : (<>Get my free quote <Send className="w-4 h-4 ml-1" /></>)}
        </Button>
      </div>
    </form>
  );
};

export default ServicesLeadForm;

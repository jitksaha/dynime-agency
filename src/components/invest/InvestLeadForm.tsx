import { useState } from "react";
import { z } from "zod";
import { apiPost } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { InvestmentPlan, InvestmentTarget } from "@/hooks/use-invest";


const Schema = z.object({
  full_name: z.string().trim().min(2, "Name is required").max(100),
  email: z.string().trim().email("Valid email required").max(255),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  country: z.string().trim().max(80).optional().or(z.literal("")),
  investment_amount: z.coerce.number().min(0).optional(),
  preferred_contact: z.enum(["email", "phone", "whatsapp"]).default("email"),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
  plan_slug: z.string().optional().or(z.literal("")),
  target_slug: z.string().optional().or(z.literal("")),
});

interface Props {
  plans: InvestmentPlan[];
  targets?: InvestmentTarget[];
  initialPlanSlug?: string;
  initialTargetSlug?: string;
  initialEmail?: string;
  initialName?: string;
}

const InvestLeadForm = ({ plans, targets = [], initialPlanSlug, initialTargetSlug, initialEmail, initialName }: Props) => {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState(() => {
    let base = {
      full_name: initialName ?? "",
      email: initialEmail ?? "",
      phone: "",
      country: "",
      investment_amount: "" as any,
      preferred_contact: "email" as const,
      message: "",
      plan_slug: initialPlanSlug ?? "",
      target_slug: initialTargetSlug ?? targets[0]?.slug ?? "",
    };
    try {
      const saved = localStorage.getItem("dynime_invest_lead_draft");
      if (saved) {
        base = { ...base, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error("Failed to parse invest lead form draft", e);
    }
    return base;
  });

  const set = (k: keyof typeof form, v: any) => {
    setForm((p) => {
      const next = { ...p, [k]: v };
      try {
        localStorage.setItem("dynime_invest_lead_draft", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Schema.safeParse({
      ...form,
      investment_amount: form.investment_amount === "" ? undefined : form.investment_amount,
    });
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
      toast.error(first ?? "Please review the form");
      return;
    }
    setSubmitting(true);
    try {
      await apiPost("/public/forms/invest-lead", {
        full_name: parsed.data.full_name,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        country: parsed.data.country || null,
        investment_amount: parsed.data.investment_amount ?? null,
        preferred_contact: parsed.data.preferred_contact,
        message: parsed.data.message || null,
        plan_slug: parsed.data.plan_slug || null,
        target_slug: parsed.data.target_slug || null,
      });
      setDone(true);
      try {
        localStorage.removeItem("dynime_invest_lead_draft");
      } catch {}
      toast.success("Thanks! Our investor relations team will be in touch shortly.");
    } catch (err: any) {
      toast.error(err?.message ?? "Could not submit. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    const next = `/investor${form.plan_slug ? `?plan=${encodeURIComponent(form.plan_slug)}` : ""}`;
    const applyHref = `/investor/login?next=${encodeURIComponent(next)}`;
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />
          <h3 className="font-heading text-xl font-semibold">Request received</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Our investor relations team will reach out within one business day with the
            agreement, KYC steps, and onboarding link.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            <Button asChild size="lg">
              <Link to={applyHref}>
                Create investor account <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/invest">Back to plans</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            You can complete the formal application now while we follow up by{" "}
            {form.preferred_contact}.
          </p>
        </CardContent>
      </Card>
    );
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle>Talk to investor relations</CardTitle>
        <CardDescription>
          Share a few details and we&apos;ll send you the agreement, projected returns, and onboarding steps.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
          {targets.length > 0 && (
            <div className="space-y-2 md:col-span-2">
              <Label>Where do you want to invest? *</Label>
              <div role="radiogroup" className="grid gap-2 sm:grid-cols-3">
                {targets.map((t) => {
                  const selected = form.target_slug === t.slug;
                  return (
                    <button
                      key={t.slug}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => set("target_slug", t.slug)}
                      className={`flex items-start gap-2 rounded-lg border p-3 text-left transition-all ${
                        selected
                          ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                          : "border-border hover:border-primary/50 hover:bg-accent/30"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                          selected ? "border-primary" : "border-muted-foreground/40"
                        }`}
                      >
                        {selected && <span className="h-2 w-2 rounded-full bg-primary" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">{t.name}</span>
                        {t.description && (
                          <span className="block text-xs text-muted-foreground mt-0.5 line-clamp-2">{t.description}</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Full name *</Label>
            <Input id="full_name" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="country">Country</Label>
            <Input id="country" value={form.country} onChange={(e) => set("country", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="amount">Investment amount (USD)</Label>
            <Input
              id="amount"
              type="number"
              min={0}
              value={form.investment_amount}
              onChange={(e) => set("investment_amount", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Plan of interest</Label>
            <Select value={form.plan_slug} onValueChange={(v) => set("plan_slug", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Any / not sure" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.slug}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Preferred contact</Label>
            <Select value={form.preferred_contact} onValueChange={(v) => set("preferred_contact", v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Phone call</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="msg">Message</Label>
            <Textarea
              id="msg"
              rows={4}
              placeholder="Anything you'd like us to prepare ahead of the call?"
              value={form.message}
              onChange={(e) => set("message", e.target.value)}
            />
          </div>
          <div className="md:col-span-2 flex flex-col sm:flex-row sm:items-center gap-3">
            <Button type="submit" size="lg" disabled={submitting} className="w-full sm:w-auto">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Request consultation
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link
                to={`/investor/login?next=${encodeURIComponent(
                  `/investor${form.plan_slug ? `?plan=${encodeURIComponent(form.plan_slug)}` : ""}`,
                )}`}
              >
                Create investor account <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <span className="text-xs text-muted-foreground sm:ml-1">
              Skip the call and sign up to start onboarding.
            </span>
          </div>

        </form>
      </CardContent>
    </Card>
  );
};

export default InvestLeadForm;

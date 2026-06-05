import { useState, useEffect } from "react";
import { z } from "zod";
import { apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Upload } from "lucide-react";

interface Props {
  careerId: string;
  careerSlug: string;
  careerTitle: string;
}

const schema = z.object({
  full_name: z.string().trim().min(2, "Full name is required").max(120),
  email: z.string().trim().email("Valid email required").max(200),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  country: z.string().trim().max(80).optional().or(z.literal("")),
  current_position: z.string().trim().max(160).optional().or(z.literal("")),
  experience_years: z.string().trim().max(3).optional().or(z.literal("")),
  expected_salary: z.string().trim().max(80).optional().or(z.literal("")),
  linkedin_url: z.string().trim().url("Invalid URL").max(300).optional().or(z.literal("")),
  portfolio_url: z.string().trim().url("Invalid URL").max(300).optional().or(z.literal("")),
  cover_letter: z.string().trim().max(5000).optional().or(z.literal("")),
});

const ALLOWED = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
const MAX_BYTES = 8 * 1024 * 1024;

const JobApplicationForm = ({ careerId, careerSlug, careerTitle }: Props) => {
  const [form, setForm] = useState(() => {
    let base = {
      full_name: "", email: "", phone: "", country: "", current_position: "",
      experience_years: "", expected_salary: "", linkedin_url: "", portfolio_url: "", cover_letter: "",
    };
    try {
      const saved = localStorage.getItem("dynime_job_app_draft");
      if (saved) {
        base = { ...base, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error("Failed to parse job app draft", e);
    }
    return base;
  });
  const [salaryAmount, setSalaryAmount] = useState(() => {
    try {
      return localStorage.getItem("dynime_job_app_salary_amount") || "";
    } catch { return ""; }
  });
  const [salaryPeriod, setSalaryPeriod] = useState<"yearly" | "monthly">((() => {
    try {
      return (localStorage.getItem("dynime_job_app_salary_period") as any) || "yearly";
    } catch { return "yearly"; }
  })());
  const [salaryNegotiable, setSalaryNegotiable] = useState(() => {
    try {
      return localStorage.getItem("dynime_job_app_salary_negotiable") === "true";
    } catch { return false; }
  });
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem("dynime_job_app_draft", JSON.stringify(form));
    } catch {}
  }, [form]);

  useEffect(() => {
    try {
      localStorage.setItem("dynime_job_app_salary_amount", salaryAmount);
    } catch {}
  }, [salaryAmount]);

  useEffect(() => {
    try {
      localStorage.setItem("dynime_job_app_salary_period", salaryPeriod);
    } catch {}
  }, [salaryPeriod]);

  useEffect(() => {
    try {
      localStorage.setItem("dynime_job_app_salary_negotiable", String(salaryNegotiable));
    } catch {}
  }, [salaryNegotiable]);

  const setField = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Build expected_salary string from structured inputs
    const expectedSalaryStr = salaryNegotiable
      ? "Negotiable"
      : salaryAmount.trim()
        ? `$${salaryAmount.trim()} USD / ${salaryPeriod}`
        : "";
    const formWithSalary = { ...form, expected_salary: expectedSalaryStr };
    const parsed = schema.safeParse(formWithSalary);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Invalid form");
      return;
    }
    setSubmitting(true);
    try {
      let resume_url: string | null = null;
      if (file) {
        if (!ALLOWED.includes(file.type)) {
          toast.error("Resume must be PDF or Word document");
          setSubmitting(false);
          return;
        }
        if (file.size > MAX_BYTES) {
          toast.error("Resume must be under 8 MB");
          setSubmitting(false);
          return;
        }
        const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
        const safeSlug = (careerSlug || "general").replace(/[^A-Za-z0-9_-]+/g, "-");
        const path = `public/${safeSlug}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        
        const fd = new FormData();
        fd.append("file", file);
        
        const uploadRes = await fetch(`/api/v1/public/forms/upload-resume?key=${encodeURIComponent(path)}`, {
          method: "POST",
          body: fd,
        });
        if (!uploadRes.ok) {
          throw new Error("Failed to upload resume file");
        }
        resume_url = path;
      }

      await apiPost("/public/forms/apply", {
        career_id: careerId,
        career_slug: careerSlug,
        career_title: careerTitle,
        full_name: parsed.data.full_name,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        country: parsed.data.country || null,
        current_position: parsed.data.current_position || null,
        experience_years: parsed.data.experience_years || null,
        expected_salary: parsed.data.expected_salary || null,
        linkedin_url: parsed.data.linkedin_url || null,
        portfolio_url: parsed.data.portfolio_url || null,
        cover_letter: parsed.data.cover_letter || null,
        resume_url,
      });

      setSubmitted(true);
      try {
        localStorage.removeItem("dynime_job_app_draft");
        localStorage.removeItem("dynime_job_app_salary_amount");
        localStorage.removeItem("dynime_job_app_salary_period");
        localStorage.removeItem("dynime_job_app_salary_negotiable");
      } catch {}
      toast.success("Application submitted! We'll be in touch.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div
        id="apply"
        translate="no"
        className="notranslate rounded-2xl border border-border/60 bg-card/60 p-8 text-center"
      >
        <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-4" />
        <h3 className="font-heading text-xl font-bold mb-2">Application received</h3>
        <p className="text-muted-foreground text-sm">
          Thanks for applying to <span className="font-semibold text-foreground">{careerTitle}</span>. Our team reviews applications within 5 business days.
        </p>
      </div>
    );
  }

  return (
    <form
      id="apply"
      onSubmit={onSubmit}
      translate="no"
      className="notranslate rounded-2xl border border-border/60 bg-card/60 p-6 md:p-8 space-y-5 scroll-mt-24"
    >
      <div>
        <h3 className="font-heading text-2xl font-bold">Apply for this role</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Fill out the form below. All fields marked * are required.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="full_name">Full name *</Label>
          <Input id="full_name" required value={form.full_name} onChange={(e) => setField("full_name", e.target.value)} placeholder="e.g. Jane Doe" autoComplete="name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email *</Label>
          <Input id="email" type="email" required value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder="you@example.com" autoComplete="email" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="+1 555 123 4567" autoComplete="tel" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="country">Country</Label>
          <Input id="country" value={form.country} onChange={(e) => setField("country", e.target.value)} placeholder="e.g. United States" autoComplete="country-name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="current_position">Current role</Label>
          <Input id="current_position" value={form.current_position} onChange={(e) => setField("current_position", e.target.value)} placeholder="e.g. Frontend Engineer @ Acme" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="experience_years">Years of experience</Label>
          <Input id="experience_years" type="number" min={0} max={60} value={form.experience_years} onChange={(e) => setField("experience_years", e.target.value)} placeholder="e.g. 3" />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="expected_salary">Expected salary</Label>
          <div className="flex flex-wrap items-stretch gap-2">
            <div className="relative flex-1 min-w-[160px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground pointer-events-none">
                $
              </span>
              <Input
                id="expected_salary"
                type="number"
                min={0}
                inputMode="numeric"
                value={salaryAmount}
                onChange={(e) => setSalaryAmount(e.target.value)}
                placeholder={salaryNegotiable ? "Negotiable" : "e.g. 80000"}
                disabled={salaryNegotiable}
                className="pl-7 pr-14 w-full"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground pointer-events-none">
                USD
              </span>
            </div>
            <Select
              value={salaryPeriod}
              onValueChange={(v) => setSalaryPeriod(v as "yearly" | "monthly")}
              disabled={salaryNegotiable}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yearly">Yearly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant={salaryNegotiable ? "default" : "outline"}
              onClick={() => setSalaryNegotiable((v) => !v)}
              className="shrink-0"
            >
              Negotiable
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {salaryNegotiable
              ? "Marked as negotiable — no number required."
              : salaryAmount
                ? `Will submit as: $${salaryAmount} USD / ${salaryPeriod}`
                : "Enter amount in USD and choose yearly or monthly, or mark negotiable."}
          </p>

        </div>

        <div className="space-y-1.5">
          <Label htmlFor="linkedin_url">LinkedIn URL</Label>
          <Input id="linkedin_url" type="url" value={form.linkedin_url} onChange={(e) => setField("linkedin_url", e.target.value)} placeholder="https://linkedin.com/in/..." />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="portfolio_url">Portfolio / website URL</Label>
          <Input id="portfolio_url" type="url" value={form.portfolio_url} onChange={(e) => setField("portfolio_url", e.target.value)} placeholder="https://..." />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="resume">Resume / CV (PDF or DOC, max 8 MB)</Label>
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 rounded-md border border-border bg-background hover:bg-muted/50 px-3 py-2 text-sm cursor-pointer transition-colors">
            <Upload className="w-4 h-4" />
            {file ? "Change file" : "Upload file"}
            <input
              id="resume"
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
          {file && <span className="text-xs text-muted-foreground truncate">{file.name}</span>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cover_letter">Cover letter / why you</Label>
        <Textarea
          id="cover_letter"
          rows={6}
          maxLength={5000}
          value={form.cover_letter}
          onChange={(e) => setField("cover_letter", e.target.value)}
          placeholder="Tell us briefly why you're a great fit for this role."
        />
        <p className="text-xs text-muted-foreground text-right">{form.cover_letter.length}/5000</p>
      </div>

      <Button type="submit" size="lg" disabled={submitting} className="w-full sm:w-auto">
        {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</> : "Submit application"}
      </Button>
    </form>
  );
};

export default JobApplicationForm;

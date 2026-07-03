import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { usePageSEO } from "@/hooks/use-page-seo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { apiPost, api } from "@/lib/api";
import {
  GraduationCap, CheckCircle2, Award, Globe, ShieldCheck, Clock,
  ArrowRight, Upload, X, AlertCircle, Loader2, Sparkles, HelpCircle,
  Code, Laptop, Palette, Megaphone, Smartphone, Settings, BarChart2,
  FileCheck, Shield, ChevronDown
} from "lucide-react";

// Types
type FormState = {
  fullName: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  linkedin: string;
  university: string;
  college: string;
  department: string;
  program: string;
  degree: string;
  studentId: string;
  graduationYear: string;
  currentSemester: string;
  service: string;
  budget: string;
  projectDescription: string;
  deadline: string;
  website: string;
  documentUrl: string;
  confirmAccurate: boolean;
  confirmContact: boolean;
};

const INITIAL_FORM_STATE: FormState = {
  fullName: "",
  email: "",
  phone: "",
  country: "",
  city: "",
  linkedin: "",
  university: "",
  college: "",
  department: "",
  program: "",
  degree: "",
  studentId: "",
  graduationYear: "",
  currentSemester: "",
  service: "Website Development",
  budget: "",
  projectDescription: "",
  deadline: "",
  website: "",
  documentUrl: "",
  confirmAccurate: false,
  confirmContact: false,
};

const ELIGIBLE_SERVICES = [
  { name: "Website Design", icon: Palette, desc: "Bespoke high-converting design systems" },
  { name: "Website Development", icon: Code, desc: "React, Next.js, and modern full-stack web builds" },
  { name: "WordPress", icon: Settings, desc: "Enterprise WooCommerce & customized WordPress design" },
  { name: "Shopify", icon: Laptop, desc: "Premium commerce storefronts & custom apps" },
  { name: "UI/UX Design", icon: Palette, desc: "Interactive prototyping and user journey mappings" },
  { name: "Branding", icon: Sparkles, desc: "Visual identity, brand guidelines, and logos" },
  { name: "SEO", icon: BarChart2, desc: "Rank on Page 1 with technical & content SEO strategy" },
  { name: "Digital Marketing", icon: Megaphone, desc: "High-ROI Google & Meta paid media advertising" },
  { name: "AI Automation", icon: Code, desc: "Intelligent agents, workflows & custom ML pipelines" },
  { name: "Business Consultation", icon: Globe, desc: "Global company formation (US LLC / UK LTD) strategy" },
  { name: "SaaS Development", icon: Settings, desc: "Scale your software startup with cloud-native backends" },
  { name: "Custom Software", icon: Laptop, desc: "Tailor-made software built to execute complex business tasks" },
];

const FAQS = [
  {
    q: "Who can apply?",
    a: "Any currently enrolled student from a recognized educational institution (high school, college, university, or higher education) worldwide is eligible to apply."
  },
  {
    q: "Is approval guaranteed?",
    a: "No. All applications are individually reviewed by our verification team based on the accuracy of your academic documents, current enrollment status, and project details."
  },
  {
    q: "How much discount can I receive?",
    a: "Discounts are customized and determined based on your specific project requirements, scope of work, and our available monthly student support budget."
  },
  {
    q: "How long does verification take?",
    a: "The verification process is fast. Most applications are reviewed and processed within 1 to 3 business days after submission."
  },
  {
    q: "Will my documents remain private?",
    a: "Yes, absolutely. All uploaded documentation is processed securely, used solely for current enrollment verification, and is never shared publicly or with third parties."
  }
];

const StudentProgram = () => {
  usePageSEO("student-program" as any, {
    title: "Student Program | Verified Student Discounts | Dynime",
    description: "Apply for the Dynime Student Program to access exclusive educational pricing on web development, software, AI automation, branding, digital marketing, and business consulting. Verification required.",
    keywords: [
      "student discount web development",
      "student website development",
      "student software development",
      "university student discount",
      "student digital marketing",
      "student startup support",
      "student AI services",
      "affordable web development for students",
      "Dynime Student Program",
      "verified student pricing"
    ]
  });

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [form, setForm] = useState<FormState>(INITIAL_FORM_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const updateForm = (key: keyof FormState, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  // Drag and drop states
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileUpload = async (file: File) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/jpg',
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error("File format not supported. Upload PDF, JPG, PNG, or DOCX.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);
    setFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const key = `${Date.now()}-${cleanName}`;

      setUploadProgress(50);
      const res = await api.post<{ key: string; bucket: string }>(
        `/public/forms/upload-student-proof?key=${encodeURIComponent(key)}`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      ).then(r => r.data);

      setUploadProgress(100);
      if (res?.key) {
        updateForm("documentUrl", res.key);
        toast.success("Document uploaded successfully!");
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err: any) {
      toast.error(err?.message || "File upload failed. Please try again.");
      setFileName("");
    } finally {
      setIsUploading(false);
    }
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!form.fullName.trim() || !form.email.trim() || !form.country.trim() || !form.city.trim()) {
        toast.error("Please fill in all required fields.");
        return;
      }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) {
        toast.error("Please enter a valid email address.");
        return;
      }
    }
    if (currentStep === 2) {
      if (!form.university.trim() || !form.degree.trim() || !form.studentId.trim() || !form.graduationYear.trim()) {
        toast.error("Please fill in university details.");
        return;
      }
    }
    if (currentStep === 3) {
      if (!form.projectDescription.trim()) {
        toast.error("Please provide a short project description.");
        return;
      }
      if (!form.documentUrl) {
        toast.error("Please upload a valid proof of enrollment.");
        return;
      }
    }
    setCurrentStep(prev => prev + 1);
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.confirmAccurate || !form.confirmContact) {
      toast.error("You must agree to the verification terms.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: form.fullName,
        email: form.email,
        phone: form.phone,
        country: form.country,
        city: form.city,
        linkedin: form.linkedin,
        university: form.university,
        college: form.college,
        department: form.department,
        program: form.program,
        degree: form.degree,
        studentId: form.studentId,
        graduationYear: form.graduationYear,
        currentSemester: form.currentSemester,
        service: form.service,
        budget: form.budget,
        projectDescription: form.projectDescription,
        deadline: form.deadline,
        website: form.website,
        documentUrl: form.documentUrl,
      };

      const res = await apiPost<{ success?: boolean }>(
        "/public/forms/submit",
        {
          slug: "student-program",
          data: payload,
        }
      );

      if (res?.success) {
        setFormSuccess(true);
        toast.success("Application submitted successfully!");
        setForm(INITIAL_FORM_STATE);
        setFileName("");
        setCurrentStep(1);
      } else {
        throw new Error("Submission failed");
      }
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollToForm = () => {
    const el = document.getElementById("verification-form");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-10 pb-16 md:py-24">
        {/* Glow Effects */}
        <div className="absolute inset-0 -z-10" aria-hidden="true">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px]" />
        </div>

        <div className="container-custom grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6 text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 backdrop-blur px-3.5 py-1 text-xs font-semibold text-primary">
              <GraduationCap className="w-4 h-4" />
              Dynime Student Program
            </span>
            <h1 className="font-heading font-extrabold tracking-tight text-foreground text-4xl sm:text-5xl md:text-6xl leading-[1.05]">
              Empowering Students with <span className="gradient-text">Professional Digital</span> Solutions
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl">
              We believe great ideas shouldn't be limited by budget. If you're currently enrolled at a college or university, you may qualify for exclusive student pricing on selected Dynime services after successful verification.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Button size="lg" className="w-full sm:w-auto rounded-full font-bold px-8 shadow-lg shadow-primary/20" onClick={scrollToForm}>
                Apply for Student Verification
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto rounded-full font-bold px-8" onClick={() => {
                const el = document.getElementById("eligible-services");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}>
                Explore Eligible Services
              </Button>
            </div>
          </div>

          {/* Right Side 3D Canvas / Aesthetic illustration */}
          <div className="lg:col-span-5 relative flex justify-center items-center h-[350px] md:h-[420px]">
            <div className="absolute w-[300px] h-[300px] rounded-full border border-primary/20 animate-[spin_60s_linear_infinite]" />
            <div className="absolute w-[220px] h-[220px] rounded-full border border-dashed border-primary/30 animate-[spin_40s_linear_infinite]" />

            {/* Glowing Center */}
            <div className="relative w-40 h-40 rounded-3xl bg-gradient-to-tr from-primary to-primary-foreground/40 shadow-2xl flex items-center justify-center backdrop-blur-md ring-1 ring-white/20 animate-pulse">
              <GraduationCap className="w-20 h-20 text-white drop-shadow-lg" />
            </div>

            {/* Floating Tags */}
            {[
              { text: "AI", pos: "top-4 left-8 animate-[bounce_6s_ease-in-out_infinite]" },
              { text: "Code", pos: "top-10 right-8 animate-[bounce_8s_ease-in-out_infinite]" },
              { text: "Startup", pos: "bottom-14 left-4 animate-[bounce_7s_ease-in-out_infinite]" },
              { text: "SEO", pos: "bottom-6 right-12 animate-[bounce_9s_ease-in-out_infinite]" },
              { text: "Design", pos: "top-1/2 -left-6 animate-[bounce_5s_ease-in-out_infinite]" },
              { text: "Analytics", pos: "bottom-1/2 -right-8 animate-[bounce_10s_ease-in-out_infinite]" }
            ].map((tag, i) => (
              <span key={i} className={`absolute px-3 py-1.5 rounded-full text-xs font-semibold border border-border bg-background/80 backdrop-blur shadow-md ${tag.pos}`}>
                {tag.text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Strip */}
      <section className="py-12 border-y border-border/40 bg-card/20 relative">
        <div className="container-custom max-w-4xl text-center space-y-4">
          <h2 className="font-heading font-bold text-xl md:text-2xl text-foreground">
            Built to Support Future Professionals
          </h2>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
            Whether you're building your first startup, developing your portfolio, launching an online business, or completing academic projects, Dynime wants to make professional digital services more accessible. Our student program helps verified students receive personalized educational pricing without compromising quality.
          </p>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-[0.2em]">
              Benefits
            </span>
            <h2 className="font-heading font-bold text-3xl md:text-4xl mt-2 text-foreground">
              Why Join the Dynime Student Program?
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: FileCheck, title: "Verified Student Pricing", desc: "Access custom educational discounts customized directly to your academic or startup project's scale." },
              { icon: Award, title: "Premium Quality", desc: "Receive the exact same tier of elite, professional design and engineering trusted by enterprises globally." },
              { icon: Clock, title: "Flexible Consultation", desc: "Work with our dedicated strategists to coordinate a delivery package that aligns with your timeline." },
              { icon: Globe, title: "Global Eligibility", desc: "Currently enrolled students from any recognized high school, college, or university worldwide are welcome." },
              { icon: Shield, title: "Secure Verification", desc: "Your identity files and proof of enrollment are handled securely and never published or shared." },
              { icon: CheckCircle2, title: "Fast Review", desc: "Our verification team typically processes and reviews application submissions in just 1 to 3 business days." }
            ].map((b, i) => (
              <Card key={i} className="glass-card-hover border-border/50 hover:border-primary/30 transition-all p-6 text-left">
                <CardContent className="p-0 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <b.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-heading font-bold text-lg text-foreground">{b.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Services Grid Section */}
      <section id="eligible-services" className="section-padding bg-card/25 border-y border-border/40 relative">
        <div className="container-custom">
          <div className="text-center mb-12 max-w-2xl mx-auto space-y-3">
            <span className="inline-flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-[0.2em]">
              Services
            </span>
            <h2 className="font-heading font-bold text-3xl md:text-4xl text-foreground">
              Services Eligible for Student Support
            </h2>
            <p className="text-sm text-muted-foreground">
              Select from our wide suite of professional disciplines to build your next milestone project.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ELIGIBLE_SERVICES.map((s, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <s.icon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">{s.name}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground/80 text-center mt-8">
            * Note: Service availability and discount percentage may vary depending on project scope.
          </p>
        </div>
      </section>

      {/* Verification Timeline */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="text-center mb-14">
            <span className="inline-flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-[0.2em]">
              Timeline
            </span>
            <h2 className="font-heading font-bold text-3xl md:text-4xl mt-2 text-foreground">
              How the Verification Process Works
            </h2>
          </div>

          <div className="relative max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
              {[
                { step: "Step 1", title: "Submit Application", desc: "Fill in the multi-step verification form below." },
                { step: "Step 2", title: "Upload Student Proof", desc: "Upload a photo or PDF of your university proof." },
                { step: "Step 3", title: "Verification Review", desc: "Our team reviews your submission in 1–3 business days." },
                { step: "Step 4", title: "Receive Student Benefits", desc: "Once verified, we contact you with custom support rates." }
              ].map((timelineStep, i) => (
                <div key={i} className="text-center space-y-3 relative">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto shadow-md">
                    <span className="font-bold text-sm">{i + 1}</span>
                  </div>
                  <span className="text-[11px] font-extrabold text-primary uppercase tracking-wider">{timelineStep.step}</span>
                  <h3 className="font-heading font-bold text-base text-foreground">{timelineStep.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-[200px] mx-auto">{timelineStep.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Requirements Section */}
      <section className="section-padding bg-card/10 border-t border-border/40">
        <div className="container-custom max-w-3xl">
          <div className="border border-border/60 bg-background/50 backdrop-blur rounded-3xl p-6 md:p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="font-heading font-bold text-xl md:text-2xl text-foreground">
                Verification Requirements
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              To apply, you must provide at least one valid proof from the list below:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {[
                "Official university email address (.edu or institutional domain)",
                "Current student ID Card photo (front and back)",
                "Official Enrollment Certificate or Enrollment Letter",
                "Admission Letter of current term",
                "Recent tuition payment receipt with student name",
                "Any official registrar document proving current student status"
              ].map((req, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{req}</span>
                </div>
              ))}
            </div>
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 text-xs text-muted-foreground leading-relaxed space-y-2">
              <p>
                <strong>Important Notice:</strong> Applicants should preferably use their official university email address when submitting the application. If unavailable, a valid proof of enrollment must be uploaded.
              </p>
              <p>
                Dynime reserves the right to request additional verification documentation if necessary to validate student status.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Verification Form Section */}
      <section id="verification-form" className="section-padding border-t border-border/40 relative">
        <div className="container-custom max-w-2xl">
          {formSuccess ? (
            <Card className="border-emerald-500/20 bg-emerald-500/5 rounded-3xl text-center p-8 md:p-10 space-y-5">
              <CardContent className="p-0 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="font-heading font-bold text-2xl md:text-3xl text-foreground">
                  Verification Request Submitted!
                </h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Thank you for applying. Our verification team is reviewing your documents. We will contact you at your provided email address within 1 to 3 business days.
                </p>
                <Button size="lg" variant="outline" className="rounded-full" onClick={() => setFormSuccess(false)}>
                  Submit Another Request
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-3xl border-border/60 shadow-xl overflow-hidden bg-card/80 backdrop-blur-sm">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/20 via-primary to-primary/20" />
              <CardContent className="p-6 md:p-8 space-y-6">
                <div>
                  <h2 className="text-xl font-heading font-bold text-foreground">Student Verification Application</h2>
                  <p className="text-xs text-muted-foreground mt-1">Please fill in your details to request student pricing support.</p>
                </div>

                {/* Progress Indicators */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-primary">Step {currentStep} of 4</span>
                    <span className="text-muted-foreground">
                      {currentStep === 1 && "Personal Info"}
                      {currentStep === 2 && "Academic Details"}
                      {currentStep === 3 && "Project & Document Upload"}
                      {currentStep === 4 && "Review & Submit"}
                    </span>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-300" style={{ width: `${(currentStep / 4) * 100}%` }} />
                  </div>
                </div>

                {/* Form Elements */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <h3 className="font-bold text-sm text-foreground">Personal Information</h3>
                    <div className="space-y-1.5">
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input id="fullName" value={form.fullName} onChange={e => updateForm("fullName", e.target.value)} placeholder="e.g. Yuki Tanaka" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="email">Email Address *</Label>
                        <Input id="email" type="email" value={form.email} onChange={e => updateForm("email", e.target.value)} placeholder="University email preferred" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input id="phone" value={form.phone} onChange={e => updateForm("phone", e.target.value)} placeholder="e.g. +1 555-123-4567" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="country">Country *</Label>
                        <Input id="country" value={form.country} onChange={e => updateForm("country", e.target.value)} placeholder="e.g. Australia" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="city">City *</Label>
                        <Input id="city" value={form.city} onChange={e => updateForm("city", e.target.value)} placeholder="e.g. Sydney" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="linkedin">LinkedIn Profile (optional)</Label>
                      <Input id="linkedin" value={form.linkedin} onChange={e => updateForm("linkedin", e.target.value)} placeholder="https://linkedin.com/in/username" />
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-4">
                    <h3 className="font-bold text-sm text-foreground">Academic Information</h3>
                    <div className="space-y-1.5">
                      <Label htmlFor="university">University Name *</Label>
                      <Input id="university" value={form.university} onChange={e => updateForm("university", e.target.value)} placeholder="e.g. University of Sydney" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="college">College / Institute</Label>
                        <Input id="college" value={form.college} onChange={e => updateForm("college", e.target.value)} placeholder="e.g. Engineering & IT" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="department">Department</Label>
                        <Input id="department" value={form.department} onChange={e => updateForm("department", e.target.value)} placeholder="e.g. Computer Science" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="program">Program / Major</Label>
                        <Input id="program" value={form.program} onChange={e => updateForm("program", e.target.value)} placeholder="e.g. Software Engineering" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="degree">Degree *</Label>
                        <Input id="degree" value={form.degree} onChange={e => updateForm("degree", e.target.value)} placeholder="e.g. Bachelor of Science" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="studentId">Student ID Number *</Label>
                        <Input id="studentId" value={form.studentId} onChange={e => updateForm("studentId", e.target.value)} placeholder="e.g. SID129482" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="graduationYear">Expected Graduation *</Label>
                        <Input id="graduationYear" value={form.graduationYear} onChange={e => updateForm("graduationYear", e.target.value)} placeholder="e.g. 2028" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="currentSemester">Current Semester</Label>
                        <Input id="currentSemester" value={form.currentSemester} onChange={e => updateForm("currentSemester", e.target.value)} placeholder="e.g. 4th" />
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="space-y-4">
                    <h3 className="font-bold text-sm text-foreground">Project Details & Verification Proof</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="service">Service of Interest *</Label>
                        <select
                          id="service"
                          value={form.service}
                          onChange={e => updateForm("service", e.target.value)}
                          className="w-full h-10 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          {ELIGIBLE_SERVICES.map((s, idx) => (
                            <option key={idx} value={s.name}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="budget">Estimated Budget</Label>
                        <Input id="budget" value={form.budget} onChange={e => updateForm("budget", e.target.value)} placeholder="e.g. $500" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="projectDescription">Project Description *</Label>
                      <Textarea id="projectDescription" value={form.projectDescription} onChange={e => updateForm("projectDescription", e.target.value)} placeholder="Describe what you plan to build..." rows={3} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="deadline">Target Deadline</Label>
                        <Input id="deadline" type="date" value={form.deadline} onChange={e => updateForm("deadline", e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="website">Website Link (optional)</Label>
                        <Input id="website" value={form.website} onChange={e => updateForm("website", e.target.value)} placeholder="https://example.com" />
                      </div>
                    </div>

                    {/* Drag and Drop File Upload Area */}
                    <div className="space-y-1.5">
                      <Label>Upload Verification Document *</Label>
                      <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={(e) => { e.preventDefault(); setIsDragOver(false); if (e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files[0]); }}
                        className={`border-2 border-dashed rounded-2xl p-6 text-center space-y-2 cursor-pointer transition-all ${isDragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 bg-background/50"}`}
                        onClick={() => {
                          const fileInput = document.getElementById("file-upload");
                          if (fileInput) fileInput.click();
                        }}
                      >
                        <input
                          type="file"
                          id="file-upload"
                          className="hidden"
                          accept=".pdf,.jpeg,.jpg,.png,.docx"
                          onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]); }}
                        />
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                          {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                        </div>
                        <p className="text-xs font-semibold text-foreground">
                          {isUploading ? `Uploading document... (${uploadProgress}%)` : fileName ? `File: ${fileName}` : "Drag & Drop your document here, or browse"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Supports PDF, JPG, PNG, JPEG, DOCX up to 10 MB.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="space-y-5">
                    <h3 className="font-bold text-sm text-foreground">Review Application</h3>
                    <div className="grid grid-cols-2 gap-4 text-xs p-4 bg-muted/30 border border-border/50 rounded-2xl leading-relaxed">
                      <div>
                        <span className="block font-semibold text-muted-foreground">Full Name:</span>
                        <span className="text-foreground">{form.fullName}</span>
                      </div>
                      <div>
                        <span className="block font-semibold text-muted-foreground">Email:</span>
                        <span className="text-foreground">{form.email}</span>
                      </div>
                      <div>
                        <span className="block font-semibold text-muted-foreground">University:</span>
                        <span className="text-foreground">{form.university}</span>
                      </div>
                      <div>
                        <span className="block font-semibold text-muted-foreground">Degree:</span>
                        <span className="text-foreground">{form.degree}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="block font-semibold text-muted-foreground">Service Interest:</span>
                        <span className="text-foreground">{form.service}</span>
                      </div>
                      {fileName && (
                        <div className="col-span-2">
                          <span className="block font-semibold text-muted-foreground">Uploaded Proof:</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">{fileName}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          id="confirmAccurate"
                          checked={form.confirmAccurate}
                          onChange={e => updateForm("confirmAccurate", e.target.checked)}
                          className="mt-1 shrink-0 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <label htmlFor="confirmAccurate" className="text-xs text-muted-foreground leading-normal">
                          I confirm that the submitted information is accurate, valid, and reflects my current enrollment.
                        </label>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          id="confirmContact"
                          checked={form.confirmContact}
                          onChange={e => updateForm("confirmContact", e.target.checked)}
                          className="mt-1 shrink-0 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <label htmlFor="confirmContact" className="text-xs text-muted-foreground leading-normal">
                          I agree that Dynime may contact me regarding validation of this proof and student pricing options.
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Wizard Controls */}
                <div className="flex items-center justify-between pt-4 border-t border-border/60">
                  {currentStep > 1 ? (
                    <Button type="button" variant="outline" className="rounded-full px-6" onClick={handlePrev}>
                      Back
                    </Button>
                  ) : (
                    <div />
                  )}
                  {currentStep < 4 ? (
                    <Button type="button" className="rounded-full px-6" onClick={handleNext}>
                      Next Step <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  ) : (
                    <Button type="button" className="rounded-full px-6 shadow-md shadow-primary/25" disabled={isSubmitting} onClick={handleSubmit}>
                      {isSubmitting ? (
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                        </span>
                      ) : (
                        "Submit Student Verification"
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="section-padding bg-card/25 border-y border-border/40">
        <div className="container-custom max-w-3xl">
          <div className="text-center mb-10">
            <span className="inline-flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-[0.2em]">
              FAQ
            </span>
            <h2 className="font-heading font-bold text-3xl md:text-4xl mt-2 text-foreground">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const active = activeFaq === idx;
              return (
                <div key={idx} className="border border-border/50 bg-background/50 rounded-2xl overflow-hidden transition-all">
                  <button
                    type="button"
                    onClick={() => setActiveFaq(active ? null : idx)}
                    className="w-full flex items-center justify-between p-5 text-left font-bold text-sm md:text-base text-foreground focus:outline-none"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${active ? "rotate-180" : ""}`} />
                  </button>
                  <div className={`transition-all duration-300 overflow-hidden ${active ? "max-h-40 border-t border-border/40 p-5 bg-card/20" : "max-h-0"}`}>
                    <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                      {faq.a}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="section-padding relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.08),transparent_60%)]" />
        <div className="container-custom max-w-2xl text-center space-y-6">
          <h2 className="font-heading font-extrabold text-3xl md:text-4xl text-foreground">
            Build Your Future with Dynime
          </h2>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
            Professional solutions shouldn't be out of reach while you're learning. Apply today and discover whether you qualify for exclusive student pricing.
          </p>
          <Button size="lg" className="rounded-full px-8 shadow-lg shadow-primary/20" onClick={scrollToForm}>
            Apply Now
          </Button>
        </div>
      </section>

      {/* Footer Notice */}
      <div className="py-6 border-t border-border/30 text-center">
        <p className="text-[10px] text-muted-foreground/80 max-w-xl mx-auto leading-normal">
          Student discounts are available only after successful verification. Dynime reserves the right to reject fraudulent applications or request additional documentation.
        </p>
      </div>
    </Layout>
  );
};

export default StudentProgram;

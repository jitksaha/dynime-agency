import Layout from "@/components/layout/Layout";
import { usePageSEO } from "@/hooks/use-page-seo";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Users,
  Briefcase,
  Receipt,
  FolderKanban,
  Headphones,
  ShoppingBag,
  Boxes,
  ShieldCheck,
  Globe,
  Sparkles,
  CheckCircle2,
  Brain,
  Zap,
} from "lucide-react";

type Module = {
  id: string;
  title: string;
  desc: string;
  icon: typeof Users;
  features: string[];
};

const modules: Module[] = [
  {
    id: "crm",
    title: "Dynime CRM",
    desc: "Track leads, deals, contacts and forecasts with a Kanban pipeline built for closing.",
    icon: Briefcase,
    features: ["Lead capture", "Deal pipeline", "Quotes & contracts", "Sales forecasting"],
  },
  {
    id: "hrm",
    title: "Dynime HRM",
    desc: "Manage employees, attendance, leaves, payroll and performance reviews end-to-end.",
    icon: Users,
    features: ["Employee directory", "Attendance & leaves", "Payroll runs", "Appraisals & KPIs"],
  },
  {
    id: "sales",
    title: "Dynime Sales",
    desc: "Quotes, orders, POS and storefront — sell online and in-store from one inventory.",
    icon: ShoppingBag,
    features: ["Online storefront", "POS terminal", "Orders & invoices", "Discounts & coupons"],
  },
  {
    id: "finance",
    title: "Dynime Finance",
    desc: "Double-entry accounting with invoices, expenses, taxes and full financial statements.",
    icon: Receipt,
    features: ["Invoices & estimates", "Expenses & bills", "Tax & VAT", "P&L, Balance Sheet"],
  },
  {
    id: "projects",
    title: "Dynime Projects",
    desc: "Plan, assign and ship — with task boards, milestones, time tracking and Gantt views.",
    icon: FolderKanban,
    features: ["Kanban & Gantt", "Time tracking", "Milestones", "Client portals"],
  },
  {
    id: "inventory",
    title: "Dynime Inventory",
    desc: "Real-time stock, multi-warehouse transfers, barcode scans and low-stock alerts.",
    icon: Boxes,
    features: ["SKU tracking", "Stock transfers", "Barcode/QR", "Reorder alerts"],
  },
  {
    id: "ai",
    title: "Dynime AI",
    desc: "AI copilots across every module — draft emails, summarize tickets, forecast revenue and automate workflows.",
    icon: Brain,
    features: ["AI assistants", "Smart automations", "Predictive insights", "Document AI"],
  },
  {
    id: "support",
    title: "Dynime Support",
    desc: "Omnichannel helpdesk with SLA tracking, automations and a branded customer portal.",
    icon: Headphones,
    features: ["Email-to-ticket", "SLA & priorities", "Macros & rules", "Customer portal"],
  },
];

const highlights = [
  { icon: Sparkles, title: "AI-Powered", desc: "Copilots built into every module." },
  { icon: ShieldCheck, title: "Enterprise security", desc: "RBAC, audit logs, daily backups." },
  { icon: Globe, title: "Multi-company", desc: "Branches, currencies and teams." },
  { icon: Zap, title: "Automation-ready", desc: "No-code workflows across modules." },
];

const ProductDbm = () => {
  usePageSEO("product-dbm", {
    title: "Dynime OS — The AI-Powered Business Operating System",
    description:
      "Dynime OS unifies CRM, HRM, Sales, Finance, Projects, Inventory, AI and Support into one intelligent platform — built by Dynime LLC. for growing companies.",
    keywords: [
      "Dynime OS",
      "AI business operating system",
      "Dynime CRM",
      "Dynime HRM",
      "Dynime Finance",
      "Dynime AI",
      "Dynime LLC product",
    ],
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Dynime OS",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      description:
        "The AI-powered business operating system for growing companies — CRM, HRM, Sales, Finance, Projects, Inventory, AI and Support.",
    },
  });

  return (
    <Layout>
      {/* Hero */}
      <section className="section-padding pt-24 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-background to-background" />
        <div className="container-custom">
          <div className="max-w-3xl mx-auto text-center">
            <ScrollReveal>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                <Sparkles className="w-3.5 h-3.5" /> Product · Dynime LLC.
              </span>
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <h1 className="font-heading text-4xl md:text-6xl font-bold mt-5 mb-4 text-foreground">
                Dynime <span className="gradient-text">OS</span>
              </h1>
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
                The AI-Powered Business Operating System for Growing Companies. Dynime CRM, HRM,
                Sales, Finance, Projects, Inventory, AI and Support — one intelligent platform.
              </p>
            </ScrollReveal>
            <ScrollReveal delay={0.3}>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <Button variant="hero" size="lg" asChild>
                  <Link to="/contact">
                    Request a Demo <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <a href="#modules">Explore Modules</a>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground/70 mt-4">
                Production access opens soon — contact us to be notified.
              </p>
            </ScrollReveal>
          </div>

          {/* Highlights */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto mt-14">
            {highlights.map((h, i) => (
              <ScrollReveal key={h.title} delay={i * 0.05}>
                <div className="p-4 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm text-center">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 mx-auto flex items-center justify-center mb-2">
                    <h.icon className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-sm font-heading font-semibold text-foreground">{h.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{h.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Module deep-link nav */}
      <div className="sticky top-16 z-30 border-y border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container-custom">
          <nav
            aria-label="Dynime OS modules"
            className="flex gap-1 overflow-x-auto py-2 scrollbar-thin"
          >
            {modules.map((m) => (
              <a
                key={m.id}
                href={`#${m.id}`}
                className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors border border-transparent hover:border-primary/20"
              >
                {m.title.replace("Dynime ", "")}
              </a>
            ))}
          </nav>
        </div>
      </div>

      {/* Modules */}
      <section id="modules" className="section-padding">
        <div className="container-custom">
          <ScrollReveal>
            <div className="text-center mb-12">
              <span className="text-primary text-sm font-semibold uppercase tracking-wider">
                Inside Dynime OS
              </span>
              <h2 className="font-heading text-3xl md:text-4xl font-bold mt-3 mb-2">
                Eight <span className="gradient-text">Modules</span>, One Platform
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto text-sm">
                Every module is included. Turn on what you need, keep the rest off — one platform,
                one bill, one team.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((m, i) => (
              <ScrollReveal key={m.id} delay={i * 0.04} className="h-full">
                <div
                  id={m.id}
                  className="h-full p-5 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm hover:border-primary/30 transition-all duration-300 group scroll-mt-32"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <m.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-heading font-semibold text-sm text-foreground">
                        {m.title}
                      </h3>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">{m.desc}</p>
                  <ul className="space-y-1.5">
                    {m.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs text-foreground/80">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default ProductDbm;

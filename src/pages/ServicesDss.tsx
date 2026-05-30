import Layout from "@/components/layout/Layout";
import { usePageSEO } from "@/hooks/use-page-seo";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BrainCircuit,
  Sparkles,
  CheckCircle2,
  Clock,
  Target,
  Code,
  Shield,
} from "lucide-react";
import { getServicesByCategory } from "@/data/services";

/**
 * Static, hand-tuned "best-fit" + headline-feature data for each DSS slug.
 */
const DSS_META: Record<
  string,
  { icon: typeof BrainCircuit; bestFit: string; topFeatures: string[]; estimatedTimeline: string }
> = {
  "custom-software-development": {
    icon: Code,
    bestFit: "Teams outgrowing spreadsheets, generic SaaS, or legacy systems",
    topFeatures: ["Web apps & SaaS", "Internal tools & dashboards", "API design & integrations"],
    estimatedTimeline: "8 – 20 weeks",
  },
  "ai-software-development": {
    icon: BrainCircuit,
    bestFit: "Companies replacing legacy software with AI-native systems",
    topFeatures: ["LLM & RAG apps", "Custom fine-tuning", "Private deployments"],
    estimatedTimeline: "8 – 16 weeks",
  },
  "software-built-with-ai": {
    icon: Sparkles,
    bestFit: "Founders & teams that need to ship faster without losing quality",
    topFeatures: ["AI pair-programming", "3× faster delivery", "Senior human review"],
    estimatedTimeline: "2 – 8 weeks",
  },
  "software-testing-qa": {
    icon: Shield,
    bestFit: "Teams whose releases are slow, fragile, or buggy in production",
    topFeatures: ["E2E test automation", "Performance & security testing", "CI/CD integration"],
    estimatedTimeline: "2 – 6 weeks",
  },
};

const ServicesDss = () => {
  const services = getServicesByCategory("dss");

  usePageSEO("services-dss", {
    title: "DSS — Dynime Software Services | Custom Software, AI Apps & QA",
    description:
      "Dynime Software Services: custom software development, AI software development, AI-augmented engineering, and software testing & QA — engineered by senior humans.",
    keywords: [
      "custom software development",
      "AI software development",
      "AI-augmented software development",
      "software built with AI",
      "software testing services",
      "QA services",
      "DSS Dynime",
    ],
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Service",
      provider: { "@type": "Organization", name: "Dynime Inc." },
      areaServed: "Worldwide",
      serviceType: "Software Development & AI Services",
      name: "Dynime Software Services (DSS)",
      description:
        "Custom software development, AI software development, AI-augmented engineering, and software testing & QA.",
    },
  });

  return (
    <Layout>
      {/* Hero */}
      <section className="relative section-padding overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-sky-500/10 pointer-events-none" />
        <div className="container-custom relative">
          <ScrollReveal>
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                DSS — Dynime Software Services
              </span>
              <h1 className="font-heading text-4xl md:text-6xl font-bold mt-5 mb-5 leading-tight">
                Custom Software, AI Products & QA —{" "}
                <span className="gradient-text">Built To Solve Real Business Problems</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                Four focused service lines: bespoke <strong>custom software</strong>,{" "}
                <strong>AI software</strong> built around LLMs and your data,{" "}
                <strong>AI-augmented development</strong> that ships 3× faster, and rigorous{" "}
                <strong>software testing & QA</strong> — designed, built, and hardened by senior
                engineers.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button variant="hero" size="lg" asChild>
                  <Link to="/contact">
                    Start a Software Project <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <a href="#dss-services">Explore Services</a>
                </Button>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Services list */}
      <section id="dss-services" className="section-padding pt-0">
        <div className="container-custom">
          <ScrollReveal>
            <div className="mb-10">
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-3">
                Our Four Software & AI Service Lines
              </h2>
              <p className="text-muted-foreground max-w-2xl">
                Whether you need a bespoke platform, an AI-native product, an AI-accelerated build,
                or a hardened QA process — pick the track that fits your stage.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {services.map((s, i) => {
              const meta = DSS_META[s.slug];
              const Icon = meta?.icon || s.icon;
              return (
                <ScrollReveal key={s.slug} delay={i * 0.05} className="h-full">
                  <article className="glass-card p-6 h-full flex flex-col group hover:border-primary/40 transition-colors">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-sky-500/20 border border-primary/20 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-heading text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                          {s.title}
                        </h3>
                        {meta && (
                          <p className="text-xs text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {meta.estimatedTimeline}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                      {s.description}
                    </p>
                    {meta && (
                      <ul className="space-y-1.5 mb-5">
                        {meta.topFeatures.map((f) => (
                          <li
                            key={f}
                            className="flex items-start gap-2 text-xs text-foreground/80"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-auto flex flex-wrap gap-2 pt-4 border-t border-border/40">
                      <Button size="sm" variant="hero" asChild>
                        <Link to={`/${s.slug}`}>
                          Learn More <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Link>
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <Link to="/contact">Get a Quote</Link>
                      </Button>
                    </div>
                  </article>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="section-padding pt-0">
        <div className="container-custom">
          <ScrollReveal>
            <div className="mb-8">
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-3">
                Compare DSS Services Side by Side
              </h2>
              <p className="text-muted-foreground max-w-2xl">
                Quick overview of headline features, delivery timeline, and the ideal customer for
                each software & AI service.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/40 border-b border-border">
                    <tr className="text-left">
                      <th className="px-5 py-4 font-heading font-semibold text-foreground min-w-[220px]">
                        Service
                      </th>
                      <th className="px-5 py-4 font-heading font-semibold text-foreground min-w-[280px]">
                        <div className="inline-flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                          Headline Features
                        </div>
                      </th>
                      <th className="px-5 py-4 font-heading font-semibold text-foreground whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <Clock className="w-4 h-4 text-primary" />
                          Timeline
                        </div>
                      </th>
                      <th className="px-5 py-4 font-heading font-semibold text-foreground min-w-[260px]">
                        <div className="inline-flex items-center gap-2">
                          <Target className="w-4 h-4 text-primary" />
                          Best Fit For
                        </div>
                      </th>
                      <th className="px-5 py-4 font-heading font-semibold text-foreground text-right whitespace-nowrap">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((s) => {
                      const meta = DSS_META[s.slug];
                      const Icon = meta?.icon || s.icon;
                      return (
                        <tr
                          key={s.slug}
                          className="border-b border-border/40 last:border-0 hover:bg-secondary/20 transition-colors align-top"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-start gap-3">
                              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Icon className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <div className="font-semibold text-foreground">{s.title}</div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {s.description}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <ul className="space-y-1">
                              {(meta?.topFeatures || []).map((f) => (
                                <li
                                  key={f}
                                  className="flex items-start gap-2 text-xs text-foreground/80"
                                >
                                  <span className="w-1 h-1 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                                  {f}
                                </li>
                              ))}
                            </ul>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-semibold">
                              {meta?.estimatedTimeline || "Custom"}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-xs text-foreground/80">
                            {meta?.bestFit}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <Button size="sm" variant="outline" asChild>
                              <Link to={`/${s.slug}`}>
                                Details <ArrowRight className="w-3.5 h-3.5 ml-1" />
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Timelines are typical end-to-end delivery estimates and may vary with scope, data
              readiness, and integrations.
            </p>
          </ScrollReveal>
        </div>
      </section>

    </Layout>
  );
};

export default ServicesDss;

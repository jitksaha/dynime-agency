import { Link } from "react-router-dom";
import { useEffect } from "react";
import { usePageSEO } from "@/hooks/use-page-seo";
import { motion } from "framer-motion";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, Mail, Phone, FileText, TrendingUp, Shield,
  BarChart3, Calendar, Download, Users, Building2, Sparkles, Globe,
} from "lucide-react";
import InvestLeadForm from "@/components/invest/InvestLeadForm";
import { useInvestmentPlans, useInvestSettings } from "@/hooks/use-invest";

const reports = [
  { period: "FY 2025 — Q3", title: "Quarterly shareholder update", date: "Oct 2025", type: "Quarterly report" },
  { period: "FY 2025 — Q2", title: "Half-year revenue & growth report", date: "Jul 2025", type: "Quarterly report" },
  { period: "FY 2025 — Q1", title: "Q1 performance & roadmap", date: "Apr 2025", type: "Quarterly report" },
  { period: "FY 2024", title: "Annual report & audited statements", date: "Feb 2025", type: "Annual report" },
];

const governance = [
  { icon: Shield, title: "Audited financials", body: "Independent annual audits and quarterly internal reviews shared with all shareholders." },
  { icon: Users, title: "Shareholder voting", body: "Premium-tier shareholders vote on strategic decisions, dividend policy, and major investments." },
  { icon: FileText, title: "Transparent reporting", body: "Detailed P&L, cash flow, and portfolio updates published every quarter." },
  { icon: Building2, title: "Legal structure", body: "Dynime LLC. — registered in the United Kingdom with full corporate compliance." },
];

const InvestorRelations = () => {
  const { data: plans = [] } = useInvestmentPlans();
  const { data: settings } = useInvestSettings();
  const targets = (settings?.targets?.items ?? []).filter((t) => t.enabled !== false);
  usePageSEO("investor-relations");

  return (
    <Layout>
      {/* HERO */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.15),transparent_60%)] pointer-events-none" />
        <div className="container mx-auto px-4 py-20 md:py-28 relative">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <Badge variant="secondary" className="mx-auto">
              <Sparkles className="h-3 w-3 mr-1" />
              Investor Relations
            </Badge>
            <h1 className="font-heading text-4xl md:text-6xl font-bold leading-tight">
              Built on transparency, governed for the long term
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything our shareholders, partners, and prospective investors need —
              reports, governance, disclosures, and a direct line to our IR team.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Button size="lg" asChild>
                <Link to="/invest">Explore investment plans <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#contact-ir">Contact IR team</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* HIGHLIGHTS */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: TrendingUp, label: "Avg. annual ROI", value: "18-32%" },
            { icon: Users, label: "Active shareholders", value: "120+" },
            { icon: BarChart3, label: "Revenue growth (YoY)", value: "+47%" },
            { icon: Calendar, label: "Reports per year", value: "4 + Annual" },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border bg-card p-5"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="text-2xl font-bold tabular-nums">{s.value}</div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mt-1">{s.label}</div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* REPORTS */}
      <section id="reports" className="border-y section-tint-a">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-2xl mx-auto text-center mb-12 space-y-3">
            <Badge variant="outline"><FileText className="h-3 w-3 mr-1" /> Reports & filings</Badge>
            <h2 className="font-heading text-3xl md:text-4xl font-bold">Shareholder reports</h2>
            <p className="text-muted-foreground">
              Quarterly and annual reports are sent directly to verified shareholders.
              Request access below if you're an active investor.
            </p>
          </div>
          <div className="max-w-3xl mx-auto grid gap-3">
            {reports.map((r, i) => (
              <Card key={i} className="hover:border-primary/40 transition-colors">
                <CardContent className="p-4 flex flex-wrap items-center gap-4 justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge variant="secondary" className="text-[10px]">{r.period}</Badge>
                        <span className="text-xs text-muted-foreground">{r.type} · {r.date}</span>
                      </div>
                      <div className="font-medium">{r.title}</div>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <a href="#contact-ir">
                      <Download className="h-3.5 w-3.5 mr-1.5" /> Request
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* GOVERNANCE */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto text-center mb-12 space-y-3">
          <Badge variant="outline"><Shield className="h-3 w-3 mr-1" /> Governance</Badge>
          <h2 className="font-heading text-3xl md:text-4xl font-bold">How we protect shareholder value</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {governance.map((g, i) => {
            const Icon = g.icon;
            return (
              <Card key={i} className="hover:border-primary/40 transition-colors">
                <CardContent className="p-6 space-y-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">{g.title}</h3>
                  <p className="text-sm text-muted-foreground">{g.body}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* CONTACT IR */}
      <section id="contact-ir" className="border-t section-tint-a">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10 space-y-3">
              <Badge variant="outline">Contact IR</Badge>
              <h2 className="font-heading text-3xl md:text-4xl font-bold">Talk to Investor Relations</h2>
              <p className="text-muted-foreground">
                For shareholder enquiries, report access, or strategic conversations —
                a real person on our IR team will respond within one business day.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Email</div>
                    <a href="mailto:contact@dynime.com" className="font-medium hover:text-primary">
                      contact@dynime.com
                    </a>
                    <div className="text-xs text-muted-foreground mt-1">
                      Investors: <a href="mailto:investors@dynime.com" className="hover:text-primary">investors@dynime.com</a>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">IR Hotline</div>
                    <a href="tel:+16468840271" className="font-medium hover:text-primary">+1 646-884-0271</a>
                    <div className="text-xs text-muted-foreground mt-1">
                      WhatsApp: <a href="https://wa.me/16468840271" className="hover:text-primary">+1 646-884-0271</a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="mt-10">
              <div className="text-center mb-6 space-y-2">
                <Badge variant="outline"><Globe className="h-3 w-3 mr-1" /> Investor interest form</Badge>
                <h3 className="font-heading text-2xl font-semibold">Share your details with our IR team</h3>
                <p className="text-sm text-muted-foreground">We'll respond within one business day with reports, the agreement, and onboarding steps.</p>
              </div>
              <InvestLeadForm plans={plans} targets={targets} />
            </div>
            <div className="mt-8 flex justify-center gap-3 flex-wrap">
              <Button size="lg" asChild>
                <Link to="/invest">View investment plans <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/investor">Investor portal sign in</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default InvestorRelations;

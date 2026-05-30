import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ModernFaq from "@/components/shared/ModernFaq";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useSEO } from "@/hooks/use-seo";
import {
  ArrowRight,
  Github,
  ShieldCheck,
  Server,
  Zap,
  Code2,
  Wallet,
  Building2,
  Rocket,
  Cpu,
  Lock,
  Workflow,
  Sparkles,
  CheckCircle2,
  Globe,
  Layers,
  GitBranch,
  Bitcoin,
  CreditCard,
  Banknote,
  Users,
  Heart,
  Star,
  Terminal,
  Package,
  Coins,
  Smartphone,
  ShoppingCart,
  Briefcase,
  HelpCircle,
  Map,
  Network,
  FileCheck,
  Clock,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────
 * Parallax hook — ties scroll position to a CSS variable
 * ───────────────────────────────────────────────────────────── */
const useParallax = () => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const progress = Math.max(-1, Math.min(1, 1 - rect.top / window.innerHeight));
        ref.current.style.setProperty("--p", String(progress));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
  return ref;
};

/* ─────────────────────────────────────────────────────────────
 * Mouse-tracking spotlight for hero
 * ───────────────────────────────────────────────────────────── */
const useSpotlight = () => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
      el.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, []);
  return ref;
};

/* ─────────────────────────────────────────────────────────────
 * Animated counter
 * ───────────────────────────────────────────────────────────── */
const Counter = ({ to, suffix = "" }: { to: number; suffix?: string }) => {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver((es) => {
      if (es[0].isIntersecting) {
        const start = performance.now();
        const dur = 1400;
        const tick = (t: number) => {
          const p = Math.min(1, (t - start) / dur);
          setN(Math.floor(to * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        io.disconnect();
      }
    });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [to]);
  return (
    <span ref={ref}>
      {n.toLocaleString()}
      {suffix}
    </span>
  );
};

/* ─────────────────────────────────────────────────────────────
 * Gateways catalog (46 — sourced from Dynime Pay project)
 * ───────────────────────────────────────────────────────────── */
type GatewayCategory = "MFS" | "International" | "Crypto" | "Aggregator" | "Card" | "Bank";
interface Gateway {
  name: string;
  category: GatewayCategory;
  modes: string[];
  region: "BD" | "Global";
}
const GATEWAYS: Gateway[] = [
  // MFS / Mobile Banking — Bangladesh
  { name: "bKash", category: "MFS", modes: ["Personal", "Agent", "Merchant", "API Tokenized"], region: "BD" },
  { name: "Nagad", category: "MFS", modes: ["Personal", "Agent", "Merchant", "Merchant API"], region: "BD" },
  { name: "Rocket", category: "MFS", modes: ["Personal", "Agent", "Merchant"], region: "BD" },
  { name: "mCash", category: "MFS", modes: ["Personal", "Agent", "Merchant"], region: "BD" },
  { name: "Cellfin", category: "MFS", modes: ["Personal", "Merchant"], region: "BD" },
  { name: "iPay", category: "MFS", modes: ["Personal", "Merchant"], region: "BD" },
  { name: "OKWallet", category: "MFS", modes: ["Personal", "Agent", "Merchant"], region: "BD" },
  { name: "TAP", category: "MFS", modes: ["Personal", "Agent", "Merchant"], region: "BD" },
  { name: "TeleCash", category: "MFS", modes: ["Personal", "Agent", "Merchant"], region: "BD" },
  { name: "Upay", category: "MFS", modes: ["Personal", "Agent", "Merchant"], region: "BD" },
  { name: "PathoPay", category: "MFS", modes: ["Personal", "Merchant", "Merchant API"], region: "BD" },
  // BD-specific aggregators
  { name: "SSLCommerz", category: "Aggregator", modes: ["Aggregator API"], region: "BD" },
  { name: "AamarPay", category: "Aggregator", modes: ["Aggregator API"], region: "BD" },
  { name: "ShurjoPay", category: "Aggregator", modes: ["Aggregator API"], region: "BD" },
  { name: "EPS", category: "Aggregator", modes: ["API"], region: "BD" },
  { name: "PayStation", category: "Aggregator", modes: ["API"], region: "BD" },
  // International
  { name: "Stripe", category: "Card", modes: ["Card payments (API)"], region: "Global" },
  { name: "PayPal", category: "International", modes: ["Manual"], region: "Global" },
  { name: "Payeer", category: "International", modes: ["Manual"], region: "Global" },
  { name: "Payoneer", category: "International", modes: ["Manual"], region: "Global" },
  { name: "Wise", category: "International", modes: ["Manual"], region: "Global" },
  { name: "TapTap Send", category: "International", modes: ["Manual"], region: "Global" },
  // Crypto
  { name: "OxaPay", category: "Crypto", modes: ["Crypto"], region: "Global" },
  { name: "Binance", category: "Crypto", modes: ["Personal"], region: "Global" },
];

// Total configured gateway+mode combinations (matches Dynime Pay backend count)
const GATEWAY_TOTAL = GATEWAYS.reduce((sum, g) => sum + g.modes.length, 0);

const CATEGORY_META: Record<GatewayCategory, { label: string; icon: typeof Wallet }> = {
  MFS: { label: "Mobile Banking", icon: Smartphone },
  International: { label: "International", icon: Globe },
  Crypto: { label: "Crypto", icon: Bitcoin },
  Aggregator: { label: "BD Aggregator", icon: Layers },
  Card: { label: "Card", icon: CreditCard },
  Bank: { label: "Bank", icon: Banknote },
};

/* ─────────────────────────────────────────────────────────────
 * Hero gateway search — live filter
 * ───────────────────────────────────────────────────────────── */
const HeroGatewaySearch = () => {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const results = query
    ? GATEWAYS.filter(
        (g) =>
          g.name.toLowerCase().includes(query) ||
          g.category.toLowerCase().includes(query) ||
          g.modes.some((m) => m.toLowerCase().includes(query)),
      ).slice(0, 8)
    : [];
  const exact = query
    ? GATEWAYS.some((g) => g.name.toLowerCase() === query)
    : null;

  return (
    <div className="mt-10 max-w-xl mx-auto">
      <div className="relative">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${GATEWAY_TOTAL}+ gateway modes: bKash, Stripe, Binance, SSLCommerz…`}
          className="w-full h-14 pl-12 pr-32 rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl text-base font-medium placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all shadow-lg"
          aria-label="Search supported payment gateways"
        />
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
          <Sparkles className="h-5 w-5" />
        </span>
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-widest text-muted-foreground hidden sm:block">
          {GATEWAY_TOTAL} gateway modes
        </span>
      </div>

      {query && (
        <div className="mt-3 rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl p-3 text-left shadow-2xl animate-fade-in">
          {results.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              No exact match — but PayOSS is fully open-source.{" "}
              <Link to="/contact" className="text-primary hover:underline font-medium">
                Request "{q}" as a plugin →
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-2 pb-2 text-xs text-muted-foreground">
                <span>{results.length} match{results.length === 1 ? "" : "es"}</span>
                {exact && (
                  <span className="inline-flex items-center gap-1 text-primary font-semibold">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Available
                  </span>
                )}
              </div>
              <ul className="space-y-1">
                {results.map((g) => {
                  const Icon = CATEGORY_META[g.category].icon;
                  return (
                    <li
                      key={g.name}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/60 transition-colors"
                    >
                      <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm">{g.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {CATEGORY_META[g.category].label} · {g.modes.join(", ")}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {g.region}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
};


const PAY_FAQS = [
  { q: "How do I install PayOSS?", a: "PayOSS ships as a Docker Compose stack. Clone the repo, copy .env.example to .env with your gateway credentials, then run `docker compose up -d`. A bare-metal Node.js install is also documented. Setup typically takes under 10 minutes on a fresh VPS." },
  { q: "Which payment gateways are supported?", a: "Out of the box: bKash, Nagad, Rocket, Upay, TAP, MyCash, SureCash for Bangladesh; Stripe, PayPal, Wise, Payoneer, Razorpay, 2Checkout, Adyen internationally; Binance Pay, Coinbase Commerce, USDT/USDC, BTC Lightning, BNB Chain, TON for crypto. 12+ Bangladesh bank rails are pre-wired." },
  { q: "How long does setup take?", a: "Personal-account automation (e.g. bKash personal) is live in 5–10 minutes. Merchant/business onboarding depends on your gateway's KYC — typically 1–3 business days for bKash/Nagad merchant accounts in Bangladesh. The PayOSS stack itself is always 10 minutes." },
  { q: "How can I build my own payment gateway with PayOSS?", a: "PayOSS exposes a plugin SDK — implement the Gateway interface (createCharge, verify, refund, webhookHandler) in TypeScript or any language via the REST adapter. Add your module to gateways/, register it in the config, and the dashboard, checkout UI and reconciliation engine pick it up automatically." },
  { q: "Is PayOSS really free and open source?", a: "Yes. The core is MIT-style licensed — fork it, white-label it, ship it commercially. The optional Supported and Managed tiers exist only if you want priority help or a hosted deployment." },
  { q: "Do I need a merchant account to receive payments?", a: "No — PayOSS supports both personal-account automation (great for freelancers and small shops) and official merchant flows (for higher limits, settlement and refunds). You can mix both in the same deploy." },
  { q: "How are crypto payments handled?", a: "You choose: auto-convert to BDT via Binance Pay, settle stablecoins to your wallet, or hold on-chain. PayOSS never custodies your funds." },
  { q: "Is it compliant with Bangladesh Bank regulations?", a: "PayOSS is designed with Bangladesh Bank guidance and PCI-DSS scope reduction in mind. Final compliance depends on your business setup — our team can help map your flow during onboarding." },
];

const PayOpenSource = () => {
  useSEO({
    title: "PayOSS — Open-Source Self-Hosted Payment Gateway for Bangladesh",
    description:
      "PayOSS is an open-source, self-hosted payment gateway built for Bangladesh. Automate bKash, Nagad, Rocket, Upay & bank transfers from your personal or business accounts — or build your own gateway.",
    keywords: [
      "open source payment gateway Bangladesh",
      "self hosted bKash automation",
      "Nagad API integration",
      "Rocket payment gateway",
      "Bangladesh payment gateway",
      "build your own payment gateway",
    ],
    ogType: "website",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: PAY_FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  });

  const heroRef = useSpotlight();
  const parallaxRef = useParallax();
  const orbsRef = useParallax();

  return (
    <Layout>
      {/* ════════════════ HERO ════════════════ */}
      <section
        ref={heroRef}
        className="relative overflow-hidden min-h-[92vh] flex items-center pay-spotlight"
      >
        {/* Animated grid + orbs */}
        <div ref={orbsRef} className="absolute inset-0 -z-10 pay-hero-bg">
          <div className="pay-grid" />
          <div className="pay-orb pay-orb-1" />
          <div className="pay-orb pay-orb-2" />
          <div className="pay-orb pay-orb-3" />
          <div className="pay-noise" />
        </div>

        <div className="container-custom relative z-10 py-20 md:py-28">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <Badge
              variant="outline"
              className="mx-auto inline-flex gap-2 border-primary/30 bg-primary/5 backdrop-blur px-4 py-2 text-xs uppercase tracking-[0.2em] animate-fade-in"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Open Source · Made for Bangladesh
            </Badge>

            <h1
              className="text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight animate-fade-in"
              style={{ animationDelay: "120ms", animationFillMode: "both" }}
            >
              The{" "}
              <span className="pay-gradient-text">Self-Hosted</span>
              <br />
              Payment Gateway
              <br />
              <span className="pay-gradient-text-2">Built for Bangladesh</span>
            </h1>

            <p
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-fade-in"
              style={{ animationDelay: "240ms", animationFillMode: "both" }}
            >
              Accept <strong className="text-foreground">bKash, Nagad, Rocket, Upay</strong> and
              bank transfers directly into your <em>personal</em> or <em>business</em> wallets — no
              middlemen, no monthly lock-ins. Self-host in minutes, or fork the code and ship
              your own gateway. <strong className="text-foreground">100% open source.</strong>
            </p>

            <div
              className="flex flex-wrap items-center justify-center gap-4 animate-fade-in"
              style={{ animationDelay: "360ms", animationFillMode: "both" }}
            >
              <Button asChild size="lg" className="pay-cta group h-12 px-7 text-base">
                <Link to="/contact">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Demo Payment
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <a
                href="https://github.com/dynime/dynime-pay"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative inline-flex items-stretch h-12 rounded-full overflow-hidden border border-foreground/25 bg-background/85 dark:bg-background/60 backdrop-blur-md shadow-lg shadow-primary/10 hover:shadow-xl hover:shadow-amber-500/20 hover:border-amber-400/50 transition-all hover:-translate-y-0.5 animate-fade-in"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative inline-flex items-center gap-2 pl-5 pr-4 text-sm font-semibold text-foreground">
                  <Layers className="h-4 w-4 text-primary transition-transform group-hover:-rotate-6" />
                  Explore the Stack
                </span>
                <span className="relative w-px my-2 bg-foreground/25" />
                <span className="relative inline-flex items-center gap-2 pl-4 pr-5 text-sm font-semibold text-foreground">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500 transition-transform group-hover:rotate-12 group-hover:scale-110" />
                  Star on GitHub
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-mono font-semibold">
                    ★ 1.2k
                  </span>
                </span>
              </a>
            </div>

            {/* Live gateway availability search */}
            <div ref={parallaxRef} className="pay-float-row">
              <HeroGatewaySearch />
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
                <span className="uppercase tracking-widest">Popular:</span>
                {["bKash", "Nagad", "Stripe", "Binance", "SSLCommerz", "PayPal"].map((n) => (
                  <span
                    key={n}
                    className="px-2.5 py-1 rounded-full border border-border/60 bg-card/40 backdrop-blur"
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-xs text-muted-foreground animate-fade-in">
          <span className="uppercase tracking-[0.3em]">Scroll</span>
          <div className="h-10 w-[1px] bg-gradient-to-b from-foreground/40 to-transparent pay-scroll-line" />
        </div>
      </section>

      {/* ════════════════ STATS BAND ════════════════ */}
      <section className="border-y border-border/50 section-tint-a backdrop-blur">
        <div className="container-custom py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { v: 100, s: "%", l: "Open Source" },
            { v: GATEWAY_TOTAL, s: "+", l: "Supported Gateways" },
            { v: 0, s: "%", l: "Vendor Lock-in" },
            { v: 24, s: "/7", l: "Self-Hosted Control" },
          ].map((s) => (
            <div key={s.l} className="space-y-1">
              <div className="text-3xl md:text-4xl font-bold pay-gradient-text">
                <Counter to={s.v} suffix={s.s} />
              </div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                {s.l}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════ FEATURES (parallax cards) ════════════════ */}
      <section id="features" className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 -z-10 pay-section-bg" />
        <div className="container-custom">
          <div className="max-w-2xl mx-auto text-center mb-16 space-y-4">
            <Badge variant="outline" className="border-primary/30">
              Features
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              Everything you need to <span className="pay-gradient-text">accept payments</span>,
              your way.
            </h2>
            <p className="text-muted-foreground text-lg">
              From personal mobile-wallet automation to enterprise gateway
              orchestration — all without a third-party processor.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Wallet,
                title: "Personal Account Automation",
                desc: "Plug your personal bKash, Nagad, Rocket or Upay number and start receiving automated, reconciled payments.",
              },
              {
                icon: Building2,
                title: "Business Merchant Mode",
                desc: "Hook up merchant APIs from official business accounts with full settlement, refunds and webhooks.",
              },
              {
                icon: Server,
                title: "Self-Hosted Forever",
                desc: "Deploy on your own VPS, Hetzner, AWS or bare metal. Your keys, your data, your money flow.",
              },
              {
                icon: Code2,
                title: "Build-Your-Own Gateway",
                desc: "Modular SDK lets you compose a fully branded gateway with checkout, dashboard and reporting.",
              },
              {
                icon: ShieldCheck,
                title: "Bank-Grade Security",
                desc: "End-to-end encryption, signed webhooks, audit logs and PCI-aware architecture out of the box.",
              },
              {
                icon: Workflow,
                title: "Automation Engine",
                desc: "Auto-reconcile SMS, push & email confirmations into one event stream — zero manual matching.",
              },
              {
                icon: Globe,
                title: "Multi-Currency Ready",
                desc: "BDT-first with USD/EUR/GBP support for cross-border merchants and freelancers.",
              },
              {
                icon: Layers,
                title: "Pluggable Modules",
                desc: "Add Stripe, PayPal, crypto or any custom rail with the open plugin architecture.",
              },
              {
                icon: GitBranch,
                title: "Fork & Extend",
                desc: "MIT-style license. Fork it, white-label it, ship it — no royalties, no surprises.",
              },
            ].map((f, i) => (
              <Card
                key={f.title}
                className="pay-feature group relative p-6 bg-card/60 backdrop-blur border-border/60 hover:border-primary/40 transition-all duration-500 hover:-translate-y-1"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="absolute inset-0 rounded-lg pay-feature-glow opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative space-y-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <f.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ THREE PILLARS ════════════════ */}
      <section className="relative section-padding-lg overflow-hidden section-tint-a">
        <div className="container-custom">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Wallet,
                tag: "01",
                title: "Personal Account",
                desc: "Receive payments to your personal bKash/Nagad number. Auto-confirm, auto-receipt, auto-ledger.",
                points: ["SMS-based confirmation", "PIN-less listening", "Real-time webhooks"],
              },
              {
                icon: Building2,
                tag: "02",
                title: "Business Account",
                desc: "Connect your registered merchant credentials and unlock settlement, refunds and disputes.",
                points: ["Official merchant APIs", "Bulk disbursement", "Settlement reports"],
              },
              {
                icon: Rocket,
                tag: "03",
                title: "Build Your Own",
                desc: "Take the stack and ship a branded gateway for your platform, marketplace or SaaS.",
                points: ["White-label dashboard", "Multi-tenant ready", "Custom plugins"],
              },
            ].map((p) => (
              <div
                key={p.tag}
                className="pay-pillar group relative p-8 rounded-3xl border border-border/60 bg-card/60 backdrop-blur overflow-hidden hover:border-primary/40 transition-all duration-500"
              >
                <div className="absolute -top-10 -right-10 text-[8rem] font-black text-foreground/[0.04] group-hover:text-primary/10 transition-colors duration-700">
                  {p.tag}
                </div>
                <div className="relative space-y-5">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground shadow-lg">
                    <p.icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-2xl font-bold">{p.title}</h3>
                  <p className="text-muted-foreground">{p.desc}</p>
                  <ul className="space-y-2 pt-2">
                    {p.points.map((pt) => (
                      <li key={pt} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ ARCHITECTURE / CODE PARALLAX ════════════════ */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="container-custom grid lg:grid-cols-2 gap-14 items-center">
          <div className="space-y-6">
            <Badge variant="outline" className="border-primary/30">
              Developer First
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              A clean SDK. <br />
              <span className="pay-gradient-text-2">Production-grade defaults.</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              REST + Webhooks + TypeScript SDK. Spin up a gateway in minutes, not months.
              Every primitive is documented, typed and battle-tested.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-4">
              {[
                { icon: Zap, label: "Sub-200ms latency" },
                { icon: Lock, label: "Signed webhooks" },
                { icon: Cpu, label: "Edge-ready runtime" },
                { icon: ShieldCheck, label: "Audit-trailed" },
              ].map((c) => (
                <div
                  key={c.label}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50"
                >
                  <c.icon className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{c.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Floating, parallax-tilted code card */}
          <div className="pay-code-wrap">
            <div className="pay-code-card relative rounded-2xl border border-border/60 bg-[#0b1220] text-slate-100 shadow-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
                <span className="h-3 w-3 rounded-full bg-red-400/80" />
                <span className="h-3 w-3 rounded-full bg-amber-400/80" />
                <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
                <span className="ml-3 text-xs text-slate-400">payoss.ts</span>
              </div>
              <pre className="p-5 text-[13px] leading-relaxed overflow-x-auto">
{`import { PayOSS } from "@payoss/sdk";

const pay = new PayOSS({
  gateway: "bkash",          // bkash | nagad | rocket | upay
  mode: "personal",          // personal | business
  account: "01XXXXXXXXX",
  webhook: "https://you.com/hook",
});

const charge = await pay.createCharge({
  amount: 1500,              // BDT
  reference: "INV-2046",
  customer: { name: "Ayan", phone: "01711..." },
});

console.log(charge.payUrl);  // ✨ branded checkout`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════ UNIFIED GATEWAY SHOWCASE ════════════════ */}
      <section id="gateways" className="relative section-padding-lg overflow-hidden section-tint-a">
        <div className="absolute inset-0 -z-10 pay-section-bg" />
        <div className="container-custom">
          <div className="max-w-2xl mx-auto text-center mb-14 space-y-4">
            <Badge variant="outline" className="border-primary/30">
              {GATEWAY_TOTAL} Gateway Modes · One Stack
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              Every <span className="pay-gradient-text">payment rail</span> you'll ever need.
            </h2>
            <p className="text-muted-foreground text-lg">
              Mobile banking, aggregators, cards, international payouts and crypto —
              grouped by category, ready to enable from your dashboard.
            </p>
          </div>

          {(["MFS", "Aggregator", "Card", "International", "Crypto"] as GatewayCategory[]).map(
            (cat) => {
              const items = GATEWAYS.filter((g) => g.category === cat);
              if (!items.length) return null;
              const Icon = CATEGORY_META[cat].icon;
              return (
                <div key={cat} className="mb-12 last:mb-0">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{CATEGORY_META[cat].label}</h3>
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">
                        {items.length} gateway{items.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {items.map((g) => (
                      <Card
                        key={g.name}
                        className="pay-feature group p-4 bg-card/60 backdrop-blur border-border/60 hover:border-primary/40 hover:-translate-y-1 transition-all"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="font-semibold">{g.name}</div>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {g.region}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {g.modes.map((m) => (
                            <span
                              key={m}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            },
          )}

          <div className="mt-10 text-center text-sm text-muted-foreground">
            Don't see your gateway?{" "}
            <Link to="/contact" className="text-primary font-semibold hover:underline">
              Request a plugin →
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════ BANK INTEGRATIONS ════════════════ */}
      <section className="relative py-24 md:py-28 overflow-hidden">
        <div className="container-custom">
          <div className="max-w-2xl mx-auto text-center mb-14 space-y-4">
            <Badge variant="outline" className="border-primary/30">Banking Rails</Badge>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              Direct bank integrations across <span className="pay-gradient-text-2">Bangladesh</span>.
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              "City Bank", "Dutch-Bangla", "BRAC Bank", "EBL",
              "Prime Bank", "Standard Chartered BD", "Mutual Trust", "IFIC",
              "Janata Bank", "Sonali Bank", "Islami Bank", "Bank Asia",
            ].map((b) => (
              <div key={b} className="p-4 rounded-xl border border-border/60 bg-card/40 backdrop-blur flex items-center gap-3 hover:border-primary/40 transition-all">
                <Banknote className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm font-medium">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ COMPARISON TABLE ════════════════ */}
      <section className="relative section-padding-lg overflow-hidden section-tint-a">
        <div className="container-custom">
          <div className="max-w-2xl mx-auto text-center mb-14 space-y-4">
            <Badge variant="outline" className="border-primary/30">Why PayOSS</Badge>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              PayOSS vs <span className="pay-gradient-text">SaaS gateways</span>.
            </h2>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card/60 backdrop-blur">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left p-4 font-semibold">Capability</th>
                  <th className="p-4 font-semibold">PayOSS</th>
                  <th className="p-4 font-semibold text-muted-foreground">Hosted SaaS</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Self-hosted", true, false],
                  ["Personal account automation", true, false],
                  ["Source-code access", true, false],
                  ["Per-transaction fees", false, true],
                  ["White-label checkout", true, false],
                  ["Crypto + fiat in one stack", true, false],
                  ["Vendor lock-in", false, true],
                  ["Custom plugin SDK", true, false],
                ].map(([cap, oss, saas], i) => (
                  <tr key={i as number} className="border-t border-border/50">
                    <td className="p-4">{cap as string}</td>
                    <td className="p-4 text-center">
                      {oss ? <CheckCircle2 className="h-5 w-5 text-primary mx-auto" /> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="p-4 text-center">
                      {saas ? <CheckCircle2 className="h-5 w-5 text-muted-foreground mx-auto" /> : <span className="text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ════════════════ INSTALLATION / QUICKSTART ════════════════ */}
      <section className="relative py-24 md:py-28 overflow-hidden">
        <div className="absolute inset-0 -z-10 pay-section-bg" />
        <div className="container-custom">
          <div className="max-w-2xl mx-auto text-center mb-14 space-y-4">
            <Badge variant="outline" className="border-primary/30">Quick Start</Badge>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              Live in <span className="pay-gradient-text">under 10 minutes</span>.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: "01", title: "Clone & deploy", icon: Terminal, code: "git clone payoss\ndocker compose up -d" },
              { step: "02", title: "Connect a wallet", icon: Wallet, code: "payoss connect bkash\n--mode personal" },
              { step: "03", title: "Receive payments", icon: Zap, code: "curl POST /charge\n{ amount: 1500 }" },
            ].map((s) => (
              <Card key={s.step} className="p-6 bg-card/60 backdrop-blur border-border/60 hover:border-primary/40 transition-all hover:-translate-y-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Step {s.step}</div>
                </div>
                <h3 className="text-lg font-semibold mb-3">{s.title}</h3>
                <pre className="text-xs bg-[#0b1220] text-slate-100 p-3 rounded-lg overflow-x-auto leading-relaxed">{s.code}</pre>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ BUILD YOUR OWN GATEWAY ════════════════ */}
      <section id="build-your-own" className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 -z-10 pay-section-bg" />
        <div className="container-custom">
          <div className="max-w-2xl mx-auto text-center mb-14 space-y-4">
            <Badge variant="outline" className="border-primary/30">
              <Code2 className="h-3 w-3 mr-1" /> Build Your Own
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              Ship your gateway in <span className="pay-gradient-text">7 guided steps</span>.
            </h2>
            <p className="text-muted-foreground text-lg">
              From download to live transactions on WordPress, WHMCS, SMM panels and any
              custom stack — fully white-labeled, fully yours.
            </p>
          </div>

          {/* Step-by-step pipeline */}
          <div className="relative max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { n: "01", title: "Download", icon: Package, desc: "Pull the latest PayOSS release or clone from GitHub." },
                { n: "02", title: "Requirements Passed", icon: CheckCircle2, desc: "PHP 8.1+, Node 18+, MySQL/MariaDB, Redis. Built-in checker validates your VPS." },
                { n: "03", title: "Database Connection", icon: Server, desc: "Provide DB host, name, user, password. Migrations auto-run on first boot." },
                { n: "04", title: "Installed", icon: Rocket, desc: "Web installer finishes in <2 minutes — schema, seeders, license, done." },
                { n: "05", title: "Login & Create Brand", icon: Sparkles, desc: "Create your admin, upload logo, pick colors. Your gateway, your brand." },
                { n: "06", title: "Connect Payment Gateway", icon: Wallet, desc: "Add bKash, Nagad, Stripe, Binance — personal or merchant credentials." },
                { n: "07", title: "Install on Your App", icon: Layers, desc: "Drop our plugin on WordPress, WHMCS, SMM panels or wire the REST API." },
              ].map((s, i, arr) => (
                <div
                  key={s.n}
                  className="relative p-5 rounded-2xl border border-border/60 bg-card/60 backdrop-blur hover:border-primary/40 transition-all hover:-translate-y-1 group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground shadow-lg group-hover:scale-110 transition-transform">
                      <s.icon className="h-5 w-5" />
                    </div>
                    <span className="text-3xl font-black text-foreground/[0.08] group-hover:text-primary/30 transition-colors">
                      {s.n}
                    </span>
                  </div>
                  <h3 className="font-semibold mb-1">{s.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                  {i < arr.length - 1 && (
                    <ArrowRight className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/40 z-10" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Supported platforms strip */}
          <div className="mt-12 max-w-4xl mx-auto">
            <div className="text-center text-xs uppercase tracking-widest text-muted-foreground mb-4">
              Drop-in plugins for
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                "WordPress",
                "WooCommerce",
                "WHMCS",
                "SMM Panels",
                "Laravel",
                "Magento",
                "OpenCart",
                "Custom REST",
                "Node.js SDK",
                "Python SDK",
                "Webhooks",
                "Mobile (Flutter)",
              ].map((p) => (
                <span
                  key={p}
                  className="px-4 py-2 rounded-full border border-border/60 bg-card/60 backdrop-blur text-sm font-medium hover:border-primary/40 hover:bg-primary/5 transition-all"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>

          {/* Config / Env + Webhook handler — two column code preview */}
          <div className="mt-16 grid lg:grid-cols-2 gap-6">
            {/* .env file */}
            <div className="rounded-2xl border border-border/60 bg-[#0b1220] text-slate-100 shadow-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
                <span className="h-3 w-3 rounded-full bg-red-400/80" />
                <span className="h-3 w-3 rounded-full bg-amber-400/80" />
                <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
                <span className="ml-3 text-xs text-slate-400 inline-flex items-center gap-1.5">
                  <Lock className="h-3 w-3" /> .env
                </span>
              </div>
              <pre className="p-5 text-[12.5px] leading-relaxed overflow-x-auto">
{`# ── Core ───────────────────────────────
APP_NAME="My Gateway"
APP_URL=https://pay.mybrand.com
APP_KEY=base64:auto-generated
APP_ENV=production

# ── Database ───────────────────────────
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=payoss
DB_USERNAME=payoss
DB_PASSWORD=••••••••

# ── Redis / Queue ──────────────────────
REDIS_HOST=127.0.0.1
QUEUE_CONNECTION=redis

# ── Gateway credentials (examples) ─────
BKASH_MODE=merchant            # personal | merchant
BKASH_APP_KEY=
BKASH_APP_SECRET=
BKASH_USERNAME=
BKASH_PASSWORD=

NAGAD_MERCHANT_ID=
NAGAD_PUBLIC_KEY=
NAGAD_PRIVATE_KEY=

STRIPE_PUBLIC_KEY=pk_live_…
STRIPE_SECRET_KEY=sk_live_…
STRIPE_WEBHOOK_SECRET=whsec_…

BINANCE_API_KEY=
BINANCE_API_SECRET=

# ── Webhook signing ────────────────────
WEBHOOK_SIGNING_SECRET=rotate-me-monthly`}
              </pre>
            </div>

            {/* Webhook handler */}
            <div className="rounded-2xl border border-border/60 bg-[#0b1220] text-slate-100 shadow-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
                <span className="h-3 w-3 rounded-full bg-red-400/80" />
                <span className="h-3 w-3 rounded-full bg-amber-400/80" />
                <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
                <span className="ml-3 text-xs text-slate-400 inline-flex items-center gap-1.5">
                  <Workflow className="h-3 w-3" /> webhook.ts
                </span>
              </div>
              <pre className="p-5 text-[12.5px] leading-relaxed overflow-x-auto">
{`import { verifySignature } from "@payoss/sdk";

// POST /webhooks/payoss
export async function handler(req, res) {
  // 1. Verify HMAC signature
  const ok = verifySignature(
    req.rawBody,
    req.headers["x-payoss-signature"],
    process.env.WEBHOOK_SIGNING_SECRET
  );
  if (!ok) return res.status(401).end();

  const event = JSON.parse(req.rawBody);

  // 2. Idempotency — store event.id, skip if seen
  if (await seen(event.id)) return res.status(200).end();

  // 3. Route by event type
  switch (event.type) {
    case "charge.succeeded":
      await markPaid(event.data.reference, event.data.amount);
      break;
    case "charge.failed":
      await flagFailed(event.data.reference, event.data.reason);
      break;
    case "refund.created":
      await refundOrder(event.data.charge_id);
      break;
    case "payout.settled":
      await reconcile(event.data.payout_id);
      break;
  }

  // 4. Always 200 fast — process async
  return res.status(200).json({ ok: true });
}`}
              </pre>
            </div>
          </div>

          {/* Webhook flow diagram */}
          <div className="mt-10 max-w-4xl mx-auto p-6 rounded-2xl border border-border/60 bg-card/60 backdrop-blur">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-4 text-center">
              Webhook lifecycle
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center text-sm">
              {[
                { l: "Customer pays", i: Wallet },
                { l: "Gateway notifies PayOSS", i: Server },
                { l: "PayOSS signs + sends webhook", i: Lock },
                { l: "Your app verifies + handles", i: Code2 },
                { l: "Order marked paid", i: CheckCircle2 },
              ].map((step, i, arr) => (
                <div key={step.l} className="relative">
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/50 h-full flex flex-col items-center gap-2">
                    <step.i className="h-5 w-5 text-primary" />
                    <span className="text-xs font-medium leading-tight">{step.l}</span>
                  </div>
                  {i < arr.length - 1 && (
                    <ArrowRight className="hidden md:block absolute -right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/50" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="pay-cta h-12 px-7">
              <Link to="/contact">
                Get the install kit
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-7">
              <a href="#gateways">
                <Github className="mr-2 h-4 w-4" />
                Browse gateways
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* ════════════════ USE CASES ════════════════ */}
      <section className="relative section-padding-lg overflow-hidden section-tint-a">
        <div className="container-custom">
          <div className="max-w-2xl mx-auto text-center mb-14 space-y-4">
            <Badge variant="outline" className="border-primary/30">Use Cases</Badge>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              Built for every <span className="pay-gradient-text-2">payment workflow</span>.
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: ShoppingCart, title: "E-commerce", desc: "Drop-in checkout for WooCommerce, Shopify, Medusa, custom stacks." },
              { icon: Briefcase, title: "Freelancers", desc: "Receive bKash personally, auto-invoice clients globally." },
              { icon: Building2, title: "SaaS & Subs", desc: "Recurring billing with grace, dunning and proration." },
              { icon: Network, title: "Marketplaces", desc: "Split payments, escrow and seller payouts out of the box." },
            ].map((u) => (
              <Card key={u.title} className="p-6 bg-card/60 backdrop-blur border-border/60 hover:border-primary/40 transition-all hover:-translate-y-1">
                <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                  <u.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{u.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{u.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ SECURITY & COMPLIANCE ════════════════ */}
      <section className="relative py-24 md:py-28 overflow-hidden">
        <div className="container-custom grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <Badge variant="outline" className="border-primary/30">Security</Badge>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              <span className="pay-gradient-text">Bank-grade</span> defaults, audit-ready.
            </h2>
            <p className="text-muted-foreground text-lg">
              Encryption, key rotation, signed webhooks and full audit trails — designed
              with PCI-DSS scope reduction and Bangladesh Bank compliance in mind.
            </p>
            <ul className="space-y-3">
              {[
                "AES-256 at rest, TLS 1.3 in transit",
                "Hardware-backed key vault support",
                "Idempotency on every mutation",
                "Append-only event log + replay",
                "Role-based access with SSO/SAML",
                "Rate limiting + WAF integration",
              ].map((s) => (
                <li key={s} className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm">{s}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Lock, label: "PCI-DSS aware" },
              { icon: FileCheck, label: "Audit logs" },
              { icon: ShieldCheck, label: "Signed webhooks" },
              { icon: Cpu, label: "Edge-ready" },
            ].map((b) => (
              <div key={b.label} className="p-6 rounded-2xl border border-border/60 bg-card/60 backdrop-blur text-center hover:border-primary/40 transition-all">
                <b.icon className="h-8 w-8 text-primary mx-auto mb-3" />
                <div className="font-semibold text-sm">{b.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ ROADMAP ════════════════ */}
      <section className="relative section-padding-lg overflow-hidden section-tint-a">
        <div className="container-custom">
          <div className="max-w-2xl mx-auto text-center mb-14 space-y-4">
            <Badge variant="outline" className="border-primary/30">
              <Map className="h-3 w-3 mr-1" /> Roadmap
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              Built in the open. <span className="pay-gradient-text-2">Ship every week.</span>
            </h2>
          </div>
          <div className="relative max-w-3xl mx-auto">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
            {[
              { q: "Q1 2026", title: "Core gateways GA", desc: "bKash, Nagad, Rocket, Upay personal + merchant flows." },
              { q: "Q2 2026", title: "Crypto rails", desc: "Binance Pay, USDT/USDC, Lightning, BDT auto-settle." },
              { q: "Q3 2026", title: "Marketplace SDK", desc: "Splits, escrow, KYC, payouts — out of the box." },
              { q: "Q4 2026", title: "Managed cloud", desc: "One-click hosted PayOSS for teams that don't want to self-host." },
            ].map((r) => (
              <div key={r.q} className="relative pl-12 pb-8">
                <div className="absolute left-2.5 top-1 h-3 w-3 rounded-full bg-primary ring-4 ring-primary/20" />
                <div className="text-xs uppercase tracking-widest text-primary font-semibold mb-1 flex items-center gap-2">
                  <Clock className="h-3 w-3" /> {r.q}
                </div>
                <h3 className="text-lg font-semibold mb-1">{r.title}</h3>
                <p className="text-sm text-muted-foreground">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ TESTIMONIALS ════════════════ */}
      <section className="relative py-24 md:py-28 overflow-hidden">
        <div className="container-custom">
          <div className="max-w-2xl mx-auto text-center mb-14 space-y-4">
            <Badge variant="outline" className="border-primary/30">Loved By Builders</Badge>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              From <span className="pay-gradient-text">teams shipping</span> on PayOSS.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { q: "We replaced three SaaS gateways with one self-hosted PayOSS deploy. Saved 4% on every transaction.", a: "Tanvir H.", r: "CTO, BD-commerce co." },
              { q: "Personal bKash automation alone is worth it. Reconciliation went from hours to seconds.", a: "Nusrat K.", r: "Founder, freelance studio" },
              { q: "Forking PayOSS let us white-label a gateway for our marketplace in two weeks.", a: "Rakib A.", r: "Eng lead, logistics SaaS" },
            ].map((t) => (
              <Card key={t.a} className="p-6 bg-card/60 backdrop-blur border-border/60">
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-primary text-primary" />)}
                </div>
                <p className="text-sm leading-relaxed mb-4">"{t.q}"</p>
                <div className="text-sm font-semibold">{t.a}</div>
                <div className="text-xs text-muted-foreground">{t.r}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ PRICING / PLANS ════════════════ */}
      <section className="relative section-padding-lg overflow-hidden section-tint-a">
        <div className="container-custom">
          <div className="max-w-2xl mx-auto text-center mb-14 space-y-4">
            <Badge variant="outline" className="border-primary/30">
              <Package className="h-3 w-3 mr-1" /> Pricing
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              Free forever. <span className="pay-gradient-text-2">Pay only if you want help.</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Community", price: "৳0", tag: "Self-host", points: ["Full source code", "All gateways", "Community Discord", "MIT-style license"], featured: false },
              { name: "Supported", price: "৳9,999/yr", tag: "Most popular", points: ["Priority email + chat", "Setup assistance", "Patch SLAs", "Quarterly review"], featured: true },
              { name: "Managed", price: "Custom", tag: "Done-for-you", points: ["We host & operate", "On-call ops team", "Custom modules", "SLA & SOC reports"], featured: false },
            ].map((p) => (
              <Card key={p.name} className={`p-7 border-border/60 backdrop-blur transition-all hover:-translate-y-1 ${p.featured ? "border-primary/50 bg-primary/5 shadow-2xl shadow-primary/10" : "bg-card/60"}`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">{p.name}</h3>
                  {p.featured && <Badge className="bg-primary/15 text-primary border-primary/30">Popular</Badge>}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-widest mb-4">{p.tag}</div>
                <div className="text-4xl font-bold mb-6">{p.price}</div>
                <ul className="space-y-2 mb-6">
                  {p.points.map((pt) => (
                    <li key={pt} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild className="w-full" variant={p.featured ? "default" : "outline"}>
                  <Link to="/contact">Get started</Link>
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ COMMUNITY ════════════════ */}
      <section className="relative py-24 md:py-28 overflow-hidden">
        <div className="container-custom">
          <div className="max-w-2xl mx-auto text-center mb-12 space-y-4">
            <Badge variant="outline" className="border-primary/30">Community</Badge>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              Built with <span className="pay-gradient-text">developers worldwide</span>.
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            {[
              { icon: Users, v: 2400, s: "+", l: "Builders" },
              { icon: GitBranch, v: 180, s: "+", l: "Forks" },
              { icon: Star, v: 3200, s: "+", l: "GitHub Stars" },
              { icon: Heart, v: 60, s: "+", l: "Contributors" },
            ].map((s) => (
              <div key={s.l} className="p-6 rounded-2xl border border-border/60 bg-card/60 backdrop-blur">
                <s.icon className="h-7 w-7 text-primary mx-auto mb-3" />
                <div className="text-3xl font-bold pay-gradient-text">
                  <Counter to={s.v} suffix={s.s} />
                </div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ FAQ ACCORDION ════════════════ */}
      <section className="relative section-padding-lg overflow-hidden section-tint-a">
        <div className="container-custom max-w-3xl">
          <div className="text-center mb-12 space-y-4">
            <Badge variant="outline" className="border-primary/30">
              <HelpCircle className="h-3 w-3 mr-1" /> FAQ
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              Frequently asked <span className="pay-gradient-text">questions</span>.
            </h2>
          </div>
          <ModernFaq
            items={[
              {
                q: "How do I install PayOSS?",
                a: "PayOSS ships as a Docker Compose stack. Clone the repo, copy .env.example to .env with your gateway credentials, then run `docker compose up -d`. A bare-metal Node.js install is also documented for advanced users. Setup typically takes under 10 minutes on a fresh VPS.",
              },
              {
                q: "Which payment gateways are supported?",
                a: "Out of the box: bKash, Nagad, Rocket, Upay, TAP, MyCash and SureCash for Bangladesh; Stripe, PayPal, Wise, Payoneer, Razorpay, 2Checkout and Adyen internationally; plus Binance Pay, Coinbase Commerce, USDT/USDC, BTC Lightning, BNB Chain and TON for crypto. Direct bank rails for 12+ Bangladesh banks are also pre-wired.",
              },
              {
                q: "How long does setup take?",
                a: "Personal-account automation (e.g. bKash personal) is live in 5–10 minutes. Merchant/business onboarding depends on your gateway's KYC — typically 1–3 business days for bKash/Nagad merchant accounts in Bangladesh. The PayOSS stack itself is always 10 minutes.",
              },
              {
                q: "How can I build my own payment gateway with PayOSS?",
                a: "PayOSS exposes a plugin SDK — implement the `Gateway` interface (createCharge, verify, refund, webhookHandler) in TypeScript or any language via the REST adapter. Add your module to `gateways/`, register it in the config, and the dashboard, checkout UI and reconciliation engine pick it up automatically. Full whitelabeling docs are included.",
              },
              {
                q: "Is PayOSS really free and open source?",
                a: "Yes. The core is MIT-style licensed — fork it, white-label it, ship it commercially. The optional 'Supported' and 'Managed' tiers exist only if you want priority help or a hosted deployment.",
              },
              {
                q: "Do I need a merchant account to receive payments?",
                a: "No — PayOSS supports both personal-account automation (great for freelancers and small shops) and official merchant flows (for higher limits, settlement and refunds). You can mix both in the same deploy.",
              },
              {
                q: "How are crypto payments handled?",
                a: "You choose: auto-convert to BDT via Binance Pay, settle stablecoins to your wallet, or hold on-chain. PayOSS never custodies your funds.",
              },
              {
                q: "Is it compliant with Bangladesh Bank regulations?",
                a: "PayOSS is designed with Bangladesh Bank guidance and PCI-DSS scope reduction in mind. Final compliance depends on your business setup — our team can help map your flow during onboarding.",
              },
            ]}
          />
        </div>
      </section>

      {/* ════════════════ CTA ════════════════ */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 -z-10 pay-cta-bg" />
        <div className="container-custom relative">
          <div className="max-w-3xl mx-auto text-center space-y-8 p-10 md:p-16 rounded-3xl border border-primary/20 bg-card/60 backdrop-blur-xl shadow-2xl">
            <Badge variant="outline" className="mx-auto border-primary/30">
              Limited Early Access
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              Ready to own your <span className="pay-gradient-text">payment stack?</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Book a 30-minute architecture call with our Bangladesh payments team —
              we'll map your flow, demo the dashboard, and ship your first transaction
              within a week.
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-2">
              <Button asChild size="lg" className="pay-cta h-12 px-8 text-base">
                <Link to="/contact">
                  Book Your Demo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 px-8 text-base"
              >
                <Link to="/services">View All Services</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════ Page-scoped styles ════════════════ */}
      <style>{`
        .pay-gradient-text {
          background: linear-gradient(120deg, hsl(var(--primary)), hsl(var(--primary) / 0.6) 50%, hsl(var(--accent, var(--primary))));
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          background-size: 200% 100%;
          animation: pay-shine 6s ease-in-out infinite;
        }
        .pay-gradient-text-2 {
          background: linear-gradient(90deg, hsl(var(--foreground)), hsl(var(--primary)));
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        @keyframes pay-shine {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        /* Hero spotlight */
        .pay-spotlight::before {
          content: "";
          position: absolute; inset: 0;
          background: radial-gradient(600px circle at var(--mx, 50%) var(--my, 30%), hsl(var(--primary) / 0.12), transparent 60%);
          pointer-events: none;
          z-index: 1;
        }

        /* Animated grid */
        .pay-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(hsl(var(--foreground) / 0.05) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--foreground) / 0.05) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(ellipse at 50% 40%, #000 30%, transparent 75%);
          transform: translateY(calc(var(--p, 0) * -40px));
        }
        .pay-noise {
          position: absolute; inset: 0;
          background-image: radial-gradient(hsl(var(--foreground) / 0.04) 1px, transparent 1px);
          background-size: 3px 3px;
          opacity: .4;
          mix-blend-mode: overlay;
        }

        /* Floating orbs (parallax) */
        .pay-orb {
          position: absolute;
          border-radius: 999px;
          filter: blur(80px);
          opacity: 0.55;
          will-change: transform;
        }
        .pay-orb-1 {
          width: 480px; height: 480px;
          background: radial-gradient(circle, hsl(var(--primary) / 0.55), transparent 70%);
          top: -120px; left: -100px;
          transform: translate3d(calc(var(--p, 0) * 60px), calc(var(--p, 0) * -40px), 0);
          animation: pay-orb-float 14s ease-in-out infinite;
        }
        .pay-orb-2 {
          width: 520px; height: 520px;
          background: radial-gradient(circle, hsl(280 85% 60% / 0.4), transparent 70%);
          bottom: -180px; right: -120px;
          transform: translate3d(calc(var(--p, 0) * -80px), calc(var(--p, 0) * 50px), 0);
          animation: pay-orb-float 18s ease-in-out -3s infinite reverse;
        }
        .pay-orb-3 {
          width: 360px; height: 360px;
          background: radial-gradient(circle, hsl(170 80% 55% / 0.35), transparent 70%);
          top: 30%; right: 20%;
          transform: translate3d(calc(var(--p, 0) * 40px), calc(var(--p, 0) * 60px), 0);
          animation: pay-orb-float 12s ease-in-out -6s infinite;
        }
        @keyframes pay-orb-float {
          0%, 100% { translate: 0 0; }
          50% { translate: 0 -40px; }
        }

        /* Scroll cue */
        .pay-scroll-line {
          animation: pay-scroll 2s ease-in-out infinite;
        }
        @keyframes pay-scroll {
          0%, 100% { transform: scaleY(0.3); transform-origin: top; }
          50% { transform: scaleY(1); transform-origin: top; }
        }

        /* Floating wallet chips */
        .pay-float-chip {
          animation: pay-float 5s ease-in-out infinite;
          transform: translateY(calc(var(--p, 0) * -20px));
        }
        @keyframes pay-float {
          0%, 100% { transform: translateY(0) rotate(-0.5deg); }
          50% { transform: translateY(-10px) rotate(0.5deg); }
        }
        .pay-float-chip:hover {
          animation-play-state: paused;
        }

        /* Section gradient bg */
        .pay-section-bg {
          background:
            radial-gradient(800px circle at 20% 0%, hsl(var(--primary) / 0.08), transparent 60%),
            radial-gradient(700px circle at 80% 100%, hsl(280 80% 60% / 0.06), transparent 60%);
        }

        /* Feature glow on hover */
        .pay-feature-glow {
          background: radial-gradient(400px circle at center, hsl(var(--primary) / 0.10), transparent 70%);
        }

        /* Pillar cards */
        .pay-pillar:hover { transform: translateY(-6px); }

        /* Code card tilt */
        .pay-code-wrap { perspective: 1200px; }
        .pay-code-card {
          transform: rotateY(-6deg) rotateX(4deg);
          transition: transform 0.6s ease;
        }
        .pay-code-card:hover {
          transform: rotateY(0deg) rotateX(0deg);
        }

        /* Primary CTA shimmer */
        .pay-cta {
          background: linear-gradient(120deg, hsl(var(--primary)), hsl(var(--primary) / 0.8), hsl(var(--primary)));
          background-size: 200% 100%;
          animation: pay-shine 4s ease-in-out infinite;
          box-shadow: 0 10px 30px -10px hsl(var(--primary) / 0.4);
        }

        /* CTA section bg */
        .pay-cta-bg {
          background:
            radial-gradient(1000px circle at 50% 50%, hsl(var(--primary) / 0.15), transparent 60%),
            linear-gradient(180deg, transparent, hsl(var(--muted) / 0.3));
        }

        @media (prefers-reduced-motion: reduce) {
          .pay-grid, .pay-orb, .pay-float-chip, .pay-cta, .pay-gradient-text { animation: none !important; }
          .pay-code-card { transform: none !important; }
        }
      `}</style>
    </Layout>
  );
};

export default PayOpenSource;

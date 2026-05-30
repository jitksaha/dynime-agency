import { forwardRef, useMemo, useState, useEffect } from "react";
import Link from "@/components/shared/PrefetchLink";
import {
  Mail,
  Phone,
  MapPin,
  ArrowUpRight,
  ArrowRight,
  Send,
  Shield,
  Award,
  Globe,
  Heart,
  Sparkles,
  Loader2,
  MessageCircle,
  AlertCircle,
} from "lucide-react";
import SocialIcons from "@/components/shared/SocialIcons";
import SiteLogo from "@/components/shared/SiteLogo";
import CurrencySwitcher from "@/components/shared/CurrencySwitcher";
import LanguageSwitcher from "@/components/shared/LanguageSwitcher";
import { useLocation as useGeoCtx } from "@/contexts/LocationContext";
import dynimeIcon from "@/assets/dynime-icon-light.svg";
import { useSiteSettings, useContactInfo } from "@/hooks/use-data";
import { supabase } from "@/integrations/supabase/client";
import {
  parseFooterBlocks,
  type FooterBlock,
  type FooterLocation,
} from "./footer-blocks";
import { renderPlaceholders } from "@/lib/footer-placeholders";
import { sanitizeRichText } from "@/lib/sanitize-html";
import { serviceTabs } from "./nav-data";


/* ────────────────────────────────────────────────────────────────────────── */
/*  Atoms                                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

const FooterLink = forwardRef<HTMLAnchorElement, { to: string; children: React.ReactNode }>(
  ({ to, children }, ref) => (
    <Link
      ref={ref}
      to={to}
      className="group/fl inline-flex items-center text-sm text-muted-foreground hover:text-foreground dark:text-slate-300 dark:hover:text-white transition-colors"
    >
      <span className="relative">
        {children}
        <span className="absolute left-0 -bottom-0.5 h-px w-0 bg-primary group-hover/fl:w-full transition-all duration-300" />
      </span>
      <ArrowUpRight className="ml-1 w-3 h-3 opacity-0 -translate-x-1 group-hover/fl:opacity-100 group-hover/fl:translate-x-0 transition-all" />
    </Link>
  ),
);
FooterLink.displayName = "FooterLink";

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h4 className="text-[11px] font-heading font-bold text-foreground/60 dark:text-white/70 mb-3 uppercase tracking-[0.18em] flex items-center gap-2">
    <span className="inline-block w-5 h-px bg-gradient-to-r from-primary to-primary/0" />
    {children}
  </h4>
);

const TrustChip = ({
  icon: Icon,
  title,
  subtitle,
  to,
  href,
}: {
  icon: typeof Shield;
  title: string;
  subtitle: string;
  to?: string;
  href?: string;
}) => {
  const inner = (
    <>
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary shrink-0 ring-1 ring-primary/20">
        <Icon className="h-4 w-4" strokeWidth={2.2} />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="text-sm font-semibold text-foreground dark:text-white leading-tight break-words"
          dangerouslySetInnerHTML={{ __html: sanitizeRichText(title) }}
        />
        <p
          className="text-xs text-muted-foreground dark:text-slate-400 leading-snug mt-0.5 break-words [overflow-wrap:anywhere] [&_a]:underline [&_a]:underline-offset-2"
          dangerouslySetInnerHTML={{ __html: sanitizeRichText(subtitle) }}
        />
      </div>
    </>
  );
  const cls = "flex items-center gap-3 rounded-xl border border-border bg-background/60 dark:border-white/10 dark:bg-white/[0.03] backdrop-blur-md px-4 py-3 hover:border-primary/40 hover:bg-background dark:hover:bg-white/[0.06] transition-all";
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>;
  if (to) return <Link to={to} className={cls}>{inner}</Link>;
  return <div className={cls}>{inner}</div>;
};

/* ────────────────────────────────────────────────────────────────────────── */
/*  Curated link groups — merged with admin "links" blocks                    */
/* ────────────────────────────────────────────────────────────────────────── */

// Build dynamic footer link groups from the same nav-data source the header uses,
// so adding/removing a service or product anywhere updates the footer automatically.
const SERVICE_HUB_ROUTE: Record<"dws" | "dms" | "dss" | "dcs" | "dbm", string> = {
  dws: "/services",
  dms: "/services",
  dss: "/services/dss",
  dcs: "/services",
  dbm: "/products/dbm",
};

const buildDynamicGroups = (): { title: string; links: { label: string; to: string }[] }[] => {
  // Services — show each division by full name, linking to its main hub page
  const services = (["dws", "dms", "dss", "dcs"] as const).map((key) => {
    const tab = serviceTabs[key];
    return {
      label: `${tab.label} – ${tab.sublabel}`,
      to: SERVICE_HUB_ROUTE[key],
    };
  });

  // Products — Dynime OS modules — skip the hub entry itself
  const products = serviceTabs.dbm.items
    .filter((it) => it.label.toLowerCase() !== "explore dynime os")
    .slice(0, 6)
    .map((it) => ({ label: it.label, to: it.to }));

  return [
    {
      title: "Services",
      links: [
        ...services,
        { label: "FlexPay – Buy Now, Pay Later", to: "/flexpay" },
        { label: "All Services", to: "/services" },
      ],
    },
    { title: "Products", links: [...products, { label: "Explore Dynime OS", to: "/products/os" }] },
    {
      title: "Company",
      links: [
        { label: "About Us", to: "/about" },
        { label: "Portfolio", to: "/portfolio" },
        { label: "Our Team", to: "/about" },
        { label: "Careers", to: "/careers" },
        { label: "Investment Plans", to: "/invest" },
        { label: "Investor Relations", to: "/investor-relations" },
        { label: "Investor Portal", to: "/investor" },
        { label: "Contact", to: "/contact" },
      ],
    },
  ];
};

/* ────────────────────────────────────────────────────────────────────────── */
/*  Footer                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

const Footer = () => {
  const { currency, setCurrency, geo, currencyAuto, languageAuto } = useGeoCtx();
  const { data: settings } = useSiteSettings();
  const { data: contactInfo } = useContactInfo();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const blocks = useMemo<FooterBlock[]>(
    () => parseFooterBlocks(settings?.footer_blocks, settings),
    [settings],
  );

  const visible = blocks.filter((b) => b.visible !== false);
  const brandBlock = visible.find((b) => b.type === "brand") as
    | Extract<FooterBlock, { type: "brand" }>
    | undefined;
  const adminLinkBlocks = visible.filter(
    (b): b is Extract<FooterBlock, { type: "links" }> => b.type === "links",
  );
  const contactsBlock = visible.find(
    (b): b is Extract<FooterBlock, { type: "contacts" }> => b.type === "contacts",
  );
  const locationsBlock = visible.find(
    (b): b is Extract<FooterBlock, { type: "locations" }> => b.type === "locations",
  );
  const copyrightBlock = visible.find(
    (b): b is Extract<FooterBlock, { type: "copyright" }> => b.type === "copyright",
  );
  const paymentsBlock = visible.find(
    (b): b is Extract<FooterBlock, { type: "payments" }> => b.type === "payments",
  );

  // Merge admin link blocks with dynamic defaults (Services / Products / Company)
  const linkGroups = useMemo(() => {
    const merged = buildDynamicGroups();
    for (const b of adminLinkBlocks) {
      const idx = merged.findIndex((g) => g.title.toLowerCase() === b.title.toLowerCase());
      if (idx >= 0) merged[idx] = { title: b.title, links: b.links };
      else merged.push({ title: b.title, links: b.links });
    }
    return merged.filter((g) => !/^(legal|policy|policies|resources)$/i.test(g.title)).slice(0, 3);
  }, [adminLinkBlocks]);

  // Legal links — always wired to the dedicated routes
  const legalLinks = useMemo(() => {
    const pool = adminLinkBlocks.flatMap((b) => b.links);
    const pick = (rx: RegExp, fallback: { label: string; to: string }) => {
      const match = pool.find((l) => rx.test(l.label));
      return match ?? fallback;
    };
    return [
      pick(/privacy/i, { label: "Privacy", to: "/privacy" }),
      pick(/terms/i, { label: "Terms", to: "/terms" }),
      pick(/refund/i, { label: "Refund", to: "/refund" }),
      pick(/cookie/i, { label: "Cookies", to: "/cookies" }),
      pick(/aml|compliance/i, { label: "AML", to: "/aml" }),
      pick(/acceptable/i, { label: "AUP", to: "/acceptable-use" }),
      pick(/payment/i, { label: "Payments", to: "/payments" }),
      pick(/support/i, { label: "Support", to: "/support" }),
    ];
  }, [adminLinkBlocks]);

  const copyrightText = renderPlaceholders(
    settings?.footer_copyright ||
      copyrightBlock?.text ||
      `© 2019-{year} {company}. All rights reserved.`
  );
  const trademarkText = renderPlaceholders(
    settings?.footer_trademark ||
      "All third-party ® / ™ marks belong to their respective owners."
  );

  // Hero CTA copy (admin-configurable, with unique default)
  const ctaEyebrow = renderPlaceholders(settings?.footer_cta_eyebrow || "Ready when you are");
  const ctaText = renderPlaceholders(
    settings?.footer_cta_text ||
      "Turn your bold idea into a digital product people love.",
  );
  const ctaSub = renderPlaceholders(
    settings?.footer_cta_subtext ||
      "We design, build and ship modern websites, apps and growth systems — engineered to convert and crafted to last.",
  );
  const ctaButtonLabel = settings?.footer_cta_button || "Start your project";
  const ctaUrl = settings?.footer_cta_url || "/contact";
  const ctaSecondaryLabel = settings?.footer_cta_secondary || "View our work";
  const ctaSecondaryUrl = settings?.footer_cta_secondary_url || "/portfolio";

  // Brand description fallback
  const brandDescription =
    brandBlock?.description ||
    "Your Digital Business Solution Partner — building modern websites, e-commerce platforms and growth-driven digital products since 2019.";

  // Payment badges
  const paymentBadges = paymentsBlock?.badges ?? [
    "Visa",
    "Mastercard",
    "PayPal",
    "Stripe",
    "bKash",
    "Nagad",
  ];

  // Dynamic offices: prefer footer_blocks "locations" → fallback to JSON in settings → empty
  const offices: FooterLocation[] = useMemo(() => {
    if (locationsBlock?.items?.length) return locationsBlock.items;
    const raw = settings?.footer_offices;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed as FooterLocation[];
      } catch { /* ignore */ }
    }
    return [];
  }, [locationsBlock, settings?.footer_offices]);

  // Newsletter heading (admin-configurable)
  const newsletterTitle = renderPlaceholders(settings?.newsletter_title || "Get our best ideas, monthly");
  const newsletterSub = renderPlaceholders(
    settings?.newsletter_subtext ||
      "Tactical playbooks on design, growth & engineering — straight to your inbox. No spam, unsubscribe anytime.",
  );

  // Build 4 contact chips (Email, Call, WhatsApp, Address) — link to /contact, except WhatsApp → wa.me
  const contactChips = useMemo(() => {
    const items = contactInfo ?? [];
    const findByType = (...types: string[]) =>
      items.find((c) => types.includes((c.type || "").toLowerCase()));

    const email = findByType("email", "mail");
    const phone = findByType("phone", "tel", "mobile", "call");
    const whatsapp = findByType("whatsapp");
    const address = findByType("address", "location", "office");

    const chips: { id: string; icon: typeof Shield; title: string; subtitle: string; to?: string; href?: string }[] = [];
    if (email) chips.push({ id: email.id, icon: Mail, title: email.label || "Email us", subtitle: email.value, to: "/contact" });
    if (phone) chips.push({ id: phone.id, icon: Phone, title: phone.label || "Call us", subtitle: phone.value, to: "/contact" });
    if (whatsapp) {
      const digits = whatsapp.value.replace(/[^\d]/g, "");
      chips.push({ id: whatsapp.id, icon: MessageCircle, title: whatsapp.label || "WhatsApp", subtitle: whatsapp.value, href: `https://wa.me/${digits}` });
    }
    if (address) chips.push({ id: address.id, icon: MapPin, title: "Office Locator", subtitle: "Find all our global offices", to: "/contact" });
    return chips;
  }, [contactInfo]);

  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 4500);
    return () => clearTimeout(t);
  }, [feedback]);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || submitting) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const { data, error } = await supabase.functions.invoke("subscribe-newsletter", {
        body: { email: email.trim(), source: "footer" },
      });
      if (error) throw error;
      const payload = data as { success?: boolean; message?: string; error?: string } | null;
      if (payload?.success) {
        setFeedback({ type: "ok", msg: payload.message || "Thanks for subscribing!" });
        setEmail("");
      } else {
        setFeedback({ type: "err", msg: payload?.error || "Something went wrong. Try again." });
      }
    } catch (err) {
      setFeedback({
        type: "err",
        msg: err instanceof Error ? err.message : "Could not subscribe. Try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="relative isolate overflow-hidden text-foreground dark:text-slate-200">
      {/* ── Theme-aware backdrop with brand glow ───────────────────────── */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-secondary/40 dark:bg-[#0a0d14]"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-90"
        style={{
          background:
            "radial-gradient(60% 60% at 15% 0%, hsl(var(--primary) / 0.10), transparent 60%), radial-gradient(50% 60% at 90% 10%, hsl(var(--primary) / 0.08), transparent 65%), radial-gradient(40% 50% at 50% 100%, hsl(var(--primary) / 0.06), transparent 70%)",
        }}
      />
      {/* Subtle grid pattern — light in dark mode, dark in light mode */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.05] dark:opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      <div className="h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

      {/* ============================================================ */}
      {/*  A. HERO CTA — bold, oversized, centered                     */}
      {/* ============================================================ */}
      <section className="relative">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8 pt-9 md:pt-12 pb-8 md:pb-10 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 dark:border-white/15 dark:bg-white/5 backdrop-blur px-3 py-1 text-xs font-medium text-muted-foreground dark:text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            {ctaEyebrow}
          </span>
          <h2 className="mt-4 font-heading font-bold tracking-tight text-foreground dark:text-white text-3xl sm:text-4xl md:text-5xl leading-[1.05] max-w-3xl mx-auto">
            {ctaText}
          </h2>
          <p className="mt-3 text-sm md:text-base text-muted-foreground dark:text-slate-300/90 leading-relaxed max-w-2xl mx-auto">
            {ctaSub}
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to={ctaUrl}
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary/85 text-primary-foreground px-6 py-2.5 text-sm font-semibold shadow-[0_12px_40px_-12px_hsl(var(--primary)/0.7)] hover:brightness-110 hover:scale-[1.03] active:scale-[0.98] transition-all duration-300"
            >
              {ctaButtonLabel}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              to={ctaSecondaryUrl}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 hover:bg-background hover:border-border dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10 dark:hover:border-white/25 text-foreground dark:text-white px-6 py-2.5 text-sm font-semibold transition-all backdrop-blur"
            >
              {ctaSecondaryLabel}
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  B. TRUST STRIP                                              */}
      {/* ============================================================ */}
      <Link to="/contact" aria-label="Go to contact page" className="block border-t border-border/60 dark:border-white/[0.06] hover:bg-muted/30 transition-colors">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8 py-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {contactChips.length > 0 ? (
              contactChips.map((c) => (
                <TrustChip key={c.id} icon={c.icon} title={c.title} subtitle={c.subtitle} to={c.to} href={c.href} />
              ))
            ) : (
              <>
                <TrustChip icon={Shield} title="Secure & Trusted" subtitle="SSL · GDPR Compliant" />
                <TrustChip icon={Award} title="Award-winning" subtitle="500+ projects delivered" />
                <TrustChip icon={Globe} title="Global Reach" subtitle="Clients in 25+ countries" />
                <TrustChip icon={Heart} title="24/7 Support" subtitle="Real humans, fast replies" />
              </>
            )}
          </div>
        </div>
      </Link>

      {/* ============================================================ */}
      {/*  C. MAIN GRID — brand + nav + newsletter                     */}
      {/* ============================================================ */}
      <div className="mx-auto max-w-[1200px] px-6 lg:px-8 pt-8 md:pt-8 pb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-x-8 gap-y-5">
          {/* Brand + social */}
          <div className="sm:col-span-2 lg:col-span-3 space-y-3">
            <Link to="/" className="inline-flex items-center">
              <SiteLogo
                alt="Site logo"
                className="h-11 w-auto max-w-[180px] object-contain"
              />
            </Link>
            <p className="text-sm text-muted-foreground dark:text-slate-400 leading-relaxed max-w-sm">
              {brandDescription}
            </p>
            {contactsBlock && contactsBlock.items.length > 0 && (
              <div className="flex flex-col gap-2.5 pt-1">
                {contactsBlock.items.map((c) => (
                  <a
                    key={c.id}
                    href={c.type === "phone" ? `tel:${c.value}` : `mailto:${c.value}`}
                    className="inline-flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground dark:text-slate-300 dark:hover:text-white transition-colors"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-background/60 border border-border dark:bg-white/5 dark:border-white/10 text-primary">
                      {c.type === "phone" ? <Phone className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
                    </span>
                    <span className="break-all">{c.value}</span>
                  </a>
                ))}
              </div>
            )}
            {/* Compact newsletter — sits above social icons */}
            <div className="pt-3">
              {feedback?.type === "ok" ? (
                <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-foreground dark:text-white">
                  <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate">{feedback.msg}</span>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground dark:text-slate-400">
                    {newsletterTitle}
                  </p>
                  <div className="flex items-stretch gap-2">
                    <div className="flex-1 flex items-center gap-2 rounded-lg border border-border bg-background dark:border-white/10 dark:bg-white/[0.04] px-3 py-2 transition-colors focus-within:border-primary">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground dark:text-slate-400 shrink-0" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@email.com"
                        disabled={submitting}
                        aria-label="Email address"
                        autoComplete="email"
                        className="flex-1 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 text-sm text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-slate-500 min-w-0 disabled:opacity-60"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      aria-label="Subscribe"
                      title="Subscribe"
                      className="inline-flex h-auto w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-primary to-primary/85 text-primary-foreground hover:brightness-110 active:scale-[0.97] disabled:opacity-60 transition-all shadow-[0_6px_18px_-8px_hsl(var(--primary)/0.7)]"
                    >
                      {submitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {feedback?.type === "err" && (
                    <p className="text-[11px] font-medium text-destructive flex items-center gap-1.5">
                      <AlertCircle className="w-3 h-3" /> {feedback.msg}
                    </p>
                  )}
                </form>
              )}
            </div>
          </div>

          {/* Link columns — accordion on mobile, static columns from sm+ */}
          {linkGroups.map((group) => (
            <details
              key={group.title}
              className="group/acc sm:col-span-1 lg:col-span-3 border-b border-border/60 dark:border-white/[0.06] sm:border-0 [&_summary::-webkit-details-marker]:hidden sm:open:!block"
              open
            >
              <summary className="flex items-center justify-between py-3 cursor-pointer list-none sm:cursor-default sm:py-0">
                <SectionTitle>{group.title}</SectionTitle>
                <ArrowRight className="w-4 h-4 text-muted-foreground transition-transform group-open/acc:rotate-90 sm:hidden" />
              </summary>
              <nav className="flex flex-col gap-2 pb-3 sm:pb-0">
                {group.links.map((l, i) => (
                  <FooterLink key={`${group.title}-${i}`} to={l.to}>
                    {l.label}
                  </FooterLink>
                ))}
              </nav>
            </details>
          ))}

        </div>

        <div className="mt-3 flex flex-row flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 dark:border-white/[0.06]">
          <SocialIcons size="sm" variant="vibrant" />
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <LanguageSwitcher compact />
            <CurrencySwitcher value={currency} onChange={setCurrency} compact />
            {geo?.country && (currencyAuto || languageAuto) && (
              <span className="basis-full text-[11px] text-muted-foreground dark:text-slate-400 text-right">
                <Globe className="inline w-3 h-3 mr-1 text-primary" />
                Auto-detected from <span className="font-semibold text-foreground dark:text-white">{geo.country}</span>
              </span>
            )}
          </div>
        </div>

        {/* Offices — dynamic */}
        {offices.length > 0 && (
          <div className="mt-10 pt-6 border-t border-border/60 dark:border-white/[0.06]">
            <SectionTitle>{locationsBlock?.title || "Our Offices"}</SectionTitle>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {offices.map((loc) => (
                <li
                  key={loc.id}
                  className="group flex gap-3 rounded-xl border border-border bg-background/60 dark:border-white/[0.08] dark:bg-white/[0.03] p-4 hover:border-primary/40 hover:bg-background dark:hover:bg-white/[0.06] transition-all"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary shrink-0 ring-1 ring-primary/20">
                    <MapPin className="w-4 h-4" />
                  </span>
                  <div className="leading-snug min-w-0">
                    <p className="text-sm font-semibold text-foreground dark:text-white">
                      {loc.flag} {loc.city}
                    </p>
                    <p className="text-xs text-muted-foreground dark:text-slate-400 mt-1">{loc.address}</p>
                    {loc.note && (
                      <p className="text-[11px] text-muted-foreground/70 dark:text-slate-500 mt-1">{loc.note}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/*  E. BOTTOM BAR — refined copyright row                       */}
      {/* ============================================================ */}
      <div className="relative border-t border-border/60 dark:border-white/[0.06] bg-gradient-to-b from-secondary/40 to-secondary/70 dark:from-black/20 dark:to-black/50 backdrop-blur-md pb-14 md:pb-0">
        {/* top hairline accent */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

        <div className="mx-auto max-w-[1200px] px-5 sm:px-6 lg:px-8 py-3 pr-20 md:pr-6 lg:pr-8">
          {/* Single row — copyright + legal links */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 md:gap-4">
            <div className="flex items-start sm:items-center gap-1 min-w-0 text-left -ml-1">
              <img src={dynimeIcon} alt="Dynime" className="h-9 w-9 shrink-0 -mx-1.5" draggable={false} />
              <div className="min-w-0">
                <p
                  className="text-xs sm:text-[13px] font-medium text-foreground/90 dark:text-slate-200 break-words [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-primary"
                  dangerouslySetInnerHTML={{ __html: sanitizeRichText(copyrightText) }}
                />
                {trademarkText && (
                  <p
                    className="text-[11px] leading-snug text-muted-foreground/80 dark:text-slate-500 mt-0.5 break-words [&_a]:underline [&_a]:underline-offset-2"
                    dangerouslySetInnerHTML={{ __html: sanitizeRichText(trademarkText) }}
                  />
                )}
              </div>
            </div>
            <nav className="flex flex-wrap items-center justify-start md:justify-end gap-x-0.5 gap-y-1 -mx-1">
              {legalLinks.map((l, i) => (
                <span key={`${l.to}-${l.label}`} className="inline-flex items-center">
                  <Link
                    to={l.to}
                    className="text-[11px] sm:text-xs font-medium text-muted-foreground hover:text-foreground dark:text-slate-400 dark:hover:text-white px-1.5 sm:px-2 py-1 rounded-md hover:bg-background/60 dark:hover:bg-white/[0.05] transition-colors whitespace-nowrap"
                  >
                    {l.label}
                  </Link>
                  {i < legalLinks.length - 1 && (
                    <span aria-hidden className="text-muted-foreground/40 select-none text-xs">·</span>
                  )}
                </span>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

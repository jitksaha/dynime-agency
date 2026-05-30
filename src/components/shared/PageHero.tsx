import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface HeroCTA {
  label: string;
  href: string;
  /** External link — opens in new tab and uses <a> instead of <Link> */
  external?: boolean;
  icon?: LucideIcon;
}

interface PageHeroProps {
  eyebrow?: string;
  eyebrowIcon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  align?: "center" | "left";
  children?: ReactNode;
  /** Primary action (filled button). */
  primaryCta?: HeroCTA;
  /** Secondary action (text/ghost link). */
  secondaryCta?: HeroCTA;
  /** Optional right-side visual (image/illustration). When provided, layout becomes 2-col on lg. */
  visual?: ReactNode;
  className?: string;
}

/**
 * Standardised page hero — premium, responsive, design-system-only colors.
 * Fluid typography via clamp() so headings scale smoothly from 360px → 1920px
 * without breakpoint jumps. Background uses semantic tokens (primary/accent)
 * with subtle radial glows + grid mesh consistent across all pages.
 */
const PageHero = ({
  eyebrow,
  eyebrowIcon: Icon = Sparkles,
  title,
  description,
  align = "center",
  children,
  primaryCta,
  secondaryCta,
  visual,
  className = "",
}: PageHeroProps) => {
  const isCenter = align === "center" && !visual;

  const renderCTA = (cta: HeroCTA, variant: "primary" | "secondary") => {
    const CtaIcon = cta.icon;
    const inner = (
      <>
        {cta.label}
        {variant === "primary" ? (
          <ArrowRight className="w-4 h-4 ml-1.5" />
        ) : CtaIcon ? (
          <CtaIcon className="w-4 h-4 ml-1.5" />
        ) : null}
      </>
    );
    if (variant === "primary") {
      return (
        <Button
          variant="hero"
          size="lg"
          asChild
          className="w-full sm:w-auto transition-[filter,box-shadow] duration-300 hover:brightness-110"
        >
          {cta.external ? (
            <a href={cta.href} target="_blank" rel="noreferrer noopener">
              {inner}
            </a>
          ) : (
            <Link to={cta.href}>{inner}</Link>
          )}
        </Button>
      );
    }
    return cta.external ? (
      <a
        href={cta.href}
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-foreground hover:text-primary transition-colors group"
      >
        {cta.label}
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
      </a>
    ) : (
      <Link
        to={cta.href}
        className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-foreground hover:text-primary transition-colors group"
      >
        {cta.label}
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
    );
  };

  return (
    <section
      className={`relative isolate overflow-hidden pt-14 sm:pt-16 md:pt-20 lg:pt-24 pb-9 sm:pb-12 md:pb-14 ${className}`}
    >
      {/* Background — semantic-token gradients only */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 0%, hsl(var(--primary) / 0.16), transparent 70%), radial-gradient(40% 35% at 85% 30%, hsl(var(--accent) / 0.10), transparent 70%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage:
              "radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent 75%)",
          }}
        />
      </div>

      <div className="container-custom">
        <div
          className={
            visual
              ? "grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center"
              : "max-w-4xl mx-auto"
          }
        >
          <motion.div
            initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className={`${visual ? "lg:col-span-7" : ""} ${
              isCenter ? "text-center" : "text-left"
            }`}
          >
            {eyebrow && (
              <span
                className={`inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 backdrop-blur-sm px-3.5 py-1.5 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.14em] text-primary mb-5 ${
                  isCenter ? "mx-auto" : ""
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {eyebrow}
              </span>
            )}

            <h1
              className="font-heading font-bold text-foreground leading-[1.05] tracking-tight text-balance mb-5"
              style={{
                fontSize: "clamp(2.25rem, 1.4rem + 4.2vw, 4.75rem)",
                letterSpacing: "-0.025em",
              }}
            >
              {title}
            </h1>

            {description && (
              <p
                className={`text-muted-foreground leading-relaxed ${
                  isCenter ? "mx-auto" : ""
                } max-w-2xl`}
                style={{ fontSize: "clamp(1rem, 0.95rem + 0.4vw, 1.2rem)" }}
              >
                {description}
              </p>
            )}

            {(primaryCta || secondaryCta) && (
              <div
                className={`mt-7 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-5 ${
                  isCenter ? "justify-center" : ""
                }`}
              >
                {primaryCta && renderCTA(primaryCta, "primary")}
                {secondaryCta && renderCTA(secondaryCta, "secondary")}
              </div>
            )}

            {children && (
              <div className={`mt-7 ${isCenter ? "flex justify-center" : ""}`}>
                {children}
              </div>
            )}
          </motion.div>

          {visual && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="lg:col-span-5 relative flex justify-center lg:justify-end"
            >
              <div
                aria-hidden
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <div className="w-[280px] h-[280px] sm:w-[340px] sm:h-[340px] rounded-full bg-primary/15 blur-[70px]" />
              </div>
              <div className="relative z-10 w-full max-w-[420px] lg:max-w-none">
                {visual}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
};

export default PageHero;

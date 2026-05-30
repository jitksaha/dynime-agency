import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHomeSections } from "@/hooks/use-home-sections";

/**
 * Hero — minimal modern layout.
 *  • Eyebrow rendered as a pill with soft background + rounded border (admin-editable)
 *  • Headline: base text in foreground, {{highlighted}} portion uses brand primary
 *  • Smaller, balanced typography
 *  • Primary CTA + contact-info grid (phone / email / chat)
 */
const renderHeadline = (raw: string) => {
  const parts = raw.split(/(\{\{[^}]+\}\})/g);
  return (
    <>
      {parts.map((p, idx) => {
        const m = p.match(/^\{\{(.+)\}\}$/);
        if (m) {
          return (
            <span
              key={idx}
              className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent"
            >
              {m[1]}
            </span>
          );
        }
        return (
          <span key={idx} className="text-foreground">
            {p}
          </span>
        );
      })}
    </>
  );
};

const Hero = () => {
  const { data: sections } = useHomeSections();
  const hero = sections!.hero;



  return (
    <section className="relative isolate overflow-hidden bg-background">
      {/* Dotted grid background */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(circle, hsl(var(--foreground) / 0.18) 1px, transparent 1.2px)",
          backgroundSize: "22px 22px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 45%, black, transparent 85%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 50% 45%, black, transparent 85%)",
        }}
      />
      {/* Soft halo behind CTA */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[60%] -z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 100%, hsl(var(--primary) / 0.18), transparent 70%)",
        }}
      />

      <div className="container-custom relative pb-16 md:pb-24 lg:pb-28">
        <div className="max-w-4xl mx-auto text-center">
          {/* Eyebrow pill */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2.5 mb-6 rounded-full border border-border/60 bg-card/70 backdrop-blur-md px-4 py-2 shadow-sm"
          >
            <span className="relative flex w-2.5 h-2.5">
              <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-500 opacity-60 animate-ping" />
              <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-emerald-500" />
            </span>

            <span className="text-xs sm:text-sm font-medium text-foreground/80">
              {hero.eyebrow}
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="mt-6 font-heading font-bold tracking-tight text-balance"
            style={{
              fontSize: "clamp(1.85rem, 0.9rem + 3.6vw, 3.75rem)",
              lineHeight: 1.08,
              letterSpacing: "-0.025em",
            }}
          >
            {renderHeadline(hero.headline)}
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-6 text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed text-balance"
          >
            {hero.subheadline}
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="mt-10 flex flex-wrap justify-center gap-3"
          >
            <Button
              variant="hero"
              size="lg"
              asChild
              className="h-12 px-7 text-sm font-semibold rounded-full shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/45 transition-all duration-300 hover:-translate-y-0.5"
            >
              <Link to={hero.primary_cta_href}>
                {hero.primary_cta_label}
                <Rocket className="w-4 h-4 ml-2 -rotate-45" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              asChild
              className="h-12 px-7 text-sm font-semibold rounded-full border-border/70 bg-card/60 backdrop-blur text-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all"
            >
              <Link to={hero.secondary_cta_href}>{hero.secondary_cta_label}</Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

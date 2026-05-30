import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Globe2, Sparkles } from "lucide-react";
import { useHomeSections } from "@/hooks/use-home-sections";
import type { CountryItem } from "@/lib/home-sections-defaults";

const CountryPill = ({ flag, name }: { flag: string; name: string }) => (
  <motion.div
    whileHover={{ y: -3, scale: 1.04 }}
    transition={{ type: "spring", stiffness: 400, damping: 18 }}
    className="group relative flex items-center gap-2.5 rounded-full border border-border/60 bg-background/70 dark:bg-white/[0.04] px-4 py-2 whitespace-nowrap flex-shrink-0 backdrop-blur-md hover:border-primary/50 hover:bg-background dark:hover:bg-white/[0.08] transition-colors"
  >
    <span className="pointer-events-none absolute inset-0 -z-10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-primary/15 via-transparent to-primary/15 blur-md" />
    <span className="text-base leading-none">{flag}</span>
    <span className="text-xs font-medium text-foreground/85 dark:text-slate-200">{name}</span>
  </motion.div>
);

const Marquee = ({ items, duration, reverse = false }: { items: CountryItem[]; duration: number; reverse?: boolean }) => (
  <div className="relative overflow-hidden">
    <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-20 sm:w-28 bg-gradient-to-r from-background to-transparent z-10" />
    <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-20 sm:w-28 bg-gradient-to-l from-background to-transparent z-10" />
    <motion.div
      className="flex gap-3 py-1"
      animate={{ x: reverse ? ["-50%", "0%"] : ["0%", "-50%"] }}
      transition={{ duration, repeat: Infinity, ease: "linear" }}
      style={{ width: "max-content" }}
    >
      {[...items, ...items].map((c, i) => (
        <CountryPill key={`${reverse ? "r" : "f"}-${i}`} flag={c.flag} name={c.name} />
      ))}
    </motion.div>
  </div>
);

const CountriesServed = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const { data: sections } = useHomeSections();
  const c = sections!.countries;

  return (
    <section ref={ref} className="section-padding relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10" style={{
        background: "radial-gradient(50% 50% at 20% 20%, hsl(var(--primary) / 0.08), transparent 60%), radial-gradient(45% 50% at 85% 80%, hsl(var(--primary) / 0.07), transparent 65%)",
      }} />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-[0.04]" style={{
        backgroundImage: "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
        backgroundSize: "44px 44px",
      }} />

      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-10 md:mb-12"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 dark:bg-white/[0.04] backdrop-blur px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <Sparkles className="w-3 h-3 text-primary" />
            {c.eyebrow}
          </span>
          <h3 className="mt-4 font-heading text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            {c.heading_prefix}{" "}
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              {c.heading_highlight}
            </span>
          </h3>
          <p className="mt-3 text-sm md:text-base text-muted-foreground leading-relaxed">{c.description}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10 md:mb-12 max-w-4xl mx-auto"
        >
          {c.stats.map((s, i) => (
            <div key={`${s.label}-${i}`} className="rounded-2xl border border-border/60 bg-background/60 dark:bg-white/[0.03] backdrop-blur px-4 py-4 text-center hover:border-primary/40 transition-colors">
              <div className="font-heading text-2xl md:text-3xl font-bold text-foreground">{s.value}</div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="relative rounded-3xl border border-border/60 bg-gradient-to-b from-background/40 to-secondary/40 dark:from-white/[0.02] dark:to-black/30 backdrop-blur-md p-4 md:p-6 overflow-hidden"
        >
          <div className="pointer-events-none absolute -top-px left-1/2 -translate-x-1/2 h-px w-3/4 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          <div className="absolute top-3 right-4 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/70 dark:bg-white/[0.05] backdrop-blur px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
            <Globe2 className="w-3 h-3 text-primary" />
            Live
          </div>
          <div className="space-y-3">
            <Marquee items={c.items} duration={38} />
            <Marquee items={c.items.slice().reverse()} duration={44} reverse />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 max-w-3xl mx-auto rounded-2xl border border-border/60 bg-background/60 dark:bg-white/[0.03] backdrop-blur px-5 py-4 text-center"
        >
          <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Eligibility:</span> we onboard clients from any country that complies with international law — excluding jurisdictions on FATF blacklists or under major sanctions (e.g. OFAC), regions in active conflict, and territories with severe restrictions on digital services or cross-border payments.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default CountriesServed;

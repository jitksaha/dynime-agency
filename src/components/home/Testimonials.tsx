import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { useHomeSections } from "@/hooks/use-home-sections";
import type { Testimonial } from "@/lib/home-sections-defaults";

const TestimonialCard = ({ t }: { t: Testimonial }) => (
  <div className="w-[320px] flex-shrink-0 p-5 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm group hover:border-primary/30 transition-all duration-300 relative overflow-hidden">
    <div className="absolute -top-8 -right-8 w-20 h-20 rounded-full bg-primary/0 group-hover:bg-primary/10 transition-all duration-500 blur-2xl" />
    <Quote className="w-6 h-6 text-primary/20 mb-2" />
    <div className="flex gap-0.5 mb-2">
      {Array.from({ length: t.rating }).map((_, i) => (
        <Star key={i} className="w-3 h-3 text-amber-400 fill-amber-400" />
      ))}
    </div>
    <p className="text-sm text-foreground/90 leading-relaxed mb-4">"{t.text}"</p>
    <div className="pt-3 border-t border-border/30">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-bold text-primary">
            {t.name.split(" ").map((n) => n[0]).join("")}
          </span>
        </div>
        <div>
          <p className="font-heading font-semibold text-xs text-foreground">{t.name}</p>
          <p className="text-[10px] text-muted-foreground">{t.role}</p>
        </div>
      </div>
    </div>
  </div>
);

const Testimonials = () => {
  const { data: sections } = useHomeSections();
  const t = sections!.testimonials;
  const half = Math.ceil(t.items.length / 2);
  const row1 = t.items.slice(0, half);
  const row2 = t.items.slice(half).length ? t.items.slice(half) : t.items.slice(0, half);

  return (
    <section className="section-padding bg-card/30 relative overflow-hidden">
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/3 blur-[120px] pointer-events-none"
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative">
        <ScrollReveal>
          <div className="text-center mb-12">
            <span className="text-primary text-sm font-semibold uppercase tracking-wider">{t.eyebrow}</span>
            <h2 className="font-heading text-3xl md:text-4xl font-bold mt-3 mb-2">{t.heading}</h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">{t.description}</p>
          </div>
        </ScrollReveal>

        <div className="relative mb-4">
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-card/50 to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-card/50 to-transparent z-10" />
          <motion.div
            className="flex items-stretch gap-4"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
            style={{ width: "max-content" }}
          >
            {[...row1, ...row1].map((tm, i) => <TestimonialCard key={`r1-${i}`} t={tm} />)}
          </motion.div>
        </div>

        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-card/50 to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-card/50 to-transparent z-10" />
          <motion.div
            className="flex items-stretch gap-4"
            animate={{ x: ["-50%", "0%"] }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            style={{ width: "max-content" }}
          >
            {[...row2, ...row2].map((tm, i) => <TestimonialCard key={`r2-${i}`} t={tm} />)}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;

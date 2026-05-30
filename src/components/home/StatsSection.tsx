import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { AnimatedCounter } from "@/components/shared/ScrollReveal";
import { useHomeSections } from "@/hooks/use-home-sections";

const StatsSection = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const { data: sections } = useHomeSections();
  const stats = sections!.stats.items;

  return (
    <section ref={ref} className="py-9 md:py-10 border-y border-border/30 relative overflow-hidden">
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 1 }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[200px] bg-primary/5 blur-[100px] rounded-full" />
      </motion.div>

      <div className="container-custom relative">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={`${stat.label}-${i}`}
              initial={{ opacity: 0, y: 40, scale: 0.9 }}
              animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ delay: i * 0.15, duration: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
              className="text-center group"
            >
              <motion.div whileHover={{ scale: 1.1 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
                <p className="font-heading text-4xl md:text-5xl font-bold gradient-text mb-2">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </p>
                <motion.div
                  className="h-0.5 w-8 bg-primary/40 mx-auto mb-3"
                  initial={{ scaleX: 0 }}
                  animate={inView ? { scaleX: 1 } : {}}
                  transition={{ delay: 0.5 + i * 0.15, duration: 0.4 }}
                />
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;

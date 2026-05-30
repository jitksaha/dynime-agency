import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Code, Megaphone, Building2, ShoppingBag, Palette, BarChart3, Cpu,
  Globe, Smartphone, Zap, Star, Heart, Rocket, Database, Cloud, Shield,
  type LucideIcon,
} from "lucide-react";
import { useHomeSections } from "@/hooks/use-home-sections";

const ICON_MAP: Record<string, LucideIcon> = {
  Code, Megaphone, Building2, ShoppingBag, Palette, BarChart3, Cpu,
  Globe, Smartphone, Zap, Star, Heart, Rocket, Database, Cloud, Shield,
};

const ServicesGrid = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const { data: sections } = useHomeSections();
  const s = sections!.services;

  return (
    <section ref={ref} className="section-padding bg-card/30">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
          animate={inView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-10"
        >
          <span className="text-primary text-sm font-semibold uppercase tracking-wider">{s.eyebrow}</span>
          <h2 className="font-heading text-3xl md:text-4xl font-bold mt-3 mb-4">{s.heading}</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">{s.description}</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {s.items.map((svc, i) => {
            const Icon = ICON_MAP[svc.icon] || Code;
            return (
              <motion.div
                key={`${svc.title}-${i}`}
                initial={{ opacity: 0, y: 50, filter: "blur(6px)" }}
                animate={inView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
                transition={{ delay: i * 0.1, duration: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
                className="h-full"
              >
                <motion.div
                  whileHover={{ y: -8, boxShadow: "0 0 50px -10px hsl(240 100% 60% / 0.25)", borderColor: "hsl(240 100% 60% / 0.3)" }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  className="h-full hover-lift-safe"
                >
                  <Link to={svc.to} className="glass-card flex flex-col p-8 h-full group border border-border/50 rounded-xl">
                    <motion.div whileHover={{ rotate: -10, scale: 1.15 }} transition={{ type: "spring", stiffness: 300 }}>
                      <Icon className="w-10 h-10 text-primary mb-5" />
                    </motion.div>
                    <h3 className="font-heading font-semibold text-lg text-foreground mb-2 group-hover:text-primary transition-colors">
                      {svc.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{svc.desc}</p>
                  </Link>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ServicesGrid;

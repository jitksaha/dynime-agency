import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import founderPortrait from "@/assets/founder-portrait.webp";
import { useHomeSections } from "@/hooks/use-home-sections";

const FounderSection = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const { data: sections } = useHomeSections();
  const f = sections!.founder;

  return (
    <section ref={ref} className="section-padding bg-card/30 relative overflow-hidden">
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-primary/5 blur-[100px] pointer-events-none"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="container-custom relative">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-10 items-center">
            <motion.div
              className="flex justify-center"
              initial={{ opacity: 0, scale: 0.8, y: 30 }}
              animate={inView ? { opacity: 1, scale: 1, y: 0 } : {}}
              transition={{ delay: 0.2, duration: 0.7, type: "spring", stiffness: 120 }}
            >
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl scale-110" />
                <motion.img
                  src={founderPortrait}
                  alt={`${f.name} - ${f.role}`}
                  width={200}
                  height={200}
                  loading="lazy"
                  className="relative rounded-2xl w-48 h-48 object-cover object-top"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                />
                <motion.div
                  className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full shadow-lg"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={inView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ delay: 0.6, type: "spring", stiffness: 300 }}
                >
                  {f.badge}
                </motion.div>
              </div>
            </motion.div>

            <div className="text-center md:text-left">
              <motion.h3
                className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-4"
                initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
                animate={inView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
                transition={{ duration: 0.7 }}
              >
                {f.headline}
              </motion.h3>

              <motion.div
                className="mb-4"
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                <p className="font-heading font-semibold text-foreground">{f.name}</p>
                <p className="text-sm text-primary">{f.role}</p>
                <p className="text-xs text-muted-foreground">{f.company}</p>
              </motion.div>

              <motion.p
                className="text-muted-foreground text-sm mb-6 leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                {f.bio}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.5, duration: 0.5 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                className="inline-block"
              >
                <Button variant="hero" asChild>
                  <Link to={f.cta_href}>{f.cta_label}</Link>
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FounderSection;

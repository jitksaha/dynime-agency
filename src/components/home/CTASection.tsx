import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import ctaVisual from "@/assets/cta-visual.webp";

const CTASection = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="section-padding relative overflow-hidden">
      {/* Animated orbs */}
      <motion.div
        className="absolute top-0 left-1/3 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none"
        animate={{ x: [0, 50, 0], y: [0, -30, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-0 right-1/3 w-[400px] h-[400px] rounded-full bg-accent/5 blur-[100px] pointer-events-none"
        animate={{ x: [0, -40, 0], y: [0, 20, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="container-custom relative">
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.95, filter: "blur(10px)" }}
          animate={inView ? { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" } : {}}
          transition={{ duration: 0.8, ease: [0.25, 0.4, 0.25, 1] }}
        >
          <div className="glass-card p-12 md:p-20 gradient-border relative overflow-hidden">
            {/* Shimmer effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent pointer-events-none"
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 4, ease: "easeInOut" }}
            />

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 items-center">
              <div className="text-center lg:text-left relative">
                <motion.h2
                  className="font-heading text-3xl md:text-5xl font-bold mb-6 text-balance"
                  initial={{ opacity: 0, y: 30 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.2, duration: 0.7 }}
                >
                  Ready to Build Something{" "}
                  <span className="gradient-text">Extraordinary</span>?
                </motion.h2>
                <motion.p
                  className="text-muted-foreground text-lg max-w-xl mb-10"
                  initial={{ opacity: 0, y: 20 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.4, duration: 0.6 }}
                >
                  Let's discuss your project and create a digital solution that drives real business results.
                </motion.p>
                <motion.div
                  className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.5, duration: 0.6 }}
                >
                  <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.97 }}>
                    <Button variant="hero" size="lg" asChild>
                      <Link to="/contact">
                        Get Started Today <ArrowRight className="w-4 h-4 ml-1" />
                      </Link>
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.97 }}>
                    <Button variant="glass" size="lg" asChild>
                      <Link to="/portfolio">See Case Studies</Link>
                    </Button>
                  </motion.div>
                </motion.div>
              </div>

              {/* CTA Visual */}
              <motion.div
                className="hidden lg:block"
                initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
                animate={inView ? { opacity: 1, scale: 1, rotate: 0 } : {}}
                transition={{ delay: 0.4, duration: 0.8, type: "spring", stiffness: 100 }}
              >
                <motion.img
                  src={ctaVisual}
                  alt="Digital growth and innovation"
                  width={200}
                  height={250}
                  loading="lazy"
                  className="drop-shadow-2xl"
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                />
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Search, PenTool, Code, Rocket } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Discovery",
    desc: "Deep dive into your goals, audience, and competitive landscape.",
    accent: "from-primary/30 to-primary/0",
  },
  {
    icon: PenTool,
    title: "Strategy & Design",
    desc: "Wireframes, prototypes, and a visual identity that resonates.",
    accent: "from-primary/30 to-primary/0",
  },
  {
    icon: Code,
    title: "Development",
    desc: "Clean, scalable code using modern frameworks and best practices.",
    accent: "from-primary/30 to-primary/0",
  },
  {
    icon: Rocket,
    title: "Launch & Growth",
    desc: "Deploy, monitor, and continuously optimize for peak performance.",
    accent: "from-primary/30 to-primary/0",
  },
];

const ProcessTimeline = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-10 md:py-10">
      <div className="container-custom">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 md:mb-12"
        >
          <span className="inline-flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-[0.2em]">
            <span className="h-px w-6 bg-primary/60" />
            Our Process
            <span className="h-px w-6 bg-primary/60" />
          </span>
          <h2 className="font-heading text-3xl md:text-4xl font-bold mt-3">
            How We Bring Ideas to Life
          </h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Four focused phases — engineered to ship fast without cutting corners.
          </p>
        </motion.div>

        {/* Stepper rail */}
        <div className="relative">
          {/* Horizontal rail (desktop) */}
          <div className="hidden md:block absolute left-0 right-0 top-7 h-px overflow-hidden">
            <div className="absolute inset-0 bg-border" />
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-primary to-primary/40"
              initial={{ scaleX: 0, transformOrigin: "left" }}
              animate={inView ? { scaleX: 1 } : {}}
              transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
              style={{ width: "100%" }}
            />
          </div>

          {/* Vertical rail (mobile) */}
          <div className="md:hidden absolute left-7 top-0 bottom-0 w-px overflow-hidden">
            <div className="absolute inset-0 bg-border" />
            <motion.div
              className="absolute inset-x-0 top-0 bg-gradient-to-b from-primary via-primary to-primary/40"
              initial={{ scaleY: 0, transformOrigin: "top" }}
              animate={inView ? { scaleY: 1 } : {}}
              transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
              style={{ height: "100%" }}
            />
          </div>

          {/* Steps grid */}
          <ol className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-5">
            {steps.map((step, i) => (
              <motion.li
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.25 + i * 0.12, duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
                className="relative pl-20 md:pl-0 md:flex md:flex-col"
              >
                {/* Node */}
                <div className="absolute md:relative left-0 md:left-auto top-0 md:top-auto md:mx-auto md:mb-4 z-10">
                  <motion.div
                    className="relative w-14 h-14 rounded-2xl bg-background border border-border flex items-center justify-center shadow-sm"
                    whileHover={{ scale: 1.05, borderColor: "hsl(var(--primary) / 0.5)" }}
                    transition={{ type: "spring", stiffness: 320, damping: 18 }}
                  >
                    {/* Pulse ring */}
                    <motion.span
                      className="absolute inset-0 rounded-2xl border border-primary/40"
                      animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.6 }}
                    />
                    <step.icon className="w-6 h-6 text-primary" />
                    {/* Step number badge */}
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow">
                      {i + 1}
                    </span>
                  </motion.div>
                </div>

                {/* Card */}
                <motion.div
                  className="group relative md:text-center rounded-xl border border-border bg-card/60 backdrop-blur-sm p-4 md:p-5 overflow-hidden md:flex-1 md:flex md:flex-col"
                  whileHover={{ y: -4, borderColor: "hsl(var(--primary) / 0.4)" }}
                  transition={{ type: "spring", stiffness: 300, damping: 22 }}
                >
                  {/* Accent glow on hover */}
                  <div
                    className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${step.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                  />
                  <div className="relative">
                    <span className="text-[10px] text-primary font-semibold uppercase tracking-[0.18em]">
                      Step {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className="font-heading font-semibold text-base md:text-lg text-foreground mt-1">
                      {step.title}
                    </h3>
                    <p className="text-xs md:text-[13px] leading-relaxed text-muted-foreground mt-1.5">
                      {step.desc}
                    </p>
                  </div>
                </motion.div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
};

export default ProcessTimeline;

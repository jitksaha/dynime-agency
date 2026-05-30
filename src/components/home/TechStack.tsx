import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const technologies = [
  { name: "WordPress", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/wordpress.svg" },
  { name: "WooCommerce", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/woocommerce.svg" },
  { name: "Shopify", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/shopify.svg" },
  { name: "React", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/react.svg" },
  { name: "Laravel", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/laravel.svg" },
  { name: "PHP", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/php.svg" },
  { name: "Node.js", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/nodedotjs.svg" },
  { name: "Python", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/python.svg" },
  { name: "Google Ads", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/googleads.svg" },
  { name: "Meta", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/meta.svg" },
  { name: "Figma", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/figma.svg" },
  { name: "AWS", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/amazonaws.svg" },
];

const TechStack = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section ref={ref} className="section-padding bg-card/30">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-12"
        >
          <h3 className="font-heading text-2xl md:text-3xl font-bold text-foreground">
            Technologies & Platforms We Use
          </h3>
        </motion.div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
          {technologies.map((tech, i) => (
            <motion.div
              key={tech.name}
              initial={{ opacity: 0, scale: 0.8, y: 30 }}
              animate={inView ? { opacity: 1, scale: 1, y: 0 } : {}}
              transition={{
                delay: i * 0.06,
                duration: 0.5,
                type: "spring",
                stiffness: 200,
              }}
              whileHover={{
                scale: 1.08,
                y: -4,
                boxShadow: "0 0 30px -8px hsl(240 100% 60% / 0.2)",
                borderColor: "hsl(240 100% 60% / 0.3)",
              }}
              className="glass-card p-5 flex flex-col items-center gap-3 cursor-default"
            >
              <img
                src={tech.logo}
                alt={tech.name}
                className="w-8 h-8 dark:invert dark:brightness-200 opacity-70"
                loading="lazy"
              />
              <p className="font-heading font-semibold text-xs text-foreground">{tech.name}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TechStack;

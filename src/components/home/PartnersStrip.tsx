import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const partners = [
  { name: "Google", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/google.svg" },
  { name: "Meta", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/meta.svg" },
  { name: "WordPress", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/wordpress.svg" },
  { name: "Shopify", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/shopify.svg" },
  { name: "Stripe", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/stripe.svg" },
  { name: "PayPal", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/paypal.svg" },
  { name: "Envato", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/envato.svg" },
  { name: "Semrush", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/semrush.svg" },
  { name: "WooCommerce", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/woocommerce.svg" },
  { name: "Upwork", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/upwork.svg" },
  { name: "Hostinger", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/hostinger.svg" },
  { name: "Cloudflare", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/cloudflare.svg" },
  { name: "Elementor", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/elementor.svg" },
  { name: "Payoneer", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/payoneer.svg" },
  { name: "Namecheap", logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/namecheap.svg" },
  { name: "Bluehost", logo: "https://www.google.com/s2/favicons?domain=bluehost.com&sz=64" },
];

const PartnerPill = ({ p, size = "md" }: { p: { name: string; logo: string }; size?: "md" | "sm" }) => (
  <motion.div
    whileHover={{ y: -3, scale: 1.04 }}
    transition={{ type: "spring", stiffness: 300, damping: 20 }}
    className="group relative flex items-center gap-2.5 whitespace-nowrap select-none rounded-full border border-border/40 bg-background/60 backdrop-blur-sm px-4 py-2 shadow-sm hover:shadow-md hover:border-primary/40 hover:bg-background transition-all"
  >
    <span className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity" />
    <img
      src={p.logo}
      alt={p.name}
      className={`${size === "sm" ? "w-4 h-4" : "w-5 h-5"} dark:invert dark:brightness-200 opacity-70 group-hover:opacity-100 transition-opacity relative`}
      loading="lazy"
    />
    <span
      className={`${
        size === "sm" ? "text-xs" : "text-sm"
      } relative font-heading font-semibold text-foreground/70 group-hover:text-foreground transition-colors`}
    >
      {p.name}
    </span>
  </motion.div>
);

const PartnersStrip = () => {
  return (
    <section className="relative py-12 overflow-hidden bg-gradient-to-b from-background via-card/30 to-background border-y border-border/30">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-24 left-1/4 w-72 h-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-1/4 w-72 h-72 rounded-full bg-accent/10 blur-3xl" />

      <div className="container-custom relative mb-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 mb-4"
        >
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold tracking-wide uppercase text-primary">Trusted Ecosystem</span>
        </motion.div>
        <motion.h3
          className="font-heading text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Featured Partners
        </motion.h3>
        <motion.p
          className="mt-3 text-sm md:text-base text-muted-foreground max-w-xl mx-auto"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          We collaborate with industry leaders to deliver world-class solutions.
        </motion.p>
      </div>

      {/* Row 1 — left to right */}
      <div className="relative mb-5">
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10" />
        <motion.div
          className="flex items-center gap-5"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
          style={{ width: "max-content" }}
        >
          {[...partners, ...partners].map((p, i) => (
            <PartnerPill key={`a-${i}`} p={p} />
          ))}
        </motion.div>
      </div>

      {/* Row 2 — right to left */}
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10" />
        <motion.div
          className="flex items-center gap-5"
          animate={{ x: ["-50%", "0%"] }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          style={{ width: "max-content" }}
        >
          {[...partners.slice().reverse(), ...partners.slice().reverse()].map((p, i) => (
            <PartnerPill key={`b-${i}`} p={p} size="sm" />
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default PartnersStrip;

import { motion } from "framer-motion";
import { Star } from "lucide-react";

const items = [
  "LET'S WORK",
  "TOGETHER",
  "LET'S BUILD",
  "SOMETHING",
  "GREAT",
];

const MarqueeContent = () => (
  <>
    {items.map((text, i) => (
      <span key={i} className="flex items-center gap-6 md:gap-10 shrink-0">
        <span className="font-heading text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black uppercase tracking-tight whitespace-nowrap text-foreground">
          {text}
        </span>
        <Star className="w-6 h-6 md:w-8 md:h-8 text-primary fill-primary shrink-0" />
      </span>
    ))}
  </>
);

const MarqueeStrip = () => {
  return (
    <section className="py-6 md:py-10 overflow-hidden border-y border-border/30 bg-secondary/20">
      <div className="relative flex">
        <motion.div
          className="flex items-center gap-6 md:gap-10"
          animate={{ x: ["0%", "-50%"] }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: 20,
              ease: "linear",
            },
          }}
        >
          <MarqueeContent />
          <MarqueeContent />
        </motion.div>
      </div>
    </section>
  );
};

export default MarqueeStrip;

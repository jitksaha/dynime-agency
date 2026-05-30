import { motion, useScroll, useTransform, MotionValue } from "framer-motion";
import { useRef } from "react";

const words = [
  { text: "We", bold: true },
  { text: "are", bold: true },
  { text: "a", bold: true },
  { text: "full-service", bold: true },
  { text: "digital", bold: true },
  { text: "agency", bold: true },
  { text: "specializing", bold: true },
  { text: "in", bold: false },
  { text: "web", bold: false },
  { text: "development,", bold: false },
  { text: "UI/UX,", bold: false },
  { text: "and", bold: false },
  { text: "digital", bold: false },
  { text: "marketing", bold: false },
  { text: "for", bold: false },
  { text: "ambitious", bold: false },
  { text: "businesses.", bold: false },
];

const Word = ({
  text,
  bold,
  progress,
  range,
}: {
  text: string;
  bold: boolean;
  progress: MotionValue<number>;
  range: [number, number];
}) => {
  const opacity = useTransform(progress, range, [0.15, 1]);

  return (
    <motion.span
      style={{ opacity }}
      className={`inline-block mr-[0.3em] ${bold ? "font-bold text-foreground" : "font-normal text-muted-foreground"}`}
    >
      {text}
    </motion.span>
  );
};

const ScrollTextReveal = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 0.8", "end 0.4"],
  });

  return (
    <section ref={containerRef} className="section-padding">
      <div className="container-custom">
        <p className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl leading-[1.15] tracking-tight max-w-5xl">
          {words.map((word, i) => {
            const start = i / words.length;
            const end = (i + 1) / words.length;
            return (
              <Word
                key={i}
                text={word.text}
                bold={word.bold}
                progress={scrollYProgress}
                range={[start, end]}
              />
            );
          })}
        </p>
      </div>
    </section>
  );
};

export default ScrollTextReveal;

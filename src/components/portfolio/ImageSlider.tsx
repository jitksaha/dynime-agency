import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

interface SliderProject {
  id: string;
  title: string;
  description?: string | null;
  thumbnail_url?: string | null;
  project_url?: string | null;
  technologies?: string[] | null;
  alt_text?: string | null;
  category?: string;
}

interface ImageSliderProps {
  projects: SliderProject[];
}

const ImageSlider = ({ projects }: ImageSliderProps) => {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % projects.length);
  }, [projects.length]);

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + projects.length) % projects.length);
  }, [projects.length]);

  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next]);

  if (!projects.length) {
    return null;
  }

  const project = projects[current];

  return (
    <div className="relative max-w-5xl mx-auto">
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-card">
        <AnimatePresence mode="wait">
          <motion.div
            key={project.id}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col md:flex-row"
          >
            {/* Image */}
            <div className="relative w-full md:w-3/5 h-64 md:h-[400px] bg-gradient-to-br from-secondary/80 via-secondary/40 to-primary/10">
              {project.thumbnail_url ? (
                <img
                  src={project.thumbnail_url}
                  alt={project.alt_text || `${project.title}${project.category ? ` — ${project.category}` : ""} project`}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="absolute inset-0 opacity-[0.04]" style={{
                    backgroundImage: `radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)`,
                    backgroundSize: '24px 24px'
                  }} />
                  <span className="text-9xl font-heading font-black text-primary/10 select-none">
                    {project.title.charAt(0)}
                  </span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 p-6 md:p-8 flex flex-col justify-center">
              <h3 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-3">
                {project.title}
              </h3>
              {project.description && (
                <p className="text-muted-foreground leading-relaxed mb-6">
                  {project.description}
                </p>
              )}
              {project.technologies && project.technologies.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {project.technologies.map((tech) => (
                    <span key={tech} className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                      {tech}
                    </span>
                  ))}
                </div>
              )}
              {project.project_url && (
                <a
                  href={project.project_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors w-fit shadow-lg shadow-primary/30"
                >
                  <ExternalLink className="w-4 h-4" />
                  Visit Site
                </a>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      {projects.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Previous slide"
            className="group absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white text-neutral-900 ring-1 ring-black/5 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.18),0_2px_6px_-1px_rgba(0,0,0,0.08)] flex items-center justify-center transition-all duration-200 hover:scale-105 hover:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.22),0_4px_10px_-2px_rgba(0,0,0,0.1)] active:scale-95"
          >
            <ChevronLeft className="w-5 h-5 -ml-0.5 transition-transform group-hover:-translate-x-0.5" strokeWidth={2.5} />
          </button>
          <button
            onClick={next}
            aria-label="Next slide"
            className="group absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white text-neutral-900 ring-1 ring-black/5 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.18),0_2px_6px_-1px_rgba(0,0,0,0.08)] flex items-center justify-center transition-all duration-200 hover:scale-105 hover:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.22),0_4px_10px_-2px_rgba(0,0,0,0.1)] active:scale-95"
          >
            <ChevronRight className="w-5 h-5 -mr-0.5 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
          </button>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-6">
            {projects.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  i === current
                    ? "bg-primary w-8"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ImageSlider;

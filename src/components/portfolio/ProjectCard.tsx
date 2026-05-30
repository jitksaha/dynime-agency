import { forwardRef, useState } from "react";
import { Eye, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";

const techColors: Record<string, string> = {
  WordPress: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  WooCommerce: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  Laravel: "bg-red-500/10 text-red-400 border-red-500/20",
  React: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  Shopify: "bg-green-500/10 text-green-400 border-green-500/20",
};

const placeholderPalettes = [
  { bg: "from-violet-600 via-purple-500 to-indigo-600", accent: "rgba(255,255,255,0.08)" },
  { bg: "from-emerald-600 via-teal-500 to-cyan-600", accent: "rgba(255,255,255,0.08)" },
  { bg: "from-orange-500 via-rose-500 to-pink-600", accent: "rgba(255,255,255,0.08)" },
  { bg: "from-blue-600 via-sky-500 to-cyan-500", accent: "rgba(255,255,255,0.08)" },
  { bg: "from-fuchsia-600 via-pink-500 to-rose-500", accent: "rgba(255,255,255,0.08)" },
  { bg: "from-amber-500 via-orange-500 to-red-500", accent: "rgba(255,255,255,0.08)" },
];

const hashString = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

const PlaceholderThumbnail = ({ title }: { title: string }) => {
  const idx = hashString(title) % placeholderPalettes.length;
  const palette = placeholderPalettes[idx];
  const initials = title
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className={`w-full h-full bg-gradient-to-br ${palette.bg} flex flex-col items-center justify-center relative overflow-hidden`}>
      {/* Decorative grid */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `linear-gradient(${palette.accent} 1px, transparent 1px), linear-gradient(90deg, ${palette.accent} 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
      />
      {/* Decorative circles */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/[0.07]" />
      <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/[0.05]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-white/[0.03]" />

      {/* Initials */}
      <span className="relative text-5xl font-heading font-black text-white/90 tracking-wider select-none drop-shadow-lg">
        {initials}
      </span>
      {/* Project name */}
      <span className="relative mt-2 px-4 text-[11px] font-medium text-white/60 tracking-widest uppercase text-center leading-tight max-w-[90%] break-words">
        {title}
      </span>
    </div>
  );
};

const getTechColor = (tech: string) => {
  for (const key of Object.keys(techColors)) {
    if (tech.toLowerCase().includes(key.toLowerCase())) return techColors[key];
  }
  return "bg-primary/10 text-primary border-primary/20";
};

interface ProjectCardProps {
  project: {
    id: string;
    title: string;
    description?: string | null;
    category: string;
    client_name?: string | null;
    thumbnail_url?: string | null;
    project_url?: string | null;
    technologies?: string[] | null;
    is_featured?: boolean;
    alt_text?: string | null;
  };
}

const ProjectCard = forwardRef<HTMLDivElement, ProjectCardProps>(({ project }, ref) => {
  const technologies = project.technologies || [];

  // Ignore auto-screenshot URLs (thum.io, screenshotmachine, etc.) — they are
  // unreliable and frequently return "Image not authorized" placeholders.
  // We always render a branded, deterministic placeholder for those.
  const rawSrc = project.thumbnail_url || "";
  const isAutoScreenshot = /thum\.io|screenshotmachine|microlink|s\.wordpress\.com\/mshots|api\.urlbox/i.test(rawSrc);
  const baseSrc = isAutoScreenshot ? "" : rawSrc;

  const [imgFailed, setImgFailed] = useState(false);

  return (
    <motion.div
      ref={ref}
      whileHover={{ y: -8 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="group relative rounded-3xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden h-full flex flex-col shadow-sm hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/40 transition-all duration-500"
    >
      {/* Glow border on hover */}
      <div className="absolute -inset-px rounded-3xl bg-gradient-to-br from-primary/30 via-transparent to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none -z-10 blur-md" />

      {/* Thumbnail with rounded inset */}
      <div className="relative m-3 mb-0 rounded-2xl overflow-hidden aspect-[16/10] bg-gradient-to-br from-secondary/80 via-secondary/40 to-primary/10">
        {baseSrc && !imgFailed ? (
          <img
            src={baseSrc}
            alt={project.alt_text || `${project.title} — ${project.category} project thumbnail`}
            loading="lazy"
            decoding="async"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1200ms] ease-out"
          />
        ) : (
          <PlaceholderThumbnail title={project.title} />
        )}


        {/* Category chip - top left */}
        <div className="absolute top-3 left-3">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-background/80 backdrop-blur-md border border-border/60 text-foreground shadow-sm">
            {project.category}
          </span>
        </div>

        {project.is_featured && (
          <div className="absolute top-3 right-3">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30">
              ★ Featured
            </span>
          </div>
        )}

        {/* Hover overlay with CTA */}
        {project.project_url && (
          <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-end justify-center pb-5">
            <a
              href={project.project_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-xl shadow-primary/40"
            >
              <Eye className="w-4 h-4" />
              Visit Site
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>

      <div className="relative p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-heading font-bold text-foreground group-hover:text-primary transition-colors duration-300 text-lg leading-tight line-clamp-2">
            {project.title}
          </h3>
          {project.project_url && (
            <a
              href={project.project_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Visit ${project.title}`}
              className="shrink-0 mt-0.5 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white hover:bg-primary/90 transition-all"
            >
              <ArrowUpRight className="w-4 h-4" />
            </a>
          )}
        </div>

        {project.client_name && (
          <div className="flex items-center gap-1.5 mb-2 text-xs">
            <span className="text-muted-foreground">Client:</span>
            <span className="font-semibold text-foreground/90 truncate">{project.client_name}</span>
            <span className="ml-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-medium">
              ✓ Verified
            </span>
          </div>
        )}

        {project.description && (
          <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1 line-clamp-3">
            {project.description}
          </p>
        )}

        {technologies.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-auto pt-3 border-t border-border/40">
            {technologies.slice(0, 4).map((tech: string) => (
              <span
                key={tech}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium border ${getTechColor(tech)}`}
              >
                {tech}
              </span>
            ))}
            {technologies.length > 4 && (
              <span className="px-2 py-0.5 rounded-md text-[11px] text-muted-foreground">
                +{technologies.length - 4}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
});

ProjectCard.displayName = "ProjectCard";

export default ProjectCard;

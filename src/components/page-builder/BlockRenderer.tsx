import DOMPurify from "isomorphic-dompurify";
import { Block } from "./types";
import { cn } from "@/lib/utils";

interface BlockRendererProps {
  block: Block;
  isPreview?: boolean;
}

const BlockRenderer = ({ block, isPreview }: BlockRendererProps) => {
  const { type, props } = block;

  switch (type) {
    case "heading": {
      const Tag = (props.level || "h2") as keyof JSX.IntrinsicElements;
      const sizeMap: Record<string, string> = {
        h1: "text-4xl md:text-5xl font-bold",
        h2: "text-3xl md:text-4xl font-bold",
        h3: "text-2xl md:text-3xl font-semibold",
        h4: "text-xl md:text-2xl font-semibold",
        h5: "text-lg md:text-xl font-medium",
        h6: "text-base md:text-lg font-medium",
      };
      return (
        <Tag
          className={cn(sizeMap[props.level || "h2"], "text-foreground")}
          style={{ textAlign: props.align, color: props.color || undefined }}
        >
          {props.text}
        </Tag>
      );
    }

    case "paragraph":
      return (
        <p
          className="text-muted-foreground leading-relaxed"
          style={{ textAlign: props.align, color: props.color || undefined }}
        >
          {props.text}
        </p>
      );

    case "image":
      return props.src ? (
        <img
          src={props.src}
          alt={props.alt || ""}
          className="max-w-full"
          style={{
            width: props.width || "100%",
            borderRadius: props.borderRadius || "0.5rem",
            objectFit: props.objectFit || "cover",
          }}
        />
      ) : (
        <div className="w-full h-48 bg-secondary/50 rounded-lg flex items-center justify-center text-muted-foreground border border-dashed border-border">
          No image selected
        </div>
      );

    case "video": {
      if (!props.url) {
        return (
          <div className="w-full h-48 bg-secondary/50 rounded-lg flex items-center justify-center text-muted-foreground border border-dashed border-border">
            No video URL
          </div>
        );
      }
      const embedUrl = props.url.includes("youtube.com/watch")
        ? props.url.replace("watch?v=", "embed/")
        : props.url.includes("youtu.be")
        ? `https://www.youtube.com/embed/${props.url.split("/").pop()}`
        : props.url;
      return (
        <div className="w-full" style={{ aspectRatio: props.aspectRatio || "16/9" }}>
          <iframe
            src={embedUrl}
            className="w-full h-full rounded-lg"
            allowFullScreen
            title="Video"
          />
        </div>
      );
    }

    case "button":
      return (
        <div style={{ textAlign: props.align || "left" }}>
          <a
            href={isPreview ? undefined : props.url}
            className={cn(
              "inline-block rounded-lg font-medium transition-colors cursor-pointer",
              props.size === "sm" ? "px-4 py-2 text-sm" : props.size === "lg" ? "px-8 py-4 text-lg" : "px-6 py-3",
              props.variant === "primary"
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : props.variant === "outline"
                ? "border-2 border-primary text-primary hover:bg-primary/10"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            {props.text}
          </a>
        </div>
      );

    case "spacer":
      return <div style={{ height: props.height || 40 }} />;

    case "divider":
      return (
        <hr
          className="border-border"
          style={{
            width: props.width || "100%",
            borderStyle: props.style || "solid",
            borderColor: props.color === "primary" ? "hsl(var(--primary))" : undefined,
          }}
        />
      );

    case "cta":
      return (
        <div
          className={cn(
            "rounded-2xl p-8 md:p-12",
            props.bgColor === "primary"
              ? "bg-primary/10 border border-primary/20"
              : "bg-secondary border border-border"
          )}
          style={{ textAlign: props.align || "center" }}
        >
          <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">{props.heading}</h3>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">{props.subtext}</p>
          <a
            href={isPreview ? undefined : props.buttonUrl}
            className="inline-block bg-primary text-primary-foreground px-8 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors cursor-pointer"
          >
            {props.buttonText}
          </a>
        </div>
      );

    case "hero":
      return (
        <div
          className="relative rounded-2xl overflow-hidden min-h-[300px] flex items-center justify-center p-8 md:p-16"
          style={{
            backgroundImage: props.bgImage ? `url(${props.bgImage})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            textAlign: props.align || "center",
          }}
        >
          {props.overlay && <div className="absolute inset-0 bg-background/70" />}
          {!props.bgImage && <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary" />}
          <div className="relative z-10 max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">{props.heading}</h1>
            <p className="text-lg text-muted-foreground mb-8">{props.subtext}</p>
            <a
              href={isPreview ? undefined : props.buttonUrl}
              className="inline-block bg-primary text-primary-foreground px-8 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors cursor-pointer"
            >
              {props.buttonText}
            </a>
          </div>
        </div>
      );

    case "list":
      return (
        <ul
          className={cn(
            "space-y-2 text-muted-foreground",
            props.style === "number" ? "list-decimal" : "list-disc",
            "pl-6"
          )}
          style={{ color: props.color || undefined }}
        >
          {(props.items || []).map((item: string, i: number) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );

    case "quote":
      return (
        <blockquote
          className="border-l-4 border-primary pl-6 py-2"
          style={{ color: props.color || undefined }}
        >
          <p className="text-lg text-foreground italic">"{props.text}"</p>
          {props.author && (
            <footer className="mt-2 text-sm text-muted-foreground">— {props.author}</footer>
          )}
        </blockquote>
      );

    case "features":
      return (
        <div>
          {props.heading && (
            <h3 className="text-2xl font-bold text-foreground text-center mb-8">{props.heading}</h3>
          )}
          <div
            className="grid gap-6"
            style={{ gridTemplateColumns: `repeat(${props.columns || 3}, 1fr)` }}
          >
            {(props.items || []).map((item: any, i: number) => (
              <div key={i} className="p-6 rounded-xl bg-card border border-border">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4 text-lg font-bold">
                  {i + 1}
                </div>
                <h4 className="text-lg font-semibold text-foreground mb-2">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      );

    case "testimonial":
      return (
        <div className="p-8 rounded-2xl bg-card border border-border text-center max-w-xl mx-auto">
          {props.avatar && (
            <img
              src={props.avatar}
              alt={props.author}
              className="w-16 h-16 rounded-full mx-auto mb-4 object-cover"
            />
          )}
          <p className="text-lg text-foreground italic mb-4">"{props.quote}"</p>
          <div className="text-sm font-medium text-foreground">{props.author}</div>
          {props.role && <div className="text-xs text-muted-foreground">{props.role}</div>}
        </div>
      );

    case "html":
      return (
        <div
          className="prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(props.code || "") }}
        />
      );

    case "columns": {
      const cols = props.content || [[], []];
      return (
        <div
          className="grid gap-6"
          style={{ gridTemplateColumns: `repeat(${props.columns || 2}, 1fr)` }}
        >
          {cols.map((colBlocks: Block[], i: number) => (
            <div key={i} className="space-y-4">
              {colBlocks.map((b: Block) => (
                <BlockRenderer key={b.id} block={b} isPreview={isPreview} />
              ))}
              {colBlocks.length === 0 && (
                <div className="min-h-[60px] border border-dashed border-border rounded-lg flex items-center justify-center text-xs text-muted-foreground">
                  Empty column
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }

    default:
      return <div className="p-4 bg-destructive/10 text-destructive rounded">Unknown block: {type}</div>;
  }
};

export default BlockRenderer;

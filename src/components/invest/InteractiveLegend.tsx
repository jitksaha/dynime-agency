import { cn } from "@/lib/utils";

export type LegendItem = {
  label: string;
  value?: string;
  sub?: string;
};

interface InteractiveLegendProps {
  items: LegendItem[];
  colors: string[];
  activeIndex: number | null;
  onToggle: (i: number) => void;
  /** Layout density. "compact" = pill chips, "list" = stacked rows */
  variant?: "compact" | "list";
  className?: string;
}

/**
 * Responsive legend that wraps to multiple rows on mobile and lets users
 * click an entry to highlight that slice/bar in the parent chart.
 */
const InteractiveLegend = ({
  items,
  colors,
  activeIndex,
  onToggle,
  variant = "list",
  className,
}: InteractiveLegendProps) => {
  if (variant === "compact") {
    return (
      <div
        role="listbox"
        aria-label="Chart legend"
        className={cn(
          "flex flex-wrap gap-1.5 justify-center",
          className,
        )}
      >
        {items.map((it, i) => {
          const isActive = activeIndex === i;
          const dim = activeIndex !== null && !isActive;
          return (
            <button
              key={i}
              type="button"
              role="option"
              aria-selected={isActive}
              onClick={() => onToggle(i)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-all",
                "hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive ? "border-primary bg-primary/10" : "bg-card",
                dim && "opacity-40",
              )}
            >
              <span
                className="h-2 w-2 rounded-sm shrink-0"
                style={{ background: colors[i % colors.length] }}
              />
              <span className="truncate max-w-[10rem]">{it.label}</span>
              {it.value && (
                <span className="tabular-nums font-semibold">{it.value}</span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <ul
      role="listbox"
      aria-label="Chart legend"
      className={cn("grid gap-1.5 text-sm", className)}
    >
      {items.map((it, i) => {
        const isActive = activeIndex === i;
        const dim = activeIndex !== null && !isActive;
        return (
          <li key={i}>
            <button
              type="button"
              role="option"
              aria-selected={isActive}
              onClick={() => onToggle(i)}
              className={cn(
                "w-full flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left transition-all",
                "hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive ? "border-primary bg-primary/10" : "border-transparent bg-muted/30",
                dim && "opacity-40",
              )}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span
                  className="h-2.5 w-2.5 rounded-sm shrink-0"
                  style={{ background: colors[i % colors.length] }}
                />
                <span className="truncate">{it.label}</span>
              </span>
              {it.value && (
                <span className="font-semibold tabular-nums shrink-0">{it.value}</span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
};

export default InteractiveLegend;

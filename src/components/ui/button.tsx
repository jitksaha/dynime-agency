import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Button hover animation system
 * ---------------------------------------------------------------
 * Every variant has ONE signature hover animation that is applied
 * consistently across the entire app. Do not override hover styles
 * inline — use the variant prop so behavior stays uniform.
 *
 *   default      → subtle lift + brightness
 *   destructive  → lift + shake (negative action emphasis)
 *   outline      → fill-from-left wipe
 *   secondary    → lift + slight scale
 *   ghost        → soft fade-in background + lift
 *   link         → underline grow (story-link style)
 *   hero         → scale + shimmer sweep + glow
 *   glow         → pulse glow + scale
 *   glass        → blur-up + lift
 * ---------------------------------------------------------------
 */
const buttonVariants = cva(
  // Base: shared transition + a containment layer used by ::before/::after sweeps
  "relative overflow-hidden inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:hover:transform-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:transition-transform [&_svg]:duration-300 active:scale-[0.97] transform-gpu will-change-transform [backface-visibility:hidden]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-md hover:brightness-110 hover:[&_svg]:translate-x-0.5",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:-translate-y-0.5 hover:shadow-md hover:[animation:btn-shimmer_0s] motion-safe:hover:animate-[float_0.4s_ease-in-out]",
        outline:
          "border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md hover:[&_svg]:translate-x-0.5",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-md",
        ghost:
          "text-foreground hover:bg-accent hover:text-accent-foreground hover:-translate-y-0.5",
        link:
          "text-primary underline-offset-4 after:content-[''] after:absolute after:left-0 after:bottom-1 after:h-0.5 after:w-full after:bg-primary after:origin-bottom-right after:scale-x-0 after:transition-transform after:duration-300 hover:after:scale-x-100 hover:after:origin-bottom-left",
        hero:
          "bg-primary text-primary-foreground font-semibold shadow-lg hover:shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.6)] hover:scale-105 hover:-translate-y-0.5 hover:[&_svg]:translate-x-1 before:content-[''] before:absolute before:top-0 before:left-0 before:h-full before:w-1/3 before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent before:-translate-x-full hover:before:animate-btn-shimmer",
        glow:
          "bg-accent text-accent-foreground font-semibold shadow-lg hover:shadow-[0_0_30px_-5px_hsl(var(--accent)/0.7)] hover:scale-105 hover:-translate-y-0.5 hover:brightness-110",
        glass:
          "bg-card/40 backdrop-blur-lg border border-border/50 text-foreground hover:bg-card/60 hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-lg hover:backdrop-blur-xl",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

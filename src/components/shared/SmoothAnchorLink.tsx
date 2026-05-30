import { forwardRef, MouseEvent, ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";

interface SmoothAnchorLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string; // e.g. "#pricing" or "/services#pricing"
  children: ReactNode;
}

/**
 * Anchor link that:
 *  - Smoothly scrolls to the target section on the same page
 *  - Updates the URL hash (so links are shareable + back-button works)
 *  - Moves keyboard focus to the destination for screen-reader users
 *  - Announces the navigation via aria-live on the target
 *  - Respects prefers-reduced-motion
 *
 * The visual "section arrive" effect is handled globally by useHashScroll().
 */
const SmoothAnchorLink = forwardRef<HTMLAnchorElement, SmoothAnchorLinkProps>(
  ({ href, children, onClick, ...rest }, ref) => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(e);
      if (e.defaultPrevented) return;
      // Allow modifier-clicks / non-primary buttons to behave normally
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

      const [path, rawHash] = href.split("#");
      const id = rawHash ? decodeURIComponent(rawHash) : "";
      if (!id) return;

      // If the link points to a different route, let the router handle it —
      // the global useHashScroll() picks it up after navigation.
      if (path && path !== location.pathname) {
        e.preventDefault();
        navigate(`${path}#${id}`);
        return;
      }

      const el = document.getElementById(id);
      if (!el) return; // fall through to native anchor behaviour

      e.preventDefault();
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // Update the URL hash without triggering a full navigation
      if (location.hash !== `#${id}`) {
        window.history.pushState(null, "", `${location.pathname}${location.search}#${id}`);
      }

      el.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });

      // Move focus + announce arrival
      const restoreTabindex = !el.hasAttribute("tabindex");
      if (restoreTabindex) el.setAttribute("tabindex", "-1");
      const previousLive = el.getAttribute("aria-live");
      el.setAttribute("aria-live", "polite");

      // Trigger the section-arrive animation (same hook used on hash navigation)
      window.setTimeout(() => {
        el.classList.remove("section-arrive");
        void el.offsetWidth;
        el.classList.add("section-arrive");
        window.setTimeout(() => el.classList.remove("section-arrive"), 1600);

        // Focus after the scroll has visually settled so it doesn't jump
        try {
          (el as HTMLElement).focus({ preventScroll: true });
        } catch {
          (el as HTMLElement).focus();
        }

        // Cleanup the temporary a11y attributes shortly after
        window.setTimeout(() => {
          if (restoreTabindex) el.removeAttribute("tabindex");
          if (previousLive === null) el.removeAttribute("aria-live");
          else el.setAttribute("aria-live", previousLive);
        }, 1800);
      }, prefersReduced ? 0 : 450);
    };

    return (
      <a ref={ref} href={href} onClick={handleClick} {...rest}>
        {children}
      </a>
    );
  }
);

SmoothAnchorLink.displayName = "SmoothAnchorLink";

export default SmoothAnchorLink;

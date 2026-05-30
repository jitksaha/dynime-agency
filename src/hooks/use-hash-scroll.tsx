import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Smoothly scrolls to the hash target on route/hash changes and
 * triggers a brief "section-arrive" animation on the destination.
 */
export const useHashScroll = () => {
  const { hash, pathname } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const id = decodeURIComponent(hash.replace("#", ""));
    if (!id) return;

    let raf = 0;
    let timeout: number | undefined;

    const run = () => {
      const el = document.getElementById(id);
      if (!el) {
        // Retry once content loads
        timeout = window.setTimeout(run, 120);
        return;
      }

      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });

      // Trigger arrive animation after scroll settles
      window.setTimeout(() => {
        el.classList.remove("section-arrive");
        // force reflow so the class can be re-added
        void el.offsetWidth;
        el.classList.add("section-arrive");
        window.setTimeout(() => el.classList.remove("section-arrive"), 1600);
      }, prefersReduced ? 0 : 450);
    };

    raf = window.requestAnimationFrame(run);
    return () => {
      window.cancelAnimationFrame(raf);
      if (timeout) window.clearTimeout(timeout);
    };
  }, [hash, pathname]);
};

export default useHashScroll;

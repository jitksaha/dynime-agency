import { ReactNode, useEffect, useRef } from "react";
import Header from "./Header";
import Footer from "./Footer";
import GoogleTranslate from "@/components/shared/GoogleTranslate";
import HeaderOffsetDebug from "./HeaderOffsetDebug";

/**
 * Global layout. The floating navbar is an overlay, so we measure its real
 * rendered height and expose it to the document as `--header-h`.
 *
 * Every page then receives a single, uniform top offset:
 *   pt = measured header bottom + the same breathing gap used above the bar.
 *
 * Individual pages should NOT add their own top padding to clear the navbar.
 */
const Layout = ({ children, hideFooter = false }: { children: ReactNode; hideFooter?: boolean }) => {
  const headerWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    // Sensible defaults until we measure (avoid layout jump on first paint)
    if (!root.style.getPropertyValue("--header-h")) {
      root.style.setProperty("--header-h", "72px");
    }
    // Breathing = same visual gap as the header's top margin from the viewport.
    // Header uses mt-3/mt-4 (12–16px) when scrolled, mt-4/mt-6 (16–24px) at rest.
    // We mirror that so the space ABOVE the navbar equals the space BELOW it.
    // Solid header sits flush at top — no extra breathing gap needed.
    root.style.setProperty("--header-breathing", "0px");

    const headerEl = headerWrapRef.current?.querySelector("header");
    if (!headerEl) return;

    const measure = () => {
      const rect = headerEl.getBoundingClientRect();
      // Use floor so we never reserve more space than the header actually occupies
      const h = Math.floor(rect.height);
      root.style.setProperty("--header-h", `${h}px`);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(headerEl);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <div ref={headerWrapRef} aria-hidden={false}>
        <Header />
      </div>
      <main
        data-floating-header-main="true"
        className="flex-1 floating-header-main"
        style={{ paddingTop: "calc(var(--header-h, 72px) + var(--header-breathing, 16px))" }}
      >
        {children}
      </main>
      {!hideFooter && <Footer />}
      <GoogleTranslate />
      <HeaderOffsetDebug />
    </div>
  );
};

export default Layout;

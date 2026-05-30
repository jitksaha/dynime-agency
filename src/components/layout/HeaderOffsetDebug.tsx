import { useEffect, useState } from "react";

/**
 * Tiny on-page debug toggle that visualizes the reserved header offset
 * (header height + breathing). Helps verify spacing differences across pages.
 *
 * Toggle with the floating button (bottom-right) or press Alt+H.
 * Persists across reloads via localStorage.
 */
const STORAGE_KEY = "lov:debug:header-offset";

const HeaderOffsetDebug = () => {
  const [enabled, setEnabled] = useState(false);
  const [metrics, setMetrics] = useState({ header: 0, breathing: 0, total: 0 });

  useEffect(() => {
    setEnabled(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  }, [enabled]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "h" || e.key === "H")) {
        e.preventDefault();
        setEnabled((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const read = () => {
      const cs = getComputedStyle(document.documentElement);
      const parse = (v: string) => parseFloat(v) || 0;
      const main = document.querySelector<HTMLElement>('[data-floating-header-main="true"]');
      const totalPad = main ? parse(getComputedStyle(main).paddingTop) : 0;
      const header = parse(cs.getPropertyValue("--header-h"));
      const breathing = Math.max(0, totalPad - header);
      setMetrics({ header, breathing, total: totalPad });
    };
    read();
    const id = window.setInterval(read, 250);
    window.addEventListener("resize", read);
    window.addEventListener("scroll", read, { passive: true });
    return () => {
      clearInterval(id);
      window.removeEventListener("resize", read);
      window.removeEventListener("scroll", read);
    };
  }, [enabled]);

  return (
    <>
      {enabled && (
        <>
          {/* Header height band */}
          <div
            aria-hidden
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              height: `${metrics.header}px`,
              background:
                "repeating-linear-gradient(45deg, hsl(var(--primary)/0.18) 0 8px, hsl(var(--primary)/0.08) 8px 16px)",
              outline: "1px dashed hsl(var(--primary))",
              pointerEvents: "none",
              zIndex: 9998,
            }}
          />
          {/* Breathing band */}
          <div
            aria-hidden
            style={{
              position: "fixed",
              top: `${metrics.header}px`,
              left: 0,
              right: 0,
              height: `${metrics.breathing}px`,
              background:
                "repeating-linear-gradient(45deg, hsl(var(--accent)/0.22) 0 6px, hsl(var(--accent)/0.08) 6px 12px)",
              outline: "1px dashed hsl(var(--accent))",
              pointerEvents: "none",
              zIndex: 9998,
            }}
          />
          {/* Total offset marker line */}
          <div
            aria-hidden
            style={{
              position: "fixed",
              top: `${metrics.total}px`,
              left: 0,
              right: 0,
              height: 0,
              borderTop: "2px solid hsl(var(--destructive))",
              pointerEvents: "none",
              zIndex: 9998,
            }}
          />
          {/* Readout */}
          <div
            style={{
              position: "fixed",
              bottom: 64,
              right: 12,
              zIndex: 9999,
              padding: "8px 10px",
              borderRadius: 8,
              background: "hsl(var(--background))",
              color: "hsl(var(--foreground))",
              border: "1px solid hsl(var(--border))",
              fontSize: 12,
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              boxShadow: "0 4px 14px hsl(var(--foreground)/0.12)",
              pointerEvents: "none",
            }}
          >
            <div>header: {metrics.header.toFixed(1)}px</div>
            <div>breathing: {metrics.breathing.toFixed(1)}px</div>
            <div>total offset: {metrics.total.toFixed(1)}px</div>
          </div>
        </>
      )}
      <button
        type="button"
        onClick={() => setEnabled((v) => !v)}
        title="Toggle header offset debug (Alt+H)"
        aria-pressed={enabled}
        style={{
          position: "fixed",
          bottom: 12,
          right: 12,
          zIndex: 9999,
          padding: "6px 10px",
          borderRadius: 999,
          background: enabled ? "hsl(var(--primary))" : "hsl(var(--background))",
          color: enabled ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
          border: "1px solid hsl(var(--border))",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 0.3,
          boxShadow: "0 4px 14px hsl(var(--foreground)/0.12)",
          cursor: "pointer",
        }}
      >
        {enabled ? "HDR ●" : "HDR"}
      </button>
    </>
  );
};

export default HeaderOffsetDebug;

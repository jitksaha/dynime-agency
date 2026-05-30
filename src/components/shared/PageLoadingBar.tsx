import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Lightweight top loading bar. Only appears when a navigation actually takes
 * longer than ~120ms (so instant route swaps don't flash a bar) and completes
 * quickly so it never feels like a delay.
 */
const PageLoadingBar = () => {
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setProgress(0);

    // Only show the bar if the page is still mounting after 120ms.
    const showTimer = setTimeout(() => {
      if (cancelled) return;
      setLoading(true);
      setProgress(60);
    }, 120);

    // Complete on next paint of the new route
    const completeTimer = requestAnimationFrame(() => {
      if (cancelled) return;
      setProgress(100);
      setTimeout(() => setLoading(false), 150);
    });

    return () => {
      cancelled = true;
      clearTimeout(showTimer);
      cancelAnimationFrame(completeTimer);
    };
  }, [location.pathname]);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          className="fixed top-0 left-0 right-0 z-[9999] h-[3px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            className="h-full bg-primary shadow-[0_0_10px_hsl(var(--primary)),0_0_5px_hsl(var(--primary))]"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PageLoadingBar;

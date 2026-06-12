import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { db } from "@/integrations/db/client";
import { preloadLogoForTheme } from "@/lib/preload-logo";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: (e?: React.MouseEvent) => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: "light", toggleTheme: () => {} });

export const useTheme = () => useContext(ThemeContext);

const STORAGE_KEY = "dynime-theme";
const USER_OVERRIDE_KEY = "dynime-theme-user-set";

// Light mode is the default. We no longer follow the OS preference automatically;
// the user must explicitly toggle to dark.
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const userOverride = localStorage.getItem(USER_OVERRIDE_KEY) === "true";
    if (stored && userOverride) return stored;
    return "light";
  });

  // Apply theme to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
      root.classList.remove("dark");
    } else {
      root.classList.add("dark");
      root.classList.remove("light");
    }
    localStorage.setItem(STORAGE_KEY, theme);
    // Keep the <link rel="preload" as="image"> in sync with the active theme
    // so the next navigation / first paint uses the correct cached logo.
    preloadLogoForTheme(theme);
  }, [theme]);

  // OS preference is intentionally NOT followed — light is the default.

  // Admin-configured default theme — only applied if the user hasn't toggled
  // and there's no OS-driven preference we should respect first. We treat the
  // OS preference as higher priority than the admin default.
  useEffect(() => {
    let cancelled = false;
    const userOverride = localStorage.getItem(USER_OVERRIDE_KEY) === "true";
    if (userOverride) return;

    (async () => {
      try {
        const { data } = await db
          .from("site_settings")
          .select("value")
          .eq("key", "default_theme")
          .maybeSingle();
        if (cancelled || !data?.value) return;
        let val: any = data.value;
        while (typeof val === "string") {
          try { val = JSON.parse(val); } catch { break; }
        }
        const def = (typeof val === "string" ? val : "").toLowerCase();
        // Only apply admin default if it's "system" handled implicitly, or explicit override.
        // We keep system detection as primary; admin default acts as fallback when system isn't available.
        if ((def === "light" || def === "dark") && !window.matchMedia) {
          setTheme(def as Theme);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const toggleTheme = useCallback((e?: React.MouseEvent) => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    // Mark that the user has made an explicit choice — don't override from admin default anymore.
    try { localStorage.setItem(USER_OVERRIDE_KEY, "true"); } catch { /* ignore */ }

    // Telegram-style circular reveal using View Transition API
    if (e && "startViewTransition" in document) {
      const x = e.clientX;
      const y = e.clientY;

      const maxRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );

      const transition = (document as any).startViewTransition(() => {
        setTheme(nextTheme);
      });

      transition.ready.then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${maxRadius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 500,
            easing: "ease-in-out",
            pseudoElement: "::view-transition-new(root)",
          }
        );
      });
    } else {
      setTheme(nextTheme);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

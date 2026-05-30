import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { preloadLogoForTheme } from "@/lib/preload-logo";

// Restore original deep-link path after 404.html redirect
// (used by static hosts that don't support server-side SPA fallback)
(() => {
  try {
    const redirect = sessionStorage.getItem("spa-redirect");
    if (redirect && redirect !== "/" && redirect !== window.location.pathname) {
      sessionStorage.removeItem("spa-redirect");
      window.history.replaceState(null, "", redirect);
    }
  } catch {
    // ignore (private mode, etc.)
  }
})();

// ---------------------------------------------------------------------------
// Theme bootstrap — runs BEFORE React mounts, so <html> already carries the
// correct `light`/`dark` class on first paint and the CSS variables resolve
// to the right colors. This kills the white-then-dark (or vice-versa) flash.
// Light is the default (matches ThemeProvider behaviour).
// ---------------------------------------------------------------------------
(() => {
  try {
    const STORAGE_KEY = "dynime-theme";
    const USER_OVERRIDE_KEY = "dynime-theme-user-set";
    const userOverride = localStorage.getItem(USER_OVERRIDE_KEY) === "true";
    const stored = localStorage.getItem(STORAGE_KEY);
    const theme = userOverride && (stored === "dark" || stored === "light") ? stored : "light";
    const root = document.documentElement;
    root.classList.add(theme);
    root.classList.remove(theme === "dark" ? "light" : "dark");
  } catch {
    document.documentElement.classList.add("light");
  }
})();

preloadLogoForTheme();

// ---------------------------------------------------------------------------
// Google Translate × React safety patch.
//
// Google Translate mutates text nodes by wrapping them in <font> elements.
// When React later tries to unmount or replace those nodes (e.g. after a
// form submits and we swap the form for a success card), it crashes with:
//   "Failed to execute 'removeChild' on 'Node':
//    The node to be removed is not a child of this node."
// or "Failed to execute 'insertBefore' on 'Node': …".
//
// This is a known, long-standing browser/React issue. The accepted fix is
// to make removeChild / insertBefore no-op safely when the target node is
// no longer a child of the parent React thinks it is.
// ---------------------------------------------------------------------------
if (typeof Node !== "undefined" && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child.parentNode !== this) {
      if (child.parentNode) {
        try {
          return (child.parentNode as Node).removeChild(child) as T;
        } catch {
          return child;
        }
      }
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  } as typeof Node.prototype.removeChild;

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(
    newNode: T,
    referenceNode: Node | null,
  ): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      // Reference node was moved by Google Translate — fall back to append.
      try {
        return (this as Node).appendChild(newNode) as T;
      } catch {
        return newNode;
      }
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  } as typeof Node.prototype.insertBefore;
}

createRoot(document.getElementById("root")!).render(<App />);

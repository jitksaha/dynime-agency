import { useEffect } from "react";
import {
  useBootstrapProductUrls,
  resolveProductUrl,
  resolveProductUrlByKey,
} from "@/hooks/use-product-urls";

/**
 * Global click interceptor: rewrites in-app navigation to external product URLs
 * configured in the `product_urls` table. Works for any <a> rendered by
 * <Link>, <NavLink>, plain anchors, or buttons wrapped in anchors.
 *
 * Runs in the capture phase so it pre-empts react-router's own click handler.
 */
const ProductUrlInterceptor = () => {
  useBootstrapProductUrls();

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      // Respect modifier keys / non-primary buttons — let browser handle them
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest("a") as HTMLAnchorElement | null;
      if (!anchor) return;
      // Skip explicit external/download links
      if (anchor.hasAttribute("download")) return;
      const rawHref = anchor.getAttribute("href");
      if (!rawHref) return;
      // 1) Identifier-driven: any element (anchor or descendant) with data-product-key wins.
      const keyedEl =
        (target.closest("[data-product-key]") as HTMLElement | null) ||
        (anchor.hasAttribute("data-product-key") ? anchor : null);
      const productKey = keyedEl?.getAttribute("data-product-key");
      let match = productKey ? resolveProductUrlByKey(productKey) : null;

      // 2) Fallback: legacy internal-path matching for anchors with normal hrefs.
      if (!match) {
        if (rawHref.startsWith("#") || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:")) {
          return;
        }
        let pathname = "";
        try {
          const url = new URL(anchor.href, window.location.origin);
          if (url.origin !== window.location.origin) return;
          pathname = url.pathname;
        } catch {
          return;
        }
        match = resolveProductUrl(pathname);
      }

      if (!match || !match.external_url) return;

      event.preventDefault();
      event.stopPropagation();

      if (match.open_in_new_tab) {
        window.open(match.external_url, "_blank", "noopener,noreferrer");
      } else {
        window.location.href = match.external_url;
      }
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
};

export default ProductUrlInterceptor;

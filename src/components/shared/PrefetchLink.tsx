import { forwardRef, useEffect, useRef } from "react";
import { Link, type LinkProps } from "react-router-dom";

/**
 * Map a route pathname to the dynamic import that loads its page chunk.
 * Calling the importer warms Vite's module cache so the next navigation
 * resolves instantly. Returns `null` for routes that don't need prefetch
 * (eager-loaded, external, or unknown).
 */
const routeImporter = (path: string): (() => Promise<unknown>) | null => {
  if (!path || path.startsWith("http") || path.startsWith("mailto:") || path.startsWith("tel:") || path.startsWith("#")) {
    return null;
  }
  // Normalise: strip query/hash, ensure leading slash
  const clean = path.split("?")[0].split("#")[0];

  // Exact + prefix matches (most specific first)
  if (clean === "/" ) return null; // home is eager
  if (clean === "/about") return () => import("@/pages/About.tsx");
  if (clean === "/services") return () => import("@/pages/Services.tsx");
  if (clean === "/services/dss") return () => import("@/pages/ServicesDss.tsx");
  if (clean === "/products/os" || clean === "/products/dbm") return () => import("@/pages/ProductDbm.tsx");
  if (clean === "/portfolio") return () => import("@/pages/Portfolio.tsx");
  if (clean === "/blog") return () => import("@/pages/Blog.tsx");
  if (clean.startsWith("/blog/category/") || clean.startsWith("/blog/tag/")) return () => import("@/pages/BlogTaxonomy.tsx");
  if (clean.startsWith("/blog/")) return () => import("@/pages/BlogPost.tsx");
  if (clean === "/contact") return () => import("@/pages/Contact.tsx");
  if (clean === "/careers") return () => import("@/pages/Careers.tsx");
  if (clean.startsWith("/careers/")) return () => import("@/pages/CareerDetail.tsx");
  if (clean === "/checkout") return () => import("@/pages/Checkout.tsx");
  if (clean === "/track" || clean.startsWith("/track/")) return () => import("@/pages/TrackOrder.tsx");
  if (clean === "/orders") return () => import("@/pages/OrderHistory.tsx");
  if (clean === "/usa-business-formation") return () => import("@/pages/USAFormation.tsx");
  if (clean.startsWith("/invoice/") || clean.startsWith("/i/")) return () => import("@/pages/Invoice.tsx");
  if (clean.startsWith("/payment/status/")) return () => import("@/pages/PaymentStatus.tsx");
  if (clean.startsWith("/page/")) return () => import("@/pages/DynamicPage.tsx");

  // Account portal
  if (clean === "/account/login") return () => import("@/pages/account/AccountLogin.tsx");
  if (clean === "/account/reset-password") return () => import("@/pages/account/ResetPassword.tsx");
  if (clean === "/account") return () => import("@/pages/account/AccountDashboard.tsx");
  if (clean === "/account/orders") return () => import("@/pages/account/AccountOrders.tsx");
  if (clean === "/account/tracking") return () => import("@/pages/account/AccountTracking.tsx");
  if (clean === "/account/services") return () => import("@/pages/account/AccountServices.tsx");
  if (clean === "/account/services/recurring") return () => import("@/pages/account/AccountRecurring.tsx");
  if (clean === "/account/services/formation") return () => import("@/pages/account/AccountFormation.tsx");
  if (clean === "/account/compliance") return () => import("@/pages/account/AccountCompliance.tsx");
  if (clean === "/account/invoices") return () => import("@/pages/account/AccountInvoices.tsx");
  if (clean === "/account/profile") return () => import("@/pages/account/AccountProfile.tsx");
  if (clean === "/account/tickets") return () => import("@/pages/account/AccountTickets.tsx");
  if (clean.startsWith("/account/tickets/")) return () => import("@/pages/account/AccountTicketDetail.tsx");

  // Legal — single chunk
  if (
    clean === "/privacy" || clean === "/terms" || clean === "/refund" || clean === "/cookies" ||
    clean === "/aml" || clean === "/compliance" || clean === "/payments" || clean === "/support" ||
    clean === "/acceptable-use" || clean.startsWith("/legal/")
  ) {
    return () => import("@/pages/Legal.tsx");
  }

  // Dynamic service detail pages live at "/:slug" — single-segment paths
  if (/^\/[a-z0-9-]+$/i.test(clean)) {
    return () => import("@/pages/ServiceDetail.tsx");
  }

  return null;
};

const prefetched = new Set<string>();

const triggerPrefetch = (to: string) => {
  if (prefetched.has(to)) return;
  const importer = routeImporter(to);
  if (!importer) return;
  prefetched.add(to);
  // Run on idle so it never competes with critical work
  const run = () => { importer().catch(() => prefetched.delete(to)); };
  if (typeof (window as unknown as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback === "function") {
    (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(run);
  } else {
    setTimeout(run, 200);
  }
};

interface PrefetchLinkProps extends LinkProps {
  /** Set false to disable prefetch (e.g., for very large rarely-used pages) */
  prefetch?: boolean;
}

/**
 * Drop-in replacement for react-router-dom's <Link> that prefetches
 * the destination route's JS chunk on hover, focus, or when the link
 * enters the viewport — whichever happens first.
 */
const PrefetchLink = forwardRef<HTMLAnchorElement, PrefetchLinkProps>(
  ({ to, prefetch = true, onMouseEnter, onFocus, onTouchStart, ...rest }, ref) => {
    const innerRef = useRef<HTMLAnchorElement | null>(null);
    const target = typeof to === "string" ? to : "";

    useEffect(() => {
      if (!prefetch || !target) return;
      const el = innerRef.current;
      if (!el || typeof IntersectionObserver === "undefined") return;
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              triggerPrefetch(target);
              io.disconnect();
              break;
            }
          }
        },
        { rootMargin: "200px" }
      );
      io.observe(el);
      return () => io.disconnect();
    }, [target, prefetch]);

    return (
      <Link
        {...rest}
        to={to}
        ref={(node) => {
          innerRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) (ref as React.MutableRefObject<HTMLAnchorElement | null>).current = node;
        }}
        onMouseEnter={(e) => { if (prefetch) triggerPrefetch(target); onMouseEnter?.(e); }}
        onFocus={(e) => { if (prefetch) triggerPrefetch(target); onFocus?.(e); }}
        onTouchStart={(e) => { if (prefetch) triggerPrefetch(target); onTouchStart?.(e); }}
      />
    );
  }
);
PrefetchLink.displayName = "PrefetchLink";

export default PrefetchLink;
export { triggerPrefetch };

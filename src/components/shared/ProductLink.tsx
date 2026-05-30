import { forwardRef, type AnchorHTMLAttributes, type ReactNode } from "react";
import { useProductExternalUrl } from "@/hooks/use-product-urls";

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  /** Product identifier from Super Admin → Product URLs (e.g. "dbm", "dshg"). */
  productKey: string;
  /** Optional href fallback used until the product_urls cache is populated. */
  fallbackHref?: string;
  children?: ReactNode;
};

/**
 * Identifier-driven link. The destination, target and rel are pulled from the
 * `product_urls` table at render time — change the External URL once in
 * Super Admin → Product URLs and every <ProductLink productKey="..."/> on the
 * site instantly points to the new destination.
 *
 * Also sets a `data-product-key` attribute so the global ProductUrlInterceptor
 * can rewrite plain anchors that opt-in via that attribute alone.
 */
const ProductLink = forwardRef<HTMLAnchorElement, Props>(
  ({ productKey, fallbackHref, children, target, rel, onClick, ...rest }, ref) => {
    const product = useProductExternalUrl(productKey);
    const href = product?.external_url || fallbackHref || "#";
    const newTab = product ? product.open_in_new_tab : true;
    return (
      <a
        ref={ref}
        href={href}
        data-product-key={productKey}
        target={target ?? (newTab ? "_blank" : undefined)}
        rel={rel ?? (newTab ? "noopener noreferrer" : undefined)}
        onClick={onClick}
        {...rest}
      >
        {children}
      </a>
    );
  },
);
ProductLink.displayName = "ProductLink";

export default ProductLink;

/**
 * Tiny safe-HTML allowlist sanitizer for short admin-editable strings
 * (chip subtitles, copyright, trademark, etc.).
 *
 * Allowed tags: b, strong, i, em, u, br, span, small, a
 * Allowed attributes: href, target, rel, class (only on the above)
 *
 * Everything else is stripped. Returns a plain HTML string safe to
 * pass to dangerouslySetInnerHTML.
 */

const ALLOWED_TAGS = new Set(["b", "strong", "i", "em", "u", "br", "span", "small", "a"]);
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "target", "rel", "class"]),
  span: new Set(["class"]),
  small: new Set(["class"]),
};

const sanitizeNode = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  const inner = Array.from(el.childNodes).map(sanitizeNode).join("");

  if (!ALLOWED_TAGS.has(tag)) {
    // Unsafe tag — keep its inner text/HTML, drop the wrapper
    return inner;
  }
  if (tag === "br") return "<br>";

  const allowed = ALLOWED_ATTRS[tag] ?? new Set<string>();
  const attrs: string[] = [];
  for (const a of Array.from(el.attributes)) {
    if (!allowed.has(a.name.toLowerCase())) continue;
    let value = a.value;
    if (a.name.toLowerCase() === "href") {
      // Only allow http(s), mailto, tel, and same-origin paths
      if (!/^(https?:|mailto:|tel:|\/|#)/i.test(value)) continue;
    }
    value = value.replace(/"/g, "&quot;");
    attrs.push(`${a.name.toLowerCase()}="${value}"`);
  }
  // Auto-add rel for links opening in new window
  if (tag === "a" && /target=["']?_blank/i.test(attrs.join(" "))) {
    if (!attrs.some((a) => a.startsWith("rel="))) {
      attrs.push('rel="noopener noreferrer"');
    }
  }
  return `<${tag}${attrs.length ? " " + attrs.join(" ") : ""}>${inner}</${tag}>`;
};

export const sanitizeRichText = (html: string | null | undefined): string => {
  if (!html) return "";
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    // SSR fallback: strip everything
    return String(html).replace(/<[^>]*>/g, "");
  }
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstChild;
  if (!root) return "";
  return Array.from(root.childNodes).map(sanitizeNode).join("");
};

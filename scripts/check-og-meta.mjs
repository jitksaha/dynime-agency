/**
 * Build-time OG/Twitter meta validator.
 *
 * Runs after `scripts/prerender-seo.mjs`. For every prerendered route in
 * dist/, verifies that the required social-preview meta tags are present
 * and non-empty:
 *
 *   - <title>
 *   - <meta name="description">
 *   - og:title, og:description, og:url, og:type, og:image,
 *     og:image:width, og:image:height, og:image:type, og:image:alt
 *   - twitter:card, twitter:title, twitter:description, twitter:image
 *   - <link rel="canonical">
 *
 * Auto-repair behaviour (no false positives — only patches the file
 * when something is *actually* missing/broken):
 *   - If og:image / twitter:image is missing OR the URL fails a HEAD
 *     check, the script substitutes the site-default OG image and
 *     re-derives og:image:type / width / height. The HTML on disk is
 *     rewritten in-place.
 *   - If a tag's `content` attribute is missing or empty, it's repopulated
 *     from sensible fallbacks (page title for og:title, etc.).
 *
 * Hard-fail (exits non-zero, blocking the deploy):
 *   - <title> empty
 *   - description missing AND no fallback derivable
 *   - canonical missing
 *
 * Pass `--fix=false` to run in audit-only mode (no writes).
 */
import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const DIST = path.resolve("dist");
const SITE_URL = (process.env.PRERENDER_SITE_URL || "https://dynime.com").replace(/\/$/, "");
const SITE_DEFAULT_OG = process.env.SITE_DEFAULT_OG || `${SITE_URL}/og-image.jpg`;
const FIX = !process.argv.includes("--fix=false");

const REQUIRED_OG = [
  "og:title",
  "og:description",
  "og:url",
  "og:type",
  "og:image",
  "og:image:width",
  "og:image:height",
  "og:image:type",
  "og:image:alt",
];
const REQUIRED_TW = [
  "twitter:card",
  "twitter:title",
  "twitter:description",
  "twitter:image",
];

const TYPE_FROM_URL = (u = "") =>
  /\.png(\?|$)/i.test(u) ? "image/png"
  : /\.webp(\?|$)/i.test(u) ? "image/webp"
  : /\.gif(\?|$)/i.test(u) ? "image/gif"
  : "image/jpeg";

function readMeta(html, attr, key) {
  const re = new RegExp(`<meta\\s+${attr}=["']${key}["'][^>]*content=["']([^"']*)["'][^>]*>`, "i");
  const m = html.match(re);
  return m ? m[1] : null;
}
function hasMeta(html, attr, key) {
  return new RegExp(`<meta\\s+${attr}=["']${key}["']`, "i").test(html);
}
function setMeta(html, attr, key, value) {
  const re = new RegExp(`<meta\\s+${attr}=["']${key}["'][^>]*>`, "i");
  const tag = `<meta ${attr}="${key}" content="${esc(value)}">`;
  if (re.test(html)) return html.replace(re, tag);
  return html.replace(/<\/head>/i, `    ${tag}\n  </head>`);
}
const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function readTitle(html) {
  return (html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "").trim();
}
function readCanonical(html) {
  return html.match(/<link\s+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1] || null;
}

async function isImageReachable(url) {
  if (!url) return false;
  try {
    const r = await fetch(url, { method: "HEAD", redirect: "follow" });
    if (r.ok && (r.headers.get("content-type") || "").startsWith("image/")) return true;
    // Some CDNs reject HEAD — try GET with a tiny range
    const g = await fetch(url, { method: "GET", headers: { Range: "bytes=0-128" } });
    return g.ok && (g.headers.get("content-type") || "").startsWith("image/");
  } catch {
    return false;
  }
}

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir)) {
    const p = path.join(dir, entry);
    const s = await stat(p);
    if (s.isDirectory()) out.push(...(await walk(p)));
    else if (entry === "index.html") out.push(p);
  }
  return out;
}

const files = await walk(DIST);
let failed = 0;
let patched = 0;
let ok = 0;
const errors = [];

for (const file of files) {
  const rel = "/" + path.relative(DIST, path.dirname(file)).replace(/\\/g, "/");
  const route = rel === "/." ? "/" : rel;
  let html = await readFile(file, "utf8");
  let dirty = false;
  const fileErrors = [];

  // Hard requirements
  const title = readTitle(html);
  const description = readMeta(html, "name", "description") || readMeta(html, "property", "og:description");
  const canonical = readCanonical(html);

  if (!title) fileErrors.push("missing or empty <title>");
  if (!description) fileErrors.push("missing description");
  if (!canonical) fileErrors.push("missing <link rel=canonical>");

  // Image validity (auto-repair)
  let image = readMeta(html, "property", "og:image") || readMeta(html, "name", "twitter:image");
  const imageOk = image ? await isImageReachable(image) : false;
  if (!imageOk) {
    if (FIX) {
      const fallback = SITE_DEFAULT_OG;
      console.log(`[og-check] ${route}  → image missing/broken (${image || "—"}), substituting default`);
      html = setMeta(html, "property", "og:image", fallback);
      html = setMeta(html, "property", "og:image:secure_url", fallback);
      html = setMeta(html, "property", "og:image:type", TYPE_FROM_URL(fallback));
      html = setMeta(html, "name", "twitter:image", fallback);
      html = setMeta(html, "name", "twitter:image:src", fallback);
      image = fallback;
      dirty = true;
      patched++;
    } else {
      fileErrors.push(`og:image unreachable: ${image || "(missing)"}`);
    }
  }

  // Ensure dimensions/type/alt exist (repair without flagging)
  const repairs = [
    ["property", "og:image:width", "1200"],
    ["property", "og:image:height", "630"],
    ["property", "og:image:type", TYPE_FROM_URL(image || SITE_DEFAULT_OG)],
    ["property", "og:image:alt", title || "Dynime Inc. — social preview"],
    ["name", "twitter:card", "summary_large_image"],
  ];
  for (const [attr, key, val] of repairs) {
    const cur = readMeta(html, attr, key);
    if (!cur || !cur.trim()) {
      if (FIX) { html = setMeta(html, attr, key, val); dirty = true; }
      else fileErrors.push(`missing ${key}`);
    }
  }

  // All other required tags must at minimum exist with non-empty content.
  for (const key of REQUIRED_OG) {
    const v = readMeta(html, "property", key);
    if (!v || !v.trim()) {
      // Already auto-repaired above for image-related keys
      if (key.startsWith("og:image")) continue;
      if (FIX) {
        const repl =
          key === "og:title" ? title || "Dynime Inc."
          : key === "og:description" ? description || ""
          : key === "og:url" ? canonical || `${SITE_URL}${route}`
          : key === "og:type" ? "website"
          : "";
        if (repl) { html = setMeta(html, "property", key, repl); dirty = true; }
        else fileErrors.push(`empty ${key} (no fallback)`);
      } else {
        fileErrors.push(`missing/empty ${key}`);
      }
    }
  }
  for (const key of REQUIRED_TW) {
    const v = readMeta(html, "name", key);
    if (!v || !v.trim()) {
      if (FIX) {
        const repl =
          key === "twitter:card" ? "summary_large_image"
          : key === "twitter:title" ? title || "Dynime Inc."
          : key === "twitter:description" ? description || ""
          : key === "twitter:image" ? image || SITE_DEFAULT_OG
          : "";
        if (repl) { html = setMeta(html, "name", key, repl); dirty = true; }
        else fileErrors.push(`empty ${key} (no fallback)`);
      } else {
        fileErrors.push(`missing/empty ${key}`);
      }
    }
  }

  if (dirty) await writeFile(file, html, "utf8");

  if (fileErrors.length) {
    failed++;
    errors.push({ route, fileErrors });
  } else {
    ok++;
  }
}

console.log(`\n[og-check] routes scanned: ${files.length}`);
console.log(`[og-check]   ✔ valid: ${ok}`);
console.log(`[og-check]   ⚙ auto-repaired: ${patched}`);
console.log(`[og-check]   ✘ failing: ${failed}`);

if (failed > 0) {
  console.error("\n[og-check] Hard failures (deploy blocked):");
  for (const e of errors) {
    console.error(`  ${e.route}`);
    for (const m of e.fileErrors) console.error(`    - ${m}`);
  }
  process.exit(1);
}

console.log("[og-check] All routes have valid social-preview meta. ✔");

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireAdmin } from "../_shared/require-admin.ts";

type Check = { id: string; label: string; status: "pass" | "warn" | "fail"; detail?: string };

function pickMeta(html: string, attr: "name" | "property", key: string): string | undefined {
  const re = new RegExp(
    `<meta[^>]+${attr}=["']${key.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}["'][^>]*>`,
    "i",
  );
  const m = html.match(re);
  if (!m) return undefined;
  const c = m[0].match(/content=["']([^"']*)["']/i);
  return c?.[1];
}
function pickTitle(html: string) {
  return html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim();
}
function pickCanonical(html: string) {
  const m = html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i);
  return m?.[0].match(/href=["']([^"']*)["']/i)?.[1];
}

async function probeImage(url: string) {
  try {
    const head = await fetch(url, { method: "HEAD", redirect: "follow" });
    const ctype = head.headers.get("content-type") || "";
    const len = Number(head.headers.get("content-length") || "0");
    return { ok: head.ok, status: head.status, contentType: ctype, bytes: len };
  } catch (e) {
    return { ok: false, status: 0, contentType: "", bytes: 0, error: (e as Error).message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // SECURITY: admin only — accepts caller-supplied URL and fetches it (SSRF risk).
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return new Response(JSON.stringify({ ok: false, error: auth.error }), {
      status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { url } = await req.json();
    if (!url || !/^https?:\/\//i.test(url)) {
      return new Response(JSON.stringify({ ok: false, error: "Provide a full http(s) URL" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch(url, {
      headers: { "User-Agent": "facebookexternalhit/1.1 (Dynime OG validator)" },
      redirect: "follow",
    });
    const html = await res.text();

    const meta = {
      title: pickMeta(html, "property", "og:title") || pickTitle(html),
      description: pickMeta(html, "property", "og:description") || pickMeta(html, "name", "description"),
      image: pickMeta(html, "property", "og:image"),
      imageAlt: pickMeta(html, "property", "og:image:alt"),
      imageWidth: pickMeta(html, "property", "og:image:width"),
      imageHeight: pickMeta(html, "property", "og:image:height"),
      imageType: pickMeta(html, "property", "og:image:type"),
      ogUrl: pickMeta(html, "property", "og:url"),
      ogType: pickMeta(html, "property", "og:type"),
      ogSiteName: pickMeta(html, "property", "og:site_name"),
      twitterCard: pickMeta(html, "name", "twitter:card"),
      twitterTitle: pickMeta(html, "name", "twitter:title"),
      twitterDescription: pickMeta(html, "name", "twitter:description"),
      twitterImage: pickMeta(html, "name", "twitter:image"),
      canonical: pickCanonical(html),
      robots: pickMeta(html, "name", "robots"),
    };

    const checks: Check[] = [];
    const add = (id: string, label: string, status: Check["status"], detail?: string) =>
      checks.push({ id, label, status, detail });

    add("status", `HTTP ${res.status}`, res.ok ? "pass" : "fail");
    add("title", "og:title present", meta.title ? "pass" : "fail",
      meta.title ? `${meta.title.length} chars` : "missing");
    if (meta.title && (meta.title.length < 30 || meta.title.length > 65))
      add("title-len", "Title length 30–65 (Google ideal)", "warn", `${meta.title.length} chars`);

    add("desc", "og:description / meta description present", meta.description ? "pass" : "fail",
      meta.description ? `${meta.description.length} chars` : "missing");
    if (meta.description && (meta.description.length < 70 || meta.description.length > 160))
      add("desc-len", "Description length 70–160", "warn", `${meta.description.length} chars`);

    add("og-type", "og:type set", meta.ogType ? "pass" : "warn", meta.ogType || "missing");
    add("og-url", "og:url set", meta.ogUrl ? "pass" : "warn", meta.ogUrl || "missing");
    add("og-site", "og:site_name set", meta.ogSiteName ? "pass" : "warn");
    add("canonical", "Canonical link present", meta.canonical ? "pass" : "warn", meta.canonical);
    add("twitter-card", "twitter:card set", meta.twitterCard ? "pass" : "warn", meta.twitterCard || "missing");

    // Image checks (Google/Facebook/Twitter requirements)
    if (!meta.image) {
      add("og-image", "og:image present", "fail", "missing");
    } else {
      add("og-image", "og:image present", "pass", meta.image);
      const absolute = /^https:\/\//i.test(meta.image);
      add("og-image-https", "og:image is absolute https URL", absolute ? "pass" : "fail",
        absolute ? "" : "Use absolute https:// URL");
      add("og-image-alt", "og:image:alt present", meta.imageAlt ? "pass" : "warn");

      const probe = await probeImage(meta.image);
      add("og-image-fetch", "Image is fetchable",
        probe.ok ? "pass" : "fail",
        probe.ok ? `${probe.contentType}, ${(probe.bytes / 1024).toFixed(0)} KB` : `HTTP ${probe.status}${probe.error ? ` — ${probe.error}` : ""}`);

      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (probe.contentType) {
        const okType = allowedTypes.some((t) => probe.contentType.startsWith(t));
        add("og-image-type", "Image type jpeg/png/webp/gif", okType ? "pass" : "fail", probe.contentType);
      }
      if (probe.bytes) {
        // Facebook: 8MB, Google Discover: 5MB, recommend < 5MB
        if (probe.bytes > 8 * 1024 * 1024)
          add("og-image-size", "Image ≤ 8 MB (Facebook)", "fail", `${(probe.bytes / 1024 / 1024).toFixed(2)} MB`);
        else if (probe.bytes > 5 * 1024 * 1024)
          add("og-image-size", "Image ≤ 5 MB (Google Discover)", "warn", `${(probe.bytes / 1024 / 1024).toFixed(2)} MB`);
        else
          add("og-image-size", "Image file size", "pass", `${(probe.bytes / 1024).toFixed(0)} KB`);
      }

      const w = Number(meta.imageWidth || 0), h = Number(meta.imageHeight || 0);
      if (!w || !h) {
        add("og-image-dims", "og:image:width & og:image:height declared", "warn", "missing");
      } else {
        add("og-image-dims", `Declared dimensions ${w}×${h}`, "pass");
        if (w < 1200 || h < 630)
          add("og-image-min", "Minimum 1200×630 (Google/Facebook recommended)", "warn", `${w}×${h}`);
        else add("og-image-min", "Min size 1200×630", "pass", `${w}×${h}`);
        const ratio = w / h;
        if (Math.abs(ratio - 1.91) > 0.1)
          add("og-image-ratio", "Aspect ratio ~1.91:1", "warn", `actual ${ratio.toFixed(2)}:1`);
        else add("og-image-ratio", "Aspect ratio ~1.91:1", "pass", `${ratio.toFixed(2)}:1`);
      }
    }

    if (meta.robots && /noindex/i.test(meta.robots))
      add("robots", "robots allows indexing", "fail", meta.robots);

    const summary = {
      pass: checks.filter((c) => c.status === "pass").length,
      warn: checks.filter((c) => c.status === "warn").length,
      fail: checks.filter((c) => c.status === "fail").length,
    };

    return new Response(JSON.stringify({ ok: true, url: res.url, meta, checks, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

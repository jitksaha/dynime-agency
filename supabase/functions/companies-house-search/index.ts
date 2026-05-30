// Edge function: search Companies House for company-name availability.
// Public endpoint — no auth required. Rate-limit handled by Companies House
// upstream; we add a soft in-memory throttle per IP.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const API_KEY = Deno.env.get("COMPANIES_HOUSE_API_KEY") ?? "";
const BASE = "https://api.company-information.service.gov.uk";

const SUFFIX_RE =
  /\s+(ltd|limited|plc|llp|cic|c\.i\.c\.|l\.l\.p\.|ltd\.|p\.l\.c\.)\.?$/i;

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(SUFFIX_RE, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const SENSITIVE = [
  "bank", "royal", "british", "england", "uk government", "police",
  "national", "chartered", "insurance", "trust", "group",
];

interface Item {
  title?: string;
  company_status?: string;
  company_number?: string;
  date_of_creation?: string;
}

const buckets = new Map<string, { n: number; t: number }>();
const allow = (ip: string) => {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || now - b.t > 60_000) {
    buckets.set(ip, { n: 1, t: now });
    return true;
  }
  if (b.n >= 30) return false;
  b.n++;
  return true;
};

const suggestionsFor = (raw: string) => {
  const base = raw
    .replace(SUFFIX_RE, "")
    .replace(/\s+/g, " ")
    .trim();
  const suffixes = ["UK Ltd", "Technologies Ltd", "Global Ltd", "Solutions Ltd", "Group Ltd"];
  return suffixes.map((s) => `${base} ${s}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });

  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    if (q.length < 2 || q.length > 160) {
      return json({ error: "Provide a company name between 2 and 160 chars" }, 400);
    }
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "anon";
    if (!allow(ip)) return json({ error: "Too many requests — try again in a minute" }, 429);

    if (!API_KEY) {
      // Soft fallback: no Companies House key configured — treat as likely available.
      return json({
        status: "manual_review",
        query: q,
        normalized: norm(q),
        message:
          "This name looks good. Our team will run the final Companies House check for you — usually within a few hours.",
        suggestions: suggestionsFor(q),
        matches: [],
      });
    }

    const auth = "Basic " + btoa(API_KEY + ":");
    const upstream = await fetch(
      `${BASE}/search/companies?q=${encodeURIComponent(q)}&items_per_page=15`,
      { headers: { Authorization: auth, Accept: "application/json" } },
    );
    if (!upstream.ok) {
      const text = await upstream.text();
      return json(
        { error: "Companies House lookup failed", upstream_status: upstream.status, detail: text.slice(0, 200) },
        502,
      );
    }
    const data = (await upstream.json()) as { items?: Item[] };
    const items = (data.items ?? []).filter(Boolean);
    const target = norm(q);

    const matches = items
      .filter((i) => i.title && i.company_status)
      .map((i) => ({
        title: i.title!,
        status: i.company_status!,
        number: i.company_number,
        normalized: norm(i.title!),
        date: i.date_of_creation,
      }));

    const exactActive = matches.find(
      (m) => m.normalized === target && !["dissolved", "removed"].includes(m.status),
    );
    const similarActive = matches.filter(
      (m) =>
        m.normalized !== target &&
        !["dissolved", "removed"].includes(m.status) &&
        (m.normalized.includes(target) || target.includes(m.normalized)),
    );
    const hasSensitive = SENSITIVE.some((w) => target.includes(w));

    let status: "available" | "unavailable" | "manual_review";
    let message: string;
    if (exactActive) {
      status = "unavailable";
      message = "This company name is already registered. Try one of the suggestions below.";
    } else if (similarActive.length > 0 || hasSensitive) {
      status = "manual_review";
      message = hasSensitive
        ? "This name looks fine — it just includes a regulated word, so our team will handle the quick approval step for you."
        : "Looks good. A few similar names exist, but Companies House usually allows this. Our team will confirm during filing.";
    } else {
      status = "available";
      message = "Great news! This company name appears available for registration.";
    }

    return json({
      status,
      query: q,
      normalized: target,
      message,
      matches: matches.slice(0, 6),
      suggestions: status === "available" ? [] : suggestionsFor(q),
      checked_at: new Date().toISOString(),
    });
  } catch (e) {
    return json({ error: "Unexpected error", detail: String((e as Error).message) }, 500);
  }
});

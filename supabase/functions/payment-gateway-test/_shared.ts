export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

export type Result = {
  ok: boolean;
  status: "pass" | "fail" | "warn";
  summary: string;
  details?: Record<string, unknown>;
  latency_ms: number;
};

export const TIMEOUT_MS = 15_000;

export async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = TIMEOUT_MS) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctl.signal });
  } finally {
    clearTimeout(t);
  }
}

export const timed = async <T>(fn: () => Promise<T>): Promise<{ value?: T; error?: Error; ms: number }> => {
  const start = performance.now();
  try {
    const value = await fn();
    return { value, ms: Math.round(performance.now() - start) };
  } catch (e) {
    return { error: e as Error, ms: Math.round(performance.now() - start) };
  }
};

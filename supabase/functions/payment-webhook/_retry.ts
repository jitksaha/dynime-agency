const TRANSIENT_HTTP = new Set([408, 425, 429, 500, 502, 503, 504]);
export const isTransientStatus = (status: number) => status >= 500 || TRANSIENT_HTTP.has(status);

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export type RetryResult<T> =
  | { ok: true; value: T; attempts: number }
  | { ok: false; error: Error; attempts: number; transient: boolean };

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { maxAttempts?: number; baseDelayMs?: number; maxDelayMs?: number; label?: string } = {},
): Promise<RetryResult<T>> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const base = opts.baseDelayMs ?? 400;
  const max = opts.maxDelayMs ?? 2500;
  const label = opts.label ?? "bkash";

  let lastError: Error & { transient?: boolean; status?: number } = new Error("unknown");
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const value = await fn();
      return { ok: true, value, attempts: attempt };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const transient =
        (lastError as { transient?: boolean }).transient ??
        (lastError.name === "TypeError" || lastError.name === "AbortError" || /network|fetch/i.test(lastError.message));

      console.warn(`[payment-webhook] ${label} attempt ${attempt}/${maxAttempts} failed`, {
        message: lastError.message,
        transient,
      });

      if (!transient || attempt === maxAttempts) {
        return { ok: false, error: lastError, attempts: attempt, transient };
      }

      const jitter = Math.floor(Math.random() * 150);
      const delay = Math.min(max, base * 2 ** (attempt - 1)) + jitter;
      await sleep(delay);
    }
  }
  return { ok: false, error: lastError, attempts: maxAttempts, transient: true };
}

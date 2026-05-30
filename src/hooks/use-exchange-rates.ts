import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FALLBACK_RATES, type CurrencyCode } from "@/lib/currency";

const CACHE_KEY = "fx_rates_v1";
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12h hard expiry for offline cache
const STALE_AFTER_MS = 30 * 60 * 1000; // 30m — after this we silently refetch in background
const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // poll every 30m while the tab is open

interface CachedRates {
  fetchedAt: number;
  rates: Record<string, number>;
}

const readCache = (): CachedRates | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: CachedRates = JSON.parse(raw);
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeCache = (rates: Record<string, number>) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ fetchedAt: Date.now(), rates } satisfies CachedRates),
    );
  } catch {
    /* quota or disabled — silently ignore */
  }
};

const fetchLiveRates = async (): Promise<Record<string, number>> => {
  // Primary: open.er-api.com. Fallback: frankfurter.app (ECB) and exchangerate.host.
  const sources = [
    async () => {
      const res = await fetch("https://open.er-api.com/v6/latest/USD", { cache: "no-store" });
      if (!res.ok) throw new Error(`er-api HTTP ${res.status}`);
      const j = await res.json();
      if (!j?.rates) throw new Error("er-api missing rates");
      return j.rates as Record<string, number>;
    },
    async () => {
      const res = await fetch("https://api.exchangerate.host/latest?base=USD", { cache: "no-store" });
      if (!res.ok) throw new Error(`exr-host HTTP ${res.status}`);
      const j = await res.json();
      if (!j?.rates) throw new Error("exr-host missing rates");
      return j.rates as Record<string, number>;
    },
  ];
  let lastErr: unknown = null;
  for (const fn of sources) {
    try { return await fn(); } catch (e) { lastErr = e; }
  }
  throw lastErr instanceof Error ? lastErr : new Error("All FX sources failed");
};

/**
 * Returns USD-based exchange rates with three layers of resilience:
 * 1. live API fetch (auto-refreshes every 30 minutes, on window focus, on
 *    network reconnect, and whenever the user changes currency)
 * 2. localStorage cache (12h offline-friendly)
 * 3. hardcoded fallback table
 *
 * The hook always returns a populated `rates` object so consumers don't have to
 * guard against undefined.
 */
export const useExchangeRates = () => {
  const cached = readCache();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["fx-rates-usd"],
    queryFn: async () => {
      const live = await fetchLiveRates();
      writeCache(live);
      return live;
    },
    initialData: cached?.rates,
    // Use the cache instantly, but mark it stale after 30m so the next render
    // (or any focus/reconnect/interval tick) triggers a silent background refresh.
    initialDataUpdatedAt: cached?.fetchedAt ?? 0,
    staleTime: STALE_AFTER_MS,
    gcTime: CACHE_TTL_MS,
    retry: 2,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: REFRESH_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });

  // When the user (or geo) changes currency, pull the latest rate immediately
  // so the converted price reflects the freshest FX number — not a 12h-old one.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onCurrencyChange = () => {
      queryClient.invalidateQueries({ queryKey: ["fx-rates-usd"] });
    };
    window.addEventListener("currencychange", onCurrencyChange);
    return () => window.removeEventListener("currencychange", onCurrencyChange);
  }, [queryClient]);

  const rates = (query.data ?? cached?.rates ?? FALLBACK_RATES) as Record<string, number>;
  const isFallback = !query.data && !cached;
  const isStaleCache = !query.data && !!cached;

  return {
    rates,
    isLoading: query.isLoading && !cached,
    isFetching: query.isFetching,
    isError: query.isError,
    isFallback,
    isStaleCache,
    cachedAt: cached?.fetchedAt ?? null,
    rateFor: (code: CurrencyCode) => {
      const r = rates[code];
      if (typeof r === "number" && r > 0) return r;
      return FALLBACK_RATES[code] ?? 1;
    },
  };
};

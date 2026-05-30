import { useEffect, useState } from "react";

export interface GeoInfo {
  country: string | null;
  countryCode: string | null;
  city: string | null;
  region: string | null;
  timezone: string | null;
  currency: string | null;
  languages: string | null;
  ip: string | null;
}

const CACHE_KEY = "dynime-geo-v2";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const PROVIDER_TIMEOUT_MS = 4500;

interface CachedGeo {
  fetchedAt: number;
  data: GeoInfo;
}

const readCache = (): GeoInfo | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: CachedGeo = JSON.parse(raw);
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    if (!parsed.data?.countryCode) return null; // don't trust empty cache
    return parsed.data;
  } catch {
    return null;
  }
};

const writeCache = (data: GeoInfo) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ fetchedAt: Date.now(), data } satisfies CachedGeo),
    );
  } catch {
    /* ignore */
  }
};

const withTimeout = async <T>(p: Promise<T>, ms: number): Promise<T | null> => {
  return await Promise.race<T | null>([
    p.catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
};

const safeJson = async (url: string): Promise<any | null> => {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
};

/** Map a provider's raw response into the shared GeoInfo shape. */
type Provider = { name: string; load: () => Promise<GeoInfo | null> };

const providers: Provider[] = [
  // Cloudflare trace — ultra-light, returns only country but nearly always works.
  {
    name: "cloudflare",
    load: async () => {
      try {
        const res = await fetch("https://www.cloudflare.com/cdn-cgi/trace", { cache: "no-store" });
        if (!res.ok) return null;
        const text = await res.text();
        const map: Record<string, string> = {};
        text.split("\n").forEach((l) => {
          const [k, v] = l.split("=");
          if (k && v) map[k.trim()] = v.trim();
        });
        if (!map.loc) return null;
        return {
          country: null,
          countryCode: map.loc || null,
          city: null,
          region: null,
          timezone: null,
          currency: null,
          languages: null,
          ip: map.ip ?? null,
        };
      } catch { return null; }
    },
  },
  {
    name: "ipapi.co",
    load: async () => {
      const j = await safeJson("https://ipapi.co/json/");
      if (!j || j.error) return null;
      return {
        country: j.country_name ?? null,
        countryCode: j.country_code ?? null,
        city: j.city ?? null,
        region: j.region ?? null,
        timezone: j.timezone ?? null,
        currency: j.currency ?? null,
        languages: j.languages ?? null,
        ip: j.ip ?? null,
      };
    },
  },
  {
    name: "ipwho.is",
    load: async () => {
      const j = await safeJson("https://ipwho.is/");
      if (!j || j.success === false) return null;
      return {
        country: j.country ?? null,
        countryCode: j.country_code ?? null,
        city: j.city ?? null,
        region: j.region ?? null,
        timezone: j.timezone?.id ?? null,
        currency: j.currency?.code ?? null,
        languages: null,
        ip: j.ip ?? null,
      };
    },
  },
  {
    name: "ipapi.is",
    load: async () => {
      const j = await safeJson("https://api.ipapi.is/");
      if (!j) return null;
      const cc = j.location?.country_code ?? j.country_code ?? null;
      if (!cc) return null;
      return {
        country: j.location?.country ?? null,
        countryCode: cc,
        city: j.location?.city ?? null,
        region: j.location?.state ?? null,
        timezone: j.location?.timezone ?? null,
        currency: null,
        languages: null,
        ip: j.ip ?? null,
      };
    },
  },
  {
    name: "geojs.io",
    load: async () => {
      const j = await safeJson("https://get.geojs.io/v1/ip/geo.json");
      if (!j) return null;
      return {
        country: j.country ?? null,
        countryCode: j.country_code ?? null,
        city: j.city ?? null,
        region: j.region ?? null,
        timezone: j.timezone ?? null,
        currency: null,
        languages: null,
        ip: j.ip ?? null,
      };
    },
  },
];

const isDoNotTrack = (): boolean => {
  if (typeof navigator === "undefined") return false;
  return navigator.doNotTrack === "1";
};

/**
 * Race all providers in parallel; resolve as soon as the first one returns a
 * usable countryCode. Falls back through the list if some are blocked / slow.
 */
const resolveGeo = async (): Promise<GeoInfo | null> => {
  return new Promise((resolve) => {
    let settled = false;
    let pending = providers.length;
    const fail = () => {
      pending -= 1;
      if (!settled && pending <= 0) {
        settled = true;
        resolve(null);
      }
    };
    providers.forEach((p) => {
      withTimeout(p.load(), PROVIDER_TIMEOUT_MS).then((data) => {
        if (settled) return;
        if (data && data.countryCode) {
          settled = true;
          resolve(data);
        } else {
          fail();
        }
      });
    });
  });
};

export const useGeoLocation = () => {
  const [geo, setGeo] = useState<GeoInfo | null>(() => readCache());
  const [isLoading, setIsLoading] = useState<boolean>(() => !readCache());

  useEffect(() => {
    if (geo) return; // already cached
    if (isDoNotTrack()) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const data = await resolveGeo();
      if (cancelled) return;
      if (data) {
        writeCache(data);
        setGeo(data);
      }
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [geo]);

  return { geo, isLoading };
};

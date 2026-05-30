import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ProductUrl = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  internal_path: string | null;
  external_url: string;
  open_in_new_tab: boolean;
  is_active: boolean;
  sort_order: number;
};

const CACHE_KEY = "dynime-product-urls-v1";

const normalizePath = (p: string | null | undefined): string => {
  if (!p) return "";
  let s = p.trim();
  if (!s.startsWith("/")) s = "/" + s;
  // strip trailing slash (except root)
  if (s.length > 1 && s.endsWith("/")) s = s.slice(0, -1);
  return s.toLowerCase();
};

const readCache = (): ProductUrl[] | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as ProductUrl[]) : null;
  } catch {
    return null;
  }
};

const writeCache = (rows: ProductUrl[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(rows));
    (window as any).__PRODUCT_URLS__ = rows;
    window.dispatchEvent(new CustomEvent("product-urls-updated"));
  } catch {
    /* ignore */
  }
};

export const fetchProductUrls = async (): Promise<ProductUrl[]> => {
  const { data, error } = await supabase
    .from("product_urls")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  const rows = (data || []) as ProductUrl[];
  writeCache(rows);
  return rows;
};

export const useProductUrls = () =>
  useQuery({
    queryKey: ["product-urls"],
    queryFn: fetchProductUrls,
    staleTime: 5 * 60_000,
    initialData: () => readCache() ?? undefined,
  });

export const useAllProductUrls = () =>
  useQuery({
    queryKey: ["product-urls", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_urls")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as ProductUrl[];
    },
    staleTime: 30_000,
  });

const getCachedList = (): ProductUrl[] | null => {
  if (typeof window === "undefined") return null;
  return ((window as any).__PRODUCT_URLS__ as ProductUrl[] | undefined) || readCache();
};

/** Look up a mapping for an internal path. Synchronous (uses cached data). */
export const resolveProductUrl = (path: string): ProductUrl | null => {
  const list = getCachedList();
  if (!list || !list.length) return null;
  const target = normalizePath(path);
  if (!target) return null;
  for (const row of list) {
    if (!row.is_active) continue;
    const ip = normalizePath(row.internal_path);
    if (ip && ip === target) return row;
  }
  return null;
};

/** Look up a mapping by product identifier/key. Synchronous (uses cached data). */
export const resolveProductUrlByKey = (key: string | null | undefined): ProductUrl | null => {
  const list = getCachedList();
  if (!list || !list.length || !key) return null;
  const k = key.trim().toLowerCase();
  for (const row of list) {
    if (!row.is_active) continue;
    if ((row.key || "").trim().toLowerCase() === k) return row;
  }
  return null;
};

/** React hook — returns the live external URL for a product key (re-renders on cache update). */
export const useProductExternalUrl = (key: string): ProductUrl | null => {
  const { data } = useProductUrls();
  // re-evaluate against latest data
  const list = data || getCachedList() || [];
  const k = key.trim().toLowerCase();
  return list.find((r) => r.is_active && (r.key || "").trim().toLowerCase() === k) || null;
};

/** Bootstrap helper — pre-populate window cache once on app start. */
export const useBootstrapProductUrls = () => {
  const { data } = useProductUrls();
  useEffect(() => {
    if (data) (window as any).__PRODUCT_URLS__ = data;
  }, [data]);
};

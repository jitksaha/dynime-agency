import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CatalogEntry {
  service_slug: string;
  service_title: string;
  tier_id: string;
  tier_name: string;
  price_usd: number;
  price_bdt: number;
  period?: string;
}

let catalogCache: CatalogEntry[] | null = null;
let catalogPromise: Promise<CatalogEntry[]> | null = null;

export function useServiceCatalog() {
  const [catalog, setCatalog] = useState<CatalogEntry[]>(catalogCache ?? []);
  const [loading, setLoading] = useState(!catalogCache);

  useEffect(() => {
    if (catalogCache) return;
    if (!catalogPromise) {
      catalogPromise = (async () => {
        const { data } = await supabase
          .from("service_pricing")
          .select("service_slug, service_title, is_enabled, tiers")
          .eq("is_enabled", true);
        const flat: CatalogEntry[] = [];
        (data || []).forEach((row: any) => {
          const tiers = Array.isArray(row.tiers) ? row.tiers : [];
          tiers.forEach((t: any) => {
            flat.push({
              service_slug: row.service_slug,
              service_title: row.service_title || row.service_slug,
              tier_id: String(t.id ?? `${row.service_slug}-${t.name}`),
              tier_name: String(t.name ?? "Tier"),
              price_usd: Number(t.price_usd) || 0,
              price_bdt: Number(t.price_bdt) || 0,
              period: t.period,
            });
          });
        });
        catalogCache = flat;
        return flat;
      })();
    }
    catalogPromise.then((c) => {
      setCatalog(c);
      setLoading(false);
    });
  }, []);

  return { catalog, loading };
}

interface Props {
  value: string;
  currency: string;
  onSelect: (patch: { name: string; price: number; description?: string }) => void;
  onChangeName: (name: string) => void;
  placeholder?: string;
  className?: string;
}

export default function ServiceItemPicker({
  value,
  currency,
  onSelect,
  onChangeName,
  placeholder = "Item name (search services…)",
  className,
}: Props) {
  const { catalog } = useServiceCatalog();
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const priceFor = (e: CatalogEntry) => (currency === "BDT" ? e.price_bdt : e.price_usd);

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];
    return catalog
      .filter((e) => `${e.service_title} ${e.tier_name}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [catalog, value]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => setHighlight(0), [value]);

  const pick = (e: CatalogEntry) => {
    onSelect({ name: `${e.service_title} — ${e.tier_name}`, price: priceFor(e) });
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <Input
        value={value}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChangeName(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (!open || suggestions.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            pick(suggestions[highlight]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg overflow-hidden">
          <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground border-b border-border flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Matching services — click to autofill price
          </div>
          <ul className="max-h-64 overflow-auto">
            {suggestions.map((e, i) => (
              <li
                key={`${e.service_slug}-${e.tier_id}`}
                onMouseDown={(ev) => {
                  ev.preventDefault();
                  pick(e);
                }}
                onMouseEnter={() => setHighlight(i)}
                className={cn(
                  "flex items-center justify-between gap-3 px-3 py-2 text-sm cursor-pointer",
                  i === highlight ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
                )}
              >
                <div className="min-w-0">
                  <div className="truncate">
                    {e.service_title} <span className="text-muted-foreground">— {e.tier_name}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">{e.service_slug}</div>
                </div>
                <div className="text-xs font-mono tabular-nums shrink-0">
                  {priceFor(e).toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency}
                  {e.period && e.period !== "one-time" ? ` / ${e.period}` : ""}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

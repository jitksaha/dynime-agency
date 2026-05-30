import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, Sparkles, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useExchangeRates } from "@/hooks/use-exchange-rates";
import {
  convertFromUsd,
  formatCurrency,
  type CurrencyCode,
} from "@/lib/currency";
import { useEffect, useState } from "react";
import { useLocation as useGeoLocationContext } from "@/contexts/LocationContext";

export interface ServiceAddon {
  id: string;
  service_slug: string;
  name: string;
  description: string | null;
  price_usd: number;
  period: string;
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
}

interface Props {
  serviceSlug: string;
  serviceTitle: string;
}

const ServiceAddonsSection = ({ serviceSlug, serviceTitle }: Props) => {
  const { rates } = useExchangeRates();
  const queryClient = useQueryClient();
  const { currency: ctxCurrency } = useGeoLocationContext();
  const [currency, setCurrency] = useState<CurrencyCode>(ctxCurrency);

  // Realtime: admin add-on edits propagate to the public page instantly
  useEffect(() => {
    const channel = supabase
      .channel(`service-addons-${serviceSlug}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_addons", filter: `service_slug=eq.${serviceSlug}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["service-addons", serviceSlug] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [serviceSlug, queryClient]);

  // Track global currency (geo auto + footer switcher)
  useEffect(() => {
    setCurrency(ctxCurrency);
  }, [ctxCurrency]);

  const { data: addons } = useQuery({
    queryKey: ["service-addons", serviceSlug],
    queryFn: async (): Promise<ServiceAddon[]> => {
      const { data, error } = await supabase
        .from("service_addons" as any)
        .select("*")
        .eq("service_slug", serviceSlug)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data as unknown as ServiceAddon[]) ?? [];
    },
  });

  if (!addons || addons.length === 0) return null;

  const fmt = (usd: number) => {
    const converted = rates ? convertFromUsd(usd, currency, rates) : usd;
    return formatCurrency(converted ?? usd, currency);
  };

  return (
    <section
      aria-labelledby="addons-heading"
      className="border-t border-border/60 bg-background/40 py-14"
    >
      <div className="container-custom">
        <div className="max-w-3xl mx-auto text-center mb-8">
          <span className="text-primary text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Optional add-ons
          </span>
          <h3 id="addons-heading" className="font-heading text-2xl md:text-3xl font-bold mt-2 mb-2">
            Power up your {serviceTitle}
          </h3>
          <p className="text-muted-foreground text-sm">
            Stackable extras you can add to any plan. Pricing auto-converts from USD.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
          {addons.map((a) => (
            <div
              key={a.id}
              className={`relative rounded-xl border p-5 bg-card transition hover:border-primary/40 hover:shadow-md ${
                a.is_popular ? "border-primary/40 ring-1 ring-primary/20" : "border-border"
              }`}
            >
              {a.is_popular && (
                <Badge className="absolute -top-2 right-4 text-[10px]">Popular</Badge>
              )}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="font-heading font-semibold text-foreground leading-tight">{a.name}</div>
                <Plus className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              </div>
              {a.description && (
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{a.description}</p>
              )}
              <div className="flex items-baseline gap-1 mb-4">
                <span className="font-heading text-2xl font-bold text-foreground tabular-nums">
                  {fmt(Number(a.price_usd))}
                </span>
                {a.period && a.period !== "one-time" && (
                  <span className="text-xs text-muted-foreground">/{a.period.replace(/^\//, "")}</span>
                )}
              </div>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link
                  to={`/contact?service=${encodeURIComponent(serviceTitle)}&addon=${encodeURIComponent(a.name)}`}
                >
                  Add to plan <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServiceAddonsSection;

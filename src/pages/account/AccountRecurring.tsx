import AccountLayout from "@/components/account/AccountLayout";
import { useCustomerServices, daysUntil } from "@/hooks/use-customer-services";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RotateCw, Calendar, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { usePageTitle } from "@/hooks/use-page-title";

const AccountRecurring = () => {
  usePageTitle("Recurring Services");
  const { data: services, isLoading } = useCustomerServices({ type: "recurring" });
  const qc = useQueryClient();

  const toggleAutoRenew = async (id: string, value: boolean) => {
    const { error } = await supabase.functions.invoke("cancel-recurring", {
      body: { service_id: id, auto_renew: value },
    });
    if (error) toast.error(error.message);
    else {
      toast.success(value ? "Auto-renew enabled" : "Auto-renew cancelled");
      qc.invalidateQueries({ queryKey: ["customer-services"] });
    }
  };

  const list = services || [];

  return (
    <AccountLayout title="Recurring Services" description="Manage your subscriptions, renewals, and auto-pay settings.">
      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}</div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card text-center py-12">
          <RotateCw className="w-14 h-14 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="font-heading text-lg font-semibold mb-1">No recurring services</h3>
          <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
            Subscriptions and recurring services will appear here with renewal countdowns and auto-renewal controls.
          </p>
          <Link to="/services" className="text-sm font-semibold text-primary hover:underline">Browse services →</Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {list.map((s) => {
            const d = daysUntil(s.current_period_end);
            const expired = s.status === "expired" || (d !== null && d < 0);
            const pct = d !== null && s.billing_cycle ? Math.max(0, Math.min(100, (d / (s.billing_cycle === "monthly" ? 30 : s.billing_cycle === "quarterly" ? 90 : 365)) * 100)) : 0;
            const tone = expired ? "border-destructive/40 bg-destructive/5"
              : d !== null && d <= 3 ? "border-destructive/40 bg-destructive/5"
              : d !== null && d <= 14 ? "border-yellow-500/40 bg-yellow-500/5"
              : "border-border bg-card";
            const ringColor = expired || (d !== null && d <= 3) ? "bg-destructive"
              : d !== null && d <= 14 ? "bg-yellow-500" : "bg-emerald-500";

            return (
              <div key={s.id} className={`rounded-2xl border p-5 ${tone}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <h3 className="font-heading text-base font-semibold truncate">{s.service_name}</h3>
                    <p className="text-xs text-muted-foreground capitalize">{s.billing_cycle} · {s.category.replace("_", " ")}</p>
                  </div>
                  <Badge variant="outline" className="capitalize">{s.status.replace("_", " ")}</Badge>
                </div>

                <div className="my-4">
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Next renewal</span>
                    <span className={`text-sm font-semibold ${expired ? "text-destructive" : ""}`}>
                      {expired ? "Expired" : d !== null ? `${d} day${d === 1 ? "" : "s"}` : "—"}
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full transition-all ${ringColor}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {s.current_period_end ? new Date(s.current_period_end).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—"}
                  </p>
                </div>

                <div className="flex items-center justify-between text-sm mb-4 pt-3 border-t border-border">
                  <span className="font-bold">${Number(s.price).toFixed(2)}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Auto-renew</span>
                    <Switch checked={s.auto_renew} onCheckedChange={(v) => toggleAutoRenew(s.id, v)} />
                  </div>
                </div>

                {(expired || (d !== null && d <= 14)) && (
                  <Link to={`/checkout?renew=${s.id}`}>
                    <Button variant="hero" size="sm" className="w-full">
                      <RotateCw className="w-3.5 h-3.5 mr-1.5" /> Renew now
                    </Button>
                  </Link>
                )}
                {!s.auto_renew && !expired && (
                  <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> You'll receive an email reminder before renewal.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AccountLayout>
  );
};

export default AccountRecurring;

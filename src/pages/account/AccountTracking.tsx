import AccountLayout from "@/components/account/AccountLayout";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Truck, Package, CheckCircle2, Clock, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { usePageTitle } from "@/hooks/use-page-title";

const STAGES = ["pending", "paid", "processing", "completed"] as const;
const STAGE_LABEL: Record<string, string> = {
  pending: "Awaiting Payment",
  paid: "Payment Confirmed",
  processing: "In Progress",
  completed: "Delivered",
};

const stageIndex = (status: string) => {
  const i = STAGES.indexOf(status as any);
  return i === -1 ? 1 : i;
};

const AccountTracking = () => {
  usePageTitle("Order Tracking");
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  const { data: orders, isLoading } = useQuery({
    queryKey: ["account-tracking", user?.email],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("customer_email", user!.email!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.email,
  });

  const filtered = (orders || []).filter((o) =>
    !search || (o.invoice_number || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AccountLayout title="Order Tracking" description="Follow the status of every order from payment to delivery.">
      <div className="relative mb-5 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by invoice..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card text-center py-12">
          <Truck className="w-14 h-14 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No orders to track yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((o: any) => {
            const idx = stageIndex(o.status);
            const items = Array.isArray(o.items) ? o.items : [];
            return (
              <div key={o.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="font-mono text-sm font-semibold">{o.invoice_number || `#${o.id.slice(0,8)}`}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {items.length} item{items.length === 1 ? "" : "s"} · {new Date(o.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize">{STAGE_LABEL[o.status] || o.status}</Badge>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-4">
                  {STAGES.map((s, i) => {
                    const reached = i <= idx;
                    const Icon = i === 3 ? CheckCircle2 : i === 2 ? Package : i === 1 ? Truck : Clock;
                    return (
                      <div key={s} className="flex flex-col items-center text-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${reached ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className={`text-[10px] md:text-xs ${reached ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                          {STAGE_LABEL[s]}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="h-1 bg-secondary rounded-full overflow-hidden mb-4">
                  <div className="h-full bg-primary transition-all" style={{ width: `${(idx / 3) * 100}%` }} />
                </div>

                <div className="flex flex-wrap gap-3 text-xs">
                  <Link to={`/track/${o.invoice_number || o.id}`} className="text-primary font-semibold hover:underline">Detailed tracking →</Link>
                  <Link to={`/invoice/${o.invoice_number || o.id}`} className="text-muted-foreground hover:text-foreground">View invoice</Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AccountLayout>
  );
};

export default AccountTracking;

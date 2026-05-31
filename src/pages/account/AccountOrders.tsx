import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AccountLayout from "@/components/account/AccountLayout";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { apiGet, apiPost } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Package, Search, ShoppingBag, ChevronRight, Ban, Loader2, Link2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { usePageTitle } from "@/hooks/use-page-title";
import { useSEO } from "@/hooks/use-seo";
import BookingStatusCard from "@/components/orders/BookingStatusCard";
import { useOrdersRealtime } from "@/hooks/useOrdersRealtime";

const CANCELLABLE = new Set(["pending", "confirmed"]);

const statusTone: Record<string, string> = {
  paid: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  completed: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  pending: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
  cancelled: "bg-muted text-muted-foreground border-border",
};

const AccountOrders = () => {
  usePageTitle("My Orders");
  useSEO({ title: "My Orders", noIndex: true });
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const highlight = searchParams.get("highlight");
  const [filter, setFilter] = useState<"all" | "paid" | "pending">("all");
  const [search, setSearch] = useState("");
  const [cancelTarget, setCancelTarget] = useState<any>(null);
  const [cancelling, setCancelling] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimInvoice, setClaimInvoice] = useState("");
  const [claimEmail, setClaimEmail] = useState("");
  const [claimPhone, setClaimPhone] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<{ invoice?: string; matches: number; matched_fields: string[] } | null>(null);
  const qc = useQueryClient();

  useOrdersRealtime(`account-orders-${user?.id ?? "anon"}`, [
    ["account-orders-full", user?.email],
    ["account-orders", user?.email],
    ["dash-orders", user?.email],
    ["dash-count", user?.email],
  ]);

  const FIELD_LABEL: Record<string, string> = {
    invoice: "Order number",
    email: "Email",
    phone: "Phone",
  };

  useEffect(() => {
    if (claimOpen && user?.email && !claimEmail) setClaimEmail(user.email);
  }, [claimOpen, user?.email, claimEmail]);

  const claimOrder = async () => {
    if (!claimInvoice.trim()) {
      toast.error("Order or invoice number is required");
      return;
    }
    setClaiming(true);
    try {
      const res = await apiPost<{ invoice?: string; matches: number; matched_fields: string[] }>(
        "/orders/claim",
        { invoice: claimInvoice.trim(), email: claimEmail.trim(), phone: claimPhone.trim() },
      );
      if (!res?.matches) throw new Error("Could not claim this order");
      const fields = res.matched_fields || [];
      const labels = fields.map((f) => FIELD_LABEL[f] || f);
      setClaimResult({ invoice: res.invoice, matches: res.matches, matched_fields: fields });
      toast.success(
        `Order ${res.invoice || ""} added — ${res.matches}/3 fields matched`,
        { description: labels.length ? `Matched: ${labels.join(", ")}` : undefined },
      );
      setClaimInvoice(""); setClaimPhone("");
      qc.invalidateQueries({ queryKey: ["account-orders-full", user?.email] });
    } catch (e: any) {
      toast.error(e?.message || "Could not claim this order");
    } finally {
      setClaiming(false);
    }
  };

  useEffect(() => {
    if (!highlight) return;
    const t = setTimeout(() => {
      const el = document.getElementById(`order-${highlight}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 250);
    return () => clearTimeout(t);
  }, [highlight]);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["account-orders-full", user?.email],
    queryFn: () => apiGet<any[]>("/orders/mine"),
    enabled: !!user?.email,
  });

  const filtered = (orders || []).filter((o) => {
    if (filter === "paid" && !(o.status === "paid" || o.status === "completed")) return false;
    if (filter === "pending" && o.status !== "pending") return false;
    if (search) {
      const q = search.toLowerCase();
      const items = Array.isArray(o.items) ? o.items : [];
      return (
        (o.invoice_number || "").toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q) ||
        items.some((it: any) => (it.name || "").toLowerCase().includes(q))
      );
    }
    return true;
  });

  const cancelOrder = async (orderId: string) => {
    setCancelling(true);
    try {
      await apiPost(`/orders/${orderId}/cancel`, {});
      toast.success("Order cancelled");
      setCancelTarget(null);
      qc.invalidateQueries({ queryKey: ["account-orders-full", user?.email] });
    } catch (e: any) {
      toast.error(e?.message || "Could not cancel this order");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <AccountLayout title="My Orders" description="All your purchases in one place. Click an order to view its invoice.">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by invoice or item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 p-1 bg-secondary rounded-lg">
          {(["all", "paid", "pending"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                filter === k ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setClaimOpen(true)}>
          <Link2 className="w-3.5 h-3.5" /> Add an existing order
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card text-center py-12">
          <ShoppingBag className="w-14 h-14 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="font-heading text-lg font-semibold mb-1">No orders found</h3>
          <p className="text-sm text-muted-foreground mb-5">
            {orders?.length ? "Try changing your filter or search." : "Your orders will appear here after your first purchase."}
          </p>
          <Link to="/services" className="text-sm font-semibold text-primary hover:underline">
            Browse services →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o: any) => {
            const items = Array.isArray(o.items) ? o.items : [];
            return (
              <Link
                key={o.id}
                id={`order-${o.id}`}
                to={`/invoice/${o.invoice_number || o.id}`}
                className={`block rounded-2xl border bg-card hover:border-primary/40 hover:shadow-sm transition-all p-5 scroll-mt-24 ${
                  highlight === o.id
                    ? "border-primary ring-2 ring-primary/30 shadow-md"
                    : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="font-mono text-sm font-semibold">
                        {o.invoice_number || `#${o.id.slice(0, 8).toUpperCase()}`}
                      </span>
                      <Badge variant="outline" className={statusTone[o.status] || ""}>{o.status}</Badge>
                      {o.service_brief?.booking && (
                        <BookingStatusCard orderId={o.id} serviceBrief={o.service_brief} compact />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      {new Date(o.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </p>
                    <div className="space-y-1">
                      {items.slice(0, 3).map((it: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate text-foreground/85">{it.name}</span>
                          {it.quantity > 1 && <span className="text-xs text-muted-foreground">×{it.quantity}</span>}
                        </div>
                      ))}
                      {items.length > 3 && (
                        <p className="text-xs text-muted-foreground pl-5">+{items.length - 3} more</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="font-heading text-xl font-bold">${Number(o.total).toFixed(2)}</p>
                    <span className="text-xs text-primary font-semibold inline-flex items-center gap-0.5 mt-1">
                      View invoice <ChevronRight className="w-3 h-3" />
                    </span>
                    {CANCELLABLE.has(String(o.status).toLowerCase()) && (
                      <div className="mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setCancelTarget(o);
                          }}
                        >
                          <Ban className="w-3 h-3" /> Cancel order
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => !open && !cancelling && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
            <AlertDialogDescription>
              You're about to cancel order{" "}
              <span className="font-mono font-semibold">
                {cancelTarget?.invoice_number || cancelTarget?.id?.slice(0, 8)}
              </span>
              . Cancellation is only possible while the order is still <strong>pending</strong> or
              <strong> confirmed</strong>. Once work begins (status: processing) the order can't be
              cancelled here — please contact support instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep order</AlertDialogCancel>
            <AlertDialogAction
              disabled={cancelling}
              onClick={(e) => {
                e.preventDefault();
                if (cancelTarget) cancelOrder(cancelTarget.id);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Cancelling…</> : "Cancel order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={claimOpen} onOpenChange={(o) => !claiming && setClaimOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add an existing order</DialogTitle>
            <DialogDescription>
              Have an invoice we created for you? Enter the order number below plus your email and/or phone to verify ownership. At least <strong>2 of 3</strong> details must match the order on file.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-xs">Order / invoice number *</Label>
              <Input value={claimInvoice} onChange={(e) => setClaimInvoice(e.target.value)} placeholder="INV-2026-000123" autoFocus />
            </div>
            <div>
              <Label className="text-xs">Email on the order</Label>
              <Input type="email" value={claimEmail} onChange={(e) => setClaimEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <Label className="text-xs">Phone on the order</Label>
              <Input value={claimPhone} onChange={(e) => setClaimPhone(e.target.value)} placeholder="+8801..." />
              <p className="text-[11px] text-muted-foreground mt-1">We compare the last 8 digits, formatting is ignored.</p>
            </div>
            {claimResult && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
                <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                  Linked {claimResult.invoice ? `${claimResult.invoice} ` : ""}— {claimResult.matches}/3 fields matched
                </p>
                <ul className="mt-1.5 space-y-0.5 text-xs">
                  {(["invoice", "email", "phone"] as const).map((f) => {
                    const ok = claimResult.matched_fields.includes(f);
                    return (
                      <li key={f} className={ok ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}>
                        {ok ? "✓" : "✕"} {FIELD_LABEL[f]}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
          <DialogFooter className="mt-3">
            <Button variant="outline" onClick={() => { setClaimOpen(false); setClaimResult(null); }} disabled={claiming}>
              {claimResult ? "Close" : "Cancel"}
            </Button>
            <Button onClick={claimOrder} disabled={claiming || !claimInvoice.trim()}>
              {claiming ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Verifying…</> : claimResult ? "Claim another" : "Add to my dashboard"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AccountLayout>
  );
};

export default AccountOrders;

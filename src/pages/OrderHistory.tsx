import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { usePageTitle } from "@/hooks/use-page-title";
import { useSEO } from "@/hooks/use-seo";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { Package, ChevronDown, ChevronUp, CheckCircle, Clock, XCircle, Mail, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import ScrollReveal from "@/components/shared/ScrollReveal";

const statusConfig: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  paid: { icon: CheckCircle, color: "text-green-500", label: "Paid" },
  completed: { icon: CheckCircle, color: "text-green-500", label: "Completed" },
  pending: { icon: Clock, color: "text-yellow-500", label: "Pending" },
  failed: { icon: XCircle, color: "text-destructive", label: "Failed" },
  cancelled: { icon: XCircle, color: "text-muted-foreground", label: "Cancelled" },
};

const GuestOrderLookup = () => {
  const [email, setEmail] = useState("");
  const [orders, setOrders] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLookup = async () => {
    if (!email) { toast.error("Please enter your email"); return; }
    try {
      const data = await apiGet<any[]>(`/orders/public/lookup?email=${encodeURIComponent(email)}`);
      setOrders(data || []);
    } catch (err: any) {
      toast.error(err?.message || "Could not fetch orders");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="text-center space-y-2">
        <Mail className="w-12 h-12 text-primary mx-auto opacity-60" />
        <h2 className="font-heading text-xl font-bold text-foreground">Look Up Your Orders</h2>
        <p className="text-sm text-muted-foreground">Enter the email you used during checkout to view your orders.</p>
      </div>
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Email Address</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
            onKeyDown={(e) => e.key === "Enter" && handleLookup()} />
        </div>
        <Button className="w-full" onClick={handleLookup} disabled={loading}>
          {loading ? "Looking up..." : "Find My Orders"}
        </Button>
      </div>
      {orders !== null && (
        orders.length === 0
          ? <p className="text-center text-sm text-muted-foreground py-8">No orders found for this email.</p>
          : <OrderList orders={orders} />
      )}
      <p className="text-center text-xs text-muted-foreground">
        Have an account?{" "}
        <button onClick={() => navigate("/account/login")} className="text-primary hover:underline">Sign in</button>
        {" "}to see orders automatically.
      </p>
    </div>
  );
};

const OrderList = ({ orders }: { orders: any[] }) => {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {orders.map((order) => {
        const isOpen = expanded === order.id;
        const status = statusConfig[order.status] || statusConfig.pending;
        const StatusIcon = status.icon;
        const items = Array.isArray(order.items) ? order.items : [];

        return (
          <motion.div key={order.id} layout className="border border-border rounded-xl bg-card overflow-hidden">
            <button
              onClick={() => setExpanded(isOpen ? null : order.id)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <StatusIcon className={`w-5 h-5 shrink-0 ${status.color}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    Order #{order.id.slice(0, 8)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <Badge variant="secondary" className="text-[10px] capitalize">{status.label}</Badge>
                  <p className="text-sm font-bold text-foreground mt-0.5">${Number(order.total).toFixed(2)}</p>
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </button>
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-border p-4 space-y-3">
                    {items.map((item: any, i: number) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          {item.image_url
                            ? <img src={item.image_url} alt="" loading="lazy" decoding="async" className="w-full h-full rounded-lg object-cover" />
                            : <Package className="w-4 h-4 text-primary" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">Qty: {item.quantity || 1}</p>
                        </div>
                        <span className="text-sm font-semibold text-foreground">${Number(item.price * (item.quantity || 1)).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="pt-3 border-t border-border flex items-center justify-between gap-3 flex-wrap">
                      <p className="text-xs text-muted-foreground">
                        {order.invoice_number ? <>Invoice <span className="font-mono">{order.invoice_number}</span></> : <>Order #{order.id.slice(0, 8)}</>}
                      </p>
                      <a
                        href={`/invoice/${order.invoice_number || order.id}`}
                        className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                      >
                        View invoice →
                      </a>
                    </div>
                    {(order.status === "paid" || order.status === "completed") && (
                      <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Receipt + access details sent to {order.customer_email}
                      </p>
                    )}
                    {order.status === "pending" && (
                      <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Payment is being processed. You'll receive your invoice once confirmed.
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
};

const AuthenticatedOrders = () => {
  const { user } = useAuth();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["my-orders", user?.email],
    queryFn: async () => {
      return apiGet<any[]>("/orders/mine");
    },
    enabled: !!user?.email,
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <ShoppingBag className="w-16 h-16 text-muted-foreground/30 mx-auto" />
        <h2 className="font-heading text-xl font-semibold text-foreground">No orders yet</h2>
        <p className="text-sm text-muted-foreground">Your purchase history will appear here after you buy something.</p>
        <Button variant="outline" onClick={() => window.location.href = "/services"}>Browse Services</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <OrderList orders={orders} />
    </div>
  );
};

const OrderHistory = () => {
  usePageTitle("Order History");
  useSEO({ title: "Order History", noIndex: true });
  const { user, loading } = useAuth();

  return (
    <Layout>
      <section className="section-padding">
        <div className="container-custom">
          <ScrollReveal>
            <div className="text-center mb-10">
              <span className="text-primary text-sm font-semibold uppercase tracking-wider">Orders</span>
              <h1 className="font-heading text-4xl md:text-5xl font-bold mt-3 mb-4">
                Your <span className="gradient-text">Order History</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Track your purchases and access your digital products.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            {loading ? (
              <div className="max-w-2xl mx-auto space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-xl" />
                ))}
              </div>
            ) : user ? (
              <AuthenticatedOrders />
            ) : (
              <GuestOrderLookup />
            )}
          </ScrollReveal>
        </div>
      </section>
    </Layout>
  );
};

export default OrderHistory;

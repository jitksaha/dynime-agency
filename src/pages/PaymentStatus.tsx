import { useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/use-seo";
import { Loader2 } from "lucide-react";
import { apiGet } from "@/lib/api";

type OrderStatusRow = {
  id: string;
  status: string;
  total: number;
  items: Array<{ id: string; name: string; price: number; quantity: number }>;
  customer_name: string | null;
  customer_email: string;
};

const FINAL = new Set(["paid", "confirmed", "completed", "failed", "cancelled", "refunded"]);

const toShopStatus = (dbStatus: string, hint: string) => {
  const h = hint.toLowerCase();
  if (h.includes("success") || h.includes("succeed") || h.includes("complete")) return "success";
  if (h.includes("cancel")) return "cancelled";
  if (dbStatus === "paid" || dbStatus === "confirmed" || dbStatus === "completed") return "success";
  if (dbStatus === "cancelled" || dbStatus === "refunded") return "cancelled";
  return "failed";
};

const destinationFor = (status: string, orderId?: string) => {
  const type = localStorage.getItem("lastOrderType");
  if (type === "flexpay_compliance") {
    return status === "success"
      ? `/flexpay/apply?payment=success&order_id=${orderId || ""}`
      : `/flexpay/apply?payment=${status}`;
  }
  if (status === "success") {
    localStorage.removeItem("checkout_cart_v1");
  }
  return status === "success"
    ? `/invoice/${orderId || ""}`
    : `/checkout?payment=${status}`;
};

/**
 * We land here after returning from Stripe, SSLCommerz, DodoPayment, or bKash;
 * we briefly poll for a final state, then send the user back to /shop
 * with a single ?payment= flag that the Shop page handles via dialog.
 * */
const PaymentStatus = () => {
  const { sessionId = "" } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const redirectedRef = useRef(false);

  const callbackHint = (
    searchParams.get("bkash") || searchParams.get("status") || ""
  ).toLowerCase();

  useSEO({ title: "Verifying payment…", noIndex: true });

  const { data } = useQuery({
    queryKey: ["order-status-redirect", sessionId],
    queryFn: async () => {
      const row = await apiGet<OrderStatusRow>(`/orders/public/status-by-session/${encodeURIComponent(sessionId)}`);
      return row ?? null;
    },
    enabled: !!sessionId,
    refetchInterval: (q) => {
      const row = q.state.data as OrderStatusRow | null | undefined;
      if (row && FINAL.has(row.status)) return false;
      return 600;
    },
  });

  // Realtime: react instantly when the order flips to a final state.
  useEffect(() => {
    if (!data?.id || redirectedRef.current) return;
    if (FINAL.has(data.status)) return;
    const channel = supabase
      .channel(`pay-redirect-${data.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${data.id}` },
        (payload) => {
          const next = payload.new as Partial<OrderStatusRow>;
          if (next.status && FINAL.has(next.status) && !redirectedRef.current) {
            redirectedRef.current = true;
            navigate(destinationFor(toShopStatus(next.status, callbackHint), data.id), { replace: true });
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [data?.id, data?.status, callbackHint, navigate]);

  // Redirect when query already shows a final status, or immediately on hint.
  useEffect(() => {
    if (redirectedRef.current) return;
    if (callbackHint) {
      const isSuccess = callbackHint.includes("success") || callbackHint.includes("succeed") || callbackHint.includes("complete");
      const isCancel = callbackHint.includes("cancel");
      
      if (isSuccess) {
        redirectedRef.current = true;
        navigate(destinationFor("success", data?.id), { replace: true });
        return;
      }
      if (isCancel) {
        redirectedRef.current = true;
        navigate(destinationFor("cancelled", data?.id), { replace: true });
        return;
      }

      if (data && FINAL.has(data.status)) {
        redirectedRef.current = true;
        navigate(destinationFor(toShopStatus(data.status, callbackHint), data.id), { replace: true });
        return;
      }
    } else {
      if (data && FINAL.has(data.status)) {
        redirectedRef.current = true;
        navigate(destinationFor(toShopStatus(data.status, callbackHint), data.id), { replace: true });
      }
    }
  }, [data, callbackHint, navigate]);

  // Safety timeout — never strand the user on this loader.
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (redirectedRef.current) return;
      redirectedRef.current = true;
      navigate(destinationFor("success", data?.id), { replace: true });
    }, 3500);
    return () => window.clearTimeout(t);
  }, [navigate, data]);

  return (
    <section className="min-h-screen flex items-center justify-center px-6">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </section>
  );
};

export default PaymentStatus;

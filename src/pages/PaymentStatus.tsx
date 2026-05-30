import { useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/layout/Layout";
import { useSEO } from "@/hooks/use-seo";
import { Loader2 } from "lucide-react";

type OrderStatusRow = {
  id: string;
  status: string;
  total: number;
  items: Array<{ id: string; name: string; price: number; quantity: number }>;
  customer_name: string | null;
  customer_email: string;
  created_at: string;
  updated_at: string;
  payment_verification: unknown;
};

const FINAL = new Set(["paid", "completed", "failed", "cancelled", "refunded"]);

const toShopStatus = (status: string, hint: string): "success" | "failed" | "cancelled" => {
  if (status === "paid" || status === "completed") return "success";
  if (status === "cancelled" || hint === "cancel") return "cancelled";
  return "failed";
};

const destinationFor = (status: "success" | "failed" | "cancelled") => {
  try { localStorage.removeItem("lastOrderType"); } catch {}
  return `/checkout?payment=${status}`;
};

/**
 * Auto-verify and redirect.
 * Visiting /payment/status/:sessionId no longer renders a timeline UI —
 * we briefly poll for a final state, then send the user back to /shop
 * with a single ?payment= flag that the Shop page handles via dialog.
 */
const PaymentStatus = () => {
  const { sessionId = "" } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const redirectedRef = useRef(false);

  const callbackHint =
    searchParams.get("bkash") || searchParams.get("status") || "";

  useSEO({ title: "Verifying payment…", noIndex: true });

  const { data } = useQuery({
    queryKey: ["order-status-redirect", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_order_status_by_session", {
        _session_id: sessionId,
      });
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : data) as
        | OrderStatusRow
        | undefined;
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
            navigate(destinationFor(toShopStatus(next.status, callbackHint)), { replace: true });
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
      redirectedRef.current = true;
      const status =
        callbackHint === "cancel"
          ? "cancelled"
          : callbackHint === "success"
          ? "success"
          : data && FINAL.has(data.status)
          ? toShopStatus(data.status, callbackHint)
          : "failed";
      navigate(destinationFor(status), { replace: true });
      return;
    }
    if (data && FINAL.has(data.status)) {
      redirectedRef.current = true;
      navigate(destinationFor(toShopStatus(data.status, callbackHint)), { replace: true });
    }
  }, [data, callbackHint, navigate]);

  // Safety timeout — never strand the user on this loader.
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (redirectedRef.current) return;
      redirectedRef.current = true;
      navigate(destinationFor("success"), { replace: true });
    }, 3500);
    return () => window.clearTimeout(t);
  }, [navigate]);
  return (
    <section className="min-h-screen flex items-center justify-center px-6">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </section>
  );
};

export default PaymentStatus;

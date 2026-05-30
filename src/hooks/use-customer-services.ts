import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export type CustomerService = {
  id: string;
  user_id: string | null;
  customer_email: string;
  order_id: string | null;
  invoice_number: string | null;
  service_name: string;
  service_slug: string | null;
  category: string;
  type: "recurring" | "one_time";
  status: string;
  billing_cycle: string | null;
  price: number;
  currency: string;
  quantity: number;
  started_at: string;
  current_period_end: string | null;
  delivered_at: string | null;
  auto_renew: boolean;
  payment_method: any;
  metadata: any;
  created_at: string;
  updated_at: string;
};

export const useCustomerServices = (filter?: { category?: string; type?: "recurring" | "one_time" }) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["customer-services", user?.email, filter],
    queryFn: async () => {
      let q = supabase
        .from("customer_services")
        .select("*")
        .order("created_at", { ascending: false });
      if (filter?.category) q = q.eq("category", filter.category);
      if (filter?.type) q = q.eq("type", filter.type);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as CustomerService[];
    },
    enabled: !!user?.email,
  });
};

export const daysUntil = (iso: string | null) => {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
};

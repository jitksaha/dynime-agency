import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
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
      const params = new URLSearchParams();
      if (filter?.category) params.set("category", filter.category);
      if (filter?.type) params.set("type", filter.type);
      const qs = params.toString() ? `?${params.toString()}` : "";
      return apiGet<CustomerService[]>(`/subscriptions/mine${qs}`);
    },
    enabled: !!user?.email,
  });
};

export const daysUntil = (iso: string | null) => {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
};

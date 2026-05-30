export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  /** Tier period label (e.g. "/month", "one-time"). Used to auto-create recurring services. */
  period?: string;
  /** Originating service slug (helps look up category & service metadata). */
  slug?: string;
  /** Optional category key (dws/dms/dcs/dss). */
  category?: string;
}

export interface BillingAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  company?: string;
  tax_id?: string;
  phone?: string;
}

export interface MilestoneStage {
  label: string;
  percent: number;
  amount?: number;
}

export interface TaxBreakdownInput {
  amount: number;
  percent: number;
  mode: "inclusive" | "exclusive";
  label: string;
}

export interface CheckoutRequest {
  gateway: "stripe" | "sslcommerz" | "dodopayment" | "bkash" | "bank_transfer";
  customer_name: string;
  customer_email: string;
  items: CartItem[];
  total: number;
  charge_now?: number;
  coupon_code?: string | null;
  tax?: TaxBreakdownInput | null;
  milestone?: { mode: string | null; stages: MilestoneStage[]; total: number } | null;
  success_url?: string;
  cancel_url?: string;
  service_brief?: Record<string, unknown> | null;
  billing_address?: BillingAddress | null;
  notes?: string | null;
  currency?: string | null;
  existing_order_id?: string | null;
}

export interface GlobalUrls {
  success_url: string;
  fail_url: string;
  cancel_url: string;
}

export interface GatewayResult {
  checkout_url?: string;
  session_id: string;
  gateway: string;
  payment_id?: string;
  sandbox?: boolean;
  fx_rate?: number;
  bdt_amount?: number;
  usd_amount?: number;
  pending?: boolean;
  accounts?: unknown[];
  instructions?: unknown;
  display_name?: unknown;
  message?: string;
  _skip_order_insert?: boolean;
}

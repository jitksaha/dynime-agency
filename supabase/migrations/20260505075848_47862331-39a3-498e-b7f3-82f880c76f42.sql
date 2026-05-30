CREATE OR REPLACE FUNCTION public.lookup_order_for_tracking(_term text)
RETURNS TABLE(
  id uuid, invoice_number text, status text, total numeric, subtotal numeric,
  discount_amount numeric, currency text, items jsonb, service_brief jsonb,
  billing_address jsonb, customer_name text, customer_email text,
  coupon_code text, notes text, created_at timestamptz, updated_at timestamptz,
  payment_gateway text, stripe_session_id text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH q AS (SELECT btrim(_term) AS t)
  SELECT o.id, o.invoice_number, o.status, o.total, o.subtotal,
         o.discount_amount, o.currency, o.items, o.service_brief,
         o.billing_address, o.customer_name, o.customer_email,
         o.coupon_code, o.notes, o.created_at, o.updated_at,
         o.payment_gateway, o.stripe_session_id
  FROM public.orders o, q
  WHERE q.t <> ''
    AND (
      o.invoice_number = q.t
      OR o.stripe_session_id = q.t
      OR (q.t ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          AND o.id = q.t::uuid)
      OR lower(o.customer_email) = lower(q.t)
    )
  ORDER BY o.created_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_order_for_tracking(text) TO anon, authenticated;
DROP FUNCTION IF EXISTS public.get_invoice_by_number(text);
CREATE OR REPLACE FUNCTION public.get_invoice_by_number(_invoice text)
 RETURNS TABLE(id uuid, invoice_number text, status text, total numeric, subtotal numeric, discount_amount numeric, currency text, items jsonb, service_brief jsonb, billing_address jsonb, customer_name text, customer_email text, coupon_code text, notes text, created_at timestamp with time zone, updated_at timestamp with time zone, payment_gateway text, stripe_session_id text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT o.id, o.invoice_number, o.status, o.total, o.subtotal,
         o.discount_amount, o.currency, o.items, o.service_brief,
         o.billing_address, o.customer_name, o.customer_email,
         o.coupon_code, o.notes, o.created_at, o.updated_at,
         o.payment_gateway, o.stripe_session_id
  FROM public.orders o
  WHERE o.invoice_number = _invoice
  LIMIT 1;
$function$;
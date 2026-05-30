ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_verification jsonb;

DROP FUNCTION IF EXISTS public.get_order_status_by_session(text);

CREATE FUNCTION public.get_order_status_by_session(_session_id text)
 RETURNS TABLE(
   id uuid,
   status text,
   total numeric,
   items jsonb,
   customer_name text,
   customer_email text,
   created_at timestamp with time zone,
   updated_at timestamp with time zone,
   payment_verification jsonb
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT o.id, o.status, o.total, o.items, o.customer_name, o.customer_email,
         o.created_at, o.updated_at, o.payment_verification
  FROM public.orders o
  WHERE o.stripe_session_id = _session_id
  LIMIT 1;
$function$;
-- Public lookup for the status page: returns only safe fields for one order
-- identified by its session id. Avoids opening up the orders table RLS.
CREATE OR REPLACE FUNCTION public.get_order_status_by_session(_session_id text)
RETURNS TABLE (
  id uuid,
  status text,
  total numeric,
  items jsonb,
  customer_name text,
  customer_email text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.status, o.total, o.items, o.customer_name, o.customer_email,
         o.created_at, o.updated_at
  FROM public.orders o
  WHERE o.stripe_session_id = _session_id
  LIMIT 1;
$$;

-- Allow anonymous + authenticated callers (no row leak: only the matching session id resolves)
GRANT EXECUTE ON FUNCTION public.get_order_status_by_session(text) TO anon, authenticated;
-- Admins and sales can delete orders
CREATE POLICY "Admins can delete orders"
ON public.orders
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Sales can delete orders"
ON public.orders
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'sales'::public.app_role));

-- Customer-initiated cancellation: only own orders, only while pending/confirmed.
CREATE OR REPLACE FUNCTION public.cancel_own_order(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o public.orders;
  uid uuid := auth.uid();
  uemail text := auth.jwt() ->> 'email';
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF NOT (
    o.user_id = uid
    OR (uemail IS NOT NULL AND lower(o.customer_email) = lower(uemail))
    OR public.is_admin(uid)
    OR public.has_role(uid, 'sales'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  IF lower(coalesce(o.status,'')) NOT IN ('pending','confirmed') THEN
    RAISE EXCEPTION 'This order can no longer be cancelled (current status: %)', o.status;
  END IF;

  UPDATE public.orders
     SET status = 'cancelled',
         updated_at = now()
   WHERE id = _order_id;

  RETURN jsonb_build_object('ok', true, 'id', _order_id, 'status', 'cancelled');
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_own_order(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.cancel_own_order(uuid) TO authenticated;
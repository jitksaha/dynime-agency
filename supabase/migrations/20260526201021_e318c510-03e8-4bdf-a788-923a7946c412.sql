
CREATE OR REPLACE FUNCTION public.flexpay_mark_installment_failed(
  _installment_id uuid,
  _reason text DEFAULT NULL,
  _order_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
BEGIN
  SELECT p.user_id INTO _user_id
  FROM public.flexpay_emi_installments i
  JOIN public.flexpay_emi_plans p ON p.id = i.plan_id
  WHERE i.id = _installment_id;

  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Installment not found';
  END IF;

  -- Allow the installment's owner OR a backend caller (service_role) to mark
  -- it as failed. Customers can only fail their own installments.
  IF _user_id <> auth.uid() AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.flexpay_emi_installments
  SET status = 'failed',
      failed_at = now(),
      failure_reason = COALESCE(_reason, failure_reason),
      last_attempt_order_id = COALESCE(_order_id, last_attempt_order_id)
  WHERE id = _installment_id
    AND status <> 'paid';
END;
$$;

GRANT EXECUTE ON FUNCTION public.flexpay_mark_installment_failed(uuid, text, uuid) TO authenticated, service_role;

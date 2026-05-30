
ALTER TABLE public.flexpay_emi_installments
  ADD COLUMN IF NOT EXISTS processing_at timestamptz,
  ADD COLUMN IF NOT EXISTS failed_at timestamptz,
  ADD COLUMN IF NOT EXISTS failure_reason text,
  ADD COLUMN IF NOT EXISTS last_attempt_order_id uuid;

-- Mark an installment as "processing" the moment the user is redirected to a gateway.
CREATE OR REPLACE FUNCTION public.flexpay_mark_installment_processing(
  _installment_id uuid,
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

  IF _user_id <> auth.uid() AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.flexpay_emi_installments
  SET status = 'processing',
      processing_at = now(),
      failed_at = NULL,
      failure_reason = NULL,
      last_attempt_order_id = COALESCE(_order_id, last_attempt_order_id)
  WHERE id = _installment_id
    AND status IN ('pending', 'failed', 'processing');
END;
$$;

-- Mark an installment as failed (called from the payment webhook).
CREATE OR REPLACE FUNCTION public.flexpay_mark_installment_failed(
  _installment_id uuid,
  _reason text DEFAULT NULL,
  _order_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.flexpay_emi_installments
  SET status = 'failed',
      failed_at = now(),
      failure_reason = COALESCE(_reason, failure_reason),
      last_attempt_order_id = COALESCE(_order_id, last_attempt_order_id)
  WHERE id = _installment_id
    AND status <> 'paid';
END;
$$;

GRANT EXECUTE ON FUNCTION public.flexpay_mark_installment_processing(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.flexpay_mark_installment_failed(uuid, text, uuid) TO service_role;

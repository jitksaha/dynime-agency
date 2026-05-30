CREATE OR REPLACE FUNCTION public.flexpay_pay_installment(_installment_id uuid, _order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inst record;
  v_plan record;
  v_unpaid int;
BEGIN
  SELECT * INTO v_inst FROM public.flexpay_emi_installments WHERE id = _installment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Installment not found'; END IF;
  IF v_inst.status = 'paid' THEN RETURN jsonb_build_object('ok', true, 'already_paid', true); END IF;

  UPDATE public.flexpay_emi_installments
  SET status = 'paid', paid_at = now(), paid_order_id = _order_id
  WHERE id = _installment_id;

  SELECT * INTO v_plan FROM public.flexpay_emi_plans WHERE id = v_inst.plan_id FOR UPDATE;
  IF FOUND THEN
    UPDATE public.flexpay_credit_accounts
    SET used_limit = GREATEST(0, used_limit - v_inst.amount), updated_at = now()
    WHERE user_id = v_plan.user_id;

    SELECT count(*) INTO v_unpaid FROM public.flexpay_emi_installments WHERE plan_id = v_plan.id AND status <> 'paid';
    IF v_unpaid = 0 THEN
      UPDATE public.flexpay_emi_plans SET status = 'completed', completed_at = now() WHERE id = v_plan.id;
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.flexpay_pay_installment(uuid, uuid) TO service_role;
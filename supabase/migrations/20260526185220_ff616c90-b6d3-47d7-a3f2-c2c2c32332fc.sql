-- Atomic FlexPay checkout: creates order + EMI plan + installments + reserves credit, all-or-nothing
CREATE OR REPLACE FUNCTION public.flexpay_checkout(
  _items jsonb,
  _customer_name text,
  _customer_email text,
  _subtotal numeric,
  _total numeric,
  _tenure_months integer,
  _service_brief jsonb DEFAULT '{}'::jsonb,
  _billing_address jsonb DEFAULT '{}'::jsonb,
  _notes text DEFAULT NULL,
  _coupon_code text DEFAULT NULL,
  _discount_amount numeric DEFAULT 0,
  _currency text DEFAULT 'USD',
  _down_payment numeric DEFAULT 0,
  _tax_amount numeric DEFAULT 0,
  _tax_percent numeric DEFAULT 0,
  _tax_mode text DEFAULT NULL,
  _tax_label text DEFAULT NULL,
  _service_category text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _order_id uuid;
  _plan jsonb;
BEGIN
  IF _user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF _total IS NULL OR _total <= 0 THEN
    RAISE EXCEPTION 'Invalid order total';
  END IF;

  -- 1) Create the order row first (status=paid since BNPL is funded by credit)
  INSERT INTO public.orders (
    customer_name, customer_email, items, subtotal, total,
    status, payment_gateway, coupon_code, discount_amount,
    service_brief, billing_address, notes, currency, user_id,
    tax_amount, tax_percent, tax_mode, tax_label, service_category
  ) VALUES (
    _customer_name, _customer_email, _items, COALESCE(_subtotal, _total), _total,
    'paid', 'flexpay', _coupon_code, COALESCE(_discount_amount, 0),
    COALESCE(_service_brief, '{}'::jsonb), COALESCE(_billing_address, '{}'::jsonb),
    _notes, COALESCE(_currency, 'USD'), _user,
    COALESCE(_tax_amount, 0), COALESCE(_tax_percent, 0), _tax_mode, _tax_label, _service_category
  ) RETURNING id INTO _order_id;

  -- 2) Reserve credit + create plan + installments (same transaction)
  _plan := public.flexpay_create_emi_plan(
    _principal := _total,
    _tenure_months := _tenure_months,
    _down_payment := COALESCE(_down_payment, 0),
    _currency := COALESCE(_currency, 'USD'),
    _order_id := _order_id
  );

  RETURN jsonb_build_object(
    'order_id', _order_id,
    'plan', _plan
  );
END;
$$;

REVOKE ALL ON FUNCTION public.flexpay_checkout(jsonb, text, text, numeric, numeric, integer, jsonb, jsonb, text, text, numeric, text, numeric, numeric, numeric, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.flexpay_checkout(jsonb, text, text, numeric, numeric, integer, jsonb, jsonb, text, text, numeric, text, numeric, numeric, numeric, text, text, text) TO authenticated;

-- Admin: adjust a user's FlexPay used credit
CREATE OR REPLACE FUNCTION public.flexpay_admin_set_used_limit(
  _account_id uuid,
  _new_used_limit numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = '42501';
  END IF;
  IF _new_used_limit IS NULL OR _new_used_limit < 0 THEN
    RAISE EXCEPTION 'Invalid used_limit';
  END IF;
  UPDATE public.flexpay_credit_accounts
    SET used_limit = _new_used_limit, updated_at = now()
    WHERE id = _account_id;
END;
$$;

REVOKE ALL ON FUNCTION public.flexpay_admin_set_used_limit(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.flexpay_admin_set_used_limit(uuid, numeric) TO authenticated;

-- Admin: update an installment (amount / due date / status)
CREATE OR REPLACE FUNCTION public.flexpay_admin_update_installment(
  _installment_id uuid,
  _amount numeric DEFAULT NULL,
  _due_date date DEFAULT NULL,
  _status text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _old public.flexpay_emi_installments%ROWTYPE;
  _plan public.flexpay_emi_plans%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _old FROM public.flexpay_emi_installments WHERE id = _installment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Installment not found';
  END IF;

  UPDATE public.flexpay_emi_installments
    SET amount   = COALESCE(_amount, amount),
        due_date = COALESCE(_due_date, due_date),
        status   = COALESCE(_status, status),
        paid_at  = CASE WHEN COALESCE(_status, status) = 'paid' AND paid_at IS NULL THEN now()
                        WHEN COALESCE(_status, status) <> 'paid' THEN NULL
                        ELSE paid_at END
    WHERE id = _installment_id;

  -- If marked paid (was not paid), release that amount from the account's used_limit
  IF _status = 'paid' AND _old.status <> 'paid' THEN
    SELECT * INTO _plan FROM public.flexpay_emi_plans WHERE id = _old.plan_id;
    UPDATE public.flexpay_credit_accounts
      SET used_limit = GREATEST(0, used_limit - COALESCE(_amount, _old.amount)),
          updated_at = now()
      WHERE user_id = _plan.user_id AND status = 'active';
  END IF;

  -- If marked unpaid (was paid), re-reserve the amount
  IF _status IS NOT NULL AND _status <> 'paid' AND _old.status = 'paid' THEN
    SELECT * INTO _plan FROM public.flexpay_emi_plans WHERE id = _old.plan_id;
    UPDATE public.flexpay_credit_accounts
      SET used_limit = used_limit + COALESCE(_amount, _old.amount),
          updated_at = now()
      WHERE user_id = _plan.user_id AND status = 'active';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.flexpay_admin_update_installment(uuid, numeric, date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.flexpay_admin_update_installment(uuid, numeric, date, text) TO authenticated;
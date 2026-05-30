CREATE OR REPLACE FUNCTION public.flexpay_create_emi_plan(
  _principal numeric,
  _tenure_months integer,
  _down_payment numeric DEFAULT 0,
  _currency text DEFAULT 'USD',
  _order_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _acct public.flexpay_credit_accounts%ROWTYPE;
  _settings public.flexpay_settings%ROWTYPE;
  _tier jsonb;
  _fee_pct numeric := 0;
  _fee numeric := 0;
  _dp numeric := 0;
  _financed numeric := 0;
  _monthly numeric := 0;
  _total numeric := 0;
  _available numeric := 0;
  _plan_id uuid;
  _i integer;
BEGIN
  IF _user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF _principal IS NULL OR _principal <= 0 THEN
    RAISE EXCEPTION 'Invalid principal amount';
  END IF;
  IF _tenure_months IS NULL OR _tenure_months < 1 THEN
    RAISE EXCEPTION 'Invalid tenure';
  END IF;

  SELECT * INTO _acct FROM public.flexpay_credit_accounts
    WHERE user_id = _user AND status = 'active' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active FlexPay credit account. Please apply for credit first.';
  END IF;
  IF _tenure_months > _acct.max_tenure_months THEN
    RAISE EXCEPTION 'Tenure exceeds your approved maximum of % months', _acct.max_tenure_months;
  END IF;

  SELECT * INTO _settings FROM public.flexpay_settings WHERE id = 1;
  IF _settings.allowed_tenures IS NOT NULL
     AND NOT (_tenure_months = ANY(_settings.allowed_tenures))
  THEN
    RAISE EXCEPTION 'Tenure not allowed';
  END IF;

  -- Resolve per-tenure fee
  IF _settings.tenure_fee_tiers IS NOT NULL THEN
    FOR _tier IN SELECT * FROM jsonb_array_elements(_settings.tenure_fee_tiers) LOOP
      IF (_tier->>'tenure')::int = _tenure_months THEN
        _fee_pct := COALESCE((_tier->>'fee_percent')::numeric, 0);
        EXIT;
      END IF;
    END LOOP;
  END IF;
  IF _fee_pct = 0 AND _settings.processing_fee_percent IS NOT NULL THEN
    -- only fall back to global if there was no matching tier
    IF _settings.tenure_fee_tiers IS NULL OR NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(_settings.tenure_fee_tiers) t
      WHERE (t->>'tenure')::int = _tenure_months
    ) THEN
      _fee_pct := _settings.processing_fee_percent;
    END IF;
  END IF;

  _fee := round((_principal * _fee_pct / 100)::numeric, 2);
  _dp := GREATEST(COALESCE(_down_payment, 0),
                  round((_principal * COALESCE(_settings.down_payment_percent, 0) / 100)::numeric, 2));
  _financed := GREATEST(0, _principal + _fee - _dp);
  _monthly := round((_financed / _tenure_months)::numeric, 2);
  _total := round((_monthly * _tenure_months + _dp)::numeric, 2);

  _available := GREATEST(0, _acct.total_limit - _acct.used_limit);
  IF _financed > _available THEN
    RAISE EXCEPTION 'Insufficient FlexPay credit. Available % %, required %', _available, _acct.currency, _financed;
  END IF;

  -- Reserve credit
  UPDATE public.flexpay_credit_accounts
    SET used_limit = used_limit + _financed, updated_at = now()
    WHERE id = _acct.id;

  -- Create plan
  INSERT INTO public.flexpay_emi_plans (
    user_id, order_id, principal, processing_fee, down_payment, financed_amount,
    tenure_months, monthly_amount, total_payable, currency, status
  ) VALUES (
    _user, _order_id, _principal, _fee, _dp, _financed,
    _tenure_months, _monthly, _total, COALESCE(_currency, _acct.currency), 'active'
  ) RETURNING id INTO _plan_id;

  -- Generate installments
  FOR _i IN 1.._tenure_months LOOP
    INSERT INTO public.flexpay_emi_installments (plan_id, sequence, due_date, amount, status)
    VALUES (_plan_id, _i, (CURRENT_DATE + (_i * INTERVAL '30 days'))::date, _monthly, 'pending');
  END LOOP;

  RETURN jsonb_build_object(
    'plan_id', _plan_id,
    'principal', _principal,
    'fee_percent', _fee_pct,
    'processing_fee', _fee,
    'down_payment', _dp,
    'financed_amount', _financed,
    'monthly_amount', _monthly,
    'total_payable', _total,
    'tenure_months', _tenure_months,
    'currency', COALESCE(_currency, _acct.currency)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.flexpay_create_emi_plan(numeric, integer, numeric, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.flexpay_create_emi_plan(numeric, integer, numeric, text, uuid) TO authenticated;
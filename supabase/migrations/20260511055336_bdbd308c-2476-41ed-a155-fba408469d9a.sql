CREATE OR REPLACE FUNCTION public.validate_coupon(_code text, _order_total numeric)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.coupons;
  discount NUMERIC := 0;
  stages jsonb := '[]'::jsonb;
  raw_stage jsonb;
  stage_label text;
  stage_percent numeric;
  stage_sum numeric := 0;
  stage_count integer := 0;
  advance numeric;
BEGIN
  SELECT * INTO c FROM public.coupons WHERE code = upper(trim(_code));
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Coupon not found');
  END IF;
  IF NOT c.is_active THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Coupon is inactive');
  END IF;
  IF c.starts_at IS NOT NULL AND c.starts_at > now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Coupon not yet active');
  END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Coupon has expired');
  END IF;
  IF c.usage_limit IS NOT NULL AND c.usage_count >= c.usage_limit THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Coupon usage limit reached');
  END IF;
  IF _order_total < c.min_order_amount THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Minimum order amount is ' || c.min_order_amount);
  END IF;

  IF c.discount_type = 'percentage' THEN
    discount := round((_order_total * c.discount_value / 100)::numeric, 2);
    IF c.max_discount_amount IS NOT NULL AND discount > c.max_discount_amount THEN
      discount := c.max_discount_amount;
    END IF;
  ELSE
    discount := c.discount_value;
  END IF;

  IF discount > _order_total THEN
    discount := _order_total;
  END IF;

  IF COALESCE(c.is_milestone, false) THEN
    IF c.milestone_mode = 'two_step' THEN
      advance := c.advance_percent;
      IF (advance IS NULL OR advance <= 0 OR advance >= 100)
         AND jsonb_array_length(COALESCE(c.milestone_stages, '[]'::jsonb)) > 0
         AND (c.milestone_stages->0 ? 'percent') THEN
        BEGIN
          advance := (c.milestone_stages->0->>'percent')::numeric;
        EXCEPTION WHEN invalid_text_representation THEN
          advance := NULL;
        END;
      END IF;

      IF advance IS NULL OR advance <= 0 OR advance >= 100 THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Milestone advance percent must be between 1 and 99');
      END IF;

      stages := jsonb_build_array(
        jsonb_build_object('label', 'Advance', 'percent', advance),
        jsonb_build_object('label', 'Final', 'percent', 100 - advance)
      );
    ELSIF c.milestone_mode = 'custom' THEN
      IF jsonb_typeof(COALESCE(c.milestone_stages, '[]'::jsonb)) <> 'array' THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Milestone stages must be a list');
      END IF;

      FOR raw_stage IN SELECT value FROM jsonb_array_elements(COALESCE(c.milestone_stages, '[]'::jsonb))
      LOOP
        BEGIN
          stage_percent := (raw_stage->>'percent')::numeric;
        EXCEPTION WHEN invalid_text_representation THEN
          stage_percent := NULL;
        END;
        IF stage_percent IS NULL OR stage_percent <= 0 THEN
          CONTINUE;
        END IF;
        stage_label := NULLIF(btrim(COALESCE(raw_stage->>'label', '')), '');
        stage_count := stage_count + 1;
        stage_sum := stage_sum + stage_percent;
        stages := stages || jsonb_build_array(
          jsonb_build_object('label', COALESCE(stage_label, 'Stage ' || stage_count), 'percent', stage_percent)
        );
      END LOOP;

      IF stage_count < 2 THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Milestone coupons need at least 2 stages');
      END IF;
      IF abs(stage_sum - 100) > 0.01 THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Milestone stages must total 100%');
      END IF;
    ELSE
      RETURN jsonb_build_object('valid', false, 'error', 'Milestone coupon mode is invalid');
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'code', c.code,
    'discount_type', c.discount_type,
    'discount_value', c.discount_value,
    'discount_amount', discount,
    'description', c.description,
    'is_milestone', COALESCE(c.is_milestone, false),
    'milestone_mode', c.milestone_mode,
    'advance_percent', CASE WHEN c.milestone_mode = 'two_step' THEN advance ELSE c.advance_percent END,
    'milestone_stages', stages
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_next_milestone_invoice(_milestone_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m public.order_milestones;
  parent public.orders;
  new_order_id uuid;
  parent_invoice text;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can generate milestone invoices';
  END IF;

  SELECT * INTO m FROM public.order_milestones WHERE id = _milestone_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Milestone not found'; END IF;
  IF m.status NOT IN ('pending') THEN
    RAISE EXCEPTION 'Milestone is not pending (status=%)', m.status;
  END IF;

  SELECT * INTO parent FROM public.orders WHERE id = m.parent_order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Parent order missing'; END IF;
  parent_invoice := COALESCE(parent.invoice_number, parent.id::text);

  INSERT INTO public.orders (
    user_id, customer_email, customer_name, items, currency,
    subtotal, total, discount_amount, status, notes,
    billing_address, service_category, service_brief, payment_gateway, coupon_code
  ) VALUES (
    parent.user_id, parent.customer_email, parent.customer_name,
    jsonb_build_array(jsonb_build_object(
      'id', 'milestone-' || m.id::text,
      'name', m.label || ' payment (' || trim(to_char(m.percent, 'FM999999990.##')) || '%)',
      'price', m.amount,
      'quantity', 1,
      'description', 'Milestone ' || m.sequence || ' for invoice ' || parent_invoice
    )),
    m.currency,
    m.amount, m.amount, 0, 'pending',
    'Milestone ' || m.sequence || ' (' || m.label || ') for invoice ' || parent_invoice,
    parent.billing_address, parent.service_category,
    COALESCE(parent.service_brief, '{}'::jsonb) || jsonb_build_object(
      'milestone_root', false,
      'milestone_of', parent.id,
      'milestone_id', m.id,
      'milestone_label', m.label,
      'milestone_sequence', m.sequence,
      'milestone_percent', m.percent,
      'primary_service', m.label
    ),
    parent.payment_gateway,
    parent.coupon_code
  ) RETURNING id INTO new_order_id;

  UPDATE public.order_milestones
     SET child_order_id = new_order_id,
         status = 'invoiced',
         invoiced_at = now()
   WHERE id = m.id;

  RETURN new_order_id;
END;
$$;
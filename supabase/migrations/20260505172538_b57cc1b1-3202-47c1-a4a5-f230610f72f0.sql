
CREATE OR REPLACE FUNCTION public.validate_coupon(_code text, _order_total numeric)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.coupons;
  discount NUMERIC;
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
    RETURN jsonb_build_object('valid', false, 'error',
      'Minimum order amount is ' || c.min_order_amount);
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

  RETURN jsonb_build_object(
    'valid', true,
    'code', c.code,
    'discount_type', c.discount_type,
    'discount_value', c.discount_value,
    'discount_amount', discount,
    'description', c.description,
    'is_milestone', COALESCE(c.is_milestone, false),
    'milestone_mode', c.milestone_mode,
    'advance_percent', c.advance_percent,
    'milestone_stages', COALESCE(c.milestone_stages, '[]'::jsonb)
  );
END;
$$;

-- Coupons table
CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  min_order_amount NUMERIC NOT NULL DEFAULT 0,
  max_discount_amount NUMERIC,
  usage_limit INTEGER,
  usage_count INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Normalize codes to uppercase
CREATE OR REPLACE FUNCTION public.normalize_coupon_code()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.code = upper(trim(NEW.code));
  RETURN NEW;
END;
$$;

CREATE TRIGGER coupons_normalize_code
BEFORE INSERT OR UPDATE ON public.coupons
FOR EACH ROW EXECUTE FUNCTION public.normalize_coupon_code();

CREATE TRIGGER coupons_set_updated_at
BEFORE UPDATE ON public.coupons
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active coupons"
ON public.coupons FOR SELECT
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "Admins can manage coupons"
ON public.coupons FOR ALL TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Add discount tracking on orders
ALTER TABLE public.orders
  ADD COLUMN coupon_code TEXT,
  ADD COLUMN discount_amount NUMERIC NOT NULL DEFAULT 0;

-- Validate a coupon and compute discount (read-only). Returns discount details or error.
CREATE OR REPLACE FUNCTION public.validate_coupon(_code TEXT, _order_total NUMERIC)
RETURNS JSONB
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
    'description', c.description
  );
END;
$$;

-- Atomically redeem (increment counter) when an order is placed.
CREATE OR REPLACE FUNCTION public.redeem_coupon(_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated INTEGER;
BEGIN
  UPDATE public.coupons
     SET usage_count = usage_count + 1
   WHERE code = upper(trim(_code))
     AND is_active = true
     AND (expires_at IS NULL OR expires_at > now())
     AND (usage_limit IS NULL OR usage_count < usage_limit);
  GET DIAGNOSTICS updated = ROW_COUNT;
  RETURN updated > 0;
END;
$$;
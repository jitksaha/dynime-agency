
-- FX Orders: admin-only manual currency exchange POS
CREATE SEQUENCE IF NOT EXISTS public.fx_order_seq;

CREATE TABLE public.fx_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no TEXT UNIQUE,
  order_date TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- We sell `quote_currency` to the customer, and pay/receive `base_currency`
  base_currency TEXT NOT NULL,        -- what we receive from customer (e.g. BDT, USD)
  base_amount NUMERIC(20,8) NOT NULL CHECK (base_amount > 0),

  quote_currency TEXT NOT NULL,       -- what we give to customer (e.g. USDT, BTC)
  quote_amount NUMERIC(20,8) NOT NULL CHECK (quote_amount > 0),

  -- Cost/sell rates in USD per 1 unit of quote_currency for reporting
  cost_rate_usd  NUMERIC(20,8) NOT NULL DEFAULT 0,  -- our cost per quote unit (USD)
  sell_rate_usd  NUMERIC(20,8) NOT NULL DEFAULT 0,  -- our sell price per quote unit (USD)

  -- Derived USD totals (admin enters; we also recompute on save)
  cost_usd       NUMERIC(20,8) NOT NULL DEFAULT 0,
  revenue_usd    NUMERIC(20,8) NOT NULL DEFAULT 0,
  fee_usd        NUMERIC(20,8) NOT NULL DEFAULT 0,
  profit_usd     NUMERIC(20,8) NOT NULL DEFAULT 0,

  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','pending','cancelled')),

  counterparty_name TEXT,
  counterparty_contact TEXT,
  payment_method_in  TEXT,   -- e.g. bKash, Bank, Cash
  payment_method_out TEXT,   -- e.g. Binance, Wallet
  reference TEXT,            -- external txn id
  notes TEXT,

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- GRANTs (admin-only — accessed via authenticated role; RLS narrows to admins)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fx_orders TO authenticated;
GRANT ALL ON public.fx_orders TO service_role;

ALTER TABLE public.fx_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage fx_orders"
ON public.fx_orders
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Auto order number + timestamp
CREATE OR REPLACE FUNCTION public.assign_fx_order_no()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.order_no IS NULL OR length(btrim(NEW.order_no)) = 0 THEN
    NEW.order_no := 'FX-' || to_char(now(),'YYYY') || '-' ||
                    lpad(nextval('public.fx_order_seq')::text, 5, '0');
  END IF;
  -- recompute derived totals if admin left them blank
  IF COALESCE(NEW.cost_usd,0) = 0 AND NEW.cost_rate_usd > 0 THEN
    NEW.cost_usd := round((NEW.quote_amount * NEW.cost_rate_usd)::numeric, 8);
  END IF;
  IF COALESCE(NEW.revenue_usd,0) = 0 AND NEW.sell_rate_usd > 0 THEN
    NEW.revenue_usd := round((NEW.quote_amount * NEW.sell_rate_usd)::numeric, 8);
  END IF;
  NEW.profit_usd := round((COALESCE(NEW.revenue_usd,0) - COALESCE(NEW.cost_usd,0) - COALESCE(NEW.fee_usd,0))::numeric, 8);
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER fx_orders_before_insert
BEFORE INSERT ON public.fx_orders
FOR EACH ROW EXECUTE FUNCTION public.assign_fx_order_no();

CREATE OR REPLACE FUNCTION public.fx_orders_before_update()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  NEW.profit_usd := round((COALESCE(NEW.revenue_usd,0) - COALESCE(NEW.cost_usd,0) - COALESCE(NEW.fee_usd,0))::numeric, 8);
  RETURN NEW;
END;
$$;

CREATE TRIGGER fx_orders_before_update
BEFORE UPDATE ON public.fx_orders
FOR EACH ROW EXECUTE FUNCTION public.fx_orders_before_update();

CREATE INDEX idx_fx_orders_status_date ON public.fx_orders(status, order_date DESC);
CREATE INDEX idx_fx_orders_currencies ON public.fx_orders(base_currency, quote_currency);

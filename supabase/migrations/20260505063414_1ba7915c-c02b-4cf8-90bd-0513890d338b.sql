
-- 1. Extend orders table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS is_recurring boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS billing_cycle text,
  ADD COLUMN IF NOT EXISTS service_category text;

-- 2. customer_services table
CREATE TABLE IF NOT EXISTS public.customer_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  customer_email text NOT NULL,
  order_id uuid,
  invoice_number text,
  service_name text NOT NULL,
  service_slug text,
  category text NOT NULL DEFAULT 'other',
  type text NOT NULL DEFAULT 'one_time',
  status text NOT NULL DEFAULT 'active',
  billing_cycle text,
  price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  quantity integer NOT NULL DEFAULT 1,
  started_at timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz,
  delivered_at timestamptz,
  auto_renew boolean NOT NULL DEFAULT false,
  payment_method jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_services_email ON public.customer_services(customer_email);
CREATE INDEX IF NOT EXISTS idx_customer_services_user ON public.customer_services(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_services_period_end ON public.customer_services(current_period_end);
CREATE INDEX IF NOT EXISTS idx_customer_services_category ON public.customer_services(category);

ALTER TABLE public.customer_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own services by email"
  ON public.customer_services FOR SELECT TO authenticated
  USING (customer_email = (auth.jwt() ->> 'email'));

CREATE POLICY "Users read own services by user_id"
  ON public.customer_services FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins manage customer services"
  ON public.customer_services FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users toggle auto_renew on own services"
  ON public.customer_services FOR UPDATE TO authenticated
  USING (customer_email = (auth.jwt() ->> 'email') OR user_id = auth.uid())
  WITH CHECK (customer_email = (auth.jwt() ->> 'email') OR user_id = auth.uid());

CREATE TRIGGER update_customer_services_updated_at
  BEFORE UPDATE ON public.customer_services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. service_renewals
CREATE TABLE IF NOT EXISTS public.service_renewals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_service_id uuid NOT NULL REFERENCES public.customer_services(id) ON DELETE CASCADE,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  outcome text NOT NULL,
  amount numeric,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_service_renewals_service ON public.service_renewals(customer_service_id);

ALTER TABLE public.service_renewals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own renewal logs"
  ON public.service_renewals FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.customer_services cs
    WHERE cs.id = service_renewals.customer_service_id
      AND (cs.customer_email = (auth.jwt() ->> 'email') OR cs.user_id = auth.uid())
  ));

CREATE POLICY "Admins manage renewal logs"
  ON public.service_renewals FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 4. Helper to compute next period end from billing cycle
CREATE OR REPLACE FUNCTION public.compute_period_end(_cycle text, _from timestamptz)
RETURNS timestamptz
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE lower(coalesce(_cycle,''))
    WHEN 'monthly' THEN _from + interval '1 month'
    WHEN 'quarterly' THEN _from + interval '3 months'
    WHEN 'yearly' THEN _from + interval '1 year'
    WHEN 'annual' THEN _from + interval '1 year'
    WHEN 'weekly' THEN _from + interval '1 week'
    ELSE NULL
  END;
$$;

-- 5. Trigger: seed customer_services when an order becomes paid/completed
CREATE OR REPLACE FUNCTION public.seed_customer_services_from_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
  cat text;
  cycle text;
  is_rec boolean;
  svc_type text;
  period_end timestamptz;
BEGIN
  IF NEW.status NOT IN ('paid','completed') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status IN ('paid','completed') THEN
    RETURN NEW;
  END IF;
  -- Avoid duplicate seeding
  IF EXISTS (SELECT 1 FROM public.customer_services WHERE order_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(coalesce(NEW.items, '[]'::jsonb))
  LOOP
    cat := lower(coalesce(item->>'category', NEW.service_category, 'other'));
    -- Normalize category buckets
    cat := CASE
      WHEN cat ILIKE '%formation%' OR cat ILIKE '%company%' OR cat ILIKE '%llc%' OR cat ILIKE '%incorporat%' THEN 'company_formation'
      WHEN cat ILIKE '%web%' OR cat ILIKE '%develop%' OR cat ILIKE '%design%' THEN 'web'
      WHEN cat ILIKE '%market%' OR cat ILIKE '%seo%' OR cat ILIKE '%ads%' THEN 'marketing'
      WHEN cat ILIKE '%gateway%' OR cat ILIKE '%payment%' OR cat ILIKE '%merchant%' THEN 'gateway'
      ELSE coalesce(nullif(cat,''), 'other')
    END;

    is_rec := coalesce((item->>'is_recurring')::boolean, NEW.is_recurring, false);
    cycle := coalesce(item->>'billing_cycle', NEW.billing_cycle);
    svc_type := CASE WHEN is_rec THEN 'recurring' ELSE 'one_time' END;
    period_end := CASE WHEN is_rec THEN public.compute_period_end(cycle, now()) ELSE NULL END;

    INSERT INTO public.customer_services (
      user_id, customer_email, order_id, invoice_number,
      service_name, service_slug, category, type, status,
      billing_cycle, price, currency, quantity,
      started_at, current_period_end, auto_renew, metadata
    ) VALUES (
      NEW.user_id, NEW.customer_email, NEW.id, NEW.invoice_number,
      coalesce(item->>'name', 'Service'),
      item->>'slug',
      cat,
      svc_type,
      CASE WHEN cat = 'company_formation' THEN 'in_progress' ELSE 'active' END,
      cycle,
      coalesce((item->>'price')::numeric, 0),
      coalesce(NEW.currency, 'USD'),
      coalesce((item->>'quantity')::integer, 1),
      now(), period_end, false,
      jsonb_build_object('source_item', item)
    );
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_customer_services ON public.orders;
CREATE TRIGGER trg_seed_customer_services
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.seed_customer_services_from_order();

-- 6. Backfill existing paid/completed orders
INSERT INTO public.customer_services (
  user_id, customer_email, order_id, invoice_number,
  service_name, service_slug, category, type, status,
  price, currency, quantity, started_at, metadata
)
SELECT
  o.user_id, o.customer_email, o.id, o.invoice_number,
  coalesce(item->>'name','Service'),
  item->>'slug',
  CASE
    WHEN lower(coalesce(item->>'category','')) ILIKE '%formation%' THEN 'company_formation'
    WHEN lower(coalesce(item->>'category','')) ILIKE '%web%' THEN 'web'
    WHEN lower(coalesce(item->>'category','')) ILIKE '%market%' THEN 'marketing'
    WHEN lower(coalesce(item->>'category','')) ILIKE '%gateway%' THEN 'gateway'
    ELSE 'other'
  END,
  'one_time',
  'active',
  coalesce((item->>'price')::numeric, 0),
  coalesce(o.currency,'USD'),
  coalesce((item->>'quantity')::integer, 1),
  o.created_at,
  jsonb_build_object('source_item', item, 'backfilled', true)
FROM public.orders o
CROSS JOIN LATERAL jsonb_array_elements(coalesce(o.items,'[]'::jsonb)) AS item
WHERE o.status IN ('paid','completed')
  AND NOT EXISTS (SELECT 1 FROM public.customer_services cs WHERE cs.order_id = o.id);

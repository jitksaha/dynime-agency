
-- 1. Extend coupons
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS is_milestone boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS milestone_mode text,
  ADD COLUMN IF NOT EXISTS advance_percent numeric,
  ADD COLUMN IF NOT EXISTS milestone_stages jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.coupons
  DROP CONSTRAINT IF EXISTS coupons_milestone_mode_check;
ALTER TABLE public.coupons
  ADD CONSTRAINT coupons_milestone_mode_check
  CHECK (milestone_mode IS NULL OR milestone_mode IN ('two_step','custom'));

-- 2. order_milestones
CREATE TABLE IF NOT EXISTS public.order_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_order_id uuid NOT NULL,
  child_order_id uuid,
  sequence integer NOT NULL,
  label text NOT NULL,
  percent numeric NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending',
  invoiced_at timestamptz,
  paid_at timestamptz,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_milestones_parent ON public.order_milestones(parent_order_id);
CREATE INDEX IF NOT EXISTS idx_order_milestones_child ON public.order_milestones(child_order_id);

ALTER TABLE public.order_milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage milestones" ON public.order_milestones;
CREATE POLICY "Admins manage milestones" ON public.order_milestones
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users read own milestones" ON public.order_milestones;
CREATE POLICY "Users read own milestones" ON public.order_milestones
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_milestones.parent_order_id
      AND (o.user_id = auth.uid() OR o.customer_email = (auth.jwt() ->> 'email'))
  ));

CREATE TRIGGER trg_order_milestones_updated_at
  BEFORE UPDATE ON public.order_milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Generate next milestone invoice (creates child pending order)
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

  INSERT INTO public.orders (
    user_id, customer_email, customer_name, items, currency,
    subtotal, total, discount_amount, status, notes,
    billing_address, service_category, service_brief, payment_gateway
  ) VALUES (
    parent.user_id, parent.customer_email, parent.customer_name,
    parent.items, m.currency,
    m.amount, m.amount, 0, 'pending',
    'Milestone ' || m.sequence || ' (' || m.label || ') for invoice ' || COALESCE(parent.invoice_number,''),
    parent.billing_address, parent.service_category,
    jsonb_build_object(
      'milestone_of', parent.id,
      'milestone_id', m.id,
      'milestone_label', m.label,
      'milestone_sequence', m.sequence,
      'milestone_percent', m.percent
    ),
    parent.payment_gateway
  ) RETURNING id INTO new_order_id;

  UPDATE public.order_milestones
     SET child_order_id = new_order_id,
         status = 'invoiced',
         invoiced_at = now()
   WHERE id = m.id;

  RETURN new_order_id;
END;
$$;

-- 4. Auto-mark milestone paid when child order is paid
CREATE OR REPLACE FUNCTION public.mark_milestone_paid_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('paid','completed') AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    UPDATE public.order_milestones
       SET status = 'paid', paid_at = now()
     WHERE child_order_id = NEW.id AND status <> 'paid';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mark_milestone_paid ON public.orders;
CREATE TRIGGER trg_mark_milestone_paid
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.mark_milestone_paid_on_order();

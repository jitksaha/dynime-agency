
-- Add columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS invoice_number text UNIQUE,
  ADD COLUMN IF NOT EXISTS service_brief jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS billing_address jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS subtotal numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS notes text;

-- Sequence + trigger to auto-assign invoice numbers like INV-2026-000001
CREATE SEQUENCE IF NOT EXISTS public.invoice_seq START 1;

CREATE OR REPLACE FUNCTION public.assign_invoice_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := 'INV-' || to_char(now(), 'YYYY') || '-' ||
                          lpad(nextval('public.invoice_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_invoice_number ON public.orders;
CREATE TRIGGER trg_orders_invoice_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.assign_invoice_number();

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Allow authenticated users to read their own orders by user_id (in addition to email match)
DROP POLICY IF EXISTS "Users can read own orders by user_id" ON public.orders;
CREATE POLICY "Users can read own orders by user_id"
ON public.orders
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Public read of a single order by invoice_number for invoice link sharing (limited fields exposed via app, but RLS allows base read)
-- We keep public read OFF; instead provide a SECURITY DEFINER function:
CREATE OR REPLACE FUNCTION public.get_invoice_by_number(_invoice text)
RETURNS TABLE(
  id uuid, invoice_number text, status text, total numeric, subtotal numeric,
  discount_amount numeric, currency text, items jsonb, service_brief jsonb,
  billing_address jsonb, customer_name text, customer_email text,
  coupon_code text, notes text, created_at timestamptz, updated_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.invoice_number, o.status, o.total, o.subtotal,
         o.discount_amount, o.currency, o.items, o.service_brief,
         o.billing_address, o.customer_name, o.customer_email,
         o.coupon_code, o.notes, o.created_at, o.updated_at
  FROM public.orders o
  WHERE o.invoice_number = _invoice
  LIMIT 1;
$$;

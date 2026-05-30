CREATE OR REPLACE FUNCTION public.assign_invoice_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := 'INV' || lpad(nextval('public.invoice_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;
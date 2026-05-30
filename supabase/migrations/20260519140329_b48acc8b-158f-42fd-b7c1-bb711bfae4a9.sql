
CREATE OR REPLACE FUNCTION public.assign_invoice_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := 'INV' || to_char(now(), 'YYYY') || lpad(nextval('public.invoice_seq')::text, 7, '0');
  ELSE
    NEW.invoice_number := replace(NEW.invoice_number, '-', '');
  END IF;
  RETURN NEW;
END;
$$;

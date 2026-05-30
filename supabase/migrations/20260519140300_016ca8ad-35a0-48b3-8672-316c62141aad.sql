
ALTER TABLE public.orders DISABLE TRIGGER USER;
UPDATE public.orders
SET invoice_number = replace(invoice_number, '-', '')
WHERE invoice_number LIKE '%-%';
ALTER TABLE public.orders ENABLE TRIGGER USER;

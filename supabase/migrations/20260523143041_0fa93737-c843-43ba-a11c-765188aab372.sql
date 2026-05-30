
-- Promote UK number to primary phone
UPDATE public.contact_info
SET value = '+447446433162',
    label = 'Phone',
    sort_order = 1,
    is_active = true,
    icon = 'Phone',
    updated_at = now()
WHERE id = '213c0e28-e915-49ab-91d4-1df1b6f7012a';

-- Add the +880 number as a secondary phone (idempotent)
INSERT INTO public.contact_info (type, label, value, icon, sort_order, is_active)
SELECT 'phone', 'Secondary Phone', '+8809658003831', 'Phone', 2, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.contact_info
  WHERE type = 'phone' AND value = '+8809658003831'
);

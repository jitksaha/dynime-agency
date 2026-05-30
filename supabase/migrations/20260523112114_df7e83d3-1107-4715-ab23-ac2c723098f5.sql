ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tax_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_percent numeric,
  ADD COLUMN IF NOT EXISTS tax_mode text,
  ADD COLUMN IF NOT EXISTS tax_label text;

INSERT INTO public.site_settings (key, value) VALUES
  ('tax_enabled', '"false"'),
  ('tax_label', '"VAT"'),
  ('tax_percent', '"0"'),
  ('tax_mode', '"exclusive"'),
  ('tax_show_breakdown', '"true"')
ON CONFLICT (key) DO NOTHING;
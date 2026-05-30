CREATE TABLE public.product_urls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  internal_path TEXT,
  external_url TEXT NOT NULL,
  open_in_new_tab BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_urls_active_path ON public.product_urls(is_active, internal_path);

ALTER TABLE public.product_urls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active product urls"
ON public.product_urls FOR SELECT
USING (is_active = true OR public.is_admin(auth.uid()));

CREATE POLICY "Admins manage product urls insert"
ON public.product_urls FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins manage product urls update"
ON public.product_urls FOR UPDATE
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins manage product urls delete"
ON public.product_urls FOR DELETE
USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_product_urls_updated_at
BEFORE UPDATE ON public.product_urls
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.product_urls (key, label, description, internal_path, external_url, open_in_new_tab, sort_order)
VALUES
  ('dbm', 'Dynime Business Manager', 'All-in-one business OS — HRM, CRM, accounting and 20+ modules.', '/products/dbm', 'https://app.dynime.com', true, 1),
  ('payoss', 'Dynime PayOSS (Self-Hosted Gateway)', 'Open-source self-hosted payment gateway.', '/pay-open-source', 'https://payoss.dynime.com', true, 2);
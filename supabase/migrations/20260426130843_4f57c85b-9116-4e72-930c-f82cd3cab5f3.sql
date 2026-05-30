-- Pricing per service (slug-based, no FK so it works alongside the static services.ts)
CREATE TABLE public.service_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_slug TEXT NOT NULL UNIQUE,
  service_title TEXT NOT NULL DEFAULT '',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  tiers JSONB NOT NULL DEFAULT '[]'::jsonb,
  quote_settings JSONB NOT NULL DEFAULT '{
    "enable_contact": true,
    "enable_modal": true,
    "enable_whatsapp": false,
    "whatsapp_number": "",
    "quote_message": "Hi, I would like a custom quote for {service}."
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.service_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read service pricing"
  ON public.service_pricing FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage service pricing"
  ON public.service_pricing FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_service_pricing_updated_at
BEFORE UPDATE ON public.service_pricing
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_service_pricing_slug ON public.service_pricing(service_slug);
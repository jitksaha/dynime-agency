
CREATE TABLE public.usa_state_pricing (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  state text NOT NULL,
  abbr text NOT NULL UNIQUE,
  llc_formation numeric NOT NULL DEFAULT 0,
  corp_formation numeric NOT NULL DEFAULT 0,
  llc_annual numeric NOT NULL DEFAULT 0,
  llc_annual_label text NOT NULL DEFAULT '$0',
  corp_annual numeric NOT NULL DEFAULT 0,
  corp_annual_label text NOT NULL DEFAULT '$0',
  llc_renewal numeric NOT NULL DEFAULT 0,
  corp_renewal numeric NOT NULL DEFAULT 0,
  state_tax_note text,
  franchise_tax text DEFAULT 'No',
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.usa_state_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read usa state pricing"
  ON public.usa_state_pricing FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage usa state pricing"
  ON public.usa_state_pricing FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER update_usa_state_pricing_updated_at
  BEFORE UPDATE ON public.usa_state_pricing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

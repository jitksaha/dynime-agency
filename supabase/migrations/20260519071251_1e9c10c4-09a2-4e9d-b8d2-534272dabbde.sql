
CREATE TABLE IF NOT EXISTS public.office_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text,
  country text,
  address text,
  timezone text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.office_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active offices"
  ON public.office_locations FOR SELECT
  USING (is_active = true OR has_any_role(auth.uid(), ARRAY['super_admin'::app_role,'manager'::app_role,'hr'::app_role]));

CREATE POLICY "HR staff manage offices"
  ON public.office_locations FOR ALL
  TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['super_admin'::app_role,'manager'::app_role,'hr'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['super_admin'::app_role,'manager'::app_role,'hr'::app_role]));

CREATE TRIGGER trg_office_locations_updated_at
  BEFORE UPDATE ON public.office_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.careers
  ADD COLUMN IF NOT EXISTS office_location_id uuid REFERENCES public.office_locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_careers_office_location_id ON public.careers(office_location_id);

-- Seed a default office so the dropdown isn't empty
INSERT INTO public.office_locations (name, city, country, address, sort_order)
SELECT 'Head Office', 'Dhaka', 'Bangladesh', NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM public.office_locations);

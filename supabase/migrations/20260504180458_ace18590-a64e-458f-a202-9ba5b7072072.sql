CREATE TABLE public.country_eligibility (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  aliases TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'blocked',
  category TEXT NOT NULL DEFAULT 'FATF Blacklist',
  reason TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT country_eligibility_status_check CHECK (status IN ('blocked','review','eligible'))
);

ALTER TABLE public.country_eligibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active country eligibility"
  ON public.country_eligibility FOR SELECT
  USING (is_active = true OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage country eligibility"
  ON public.country_eligibility FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER country_eligibility_updated_at
  BEFORE UPDATE ON public.country_eligibility
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_country_eligibility_active ON public.country_eligibility(is_active, sort_order);

-- Seed initial data
INSERT INTO public.country_eligibility (name, aliases, status, category, reason, sort_order) VALUES
  ('Iran', '{}', 'blocked', 'FATF Blacklist', 'FATF high-risk jurisdiction & OFAC comprehensive sanctions', 10),
  ('North Korea', ARRAY['DPRK','Democratic People''s Republic of Korea'], 'blocked', 'FATF Blacklist', 'FATF high-risk jurisdiction & OFAC comprehensive sanctions', 20),
  ('Myanmar', ARRAY['Burma'], 'blocked', 'FATF Blacklist', 'FATF high-risk jurisdiction (Call for Action)', 30),
  ('Cuba', '{}', 'blocked', 'OFAC Comprehensive Sanctions', 'US OFAC comprehensive sanctions program', 40),
  ('Syria', '{}', 'blocked', 'OFAC Comprehensive Sanctions', 'US OFAC comprehensive sanctions & active conflict zone', 50),
  ('Crimea Region', '{}', 'blocked', 'OFAC Comprehensive Sanctions', 'OFAC comprehensive regional sanctions (Ukraine)', 60),
  ('Donetsk Region', '{}', 'blocked', 'OFAC Comprehensive Sanctions', 'OFAC comprehensive regional sanctions (Ukraine)', 70),
  ('Luhansk Region', '{}', 'blocked', 'OFAC Comprehensive Sanctions', 'OFAC comprehensive regional sanctions (Ukraine)', 80),
  ('Afghanistan', '{}', 'blocked', 'Active Conflict Zone', 'Active conflict zone & severe AML/CTF risk', 90),
  ('Yemen', '{}', 'blocked', 'Active Conflict Zone', 'Active conflict zone with payment & banking restrictions', 100),
  ('Sudan', '{}', 'blocked', 'Active Conflict Zone', 'Active conflict zone & sanctions exposure', 110),
  ('South Sudan', '{}', 'blocked', 'Active Conflict Zone', 'Active conflict zone & sanctions exposure', 120),
  ('Somalia', '{}', 'blocked', 'Active Conflict Zone', 'Active conflict zone & severe AML/CTF risk', 130),
  ('Libya', '{}', 'blocked', 'Active Conflict Zone', 'Active conflict zone & sanctions exposure', 140),
  ('Russia', '{}', 'blocked', 'Severe Payment / Digital Restrictions', 'Extensive international sanctions & cross-border payment restrictions', 150),
  ('Belarus', '{}', 'blocked', 'Severe Payment / Digital Restrictions', 'International sanctions & payment restrictions', 160),
  ('Venezuela', '{}', 'blocked', 'Severe Payment / Digital Restrictions', 'Sanctions exposure & severe payment restrictions', 170),
  ('Pakistan', '{}', 'review', 'Enhanced Review', 'Enhanced KYC / source-of-funds review required', 200),
  ('Nigeria', '{}', 'review', 'Enhanced Review', 'Enhanced KYC / payment-gateway eligibility review', 210),
  ('Bangladesh', '{}', 'review', 'Enhanced Review', 'Enhanced KYC for cross-border payments', 220),
  ('Iraq', '{}', 'review', 'Enhanced Review', 'Heightened AML/CTF review required', 230),
  ('Lebanon', '{}', 'review', 'Enhanced Review', 'Banking instability — enhanced review required', 240),
  ('Zimbabwe', '{}', 'review', 'Enhanced Review', 'Targeted sanctions exposure — enhanced review', 250);

-- Investment plans
CREATE TABLE public.investment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  tagline text,
  description text,
  min_amount numeric(18,2) NOT NULL DEFAULT 0,
  max_amount numeric(18,2),
  currency text NOT NULL DEFAULT 'USD',
  roi_percent numeric(7,2) NOT NULL DEFAULT 0,
  profit_share_percent numeric(7,2) NOT NULL DEFAULT 0,
  lock_period_days integer NOT NULL DEFAULT 0,
  payout_frequency text NOT NULL DEFAULT 'monthly',
  risk_level text NOT NULL DEFAULT 'moderate',
  tier text NOT NULL DEFAULT 'standard',
  capacity numeric(18,2),
  allocated numeric(18,2) NOT NULL DEFAULT 0,
  withdrawal_policy text,
  policy_text text,
  highlights jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.investment_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active investment plans"
ON public.investment_plans FOR SELECT
USING (is_active = true OR public.is_admin(auth.uid()));

CREATE POLICY "Admins manage investment plans"
ON public.investment_plans FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER investment_plans_updated_at
BEFORE UPDATE ON public.investment_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Invest settings (singleton key/value)
CREATE TABLE public.invest_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invest_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read invest settings"
ON public.invest_settings FOR SELECT
USING (true);

CREATE POLICY "Admins manage invest settings"
ON public.invest_settings FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER invest_settings_updated_at
BEFORE UPDATE ON public.invest_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Invest leads (public consultation form)
CREATE TABLE public.invest_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  country text,
  investment_amount numeric(18,2),
  currency text DEFAULT 'USD',
  preferred_contact text DEFAULT 'email',
  message text,
  plan_slug text,
  status text NOT NULL DEFAULT 'new',
  admin_notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invest_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit invest leads"
ON public.invest_leads FOR INSERT
WITH CHECK (
  full_name IS NOT NULL AND length(btrim(full_name)) > 0
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
);

CREATE POLICY "Admins read invest leads"
ON public.invest_leads FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins update invest leads"
ON public.invest_leads FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins delete invest leads"
ON public.invest_leads FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE TRIGGER invest_leads_updated_at
BEFORE UPDATE ON public.invest_leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default plans
INSERT INTO public.investment_plans
  (slug, name, tagline, description, min_amount, max_amount, currency, roi_percent, profit_share_percent, lock_period_days, payout_frequency, risk_level, tier, capacity, highlights, is_active, is_featured, sort_order)
VALUES
  ('starter', 'Starter Shareholder',
   'Begin your journey as a Dynime shareholder',
   'Entry-level revenue-share plan ideal for first-time investors. Quarterly profit distribution from Dynime Technologies operating revenue.',
   500, 9999, 'USD', 14, 8, 180, 'quarterly', 'low', 'standard', 250000,
   '["Quarterly payouts","6-month lock-in","Pro-rata revenue share","Email reports"]'::jsonb,
   true, false, 10),
  ('growth', 'Growth Partner',
   'Most popular tier — balanced returns with priority access',
   'Mid-tier partner plan with monthly profit distribution, higher revenue share, and access to expansion-round opportunities.',
   10000, 49999, 'USD', 22, 14, 365, 'monthly', 'moderate', 'gold', 750000,
   '["Monthly payouts","12-month lock-in","Priority new-round access","Quarterly investor calls","Downloadable PDF statements"]'::jsonb,
   true, true, 20),
  ('elite', 'Elite Equity Partner',
   'Strategic equity-style partnership with full reporting',
   'Senior partner tier with the highest revenue share, strategic roadmap input, and detailed monthly P&L reporting.',
   50000, NULL, 'USD', 30, 22, 540, 'monthly', 'moderate', 'platinum', 2000000,
   '["Monthly payouts","18-month lock-in","Strategic roadmap input","Direct line to leadership","Annual on-site review"]'::jsonb,
   true, true, 30);

-- Seed default invest settings
INSERT INTO public.invest_settings (key, value) VALUES
  ('hero', '{
    "eyebrow": "Dynime Investment Portal",
    "title": "Invest in Dynime Technologies. Share the upside.",
    "subtitle": "Become a revenue-sharing shareholder in a profitable, multi-vertical technology company. Transparent reporting, lock-in protection, and quarterly or monthly payouts.",
    "primary_cta": "Start Investing",
    "secondary_cta": "Calculate Returns",
    "trust_line": "Trusted by 320+ shareholders across 18 countries"
  }'::jsonb),
  ('stats', '{
    "items": [
      {"label":"Total Investment Collected","value":"$8.4M","sub":"as of latest report"},
      {"label":"Active Shareholders","value":"320+","sub":"in 18 countries"},
      {"label":"Annual Revenue Growth","value":"42%","sub":"YoY 2025"},
      {"label":"Avg. Annual Payout","value":"19.6%","sub":"weighted across tiers"}
    ]
  }'::jsonb),
  ('benefits', '{
    "items": [
      {"icon":"trending-up","title":"Revenue sharing","body":"Pro-rata share of distributable profit each cycle."},
      {"icon":"shield","title":"Lock-in protection","body":"Capital is protected during the agreed lock-in window."},
      {"icon":"vote","title":"Voting rights","body":"Gold and Platinum tiers participate in roadmap polls."},
      {"icon":"file-text","title":"Quarterly reports","body":"Audited revenue and P&L reports in your dashboard."},
      {"icon":"users","title":"Priority access","body":"First look at expansion rounds and new ventures."},
      {"icon":"gift","title":"Referral commissions","body":"Earn on referred shareholders for 12 months."}
    ]
  }'::jsonb),
  ('roadmap', '{
    "items": [
      {"period":"Q1 2025","title":"Portal launch","status":"done","body":"Public investment portal and shareholder dashboard go live."},
      {"period":"Q2 2025","title":"Expand to MENA","status":"done","body":"Open second operations hub serving the Middle East."},
      {"period":"Q3 2025","title":"Self-hosted gateway GA","status":"in_progress","body":"Dynime Self-Hosted Payment Gateway leaves beta."},
      {"period":"Q4 2025","title":"Series B raise","status":"upcoming","body":"Open Elite-tier expansion round capped at $5M."},
      {"period":"2026","title":"Equity conversion option","status":"upcoming","body":"Eligible Platinum partners may convert to equity."}
    ]
  }'::jsonb),
  ('faq', '{
    "items": [
      {"q":"How is profit calculated?","a":"At the close of each payout cycle, distributable profit is calculated as company net profit minus operating reserve. Each shareholder receives a pro-rata share weighted by their tier."},
      {"q":"What happens if there is a loss?","a":"Losses are absorbed by the company reserve first. Capital is only adjusted if reserves are exhausted, in line with the agreement."},
      {"q":"When can I withdraw my capital?","a":"After your lock-in period ends. Partial withdrawals are allowed subject to the minimum withdrawal amount and a small processing fee."},
      {"q":"Is my investment guaranteed?","a":"No investment is risk-free. Returns are projections based on historical performance and may vary."},
      {"q":"How do I receive payouts?","a":"Payouts are issued on the cycle defined in your plan via bank transfer, wire, or supported digital channels."},
      {"q":"Do you support multiple currencies?","a":"Yes — USD, BDT, EUR, GBP, AED, INR and more are supported. FX is calculated at payout date."}
    ]
  }'::jsonb),
  ('policy', '{
    "html":"<p>Dynime Technologies operates a transparent revenue-sharing model. Distributable profit is calculated each cycle after operating expenses and a 15% strategic reserve. Capital is locked for the agreed term and may be withdrawn (in part or in full) once that term ends, subject to the withdrawal policy.</p><p>Returns are projections based on historical company performance. Investors are responsible for their local tax obligations. Eligibility is subject to KYC and applicable regulations in the investor''s jurisdiction.</p>"
  }'::jsonb),
  ('calculator', '{
    "default_amount": 10000,
    "default_duration_months": 12,
    "default_plan_slug": "growth",
    "platform_fee_percent": 2,
    "compounding_options": ["none","monthly","quarterly"]
  }'::jsonb),
  ('rules', '{
    "min_withdrawal": 100,
    "withdrawal_fee_percent": 1.5,
    "supported_currencies": ["USD","BDT","EUR","GBP","AED","INR"],
    "support_email": "investors@dynime.com",
    "kyc_required": true
  }'::jsonb);

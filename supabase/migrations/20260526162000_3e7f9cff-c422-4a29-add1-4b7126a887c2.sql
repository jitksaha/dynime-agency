
-- ============ FlexPay Phase 1 schema ============

-- 1. Settings (single-row keyed table, like site_settings pattern)
CREATE TABLE IF NOT EXISTS public.flexpay_settings (
  id integer PRIMARY KEY DEFAULT 1,
  enabled boolean NOT NULL DEFAULT true,
  emi_enabled boolean NOT NULL DEFAULT true,
  paylater_enabled boolean NOT NULL DEFAULT true,
  credit_system_enabled boolean NOT NULL DEFAULT true,
  allowed_tenures integer[] NOT NULL DEFAULT ARRAY[3,6,9,12,18,24,36],
  paylater_terms integer[] NOT NULL DEFAULT ARRAY[30,60,90],
  processing_fee_percent numeric(5,2) NOT NULL DEFAULT 3.00,
  down_payment_percent numeric(5,2) NOT NULL DEFAULT 0,
  late_fee_amount numeric(10,2) NOT NULL DEFAULT 15.00,
  min_order_amount numeric(12,2) NOT NULL DEFAULT 500.00,
  max_credit_limit numeric(12,2) NOT NULL DEFAULT 10000.00,
  default_currency text NOT NULL DEFAULT 'USD',
  kyc_provider text NOT NULL DEFAULT 'manual',
  auto_approval_enabled boolean NOT NULL DEFAULT false,
  auto_approval_max_limit numeric(12,2) NOT NULL DEFAULT 1000.00,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT flexpay_settings_singleton CHECK (id = 1)
);
GRANT SELECT ON public.flexpay_settings TO anon, authenticated;
GRANT ALL ON public.flexpay_settings TO service_role;
ALTER TABLE public.flexpay_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flexpay_settings_public_read" ON public.flexpay_settings FOR SELECT USING (true);
CREATE POLICY "flexpay_settings_admin_write" ON public.flexpay_settings
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
INSERT INTO public.flexpay_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- 2. Credit applications
CREATE TABLE IF NOT EXISTS public.flexpay_credit_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  country text,
  occupation text,
  employer text,
  monthly_income numeric(12,2),
  requested_limit numeric(12,2) NOT NULL,
  purpose text,
  notes text,
  status text NOT NULL DEFAULT 'pending', -- pending | under_review | approved | rejected | requires_action
  rejection_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.flexpay_credit_applications TO authenticated;
GRANT INSERT ON public.flexpay_credit_applications TO anon;
GRANT ALL ON public.flexpay_credit_applications TO service_role;
ALTER TABLE public.flexpay_credit_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flexpay_apps_user_read" ON public.flexpay_credit_applications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR lower(email) = lower(coalesce(auth.jwt() ->> 'email','')) OR public.is_admin(auth.uid()));
CREATE POLICY "flexpay_apps_insert" ON public.flexpay_credit_applications
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "flexpay_apps_admin_update" ON public.flexpay_credit_applications
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_flexpay_apps_updated BEFORE UPDATE ON public.flexpay_credit_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. KYC verifications
CREATE TABLE IF NOT EXISTS public.flexpay_kyc_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES public.flexpay_credit_applications(id) ON DELETE CASCADE,
  user_id uuid,
  token text UNIQUE,
  provider text NOT NULL DEFAULT 'manual',
  identity_status text NOT NULL DEFAULT 'pending',
  address_status text NOT NULL DEFAULT 'pending',
  face_status text NOT NULL DEFAULT 'pending',
  risk_status text NOT NULL DEFAULT 'pending',
  identity_doc_type text,
  identity_doc_front_url text,
  identity_doc_back_url text,
  selfie_url text,
  address_doc_url text,
  match_score numeric(5,2),
  fraud_signals jsonb DEFAULT '{}'::jsonb,
  provider_payload jsonb DEFAULT '{}'::jsonb,
  expires_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.flexpay_kyc_verifications TO authenticated;
GRANT ALL ON public.flexpay_kyc_verifications TO service_role;
ALTER TABLE public.flexpay_kyc_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flexpay_kyc_user_read" ON public.flexpay_kyc_verifications
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "flexpay_kyc_user_write" ON public.flexpay_kyc_verifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "flexpay_kyc_admin_all" ON public.flexpay_kyc_verifications
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_flexpay_kyc_updated BEFORE UPDATE ON public.flexpay_kyc_verifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Credit accounts (one per user, created on approval)
CREATE TABLE IF NOT EXISTS public.flexpay_credit_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email text NOT NULL,
  total_limit numeric(12,2) NOT NULL DEFAULT 0,
  used_limit numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  risk_rating text NOT NULL DEFAULT 'standard',
  max_tenure_months integer NOT NULL DEFAULT 12,
  status text NOT NULL DEFAULT 'active', -- active | suspended | closed
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.flexpay_credit_accounts TO authenticated;
GRANT ALL ON public.flexpay_credit_accounts TO service_role;
ALTER TABLE public.flexpay_credit_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flexpay_acct_user_read" ON public.flexpay_credit_accounts
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "flexpay_acct_admin_all" ON public.flexpay_credit_accounts
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_flexpay_acct_updated BEFORE UPDATE ON public.flexpay_credit_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. EMI plans
CREATE TABLE IF NOT EXISTS public.flexpay_emi_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  principal numeric(12,2) NOT NULL,
  processing_fee numeric(12,2) NOT NULL DEFAULT 0,
  down_payment numeric(12,2) NOT NULL DEFAULT 0,
  financed_amount numeric(12,2) NOT NULL,
  tenure_months integer NOT NULL,
  monthly_amount numeric(12,2) NOT NULL,
  total_payable numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'active', -- active | completed | overdue | cancelled
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.flexpay_emi_plans TO authenticated;
GRANT ALL ON public.flexpay_emi_plans TO service_role;
ALTER TABLE public.flexpay_emi_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flexpay_plans_user_read" ON public.flexpay_emi_plans
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "flexpay_plans_admin_all" ON public.flexpay_emi_plans
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 6. EMI installments
CREATE TABLE IF NOT EXISTS public.flexpay_emi_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.flexpay_emi_plans(id) ON DELETE CASCADE,
  sequence integer NOT NULL,
  due_date date NOT NULL,
  amount numeric(12,2) NOT NULL,
  late_fee numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending', -- pending | paid | overdue
  paid_at timestamptz,
  paid_order_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.flexpay_emi_installments TO authenticated;
GRANT ALL ON public.flexpay_emi_installments TO service_role;
ALTER TABLE public.flexpay_emi_installments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flexpay_inst_user_read" ON public.flexpay_emi_installments
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.flexpay_emi_plans p WHERE p.id = plan_id AND (p.user_id = auth.uid() OR public.is_admin(auth.uid()))));
CREATE POLICY "flexpay_inst_admin_all" ON public.flexpay_emi_installments
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 7. Pay Later orders
CREATE TABLE IF NOT EXISTS public.flexpay_paylater_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL,
  net_terms_days integer NOT NULL,
  due_date date NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending', -- pending | paid | overdue | cancelled
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.flexpay_paylater_orders TO authenticated;
GRANT ALL ON public.flexpay_paylater_orders TO service_role;
ALTER TABLE public.flexpay_paylater_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flexpay_pl_user_read" ON public.flexpay_paylater_orders
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "flexpay_pl_admin_all" ON public.flexpay_paylater_orders
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 8. Approve application admin function
CREATE OR REPLACE FUNCTION public.flexpay_approve_application(
  _app_id uuid,
  _limit numeric,
  _max_tenure integer,
  _risk_rating text DEFAULT 'standard'
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  app public.flexpay_credit_applications;
  acct_id uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT * INTO app FROM public.flexpay_credit_applications WHERE id = _app_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application not found'; END IF;
  IF app.user_id IS NULL THEN
    RAISE EXCEPTION 'Application has no linked user account';
  END IF;

  INSERT INTO public.flexpay_credit_accounts (user_id, email, total_limit, max_tenure_months, risk_rating, approved_at, approved_by)
  VALUES (app.user_id, app.email, _limit, _max_tenure, _risk_rating, now(), auth.uid())
  ON CONFLICT (user_id) DO UPDATE
    SET total_limit = EXCLUDED.total_limit,
        max_tenure_months = EXCLUDED.max_tenure_months,
        risk_rating = EXCLUDED.risk_rating,
        status = 'active',
        approved_at = now(),
        approved_by = auth.uid(),
        updated_at = now()
  RETURNING id INTO acct_id;

  UPDATE public.flexpay_credit_applications
     SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
   WHERE id = _app_id;

  RETURN acct_id;
END $$;

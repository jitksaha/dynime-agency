
-- KYC Verifications
CREATE TABLE public.kyc_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  didit_session_id TEXT,
  workflow_id TEXT,
  verification_url TEXT,
  status TEXT NOT NULL DEFAULT 'not_started',
  verification_date TIMESTAMPTZ,
  raw_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX kyc_verifications_user_unique ON public.kyc_verifications(user_id);
CREATE INDEX kyc_verifications_session_idx ON public.kyc_verifications(didit_session_id);

GRANT SELECT, INSERT, UPDATE ON public.kyc_verifications TO authenticated;
GRANT ALL ON public.kyc_verifications TO service_role;

ALTER TABLE public.kyc_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kyc_select_own_or_admin" ON public.kyc_verifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'support'));
CREATE POLICY "kyc_insert_own_or_admin" ON public.kyc_verifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "kyc_update_own_or_admin" ON public.kyc_verifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'manager'));

-- KYB Verifications
CREATE TABLE public.kyb_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_name TEXT NOT NULL,
  registration_number TEXT,
  country TEXT,
  business_type TEXT,
  website TEXT,
  tax_id TEXT,
  didit_session_id TEXT,
  workflow_id TEXT,
  verification_url TEXT,
  status TEXT NOT NULL DEFAULT 'not_submitted',
  verification_date TIMESTAMPTZ,
  raw_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX kyb_verifications_user_idx ON public.kyb_verifications(user_id);
CREATE INDEX kyb_verifications_session_idx ON public.kyb_verifications(didit_session_id);

GRANT SELECT, INSERT, UPDATE ON public.kyb_verifications TO authenticated;
GRANT ALL ON public.kyb_verifications TO service_role;

ALTER TABLE public.kyb_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kyb_select_own_or_admin" ON public.kyb_verifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'support'));
CREATE POLICY "kyb_insert_own_or_admin" ON public.kyb_verifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "kyb_update_own_or_admin" ON public.kyb_verifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'manager'));

-- Credit Applications
CREATE TABLE public.credit_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  requested_limit NUMERIC NOT NULL,
  business_revenue NUMERIC,
  business_age TEXT,
  industry TEXT,
  country TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX credit_apps_user_idx ON public.credit_applications(user_id);

GRANT SELECT, INSERT, UPDATE ON public.credit_applications TO authenticated;
GRANT ALL ON public.credit_applications TO service_role;

ALTER TABLE public.credit_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credit_select_own_or_admin" ON public.credit_applications FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'support'));
CREATE POLICY "credit_insert_own" ON public.credit_applications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "credit_update_own_or_admin" ON public.credit_applications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'manager'));

-- Webhook event log
CREATE TABLE public.didit_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT,
  session_id TEXT,
  payload JSONB NOT NULL,
  signature_valid BOOLEAN DEFAULT false,
  processed BOOLEAN DEFAULT false,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX didit_events_session_idx ON public.didit_webhook_events(session_id);

GRANT SELECT ON public.didit_webhook_events TO authenticated;
GRANT ALL ON public.didit_webhook_events TO service_role;

ALTER TABLE public.didit_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "didit_events_admin_select" ON public.didit_webhook_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'manager'));

-- updated_at triggers
CREATE TRIGGER trg_kyc_updated_at BEFORE UPDATE ON public.kyc_verifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_kyb_updated_at BEFORE UPDATE ON public.kyb_verifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_credit_updated_at BEFORE UPDATE ON public.credit_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

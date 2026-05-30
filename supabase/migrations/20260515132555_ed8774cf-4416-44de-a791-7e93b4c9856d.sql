-- Add 'investor' role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'investor';

-- Investments table
CREATE TABLE public.investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id uuid NOT NULL,
  plan_id uuid REFERENCES public.investment_plans(id) ON DELETE SET NULL,
  plan_slug text,
  plan_name text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending', -- pending | active | completed | cancelled
  agreement_status text NOT NULL DEFAULT 'unsigned', -- unsigned | signed
  agreement_pdf_path text,
  agreement_signed_at timestamptz,
  agreement_signed_by_name text,
  agreement_signed_ip text,
  monthly_return_percent numeric,
  bonus_percent_biannual numeric,
  lock_period_months integer,
  payout_frequency text DEFAULT 'monthly',
  started_at timestamptz,
  principal_return_at timestamptz,
  bank_details jsonb DEFAULT '{}'::jsonb,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_investments_investor ON public.investments(investor_id);
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Investors read own investments" ON public.investments
  FOR SELECT TO authenticated USING (investor_id = auth.uid());
CREATE POLICY "Admins manage investments" ON public.investments
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Investors create own investment intent" ON public.investments
  FOR INSERT TO authenticated WITH CHECK (investor_id = auth.uid());
CREATE POLICY "Investors sign own agreement" ON public.investments
  FOR UPDATE TO authenticated USING (investor_id = auth.uid()) WITH CHECK (investor_id = auth.uid());

-- Payouts
CREATE TABLE public.investment_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investment_id uuid NOT NULL REFERENCES public.investments(id) ON DELETE CASCADE,
  investor_id uuid NOT NULL,
  period_start date,
  period_end date,
  payout_type text NOT NULL DEFAULT 'monthly', -- monthly | bonus | profit_share | principal
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'scheduled', -- scheduled | paid | skipped
  paid_at timestamptz,
  statement_pdf_path text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_payouts_investor ON public.investment_payouts(investor_id);
ALTER TABLE public.investment_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Investors read own payouts" ON public.investment_payouts
  FOR SELECT TO authenticated USING (investor_id = auth.uid());
CREATE POLICY "Admins manage payouts" ON public.investment_payouts
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Withdrawal requests
CREATE TABLE public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id uuid NOT NULL,
  investment_id uuid REFERENCES public.investments(id) ON DELETE SET NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'USD',
  method text NOT NULL DEFAULT 'bank_transfer',
  bank_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected | paid
  admin_notes text,
  processed_at timestamptz,
  processed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_withdrawals_investor ON public.withdrawal_requests(investor_id);
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Investors read own withdrawals" ON public.withdrawal_requests
  FOR SELECT TO authenticated USING (investor_id = auth.uid());
CREATE POLICY "Investors create own withdrawals" ON public.withdrawal_requests
  FOR INSERT TO authenticated WITH CHECK (investor_id = auth.uid());
CREATE POLICY "Admins manage withdrawals" ON public.withdrawal_requests
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- updated_at triggers
CREATE TRIGGER trg_investments_updated BEFORE UPDATE ON public.investments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_payouts_updated BEFORE UPDATE ON public.investment_payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_withdrawals_updated BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for investor documents (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('investor-documents','investor-documents', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Investor reads own docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'investor-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Investor uploads own docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'investor-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins manage investor docs"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'investor-documents' AND is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'investor-documents' AND is_admin(auth.uid()));

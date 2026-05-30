-- ============== Sequences for human-readable doc numbers ==============
CREATE SEQUENCE IF NOT EXISTS public.hr_offer_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.hr_agreement_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.hr_payslip_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.hr_experience_seq START 1;

-- ============== employees ==============
CREATE TABLE IF NOT EXISTS public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  team_member_key text,

  full_name text NOT NULL,
  employee_code text UNIQUE,
  email text,
  phone text,
  photo_url text,
  address text,
  nid_passport text,
  dob date,

  designation text,
  department text,
  employment_type text NOT NULL DEFAULT 'full-time',
  work_location text,
  joining_date date,
  probation_end_date date,
  status text NOT NULL DEFAULT 'active',
  last_working_day date,
  reporting_to text,

  currency text NOT NULL DEFAULT 'USD',
  gross_salary numeric NOT NULL DEFAULT 0,
  pay_cycle text NOT NULL DEFAULT 'monthly',
  bank_name text,
  bank_account_name text,
  bank_account_number text,
  bank_routing text,

  allowances jsonb NOT NULL DEFAULT '[]'::jsonb,
  deductions jsonb NOT NULL DEFAULT '[]'::jsonb,

  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_email ON public.employees(lower(email));

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR staff manage employees"
  ON public.employees FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'hr'::app_role))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "Employees read own record"
  ON public.employees FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR lower(coalesce(email,'')) = lower(coalesce(auth.jwt() ->> 'email','')));

CREATE TRIGGER trg_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== hr_documents ==============
CREATE TABLE IF NOT EXISTS public.hr_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('offer','agreement','payslip','experience','relieving')),
  doc_number text UNIQUE,

  title text,
  period_month date,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  effective_date date,

  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed jsonb NOT NULL DEFAULT '{}'::jsonb,

  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','issued','sent','void')),
  sent_to_email text,
  sent_at timestamptz,
  pdf_storage_path text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX IF NOT EXISTS idx_hr_documents_employee ON public.hr_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_documents_kind ON public.hr_documents(kind);
CREATE INDEX IF NOT EXISTS idx_hr_documents_status ON public.hr_documents(status);

ALTER TABLE public.hr_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR staff manage hr documents"
  ON public.hr_documents FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'hr'::app_role))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "Employees read own hr documents"
  ON public.hr_documents FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = hr_documents.employee_id
      AND (e.user_id = auth.uid()
           OR lower(coalesce(e.email,'')) = lower(coalesce(auth.jwt() ->> 'email','')))
  ));

CREATE TRIGGER trg_hr_documents_updated_at
  BEFORE UPDATE ON public.hr_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto doc_number
CREATE OR REPLACE FUNCTION public.assign_hr_document_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  yr text := to_char(coalesce(NEW.issue_date, CURRENT_DATE), 'YYYY');
  ym text := to_char(coalesce(NEW.period_month, NEW.issue_date, CURRENT_DATE), 'YYYYMM');
BEGIN
  IF NEW.doc_number IS NULL THEN
    NEW.doc_number := CASE NEW.kind
      WHEN 'offer'      THEN 'OFR-' || yr || '-' || lpad(nextval('public.hr_offer_seq')::text, 5, '0')
      WHEN 'agreement'  THEN 'AGR-' || yr || '-' || lpad(nextval('public.hr_agreement_seq')::text, 5, '0')
      WHEN 'payslip'    THEN 'PSL-' || ym || '-' || lpad(nextval('public.hr_payslip_seq')::text, 5, '0')
      WHEN 'experience' THEN 'EXP-' || yr || '-' || lpad(nextval('public.hr_experience_seq')::text, 5, '0')
      WHEN 'relieving'  THEN 'REL-' || yr || '-' || lpad(nextval('public.hr_experience_seq')::text, 5, '0')
    END;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_hr_documents_assign_number
  BEFORE INSERT ON public.hr_documents
  FOR EACH ROW EXECUTE FUNCTION public.assign_hr_document_number();

-- ============== Storage bucket: hr-documents ==============
INSERT INTO storage.buckets (id, name, public)
  VALUES ('hr-documents', 'hr-documents', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "HR staff read hr-documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'hr-documents'
    AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'hr'::app_role))
  );

CREATE POLICY "HR staff write hr-documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'hr-documents'
    AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'hr'::app_role))
  );

CREATE POLICY "HR staff update hr-documents"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'hr-documents'
    AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'hr'::app_role))
  );

CREATE POLICY "HR staff delete hr-documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'hr-documents'
    AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'hr'::app_role))
  );

CREATE POLICY "Employees read own hr-documents files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'hr-documents'
    AND EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id::text = (storage.foldername(name))[1]
        AND (e.user_id = auth.uid()
             OR lower(coalesce(e.email,'')) = lower(coalesce(auth.jwt() ->> 'email','')))
    )
  );
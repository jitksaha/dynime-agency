
-- =========================================================
-- TAX BRACKETS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.tax_brackets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  lower_bound numeric NOT NULL DEFAULT 0,
  upper_bound numeric,
  percent numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tax_brackets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tax_brackets_hr_all" ON public.tax_brackets
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'hr'::app_role))
  WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'hr'::app_role));

CREATE TRIGGER tax_brackets_set_updated BEFORE UPDATE ON public.tax_brackets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.tax_brackets (label, lower_bound, upper_bound, percent, sort_order)
VALUES
  ('Tax-free', 0, 1000, 0, 1),
  ('Low slab', 1000, 3000, 10, 2),
  ('Mid slab', 3000, 10000, 20, 3),
  ('High slab', 10000, NULL, 30, 4)
ON CONFLICT DO NOTHING;

-- =========================================================
-- PAYROLL RUNS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_year integer NOT NULL,
  period_month integer NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  working_days integer NOT NULL DEFAULT 22,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'draft', -- draft | approved | paid | cancelled
  notes text,
  totals jsonb NOT NULL DEFAULT '{}'::jsonb,
  approved_by uuid,
  approved_at timestamptz,
  paid_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (period_year, period_month)
);
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payroll_runs_hr_all" ON public.payroll_runs
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'hr'::app_role))
  WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'hr'::app_role));

CREATE TRIGGER payroll_runs_set_updated BEFORE UPDATE ON public.payroll_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- PAYROLL ITEMS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.payroll_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL,
  employee_name text,
  designation text,
  department text,
  currency text NOT NULL DEFAULT 'USD',
  gross_salary numeric NOT NULL DEFAULT 0,
  allowances_total numeric NOT NULL DEFAULT 0,
  deductions_total numeric NOT NULL DEFAULT 0,
  attendance_present numeric NOT NULL DEFAULT 0,
  attendance_absent numeric NOT NULL DEFAULT 0,
  leave_paid_days numeric NOT NULL DEFAULT 0,
  leave_unpaid_days numeric NOT NULL DEFAULT 0,
  prorate_factor numeric NOT NULL DEFAULT 1,
  prorate_deduction numeric NOT NULL DEFAULT 0,
  taxable_income numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  net_pay numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending', -- pending | paid | hold
  paid_at timestamptz,
  payslip_document_id uuid,
  breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, employee_id)
);
ALTER TABLE public.payroll_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payroll_items_hr_all" ON public.payroll_items
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'hr'::app_role))
  WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "payroll_items_self_read" ON public.payroll_items
  FOR SELECT TO authenticated
  USING (employee_id = current_employee_id());

CREATE TRIGGER payroll_items_set_updated BEFORE UPDATE ON public.payroll_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_payroll_items_run ON public.payroll_items(run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_items_employee ON public.payroll_items(employee_id);

-- =========================================================
-- AUTO-CALCULATION RPCs
-- =========================================================
CREATE OR REPLACE FUNCTION public.compute_employee_payroll(
  _employee_id uuid,
  _year integer,
  _month integer,
  _working_days integer DEFAULT 22
) RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  emp public.employees;
  period_start date := make_date(_year, _month, 1);
  period_end date := (make_date(_year, _month, 1) + interval '1 month' - interval '1 day')::date;
  allow jsonb;
  ded jsonb;
  base numeric;
  allowances_total numeric := 0;
  deductions_total numeric := 0;
  taxable_allowance_total numeric := 0;
  present_days numeric := 0;
  absent_days numeric := 0;
  paid_leave numeric := 0;
  unpaid_leave numeric := 0;
  per_day numeric;
  prorate_factor numeric := 1;
  prorate_deduction numeric := 0;
  taxable numeric;
  tax_total numeric := 0;
  slab record;
  remaining numeric;
  taxed_amount numeric;
  slab_tax numeric;
  br jsonb := '[]'::jsonb;
  net numeric;
BEGIN
  SELECT * INTO emp FROM public.employees WHERE id = _employee_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Employee not found'; END IF;

  base := COALESCE(emp.gross_salary, 0);

  -- Allowances
  FOR allow IN SELECT * FROM jsonb_array_elements(COALESCE(emp.allowances, '[]'::jsonb))
  LOOP
    DECLARE amt numeric;
    BEGIN
      amt := CASE
        WHEN COALESCE(allow->>'type','fixed') = 'percent' THEN base * COALESCE((allow->>'value')::numeric, 0) / 100
        ELSE COALESCE((allow->>'value')::numeric, 0)
      END;
      allowances_total := allowances_total + amt;
      IF COALESCE((allow->>'taxable')::boolean, true) THEN
        taxable_allowance_total := taxable_allowance_total + amt;
      END IF;
    END;
  END LOOP;

  -- Deductions
  FOR ded IN SELECT * FROM jsonb_array_elements(COALESCE(emp.deductions, '[]'::jsonb))
  LOOP
    DECLARE amt numeric;
    BEGIN
      amt := CASE
        WHEN COALESCE(ded->>'type','fixed') = 'percent' THEN (base + allowances_total) * COALESCE((ded->>'value')::numeric, 0) / 100
        ELSE COALESCE((ded->>'value')::numeric, 0)
      END;
      deductions_total := deductions_total + amt;
    END;
  END LOOP;

  -- Attendance
  SELECT
    COUNT(*) FILTER (WHERE status IN ('present','approved')),
    COUNT(*) FILTER (WHERE status = 'absent')
    INTO present_days, absent_days
  FROM public.attendance_records
  WHERE employee_id = _employee_id
    AND work_date BETWEEN period_start AND period_end;

  -- Leave (approved within period)
  SELECT
    COALESCE(SUM(CASE WHEN lt.is_paid THEN lr.days ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN NOT lt.is_paid THEN lr.days ELSE 0 END), 0)
    INTO paid_leave, unpaid_leave
  FROM public.leave_requests lr
  LEFT JOIN public.leave_types lt ON lt.id = lr.leave_type_id
  WHERE lr.employee_id = _employee_id
    AND lr.status = 'approved'
    AND lr.from_date <= period_end
    AND lr.to_date >= period_start;

  -- Pro-ration: payable days = working_days - unpaid_leave - max(0, working_days - present - paid_leave - unpaid_leave)
  -- Simpler: payable = present + paid_leave (clamped to working_days); deduct (working_days - payable) days
  DECLARE payable numeric;
  BEGIN
    payable := LEAST(_working_days, present_days + paid_leave);
    -- If we have no attendance records, assume employee was present for working_days minus any leave
    IF present_days = 0 AND absent_days = 0 THEN
      payable := _working_days - unpaid_leave;
    END IF;
    payable := GREATEST(payable, 0);
    per_day := CASE WHEN _working_days > 0 THEN (base + allowances_total) / _working_days ELSE 0 END;
    prorate_factor := CASE WHEN _working_days > 0 THEN payable / _working_days ELSE 1 END;
    prorate_deduction := ROUND((per_day * (_working_days - payable))::numeric, 2);
  END;

  -- Taxable income (after pro-rate, before tax)
  taxable := GREATEST(base + taxable_allowance_total - prorate_deduction, 0);

  -- Apply tax brackets
  remaining := taxable;
  FOR slab IN
    SELECT * FROM public.tax_brackets
    WHERE is_active = true
    ORDER BY lower_bound ASC
  LOOP
    IF taxable <= slab.lower_bound THEN CONTINUE; END IF;
    taxed_amount := LEAST(taxable, COALESCE(slab.upper_bound, taxable)) - slab.lower_bound;
    IF taxed_amount <= 0 THEN CONTINUE; END IF;
    slab_tax := ROUND((taxed_amount * slab.percent / 100)::numeric, 2);
    tax_total := tax_total + slab_tax;
    br := br || jsonb_build_array(jsonb_build_object(
      'label', slab.label,
      'percent', slab.percent,
      'amount_in_slab', taxed_amount,
      'tax', slab_tax
    ));
  END LOOP;

  net := ROUND((base + allowances_total - deductions_total - prorate_deduction - tax_total)::numeric, 2);

  RETURN jsonb_build_object(
    'employee_id', _employee_id,
    'employee_name', emp.full_name,
    'designation', emp.designation,
    'department', emp.department,
    'currency', emp.currency,
    'gross_salary', base,
    'allowances_total', ROUND(allowances_total::numeric, 2),
    'deductions_total', ROUND(deductions_total::numeric, 2),
    'attendance_present', present_days,
    'attendance_absent', absent_days,
    'leave_paid_days', paid_leave,
    'leave_unpaid_days', unpaid_leave,
    'working_days', _working_days,
    'prorate_factor', ROUND(prorate_factor::numeric, 4),
    'prorate_deduction', prorate_deduction,
    'taxable_income', ROUND(taxable::numeric, 2),
    'tax', ROUND(tax_total::numeric, 2),
    'net_pay', net,
    'allowances', COALESCE(emp.allowances, '[]'::jsonb),
    'deductions', COALESCE(emp.deductions, '[]'::jsonb),
    'tax_breakdown', br,
    'period_start', period_start,
    'period_end', period_end
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_payroll_run(
  _year integer,
  _month integer,
  _working_days integer DEFAULT 22,
  _currency text DEFAULT 'USD',
  _notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  run_id uuid;
  emp record;
  calc jsonb;
  totals_gross numeric := 0;
  totals_net numeric := 0;
  totals_tax numeric := 0;
  totals_ded numeric := 0;
  cnt integer := 0;
BEGIN
  IF NOT (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'hr'::app_role)) THEN
    RAISE EXCEPTION 'Only HR/admin may generate payroll';
  END IF;

  INSERT INTO public.payroll_runs (period_year, period_month, working_days, currency, notes, created_by, status)
  VALUES (_year, _month, _working_days, _currency, _notes, auth.uid(), 'draft')
  ON CONFLICT (period_year, period_month) DO UPDATE
    SET working_days = EXCLUDED.working_days,
        currency = EXCLUDED.currency,
        notes = EXCLUDED.notes,
        updated_at = now()
  RETURNING id INTO run_id;

  -- Remove old draft items (regenerate) only if still draft
  DELETE FROM public.payroll_items
   WHERE run_id = run_id
     AND EXISTS (SELECT 1 FROM public.payroll_runs r WHERE r.id = run_id AND r.status = 'draft');

  FOR emp IN
    SELECT id FROM public.employees WHERE status = 'active'
  LOOP
    calc := public.compute_employee_payroll(emp.id, _year, _month, _working_days);

    INSERT INTO public.payroll_items (
      run_id, employee_id, employee_name, designation, department, currency,
      gross_salary, allowances_total, deductions_total,
      attendance_present, attendance_absent,
      leave_paid_days, leave_unpaid_days,
      prorate_factor, prorate_deduction,
      taxable_income, tax, net_pay, breakdown
    ) VALUES (
      run_id, emp.id,
      calc->>'employee_name', calc->>'designation', calc->>'department',
      COALESCE(calc->>'currency', _currency),
      (calc->>'gross_salary')::numeric,
      (calc->>'allowances_total')::numeric,
      (calc->>'deductions_total')::numeric,
      (calc->>'attendance_present')::numeric,
      (calc->>'attendance_absent')::numeric,
      (calc->>'leave_paid_days')::numeric,
      (calc->>'leave_unpaid_days')::numeric,
      (calc->>'prorate_factor')::numeric,
      (calc->>'prorate_deduction')::numeric,
      (calc->>'taxable_income')::numeric,
      (calc->>'tax')::numeric,
      (calc->>'net_pay')::numeric,
      calc
    )
    ON CONFLICT (run_id, employee_id) DO UPDATE SET
      gross_salary = EXCLUDED.gross_salary,
      allowances_total = EXCLUDED.allowances_total,
      deductions_total = EXCLUDED.deductions_total,
      attendance_present = EXCLUDED.attendance_present,
      attendance_absent = EXCLUDED.attendance_absent,
      leave_paid_days = EXCLUDED.leave_paid_days,
      leave_unpaid_days = EXCLUDED.leave_unpaid_days,
      prorate_factor = EXCLUDED.prorate_factor,
      prorate_deduction = EXCLUDED.prorate_deduction,
      taxable_income = EXCLUDED.taxable_income,
      tax = EXCLUDED.tax,
      net_pay = EXCLUDED.net_pay,
      breakdown = EXCLUDED.breakdown,
      updated_at = now();

    totals_gross := totals_gross + (calc->>'gross_salary')::numeric + (calc->>'allowances_total')::numeric;
    totals_ded := totals_ded + (calc->>'deductions_total')::numeric + (calc->>'prorate_deduction')::numeric;
    totals_tax := totals_tax + (calc->>'tax')::numeric;
    totals_net := totals_net + (calc->>'net_pay')::numeric;
    cnt := cnt + 1;
  END LOOP;

  UPDATE public.payroll_runs
     SET totals = jsonb_build_object(
       'employee_count', cnt,
       'gross', totals_gross,
       'deductions', totals_ded,
       'tax', totals_tax,
       'net', totals_net
     ),
     updated_at = now()
   WHERE id = run_id;

  RETURN run_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_payroll_run(_run_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'hr'::app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.payroll_runs
     SET status = 'approved', approved_by = auth.uid(), approved_at = now(), updated_at = now()
   WHERE id = _run_id AND status = 'draft';
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_payroll_run_paid(_run_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'hr'::app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.payroll_runs
     SET status = 'paid', paid_at = now(), updated_at = now()
   WHERE id = _run_id AND status IN ('approved','draft');
  UPDATE public.payroll_items
     SET status = 'paid', paid_at = now(), updated_at = now()
   WHERE run_id = _run_id AND status <> 'paid';
END;
$$;

-- =========================================================
-- CRM lead scoring
-- =========================================================
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS score integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.crm_compute_lead_score()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE s integer := 0;
BEGIN
  -- Contactability
  IF NEW.email IS NOT NULL AND length(btrim(NEW.email)) > 0 THEN s := s + 20; END IF;
  IF NEW.phone IS NOT NULL AND length(btrim(NEW.phone)) > 0 THEN s := s + 15; END IF;
  IF NEW.company IS NOT NULL AND length(btrim(NEW.company)) > 0 THEN s := s + 10; END IF;
  IF NEW.job_title IS NOT NULL AND length(btrim(NEW.job_title)) > 0 THEN s := s + 5; END IF;
  IF NEW.country IS NOT NULL AND length(btrim(NEW.country)) > 0 THEN s := s + 5; END IF;
  -- Source quality
  IF NEW.source IN ('invest_lead','contact_form') THEN s := s + 25;
  ELSIF NEW.source = 'newsletter' THEN s := s + 5;
  ELSE s := s + 10; END IF;
  -- Engagement
  IF NEW.last_contacted_at IS NOT NULL THEN s := s + 10; END IF;
  IF NEW.priority = 'high' THEN s := s + 10; END IF;
  -- Cap
  IF s > 100 THEN s := 100; END IF;
  NEW.score := s;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crm_leads_score ON public.crm_leads;
CREATE TRIGGER crm_leads_score
  BEFORE INSERT OR UPDATE ON public.crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.crm_compute_lead_score();

-- Backfill scores
UPDATE public.crm_leads SET updated_at = updated_at;

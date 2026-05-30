CREATE OR REPLACE FUNCTION public.payroll_v2_generate_run(
  _year int, _month int, _working_days int DEFAULT 22,
  _currency text DEFAULT 'USD', _notes text DEFAULT NULL,
  _employee_ids uuid[] DEFAULT NULL,
  _attendance_fallback boolean DEFAULT true
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id uuid;
  emp_rec record;
  comp jsonb;
  gross_sum numeric := 0; allow_sum numeric := 0; ded_sum numeric := 0;
  tax_sum numeric := 0; net_sum numeric := 0; n int := 0;
  cur_status text;
BEGIN
  IF NOT (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'hr'::public.app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO public.payroll_runs(period_year, period_month, working_days, currency, status, notes, created_by)
  VALUES (_year, _month, _working_days, _currency, 'draft', _notes, auth.uid())
  ON CONFLICT (period_year, period_month, currency) DO UPDATE
    SET working_days = EXCLUDED.working_days,
        notes = COALESCE(EXCLUDED.notes, payroll_runs.notes),
        updated_at = now()
  RETURNING id, status INTO v_run_id, cur_status;

  IF cur_status NOT IN ('draft','rejected') THEN
    RAISE EXCEPTION 'Run is locked (status=%); reopen it first', cur_status;
  END IF;

  DELETE FROM public.payroll_items WHERE run_id = v_run_id;

  FOR emp_rec IN
    SELECT e.id FROM public.employees e
    WHERE e.status = 'active'
      AND (_employee_ids IS NULL OR e.id = ANY(_employee_ids))
      AND (e.joining_date IS NULL OR e.joining_date <= (make_date(_year,_month,1) + interval '1 month - 1 day')::date)
      AND (e.last_working_day IS NULL OR e.last_working_day >= make_date(_year,_month,1))
  LOOP
    comp := public.payroll_v2_compute_employee(emp_rec.id, _year, _month, _working_days, _attendance_fallback);
    IF COALESCE(comp->>'currency','') <> _currency THEN CONTINUE; END IF;

    INSERT INTO public.payroll_items(
      run_id, employee_id, employee_name, designation, department, currency,
      gross_salary, allowances_total, deductions_total,
      attendance_present, attendance_absent, leave_paid_days, leave_unpaid_days,
      prorate_factor, prorate_deduction, taxable_income, tax, net_pay,
      status, breakdown
    ) VALUES (
      v_run_id, emp_rec.id,
      comp->>'employee_name', comp->>'designation', comp->>'department', comp->>'currency',
      (comp->>'gross_salary')::numeric, (comp->>'allowances_total')::numeric, (comp->>'deductions_total')::numeric,
      (comp->>'attendance_present')::numeric, (comp->>'attendance_absent')::numeric,
      (comp->>'leave_paid_days')::numeric, (comp->>'leave_unpaid_days')::numeric,
      (comp->>'prorate_factor')::numeric, (comp->>'prorate_deduction')::numeric,
      (comp->>'taxable_income')::numeric, (comp->>'tax')::numeric, (comp->>'net_pay')::numeric,
      'pending', comp->'breakdown'
    );
    gross_sum := gross_sum + (comp->>'gross_salary')::numeric;
    allow_sum := allow_sum + (comp->>'allowances_total')::numeric;
    ded_sum := ded_sum + (comp->>'deductions_total')::numeric + (comp->>'prorate_deduction')::numeric;
    tax_sum := tax_sum + (comp->>'tax')::numeric;
    net_sum := net_sum + (comp->>'net_pay')::numeric;
    n := n + 1;
  END LOOP;

  UPDATE public.payroll_runs
     SET status = 'draft',
         totals = jsonb_build_object(
           'employee_count', n,
           'gross', gross_sum,
           'allowances', allow_sum,
           'deductions', ded_sum,
           'tax', tax_sum,
           'net', net_sum
         ),
         updated_at = now()
   WHERE id = v_run_id;

  PERFORM public._payroll_log(v_run_id, NULL, 'generated', jsonb_build_object(
    'employees', n, 'currency', _currency, 'targeted', (_employee_ids IS NOT NULL)
  ));
  RETURN v_run_id;
END;
$$;
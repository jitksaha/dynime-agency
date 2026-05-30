
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
  v_run_id uuid;
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
  RETURNING id INTO v_run_id;

  DELETE FROM public.payroll_items pi
   WHERE pi.run_id = v_run_id
     AND EXISTS (SELECT 1 FROM public.payroll_runs r WHERE r.id = v_run_id AND r.status = 'draft');

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
      v_run_id, emp.id,
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
   WHERE id = v_run_id;

  RETURN v_run_id;
END;
$$;

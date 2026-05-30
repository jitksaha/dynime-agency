DELETE FROM public.payroll_runs
WHERE make_date(period_year, period_month, 1) > date_trunc('month', now())::date;

CREATE OR REPLACE FUNCTION public.payroll_generate_run(
  _year int, _month int, _currency text DEFAULT 'USD',
  _working_days int DEFAULT 22, _employee_ids uuid[] DEFAULT NULL,
  _replace boolean DEFAULT true
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_run_id uuid;
  pstart date := make_date(_year, _month, 1);
  pend   date := (make_date(_year, _month, 1) + interval '1 month - 1 day')::date;
  emp record;
  base numeric;
  alw numeric;
  ded numeric;
  present_d numeric;
  absent_d numeric;
  late_d numeric;
  ot numeric;
  paid_l numeric;
  unpaid_l numeric;
  per_day numeric;
  prorate_ded numeric;
  late_pen numeric;
  ot_pay numeric;
  gross_t numeric;
  tax_v numeric;
  net_v numeric;
  v_totals jsonb;
  cnt int := 0;
  t_gross numeric := 0;
  t_alw numeric := 0;
  t_ded numeric := 0;
  t_tax numeric := 0;
  t_net numeric := 0;
BEGIN
  IF NOT (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'hr'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF pstart > date_trunc('month', now())::date THEN
    RAISE EXCEPTION 'future payroll periods cannot be generated';
  END IF;

  INSERT INTO public.payroll_runs(period_year, period_month, currency, working_days, status, created_by)
  VALUES (_year, _month, _currency, _working_days, 'draft', auth.uid())
  ON CONFLICT (period_year, period_month, currency) DO UPDATE
    SET working_days = EXCLUDED.working_days,
        updated_at = now()
  RETURNING id INTO v_run_id;

  IF _replace THEN
    DELETE FROM public.payroll_items WHERE payroll_items.run_id = v_run_id;
  END IF;

  FOR emp IN
    SELECT e.* FROM public.employees e
     WHERE e.status = 'active'
       AND e.joining_date <= pend
       AND (e.last_working_day IS NULL OR e.last_working_day >= pstart)
       AND COALESCE(e.currency,'USD') = _currency
       AND (_employee_ids IS NULL OR e.id = ANY(_employee_ids))
  LOOP
    base := public.payroll_resolve_salary(emp.id, pend);

    alw := COALESCE((SELECT SUM((value->>'amount')::numeric)
                     FROM jsonb_array_elements(COALESCE(emp.allowances,'[]'::jsonb)) AS value), 0);
    ded := COALESCE((SELECT SUM((value->>'amount')::numeric)
                     FROM jsonb_array_elements(COALESCE(emp.deductions,'[]'::jsonb)) AS value), 0);

    SELECT
      COUNT(*) FILTER (WHERE status IN ('present','overtime','remote','wfh'))::numeric,
      COUNT(*) FILTER (WHERE status = 'absent')::numeric,
      COUNT(*) FILTER (WHERE status = 'late')::numeric,
      COALESCE(SUM(GREATEST(0,(total_minutes - 480))) FILTER (WHERE total_minutes > 480),0)/60.0
    INTO present_d, absent_d, late_d, ot
    FROM public.attendance_records
    WHERE employee_id = emp.id AND work_date BETWEEN pstart AND pend;

    SELECT
      COALESCE(SUM(lr.days) FILTER (WHERE lt.is_paid), 0),
      COALESCE(SUM(lr.days) FILTER (WHERE NOT lt.is_paid), 0)
    INTO paid_l, unpaid_l
    FROM public.leave_requests lr
    JOIN public.leave_types lt ON lt.id = lr.leave_type_id
    WHERE lr.employee_id = emp.id AND lr.status='approved'
      AND lr.from_date <= pend AND lr.to_date >= pstart;

    per_day := (base + alw) / NULLIF(_working_days,0);
    DECLARE lop numeric := GREATEST(0, _working_days - (present_d + paid_l));
    BEGIN
      prorate_ded := ROUND((per_day * LEAST(lop, _working_days))::numeric, 2);
    END;
    late_pen := ROUND((per_day * 0.5 * late_d)::numeric, 2);
    ot_pay   := ROUND((base / NULLIF(_working_days,0) / 8.0 * 1.5 * ot)::numeric, 2);

    gross_t := base + alw - prorate_ded - late_pen + ot_pay;
    tax_v   := public.payroll_compute_tax(gross_t, _currency, pend);
    net_v   := gross_t - ded - tax_v;

    INSERT INTO public.payroll_items(
      run_id, employee_id, employee_name, department, designation, currency,
      base_salary, allowances_total, deductions_total,
      attendance_present, attendance_absent, attendance_late, overtime_hours,
      leave_paid_days, leave_unpaid_days, prorate_factor, prorate_deduction,
      taxable_income, tax, net_pay, status, breakdown
    ) VALUES (
      v_run_id, emp.id, emp.full_name, emp.department, emp.designation, _currency,
      base, alw, ded,
      present_d, absent_d, late_d, ot,
      paid_l, unpaid_l, 1, prorate_ded,
      gross_t, tax_v, net_v, 'pending',
      jsonb_build_object(
        'base', base, 'fixed_allowances', emp.allowances, 'fixed_deductions', emp.deductions,
        'overtime_pay', ot_pay, 'late_penalty', late_pen, 'prorate_deduction', prorate_ded
      )
    )
    ON CONFLICT (run_id, employee_id) DO UPDATE SET
      base_salary=EXCLUDED.base_salary, allowances_total=EXCLUDED.allowances_total,
      deductions_total=EXCLUDED.deductions_total, attendance_present=EXCLUDED.attendance_present,
      attendance_absent=EXCLUDED.attendance_absent, attendance_late=EXCLUDED.attendance_late,
      overtime_hours=EXCLUDED.overtime_hours, leave_paid_days=EXCLUDED.leave_paid_days,
      leave_unpaid_days=EXCLUDED.leave_unpaid_days, prorate_deduction=EXCLUDED.prorate_deduction,
      taxable_income=EXCLUDED.taxable_income, tax=EXCLUDED.tax, net_pay=EXCLUDED.net_pay,
      breakdown=EXCLUDED.breakdown, updated_at=now();

    cnt := cnt + 1;
    t_gross := t_gross + base + alw;
    t_alw := t_alw + alw;
    t_ded := t_ded + ded + prorate_ded + late_pen;
    t_tax := t_tax + tax_v;
    t_net := t_net + net_v;
  END LOOP;

  v_totals := jsonb_build_object(
    'employee_count', cnt,
    'gross', t_gross, 'allowances', t_alw, 'deductions', t_ded,
    'tax', t_tax, 'net', t_net, 'paid', 0, 'pending', t_net
  );

  UPDATE public.payroll_runs SET totals = v_totals, updated_at = now() WHERE id = v_run_id;

  PERFORM public._payroll_log(v_run_id, NULL, 'generated', v_totals);
  RETURN v_run_id;
END;
$$;
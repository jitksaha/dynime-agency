
-- Add missing active employees to an existing (unlocked) run, without wiping existing items.
CREATE OR REPLACE FUNCTION public.payroll_sync_run(_run uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r record;
  emp record;
  pstart date;
  pend date;
  added int := 0;
  base numeric; alw numeric; ded numeric;
  present_d numeric; absent_d numeric; late_d numeric; ot numeric;
  paid_l numeric; unpaid_l numeric;
  per_day numeric; prorate_ded numeric; late_pen numeric; ot_pay numeric;
  gross_t numeric; tax_v numeric; net_v numeric;
BEGIN
  IF NOT (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'hr'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT * INTO r FROM public.payroll_runs WHERE id = _run;
  IF NOT FOUND THEN RAISE EXCEPTION 'run not found'; END IF;
  IF r.locked THEN RAISE EXCEPTION 'run is locked'; END IF;

  pstart := make_date(r.period_year, r.period_month, 1);
  pend   := (pstart + interval '1 month - 1 day')::date;

  FOR emp IN
    SELECT e.* FROM public.employees e
     WHERE e.status = 'active'
       AND e.joining_date <= pend
       AND (e.last_working_day IS NULL OR e.last_working_day >= pstart)
       AND COALESCE(e.currency,'USD') = r.currency
       AND NOT EXISTS (
         SELECT 1 FROM public.payroll_items pi WHERE pi.run_id = _run AND pi.employee_id = e.id
       )
  LOOP
    base := public.payroll_resolve_salary(emp.id, pend);
    alw := COALESCE((SELECT SUM((value->>'amount')::numeric) FROM jsonb_array_elements(COALESCE(emp.allowances,'[]'::jsonb)) AS value), 0);
    ded := COALESCE((SELECT SUM((value->>'amount')::numeric) FROM jsonb_array_elements(COALESCE(emp.deductions,'[]'::jsonb)) AS value), 0);

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

    per_day := (base + alw) / NULLIF(r.working_days,0);
    DECLARE lop numeric := GREATEST(0, r.working_days - (present_d + paid_l));
    BEGIN
      prorate_ded := ROUND((per_day * LEAST(lop, r.working_days))::numeric, 2);
    END;
    late_pen := ROUND((per_day * 0.5 * late_d)::numeric, 2);
    ot_pay   := ROUND((base / NULLIF(r.working_days,0) / 8.0 * 1.5 * ot)::numeric, 2);

    gross_t := base + alw - prorate_ded - late_pen + ot_pay;
    tax_v   := public.payroll_compute_tax(gross_t, r.currency, pend);
    net_v   := gross_t - ded - tax_v;

    INSERT INTO public.payroll_items(
      run_id, employee_id, employee_name, department, designation, currency,
      base_salary, allowances_total, deductions_total,
      attendance_present, attendance_absent, attendance_late, overtime_hours,
      leave_paid_days, leave_unpaid_days, prorate_factor, prorate_deduction,
      taxable_income, tax, net_pay, status, breakdown
    ) VALUES (
      _run, emp.id, emp.full_name, emp.department, emp.designation, r.currency,
      base, alw, ded,
      present_d, absent_d, late_d, ot,
      paid_l, unpaid_l, 1, prorate_ded,
      gross_t, tax_v, net_v, 'pending',
      jsonb_build_object('synced', true, 'per_day', per_day, 'late_penalty', late_pen, 'overtime_pay', ot_pay)
    );
    added := added + 1;
  END LOOP;

  IF added > 0 THEN
    PERFORM public.payroll_recompute_totals(_run);
  END IF;
  RETURN added;
END;
$$;

-- Ensure current month's run exists (creates draft) and syncs new employees in.
CREATE OR REPLACE FUNCTION public.payroll_ensure_current_month(_currency text DEFAULT 'USD', _working_days int DEFAULT 22)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_run_id uuid;
  y int := EXTRACT(YEAR FROM now())::int;
  m int := EXTRACT(MONTH FROM now())::int;
BEGIN
  IF NOT (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'hr'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT id INTO v_run_id FROM public.payroll_runs
   WHERE period_year = y AND period_month = m AND currency = _currency;

  IF v_run_id IS NULL THEN
    v_run_id := public.payroll_generate_run(y, m, _currency, _working_days, NULL, true);
  ELSE
    PERFORM public.payroll_sync_run(v_run_id);
  END IF;

  RETURN v_run_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.payroll_sync_run(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.payroll_ensure_current_month(text, int) TO authenticated;

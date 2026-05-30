CREATE OR REPLACE FUNCTION public.compute_employee_payroll(_employee_id uuid, _year integer, _month integer, _working_days integer DEFAULT 22)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  emp record;
  period_start date := make_date(_year, _month, 1);
  period_end date := (make_date(_year, _month, 1) + interval '1 month - 1 day')::date;
  base numeric := 0;
  allowances_total numeric := 0;
  taxable_allowance_total numeric := 0;
  deductions_total numeric := 0;
  present_days numeric := 0;
  absent_days numeric := 0;
  paid_leave numeric := 0;
  unpaid_leave numeric := 0;
  payable numeric;
  prorate_factor numeric := 1;
  prorate_deduction numeric := 0;
  per_day numeric;
  taxable numeric := 0;
  taxed_amount numeric;
  slab record;
  slab_tax numeric;
  tax_total numeric := 0;
  net numeric;
  br jsonb := '[]'::jsonb;
  item jsonb;
BEGIN
  SELECT * INTO emp FROM public.employees WHERE id = _employee_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'employee not found'; END IF;

  base := COALESCE(emp.gross_salary, 0);

  IF emp.allowances IS NOT NULL THEN
    FOR item IN SELECT * FROM jsonb_array_elements(emp.allowances) LOOP
      allowances_total := allowances_total + COALESCE((item->>'amount')::numeric, 0);
      IF COALESCE((item->>'taxable')::boolean, true) THEN
        taxable_allowance_total := taxable_allowance_total + COALESCE((item->>'amount')::numeric, 0);
      END IF;
    END LOOP;
  END IF;

  IF emp.deductions IS NOT NULL THEN
    FOR item IN SELECT * FROM jsonb_array_elements(emp.deductions) LOOP
      deductions_total := deductions_total + COALESCE((item->>'amount')::numeric, 0);
    END LOOP;
  END IF;

  SELECT
    COALESCE(SUM(CASE WHEN status IN ('present','late','remote') THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END), 0)
  INTO present_days, absent_days
  FROM public.attendance_records
  WHERE employee_id = _employee_id AND work_date BETWEEN period_start AND period_end;

  SELECT
    COALESCE(SUM(CASE WHEN COALESCE(lt.is_paid, true) THEN lr.days_count ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN COALESCE(lt.is_paid, true) THEN 0 ELSE lr.days_count END), 0)
  INTO paid_leave, unpaid_leave
  FROM public.leave_requests lr
  LEFT JOIN public.leave_types lt ON lt.id = lr.leave_type_id
  WHERE lr.employee_id = _employee_id
    AND lr.status = 'approved'
    AND lr.start_date <= period_end AND lr.end_date >= period_start;

  payable := LEAST(_working_days, present_days + paid_leave);
  IF _working_days > 0 THEN
    prorate_factor := payable::numeric / _working_days::numeric;
    per_day := (base + taxable_allowance_total) / _working_days;
    prorate_deduction := ROUND((per_day * (_working_days - payable))::numeric, 2);
  END IF;

  taxable := GREATEST(base + taxable_allowance_total - prorate_deduction, 0);

  FOR slab IN
    SELECT * FROM public.tax_brackets
    WHERE is_active = true
      AND currency = emp.currency
      AND effective_from <= period_end
      AND (effective_to IS NULL OR effective_to >= period_start)
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
$function$;
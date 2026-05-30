-- 1. Add effective-date columns
ALTER TABLE public.tax_brackets
  ADD COLUMN IF NOT EXISTS effective_from date NOT NULL DEFAULT '2000-01-01',
  ADD COLUMN IF NOT EXISTS effective_to date;

CREATE INDEX IF NOT EXISTS idx_tax_brackets_effective
  ON public.tax_brackets (currency, effective_from, effective_to)
  WHERE is_active;

-- 2. Validation trigger
CREATE OR REPLACE FUNCTION public.validate_tax_bracket()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE conflict_count integer;
BEGIN
  IF NEW.label IS NULL OR length(btrim(NEW.label)) = 0 THEN
    RAISE EXCEPTION 'Label is required';
  END IF;
  IF NEW.lower_bound < 0 THEN
    RAISE EXCEPTION 'Lower bound must be >= 0';
  END IF;
  IF NEW.upper_bound IS NOT NULL AND NEW.upper_bound <= NEW.lower_bound THEN
    RAISE EXCEPTION 'Upper bound must be greater than lower bound (or empty for ∞)';
  END IF;
  IF NEW.percent < 0 OR NEW.percent > 100 THEN
    RAISE EXCEPTION 'Tax percent must be between 0 and 100';
  END IF;
  IF NEW.effective_to IS NOT NULL AND NEW.effective_to < NEW.effective_from THEN
    RAISE EXCEPTION 'Effective end date must be on or after the start date';
  END IF;

  -- Overlap check: same currency, active, intersecting date window, overlapping bracket range
  IF NEW.is_active THEN
    SELECT count(*) INTO conflict_count
    FROM public.tax_brackets t
    WHERE t.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND t.is_active
      AND t.currency = NEW.currency
      -- date windows overlap
      AND t.effective_from <= COALESCE(NEW.effective_to, DATE '9999-12-31')
      AND COALESCE(t.effective_to, DATE '9999-12-31') >= NEW.effective_from
      -- bracket ranges overlap
      AND t.lower_bound < COALESCE(NEW.upper_bound, 1e18)
      AND COALESCE(t.upper_bound, 1e18) > NEW.lower_bound;
    IF conflict_count > 0 THEN
      RAISE EXCEPTION 'Overlaps with another active slab for % in this date range', NEW.currency;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_tax_bracket_trg ON public.tax_brackets;
CREATE TRIGGER validate_tax_bracket_trg
  BEFORE INSERT OR UPDATE ON public.tax_brackets
  FOR EACH ROW EXECUTE FUNCTION public.validate_tax_bracket();

-- 3. Update payroll compute to respect effective dates + currency
CREATE OR REPLACE FUNCTION public.compute_employee_payroll(
  _employee_id uuid, _year integer, _month integer, _working_days integer DEFAULT 22
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  remaining numeric;
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

  -- Allowances
  IF emp.allowances IS NOT NULL THEN
    FOR item IN SELECT * FROM jsonb_array_elements(emp.allowances) LOOP
      allowances_total := allowances_total + COALESCE((item->>'amount')::numeric, 0);
      IF COALESCE((item->>'taxable')::boolean, true) THEN
        taxable_allowance_total := taxable_allowance_total + COALESCE((item->>'amount')::numeric, 0);
      END IF;
    END LOOP;
  END IF;

  -- Deductions
  IF emp.deductions IS NOT NULL THEN
    FOR item IN SELECT * FROM jsonb_array_elements(emp.deductions) LOOP
      deductions_total := deductions_total + COALESCE((item->>'amount')::numeric, 0);
    END LOOP;
  END IF;

  -- Attendance
  SELECT
    COALESCE(SUM(CASE WHEN status IN ('present','late','remote') THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END), 0)
  INTO present_days, absent_days
  FROM public.attendance_records
  WHERE employee_id = _employee_id AND date BETWEEN period_start AND period_end;

  -- Leave
  SELECT
    COALESCE(SUM(CASE WHEN lower(leave_type) NOT IN ('unpaid','lop') THEN days_count ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN lower(leave_type) IN ('unpaid','lop') THEN days_count ELSE 0 END), 0)
  INTO paid_leave, unpaid_leave
  FROM public.leave_requests
  WHERE employee_id = _employee_id
    AND status = 'approved'
    AND start_date <= period_end AND end_date >= period_start;

  -- Pro-rate
  payable := LEAST(_working_days, present_days + paid_leave);
  IF _working_days > 0 THEN
    prorate_factor := payable::numeric / _working_days::numeric;
    per_day := (base + taxable_allowance_total) / _working_days;
    prorate_deduction := ROUND((per_day * (_working_days - payable))::numeric, 2);
  END IF;

  taxable := GREATEST(base + taxable_allowance_total - prorate_deduction, 0);

  -- Apply effective tax slabs for this period and currency
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
$$;
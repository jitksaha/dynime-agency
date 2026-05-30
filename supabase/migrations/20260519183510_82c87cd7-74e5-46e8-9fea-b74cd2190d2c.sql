
-- 1) salary history
CREATE TABLE IF NOT EXISTS public.employee_salary_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  effective_from date NOT NULL,
  effective_to date,
  currency text NOT NULL DEFAULT 'USD',
  gross_salary numeric NOT NULL DEFAULT 0,
  allowances jsonb NOT NULL DEFAULT '[]'::jsonb,
  deductions jsonb NOT NULL DEFAULT '[]'::jsonb,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX IF NOT EXISTS idx_esh_emp_period ON public.employee_salary_history(employee_id, effective_from);

ALTER TABLE public.employee_salary_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS esh_admin_all ON public.employee_salary_history;
CREATE POLICY esh_admin_all ON public.employee_salary_history
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'hr'::public.app_role))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'hr'::public.app_role));

DROP POLICY IF EXISTS esh_self_read ON public.employee_salary_history;
CREATE POLICY esh_self_read ON public.employee_salary_history
  FOR SELECT TO authenticated
  USING (employee_id = public.current_employee_id());

CREATE TRIGGER esh_set_updated_at
  BEFORE UPDATE ON public.employee_salary_history
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) allow per-currency monthly runs
ALTER TABLE public.payroll_runs
  DROP CONSTRAINT IF EXISTS payroll_runs_period_year_period_month_key;
CREATE UNIQUE INDEX IF NOT EXISTS payroll_runs_year_month_currency_key
  ON public.payroll_runs(period_year, period_month, currency);

-- 3) resolve salary effective for a given month
CREATE OR REPLACE FUNCTION public.payroll_v2_resolve_salary(_employee_id uuid, _year int, _month int)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  period_end date := (make_date(_year,_month,1) + interval '1 month - 1 day')::date;
  period_start date := make_date(_year,_month,1);
  h record;
  e record;
BEGIN
  SELECT * INTO h FROM public.employee_salary_history
   WHERE employee_id = _employee_id
     AND effective_from <= period_end
     AND (effective_to IS NULL OR effective_to >= period_start)
   ORDER BY effective_from DESC
   LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'gross_salary', h.gross_salary,
      'currency', h.currency,
      'allowances', h.allowances,
      'deductions', h.deductions,
      'source', 'history'
    );
  END IF;
  SELECT * INTO e FROM public.employees WHERE id = _employee_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('gross_salary',0,'currency','USD','allowances','[]'::jsonb,'deductions','[]'::jsonb,'source','none');
  END IF;
  RETURN jsonb_build_object(
    'gross_salary', e.gross_salary,
    'currency', e.currency,
    'allowances', COALESCE(e.allowances,'[]'::jsonb),
    'deductions', COALESCE(e.deductions,'[]'::jsonb),
    'source','employee'
  );
END;
$$;

-- 4) per-employee monthly compute
CREATE OR REPLACE FUNCTION public.payroll_v2_compute_employee(
  _employee_id uuid, _year int, _month int, _working_days int DEFAULT 22,
  _attendance_fallback boolean DEFAULT true
) RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  emp record;
  sal jsonb := public.payroll_v2_resolve_salary(_employee_id, _year, _month);
  base numeric := COALESCE((sal->>'gross_salary')::numeric, 0);
  ccy text := COALESCE(sal->>'currency','USD');
  allowances jsonb := COALESCE(sal->'allowances','[]'::jsonb);
  deductions jsonb := COALESCE(sal->'deductions','[]'::jsonb);
  period_start date := make_date(_year,_month,1);
  period_end date := (period_start + interval '1 month - 1 day')::date;
  item jsonb;
  amt numeric;
  allowances_total numeric := 0;
  taxable_allowance numeric := 0;
  fixed_allowance numeric := 0;
  deductions_total numeric := 0;
  alw_out jsonb := '[]'::jsonb;
  ded_out jsonb := '[]'::jsonb;
  attendance_rows int := 0;
  present_days numeric := 0;
  absent_days numeric := 0;
  paid_leave numeric := 0;
  unpaid_leave numeric := 0;
  lop_days numeric := 0;
  per_day numeric := 0;
  prorate_factor numeric := 1;
  prorate_deduction numeric := 0;
  taxable numeric := 0;
  tax_total numeric := 0;
  slab record;
  taxed_amount numeric;
  slab_tax numeric;
  tax_br jsonb := '[]'::jsonb;
  net numeric;
BEGIN
  SELECT * INTO emp FROM public.employees WHERE id = _employee_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'employee not found'; END IF;

  -- allowances (fixed | percent, taxable flag default true, fixed-only counts in per-day for prorate)
  FOR item IN SELECT * FROM jsonb_array_elements(allowances) LOOP
    IF lower(COALESCE(item->>'type','fixed')) = 'percent' THEN
      amt := round((base * COALESCE((item->>'value')::numeric, COALESCE((item->>'amount')::numeric,0)) / 100)::numeric, 2);
    ELSE
      amt := COALESCE((item->>'amount')::numeric, COALESCE((item->>'value')::numeric,0));
    END IF;
    allowances_total := allowances_total + amt;
    IF COALESCE((item->>'taxable')::boolean, true) THEN
      taxable_allowance := taxable_allowance + amt;
    END IF;
    IF lower(COALESCE(item->>'type','fixed')) <> 'percent' THEN
      fixed_allowance := fixed_allowance + amt;
    END IF;
    alw_out := alw_out || jsonb_build_array(jsonb_build_object(
      'label', COALESCE(item->>'label','Allowance'),
      'amount', amt,
      'taxable', COALESCE((item->>'taxable')::boolean,true)
    ));
  END LOOP;

  FOR item IN SELECT * FROM jsonb_array_elements(deductions) LOOP
    IF lower(COALESCE(item->>'type','fixed')) = 'percent' THEN
      amt := round((base * COALESCE((item->>'value')::numeric, COALESCE((item->>'amount')::numeric,0)) / 100)::numeric, 2);
    ELSE
      amt := COALESCE((item->>'amount')::numeric, COALESCE((item->>'value')::numeric,0));
    END IF;
    deductions_total := deductions_total + amt;
    ded_out := ded_out || jsonb_build_array(jsonb_build_object(
      'label', COALESCE(item->>'label','Deduction'),
      'amount', amt
    ));
  END LOOP;

  -- attendance
  SELECT COUNT(*),
         COALESCE(SUM(CASE WHEN status IN ('present','late','remote') THEN 1 ELSE 0 END),0),
         COALESCE(SUM(CASE WHEN status='absent' THEN 1 ELSE 0 END),0)
  INTO attendance_rows, present_days, absent_days
  FROM public.attendance_records
  WHERE employee_id = _employee_id AND work_date BETWEEN period_start AND period_end;

  -- leave
  SELECT COALESCE(SUM(CASE WHEN COALESCE(lt.is_paid,true) THEN lr.days_count ELSE 0 END),0),
         COALESCE(SUM(CASE WHEN COALESCE(lt.is_paid,true) THEN 0 ELSE lr.days_count END),0)
  INTO paid_leave, unpaid_leave
  FROM public.leave_requests lr
  LEFT JOIN public.leave_types lt ON lt.id = lr.leave_type_id
  WHERE lr.employee_id = _employee_id
    AND lr.status='approved'
    AND lr.start_date <= period_end AND lr.end_date >= period_start;

  -- if no attendance rows, assume full attendance for the month (historical fallback)
  IF attendance_rows = 0 AND _attendance_fallback THEN
    present_days := GREATEST(_working_days - unpaid_leave - paid_leave, 0);
    absent_days := 0;
  END IF;

  -- loss-of-pay days = working_days - (present + paid leave)
  lop_days := GREATEST(_working_days - (present_days + paid_leave), 0);
  IF _working_days > 0 THEN
    per_day := (base + fixed_allowance) / _working_days;
    prorate_deduction := round((per_day * lop_days)::numeric, 2);
    prorate_factor := GREATEST(1 - lop_days::numeric / _working_days::numeric, 0);
  END IF;

  taxable := GREATEST(base + taxable_allowance - prorate_deduction, 0);

  FOR slab IN
    SELECT * FROM public.tax_brackets
    WHERE is_active = true AND currency = ccy
      AND effective_from <= period_end
      AND (effective_to IS NULL OR effective_to >= period_start)
    ORDER BY lower_bound ASC
  LOOP
    IF taxable <= slab.lower_bound THEN CONTINUE; END IF;
    taxed_amount := LEAST(taxable, COALESCE(slab.upper_bound, taxable)) - slab.lower_bound;
    IF taxed_amount <= 0 THEN CONTINUE; END IF;
    slab_tax := round((taxed_amount * slab.percent / 100)::numeric, 2);
    tax_total := tax_total + slab_tax;
    tax_br := tax_br || jsonb_build_array(jsonb_build_object(
      'label', slab.label, 'percent', slab.percent, 'amount_in_slab', taxed_amount, 'tax', slab_tax
    ));
  END LOOP;

  net := round((base + allowances_total - deductions_total - prorate_deduction - tax_total)::numeric, 2);

  RETURN jsonb_build_object(
    'employee_id', _employee_id,
    'employee_name', emp.full_name,
    'designation', emp.designation,
    'department', emp.department,
    'currency', ccy,
    'gross_salary', base,
    'allowances_total', allowances_total,
    'deductions_total', deductions_total,
    'attendance_present', present_days,
    'attendance_absent', absent_days,
    'leave_paid_days', paid_leave,
    'leave_unpaid_days', unpaid_leave,
    'lop_days', lop_days,
    'prorate_factor', prorate_factor,
    'prorate_deduction', prorate_deduction,
    'taxable_income', taxable,
    'tax', tax_total,
    'net_pay', net,
    'breakdown', jsonb_build_object(
      'allowances', alw_out,
      'deductions', ded_out,
      'tax_breakdown', tax_br,
      'salary_source', sal->>'source',
      'attendance_fallback_used', (attendance_rows = 0 AND _attendance_fallback)
    )
  );
END;
$$;

-- 5) bulk generate
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
  run_id uuid;
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
  RETURNING id, status INTO run_id, cur_status;

  IF cur_status NOT IN ('draft','rejected') THEN
    RAISE EXCEPTION 'Run is locked (status=%); reopen it first', cur_status;
  END IF;

  DELETE FROM public.payroll_items WHERE run_id = run_id;

  FOR emp_rec IN
    SELECT e.id FROM public.employees e
    WHERE e.status = 'active'
      AND (_employee_ids IS NULL OR e.id = ANY(_employee_ids))
      AND (e.joining_date IS NULL OR e.joining_date <= (make_date(_year,_month,1) + interval '1 month - 1 day')::date)
      AND (e.last_working_day IS NULL OR e.last_working_day >= make_date(_year,_month,1))
  LOOP
    comp := public.payroll_v2_compute_employee(emp_rec.id, _year, _month, _working_days, _attendance_fallback);
    -- only include employees in the requested currency
    IF COALESCE(comp->>'currency','') <> _currency THEN CONTINUE; END IF;

    INSERT INTO public.payroll_items(
      run_id, employee_id, employee_name, designation, department, currency,
      gross_salary, allowances_total, deductions_total,
      attendance_present, attendance_absent, leave_paid_days, leave_unpaid_days,
      prorate_factor, prorate_deduction, taxable_income, tax, net_pay,
      status, breakdown
    ) VALUES (
      run_id, emp_rec.id,
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
   WHERE id = run_id;

  PERFORM public._payroll_log(run_id, NULL, 'generated', jsonb_build_object(
    'employees', n, 'currency', _currency, 'targeted', (_employee_ids IS NOT NULL)
  ));
  RETURN run_id;
END;
$$;

-- 6) per-item edit
CREATE OR REPLACE FUNCTION public.payroll_v2_update_item(
  _item_id uuid, _patch jsonb, _note text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_item record;
  new_gross numeric;
  new_alw numeric;
  new_ded numeric;
  new_pro numeric;
  new_tax numeric;
  new_net numeric;
  run_status text;
BEGIN
  IF NOT (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'hr'::public.app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT pi.*, pr.status AS run_status INTO old_item
    FROM public.payroll_items pi JOIN public.payroll_runs pr ON pr.id = pi.run_id
    WHERE pi.id = _item_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item not found'; END IF;
  IF old_item.run_status NOT IN ('draft','rejected') THEN
    RAISE EXCEPTION 'Cannot edit item in % run', old_item.run_status;
  END IF;

  new_gross := COALESCE((_patch->>'gross_salary')::numeric, old_item.gross_salary);
  new_alw   := COALESCE((_patch->>'allowances_total')::numeric, old_item.allowances_total);
  new_ded   := COALESCE((_patch->>'deductions_total')::numeric, old_item.deductions_total);
  new_pro   := COALESCE((_patch->>'prorate_deduction')::numeric, old_item.prorate_deduction);
  new_tax   := COALESCE((_patch->>'tax')::numeric, old_item.tax);
  new_net   := round((new_gross + new_alw - new_ded - new_pro - new_tax)::numeric, 2);

  UPDATE public.payroll_items
     SET gross_salary=new_gross, allowances_total=new_alw, deductions_total=new_ded,
         prorate_deduction=new_pro, tax=new_tax, net_pay=new_net
   WHERE id = _item_id;

  PERFORM public._payroll_log(old_item.run_id, _item_id, 'item_updated', jsonb_build_object(
    'employee_name', old_item.employee_name,
    'note', _note,
    'before', jsonb_build_object('gross',old_item.gross_salary,'allow',old_item.allowances_total,'ded',old_item.deductions_total,'prorate',old_item.prorate_deduction,'tax',old_item.tax,'net',old_item.net_pay),
    'after',  jsonb_build_object('gross',new_gross,'allow',new_alw,'ded',new_ded,'prorate',new_pro,'tax',new_tax,'net',new_net)
  ));
END;
$$;

-- 7) approve
CREATE OR REPLACE FUNCTION public.payroll_v2_approve_run(_run_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'hr'::public.app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.payroll_runs
     SET status='approved', approved_by=auth.uid(), approved_at=now(), updated_at=now()
   WHERE id=_run_id AND status IN ('draft','rejected','pending_approval');
  IF NOT FOUND THEN RAISE EXCEPTION 'Run cannot be approved (wrong status)'; END IF;
  PERFORM public._payroll_log(_run_id, NULL, 'approved', '{}'::jsonb);
END;
$$;

-- 8) mark paid
CREATE OR REPLACE FUNCTION public.payroll_v2_mark_paid(
  _run_id uuid, _item_ids uuid[] DEFAULT NULL, _payment_method text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE remaining int;
BEGIN
  IF NOT (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'hr'::public.app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.payroll_items
     SET status='paid', paid_at=now(), paid_by=auth.uid(),
         payment_method=COALESCE(_payment_method, payment_method)
   WHERE run_id=_run_id
     AND (_item_ids IS NULL OR id = ANY(_item_ids))
     AND status <> 'paid';

  SELECT count(*) INTO remaining
    FROM public.payroll_items WHERE run_id=_run_id AND status <> 'paid';
  IF remaining = 0 THEN
    UPDATE public.payroll_runs
       SET status='paid', paid_at=now(), updated_at=now()
     WHERE id=_run_id;
  END IF;

  PERFORM public._payroll_log(_run_id, NULL, 'marked_paid', jsonb_build_object(
    'items', COALESCE(array_length(_item_ids,1), 0), 'method', _payment_method
  ));
END;
$$;

-- 9) reopen
CREATE OR REPLACE FUNCTION public.payroll_v2_reopen_run(_run_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE paid_count int;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can reopen a run';
  END IF;
  SELECT count(*) INTO paid_count FROM public.payroll_items WHERE run_id=_run_id AND status='paid';
  IF paid_count > 0 THEN RAISE EXCEPTION 'Cannot reopen: % items already paid', paid_count; END IF;
  UPDATE public.payroll_runs
     SET status='draft', approved_by=NULL, approved_at=NULL, updated_at=now()
   WHERE id=_run_id AND status IN ('approved','rejected','pending_approval');
  IF NOT FOUND THEN RAISE EXCEPTION 'Run cannot be reopened (wrong status)'; END IF;
  PERFORM public._payroll_log(_run_id, NULL, 'reopened', '{}'::jsonb);
END;
$$;

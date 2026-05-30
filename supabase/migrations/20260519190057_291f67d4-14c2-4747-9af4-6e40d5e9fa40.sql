
-- =============================================================
-- PAYROLL MODULE
-- =============================================================

-- ---------- tax_brackets (re-created) ----------
CREATE TABLE IF NOT EXISTS public.tax_brackets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  lower_bound numeric NOT NULL DEFAULT 0,
  upper_bound numeric,
  percent numeric NOT NULL DEFAULT 0,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tax_brackets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tax_brackets read" ON public.tax_brackets;
CREATE POLICY "tax_brackets read" ON public.tax_brackets FOR SELECT USING (true);
DROP POLICY IF EXISTS "tax_brackets write" ON public.tax_brackets;
CREATE POLICY "tax_brackets write" ON public.tax_brackets FOR ALL
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'hr'::app_role))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'hr'::app_role));

-- ---------- payroll_runs ----------
CREATE TABLE public.payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_year int NOT NULL,
  period_month int NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_start date GENERATED ALWAYS AS (make_date(period_year, period_month, 1)) STORED,
  currency text NOT NULL DEFAULT 'USD',
  working_days int NOT NULL DEFAULT 22,
  status text NOT NULL DEFAULT 'draft', -- draft|processing|approved|paid|partial_paid|cancelled
  locked boolean NOT NULL DEFAULT false,
  totals jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  approved_at timestamptz,
  paid_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (period_year, period_month, currency)
);
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_payroll_runs_period ON public.payroll_runs(period_year, period_month);

-- ---------- payroll_items ----------
CREATE TABLE public.payroll_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  employee_name text NOT NULL,
  department text,
  designation text,
  currency text NOT NULL DEFAULT 'USD',
  base_salary numeric NOT NULL DEFAULT 0,
  allowances_total numeric NOT NULL DEFAULT 0,
  deductions_total numeric NOT NULL DEFAULT 0,
  attendance_present numeric NOT NULL DEFAULT 0,
  attendance_absent numeric NOT NULL DEFAULT 0,
  attendance_late numeric NOT NULL DEFAULT 0,
  overtime_hours numeric NOT NULL DEFAULT 0,
  leave_paid_days numeric NOT NULL DEFAULT 0,
  leave_unpaid_days numeric NOT NULL DEFAULT 0,
  prorate_factor numeric NOT NULL DEFAULT 1,
  prorate_deduction numeric NOT NULL DEFAULT 0,
  taxable_income numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  net_pay numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending', -- pending|processing|paid|partial_paid|cancelled
  payment_method text,
  paid_at timestamptz,
  notes text,
  breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, employee_id)
);
ALTER TABLE public.payroll_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_payroll_items_run ON public.payroll_items(run_id);
CREATE INDEX idx_payroll_items_emp ON public.payroll_items(employee_id);
CREATE INDEX idx_payroll_items_status ON public.payroll_items(status);

-- ---------- payroll_adjustments ----------
CREATE TABLE public.payroll_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.payroll_items(id) ON DELETE CASCADE,
  kind text NOT NULL, -- transport|food|internet|bonus|absence|late|loan|penalty|tax|custom|overtime
  category text NOT NULL CHECK (category IN ('allowance','deduction')),
  label text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payroll_adjustments ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_payroll_adj_item ON public.payroll_adjustments(item_id);

-- ---------- payroll_salary_history ----------
CREATE TABLE public.payroll_salary_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  effective_from date NOT NULL,
  effective_to date,
  base_salary numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  increment_pct numeric,
  reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, effective_from)
);
ALTER TABLE public.payroll_salary_history ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_payroll_sal_hist_emp ON public.payroll_salary_history(employee_id, effective_from);

-- ---------- payroll_payslips ----------
CREATE TABLE public.payroll_payslips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.payroll_items(id) ON DELETE CASCADE,
  payslip_number text UNIQUE,
  issued_at timestamptz NOT NULL DEFAULT now(),
  pdf_url text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE public.payroll_payslips ENABLE ROW LEVEL SECURITY;

-- ---------- payroll_audit_logs ----------
CREATE TABLE public.payroll_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.payroll_items(id) ON DELETE CASCADE,
  actor_id uuid,
  action text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payroll_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_payroll_audit_run ON public.payroll_audit_logs(run_id, created_at DESC);

-- ---------- RLS policies ----------
-- helper: is hr/admin/manager
-- runs
CREATE POLICY "runs admin all" ON public.payroll_runs FOR ALL
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'hr'::app_role))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'hr'::app_role));
CREATE POLICY "runs employee read" ON public.payroll_runs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.payroll_items i JOIN public.employees e ON e.id = i.employee_id
                 WHERE i.run_id = payroll_runs.id AND e.user_id = auth.uid()));

-- items
CREATE POLICY "items admin all" ON public.payroll_items FOR ALL
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'hr'::app_role))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'hr'::app_role));
CREATE POLICY "items employee read" ON public.payroll_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = payroll_items.employee_id AND e.user_id = auth.uid()));

-- adjustments
CREATE POLICY "adj admin all" ON public.payroll_adjustments FOR ALL
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'hr'::app_role))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'hr'::app_role));
CREATE POLICY "adj employee read" ON public.payroll_adjustments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.payroll_items i JOIN public.employees e ON e.id = i.employee_id
                 WHERE i.id = payroll_adjustments.item_id AND e.user_id = auth.uid()));

-- salary history
CREATE POLICY "sal admin all" ON public.payroll_salary_history FOR ALL
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'hr'::app_role))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'hr'::app_role));
CREATE POLICY "sal employee read" ON public.payroll_salary_history FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = payroll_salary_history.employee_id AND e.user_id = auth.uid()));

-- payslips
CREATE POLICY "psl admin all" ON public.payroll_payslips FOR ALL
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'hr'::app_role))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'hr'::app_role));
CREATE POLICY "psl employee read" ON public.payroll_payslips FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.payroll_items i JOIN public.employees e ON e.id = i.employee_id
                 WHERE i.id = payroll_payslips.item_id AND e.user_id = auth.uid()));

-- audit
CREATE POLICY "audit admin read" ON public.payroll_audit_logs FOR SELECT
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'hr'::app_role));
CREATE POLICY "audit admin insert" ON public.payroll_audit_logs FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'hr'::app_role));

-- update triggers
CREATE TRIGGER trg_runs_updated BEFORE UPDATE ON public.payroll_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_items_updated BEFORE UPDATE ON public.payroll_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tax_updated BEFORE UPDATE ON public.tax_brackets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================
-- RPCs
-- =============================================================

-- audit helper
CREATE OR REPLACE FUNCTION public._payroll_log(_run uuid, _item uuid, _action text, _payload jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.payroll_audit_logs (run_id, item_id, actor_id, action, payload)
  VALUES (_run, _item, auth.uid(), _action, COALESCE(_payload,'{}'::jsonb));
$$;

-- resolve salary at date
CREATE OR REPLACE FUNCTION public.payroll_resolve_salary(_emp uuid, _on date)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT base_salary FROM public.payroll_salary_history
       WHERE employee_id = _emp
         AND effective_from <= _on
         AND (effective_to IS NULL OR effective_to >= _on)
       ORDER BY effective_from DESC LIMIT 1),
    (SELECT gross_salary FROM public.employees WHERE id = _emp),
    0
  );
$$;

-- compute tax for given currency + amount
CREATE OR REPLACE FUNCTION public.payroll_compute_tax(_amount numeric, _currency text, _on date)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; tax numeric := 0; prev_upper numeric := 0; remaining numeric := _amount;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN RETURN 0; END IF;
  FOR r IN
    SELECT lower_bound, upper_bound, percent FROM public.tax_brackets
     WHERE is_active AND currency = COALESCE(_currency,'USD')
       AND effective_from <= _on AND (effective_to IS NULL OR effective_to >= _on)
     ORDER BY lower_bound ASC
  LOOP
    IF remaining <= 0 THEN EXIT; END IF;
    DECLARE band numeric;
    BEGIN
      band := LEAST(remaining, COALESCE(r.upper_bound, _amount) - r.lower_bound);
      IF band > 0 THEN
        tax := tax + band * r.percent / 100;
        remaining := remaining - band;
      END IF;
    END;
  END LOOP;
  RETURN ROUND(tax::numeric, 2);
END;
$$;

-- generate or regenerate a run
CREATE OR REPLACE FUNCTION public.payroll_generate_run(
  _year int, _month int, _currency text DEFAULT 'USD',
  _working_days int DEFAULT 22, _employee_ids uuid[] DEFAULT NULL,
  _replace boolean DEFAULT true
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  run_id uuid;
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
  totals jsonb;
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

  INSERT INTO public.payroll_runs(period_year, period_month, currency, working_days, status, created_by)
  VALUES (_year, _month, _currency, _working_days, 'draft', auth.uid())
  ON CONFLICT (period_year, period_month, currency) DO UPDATE
    SET working_days = EXCLUDED.working_days,
        updated_at = now()
  RETURNING id INTO run_id;

  IF _replace THEN
    DELETE FROM public.payroll_items WHERE run_id = run_id;
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

    -- fixed allowances/deductions from employee.allowances/deductions jsonb
    alw := COALESCE((SELECT SUM((value->>'amount')::numeric)
                     FROM jsonb_array_elements(COALESCE(emp.allowances,'[]'::jsonb)) AS value), 0);
    ded := COALESCE((SELECT SUM((value->>'amount')::numeric)
                     FROM jsonb_array_elements(COALESCE(emp.deductions,'[]'::jsonb)) AS value), 0);

    -- attendance summary
    SELECT
      COUNT(*) FILTER (WHERE status IN ('present','overtime','remote','wfh'))::numeric,
      COUNT(*) FILTER (WHERE status = 'absent')::numeric,
      COUNT(*) FILTER (WHERE status = 'late')::numeric,
      COALESCE(SUM(GREATEST(0,(total_minutes - 480))) FILTER (WHERE total_minutes > 480),0)/60.0
    INTO present_d, absent_d, late_d, ot
    FROM public.attendance_records
    WHERE employee_id = emp.id AND work_date BETWEEN pstart AND pend;

    -- leaves
    SELECT
      COALESCE(SUM(lr.days) FILTER (WHERE lt.is_paid), 0),
      COALESCE(SUM(lr.days) FILTER (WHERE NOT lt.is_paid), 0)
    INTO paid_l, unpaid_l
    FROM public.leave_requests lr
    JOIN public.leave_types lt ON lt.id = lr.leave_type_id
    WHERE lr.employee_id = emp.id AND lr.status='approved'
      AND lr.from_date <= pend AND lr.to_date >= pstart;

    -- prorate
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
      run_id, emp.id, emp.full_name, emp.department, emp.designation, _currency,
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

  totals := jsonb_build_object(
    'employee_count', cnt,
    'gross', t_gross, 'allowances', t_alw, 'deductions', t_ded,
    'tax', t_tax, 'net', t_net, 'paid', 0, 'pending', t_net
  );

  UPDATE public.payroll_runs SET totals = totals, updated_at = now() WHERE id = run_id;

  PERFORM public._payroll_log(run_id, NULL, 'generated', totals);
  RETURN run_id;
END;
$$;

-- recompute totals helper
CREATE OR REPLACE FUNCTION public.payroll_recompute_totals(_run uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t jsonb;
BEGIN
  SELECT jsonb_build_object(
    'employee_count', COUNT(*),
    'gross', COALESCE(SUM(base_salary + allowances_total),0),
    'allowances', COALESCE(SUM(allowances_total),0),
    'deductions', COALESCE(SUM(deductions_total + prorate_deduction),0),
    'tax', COALESCE(SUM(tax),0),
    'net', COALESCE(SUM(net_pay),0),
    'paid', COALESCE(SUM(paid_amount),0),
    'pending', COALESCE(SUM(net_pay - paid_amount),0)
  ) INTO t FROM public.payroll_items WHERE run_id = _run;
  UPDATE public.payroll_runs SET totals = t, updated_at = now() WHERE id = _run;
END;
$$;

-- update item (admin override)
CREATE OR REPLACE FUNCTION public.payroll_update_item(_item uuid, _patch jsonb, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE it public.payroll_items; r public.payroll_runs;
BEGIN
  IF NOT (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'hr'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT * INTO it FROM public.payroll_items WHERE id = _item FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'item not found'; END IF;
  SELECT * INTO r FROM public.payroll_runs WHERE id = it.run_id;
  IF r.locked THEN RAISE EXCEPTION 'run is locked'; END IF;

  UPDATE public.payroll_items SET
    base_salary       = COALESCE((_patch->>'base_salary')::numeric, base_salary),
    allowances_total  = COALESCE((_patch->>'allowances_total')::numeric, allowances_total),
    deductions_total  = COALESCE((_patch->>'deductions_total')::numeric, deductions_total),
    tax               = COALESCE((_patch->>'tax')::numeric, tax),
    net_pay           = COALESCE((_patch->>'net_pay')::numeric, net_pay),
    notes             = COALESCE(_patch->>'notes', notes),
    updated_at = now()
  WHERE id = _item;

  PERFORM public.payroll_recompute_totals(it.run_id);
  PERFORM public._payroll_log(it.run_id, _item, 'item_edited', jsonb_build_object('patch', _patch, 'note', _note));
END;
$$;

-- add adjustment
CREATE OR REPLACE FUNCTION public.payroll_add_adjustment(
  _item uuid, _kind text, _category text, _label text, _amount numeric, _note text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE adj_id uuid; it public.payroll_items;
BEGIN
  IF NOT (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'hr'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT * INTO it FROM public.payroll_items WHERE id = _item FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'item not found'; END IF;

  INSERT INTO public.payroll_adjustments(item_id, kind, category, label, amount, note, created_by)
  VALUES (_item, _kind, _category, _label, _amount, _note, auth.uid())
  RETURNING id INTO adj_id;

  IF _category = 'allowance' THEN
    UPDATE public.payroll_items SET allowances_total = allowances_total + _amount,
      net_pay = net_pay + _amount, updated_at = now() WHERE id = _item;
  ELSE
    UPDATE public.payroll_items SET deductions_total = deductions_total + _amount,
      net_pay = net_pay - _amount, updated_at = now() WHERE id = _item;
  END IF;

  PERFORM public.payroll_recompute_totals(it.run_id);
  PERFORM public._payroll_log(it.run_id, _item, 'adjustment_added',
    jsonb_build_object('kind',_kind,'category',_category,'label',_label,'amount',_amount));
  RETURN adj_id;
END;
$$;

-- approve run
CREATE OR REPLACE FUNCTION public.payroll_approve_run(_run uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'hr'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE public.payroll_runs SET status='approved', approved_at=now(), updated_at=now()
    WHERE id = _run AND status IN ('draft','processing');
  IF NOT FOUND THEN RAISE EXCEPTION 'only draft/processing runs can be approved'; END IF;
  PERFORM public._payroll_log(_run, NULL, 'approved', '{}'::jsonb);
END;
$$;

-- mark paid (whole run or selected items)
CREATE OR REPLACE FUNCTION public.payroll_mark_paid(_run uuid, _item_ids uuid[] DEFAULT NULL, _method text DEFAULT 'bank')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'hr'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE public.payroll_items SET
    status='paid', paid_amount=net_pay, payment_method=_method, paid_at=now(), updated_at=now()
   WHERE run_id = _run AND status <> 'paid'
     AND (_item_ids IS NULL OR id = ANY(_item_ids));
  PERFORM public.payroll_recompute_totals(_run);
  UPDATE public.payroll_runs SET
    status = CASE WHEN (SELECT COUNT(*) FROM public.payroll_items WHERE run_id=_run AND status <> 'paid') = 0
                  THEN 'paid' ELSE 'partial_paid' END,
    paid_at = now(), updated_at = now()
   WHERE id = _run;
  PERFORM public._payroll_log(_run, NULL, 'marked_paid', jsonb_build_object('method',_method,'items',_item_ids));
END;
$$;

-- lock/unlock
CREATE OR REPLACE FUNCTION public.payroll_lock_run(_run uuid, _lock boolean DEFAULT true)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'admin only'; END IF;
  UPDATE public.payroll_runs SET locked = _lock, updated_at = now() WHERE id = _run;
  PERFORM public._payroll_log(_run, NULL, CASE WHEN _lock THEN 'locked' ELSE 'unlocked' END, '{}'::jsonb);
END;
$$;

-- cancel item
CREATE OR REPLACE FUNCTION public.payroll_cancel_item(_item uuid, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE it public.payroll_items;
BEGIN
  IF NOT (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'hr'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT * INTO it FROM public.payroll_items WHERE id = _item;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
  UPDATE public.payroll_items SET status='cancelled', notes = COALESCE(_reason, notes), updated_at=now() WHERE id=_item;
  PERFORM public.payroll_recompute_totals(it.run_id);
  PERFORM public._payroll_log(it.run_id, _item, 'item_cancelled', jsonb_build_object('reason',_reason));
END;
$$;

-- mark partial paid
CREATE OR REPLACE FUNCTION public.payroll_mark_partial_paid(_item uuid, _amount numeric, _method text DEFAULT 'bank')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE it public.payroll_items; new_status text;
BEGIN
  IF NOT (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'hr'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT * INTO it FROM public.payroll_items WHERE id = _item FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
  new_status := CASE WHEN _amount >= it.net_pay THEN 'paid' ELSE 'partial_paid' END;
  UPDATE public.payroll_items SET paid_amount = _amount, payment_method=_method,
    status=new_status, paid_at = CASE WHEN new_status='paid' THEN now() ELSE paid_at END,
    updated_at=now() WHERE id=_item;
  PERFORM public.payroll_recompute_totals(it.run_id);
  PERFORM public._payroll_log(it.run_id, _item, 'partial_paid',
    jsonb_build_object('amount',_amount,'method',_method,'status',new_status));
END;
$$;

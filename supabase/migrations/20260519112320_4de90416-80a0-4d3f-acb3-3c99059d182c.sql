
-- 1) Audit logs
CREATE TABLE IF NOT EXISTS public.payroll_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.payroll_items(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor_id uuid,
  actor_email text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payroll_audit_logs_run ON public.payroll_audit_logs(run_id, created_at DESC);

ALTER TABLE public.payroll_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "HR/admin can view payroll audit logs" ON public.payroll_audit_logs;
CREATE POLICY "HR/admin can view payroll audit logs"
ON public.payroll_audit_logs FOR SELECT
USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'hr'::app_role));

DROP POLICY IF EXISTS "HR/admin can insert payroll audit logs" ON public.payroll_audit_logs;
CREATE POLICY "HR/admin can insert payroll audit logs"
ON public.payroll_audit_logs FOR INSERT
WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'hr'::app_role));

-- 2) Optional rejection metadata on runs
ALTER TABLE public.payroll_runs
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_by uuid,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_by uuid,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- 3) Helper to write audit entries
CREATE OR REPLACE FUNCTION public._payroll_log(_run_id uuid, _item_id uuid, _action text, _details jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.payroll_audit_logs (run_id, item_id, action, actor_id, actor_email, details)
  VALUES (_run_id, _item_id, _action, auth.uid(), auth.jwt() ->> 'email', COALESCE(_details, '{}'::jsonb));
END;
$$;

-- 4) Submit for approval
CREATE OR REPLACE FUNCTION public.submit_payroll_for_approval(_run_id uuid)
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
     SET status = 'pending_approval',
         submitted_by = auth.uid(),
         submitted_at = now(),
         updated_at = now()
   WHERE id = _run_id AND status IN ('draft','rejected');
  IF NOT FOUND THEN RAISE EXCEPTION 'Only draft or rejected runs can be submitted'; END IF;
  PERFORM public._payroll_log(_run_id, NULL, 'submitted_for_approval', '{}'::jsonb);
END;
$$;

-- 5) Reject
CREATE OR REPLACE FUNCTION public.reject_payroll_run(_run_id uuid, _reason text)
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
     SET status = 'rejected',
         rejected_by = auth.uid(),
         rejected_at = now(),
         rejection_reason = _reason,
         updated_at = now()
   WHERE id = _run_id AND status IN ('pending_approval','draft');
  IF NOT FOUND THEN RAISE EXCEPTION 'Run cannot be rejected from current status'; END IF;
  PERFORM public._payroll_log(_run_id, NULL, 'rejected', jsonb_build_object('reason', _reason));
END;
$$;

-- 6) Replace approve to accept pending_approval and log
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
     SET status = 'approved',
         approved_by = auth.uid(),
         approved_at = now(),
         rejected_at = NULL,
         rejection_reason = NULL,
         updated_at = now()
   WHERE id = _run_id AND status IN ('draft','pending_approval','rejected');
  IF NOT FOUND THEN RAISE EXCEPTION 'Run cannot be approved from current status'; END IF;
  PERFORM public._payroll_log(_run_id, NULL, 'approved', '{}'::jsonb);
END;
$$;

-- 7) Replace mark paid to log
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
   WHERE id = _run_id AND status = 'approved';
  IF NOT FOUND THEN RAISE EXCEPTION 'Only approved runs can be marked paid'; END IF;
  UPDATE public.payroll_items
     SET status = 'paid', paid_at = now(), updated_at = now()
   WHERE run_id = _run_id AND status <> 'paid';
  PERFORM public._payroll_log(_run_id, NULL, 'marked_paid', '{}'::jsonb);
END;
$$;

-- 8) Edit an individual item (allowed only while run is editable)
CREATE OR REPLACE FUNCTION public.update_payroll_item(
  _item_id uuid,
  _gross_salary numeric,
  _allowances_total numeric,
  _deductions_total numeric,
  _tax numeric,
  _net_pay numeric,
  _note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  it public.payroll_items;
  r  public.payroll_runs;
  diff jsonb := '{}'::jsonb;
  totals_gross numeric := 0;
  totals_net numeric := 0;
  totals_tax numeric := 0;
  totals_ded numeric := 0;
  cnt integer := 0;
BEGIN
  IF NOT (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'hr'::app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO it FROM public.payroll_items WHERE id = _item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item not found'; END IF;

  SELECT * INTO r FROM public.payroll_runs WHERE id = it.run_id FOR UPDATE;
  IF r.status NOT IN ('draft','pending_approval','rejected') THEN
    RAISE EXCEPTION 'Run is locked (status=%); items can no longer be edited', r.status;
  END IF;

  IF _gross_salary IS DISTINCT FROM it.gross_salary THEN
    diff := diff || jsonb_build_object('gross_salary', jsonb_build_object('old', it.gross_salary, 'new', _gross_salary));
  END IF;
  IF _allowances_total IS DISTINCT FROM it.allowances_total THEN
    diff := diff || jsonb_build_object('allowances_total', jsonb_build_object('old', it.allowances_total, 'new', _allowances_total));
  END IF;
  IF _deductions_total IS DISTINCT FROM it.deductions_total THEN
    diff := diff || jsonb_build_object('deductions_total', jsonb_build_object('old', it.deductions_total, 'new', _deductions_total));
  END IF;
  IF _tax IS DISTINCT FROM it.tax THEN
    diff := diff || jsonb_build_object('tax', jsonb_build_object('old', it.tax, 'new', _tax));
  END IF;
  IF _net_pay IS DISTINCT FROM it.net_pay THEN
    diff := diff || jsonb_build_object('net_pay', jsonb_build_object('old', it.net_pay, 'new', _net_pay));
  END IF;

  UPDATE public.payroll_items
     SET gross_salary = _gross_salary,
         allowances_total = _allowances_total,
         deductions_total = _deductions_total,
         tax = _tax,
         net_pay = _net_pay,
         updated_at = now()
   WHERE id = _item_id;

  -- Recompute run totals
  SELECT
    COUNT(*),
    COALESCE(SUM(gross_salary + allowances_total),0),
    COALESCE(SUM(deductions_total + prorate_deduction),0),
    COALESCE(SUM(tax),0),
    COALESCE(SUM(net_pay),0)
  INTO cnt, totals_gross, totals_ded, totals_tax, totals_net
  FROM public.payroll_items WHERE run_id = it.run_id;

  UPDATE public.payroll_runs
     SET totals = jsonb_build_object(
       'employee_count', cnt,
       'gross', totals_gross,
       'deductions', totals_ded,
       'tax', totals_tax,
       'net', totals_net
     ),
     updated_at = now()
   WHERE id = it.run_id;

  PERFORM public._payroll_log(it.run_id, _item_id, 'item_edited',
    jsonb_build_object('employee_name', it.employee_name, 'changes', diff, 'note', _note));
END;
$$;


DROP POLICY IF EXISTS "Employees read own record" ON public.employees;
CREATE POLICY "Employees read own record"
  ON public.employees FOR SELECT TO authenticated
  USING (user_id IS NOT NULL AND user_id = auth.uid());

DROP POLICY IF EXISTS "Bank receipts upload requires existing order" ON storage.objects;
CREATE POLICY "Bank receipts upload requires owned order"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'bank-receipts'
    AND (storage.foldername(name))[1] IS NOT NULL
    AND (
      public.is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id::text = (storage.foldername(objects.name))[1]
          AND (o.user_id = auth.uid()
               OR lower(coalesce(o.customer_email,'')) = lower(coalesce(auth.jwt() ->> 'email','')))
      )
    )
  );

DROP FUNCTION IF EXISTS public.lookup_order_for_tracking(text);
CREATE FUNCTION public.lookup_order_for_tracking(_term text)
 RETURNS TABLE(id uuid, invoice_number text, status text, total numeric, currency text, items jsonb, created_at timestamptz, updated_at timestamptz)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  WITH q AS (SELECT btrim(_term) AS t)
  SELECT o.id, o.invoice_number, o.status, o.total, o.currency, o.items, o.created_at, o.updated_at
  FROM public.orders o, q
  WHERE q.t <> ''
    AND (o.invoice_number = q.t
         OR o.stripe_session_id = q.t
         OR (q.t ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND o.id = q.t::uuid))
  ORDER BY o.created_at DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.guard_investments_investor_update()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF public.is_admin(auth.uid()) THEN RETURN NEW; END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.investor_id IS DISTINCT FROM OLD.investor_id
     OR NEW.plan_id IS DISTINCT FROM OLD.plan_id
     OR NEW.plan_name IS DISTINCT FROM OLD.plan_name
     OR NEW.amount IS DISTINCT FROM OLD.amount
     OR NEW.currency IS DISTINCT FROM OLD.currency
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.monthly_return_percent IS DISTINCT FROM OLD.monthly_return_percent
     OR NEW.term_months IS DISTINCT FROM OLD.term_months
     OR NEW.start_date IS DISTINCT FROM OLD.start_date
     OR NEW.end_date IS DISTINCT FROM OLD.end_date
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Investors may only update agreement signature fields';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_investments_investor_update ON public.investments;
CREATE TRIGGER trg_guard_investments_investor_update
  BEFORE UPDATE ON public.investments
  FOR EACH ROW EXECUTE FUNCTION public.guard_investments_investor_update();

CREATE OR REPLACE FUNCTION public.guard_withdrawal_request_balance()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE total_principal numeric := 0; total_withdrawn numeric := 0; available numeric := 0;
BEGIN
  IF public.is_admin(auth.uid()) THEN RETURN NEW; END IF;
  IF NEW.investor_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Cannot create a withdrawal for another investor';
  END IF;
  IF coalesce(NEW.amount,0) <= 0 THEN
    RAISE EXCEPTION 'Withdrawal amount must be positive';
  END IF;
  SELECT COALESCE(SUM(amount),0) INTO total_principal FROM public.investments
   WHERE investor_id = NEW.investor_id AND status IN ('active','completed');
  SELECT COALESCE(SUM(amount),0) INTO total_withdrawn FROM public.withdrawal_requests
   WHERE investor_id = NEW.investor_id AND status IN ('pending','approved','paid');
  available := total_principal - total_withdrawn;
  IF NEW.amount > available THEN
    RAISE EXCEPTION 'Requested amount (%) exceeds available balance (%)', NEW.amount, available;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_withdrawal_request_balance ON public.withdrawal_requests;
CREATE TRIGGER trg_guard_withdrawal_request_balance
  BEFORE INSERT ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.guard_withdrawal_request_balance();

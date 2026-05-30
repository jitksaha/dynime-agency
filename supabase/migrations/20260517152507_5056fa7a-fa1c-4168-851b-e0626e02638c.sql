
-- Helper: resolves the employee row id for the current auth user (by user_id or matching email)
CREATE OR REPLACE FUNCTION public.current_employee_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id
  FROM public.employees e
  WHERE e.user_id = auth.uid()
     OR lower(coalesce(e.email,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
  ORDER BY (e.user_id = auth.uid()) DESC
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.current_employee_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_employee_id() TO authenticated;

-- Requests table
CREATE TABLE IF NOT EXISTS public.hr_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  created_by uuid,
  category text NOT NULL CHECK (category IN ('leave','document','payslip_reissue','salary_review','equipment','access','grievance','other')),
  subject text NOT NULL,
  details text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_review','approved','rejected','cancelled','fulfilled')),
  decision_note text,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hr_requests_employee_idx ON public.hr_requests(employee_id);
CREATE INDEX IF NOT EXISTS hr_requests_status_idx ON public.hr_requests(status);

ALTER TABLE public.hr_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees read own requests"
  ON public.hr_requests FOR SELECT
  TO authenticated
  USING (employee_id = public.current_employee_id());

CREATE POLICY "Employees create own requests"
  ON public.hr_requests FOR INSERT
  TO authenticated
  WITH CHECK (employee_id = public.current_employee_id() AND created_by = auth.uid());

CREATE POLICY "Employees cancel own pending requests"
  ON public.hr_requests FOR UPDATE
  TO authenticated
  USING (employee_id = public.current_employee_id() AND status IN ('pending','in_review'))
  WITH CHECK (employee_id = public.current_employee_id() AND status IN ('pending','in_review','cancelled'));

CREATE POLICY "HR staff manage hr requests"
  ON public.hr_requests FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'hr'::app_role))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'hr'::app_role));

CREATE TRIGGER hr_requests_updated_at
  BEFORE UPDATE ON public.hr_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Events / thread
CREATE TABLE IF NOT EXISTS public.hr_request_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.hr_requests(id) ON DELETE CASCADE,
  author_id uuid,
  author_role text NOT NULL CHECK (author_role IN ('employee','admin','system')),
  event_type text NOT NULL CHECK (event_type IN ('comment','status_change','assigned','attachment')),
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hr_request_events_request_idx ON public.hr_request_events(request_id, created_at);

ALTER TABLE public.hr_request_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read events for accessible requests"
  ON public.hr_request_events FOR SELECT
  TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'hr'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.hr_requests r
      WHERE r.id = hr_request_events.request_id
        AND r.employee_id = public.current_employee_id()
    )
  );

CREATE POLICY "Employee comments on own requests"
  ON public.hr_request_events FOR INSERT
  TO authenticated
  WITH CHECK (
    author_role = 'employee'
    AND author_id = auth.uid()
    AND event_type = 'comment'
    AND EXISTS (
      SELECT 1 FROM public.hr_requests r
      WHERE r.id = hr_request_events.request_id
        AND r.employee_id = public.current_employee_id()
    )
  );

CREATE POLICY "HR staff insert events"
  ON public.hr_request_events FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'hr'::app_role));

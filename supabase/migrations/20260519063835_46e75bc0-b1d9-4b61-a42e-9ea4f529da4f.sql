
-- =========================================================
-- CRM CORE
-- =========================================================

CREATE TABLE public.crm_pipelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.crm_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  probability integer NOT NULL DEFAULT 0,
  is_won boolean NOT NULL DEFAULT false,
  is_lost boolean NOT NULL DEFAULT false,
  color text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_stages_pipeline ON public.crm_stages(pipeline_id, position);

CREATE TABLE public.crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text,
  phone text,
  company text,
  job_title text,
  country text,
  source text NOT NULL DEFAULT 'manual',
  source_ref_id uuid,
  source_ref_table text,
  status text NOT NULL DEFAULT 'new', -- new, working, qualified, unqualified, converted
  priority text NOT NULL DEFAULT 'normal',
  tags text[] NOT NULL DEFAULT '{}',
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  owner_id uuid,
  user_id uuid,                    -- if linked to an auth user
  converted_at timestamptz,
  last_contacted_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_leads_status ON public.crm_leads(status);
CREATE INDEX idx_crm_leads_owner ON public.crm_leads(owner_id);
CREATE INDEX idx_crm_leads_email ON public.crm_leads(lower(email));
CREATE UNIQUE INDEX uniq_crm_leads_source_ref ON public.crm_leads(source_ref_table, source_ref_id)
  WHERE source_ref_id IS NOT NULL;

CREATE TABLE public.crm_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  customer_user_id uuid,
  customer_email text,
  pipeline_id uuid NOT NULL REFERENCES public.crm_pipelines(id),
  stage_id uuid NOT NULL REFERENCES public.crm_stages(id),
  value numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  probability integer NOT NULL DEFAULT 0,
  expected_close_date date,
  closed_at timestamptz,
  outcome text, -- won, lost, abandoned
  lost_reason text,
  owner_id uuid,
  description text,
  tags text[] NOT NULL DEFAULT '{}',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  position integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_deals_stage ON public.crm_deals(stage_id, position);
CREATE INDEX idx_crm_deals_owner ON public.crm_deals(owner_id);
CREATE INDEX idx_crm_deals_lead ON public.crm_deals(lead_id);

CREATE TABLE public.crm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL, -- call, meeting, email, follow_up, note, task
  subject text NOT NULL,
  description text,
  due_at timestamptz,
  completed_at timestamptz,
  assignee_id uuid,
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  customer_user_id uuid,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'open', -- open, done, cancelled
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_activities_assignee ON public.crm_activities(assignee_id, status, due_at);
CREATE INDEX idx_crm_activities_lead ON public.crm_activities(lead_id);
CREATE INDEX idx_crm_activities_deal ON public.crm_activities(deal_id);

CREATE TABLE public.crm_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  body text NOT NULL,
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  customer_user_id uuid,
  author_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.crm_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  audience text NOT NULL DEFAULT 'leads', -- leads, customers, subscribers
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  recipient_count integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.crm_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  segment_id uuid REFERENCES public.crm_segments(id) ON DELETE SET NULL,
  template_name text NOT NULL DEFAULT 'crm-campaign',
  subject text NOT NULL,
  body_html text NOT NULL,
  status text NOT NULL DEFAULT 'draft', -- draft, scheduled, sending, sent, cancelled
  scheduled_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  total_recipients integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.crm_campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.crm_campaigns(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, sent, failed, suppressed
  error_message text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_campaign_recipients_campaign ON public.crm_campaign_recipients(campaign_id, status);

-- =========================================================
-- HRM EXTENSIONS
-- =========================================================

CREATE TABLE public.attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  clock_in timestamptz,
  clock_out timestamptz,
  break_minutes integer NOT NULL DEFAULT 0,
  total_minutes integer,
  source text NOT NULL DEFAULT 'self', -- self, admin, import
  status text NOT NULL DEFAULT 'present', -- present, absent, leave, holiday, half_day
  notes text,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, work_date)
);
CREATE INDEX idx_attendance_employee_date ON public.attendance_records(employee_id, work_date DESC);

CREATE TABLE public.shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  label text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.leave_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  default_days_per_year numeric NOT NULL DEFAULT 0,
  is_paid boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  color text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.leave_types (name, code, default_days_per_year, is_paid, color) VALUES
  ('Annual leave', 'annual', 20, true, '#22c55e'),
  ('Sick leave', 'sick', 10, true, '#f97316'),
  ('Casual leave', 'casual', 5, true, '#3b82f6'),
  ('Unpaid leave', 'unpaid', 0, false, '#6b7280'),
  ('Maternity / Paternity', 'parental', 90, true, '#a855f7');

CREATE TABLE public.leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES public.leave_types(id) ON DELETE CASCADE,
  year integer NOT NULL,
  allotted numeric NOT NULL DEFAULT 0,
  used numeric NOT NULL DEFAULT 0,
  carried_over numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, leave_type_id, year)
);

CREATE TABLE public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES public.leave_types(id),
  from_date date NOT NULL,
  to_date date NOT NULL,
  half_day boolean NOT NULL DEFAULT false,
  days numeric NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending', -- pending, approved, rejected, cancelled
  decision_note text,
  decided_by uuid,
  decided_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_leave_requests_employee ON public.leave_requests(employee_id, status);

CREATE TABLE public.kpi_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  metric text,
  target numeric,
  unit text,
  weight integer NOT NULL DEFAULT 1,
  period_start date,
  period_end date,
  status text NOT NULL DEFAULT 'active', -- active, completed, dropped
  progress numeric NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.kpi_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.kpi_goals(id) ON DELETE CASCADE,
  value numeric NOT NULL DEFAULT 0,
  note text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid
);

CREATE TABLE public.performance_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  cycle text NOT NULL, -- e.g. 2026-Q1
  manager_id uuid,
  ratings jsonb NOT NULL DEFAULT '{}'::jsonb, -- {communication:4, delivery:5, ...}
  overall_rating numeric,
  strengths text,
  improvements text,
  goals text,
  summary text,
  status text NOT NULL DEFAULT 'draft', -- draft, shared, acknowledged
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  body_html text,
  audience text NOT NULL DEFAULT 'all', -- all, department, role
  department text,
  target_role text,
  pinned boolean NOT NULL DEFAULT false,
  publish_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  author_id uuid,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_announcements_published ON public.announcements(is_published, publish_at DESC);

-- =========================================================
-- TIMESTAMP TRIGGERS
-- =========================================================
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'crm_pipelines','crm_leads','crm_deals','crm_activities','crm_segments',
    'crm_campaigns','attendance_records','leave_requests','kpi_goals',
    'performance_reviews','announcements'
  ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();',
      t, t
    );
  END LOOP;
END $$;

-- =========================================================
-- DEFAULT PIPELINE
-- =========================================================
INSERT INTO public.crm_pipelines (name, slug, is_default) VALUES ('Sales pipeline', 'sales', true);

INSERT INTO public.crm_stages (pipeline_id, name, position, probability, is_won, is_lost, color)
SELECT p.id, v.name, v.pos, v.prob, v.won, v.lost, v.color
FROM public.crm_pipelines p,
  (VALUES
    ('New', 0, 10, false, false, '#94a3b8'),
    ('Contacted', 1, 25, false, false, '#3b82f6'),
    ('Qualified', 2, 40, false, false, '#6366f1'),
    ('Proposal', 3, 60, false, false, '#a855f7'),
    ('Negotiation', 4, 80, false, false, '#f59e0b'),
    ('Won', 5, 100, true, false, '#22c55e'),
    ('Lost', 6, 0, false, true, '#ef4444')
  ) AS v(name, pos, prob, won, lost, color)
WHERE p.slug = 'sales';

-- =========================================================
-- AUTO-INGEST LEAD TRIGGERS
-- =========================================================

CREATE OR REPLACE FUNCTION public.crm_ingest_contact_submission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.crm_leads (full_name, email, phone, message, source, source_ref_table, source_ref_id, metadata)
  VALUES (
    COALESCE(NEW.name, NEW.email, 'Unknown'),
    NEW.email, NEW.phone, NEW.message,
    'contact_form', 'contact_submissions', NEW.id,
    jsonb_build_object('subject', NEW.subject, 'source_page', NEW.source_page)
  )
  ON CONFLICT (source_ref_table, source_ref_id) DO NOTHING;
  RETURN NEW;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='contact_submissions') THEN
    DROP TRIGGER IF EXISTS trg_crm_ingest_contact ON public.contact_submissions;
    CREATE TRIGGER trg_crm_ingest_contact AFTER INSERT ON public.contact_submissions
      FOR EACH ROW EXECUTE FUNCTION public.crm_ingest_contact_submission();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.crm_ingest_invest_lead()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.crm_leads (full_name, email, phone, country, source, source_ref_table, source_ref_id, metadata, priority)
  VALUES (
    COALESCE(NEW.full_name, NEW.email, 'Investor lead'),
    NEW.email, NEW.phone, NEW.country,
    'invest_lead', 'invest_leads', NEW.id,
    to_jsonb(NEW.*) - 'id' - 'created_at',
    'high'
  )
  ON CONFLICT (source_ref_table, source_ref_id) DO NOTHING;
  RETURN NEW;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='invest_leads') THEN
    DROP TRIGGER IF EXISTS trg_crm_ingest_invest ON public.invest_leads;
    CREATE TRIGGER trg_crm_ingest_invest AFTER INSERT ON public.invest_leads
      FOR EACH ROW EXECUTE FUNCTION public.crm_ingest_invest_lead();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.crm_ingest_subscriber()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.crm_leads (full_name, email, source, source_ref_table, source_ref_id)
  VALUES (
    COALESCE(NEW.email, 'Subscriber'),
    NEW.email, 'newsletter', 'newsletter_subscribers', NEW.id
  )
  ON CONFLICT (source_ref_table, source_ref_id) DO NOTHING;
  RETURN NEW;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='newsletter_subscribers') THEN
    DROP TRIGGER IF EXISTS trg_crm_ingest_subscriber ON public.newsletter_subscribers;
    CREATE TRIGGER trg_crm_ingest_subscriber AFTER INSERT ON public.newsletter_subscribers
      FOR EACH ROW EXECUTE FUNCTION public.crm_ingest_subscriber();
  END IF;
END $$;

-- Backfill existing rows (best-effort, skip if columns differ)
DO $$ BEGIN
  BEGIN
    INSERT INTO public.crm_leads (full_name, email, phone, message, source, source_ref_table, source_ref_id)
    SELECT COALESCE(name, email, 'Unknown'), email, phone, message, 'contact_form', 'contact_submissions', id
    FROM public.contact_submissions
    ON CONFLICT (source_ref_table, source_ref_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    INSERT INTO public.crm_leads (full_name, email, phone, country, source, source_ref_table, source_ref_id, priority)
    SELECT COALESCE(full_name, email, 'Investor lead'), email, phone, country, 'invest_lead', 'invest_leads', id, 'high'
    FROM public.invest_leads
    ON CONFLICT (source_ref_table, source_ref_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    INSERT INTO public.crm_leads (full_name, email, source, source_ref_table, source_ref_id)
    SELECT COALESCE(email, 'Subscriber'), email, 'newsletter', 'newsletter_subscribers', id
    FROM public.newsletter_subscribers
    ON CONFLICT (source_ref_table, source_ref_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- =========================================================
-- RLS
-- =========================================================
ALTER TABLE public.crm_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Helper inline predicates used: is_admin, has_role, has_any_role, current_employee_id

-- CRM: staff with sales role + admins/managers
CREATE POLICY "crm_pipelines_staff_all" ON public.crm_pipelines FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','manager','sales']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','manager','sales']::app_role[]));

CREATE POLICY "crm_stages_staff_all" ON public.crm_stages FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','manager','sales']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','manager','sales']::app_role[]));

CREATE POLICY "crm_leads_staff_all" ON public.crm_leads FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','manager','sales','support']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','manager','sales']::app_role[]));

CREATE POLICY "crm_deals_staff_all" ON public.crm_deals FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','manager','sales']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','manager','sales']::app_role[]));

CREATE POLICY "crm_activities_staff_all" ON public.crm_activities FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','manager','sales','support']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','manager','sales','support']::app_role[]));

CREATE POLICY "crm_notes_staff_all" ON public.crm_notes FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','manager','sales','support']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','manager','sales','support']::app_role[]));

CREATE POLICY "crm_segments_staff_all" ON public.crm_segments FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','manager','sales']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','manager','sales']::app_role[]));

CREATE POLICY "crm_campaigns_staff_all" ON public.crm_campaigns FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','manager','sales']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','manager','sales']::app_role[]));

CREATE POLICY "crm_campaign_recipients_staff_all" ON public.crm_campaign_recipients FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','manager','sales']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','manager','sales']::app_role[]));

-- HR: admins/managers/hr full, employees scoped
CREATE POLICY "attendance_hr_all" ON public.attendance_records FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','manager','hr']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','manager','hr']::app_role[]));

CREATE POLICY "attendance_self_select" ON public.attendance_records FOR SELECT TO authenticated
  USING (employee_id = public.current_employee_id());

CREATE POLICY "attendance_self_insert" ON public.attendance_records FOR INSERT TO authenticated
  WITH CHECK (employee_id = public.current_employee_id() AND source = 'self');

CREATE POLICY "attendance_self_update" ON public.attendance_records FOR UPDATE TO authenticated
  USING (employee_id = public.current_employee_id() AND approved_at IS NULL)
  WITH CHECK (employee_id = public.current_employee_id());

CREATE POLICY "shifts_hr_all" ON public.shifts FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','manager','hr']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','manager','hr']::app_role[]));

CREATE POLICY "shifts_self_select" ON public.shifts FOR SELECT TO authenticated
  USING (employee_id = public.current_employee_id());

CREATE POLICY "leave_types_read_all" ON public.leave_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "leave_types_hr_write" ON public.leave_types FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','manager','hr']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','manager','hr']::app_role[]));

CREATE POLICY "leave_balances_hr_all" ON public.leave_balances FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','manager','hr']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','manager','hr']::app_role[]));

CREATE POLICY "leave_balances_self_select" ON public.leave_balances FOR SELECT TO authenticated
  USING (employee_id = public.current_employee_id());

CREATE POLICY "leave_requests_hr_all" ON public.leave_requests FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','manager','hr']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','manager','hr']::app_role[]));

CREATE POLICY "leave_requests_self_select" ON public.leave_requests FOR SELECT TO authenticated
  USING (employee_id = public.current_employee_id());

CREATE POLICY "leave_requests_self_insert" ON public.leave_requests FOR INSERT TO authenticated
  WITH CHECK (employee_id = public.current_employee_id() AND status = 'pending');

CREATE POLICY "leave_requests_self_cancel" ON public.leave_requests FOR UPDATE TO authenticated
  USING (employee_id = public.current_employee_id() AND status = 'pending')
  WITH CHECK (employee_id = public.current_employee_id() AND status IN ('pending','cancelled'));

CREATE POLICY "kpi_goals_hr_all" ON public.kpi_goals FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','manager','hr']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','manager','hr']::app_role[]));

CREATE POLICY "kpi_goals_self_select" ON public.kpi_goals FOR SELECT TO authenticated
  USING (employee_id = public.current_employee_id());

CREATE POLICY "kpi_checkins_hr_all" ON public.kpi_checkins FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','manager','hr']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','manager','hr']::app_role[]));

CREATE POLICY "kpi_checkins_self_select" ON public.kpi_checkins FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.kpi_goals g WHERE g.id = goal_id AND g.employee_id = public.current_employee_id()));

CREATE POLICY "kpi_checkins_self_insert" ON public.kpi_checkins FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.kpi_goals g WHERE g.id = goal_id AND g.employee_id = public.current_employee_id()));

CREATE POLICY "perf_reviews_hr_all" ON public.performance_reviews FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','manager','hr']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','manager','hr']::app_role[]));

CREATE POLICY "perf_reviews_self_select" ON public.performance_reviews FOR SELECT TO authenticated
  USING (employee_id = public.current_employee_id() AND status IN ('shared','acknowledged'));

CREATE POLICY "announcements_staff_write" ON public.announcements FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','manager','hr','editor']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','manager','hr','editor']::app_role[]));

CREATE POLICY "announcements_read_employee" ON public.announcements FOR SELECT TO authenticated
  USING (
    is_published = true
    AND publish_at <= now()
    AND (expires_at IS NULL OR expires_at > now())
    AND public.current_employee_id() IS NOT NULL
  );

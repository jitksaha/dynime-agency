
-- HubSpot link on leads
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS hubspot_contact_id text;
CREATE INDEX IF NOT EXISTS idx_crm_leads_hubspot_contact_id ON public.crm_leads(hubspot_contact_id);

-- Workflows
CREATE TABLE public.crm_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL CHECK (trigger_type IN ('lead_created','status_changed','activity_completed','score_threshold','time_based','manual')),
  trigger_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.crm_workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.crm_workflows(id) ON DELETE CASCADE,
  position integer NOT NULL,
  step_type text NOT NULL CHECK (step_type IN ('delay','condition','send_email','create_task','update_score','change_status','hubspot_sync','add_tag','assign_owner')),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_workflow_steps_workflow ON public.crm_workflow_steps(workflow_id, position);

CREATE TABLE public.crm_workflow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.crm_workflows(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','done','failed','cancelled')),
  current_step integer NOT NULL DEFAULT 0,
  next_run_at timestamptz NOT NULL DEFAULT now(),
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  retries integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX idx_crm_workflow_runs_due ON public.crm_workflow_runs(status, next_run_at) WHERE status IN ('pending','running');
CREATE INDEX idx_crm_workflow_runs_lead ON public.crm_workflow_runs(lead_id);

-- Email templates
CREATE TABLE public.crm_email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  subject text NOT NULL,
  body_html text NOT NULL,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- HubSpot sync log
CREATE TABLE public.crm_hubspot_sync (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  hubspot_contact_id text,
  direction text NOT NULL CHECK (direction IN ('push','pull')),
  status text NOT NULL CHECK (status IN ('success','error')),
  payload jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_hubspot_sync_lead ON public.crm_hubspot_sync(lead_id);

-- RLS
ALTER TABLE public.crm_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_hubspot_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage workflows" ON public.crm_workflows
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage workflow steps" ON public.crm_workflow_steps
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins view workflow runs" ON public.crm_workflow_runs
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage email templates" ON public.crm_email_templates
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins view hubspot sync" ON public.crm_hubspot_sync
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- updated_at triggers
CREATE TRIGGER trg_crm_workflows_updated BEFORE UPDATE ON public.crm_workflows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_crm_workflow_runs_updated BEFORE UPDATE ON public.crm_workflow_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_crm_email_templates_updated BEFORE UPDATE ON public.crm_email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger function: enqueue workflow runs on lead events
CREATE OR REPLACE FUNCTION public.crm_enqueue_workflow_runs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wf record;
  evt text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    evt := 'lead_created';
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    evt := 'status_changed';
  ELSE
    RETURN NEW;
  END IF;

  FOR wf IN
    SELECT id, trigger_config FROM public.crm_workflows
    WHERE is_active = true AND trigger_type = evt
  LOOP
    -- For status_changed, optionally match `to` status in trigger_config
    IF evt = 'status_changed'
       AND wf.trigger_config ? 'to_status'
       AND wf.trigger_config->>'to_status' <> NEW.status THEN
      CONTINUE;
    END IF;
    INSERT INTO public.crm_workflow_runs (workflow_id, lead_id, status, next_run_at, context)
    VALUES (wf.id, NEW.id, 'pending', now(), jsonb_build_object('event', evt, 'lead_id', NEW.id));
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_crm_leads_enqueue_workflows
  AFTER INSERT OR UPDATE ON public.crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.crm_enqueue_workflow_runs();

-- Singleton weights table
CREATE TABLE IF NOT EXISTS public.crm_score_weights (
  id smallint PRIMARY KEY DEFAULT 1,
  weights jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT crm_score_weights_singleton CHECK (id = 1)
);

ALTER TABLE public.crm_score_weights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "weights_read_auth" ON public.crm_score_weights;
CREATE POLICY "weights_read_auth" ON public.crm_score_weights
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "weights_write_admin" ON public.crm_score_weights;
CREATE POLICY "weights_write_admin" ON public.crm_score_weights
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'hr'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'hr'));

-- Seed default weights
INSERT INTO public.crm_score_weights (id, weights) VALUES (1, '{
  "contact_email": 20,
  "contact_phone": 15,
  "contact_company": 10,
  "contact_job_title": 5,
  "contact_country": 5,
  "source_invest_lead": 25,
  "source_contact_form": 25,
  "source_newsletter": 5,
  "source_other": 10,
  "engagement_contacted": 10,
  "engagement_recent_7d": 10,
  "engagement_priority_high": 10
}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Rationale storage
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS score_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Updated scoring trigger
CREATE OR REPLACE FUNCTION public.crm_compute_lead_score()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  w jsonb;
  total integer := 0;
  parts jsonb := '[]'::jsonb;
  add_part record;
  src_key text;
  src_label text;
  src_pts integer;
BEGIN
  SELECT weights INTO w FROM public.crm_score_weights WHERE id = 1;
  IF w IS NULL THEN w := '{}'::jsonb; END IF;

  -- Contactability
  IF NEW.email IS NOT NULL AND length(btrim(NEW.email)) > 0 THEN
    total := total + COALESCE((w->>'contact_email')::int, 0);
    parts := parts || jsonb_build_object('label','Has email','points',COALESCE((w->>'contact_email')::int,0),'category','contactability');
  END IF;
  IF NEW.phone IS NOT NULL AND length(btrim(NEW.phone)) > 0 THEN
    total := total + COALESCE((w->>'contact_phone')::int, 0);
    parts := parts || jsonb_build_object('label','Has phone','points',COALESCE((w->>'contact_phone')::int,0),'category','contactability');
  END IF;
  IF NEW.company IS NOT NULL AND length(btrim(NEW.company)) > 0 THEN
    total := total + COALESCE((w->>'contact_company')::int, 0);
    parts := parts || jsonb_build_object('label','Has company','points',COALESCE((w->>'contact_company')::int,0),'category','contactability');
  END IF;
  IF NEW.job_title IS NOT NULL AND length(btrim(NEW.job_title)) > 0 THEN
    total := total + COALESCE((w->>'contact_job_title')::int, 0);
    parts := parts || jsonb_build_object('label','Has job title','points',COALESCE((w->>'contact_job_title')::int,0),'category','contactability');
  END IF;
  IF NEW.country IS NOT NULL AND length(btrim(NEW.country)) > 0 THEN
    total := total + COALESCE((w->>'contact_country')::int, 0);
    parts := parts || jsonb_build_object('label','Has country','points',COALESCE((w->>'contact_country')::int,0),'category','contactability');
  END IF;

  -- Source quality
  IF NEW.source = 'invest_lead' THEN
    src_key := 'source_invest_lead'; src_label := 'Source: investor lead';
  ELSIF NEW.source = 'contact_form' THEN
    src_key := 'source_contact_form'; src_label := 'Source: contact form';
  ELSIF NEW.source = 'newsletter' THEN
    src_key := 'source_newsletter'; src_label := 'Source: newsletter';
  ELSE
    src_key := 'source_other'; src_label := 'Source: ' || COALESCE(NEW.source,'other');
  END IF;
  src_pts := COALESCE((w->>src_key)::int, 0);
  total := total + src_pts;
  parts := parts || jsonb_build_object('label',src_label,'points',src_pts,'category','source');

  -- Engagement
  IF NEW.last_contacted_at IS NOT NULL THEN
    total := total + COALESCE((w->>'engagement_contacted')::int, 0);
    parts := parts || jsonb_build_object('label','Contacted at least once','points',COALESCE((w->>'engagement_contacted')::int,0),'category','engagement');
    IF NEW.last_contacted_at > (now() - interval '7 days') THEN
      total := total + COALESCE((w->>'engagement_recent_7d')::int, 0);
      parts := parts || jsonb_build_object('label','Contacted in last 7 days','points',COALESCE((w->>'engagement_recent_7d')::int,0),'category','engagement');
    END IF;
  END IF;
  IF NEW.priority = 'high' THEN
    total := total + COALESCE((w->>'engagement_priority_high')::int, 0);
    parts := parts || jsonb_build_object('label','High priority','points',COALESCE((w->>'engagement_priority_high')::int,0),'category','engagement');
  END IF;

  IF total > 100 THEN total := 100; END IF;
  IF total < 0 THEN total := 0; END IF;

  NEW.score := total;
  NEW.score_breakdown := parts;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crm_leads_score ON public.crm_leads;
CREATE TRIGGER crm_leads_score
  BEFORE INSERT OR UPDATE ON public.crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.crm_compute_lead_score();

-- Backfill
UPDATE public.crm_leads SET updated_at = updated_at;
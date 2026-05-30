
CREATE TABLE public.tracked_keywords (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword TEXT NOT NULL,
  site_url TEXT NOT NULL DEFAULT 'https://dynime.com/',
  country TEXT,
  device TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (keyword, site_url, country, device)
);

CREATE TABLE public.keyword_rank_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword_id UUID NOT NULL REFERENCES public.tracked_keywords(id) ON DELETE CASCADE,
  position NUMERIC,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  ctr NUMERIC NOT NULL DEFAULT 0,
  top_page TEXT,
  captured_for DATE NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (keyword_id, captured_for)
);

CREATE INDEX idx_keyword_rank_history_keyword ON public.keyword_rank_history(keyword_id, captured_for DESC);

ALTER TABLE public.tracked_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keyword_rank_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage tracked keywords"
  ON public.tracked_keywords FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins read rank history"
  ON public.keyword_rank_history FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE TRIGGER trg_tracked_keywords_updated
BEFORE UPDATE ON public.tracked_keywords
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

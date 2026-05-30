CREATE TABLE IF NOT EXISTS public.gsc_cache (
  cache_key TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gsc_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gsc_cache_admin_read" ON public.gsc_cache FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'manager'));
CREATE INDEX IF NOT EXISTS gsc_cache_fetched_at_idx ON public.gsc_cache (fetched_at);
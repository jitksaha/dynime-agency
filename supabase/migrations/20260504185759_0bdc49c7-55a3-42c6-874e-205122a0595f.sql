-- Translations cache: stores per-language translations of source strings.
-- Keyed by language + a stable hash of the source text so identical strings
-- across pages share a single translation.
CREATE TABLE IF NOT EXISTS public.translations_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lang TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  source_text TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  context TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lang, source_hash)
);

CREATE INDEX IF NOT EXISTS idx_translations_lang_hash
  ON public.translations_cache (lang, source_hash);

ALTER TABLE public.translations_cache ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. anon visitors) can read cached translations
CREATE POLICY "Anyone can read translations"
  ON public.translations_cache FOR SELECT
  USING (true);

-- Only admins can directly mutate (edge function uses service role)
CREATE POLICY "Admins can manage translations"
  ON public.translations_cache FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER update_translations_cache_updated_at
  BEFORE UPDATE ON public.translations_cache
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS ats_score integer,
  ADD COLUMN IF NOT EXISTS ats_match_level text,
  ADD COLUMN IF NOT EXISTS ats_matched_keywords text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS ats_missing_keywords text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS ats_summary text,
  ADD COLUMN IF NOT EXISTS ats_scanned_at timestamptz,
  ADD COLUMN IF NOT EXISTS ats_resume_chars integer;

ALTER TABLE public.job_applications
  DROP CONSTRAINT IF EXISTS job_applications_ats_match_level_check;
ALTER TABLE public.job_applications
  ADD CONSTRAINT job_applications_ats_match_level_check
  CHECK (ats_match_level IS NULL OR ats_match_level IN ('high','medium','low'));

CREATE INDEX IF NOT EXISTS idx_job_applications_ats_match_level
  ON public.job_applications (ats_match_level);
CREATE INDEX IF NOT EXISTS idx_job_applications_ats_score
  ON public.job_applications (ats_score);
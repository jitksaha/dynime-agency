
ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS ats_detected_skills text[],
  ADD COLUMN IF NOT EXISTS ats_detected_titles text[],
  ADD COLUMN IF NOT EXISTS ats_detected_experience_years numeric,
  ADD COLUMN IF NOT EXISTS ats_education text,
  ADD COLUMN IF NOT EXISTS ats_red_flags text[],
  ADD COLUMN IF NOT EXISTS ats_recommendation text,
  ADD COLUMN IF NOT EXISTS ats_contact_links jsonb,
  ADD COLUMN IF NOT EXISTS ats_highlights text[];


ALTER TABLE public.careers ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_career_view(_slug text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count integer;
BEGIN
  UPDATE public.careers
     SET view_count = COALESCE(view_count, 0) + 1
   WHERE slug = _slug AND is_active = true
  RETURNING view_count INTO new_count;
  RETURN COALESCE(new_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_career_view(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_career_stats(_slug text)
RETURNS TABLE(view_count integer, applicant_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(c.view_count, 0) AS view_count,
    (SELECT COUNT(*) FROM public.job_applications ja WHERE ja.career_id = c.id) AS applicant_count
  FROM public.careers c
  WHERE c.slug = _slug AND c.is_active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_career_stats(text) TO anon, authenticated;

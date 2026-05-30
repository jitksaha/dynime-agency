UPDATE public.service_pricing
SET tiers = (
  SELECT jsonb_agg(
    CASE
      WHEN (t->>'period') IS NULL OR btrim(t->>'period') = ''
        THEN jsonb_set(t, '{period}', '"one-time"'::jsonb, true)
      ELSE t
    END
    ORDER BY ord
  )
  FROM jsonb_array_elements(tiers) WITH ORDINALITY AS x(t, ord)
)
WHERE EXISTS (
  SELECT 1 FROM jsonb_array_elements(tiers) t
  WHERE (t->>'period') IS NULL OR btrim(t->>'period') = ''
);
ALTER TABLE public.careers
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS content_html TEXT,
  ADD COLUMN IF NOT EXISTS posting_channels JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Backfill slugs for existing rows from title (lowercase, hyphenated, dedup with id suffix)
UPDATE public.careers
SET slug = regexp_replace(lower(trim(title)), '[^a-z0-9]+', '-', 'g') || '-' || substr(id::text, 1, 6)
WHERE slug IS NULL OR slug = '';

-- Make slug required + unique going forward
ALTER TABLE public.careers ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS careers_slug_unique ON public.careers (slug);
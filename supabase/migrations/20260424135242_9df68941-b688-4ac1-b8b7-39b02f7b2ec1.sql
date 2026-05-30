ALTER TABLE public.portfolio_projects
ADD COLUMN IF NOT EXISTS alt_text text,
ADD COLUMN IF NOT EXISTS thumbnail_path text;
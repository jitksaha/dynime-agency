
UPDATE public.portfolio_projects
SET thumbnail_url = NULL, thumbnail_path = NULL
WHERE thumbnail_url ~* 'thum\.io|screenshotmachine|microlink|mshots|urlbox';

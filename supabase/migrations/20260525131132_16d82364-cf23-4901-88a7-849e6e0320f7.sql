
DROP POLICY IF EXISTS "Public can read non-sensitive site settings" ON public.site_settings;
CREATE POLICY "Public can read non-sensitive site settings"
ON public.site_settings
FOR SELECT
USING (
  is_admin(auth.uid()) OR (
    (lower(key) !~~ '%secret%')
    AND (lower(key) !~~ '%api_key%')
    AND (lower(key) !~~ '%apikey%')
    AND (lower(key) !~~ '%app_key%')
    AND (lower(key) !~~ '%token%')
    AND (lower(key) !~~ '%password%')
    AND (lower(key) !~~ '%private%')
    AND (lower(key) !~~ '%webhook%')
    AND (lower(key) !~~ '%credential%')
    AND (lower(key) !~~ '%username%')
  )
);

DROP POLICY IF EXISTS "Editor manages site settings (non-secret)" ON public.site_settings;
CREATE POLICY "Editor manages site settings (non-secret)"
ON public.site_settings
FOR ALL
USING (
  has_role(auth.uid(), 'editor'::app_role)
  AND (lower(key) !~~ '%secret%')
  AND (lower(key) !~~ '%api_key%')
  AND (lower(key) !~~ '%apikey%')
  AND (lower(key) !~~ '%app_key%')
  AND (lower(key) !~~ '%token%')
  AND (lower(key) !~~ '%password%')
  AND (lower(key) !~~ '%private%')
  AND (lower(key) !~~ '%webhook%')
  AND (lower(key) !~~ '%credential%')
  AND (lower(key) !~~ '%username%')
)
WITH CHECK (
  has_role(auth.uid(), 'editor'::app_role)
  AND (lower(key) !~~ '%secret%')
  AND (lower(key) !~~ '%api_key%')
  AND (lower(key) !~~ '%apikey%')
  AND (lower(key) !~~ '%app_key%')
  AND (lower(key) !~~ '%token%')
  AND (lower(key) !~~ '%password%')
  AND (lower(key) !~~ '%private%')
  AND (lower(key) !~~ '%webhook%')
  AND (lower(key) !~~ '%credential%')
  AND (lower(key) !~~ '%username%')
);

DROP POLICY IF EXISTS "Anyone can read active contact info" ON public.contact_info;
CREATE POLICY "Anyone can read active contact info"
ON public.contact_info
FOR SELECT
USING (is_active = true);

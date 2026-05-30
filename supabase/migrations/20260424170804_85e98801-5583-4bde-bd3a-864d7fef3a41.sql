
-- Restrict listing of site-assets to admins; direct file URLs still resolve
-- because storage public reads check the bucket's `public` flag separately
-- when serving via the storage CDN, not via the SELECT policy on storage.objects.
DROP POLICY IF EXISTS "Public read access for site-assets" ON storage.objects;
CREATE POLICY "Admins can list site-assets"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'site-assets' AND public.is_admin(auth.uid()));

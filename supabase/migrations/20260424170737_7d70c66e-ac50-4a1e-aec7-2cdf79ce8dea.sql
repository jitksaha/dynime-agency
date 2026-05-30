
-- Public storage bucket for site branding assets (logos, favicons, og images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-assets', 'site-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Public read for site-assets
DROP POLICY IF EXISTS "Public read access for site-assets" ON storage.objects;
CREATE POLICY "Public read access for site-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'site-assets');

-- Admins can upload, update, delete in site-assets
DROP POLICY IF EXISTS "Admins can upload site-assets" ON storage.objects;
CREATE POLICY "Admins can upload site-assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'site-assets' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update site-assets" ON storage.objects;
CREATE POLICY "Admins can update site-assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'site-assets' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete site-assets" ON storage.objects;
CREATE POLICY "Admins can delete site-assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'site-assets' AND public.is_admin(auth.uid()));

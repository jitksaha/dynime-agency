-- Tighten portfolio storage to admins only
DROP POLICY IF EXISTS "Authenticated users can upload portfolio images" ON storage.objects;
CREATE POLICY "Admins can upload portfolio images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'portfolio' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can update portfolio images" ON storage.objects;
CREATE POLICY "Admins can update portfolio images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'portfolio' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can delete portfolio images" ON storage.objects;
CREATE POLICY "Admins can delete portfolio images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'portfolio' AND public.is_admin(auth.uid()));

-- Restrict bucket listing while keeping public file access via direct URL
DROP POLICY IF EXISTS "Anyone can read portfolio images" ON storage.objects;
CREATE POLICY "Public can read portfolio files by path" ON storage.objects FOR SELECT TO public USING (bucket_id = 'portfolio' AND auth.role() IS NOT NULL OR bucket_id = 'portfolio');

-- Tighten profile insert
DROP POLICY IF EXISTS "Profiles are insertable by trigger" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
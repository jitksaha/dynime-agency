
INSERT INTO storage.buckets (id, name, public)
VALUES ('payslips', 'payslips', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "HR/admin can read payslips" ON storage.objects;
CREATE POLICY "HR/admin can read payslips"
ON storage.objects FOR SELECT
USING (bucket_id = 'payslips' AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'hr'::app_role)));

DROP POLICY IF EXISTS "HR/admin can upload payslips" ON storage.objects;
CREATE POLICY "HR/admin can upload payslips"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payslips' AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'hr'::app_role)));

DROP POLICY IF EXISTS "HR/admin can update payslips" ON storage.objects;
CREATE POLICY "HR/admin can update payslips"
ON storage.objects FOR UPDATE
USING (bucket_id = 'payslips' AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'hr'::app_role)));

DROP POLICY IF EXISTS "HR/admin can delete payslips" ON storage.objects;
CREATE POLICY "HR/admin can delete payslips"
ON storage.objects FOR DELETE
USING (bucket_id = 'payslips' AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'hr'::app_role)));

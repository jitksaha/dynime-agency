INSERT INTO storage.buckets (id, name, public)
VALUES ('email-attachments', 'email-attachments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Staff read email attachments" ON storage.objects;
CREATE POLICY "Staff read email attachments" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'email-attachments'
  AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'support'::public.app_role))
);

DROP POLICY IF EXISTS "Staff write email attachments" ON storage.objects;
CREATE POLICY "Staff write email attachments" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'email-attachments'
  AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'support'::public.app_role))
);

DROP POLICY IF EXISTS "Staff delete email attachments" ON storage.objects;
CREATE POLICY "Staff delete email attachments" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'email-attachments'
  AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'support'::public.app_role))
);
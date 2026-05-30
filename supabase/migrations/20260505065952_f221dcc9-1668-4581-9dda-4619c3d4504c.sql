-- Create private bucket for company formation documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-documents', 'company-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Admins can fully manage company documents
CREATE POLICY "Admins manage company documents"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'company-documents' AND public.is_admin(auth.uid()))
WITH CHECK (bucket_id = 'company-documents' AND public.is_admin(auth.uid()));

-- Customers can read documents that belong to one of their own services.
-- Path convention: <customer_service_id>/<filename>
CREATE POLICY "Customers read own company documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'company-documents'
  AND EXISTS (
    SELECT 1 FROM public.customer_services cs
    WHERE cs.id::text = (storage.foldername(name))[1]
      AND (cs.user_id = auth.uid() OR cs.customer_email = (auth.jwt() ->> 'email'))
  )
);

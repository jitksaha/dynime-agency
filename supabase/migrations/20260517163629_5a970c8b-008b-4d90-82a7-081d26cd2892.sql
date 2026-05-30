-- Admins / HR can upload anywhere in the bucket (fulfillment files etc.)
CREATE POLICY "Admins upload request attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'hr-request-attachments'
  AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'hr'::public.app_role))
);

-- Admins / HR can delete any attachment
CREATE POLICY "Admins delete request attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'hr-request-attachments'
  AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'hr'::public.app_role))
);

-- Employees can read fulfillment attachments tied to their own requests.
-- Path convention: fulfillment/<request_id>/<filename>
CREATE POLICY "Employees read fulfillment attachments for own requests"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'hr-request-attachments'
  AND (storage.foldername(name))[1] = 'fulfillment'
  AND EXISTS (
    SELECT 1
    FROM public.hr_requests r
    JOIN public.employees e ON e.id = r.employee_id
    WHERE r.id::text = (storage.foldername(name))[2]
      AND (
        e.user_id = auth.uid()
        OR lower(coalesce(e.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
);

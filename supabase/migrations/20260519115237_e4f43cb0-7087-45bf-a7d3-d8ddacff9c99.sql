-- 1) Remove sensitive tables from Realtime publication (ignore if not present)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'admin_replies','employees','hr_documents','inbound_emails',
    'orders','hr_requests','hr_request_events'
  ]
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE public.%I', t);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipping %: %', t, SQLERRM;
    END;
  END LOOP;
END $$;

-- 2) Storage: bank receipts — require user_id match, drop JWT email fallback
DROP POLICY IF EXISTS "Bank receipts upload requires owned order" ON storage.objects;
CREATE POLICY "Bank receipts upload requires owned order"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'bank-receipts'
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id::text = (storage.foldername(name))[1]
      AND o.user_id = auth.uid()
  )
);

-- 3) Storage: company documents — require user_id match, drop JWT email fallback
DROP POLICY IF EXISTS "Customers read own company documents" ON storage.objects;
CREATE POLICY "Customers read own company documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'company-documents'
  AND EXISTS (
    SELECT 1 FROM public.customer_services cs
    WHERE cs.id::text = (storage.foldername(name))[1]
      AND cs.user_id = auth.uid()
  )
);

-- 4) Storage: HR request fulfillment attachments — require user_id match
DROP POLICY IF EXISTS "Employees read fulfillment attachments for own requests" ON storage.objects;
CREATE POLICY "Employees read fulfillment attachments for own requests"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'hr-request-fulfillment'
  AND EXISTS (
    SELECT 1 FROM public.hr_requests r
    JOIN public.employees e ON e.id = r.employee_id
    WHERE r.id::text = (storage.foldername(name))[1]
      AND e.user_id = auth.uid()
  )
);

-- 5) Storage: job-applications resume uploads — restrict to public/ prefix
DROP POLICY IF EXISTS "Public can upload resumes" ON storage.objects;
CREATE POLICY "Public can upload resumes"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (
  bucket_id = 'job-applications'
  AND (storage.foldername(name))[1] = 'public'
  AND name ~ '^public/[A-Za-z0-9_\-]+/'
);
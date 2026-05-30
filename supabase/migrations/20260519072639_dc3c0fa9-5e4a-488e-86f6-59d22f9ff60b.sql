
-- 1. Harden current_employee_id(): only match by auth.uid(), no email fallback
CREATE OR REPLACE FUNCTION public.current_employee_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT e.id
  FROM public.employees e
  WHERE e.user_id = auth.uid()
  LIMIT 1;
$function$;

-- 2. ORDERS: drop email-based SELECT
DROP POLICY IF EXISTS "Users can read own orders by email" ON public.orders;

-- 3. ORDER MILESTONES: rewrite to drop email branch
DROP POLICY IF EXISTS "Users read own milestones" ON public.order_milestones;
CREATE POLICY "Users read own milestones" ON public.order_milestones
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.orders o
  WHERE o.id = order_milestones.parent_order_id
    AND o.user_id = auth.uid()
));

-- 4. CUSTOMER SERVICES: drop email SELECT; rewrite UPDATE to user_id only
DROP POLICY IF EXISTS "Users read own services by email" ON public.customer_services;
DROP POLICY IF EXISTS "Users toggle auto_renew on own services" ON public.customer_services;
CREATE POLICY "Users toggle auto_renew on own services" ON public.customer_services
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 5. SERVICE RENEWALS: rewrite SELECT to drop email branch
DROP POLICY IF EXISTS "Users read own renewal logs" ON public.service_renewals;
CREATE POLICY "Users read own renewal logs" ON public.service_renewals
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.customer_services cs
  WHERE cs.id = service_renewals.customer_service_id
    AND cs.user_id = auth.uid()
));

-- 6. SUPPORT TICKETS: rewrite SELECT/INSERT/UPDATE to user_id only
DROP POLICY IF EXISTS "Users read own tickets" ON public.support_tickets;
CREATE POLICY "Users read own tickets" ON public.support_tickets
FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users create own tickets" ON public.support_tickets;
CREATE POLICY "Users create own tickets" ON public.support_tickets
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND length(trim(subject)) > 0);

DROP POLICY IF EXISTS "Users update own tickets status" ON public.support_tickets;
CREATE POLICY "Users update own tickets status" ON public.support_tickets
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 7. TICKET MESSAGES: rewrite to drop email branch
DROP POLICY IF EXISTS "Users read own ticket messages" ON public.ticket_messages;
CREATE POLICY "Users read own ticket messages" ON public.ticket_messages
FOR SELECT TO authenticated
USING (is_internal = false AND EXISTS (
  SELECT 1 FROM public.support_tickets t
  WHERE t.id = ticket_messages.ticket_id
    AND t.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users send messages on own tickets" ON public.ticket_messages;
CREATE POLICY "Users send messages on own tickets" ON public.ticket_messages
FOR INSERT TO authenticated
WITH CHECK (
  sender_type = 'customer'
  AND is_internal = false
  AND length(trim(message)) > 0
  AND EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = ticket_messages.ticket_id
      AND t.user_id = auth.uid()
  )
);

-- 8. HR DOCUMENTS: rewrite SELECT to drop email branch
DROP POLICY IF EXISTS "Employees read own hr documents" ON public.hr_documents;
CREATE POLICY "Employees read own hr documents" ON public.hr_documents
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.employees e
  WHERE e.id = hr_documents.employee_id
    AND e.user_id = auth.uid()
));

-- 9. STORAGE: rewrite HR document storage SELECT to drop email branch
DROP POLICY IF EXISTS "Employees read own hr-documents files" ON storage.objects;
CREATE POLICY "Employees read own hr-documents files" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'hr-documents'
  AND EXISTS (
    SELECT 1 FROM public.employees e
    WHERE (e.id)::text = (storage.foldername(objects.name))[1]
      AND e.user_id = auth.uid()
  )
);

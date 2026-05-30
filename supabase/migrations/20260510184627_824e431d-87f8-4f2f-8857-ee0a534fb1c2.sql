
-- 1. customer_services: column-level restriction via trigger
CREATE OR REPLACE FUNCTION public.enforce_customer_services_user_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Skip enforcement for admins or sales role
  IF public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'sales'::public.app_role) THEN
    RETURN NEW;
  END IF;

  -- Only auto_renew may change; everything else must remain identical
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.customer_email IS DISTINCT FROM OLD.customer_email
     OR NEW.service_name IS DISTINCT FROM OLD.service_name
     OR NEW.price IS DISTINCT FROM OLD.price
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.billing_cycle IS DISTINCT FROM OLD.billing_cycle
     OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Customers may only update the auto_renew field on their own services';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_customer_services_user_columns ON public.customer_services;
CREATE TRIGGER trg_enforce_customer_services_user_columns
BEFORE UPDATE ON public.customer_services
FOR EACH ROW
EXECUTE FUNCTION public.enforce_customer_services_user_columns();

-- 2. support_tickets: restrict customer-side updates to status only
CREATE OR REPLACE FUNCTION public.enforce_support_tickets_user_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'support'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.customer_email IS DISTINCT FROM OLD.customer_email
     OR NEW.order_id IS DISTINCT FROM OLD.order_id
     OR NEW.priority IS DISTINCT FROM OLD.priority
     OR NEW.category IS DISTINCT FROM OLD.category
     OR NEW.subject IS DISTINCT FROM OLD.subject
     OR NEW.last_reply_by IS DISTINCT FROM OLD.last_reply_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Customers may only update the status of their own tickets';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_support_tickets_user_columns ON public.support_tickets;
CREATE TRIGGER trg_enforce_support_tickets_user_columns
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.enforce_support_tickets_user_columns();

-- 3. bank-receipts: require authentication for uploads
DROP POLICY IF EXISTS "Bank receipts upload requires existing order" ON storage.objects;
CREATE POLICY "Bank receipts upload requires existing order"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'bank-receipts'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id::text = (storage.foldername(objects.name))[1]
  )
);

-- 4. email_send_log: remove from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.email_send_log;

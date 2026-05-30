
-- 1) Tighten bank-receipts storage bucket: enforce MIME types & 10MB size,
--    and restrict uploads to paths referencing an existing order.
DO $$
BEGIN
  -- Drop legacy permissive policies if they exist (names from prior migrations may vary)
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Anyone can upload bank receipts') THEN
    DROP POLICY "Anyone can upload bank receipts" ON storage.objects;
  END IF;
END$$;

UPDATE storage.buckets
   SET file_size_limit = 10485760,
       allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/heic','application/pdf']
 WHERE id = 'bank-receipts';

-- New strict INSERT policy: must be a known order id in the first folder segment.
CREATE POLICY "Bank receipts upload requires existing order"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (
    bucket_id = 'bank-receipts'
    AND (storage.foldername(name))[1] IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id::text = (storage.foldername(name))[1]
    )
  );

-- 2) Column-level guard for customer_services: non-admins may only change auto_renew
CREATE OR REPLACE FUNCTION public.guard_customer_services_user_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.customer_email IS DISTINCT FROM OLD.customer_email
     OR NEW.order_id IS DISTINCT FROM OLD.order_id
     OR NEW.invoice_number IS DISTINCT FROM OLD.invoice_number
     OR NEW.service_name IS DISTINCT FROM OLD.service_name
     OR NEW.service_slug IS DISTINCT FROM OLD.service_slug
     OR NEW.category IS DISTINCT FROM OLD.category
     OR NEW.type IS DISTINCT FROM OLD.type
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.billing_cycle IS DISTINCT FROM OLD.billing_cycle
     OR NEW.price IS DISTINCT FROM OLD.price
     OR NEW.currency IS DISTINCT FROM OLD.currency
     OR NEW.quantity IS DISTINCT FROM OLD.quantity
     OR NEW.started_at IS DISTINCT FROM OLD.started_at
     OR NEW.current_period_end IS DISTINCT FROM OLD.current_period_end
     OR NEW.delivered_at IS DISTINCT FROM OLD.delivered_at
     OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
     OR NEW.metadata IS DISTINCT FROM OLD.metadata THEN
    RAISE EXCEPTION 'Only auto_renew may be updated by the service owner';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_customer_services_user_update ON public.customer_services;
CREATE TRIGGER trg_guard_customer_services_user_update
BEFORE UPDATE ON public.customer_services
FOR EACH ROW EXECUTE FUNCTION public.guard_customer_services_user_update();

-- 3) Column-level guard for support_tickets: non-admins may only change status
CREATE OR REPLACE FUNCTION public.guard_support_tickets_user_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF NEW.customer_name IS DISTINCT FROM OLD.customer_name
     OR NEW.customer_email IS DISTINCT FROM OLD.customer_email
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.ticket_number IS DISTINCT FROM OLD.ticket_number
     OR NEW.order_id IS DISTINCT FROM OLD.order_id
     OR NEW.last_reply_by IS DISTINCT FROM OLD.last_reply_by
     OR NEW.metadata IS DISTINCT FROM OLD.metadata
     OR NEW.priority IS DISTINCT FROM OLD.priority
     OR NEW.category IS DISTINCT FROM OLD.category
     OR NEW.subject IS DISTINCT FROM OLD.subject THEN
    RAISE EXCEPTION 'Only status may be updated by the ticket owner';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_support_tickets_user_update ON public.support_tickets;
CREATE TRIGGER trg_guard_support_tickets_user_update
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.guard_support_tickets_user_update();

-- 4) Remove form_submissions from realtime publication so submissions aren't broadcast
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'form_submissions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.form_submissions';
  END IF;
END$$;

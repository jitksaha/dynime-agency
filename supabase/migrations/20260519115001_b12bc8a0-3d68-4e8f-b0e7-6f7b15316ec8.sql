ALTER TABLE public.email_send_log REPLICA IDENTITY FULL;
ALTER TABLE public.suppressed_emails REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.email_send_log;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.suppressed_emails;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
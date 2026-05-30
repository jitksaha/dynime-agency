-- Enable realtime on service_pricing so admin price changes
-- propagate to the public /services-pricing page instantly.
ALTER TABLE public.service_pricing REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'service_pricing'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.service_pricing';
  END IF;
END $$;
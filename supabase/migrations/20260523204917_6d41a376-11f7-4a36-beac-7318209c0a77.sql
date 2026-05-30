ALTER TABLE public.service_pricing REPLICA IDENTITY FULL;
ALTER TABLE public.service_addons REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.service_addons;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
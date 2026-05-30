ALTER TABLE public.country_eligibility REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.country_eligibility;
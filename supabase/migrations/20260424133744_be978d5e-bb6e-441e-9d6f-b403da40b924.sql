ALTER TABLE public.contact_info REPLICA IDENTITY FULL;
ALTER TABLE public.site_settings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_info;
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings;
ALTER TABLE public.hr_request_events REPLICA IDENTITY FULL;
ALTER TABLE public.hr_requests REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hr_request_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hr_requests;
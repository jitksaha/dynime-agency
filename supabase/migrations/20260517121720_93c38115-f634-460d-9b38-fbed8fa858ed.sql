
ALTER TABLE public.employees REPLICA IDENTITY FULL;
ALTER TABLE public.hr_documents REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.employees;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hr_documents;

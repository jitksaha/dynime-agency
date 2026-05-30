-- Set REPLICA IDENTITY FULL so realtime payloads include all columns on UPDATE/DELETE
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.form_submissions REPLICA IDENTITY FULL;
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.portfolio_projects REPLICA IDENTITY FULL;
ALTER TABLE public.pages REPLICA IDENTITY FULL;
ALTER TABLE public.products REPLICA IDENTITY FULL;

-- Add tables to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.form_submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.portfolio_projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
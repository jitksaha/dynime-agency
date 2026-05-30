
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number TEXT UNIQUE,
  user_id UUID,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  subject TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'open',
  order_id UUID,
  last_reply_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_reply_by TEXT NOT NULL DEFAULT 'customer',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ticket_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL,
  sender_name TEXT,
  sender_email TEXT,
  message TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX idx_tickets_email ON public.support_tickets(customer_email);
CREATE INDEX idx_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_ticket_messages_ticket_id ON public.ticket_messages(ticket_id);

CREATE SEQUENCE IF NOT EXISTS public.ticket_seq START 1000;

CREATE OR REPLACE FUNCTION public.assign_ticket_number()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number := 'TKT-' || to_char(now(), 'YYYY') || '-' ||
                         lpad(nextval('public.ticket_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assign_ticket_number
BEFORE INSERT ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.assign_ticket_number();

CREATE TRIGGER trg_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.bump_ticket_on_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.support_tickets
     SET last_reply_at = now(),
         last_reply_by = NEW.sender_type,
         status = CASE
            WHEN NEW.sender_type = 'customer' AND status = 'resolved' THEN 'open'
            WHEN NEW.sender_type = 'admin' AND status = 'open' THEN 'pending'
            ELSE status
          END,
         updated_at = now()
   WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bump_ticket_on_message
AFTER INSERT ON public.ticket_messages
FOR EACH ROW EXECUTE FUNCTION public.bump_ticket_on_message();

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- Tickets policies
CREATE POLICY "Users create own tickets"
ON public.support_tickets FOR INSERT TO authenticated
WITH CHECK (
  (user_id = auth.uid() OR customer_email = (auth.jwt() ->> 'email'))
  AND length(trim(subject)) > 0
);

CREATE POLICY "Users read own tickets"
ON public.support_tickets FOR SELECT TO authenticated
USING (user_id = auth.uid() OR customer_email = (auth.jwt() ->> 'email'));

CREATE POLICY "Users update own tickets status"
ON public.support_tickets FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR customer_email = (auth.jwt() ->> 'email'))
WITH CHECK (user_id = auth.uid() OR customer_email = (auth.jwt() ->> 'email'));

CREATE POLICY "Admins manage tickets"
ON public.support_tickets FOR ALL TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Messages policies
CREATE POLICY "Users read own ticket messages"
ON public.ticket_messages FOR SELECT TO authenticated
USING (
  is_internal = false AND EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = ticket_messages.ticket_id
      AND (t.user_id = auth.uid() OR t.customer_email = (auth.jwt() ->> 'email'))
  )
);

CREATE POLICY "Users send messages on own tickets"
ON public.ticket_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_type = 'customer'
  AND is_internal = false
  AND length(trim(message)) > 0
  AND EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = ticket_messages.ticket_id
      AND (t.user_id = auth.uid() OR t.customer_email = (auth.jwt() ->> 'email'))
  )
);

CREATE POLICY "Admins manage ticket messages"
ON public.ticket_messages FOR ALL TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

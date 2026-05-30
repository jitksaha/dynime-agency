
CREATE TABLE IF NOT EXISTS public.inbound_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text UNIQUE,
  uid bigint,
  folder text NOT NULL DEFAULT 'INBOX',
  from_email text NOT NULL,
  from_name text,
  to_email text,
  cc_email text,
  subject text,
  in_reply_to text,
  reference_ids text[],
  snippet text,
  body_text text,
  body_html text,
  received_at timestamptz NOT NULL DEFAULT now(),
  raw_size integer,
  ticket_id uuid REFERENCES public.support_tickets(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  is_read boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inbound_emails_received_at ON public.inbound_emails (received_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbound_emails_from ON public.inbound_emails (from_email);
CREATE INDEX IF NOT EXISTS idx_inbound_emails_ticket ON public.inbound_emails (ticket_id);
CREATE INDEX IF NOT EXISTS idx_inbound_emails_unread ON public.inbound_emails (is_read) WHERE is_read = false;

ALTER TABLE public.inbound_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view inbound emails"
ON public.inbound_emails FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'support'::public.app_role));

CREATE POLICY "Staff can update inbound emails"
ON public.inbound_emails FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'support'::public.app_role));

CREATE POLICY "Staff can delete inbound emails"
ON public.inbound_emails FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'support'::public.app_role));

CREATE TRIGGER trg_inbound_emails_updated_at
BEFORE UPDATE ON public.inbound_emails
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.inbound_emails;
ALTER TABLE public.inbound_emails REPLICA IDENTITY FULL;

CREATE TABLE IF NOT EXISTS public.imap_poll_state (
  id integer PRIMARY KEY DEFAULT 1,
  folder text NOT NULL DEFAULT 'INBOX',
  last_uid bigint NOT NULL DEFAULT 0,
  last_run_at timestamptz,
  last_status text,
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT imap_poll_state_singleton CHECK (id = 1)
);

INSERT INTO public.imap_poll_state (id, folder, last_uid)
VALUES (1, 'INBOX', 0)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.imap_poll_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view imap state"
ON public.imap_poll_state FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

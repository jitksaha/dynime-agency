CREATE TABLE IF NOT EXISTS public.email_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text NOT NULL,
  template_name text NOT NULL,
  recipient_email text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending','sent','failed','suppressed','skipped')),
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_send_log_message_id_idx ON public.email_send_log (message_id);
CREATE INDEX IF NOT EXISTS email_send_log_created_at_idx ON public.email_send_log (created_at DESC);
CREATE INDEX IF NOT EXISTS email_send_log_recipient_idx ON public.email_send_log (lower(recipient_email));

ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read email send log" ON public.email_send_log;
CREATE POLICY "Admins can read email send log"
ON public.email_send_log
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.suppressed_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  reason text NOT NULL DEFAULT 'manual',
  source text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS suppressed_emails_lower_email_idx ON public.suppressed_emails (lower(email));

ALTER TABLE public.suppressed_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read suppressed emails" ON public.suppressed_emails;
CREATE POLICY "Admins can read suppressed emails"
ON public.suppressed_emails
FOR SELECT
USING (public.is_admin(auth.uid()));
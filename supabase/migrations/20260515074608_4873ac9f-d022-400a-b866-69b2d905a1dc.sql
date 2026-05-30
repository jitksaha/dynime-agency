
-- Reply history for admin → customer replies sent from admin pages
CREATE TABLE IF NOT EXISTS public.admin_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL CHECK (target_type IN ('invest_lead', 'form_submission')),
  target_id uuid NOT NULL,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_by_name text,
  sent_by_email text,
  status text NOT NULL DEFAULT 'sent',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_replies_target_idx
  ON public.admin_replies (target_type, target_id, created_at DESC);

ALTER TABLE public.admin_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read admin replies"
  ON public.admin_replies FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins insert admin replies"
  ON public.admin_replies FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin(auth.uid())
    AND length(btrim(subject)) > 0
    AND length(btrim(body)) > 0
  );

CREATE POLICY "Admins delete admin replies"
  ON public.admin_replies FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

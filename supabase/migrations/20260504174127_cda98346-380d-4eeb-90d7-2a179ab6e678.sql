
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read notification settings"
  ON public.notification_settings FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert notification settings"
  ON public.notification_settings FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update notification settings"
  ON public.notification_settings FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.notification_settings (key, value) VALUES
  ('email_notifications', jsonb_build_object(
    'enabled', true,
    'admin_recipient', 'contact@dynime.com',
    'send_customer_confirmation', true,
    'admin_panel_url', 'https://dynime.com/superadmin/submissions'
  ))
ON CONFLICT (key) DO NOTHING;

-- Allow public read of just the email_notifications row's `enabled` flag so the
-- client can short-circuit (not strictly needed; the edge function reads with
-- service role). Keeping table admin-only.

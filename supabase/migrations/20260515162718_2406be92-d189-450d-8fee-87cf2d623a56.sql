
-- Generate a stable poller token in notification_settings if not present
INSERT INTO public.notification_settings (key, value)
SELECT 'imap_poll_token', jsonb_build_object('token', encode(gen_random_bytes(32), 'hex'))
WHERE NOT EXISTS (
  SELECT 1 FROM public.notification_settings WHERE key = 'imap_poll_token'
);

DO $$
DECLARE
  jid bigint;
  tok text;
BEGIN
  SELECT (value->>'token') INTO tok FROM public.notification_settings WHERE key = 'imap_poll_token';

  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'imap-poll-every-minute';
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;

  PERFORM cron.schedule(
    'imap-poll-every-minute',
    '* * * * *',
    format($cron$
      SELECT net.http_post(
        url := 'https://isweduliawwjqwhyvwhp.supabase.co/functions/v1/imap-poll',
        headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', %L),
        body := jsonb_build_object('triggered_at', now())
      );
    $cron$, tok)
  );
END $$;

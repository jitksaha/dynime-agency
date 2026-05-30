SELECT cron.unschedule('renewal-check') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'renewal-check');

SELECT cron.schedule(
  'renewal-check',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url:='https://isweduliawwjqwhyvwhp.supabase.co/functions/v1/recurring-renewal-cron',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlzd2VkdWxpYXd3anF3aHl2d2hwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMzU2NTIsImV4cCI6MjA5MjYxMTY1Mn0.I7InCnynzCOzjZPi_IOb3L9pVUJ7YgebDNWuNb6Uu9M"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);
-- Fix 1: chat_messages — block admin sender_type spoofing
DROP POLICY IF EXISTS "Anyone can insert chat messages" ON public.chat_messages;

CREATE POLICY "Anyone can insert chat messages"
ON public.chat_messages
FOR INSERT
TO public
WITH CHECK (
  length(trim(session_id)) > 0
  AND length(trim(message)) > 0
  AND (
    sender_type IN ('user', 'system')
    OR (sender_type = 'admin' AND public.is_admin(auth.uid()))
  )
);

-- Fix 2: site_settings — restrict anon SELECT to non-sensitive keys
DROP POLICY IF EXISTS "Anyone can read site settings" ON public.site_settings;

CREATE POLICY "Public can read non-sensitive site settings"
ON public.site_settings
FOR SELECT
TO public
USING (
  is_admin(auth.uid())
  OR (
    lower(key) NOT LIKE '%secret%'
    AND lower(key) NOT LIKE '%api_key%'
    AND lower(key) NOT LIKE '%apikey%'
    AND lower(key) NOT LIKE '%token%'
    AND lower(key) NOT LIKE '%password%'
    AND lower(key) NOT LIKE '%private%'
    AND lower(key) NOT LIKE '%webhook%'
    AND lower(key) NOT LIKE '%credential%'
  )
);

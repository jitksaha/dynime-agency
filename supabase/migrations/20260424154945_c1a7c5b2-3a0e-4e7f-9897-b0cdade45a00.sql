
DROP POLICY IF EXISTS "Anyone can insert chat messages" ON public.chat_messages;
CREATE POLICY "Anyone can insert chat messages"
ON public.chat_messages
FOR INSERT
TO public
WITH CHECK (
  length(trim(session_id)) > 0
  AND length(trim(message)) > 0
  AND sender_type IN ('user', 'admin', 'system')
);

DROP POLICY IF EXISTS "Anyone can submit forms" ON public.form_submissions;
CREATE POLICY "Anyone can submit forms"
ON public.form_submissions
FOR INSERT
TO public
WITH CHECK (
  form_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.form_templates ft
    WHERE ft.id = form_submissions.form_id AND ft.is_active = true
  )
  AND data IS NOT NULL
  AND data <> '{}'::jsonb
);

DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
CREATE POLICY "Anyone can create orders"
ON public.orders
FOR INSERT
TO public
WITH CHECK (
  customer_email IS NOT NULL
  AND length(trim(customer_email)) > 0
  AND customer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND items IS NOT NULL
  AND jsonb_typeof(items) = 'array'
  AND jsonb_array_length(items) > 0
  AND total >= 0
);

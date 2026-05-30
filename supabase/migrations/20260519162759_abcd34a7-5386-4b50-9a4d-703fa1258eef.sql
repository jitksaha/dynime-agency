-- 1) Lock down id_card_assignments: remove unauthenticated full-table read
DROP POLICY IF EXISTS "Public can verify id cards" ON public.id_card_assignments;

-- 2) Public lookup of a SINGLE card by its id (sanitized, no enumeration)
CREATE OR REPLACE FUNCTION public.verify_id_card(_card_id text)
RETURNS TABLE(card_id text, kind text, qr_payload jsonb, subject_key text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.card_id, a.kind, a.qr_payload, a.subject_key
  FROM public.id_card_assignments a
  WHERE a.card_id = btrim(coalesce(_card_id,''))
    AND length(btrim(coalesce(_card_id,''))) > 0
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.verify_id_card(text) TO anon, authenticated;

-- 3) Minimal mapping for the public team carousel: subject_key -> card_id only.
--    Does NOT expose subject_name, subject_email, or qr_payload.
CREATE OR REPLACE FUNCTION public.list_team_card_ids()
RETURNS TABLE(card_id text, subject_key text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.card_id, a.subject_key
  FROM public.id_card_assignments a
  WHERE a.kind = 'EMP'
    AND a.subject_key IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.list_team_card_ids() TO anon, authenticated;

-- 4) Storage: allow customers to UPDATE/DELETE their own bank receipts
--    (same ownership condition as the existing INSERT policy).
CREATE POLICY "Customers can update their bank receipts"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'bank-receipts'
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id::text = (storage.foldername(objects.name))[1]
      AND o.user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'bank-receipts'
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id::text = (storage.foldername(objects.name))[1]
      AND o.user_id = auth.uid()
  )
);

CREATE POLICY "Customers can delete their bank receipts"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'bank-receipts'
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id::text = (storage.foldername(objects.name))[1]
      AND o.user_id = auth.uid()
  )
);

-- 5) Storage: allow investors to UPDATE/DELETE their own docs
CREATE POLICY "Investor updates own docs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'investor-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'investor-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Investor deletes own docs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'investor-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
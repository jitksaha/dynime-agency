CREATE OR REPLACE FUNCTION public.admin_lookup_account_by_phone(_phone text)
RETURNS TABLE(user_id uuid, full_name text, email text, source text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  digits text := regexp_replace(coalesce(_phone,''), '\D', '', 'g');
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT (public.is_admin(uid) OR public.has_role(uid, 'sales'::public.app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF length(digits) < 6 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.id AS user_id, p.full_name, p.email, 'order_phone'::text AS source
    FROM public.orders o
    JOIN public.profiles p ON p.id = o.user_id
   WHERE o.user_id IS NOT NULL
     AND length(regexp_replace(coalesce(o.billing_address->>'phone',''), '\D', '', 'g')) >= 6
     AND right(regexp_replace(coalesce(o.billing_address->>'phone',''), '\D', '', 'g'), 8) = right(digits, 8)
   ORDER BY o.created_at DESC
   LIMIT 1;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_lookup_account_by_phone(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_lookup_account_by_phone(text) TO authenticated;
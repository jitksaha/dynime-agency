CREATE OR REPLACE FUNCTION public.claim_order_to_account(
  _invoice text,
  _email text,
  _phone text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o public.orders;
  uid uuid := auth.uid();
  matches int := 0;
  matched_fields text[] := ARRAY[]::text[];
  inv_in text := nullif(upper(btrim(coalesce(_invoice,''))), '');
  email_in text := nullif(lower(btrim(coalesce(_email,''))), '');
  phone_in text := regexp_replace(coalesce(_phone,''), '\D', '', 'g');
  order_phone text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to claim an order';
  END IF;
  IF inv_in IS NULL THEN
    RAISE EXCEPTION 'Order/invoice number is required';
  END IF;

  SELECT * INTO o
    FROM public.orders
   WHERE upper(invoice_number) = inv_in
      OR id::text = lower(inv_in)
   LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No order found for that number';
  END IF;

  matches := 1;
  matched_fields := array_append(matched_fields, 'invoice');

  IF email_in IS NOT NULL AND lower(coalesce(o.customer_email,'')) = email_in THEN
    matches := matches + 1;
    matched_fields := array_append(matched_fields, 'email');
  END IF;

  order_phone := regexp_replace(coalesce(o.billing_address->>'phone',''), '\D', '', 'g');
  IF length(phone_in) >= 6 AND length(order_phone) >= 6
     AND right(order_phone, 8) = right(phone_in, 8) THEN
    matches := matches + 1;
    matched_fields := array_append(matched_fields, 'phone');
  END IF;

  IF matches < 2 THEN
    RAISE EXCEPTION 'Verification failed — at least 2 of order number, email and phone must match the order on file';
  END IF;

  IF o.user_id IS NOT NULL AND o.user_id <> uid THEN
    RAISE EXCEPTION 'This order is already linked to another account';
  END IF;

  UPDATE public.orders
     SET user_id = uid,
         updated_at = now()
   WHERE id = o.id;

  RETURN jsonb_build_object(
    'ok', true,
    'id', o.id,
    'invoice_number', o.invoice_number,
    'matches', matches,
    'matched_fields', matched_fields
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_order_to_account(text, text, text) TO authenticated;
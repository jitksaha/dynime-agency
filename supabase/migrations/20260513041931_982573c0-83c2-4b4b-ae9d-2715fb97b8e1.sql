
-- 1) Auto-link orders by email when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

  -- Attach any pre-existing orders that were created for this email
  UPDATE public.orders
     SET user_id = NEW.id, updated_at = now()
   WHERE user_id IS NULL
     AND lower(customer_email) = lower(NEW.email);

  RETURN NEW;
END;
$$;

-- 2) Customer-facing claim: link an existing order to the signed-in account
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
  uemail text := auth.jwt() ->> 'email';
  matches int := 0;
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

  -- Match #1: order number / invoice (always needed to locate, count as 1)
  matches := 1;

  -- Match #2: email
  IF email_in IS NOT NULL AND lower(coalesce(o.customer_email,'')) = email_in THEN
    matches := matches + 1;
  END IF;

  -- Match #3: phone (compare last 8 digits, ignore formatting)
  order_phone := regexp_replace(coalesce(o.billing_address->>'phone',''), '\D', '', 'g');
  IF length(phone_in) >= 6 AND length(order_phone) >= 6
     AND right(order_phone, 8) = right(phone_in, 8) THEN
    matches := matches + 1;
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
    'matches', matches
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_order_to_account(text, text, text) TO authenticated;

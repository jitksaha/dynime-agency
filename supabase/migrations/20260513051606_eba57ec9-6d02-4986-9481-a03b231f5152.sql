
-- 1) Trigger: when a profile's email changes, attach any unlinked orders
--    that match the new email.
CREATE OR REPLACE FUNCTION public.relink_orders_on_profile_email_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND lower(coalesce(OLD.email,'')) = lower(coalesce(NEW.email,'')) THEN
    RETURN NEW;
  END IF;

  UPDATE public.orders
     SET user_id = NEW.id,
         updated_at = now()
   WHERE user_id IS NULL
     AND lower(customer_email) = lower(NEW.email);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_relink_orders_on_profile_email_change ON public.profiles;
CREATE TRIGGER trg_relink_orders_on_profile_email_change
AFTER INSERT OR UPDATE OF email ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.relink_orders_on_profile_email_change();

-- 2) Helper RPC the client calls after Supabase Auth confirms a new email.
--    It updates the caller's profile.email to match their verified auth
--    email, which fires the trigger above and relinks matching orders.
CREATE OR REPLACE FUNCTION public.sync_my_profile_email()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  uemail text := auth.jwt() ->> 'email';
  relinked int := 0;
BEGIN
  IF uid IS NULL OR uemail IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.profiles (id, email)
  VALUES (uid, uemail)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = now()
    WHERE public.profiles.email IS DISTINCT FROM EXCLUDED.email;

  -- Defensive: also relink here in case the trigger was a no-op
  -- (e.g. profile already had this email from a prior sync).
  WITH upd AS (
    UPDATE public.orders
       SET user_id = uid, updated_at = now()
     WHERE user_id IS NULL
       AND lower(customer_email) = lower(uemail)
    RETURNING 1
  )
  SELECT count(*) INTO relinked FROM upd;

  RETURN jsonb_build_object('ok', true, 'email', uemail, 'relinked_orders', relinked);
END;
$$;

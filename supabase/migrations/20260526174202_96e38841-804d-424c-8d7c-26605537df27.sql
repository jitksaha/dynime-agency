
ALTER TABLE public.flexpay_credit_applications
  ADD COLUMN IF NOT EXISTS reference_no text UNIQUE;

CREATE OR REPLACE FUNCTION public.flexpay_generate_app_reference()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  yr text := to_char(now(), 'YYYY');
  candidate text;
  exists_already boolean;
  attempts integer := 0;
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i integer;
  suffix text;
  rb bytea;
BEGIN
  LOOP
    attempts := attempts + 1;
    rb := extensions.gen_random_bytes(6);
    suffix := '';
    FOR i IN 1..6 LOOP
      suffix := suffix || substr(alphabet, (get_byte(rb, i-1) % length(alphabet)) + 1, 1);
    END LOOP;
    candidate := 'FLX-' || yr || '-' || suffix;
    SELECT EXISTS(SELECT 1 FROM public.flexpay_credit_applications WHERE reference_no = candidate) INTO exists_already;
    EXIT WHEN NOT exists_already;
    IF attempts > 25 THEN RAISE EXCEPTION 'Could not generate unique reference'; END IF;
  END LOOP;
  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.flexpay_set_app_reference_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.reference_no IS NULL OR NEW.reference_no = '' THEN
    NEW.reference_no := public.flexpay_generate_app_reference();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_flexpay_app_reference ON public.flexpay_credit_applications;
CREATE TRIGGER trg_flexpay_app_reference
  BEFORE INSERT ON public.flexpay_credit_applications
  FOR EACH ROW EXECUTE FUNCTION public.flexpay_set_app_reference_trg();

UPDATE public.flexpay_credit_applications
   SET reference_no = public.flexpay_generate_app_reference()
 WHERE reference_no IS NULL;

REVOKE EXECUTE ON FUNCTION public.flexpay_generate_app_reference() FROM PUBLIC, anon;


CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.flexpay_generate_card_number(_bin text DEFAULT '454500', _length integer DEFAULT 16)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  body_len integer;
  random_part text;
  base text;
  candidate text;
  exists_already boolean;
  attempts integer := 0;
  rb bytea;
  i integer;
BEGIN
  body_len := _length - length(_bin) - 1;
  IF body_len < 4 THEN
    RAISE EXCEPTION 'BIN too long for card length';
  END IF;

  LOOP
    attempts := attempts + 1;
    rb := extensions.gen_random_bytes(body_len);
    random_part := '';
    FOR i IN 1..body_len LOOP
      random_part := random_part || ((get_byte(rb, i - 1) % 10))::text;
    END LOOP;
    base := _bin || random_part;
    candidate := base || flexpay_luhn_checksum(base)::text;

    SELECT EXISTS(SELECT 1 FROM public.flexpay_virtual_cards WHERE card_number = candidate) INTO exists_already;
    EXIT WHEN NOT exists_already;
    IF attempts > 25 THEN RAISE EXCEPTION 'Could not generate unique card number'; END IF;
  END LOOP;

  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.flexpay_generate_cvv(_length integer DEFAULT 3)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  rb bytea;
  cvv text;
  i integer;
  attempts integer := 0;
BEGIN
  LOOP
    attempts := attempts + 1;
    rb := extensions.gen_random_bytes(_length);
    cvv := '';
    FOR i IN 1.._length LOOP
      cvv := cvv || ((get_byte(rb, i - 1) % 10))::text;
    END LOOP;
    EXIT WHEN cvv !~ '^(.)\1+$'
          AND cvv NOT IN ('123','234','345','456','567','678','789','012','321','210','987','876','765','654','543','432','000');
    IF attempts > 25 THEN EXIT; END IF;
  END LOOP;
  RETURN cvv;
END;
$$;

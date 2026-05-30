
-- ============ FlexPay Virtual Cards ============

-- 1. Settings additions
ALTER TABLE public.flexpay_settings
  ADD COLUMN IF NOT EXISTS card_bin_prefix text NOT NULL DEFAULT '545872',
  ADD COLUMN IF NOT EXISTS card_length integer NOT NULL DEFAULT 16,
  ADD COLUMN IF NOT EXISTS card_expiry_months integer NOT NULL DEFAULT 36,
  ADD COLUMN IF NOT EXISTS card_cvv_length integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS card_max_cvv_regens integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS card_auto_issue boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS card_default_daily_limit numeric(12,2) NOT NULL DEFAULT 1500,
  ADD COLUMN IF NOT EXISTS card_default_weekly_limit numeric(12,2) NOT NULL DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS card_default_monthly_limit numeric(12,2) NOT NULL DEFAULT 15000,
  ADD COLUMN IF NOT EXISTS card_default_per_txn_limit numeric(12,2) NOT NULL DEFAULT 2500;

-- 2. Virtual cards table
CREATE TABLE IF NOT EXISTS public.flexpay_virtual_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid NOT NULL REFERENCES public.flexpay_credit_accounts(id) ON DELETE CASCADE,
  cardholder_name text NOT NULL,
  card_number text NOT NULL UNIQUE,
  last4 text NOT NULL,
  bin text NOT NULL,
  cvv text NOT NULL,
  exp_month integer NOT NULL,
  exp_year integer NOT NULL,
  status text NOT NULL DEFAULT 'active', -- active | frozen | suspended | expired | closed | replaced
  theme text NOT NULL DEFAULT 'dynime_blue', -- dynime_blue | black_metal | platinum | gold | enterprise
  tier text NOT NULL DEFAULT 'silver', -- silver | gold | platinum | enterprise
  daily_limit numeric(12,2) NOT NULL DEFAULT 1500,
  weekly_limit numeric(12,2) NOT NULL DEFAULT 5000,
  monthly_limit numeric(12,2) NOT NULL DEFAULT 15000,
  per_txn_limit numeric(12,2) NOT NULL DEFAULT 2500,
  failed_attempts integer NOT NULL DEFAULT 0,
  cvv_regen_count integer NOT NULL DEFAULT 0,
  last_seen_ip text,
  issued_at timestamptz NOT NULL DEFAULT now(),
  frozen_at timestamptz,
  closed_at timestamptz,
  replaced_card_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.flexpay_virtual_cards TO authenticated;
GRANT ALL ON public.flexpay_virtual_cards TO service_role;

ALTER TABLE public.flexpay_virtual_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "flexpay_cards_owner_read" ON public.flexpay_virtual_cards
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "flexpay_cards_admin_all" ON public.flexpay_virtual_cards
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_flexpay_cards_updated BEFORE UPDATE ON public.flexpay_virtual_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_flexpay_cards_user ON public.flexpay_virtual_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_flexpay_cards_status ON public.flexpay_virtual_cards(status);

-- 3. Card audit log
CREATE TABLE IF NOT EXISTS public.flexpay_card_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid REFERENCES public.flexpay_virtual_cards(id) ON DELETE CASCADE,
  user_id uuid,
  actor_id uuid,
  actor_role text,
  action text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.flexpay_card_audit_logs TO authenticated;
GRANT ALL ON public.flexpay_card_audit_logs TO service_role;

ALTER TABLE public.flexpay_card_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "flexpay_card_audit_owner_read" ON public.flexpay_card_audit_logs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "flexpay_card_audit_admin_all" ON public.flexpay_card_audit_logs
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 4. Luhn checksum helper
CREATE OR REPLACE FUNCTION public.flexpay_luhn_checksum(_digits text)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  i integer;
  d integer;
  sum integer := 0;
  alt boolean := true;
BEGIN
  FOR i IN REVERSE length(_digits)..1 LOOP
    d := substring(_digits FROM i FOR 1)::integer;
    IF alt THEN
      d := d * 2;
      IF d > 9 THEN d := d - 9; END IF;
    END IF;
    sum := sum + d;
    alt := NOT alt;
  END LOOP;
  RETURN (10 - (sum % 10)) % 10;
END;
$$;

-- 5. Generate cryptographically random Luhn-valid unique card number
CREATE OR REPLACE FUNCTION public.flexpay_generate_card_number(_bin text DEFAULT '545872', _length integer DEFAULT 16)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  body_len := _length - length(_bin) - 1; -- minus check digit
  IF body_len < 4 THEN
    RAISE EXCEPTION 'BIN too long for card length';
  END IF;

  LOOP
    attempts := attempts + 1;
    -- secure random digits via gen_random_bytes
    rb := gen_random_bytes(body_len);
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

-- 6. Generate secure CVV (avoids trivial sequences)
CREATE OR REPLACE FUNCTION public.flexpay_generate_cvv(_length integer DEFAULT 3)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rb bytea;
  cvv text;
  i integer;
  attempts integer := 0;
BEGIN
  LOOP
    attempts := attempts + 1;
    rb := gen_random_bytes(_length);
    cvv := '';
    FOR i IN 1.._length LOOP
      cvv := cvv || ((get_byte(rb, i - 1) % 10))::text;
    END LOOP;
    -- avoid all-same and trivial sequences
    EXIT WHEN cvv !~ '^(.)\1+$'
          AND cvv NOT IN ('123','234','345','456','567','678','789','012','321','210','987','876','765','654','543','432','000');
    IF attempts > 25 THEN EXIT; END IF;
  END LOOP;
  RETURN cvv;
END;
$$;

-- 7. Issue card for a given credit account (idempotent: returns existing active card if any)
CREATE OR REPLACE FUNCTION public.flexpay_issue_virtual_card(_account_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  acct record;
  s record;
  app record;
  existing_id uuid;
  new_id uuid;
  card_no text;
  cvv text;
  exp_m integer;
  exp_y integer;
  holder text;
  total numeric;
  tier_name text;
  theme_name text;
BEGIN
  SELECT * INTO acct FROM public.flexpay_credit_accounts WHERE id = _account_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Account not found'; END IF;

  -- Return existing active/frozen card if present
  SELECT id INTO existing_id FROM public.flexpay_virtual_cards
   WHERE account_id = _account_id AND status IN ('active','frozen') LIMIT 1;
  IF existing_id IS NOT NULL THEN RETURN existing_id; END IF;

  SELECT * INTO s FROM public.flexpay_settings WHERE id = 1;

  -- Cardholder name: latest approved application full_name, fallback to email local-part
  SELECT * INTO app FROM public.flexpay_credit_applications
   WHERE (user_id = acct.user_id OR lower(email) = lower(acct.email))
   ORDER BY created_at DESC LIMIT 1;
  holder := upper(coalesce(app.full_name, split_part(acct.email,'@',1)));

  card_no := public.flexpay_generate_card_number(s.card_bin_prefix, s.card_length);
  cvv := public.flexpay_generate_cvv(s.card_cvv_length);

  exp_m := EXTRACT(MONTH FROM (now() + (s.card_expiry_months || ' months')::interval))::integer;
  exp_y := EXTRACT(YEAR  FROM (now() + (s.card_expiry_months || ' months')::interval))::integer;

  -- Tier from total limit
  total := coalesce(acct.total_limit, 0);
  IF total <= 2000 THEN tier_name := 'silver'; theme_name := 'dynime_blue';
  ELSIF total <= 10000 THEN tier_name := 'gold'; theme_name := 'gold';
  ELSIF total <= 50000 THEN tier_name := 'platinum'; theme_name := 'platinum';
  ELSE tier_name := 'enterprise'; theme_name := 'black_metal';
  END IF;

  INSERT INTO public.flexpay_virtual_cards (
    user_id, account_id, cardholder_name, card_number, last4, bin, cvv,
    exp_month, exp_year, status, theme, tier,
    daily_limit, weekly_limit, monthly_limit, per_txn_limit
  ) VALUES (
    acct.user_id, acct.id, holder, card_no, right(card_no,4), s.card_bin_prefix, cvv,
    exp_m, exp_y, 'active', theme_name, tier_name,
    s.card_default_daily_limit, s.card_default_weekly_limit, s.card_default_monthly_limit, s.card_default_per_txn_limit
  ) RETURNING id INTO new_id;

  INSERT INTO public.flexpay_card_audit_logs (card_id, user_id, actor_id, actor_role, action, metadata)
  VALUES (new_id, acct.user_id, auth.uid(), 'system', 'card_issued', jsonb_build_object('account_id', acct.id, 'tier', tier_name));

  RETURN new_id;
END;
$$;

-- 8. Trigger: auto-issue on credit account becoming active
CREATE OR REPLACE FUNCTION public.flexpay_auto_issue_card_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s record;
BEGIN
  SELECT card_auto_issue INTO s FROM public.flexpay_settings WHERE id = 1;
  IF s IS NULL OR NOT s.card_auto_issue THEN RETURN NEW; END IF;
  IF NEW.status = 'active' THEN
    PERFORM public.flexpay_issue_virtual_card(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_flexpay_acct_autoissue_ins ON public.flexpay_credit_accounts;
CREATE TRIGGER trg_flexpay_acct_autoissue_ins
  AFTER INSERT ON public.flexpay_credit_accounts
  FOR EACH ROW EXECUTE FUNCTION public.flexpay_auto_issue_card_trg();

DROP TRIGGER IF EXISTS trg_flexpay_acct_autoissue_upd ON public.flexpay_credit_accounts;
CREATE TRIGGER trg_flexpay_acct_autoissue_upd
  AFTER UPDATE OF status ON public.flexpay_credit_accounts
  FOR EACH ROW WHEN (NEW.status = 'active' AND (OLD.status IS DISTINCT FROM NEW.status))
  EXECUTE FUNCTION public.flexpay_auto_issue_card_trg();

-- 9. Customer self-service: freeze / unfreeze
CREATE OR REPLACE FUNCTION public.flexpay_set_card_freeze(_card_id uuid, _freeze boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c record;
BEGIN
  SELECT * INTO c FROM public.flexpay_virtual_cards WHERE id = _card_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Card not found'; END IF;
  IF c.user_id <> auth.uid() AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  IF c.status NOT IN ('active','frozen') THEN
    RAISE EXCEPTION 'Card cannot be toggled in status %', c.status;
  END IF;

  UPDATE public.flexpay_virtual_cards
     SET status = CASE WHEN _freeze THEN 'frozen' ELSE 'active' END,
         frozen_at = CASE WHEN _freeze THEN now() ELSE NULL END
   WHERE id = _card_id;

  INSERT INTO public.flexpay_card_audit_logs (card_id, user_id, actor_id, actor_role, action)
  VALUES (_card_id, c.user_id, auth.uid(), CASE WHEN public.is_admin(auth.uid()) THEN 'admin' ELSE 'customer' END,
          CASE WHEN _freeze THEN 'card_frozen' ELSE 'card_unfrozen' END);
END;
$$;

-- 10. Customer self-service: log CVV view
CREATE OR REPLACE FUNCTION public.flexpay_log_cvv_view(_card_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c record;
BEGIN
  SELECT * INTO c FROM public.flexpay_virtual_cards WHERE id = _card_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Card not found'; END IF;
  IF c.user_id <> auth.uid() AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  INSERT INTO public.flexpay_card_audit_logs (card_id, user_id, actor_id, actor_role, action)
  VALUES (_card_id, c.user_id, auth.uid(),
          CASE WHEN public.is_admin(auth.uid()) THEN 'admin' ELSE 'customer' END, 'cvv_viewed');
END;
$$;

-- 11. Admin: reissue card
CREATE OR REPLACE FUNCTION public.flexpay_reissue_card(_card_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c record;
  new_id uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Admin only'; END IF;
  SELECT * INTO c FROM public.flexpay_virtual_cards WHERE id = _card_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Card not found'; END IF;

  UPDATE public.flexpay_virtual_cards
     SET status = 'replaced', closed_at = now()
   WHERE id = _card_id;

  new_id := public.flexpay_issue_virtual_card(c.account_id);

  UPDATE public.flexpay_virtual_cards SET replaced_card_id = _card_id WHERE id = new_id;

  INSERT INTO public.flexpay_card_audit_logs (card_id, user_id, actor_id, actor_role, action, metadata)
  VALUES (_card_id, c.user_id, auth.uid(), 'admin', 'card_reissued', jsonb_build_object('new_card_id', new_id));
  RETURN new_id;
END;
$$;

-- 12. Backfill: issue cards for already-active accounts
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.flexpay_credit_accounts WHERE status = 'active' LOOP
    BEGIN
      PERFORM public.flexpay_issue_virtual_card(r.id);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $$;

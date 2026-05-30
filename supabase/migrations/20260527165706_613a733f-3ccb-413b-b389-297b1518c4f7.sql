
-- 1. FlexPay credit applications: tighten INSERT
DROP POLICY IF EXISTS "flexpay_apps_insert" ON public.flexpay_credit_applications;
CREATE POLICY "flexpay_apps_insert" ON public.flexpay_credit_applications
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    status = 'pending'
    AND requested_limit > 0
    AND length(coalesce(email, '')) > 3
    AND (
      (auth.uid() IS NULL AND user_id IS NULL)
      OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
    )
  );

-- 2. FlexPay KYC: prevent users from changing status/scoring fields via a trigger
CREATE OR REPLACE FUNCTION public.flexpay_kyc_block_sensitive_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  -- non-admins can only touch document upload fields; preserve everything else
  NEW.identity_status   := OLD.identity_status;
  NEW.address_status    := OLD.address_status;
  NEW.face_status       := OLD.face_status;
  NEW.risk_status       := OLD.risk_status;
  NEW.match_score       := OLD.match_score;
  NEW.fraud_signals     := OLD.fraud_signals;
  NEW.provider_payload  := OLD.provider_payload;
  NEW.provider          := OLD.provider;
  NEW.token             := OLD.token;
  NEW.user_id           := OLD.user_id;
  NEW.application_id    := OLD.application_id;
  NEW.completed_at      := OLD.completed_at;
  NEW.expires_at        := OLD.expires_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_flexpay_kyc_block_sensitive ON public.flexpay_kyc_verifications;
CREATE TRIGGER trg_flexpay_kyc_block_sensitive
  BEFORE UPDATE ON public.flexpay_kyc_verifications
  FOR EACH ROW EXECUTE FUNCTION public.flexpay_kyc_block_sensitive_changes();

-- 3. FlexPay virtual cards: revoke full PAN/CVV from API readers
REVOKE SELECT ON public.flexpay_virtual_cards FROM authenticated;
GRANT SELECT (
  id, user_id, account_id, cardholder_name, last4, bin,
  exp_month, exp_year, status, theme, tier,
  daily_limit, weekly_limit, monthly_limit, per_txn_limit,
  failed_attempts, cvv_regen_count, last_seen_ip,
  issued_at, frozen_at, closed_at, replaced_card_id, notes,
  created_at, updated_at
) ON public.flexpay_virtual_cards TO authenticated;

-- 4. Remove PII-bearing tables from the public realtime publication
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'form_submissions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.form_submissions';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'email_send_log'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.email_send_log';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'suppressed_emails'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.suppressed_emails';
  END IF;
END$$;

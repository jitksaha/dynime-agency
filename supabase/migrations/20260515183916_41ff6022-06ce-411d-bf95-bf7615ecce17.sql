ALTER TABLE public.id_card_assignments
  ADD COLUMN IF NOT EXISTS qr_payload jsonb,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz;
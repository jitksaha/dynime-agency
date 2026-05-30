-- Normalize card_id format: drop the hyphen so DTL-E983783 → DTLE983783.
-- Update the locked qr_payload `id` field in lockstep so verify QR data stays consistent.
UPDATE public.id_card_assignments
SET qr_payload = jsonb_set(qr_payload, '{id}', to_jsonb(REPLACE(qr_payload->>'id', '-', '')))
WHERE qr_payload IS NOT NULL
  AND qr_payload ? 'id'
  AND qr_payload->>'id' LIKE '%-%';

UPDATE public.id_card_assignments
SET card_id = REPLACE(card_id, '-', '')
WHERE card_id LIKE '%-%';
UPDATE public.flexpay_settings
SET tenure_fee_tiers = '[{"tenure":3,"fee_percent":0},{"tenure":6,"fee_percent":0},{"tenure":9,"fee_percent":1},{"tenure":12,"fee_percent":2},{"tenure":24,"fee_percent":3},{"tenure":36,"fee_percent":5}]'::jsonb
WHERE id = 1;
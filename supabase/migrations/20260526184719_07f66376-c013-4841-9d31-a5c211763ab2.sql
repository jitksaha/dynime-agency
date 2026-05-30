UPDATE public.flexpay_settings
SET tenure_fee_tiers = '[
  {"tenure":3,"fee_percent":0},
  {"tenure":6,"fee_percent":0},
  {"tenure":9,"fee_percent":1},
  {"tenure":12,"fee_percent":2},
  {"tenure":18,"fee_percent":2},
  {"tenure":24,"fee_percent":3},
  {"tenure":36,"fee_percent":5}
]'::jsonb,
allowed_tenures = ARRAY[3,6,9,12,18,24,36];

UPDATE public.flexpay_credit_accounts
SET max_tenure_months = 36
WHERE max_tenure_months < 36;

ALTER TABLE public.flexpay_credit_accounts
ALTER COLUMN max_tenure_months SET DEFAULT 36;
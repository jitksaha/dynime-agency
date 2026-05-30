ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_gateway text;
UPDATE public.orders SET payment_gateway = CASE
  WHEN payment_gateway IS NOT NULL THEN payment_gateway
  WHEN stripe_session_id LIKE 'cs_%' THEN 'stripe'
  WHEN stripe_session_id LIKE 'bt_%' THEN 'bank_transfer'
  WHEN stripe_session_id LIKE 'TR%' THEN 'sslcommerz'
  WHEN stripe_session_id ~ '^[A-Z0-9]{10,}$' THEN 'bkash'
  ELSE NULL
END
WHERE payment_gateway IS NULL;
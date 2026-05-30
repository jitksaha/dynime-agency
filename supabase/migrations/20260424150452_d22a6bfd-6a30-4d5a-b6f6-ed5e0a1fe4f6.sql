DELETE FROM public.site_settings
WHERE key LIKE 'stripe_%'
   OR key LIKE 'sslcommerz_%'
   OR key LIKE 'bkash_%'
   OR key LIKE 'dodopayment_%'
   OR key LIKE 'bank_transfer_%'
   OR key LIKE 'payment_%'
   OR key = 'payment_gateway_order';
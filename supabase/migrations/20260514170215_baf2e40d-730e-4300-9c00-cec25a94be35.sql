UPDATE public.product_urls
   SET key = 'dshg',
       label = 'Dynime Self-Hosted Payment Gateway',
       description = COALESCE(description, 'Open-source self-hosted payment gateway (formerly PayOSS).'),
       updated_at = now()
 WHERE key = 'payoss';

UPDATE public.product_urls
   SET label = 'Dynime Business Manager',
       description = COALESCE(description, 'All-in-one business platform: HRM, CRM, Accounting, Projects, Inventory, POS & more.'),
       updated_at = now()
 WHERE key = 'dbm';

-- 1) Mark all historical DYN-* orders as completed
ALTER TABLE public.orders DISABLE TRIGGER USER;

UPDATE public.orders
   SET status = 'completed',
       updated_at = now()
 WHERE invoice_number LIKE 'DYN-%';

-- 2) Flip ~1% to cancelled at random
WITH picks AS (
  SELECT id FROM public.orders
   WHERE invoice_number LIKE 'DYN-%'
   ORDER BY random()
   LIMIT GREATEST(1, (SELECT count(*) FROM public.orders WHERE invoice_number LIKE 'DYN-%')::int / 100)
)
UPDATE public.orders o
   SET status = 'cancelled', updated_at = now()
  FROM picks
 WHERE o.id = picks.id;

ALTER TABLE public.orders ENABLE TRIGGER USER;

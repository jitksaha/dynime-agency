UPDATE public.country_eligibility
SET status='eligible',
    category='Eligible',
    reason='No restriction detected — we can offer our services, software and partnerships.'
WHERE lower(name)='bangladesh';
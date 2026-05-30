CREATE UNIQUE INDEX IF NOT EXISTS crm_leads_phone_unique_idx
ON public.crm_leads ((regexp_replace(phone, '\D', '', 'g')))
WHERE phone IS NOT NULL AND phone <> '';
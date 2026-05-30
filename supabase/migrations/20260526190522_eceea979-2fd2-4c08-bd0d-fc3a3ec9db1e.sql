-- Delete the orphan EMI plan installments and plan, then restore the credit.
DELETE FROM public.flexpay_emi_installments
WHERE plan_id = 'fae62e00-2ddf-47f9-9f58-e5f52e8501e7';

DELETE FROM public.flexpay_emi_plans
WHERE id = 'fae62e00-2ddf-47f9-9f58-e5f52e8501e7';

UPDATE public.flexpay_credit_accounts
SET used_limit = 0, updated_at = now()
WHERE id = 'b274ccdd-8c13-4ee2-bbcf-da10ed352f12';
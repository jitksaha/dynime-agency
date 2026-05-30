CREATE OR REPLACE FUNCTION public.recompute_crm_lead_scores()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE n integer;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'hr')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.crm_leads SET updated_at = updated_at;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.recompute_crm_lead_scores() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recompute_crm_lead_scores() TO authenticated;
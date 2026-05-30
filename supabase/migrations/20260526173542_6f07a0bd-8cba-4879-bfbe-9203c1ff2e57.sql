
ALTER FUNCTION public.flexpay_luhn_checksum(text) SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.flexpay_generate_card_number(text, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.flexpay_generate_cvv(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.flexpay_issue_virtual_card(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.flexpay_set_card_freeze(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.flexpay_log_cvv_view(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.flexpay_reissue_card(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.flexpay_set_card_freeze(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.flexpay_log_cvv_view(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.flexpay_reissue_card(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.flexpay_issue_virtual_card(uuid) TO authenticated;

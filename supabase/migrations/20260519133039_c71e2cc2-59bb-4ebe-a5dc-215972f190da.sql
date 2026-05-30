CREATE OR REPLACE FUNCTION public.dynime_reset_tables()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'dynime_company_master','dynime_departments','dynime_employees','dynime_payroll',
    'dynime_clients','dynime_orders','dynime_invoices','dynime_payment_transactions',
    'dynime_saas_subscriptions','dynime_vendors','dynime_expenses','dynime_pnl_monthly',
    'dynime_cashflow_monthly','dynime_revenue_by_service','dynime_tax_compliance',
    'dynime_kpi_monthly','dynime_sales_team_performance','dynime_leave_records',
    'dynime_recruitment_history','dynime_marketing_campaigns','dynime_expansion_timeline',
    'dynime_country_distribution','dynime_recurring_clients','dynime_annual_growth_analytics'
  ];
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('TRUNCATE TABLE public.%I', t);
  END LOOP;
  RETURN jsonb_build_object('ok', true, 'truncated', tables);
END;
$$;

REVOKE ALL ON FUNCTION public.dynime_reset_tables() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dynime_reset_tables() TO authenticated, service_role;
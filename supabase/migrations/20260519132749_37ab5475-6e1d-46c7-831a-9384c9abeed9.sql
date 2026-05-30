CREATE TABLE IF NOT EXISTS public.dynime_company_master (company_id TEXT, legal_name TEXT, trade_name TEXT, founded TEXT, ceo TEXT, cfo TEXT, cto TEXT, hq_country TEXT, hq_address TEXT, registered_offices TEXT, tax_id_bd TEXT, vat_uk TEXT, ein_us TEXT, industry TEXT, website TEXT, support_email TEXT, billing_email TEXT, fiscal_year_start TEXT, reporting_currency TEXT, bankers TEXT, auditor TEXT);
ALTER TABLE public.dynime_company_master ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read dynime_company_master" ON public.dynime_company_master;
CREATE POLICY "Admins read dynime_company_master" ON public.dynime_company_master FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.dynime_departments (dept_id TEXT, department TEXT, head_count_2026q2 BIGINT, junior_share NUMERIC(18,4), mid_share NUMERIC(18,4), senior_share NUMERIC(18,4), lead_share NUMERIC(18,4), salary_junior_usd BIGINT, salary_mid_usd BIGINT, salary_senior_usd BIGINT, salary_lead_usd BIGINT);
ALTER TABLE public.dynime_departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read dynime_departments" ON public.dynime_departments;
CREATE POLICY "Admins read dynime_departments" ON public.dynime_departments FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.dynime_employees (employee_id TEXT, full_name TEXT, email TEXT, gender TEXT, dob TEXT, phone TEXT, department TEXT, designation TEXT, seniority TEXT, employment_type TEXT, country TEXT, country_iso TEXT, currency TEXT, work_location TEXT, hire_date TEXT, annual_salary_usd BIGINT, monthly_gross_usd NUMERIC(18,4), status TEXT, exit_date TEXT, exit_reason TEXT, manager_id TEXT);
ALTER TABLE public.dynime_employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read dynime_employees" ON public.dynime_employees;
CREATE POLICY "Admins read dynime_employees" ON public.dynime_employees FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.dynime_payroll (payroll_id TEXT, employee_id TEXT, employee_name TEXT, department TEXT, country TEXT, pay_period TEXT, basic_usd NUMERIC(18,4), housing_allow_usd NUMERIC(18,4), transport_allow_usd NUMERIC(18,4), medical_allow_usd NUMERIC(18,4), other_allow_usd NUMERIC(18,4), bonus_usd NUMERIC(18,4), incentive_usd NUMERIC(18,4), overtime_usd NUMERIC(18,4), gross_usd NUMERIC(18,4), pf_usd NUMERIC(18,4), insurance_usd NUMERIC(18,4), loan_usd NUMERIC(18,4), total_deductions_usd NUMERIC(18,4), taxable_income_usd NUMERIC(18,4), tax_usd NUMERIC(18,4), net_pay_usd NUMERIC(18,4), currency TEXT, status TEXT, paid_on TEXT);
ALTER TABLE public.dynime_payroll ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read dynime_payroll" ON public.dynime_payroll;
CREATE POLICY "Admins read dynime_payroll" ON public.dynime_payroll FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.dynime_clients (client_id TEXT, company_name TEXT, industry TEXT, segment TEXT, country TEXT, country_iso TEXT, currency TEXT, primary_contact TEXT, contact_role TEXT, email TEXT, phone TEXT, website TEXT, lead_source TEXT, signup_date TEXT, lifecycle_stage TEXT, account_manager_id TEXT, status TEXT, churned_date TEXT, lifetime_value_usd NUMERIC(18,4));
ALTER TABLE public.dynime_clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read dynime_clients" ON public.dynime_clients;
CREATE POLICY "Admins read dynime_clients" ON public.dynime_clients FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.dynime_orders (order_id TEXT, client_id TEXT, client_name TEXT, project_name TEXT, service_code TEXT, service_name TEXT, order_date TEXT, estimated_delivery TEXT, duration_days BIGINT, currency TEXT, contract_value_usd NUMERIC(18,4), status TEXT, owner_employee_id TEXT, country TEXT);
ALTER TABLE public.dynime_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read dynime_orders" ON public.dynime_orders;
CREATE POLICY "Admins read dynime_orders" ON public.dynime_orders FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.dynime_invoices (invoice_id TEXT, invoice_number TEXT, order_id TEXT, client_id TEXT, client_name TEXT, issue_date TEXT, due_date TEXT, subtotal_usd NUMERIC(18,4), tax_rate NUMERIC(18,4), tax_amount_usd NUMERIC(18,4), total_usd NUMERIC(18,4), currency TEXT, status TEXT, payment_terms TEXT, milestone TEXT);
ALTER TABLE public.dynime_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read dynime_invoices" ON public.dynime_invoices;
CREATE POLICY "Admins read dynime_invoices" ON public.dynime_invoices FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.dynime_payment_transactions (payment_id TEXT, invoice_id TEXT, client_id TEXT, paid_on TEXT, amount_usd NUMERIC(18,4), method TEXT, txn_reference TEXT, status TEXT, gateway_fee_usd NUMERIC(18,4));
ALTER TABLE public.dynime_payment_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read dynime_payment_transactions" ON public.dynime_payment_transactions;
CREATE POLICY "Admins read dynime_payment_transactions" ON public.dynime_payment_transactions FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.dynime_saas_subscriptions (subscription_id TEXT, client_id TEXT, product_code TEXT, product_name TEXT, plan_name TEXT, billing_cycle TEXT, unit_price_usd NUMERIC(18,4), seats BIGINT, mrr_usd NUMERIC(18,4), arr_usd NUMERIC(18,4), start_date TEXT, end_date TEXT, status TEXT, currency TEXT, auto_renew BOOLEAN);
ALTER TABLE public.dynime_saas_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read dynime_saas_subscriptions" ON public.dynime_saas_subscriptions;
CREATE POLICY "Admins read dynime_saas_subscriptions" ON public.dynime_saas_subscriptions FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.dynime_subscription_billing (billing_id TEXT, subscription_id TEXT, client_id TEXT, period_start TEXT, period_end TEXT, amount_usd NUMERIC(18,4), currency TEXT, status TEXT, invoice_no TEXT);
ALTER TABLE public.dynime_subscription_billing ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read dynime_subscription_billing" ON public.dynime_subscription_billing;
CREATE POLICY "Admins read dynime_subscription_billing" ON public.dynime_subscription_billing FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.dynime_vendors (vendor_id TEXT, vendor_code TEXT, vendor_name TEXT, category TEXT, country TEXT, payment_terms TEXT, currency TEXT, active_since TEXT, status TEXT);
ALTER TABLE public.dynime_vendors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read dynime_vendors" ON public.dynime_vendors;
CREATE POLICY "Admins read dynime_vendors" ON public.dynime_vendors FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.dynime_expenses (expense_id TEXT, period TEXT, category TEXT, vendor_id TEXT, amount_usd NUMERIC(18,4), currency TEXT, status TEXT, description TEXT);
ALTER TABLE public.dynime_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read dynime_expenses" ON public.dynime_expenses;
CREATE POLICY "Admins read dynime_expenses" ON public.dynime_expenses FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.dynime_pnl_monthly (period TEXT, revenue_usd NUMERIC(18,4), cogs_usd NUMERIC(18,4), gross_profit_usd NUMERIC(18,4), operating_expenses_usd NUMERIC(18,4), ebitda_usd NUMERIC(18,4), depreciation_usd NUMERIC(18,4), ebit_usd NUMERIC(18,4), tax_usd NUMERIC(18,4), net_income_usd NUMERIC(18,4), net_margin_pct NUMERIC(18,4));
ALTER TABLE public.dynime_pnl_monthly ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read dynime_pnl_monthly" ON public.dynime_pnl_monthly;
CREATE POLICY "Admins read dynime_pnl_monthly" ON public.dynime_pnl_monthly FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.dynime_cashflow_monthly (period TEXT, cash_in_usd NUMERIC(18,4), cash_out_usd NUMERIC(18,4), net_cashflow_usd NUMERIC(18,4), cash_balance_usd NUMERIC(18,4));
ALTER TABLE public.dynime_cashflow_monthly ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read dynime_cashflow_monthly" ON public.dynime_cashflow_monthly;
CREATE POLICY "Admins read dynime_cashflow_monthly" ON public.dynime_cashflow_monthly FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.dynime_revenue_by_service (year BIGINT, service TEXT, revenue_usd NUMERIC(18,4), share_pct NUMERIC(18,4));
ALTER TABLE public.dynime_revenue_by_service ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read dynime_revenue_by_service" ON public.dynime_revenue_by_service;
CREATE POLICY "Admins read dynime_revenue_by_service" ON public.dynime_revenue_by_service FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.dynime_tax_compliance (filing_id TEXT, fiscal_year BIGINT, jurisdiction TEXT, tax_type TEXT, rate_pct NUMERIC(18,4), registration_no TEXT, taxable_revenue_usd NUMERIC(18,4), tax_liability_usd NUMERIC(18,4), filed_on TEXT, status TEXT);
ALTER TABLE public.dynime_tax_compliance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read dynime_tax_compliance" ON public.dynime_tax_compliance;
CREATE POLICY "Admins read dynime_tax_compliance" ON public.dynime_tax_compliance FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.dynime_kpi_monthly (period TEXT, revenue_usd NUMERIC(18,4), net_income_usd NUMERIC(18,4), active_clients BIGINT, active_subscriptions BIGINT, mrr_usd NUMERIC(18,4), arr_usd NUMERIC(18,4), headcount BIGINT, gross_margin_pct NUMERIC(18,4), nps_score NUMERIC(18,4), churn_rate_pct NUMERIC(18,4));
ALTER TABLE public.dynime_kpi_monthly ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read dynime_kpi_monthly" ON public.dynime_kpi_monthly;
CREATE POLICY "Admins read dynime_kpi_monthly" ON public.dynime_kpi_monthly FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.dynime_sales_team_performance (period TEXT, employee_id TEXT, leads_assigned BIGINT, leads_qualified BIGINT, deals_won BIGINT, revenue_generated_usd NUMERIC(18,4), quota_attainment_pct NUMERIC(18,4));
ALTER TABLE public.dynime_sales_team_performance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read dynime_sales_team_performance" ON public.dynime_sales_team_performance;
CREATE POLICY "Admins read dynime_sales_team_performance" ON public.dynime_sales_team_performance FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.dynime_support_tickets (ticket_id TEXT, client_id TEXT, subject TEXT, channel TEXT, priority TEXT, status TEXT, opened_at TEXT, resolved_at TEXT, first_response_minutes BIGINT, resolution_hours NUMERIC(18,4), agent_id TEXT, satisfaction_score NUMERIC(18,4));
ALTER TABLE public.dynime_support_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read dynime_support_tickets" ON public.dynime_support_tickets;
CREATE POLICY "Admins read dynime_support_tickets" ON public.dynime_support_tickets FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.dynime_attendance (attendance_id TEXT, employee_id TEXT, work_date TEXT, clock_in TEXT, clock_out TEXT, total_minutes BIGINT, status TEXT, source TEXT);
ALTER TABLE public.dynime_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read dynime_attendance" ON public.dynime_attendance;
CREATE POLICY "Admins read dynime_attendance" ON public.dynime_attendance FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.dynime_leave_records (leave_id TEXT, employee_id TEXT, leave_type TEXT, start_date TEXT, end_date TEXT, days_count BIGINT, status TEXT, reason TEXT);
ALTER TABLE public.dynime_leave_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read dynime_leave_records" ON public.dynime_leave_records;
CREATE POLICY "Admins read dynime_leave_records" ON public.dynime_leave_records FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.dynime_recruitment_history (requisition_id TEXT, role TEXT, department TEXT, posted_on TEXT, closed_on TEXT, applicants BIGINT, shortlisted BIGINT, interviewed BIGINT, offers_made BIGINT, hired_employee_id TEXT, source TEXT, time_to_fill_days BIGINT);
ALTER TABLE public.dynime_recruitment_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read dynime_recruitment_history" ON public.dynime_recruitment_history;
CREATE POLICY "Admins read dynime_recruitment_history" ON public.dynime_recruitment_history FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.dynime_marketing_campaigns (campaign_id TEXT, name TEXT, channel TEXT, start_date TEXT, end_date TEXT, budget_usd NUMERIC(18,4), spend_usd NUMERIC(18,4), impressions BIGINT, clicks BIGINT, leads BIGINT, deals_won BIGINT, revenue_attributed_usd NUMERIC(18,4), roi_pct NUMERIC(18,4));
ALTER TABLE public.dynime_marketing_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read dynime_marketing_campaigns" ON public.dynime_marketing_campaigns;
CREATE POLICY "Admins read dynime_marketing_campaigns" ON public.dynime_marketing_campaigns FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.dynime_website_leads (lead_id TEXT, full_name TEXT, email TEXT, company TEXT, country TEXT, source TEXT, service_interest TEXT, created_at TEXT, stage TEXT, score BIGINT, assigned_to TEXT);
ALTER TABLE public.dynime_website_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read dynime_website_leads" ON public.dynime_website_leads;
CREATE POLICY "Admins read dynime_website_leads" ON public.dynime_website_leads FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.dynime_expansion_timeline (event_date TEXT, milestone TEXT, category TEXT);
ALTER TABLE public.dynime_expansion_timeline ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read dynime_expansion_timeline" ON public.dynime_expansion_timeline;
CREATE POLICY "Admins read dynime_expansion_timeline" ON public.dynime_expansion_timeline FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.dynime_country_distribution (country TEXT, active_clients BIGINT, total_revenue_usd NUMERIC(18,4), share_pct NUMERIC(18,4));
ALTER TABLE public.dynime_country_distribution ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read dynime_country_distribution" ON public.dynime_country_distribution;
CREATE POLICY "Admins read dynime_country_distribution" ON public.dynime_country_distribution FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.dynime_recurring_clients (client_id TEXT, client_name TEXT, country TEXT, segment TEXT, first_order_date TEXT, last_order_date TEXT, total_orders BIGINT, active_subscriptions BIGINT, lifetime_value_usd NUMERIC(18,4), relationship_months BIGINT);
ALTER TABLE public.dynime_recurring_clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read dynime_recurring_clients" ON public.dynime_recurring_clients;
CREATE POLICY "Admins read dynime_recurring_clients" ON public.dynime_recurring_clients FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.dynime_annual_growth_analytics (year BIGINT, revenue_usd NUMERIC(18,4), yoy_growth_pct TEXT, net_income_usd NUMERIC(18,4), headcount_eoy BIGINT, new_clients BIGINT, churned_clients BIGINT, active_subscriptions_eoy BIGINT, milestone TEXT);
ALTER TABLE public.dynime_annual_growth_analytics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read dynime_annual_growth_analytics" ON public.dynime_annual_growth_analytics;
CREATE POLICY "Admins read dynime_annual_growth_analytics" ON public.dynime_annual_growth_analytics FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
-- Drop functions
DROP FUNCTION IF EXISTS public.payroll_v2_generate_run(int,int,int,text,text,uuid[],boolean) CASCADE;
DROP FUNCTION IF EXISTS public.payroll_v2_compute_employee(uuid,int,int,int,boolean) CASCADE;
DROP FUNCTION IF EXISTS public.payroll_v2_update_item(uuid,jsonb,text) CASCADE;
DROP FUNCTION IF EXISTS public.payroll_v2_approve_run(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.payroll_v2_mark_paid(uuid,uuid[],text) CASCADE;
DROP FUNCTION IF EXISTS public.payroll_v2_reopen_run(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.payroll_v2_resolve_salary(uuid,date) CASCADE;
DROP FUNCTION IF EXISTS public.generate_payroll_run(int,int,int,text,text) CASCADE;
DROP FUNCTION IF EXISTS public.compute_employee_payroll(uuid,int,int,int) CASCADE;
DROP FUNCTION IF EXISTS public.update_payroll_item(uuid,jsonb,text) CASCADE;
DROP FUNCTION IF EXISTS public.approve_payroll_run(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.mark_payroll_run_paid(uuid,uuid[],text) CASCADE;
DROP FUNCTION IF EXISTS public.reject_payroll_run(uuid,text) CASCADE;
DROP FUNCTION IF EXISTS public.submit_payroll_for_approval(uuid) CASCADE;
DROP FUNCTION IF EXISTS public._payroll_log(uuid,uuid,text,jsonb) CASCADE;

-- Drop tables
DROP TABLE IF EXISTS public.payroll_audit_logs CASCADE;
DROP TABLE IF EXISTS public.payroll_items CASCADE;
DROP TABLE IF EXISTS public.payroll_runs CASCADE;
DROP TABLE IF EXISTS public.employee_salary_history CASCADE;
DROP TABLE IF EXISTS public.tax_brackets CASCADE;
DROP TABLE IF EXISTS public.dynime_payroll CASCADE;
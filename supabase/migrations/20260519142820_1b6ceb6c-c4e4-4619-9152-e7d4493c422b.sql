
-- Seed dynime_employees (25 employees)
INSERT INTO dynime_employees (employee_id, full_name, email, department, designation, seniority, employment_type, country, country_iso, currency, work_location, hire_date, annual_salary_usd, monthly_gross_usd, status)
SELECT
  'DYN-EMP-' || lpad(i::text, 4, '0'),
  (ARRAY['Aarav Sharma','Priya Patel','Rohan Mehta','Ananya Iyer','Vikram Singh','Neha Kapoor','Arjun Reddy','Diya Joshi','Karan Malhotra','Riya Verma','Aditya Rao','Isha Nair','Yash Gupta','Sara Khan','Devansh Bose','Meera Pillai','Kabir Shah','Tanya Desai','Rahul Menon','Pooja Banerjee','Siddharth Kumar','Nikita Roy','Aryan Chopra','Sneha Das','Manish Agarwal'])[i],
  'emp' || i || '@dynime.com',
  (ARRAY['Engineering','Design','Marketing','Sales','Operations','Support'])[1 + ((i-1) % 6)],
  (ARRAY['Engineer','Designer','Marketer','Account Exec','Coordinator','Specialist'])[1 + ((i-1) % 6)],
  (ARRAY['Junior','Mid','Senior','Lead'])[1 + ((i-1) % 4)],
  'full_time',
  'India','IN','USD','Remote',
  to_char(now() - ((600 + i*30) || ' days')::interval,'YYYY-MM-DD'),
  (18000 + (i*2300) % 72000)::bigint,
  round(((18000 + (i*2300) % 72000) / 12.0)::numeric, 2),
  'active'
FROM generate_series(1,25) AS i;

-- Seed dynime_kpi_monthly (Jan 2025 - May 2026 = 17 months)
INSERT INTO dynime_kpi_monthly (period, revenue_usd, net_income_usd, active_clients, active_subscriptions, mrr_usd, arr_usd, headcount, gross_margin_pct, nps_score, churn_rate_pct)
SELECT
  to_char(d, 'YYYY-MM'),
  round((45000 + 2200*n + (random()*8000))::numeric, 2),
  round((9000 + 600*n + (random()*3000))::numeric, 2),
  20 + n + (random()*5)::int,
  30 + n*2 + (random()*6)::int,
  round((12000 + 700*n + (random()*1500))::numeric, 2),
  round(((12000 + 700*n + (random()*1500))*12)::numeric, 2),
  18 + (n/3)::int,
  round((52 + random()*8)::numeric, 1),
  round((42 + random()*15)::numeric, 1),
  round((1.5 + random()*2)::numeric, 2)
FROM (
  SELECT generate_series(date_trunc('month','2025-01-01'::date), date_trunc('month','2026-05-01'::date), interval '1 month') AS d
) s, LATERAL (SELECT row_number() OVER (ORDER BY s.d)::int AS n) r;

-- Seed dynime_payroll: last 12 months for each employee
INSERT INTO dynime_payroll (payroll_id, employee_id, employee_name, department, country, pay_period, basic_usd, housing_allow_usd, transport_allow_usd, medical_allow_usd, other_allow_usd, bonus_usd, incentive_usd, overtime_usd, gross_usd, pf_usd, insurance_usd, loan_usd, total_deductions_usd, taxable_income_usd, tax_usd, net_pay_usd, currency, status, paid_on)
SELECT
  'PAY-' || to_char(m,'YYYYMM') || '-' || e.employee_id,
  e.employee_id, e.full_name, e.department, e.country,
  to_char(m,'YYYY-MM'),
  round((e.monthly_gross_usd*0.6)::numeric,2),
  round((e.monthly_gross_usd*0.15)::numeric,2),
  round((e.monthly_gross_usd*0.05)::numeric,2),
  round((e.monthly_gross_usd*0.05)::numeric,2),
  round((e.monthly_gross_usd*0.05)::numeric,2),
  CASE WHEN extract(month from m) IN (3,12) THEN round((e.monthly_gross_usd*0.5)::numeric,2) ELSE 0 END,
  round((random()*200)::numeric,2),
  round((random()*150)::numeric,2),
  round((e.monthly_gross_usd + (CASE WHEN extract(month from m) IN (3,12) THEN e.monthly_gross_usd*0.5 ELSE 0 END))::numeric,2),
  round((e.monthly_gross_usd*0.08)::numeric,2),
  round((e.monthly_gross_usd*0.02)::numeric,2),
  0,
  round((e.monthly_gross_usd*0.10)::numeric,2),
  round((e.monthly_gross_usd*0.90)::numeric,2),
  round((e.monthly_gross_usd*0.12)::numeric,2),
  round((e.monthly_gross_usd*0.78)::numeric,2),
  'USD','paid',
  to_char((m + interval '1 month' - interval '5 days')::date,'YYYY-MM-DD')
FROM dynime_employees e
CROSS JOIN (
  SELECT generate_series(date_trunc('month', now() - interval '11 months'), date_trunc('month', now()), interval '1 month') AS m
) months;

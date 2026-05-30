DO $$
DECLARE
  current_period date := date_trunc('month', now())::date;
  r record;
BEGIN
  -- Salary history: build believable historical salary segments from current employee salary.
  INSERT INTO public.payroll_salary_history (employee_id, effective_from, effective_to, base_salary, currency, increment_pct, reason)
  SELECT
    e.id,
    GREATEST(e.joining_date::date, make_date(2020, 1, 1)) AS effective_from,
    NULL::date AS effective_to,
    GREATEST(50, ROUND((COALESCE(e.gross_salary, 250)::numeric / (1 + LEAST(0.45, GREATEST(0, EXTRACT(year FROM age(current_period, e.joining_date::date)) * 0.055))))::numeric, 2)) AS base_salary,
    COALESCE(e.currency, 'USD') AS currency,
    NULL::numeric AS increment_pct,
    'Historical payroll bootstrap' AS reason
  FROM public.employees e
  WHERE e.status = 'active'
    AND COALESCE(e.currency, 'USD') = 'USD'
    AND e.joining_date IS NOT NULL
  ON CONFLICT (employee_id, effective_from) DO UPDATE SET
    base_salary = EXCLUDED.base_salary,
    currency = EXCLUDED.currency,
    reason = EXCLUDED.reason;

  INSERT INTO public.payroll_salary_history (employee_id, effective_from, effective_to, base_salary, currency, increment_pct, reason)
  SELECT
    e.id,
    make_date(y, 1, 1) AS effective_from,
    NULL::date AS effective_to,
    ROUND((COALESCE(e.gross_salary, 250)::numeric * (0.78 + ((y - 2020)::numeric * 0.04)))::numeric, 2) AS base_salary,
    COALESCE(e.currency, 'USD') AS currency,
    8 + ((abs(hashtext(e.id::text || y::text)) % 9)) AS increment_pct,
    'Annual increment bootstrap' AS reason
  FROM public.employees e
  CROSS JOIN generate_series(2021, EXTRACT(year FROM current_period)::int) y
  WHERE e.status = 'active'
    AND COALESCE(e.currency, 'USD') = 'USD'
    AND e.joining_date IS NOT NULL
    AND make_date(y, 1, 1) > e.joining_date::date
    AND make_date(y, 1, 1) <= current_period
  ON CONFLICT (employee_id, effective_from) DO UPDATE SET
    base_salary = EXCLUDED.base_salary,
    currency = EXCLUDED.currency,
    increment_pct = EXCLUDED.increment_pct,
    reason = EXCLUDED.reason;

  -- Keep salary history ranges non-overlapping.
  WITH ordered AS (
    SELECT id, lead(effective_from) OVER (PARTITION BY employee_id ORDER BY effective_from) AS next_from
    FROM public.payroll_salary_history
  )
  UPDATE public.payroll_salary_history h
  SET effective_to = CASE WHEN ordered.next_from IS NULL THEN NULL ELSE ordered.next_from - 1 END
  FROM ordered
  WHERE h.id = ordered.id;

  -- Payroll runs from Jan 2020 through current month only.
  INSERT INTO public.payroll_runs (period_year, period_month, currency, working_days, status, locked, totals, notes)
  SELECT
    EXTRACT(year FROM p)::int,
    EXTRACT(month FROM p)::int,
    'USD',
    (
      SELECT COUNT(*)::int
      FROM generate_series(p, (p + interval '1 month - 1 day')::date, interval '1 day') d
      WHERE EXTRACT(isodow FROM d) BETWEEN 1 AND 5
    ),
    CASE WHEN p = current_period THEN 'partial_paid' ELSE 'paid' END,
    p < current_period,
    '{}'::jsonb,
    'Historical payroll bootstrap'
  FROM generate_series(make_date(2020, 1, 1), current_period, interval '1 month') p
  ON CONFLICT (period_year, period_month, currency) DO NOTHING;

  -- Payroll items derived from real employees and salary history.
  INSERT INTO public.payroll_items (
    run_id, employee_id, employee_name, department, designation, currency,
    base_salary, allowances_total, deductions_total,
    attendance_present, attendance_absent, attendance_late, overtime_hours,
    leave_paid_days, leave_unpaid_days, prorate_factor, prorate_deduction,
    taxable_income, tax, net_pay, paid_amount, status, payment_method, paid_at, breakdown
  )
  SELECT
    pr.id,
    e.id,
    e.full_name,
    e.department,
    e.designation,
    'USD',
    sal.base_salary,
    allow_v.allowances_total,
    ded_v.deductions_total,
    att.present_days,
    att.absent_days,
    att.late_days,
    att.overtime_hours,
    att.paid_leave_days,
    att.unpaid_leave_days,
    1,
    calc.prorate_deduction,
    calc.taxable_income,
    0,
    calc.net_pay,
    CASE
      WHEN make_date(pr.period_year, pr.period_month, 1) < current_period THEN calc.net_pay
      WHEN (abs(hashtext(e.id::text || pr.period_year::text || pr.period_month::text || 'paid')) % 100) < 62 THEN calc.net_pay
      ELSE 0
    END,
    CASE
      WHEN make_date(pr.period_year, pr.period_month, 1) < current_period THEN 'paid'
      WHEN (abs(hashtext(e.id::text || pr.period_year::text || pr.period_month::text || 'paid')) % 100) < 62 THEN 'paid'
      ELSE 'pending'
    END,
    CASE
      WHEN make_date(pr.period_year, pr.period_month, 1) < current_period OR (abs(hashtext(e.id::text || pr.period_year::text || pr.period_month::text || 'paid')) % 100) < 62 THEN 'bank'
      ELSE NULL
    END,
    CASE
      WHEN make_date(pr.period_year, pr.period_month, 1) < current_period OR (abs(hashtext(e.id::text || pr.period_year::text || pr.period_month::text || 'paid')) % 100) < 62 THEN (make_date(pr.period_year, pr.period_month, LEAST(28, 25 + (abs(hashtext(e.id::text || pr.id::text)) % 4)))::timestamp at time zone 'UTC')
      ELSE NULL
    END,
    jsonb_build_object(
      'base', sal.base_salary,
      'transport', allow_v.transport,
      'food', allow_v.food,
      'internet', allow_v.internet,
      'bonus', allow_v.bonus,
      'overtime_pay', allow_v.overtime_pay,
      'loan', ded_v.loan,
      'penalty', ded_v.penalty,
      'prorate_deduction', calc.prorate_deduction,
      'source', 'historical_bootstrap'
    )
  FROM public.payroll_runs pr
  JOIN public.employees e
    ON e.status = 'active'
   AND COALESCE(e.currency, 'USD') = 'USD'
   AND e.joining_date::date <= (make_date(pr.period_year, pr.period_month, 1) + interval '1 month - 1 day')::date
   AND (e.last_working_day IS NULL OR e.last_working_day::date >= make_date(pr.period_year, pr.period_month, 1))
  CROSS JOIN LATERAL (
    SELECT COALESCE((
      SELECT h.base_salary FROM public.payroll_salary_history h
      WHERE h.employee_id = e.id
        AND h.effective_from <= (make_date(pr.period_year, pr.period_month, 1) + interval '1 month - 1 day')::date
        AND (h.effective_to IS NULL OR h.effective_to >= make_date(pr.period_year, pr.period_month, 1))
      ORDER BY h.effective_from DESC LIMIT 1
    ), COALESCE(e.gross_salary, 250)::numeric) AS base_salary
  ) sal
  CROSS JOIN LATERAL (
    SELECT
      1 + (abs(hashtext(e.id::text || pr.period_year::text || pr.period_month::text || 'abs')) % 3) AS absent_days,
      abs(hashtext(e.id::text || pr.period_year::text || pr.period_month::text || 'late')) % 4 AS late_days,
      CASE WHEN (abs(hashtext(e.id::text || pr.period_year::text || pr.period_month::text || 'leave')) % 100) < 22 THEN 1 + (abs(hashtext(e.id::text || pr.period_year::text || pr.period_month::text || 'ld')) % 2) ELSE 0 END AS paid_leave_days,
      CASE WHEN (abs(hashtext(e.id::text || pr.period_year::text || pr.period_month::text || 'ul')) % 100) < 7 THEN 1 ELSE 0 END AS unpaid_leave_days,
      CASE WHEN (abs(hashtext(e.id::text || pr.period_year::text || pr.period_month::text || 'ot')) % 100) < 18 THEN 4 + (abs(hashtext(e.id::text || pr.period_year::text || pr.period_month::text || 'oth')) % 15) ELSE 0 END AS overtime_hours,
      GREATEST(0, pr.working_days - (1 + (abs(hashtext(e.id::text || pr.period_year::text || pr.period_month::text || 'abs')) % 3))) AS present_days
  ) att
  CROSS JOIN LATERAL (
    SELECT
      10 + (abs(hashtext(e.id::text || pr.period_year::text || pr.period_month::text || 'transport')) % 31) AS transport,
      15 + (abs(hashtext(e.id::text || pr.period_year::text || pr.period_month::text || 'food')) % 36) AS food,
      CASE WHEN (abs(hashtext(e.id::text || pr.period_year::text || pr.period_month::text || 'internet')) % 100) < 72 THEN 10 + (abs(hashtext(e.id::text || pr.period_year::text || pr.period_month::text || 'inet')) % 21) ELSE 0 END AS internet,
      CASE WHEN (abs(hashtext(e.id::text || pr.period_year::text || pr.period_month::text || 'bonus')) % 100) < 11 THEN 30 + (abs(hashtext(e.id::text || pr.period_year::text || pr.period_month::text || 'bonamt')) % 121) ELSE 0 END AS bonus,
      ROUND((sal.base_salary / NULLIF(pr.working_days, 0) / 8 * 1.5 * att.overtime_hours)::numeric, 2) AS overtime_pay
  ) allow_parts
  CROSS JOIN LATERAL (
    SELECT (allow_parts.transport + allow_parts.food + allow_parts.internet + allow_parts.bonus + allow_parts.overtime_pay)::numeric AS allowances_total,
           allow_parts.transport, allow_parts.food, allow_parts.internet, allow_parts.bonus, allow_parts.overtime_pay
  ) allow_v
  CROSS JOIN LATERAL (
    SELECT
      CASE WHEN (abs(hashtext(e.id::text || pr.period_year::text || pr.period_month::text || 'loan')) % 100) < 8 THEN 20 + (abs(hashtext(e.id::text || pr.period_year::text || pr.period_month::text || 'loanamt')) % 41) ELSE 0 END AS loan,
      CASE WHEN (abs(hashtext(e.id::text || pr.period_year::text || pr.period_month::text || 'penalty')) % 100) < 5 THEN 10 + (abs(hashtext(e.id::text || pr.period_year::text || pr.period_month::text || 'penamt')) % 21) ELSE 0 END AS penalty
  ) ded_parts
  CROSS JOIN LATERAL (
    SELECT (ded_parts.loan + ded_parts.penalty)::numeric AS deductions_total, ded_parts.loan, ded_parts.penalty
  ) ded_v
  CROSS JOIN LATERAL (
    SELECT
      ROUND(((sal.base_salary + allow_v.transport + allow_v.food + allow_v.internet) / NULLIF(pr.working_days, 0) * att.unpaid_leave_days)::numeric, 2) AS prorate_deduction
  ) prr
  CROSS JOIN LATERAL (
    SELECT
      ROUND((sal.base_salary + allow_v.allowances_total - prr.prorate_deduction)::numeric, 2) AS taxable_income,
      ROUND((sal.base_salary + allow_v.allowances_total - prr.prorate_deduction - ded_v.deductions_total)::numeric, 2) AS net_pay,
      prr.prorate_deduction
  ) calc
  WHERE make_date(pr.period_year, pr.period_month, 1) <= current_period
  ON CONFLICT (run_id, employee_id) DO NOTHING;

  -- Adjustment ledger rows for seeded items.
  INSERT INTO public.payroll_adjustments (item_id, kind, category, label, amount, note)
  SELECT i.id, x.kind, x.category, x.label, x.amount, 'Historical payroll bootstrap'
  FROM public.payroll_items i
  JOIN public.payroll_runs pr ON pr.id = i.run_id
  CROSS JOIN LATERAL (
    VALUES
      ('transport', 'allowance', 'Transport', COALESCE((i.breakdown->>'transport')::numeric, 0)),
      ('food', 'allowance', 'Food', COALESCE((i.breakdown->>'food')::numeric, 0)),
      ('internet', 'allowance', 'Internet', COALESCE((i.breakdown->>'internet')::numeric, 0)),
      ('bonus', 'allowance', 'Performance bonus', COALESCE((i.breakdown->>'bonus')::numeric, 0)),
      ('overtime', 'allowance', 'Overtime pay', COALESCE((i.breakdown->>'overtime_pay')::numeric, 0)),
      ('loan', 'deduction', 'Loan repayment', COALESCE((i.breakdown->>'loan')::numeric, 0)),
      ('penalty', 'deduction', 'Policy penalty', COALESCE((i.breakdown->>'penalty')::numeric, 0))
  ) AS x(kind, category, label, amount)
  WHERE i.breakdown->>'source' = 'historical_bootstrap'
    AND x.amount > 0
    AND NOT EXISTS (
      SELECT 1 FROM public.payroll_adjustments pa
      WHERE pa.item_id = i.id AND pa.kind = x.kind AND pa.label = x.label AND pa.note = 'Historical payroll bootstrap'
    );

  -- Optional attendance records for current HR integration, without overwriting manual records.
  INSERT INTO public.attendance_records (employee_id, work_date, status, total_minutes, source, break_minutes)
  SELECT
    e.id,
    d::date,
    CASE
      WHEN (abs(hashtext(e.id::text || d::date::text || 'abs')) % 100) < 5 THEN 'absent'
      WHEN (abs(hashtext(e.id::text || d::date::text || 'late')) % 100) < 9 THEN 'late'
      WHEN (abs(hashtext(e.id::text || d::date::text || 'ot')) % 100) < 8 THEN 'overtime'
      ELSE 'present'
    END,
    CASE
      WHEN (abs(hashtext(e.id::text || d::date::text || 'abs')) % 100) < 5 THEN 0
      WHEN (abs(hashtext(e.id::text || d::date::text || 'late')) % 100) < 9 THEN 450
      WHEN (abs(hashtext(e.id::text || d::date::text || 'ot')) % 100) < 8 THEN 540
      ELSE 480
    END,
    'seed',
    30
  FROM public.employees e
  CROSS JOIN generate_series(make_date(2020, 1, 1), current_date, interval '1 day') d
  WHERE e.status = 'active'
    AND e.joining_date::date <= d::date
    AND (e.last_working_day IS NULL OR e.last_working_day::date >= d::date)
    AND EXTRACT(isodow FROM d) BETWEEN 1 AND 5
  ON CONFLICT DO NOTHING;

  -- Recompute run totals/status from item rows.
  FOR r IN SELECT id FROM public.payroll_runs LOOP
    PERFORM public.payroll_recompute_totals(r.id);
    UPDATE public.payroll_runs pr
    SET locked = make_date(pr.period_year, pr.period_month, 1) < current_period,
        status = CASE
          WHEN make_date(pr.period_year, pr.period_month, 1) < current_period THEN 'paid'
          WHEN COALESCE((pr.totals->>'pending')::numeric, 0) <= 0 THEN 'paid'
          WHEN COALESCE((pr.totals->>'paid')::numeric, 0) > 0 THEN 'partial_paid'
          ELSE 'approved'
        END,
        paid_at = CASE WHEN make_date(pr.period_year, pr.period_month, 1) < current_period THEN COALESCE(pr.paid_at, (make_date(pr.period_year, pr.period_month, 28)::timestamp at time zone 'UTC')) ELSE pr.paid_at END
    WHERE pr.id = r.id;
  END LOOP;
END $$;
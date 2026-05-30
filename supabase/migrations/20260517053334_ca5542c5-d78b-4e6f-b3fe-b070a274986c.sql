-- Prevent duplicate monthly payslips per employee
CREATE UNIQUE INDEX IF NOT EXISTS hr_documents_payslip_month_uniq
  ON public.hr_documents (employee_id, period_month)
  WHERE kind = 'payslip' AND period_month IS NOT NULL;
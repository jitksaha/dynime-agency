-- 1. Backfill employee_code from existing id_card_assignments (subject_key uses team_member_key)
UPDATE public.employees e
SET    employee_code = a.card_id,
       updated_at    = now()
FROM   public.id_card_assignments a
WHERE  a.kind = 'EMP'
  AND  a.subject_key = 'team_section:' || e.team_member_key
  AND  (e.employee_code IS NULL OR e.employee_code = '' OR e.employee_code ~* '^EMP-');

-- 2. For employees without a card yet, allocate the next DTLE serial, create the assignment, then write it back to the employee row.
DO $$
DECLARE
  emp RECORD;
  next_n int;
  new_code text;
BEGIN
  FOR emp IN
    SELECT e.id, e.team_member_key, e.full_name, e.email
      FROM public.employees e
     WHERE (e.employee_code IS NULL OR e.employee_code = '' OR e.employee_code ~* '^EMP-')
       AND e.team_member_key IS NOT NULL
     ORDER BY e.created_at
  LOOP
    SELECT COALESCE(MAX((regexp_match(card_id, '^DTLE(\d+)$'))[1]::int), 0) + 1
      INTO next_n
      FROM public.id_card_assignments
     WHERE kind = 'EMP' AND card_id ~ '^DTLE\d+$';

    new_code := 'DTLE' || lpad(next_n::text, 6, '0');

    INSERT INTO public.id_card_assignments (kind, subject_key, card_id, company_short, subject_name, subject_email)
    VALUES ('EMP', 'team_section:' || emp.team_member_key, new_code, 'DTLE', emp.full_name, emp.email)
    ON CONFLICT (card_id) DO NOTHING;

    UPDATE public.employees
       SET employee_code = new_code, updated_at = now()
     WHERE id = emp.id;
  END LOOP;
END $$;
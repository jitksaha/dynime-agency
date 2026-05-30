
-- Helper function: dedupe employees by a chosen identity expression, moving
-- hr_documents to the canonical (oldest) row and deleting the duplicates.
DO $$
DECLARE
  pass_sql text;
BEGIN
  -- Pass 1: dedupe by lower(email)
  WITH ranked AS (
    SELECT id, created_at, lower(trim(email)) AS ident
    FROM public.employees
    WHERE email IS NOT NULL AND trim(email) <> ''
  ),
  canon AS (
    SELECT ident, (array_agg(id ORDER BY created_at ASC, id ASC))[1] AS keep_id
    FROM ranked GROUP BY ident
  ),
  mapping AS (
    SELECT r.id AS dup_id, c.keep_id
    FROM ranked r JOIN canon c USING (ident) WHERE r.id <> c.keep_id
  )
  UPDATE public.hr_documents h SET employee_id = m.keep_id
  FROM mapping m WHERE h.employee_id = m.dup_id;

  WITH ranked AS (
    SELECT id, created_at, lower(trim(email)) AS ident
    FROM public.employees
    WHERE email IS NOT NULL AND trim(email) <> ''
  ),
  canon AS (
    SELECT ident, (array_agg(id ORDER BY created_at ASC, id ASC))[1] AS keep_id
    FROM ranked GROUP BY ident
  )
  DELETE FROM public.employees e USING ranked r, canon c
  WHERE e.id = r.id AND c.ident = r.ident AND e.id <> c.keep_id;

  -- Pass 2: dedupe by user_id
  WITH ranked AS (
    SELECT id, created_at, user_id AS ident
    FROM public.employees WHERE user_id IS NOT NULL
  ),
  canon AS (
    SELECT ident, (array_agg(id ORDER BY created_at ASC, id ASC))[1] AS keep_id
    FROM ranked GROUP BY ident
  ),
  mapping AS (
    SELECT r.id AS dup_id, c.keep_id
    FROM ranked r JOIN canon c USING (ident) WHERE r.id <> c.keep_id
  )
  UPDATE public.hr_documents h SET employee_id = m.keep_id
  FROM mapping m WHERE h.employee_id = m.dup_id;

  WITH ranked AS (
    SELECT id, created_at, user_id AS ident
    FROM public.employees WHERE user_id IS NOT NULL
  ),
  canon AS (
    SELECT ident, (array_agg(id ORDER BY created_at ASC, id ASC))[1] AS keep_id
    FROM ranked GROUP BY ident
  )
  DELETE FROM public.employees e USING ranked r, canon c
  WHERE e.id = r.id AND c.ident = r.ident AND e.id <> c.keep_id;

  -- Pass 3: dedupe by team_member_key
  WITH ranked AS (
    SELECT id, created_at, team_member_key AS ident
    FROM public.employees WHERE team_member_key IS NOT NULL AND team_member_key <> ''
  ),
  canon AS (
    SELECT ident, (array_agg(id ORDER BY created_at ASC, id ASC))[1] AS keep_id
    FROM ranked GROUP BY ident
  ),
  mapping AS (
    SELECT r.id AS dup_id, c.keep_id
    FROM ranked r JOIN canon c USING (ident) WHERE r.id <> c.keep_id
  )
  UPDATE public.hr_documents h SET employee_id = m.keep_id
  FROM mapping m WHERE h.employee_id = m.dup_id;

  WITH ranked AS (
    SELECT id, created_at, team_member_key AS ident
    FROM public.employees WHERE team_member_key IS NOT NULL AND team_member_key <> ''
  ),
  canon AS (
    SELECT ident, (array_agg(id ORDER BY created_at ASC, id ASC))[1] AS keep_id
    FROM ranked GROUP BY ident
  )
  DELETE FROM public.employees e USING ranked r, canon c
  WHERE e.id = r.id AND c.ident = r.ident AND e.id <> c.keep_id;
END $$;

-- Prevent future duplicates with partial unique indexes.
CREATE UNIQUE INDEX IF NOT EXISTS employees_email_unique
  ON public.employees ((lower(trim(email))))
  WHERE email IS NOT NULL AND trim(email) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS employees_team_member_key_unique
  ON public.employees (team_member_key)
  WHERE team_member_key IS NOT NULL AND team_member_key <> '';

CREATE UNIQUE INDEX IF NOT EXISTS employees_user_id_unique
  ON public.employees (user_id)
  WHERE user_id IS NOT NULL;

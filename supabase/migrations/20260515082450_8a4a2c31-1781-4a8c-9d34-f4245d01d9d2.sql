CREATE TABLE IF NOT EXISTS public.id_card_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('EMP','INV')),
  subject_key text NOT NULL,
  card_id text NOT NULL,
  company_short text NOT NULL DEFAULT '',
  subject_name text,
  subject_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT id_card_assignments_card_id_unique UNIQUE (card_id),
  CONSTRAINT id_card_assignments_subject_unique UNIQUE (kind, subject_key)
);

CREATE INDEX IF NOT EXISTS idx_id_card_assignments_kind ON public.id_card_assignments(kind);

ALTER TABLE public.id_card_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read id card assignments"
  ON public.id_card_assignments FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins insert id card assignments"
  ON public.id_card_assignments FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins update id card assignments"
  ON public.id_card_assignments FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins delete id card assignments"
  ON public.id_card_assignments FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));
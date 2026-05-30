CREATE POLICY "Public can verify id cards"
  ON public.id_card_assignments FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_id_card_assignments_card_id ON public.id_card_assignments(card_id);

-- 1. Document requests table
CREATE TABLE public.flexpay_application_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.flexpay_credit_applications(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  label text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'requested',
  file_path text,
  file_name text,
  file_size bigint,
  mime_type text,
  uploaded_at timestamptz,
  requested_by uuid,
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT flexpay_app_docs_status_chk CHECK (status IN ('requested','uploaded','approved','rejected'))
);

CREATE INDEX idx_flexpay_app_docs_application ON public.flexpay_application_documents(application_id);
CREATE INDEX idx_flexpay_app_docs_status ON public.flexpay_application_documents(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.flexpay_application_documents TO authenticated;
GRANT ALL ON public.flexpay_application_documents TO service_role;

ALTER TABLE public.flexpay_application_documents ENABLE ROW LEVEL SECURITY;

-- Applicant can view their own document requests
CREATE POLICY "Applicants view their own document requests"
ON public.flexpay_application_documents FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.flexpay_credit_applications a
    WHERE a.id = flexpay_application_documents.application_id
      AND a.user_id = auth.uid()
  )
);

-- Applicant can update (upload) status/file fields on their own request
CREATE POLICY "Applicants upload their own documents"
ON public.flexpay_application_documents FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.flexpay_credit_applications a
    WHERE a.id = flexpay_application_documents.application_id
      AND a.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.flexpay_credit_applications a
    WHERE a.id = flexpay_application_documents.application_id
      AND a.user_id = auth.uid()
  )
);

-- Admins do everything
CREATE POLICY "Admins manage all document requests"
ON public.flexpay_application_documents FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Trigger to enforce applicant cannot change admin-only fields
CREATE OR REPLACE FUNCTION public.guard_flexpay_app_docs_user_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin(auth.uid()) THEN RETURN NEW; END IF;
  IF NEW.application_id IS DISTINCT FROM OLD.application_id
     OR NEW.document_type IS DISTINCT FROM OLD.document_type
     OR NEW.label IS DISTINCT FROM OLD.label
     OR NEW.description IS DISTINCT FROM OLD.description
     OR NEW.requested_by IS DISTINCT FROM OLD.requested_by
     OR NEW.requested_at IS DISTINCT FROM OLD.requested_at
     OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
     OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
     OR NEW.review_note IS DISTINCT FROM OLD.review_note
  THEN
    RAISE EXCEPTION 'Applicants can only update upload-related fields';
  END IF;
  IF NEW.status NOT IN ('requested','uploaded') THEN
    RAISE EXCEPTION 'Applicants cannot set status to %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_flexpay_app_docs_user_update
BEFORE UPDATE ON public.flexpay_application_documents
FOR EACH ROW EXECUTE FUNCTION public.guard_flexpay_app_docs_user_update();

CREATE TRIGGER trg_flexpay_app_docs_updated_at
BEFORE UPDATE ON public.flexpay_application_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Private storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('flexpay-documents', 'flexpay-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: path convention {application_id}/{document_request_id}/{filename}
CREATE POLICY "Applicants upload to their application folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'flexpay-documents'
  AND EXISTS (
    SELECT 1 FROM public.flexpay_credit_applications a
    WHERE a.id::text = (storage.foldername(name))[1]
      AND a.user_id = auth.uid()
  )
);

CREATE POLICY "Applicants update their own document files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'flexpay-documents'
  AND EXISTS (
    SELECT 1 FROM public.flexpay_credit_applications a
    WHERE a.id::text = (storage.foldername(name))[1]
      AND a.user_id = auth.uid()
  )
);

CREATE POLICY "Applicants read their own document files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'flexpay-documents'
  AND (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.flexpay_credit_applications a
      WHERE a.id::text = (storage.foldername(name))[1]
        AND a.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Admins manage all flexpay document files"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'flexpay-documents' AND public.is_admin(auth.uid()))
WITH CHECK (bucket_id = 'flexpay-documents' AND public.is_admin(auth.uid()));

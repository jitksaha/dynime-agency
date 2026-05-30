
-- Vacancies column on careers
ALTER TABLE public.careers
  ADD COLUMN IF NOT EXISTS vacancies integer NOT NULL DEFAULT 1;

UPDATE public.careers SET vacancies = 2 WHERE slug = 'sales-manager';
UPDATE public.careers SET vacancies = 4 WHERE slug = 'business-development-executive';
UPDATE public.careers SET vacancies = 4 WHERE slug = 'sdr-lead-generator';
UPDATE public.careers SET vacancies = 1 WHERE slug = 'growth-manager';
UPDATE public.careers SET vacancies = 1 WHERE slug = 'project-manager';

INSERT INTO public.careers (slug, title, department, location, employment_type, experience_level, salary_range, description, content_html, responsibilities, requirements, apply_url, is_active, is_featured, sort_order, vacancies)
SELECT
  'chief-technology-officer',
  'Chief Technology Officer (CTO)',
  'Management',
  'Remote',
  'Full-time',
  'Executive (10+ years)',
  'Equity + competitive salary',
  'Lead Dynime''s entire technology vision, architecture, and engineering org across SaaS and services lines.',
  '<h2>About the role</h2><p>As CTO you own the long-term technical strategy for Dynime — selecting the right stack, hiring senior engineers, hardening security, and shipping a scalable SaaS platform alongside our client services delivery.</p><h2>What you''ll do</h2><ul><li>Set the engineering vision, architecture and roadmap</li><li>Hire, mentor and lead a remote engineering team</li><li>Own code quality, security, performance and DevOps maturity</li><li>Partner with COO, Product and Sales on revenue-driving features</li><li>Lead technical due-diligence for investors and enterprise customers</li></ul><h2>What we''re looking for</h2><ul><li>10+ years building production SaaS / web platforms</li><li>5+ years leading engineering teams as VP Eng / CTO / Head of Eng</li><li>Deep React, Node.js, Postgres and cloud experience (Supabase / AWS / GCP)</li><li>Strong product instincts and executive communication</li></ul>',
  '["Set engineering vision, architecture and roadmap","Hire and lead a remote engineering team","Own security, performance, DevOps and uptime","Partner with COO and Product on roadmap","Lead technical due diligence for investors"]'::jsonb,
  '["10+ years building production SaaS / web platforms","5+ years leading engineering teams","Deep React, Node.js, Postgres and cloud experience","Strong product and leadership instincts"]'::jsonb,
  '/careers/chief-technology-officer',
  true,
  true,
  0,
  1
WHERE NOT EXISTS (SELECT 1 FROM public.careers WHERE slug = 'chief-technology-officer');

CREATE TABLE IF NOT EXISTS public.job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  career_id uuid REFERENCES public.careers(id) ON DELETE SET NULL,
  career_slug text,
  career_title text,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  country text,
  current_position text,
  experience_years integer,
  expected_salary text,
  linkedin_url text,
  portfolio_url text,
  resume_url text,
  cover_letter text,
  source text NOT NULL DEFAULT 'career-page',
  status text NOT NULL DEFAULT 'new',
  admin_notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS job_applications_career_idx ON public.job_applications(career_id);
CREATE INDEX IF NOT EXISTS job_applications_status_idx ON public.job_applications(status);
CREATE INDEX IF NOT EXISTS job_applications_created_idx ON public.job_applications(created_at DESC);

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit job applications"
ON public.job_applications
FOR INSERT
TO public
WITH CHECK (
  length(btrim(full_name)) BETWEEN 2 AND 120
  AND length(btrim(email)) BETWEEN 5 AND 200
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND length(COALESCE(cover_letter, '')) <= 5000
);

CREATE POLICY "Admins and HR read job applications"
ON public.job_applications
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "Admins and HR update job applications"
ON public.job_applications
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'hr'::app_role))
WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "Admins delete job applications"
ON public.job_applications
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

CREATE TRIGGER job_applications_set_updated_at
BEFORE UPDATE ON public.job_applications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public)
VALUES ('job-applications', 'job-applications', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can upload resumes"
ON storage.objects FOR INSERT TO public
WITH CHECK (bucket_id = 'job-applications');

CREATE POLICY "Admins and HR read resumes"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'job-applications'
  AND (is_admin(auth.uid()) OR has_role(auth.uid(), 'hr'::app_role))
);

CREATE POLICY "Admins delete resumes"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'job-applications' AND is_admin(auth.uid()));

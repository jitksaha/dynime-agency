CREATE TABLE public.careers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT 'General',
  location TEXT NOT NULL DEFAULT 'Remote',
  employment_type TEXT NOT NULL DEFAULT 'Full-time',
  experience_level TEXT,
  salary_range TEXT,
  description TEXT,
  responsibilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  apply_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  posted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.careers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active careers"
ON public.careers FOR SELECT
TO public
USING (is_active = true);

CREATE POLICY "Admins can manage careers"
ON public.careers FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER update_careers_updated_at
BEFORE UPDATE ON public.careers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.careers (title, department, location, employment_type, experience_level, salary_range, description, responsibilities, requirements, apply_url, is_featured, sort_order) VALUES
('Senior Full-Stack Developer', 'Engineering', 'Remote', 'Full-time', 'Senior', 'Competitive', 'Build scalable web applications using React, Node.js, and modern cloud infrastructure.', '["Architect and develop full-stack features","Code reviews and mentoring","Optimize performance and scalability"]'::jsonb, '["5+ years React/Node experience","Strong TypeScript skills","Cloud experience (AWS/Supabase)"]'::jsonb, 'https://marketplace.dynime.com/apply/senior-fullstack', true, 1),
('UI/UX Designer', 'Design', 'Remote / Hybrid', 'Full-time', 'Mid-level', 'Competitive', 'Design beautiful, conversion-focused interfaces for our clients and products.', '["Create wireframes and prototypes","Build and maintain design systems","Collaborate with engineering"]'::jsonb, '["3+ years product design","Figma expertise","Portfolio of shipped work"]'::jsonb, 'https://marketplace.dynime.com/apply/ui-ux-designer', true, 2),
('Digital Marketing Specialist', 'Marketing', 'Remote', 'Full-time', 'Mid-level', 'Competitive', 'Drive growth through SEO, paid ads, and content marketing campaigns.', '["Manage Meta & Google Ads","SEO strategy and execution","Performance reporting"]'::jsonb, '["2+ years digital marketing","Google Ads & Meta certified","Analytics expertise"]'::jsonb, 'https://marketplace.dynime.com/apply/marketing-specialist', false, 3),
('AI/ML Engineer', 'Engineering', 'Remote', 'Full-time', 'Senior', 'Competitive', 'Build AI-powered software products and integrations.', '["Design AI systems and pipelines","LLM integration","Model evaluation"]'::jsonb, '["Python & ML experience","LLM/RAG knowledge","Production ML deployment"]'::jsonb, 'https://marketplace.dynime.com/apply/ai-engineer', false, 4);
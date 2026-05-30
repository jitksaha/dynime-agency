-- Tighten admin-management policies to admins only
DROP POLICY IF EXISTS "Authenticated users can manage settings" ON public.site_settings;
CREATE POLICY "Admins can manage settings" ON public.site_settings FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can manage contact info" ON public.contact_info;
CREATE POLICY "Admins can manage contact info" ON public.contact_info FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can manage form templates" ON public.form_templates;
CREATE POLICY "Admins can manage form templates" ON public.form_templates FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can read submissions" ON public.form_submissions;
CREATE POLICY "Admins can read submissions" ON public.form_submissions FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can update submissions" ON public.form_submissions;
CREATE POLICY "Admins can update submissions" ON public.form_submissions FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can update chat messages" ON public.chat_messages;
CREATE POLICY "Admins can update chat messages" ON public.chat_messages FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can manage pages" ON public.pages;
CREATE POLICY "Admins can manage pages" ON public.pages FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can manage portfolio projects" ON public.portfolio_projects;
CREATE POLICY "Admins can manage portfolio projects" ON public.portfolio_projects FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can delete portfolio projects" ON public.portfolio_projects;
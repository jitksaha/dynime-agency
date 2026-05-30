
-- Helper: returns true if the user has any of the given roles
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  )
$$;

-- ============ SUPPORT STAFF ============
-- chat_messages: support can read & update
CREATE POLICY "Support can read chat messages" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'support'));
CREATE POLICY "Support can update chat messages" ON public.chat_messages
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'support'));

-- form_submissions
CREATE POLICY "Support can read submissions" ON public.form_submissions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'support'));
CREATE POLICY "Support can update submissions" ON public.form_submissions
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'support'));

-- support_tickets + ticket_messages
CREATE POLICY "Support manages tickets" ON public.support_tickets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'support'))
  WITH CHECK (public.has_role(auth.uid(), 'support'));
CREATE POLICY "Support manages ticket messages" ON public.ticket_messages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'support'))
  WITH CHECK (public.has_role(auth.uid(), 'support'));

-- ============ HR ============
CREATE POLICY "HR manages careers" ON public.careers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'hr'))
  WITH CHECK (public.has_role(auth.uid(), 'hr'));

-- ============ SALES / FINANCE ============
CREATE POLICY "Sales reads orders" ON public.orders
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'sales'));
CREATE POLICY "Sales updates orders" ON public.orders
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'sales'));

CREATE POLICY "Sales manages coupons" ON public.coupons
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'sales'))
  WITH CHECK (public.has_role(auth.uid(), 'sales'));

CREATE POLICY "Sales manages customer services" ON public.customer_services
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'sales'))
  WITH CHECK (public.has_role(auth.uid(), 'sales'));

CREATE POLICY "Sales manages milestones" ON public.order_milestones
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'sales'))
  WITH CHECK (public.has_role(auth.uid(), 'sales'));

CREATE POLICY "Sales manages service pricing" ON public.service_pricing
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'sales'))
  WITH CHECK (public.has_role(auth.uid(), 'sales'));

CREATE POLICY "Sales manages usa state pricing" ON public.usa_state_pricing
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'sales'))
  WITH CHECK (public.has_role(auth.uid(), 'sales'));

CREATE POLICY "Sales reads renewals" ON public.service_renewals
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'sales'));

-- ============ CONTENT EDITOR ============
CREATE POLICY "Editor manages blog posts" ON public.blog_posts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Editor manages pages" ON public.pages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Editor manages portfolio" ON public.portfolio_projects
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Editor manages products" ON public.products
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Editor manages contact info" ON public.contact_info
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Editor manages country eligibility" ON public.country_eligibility
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Editor manages form templates" ON public.form_templates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Editor manages site settings (non-secret)" ON public.site_settings
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'editor')
    AND lower(key) !~~ '%secret%' AND lower(key) !~~ '%api_key%'
    AND lower(key) !~~ '%apikey%' AND lower(key) !~~ '%token%'
    AND lower(key) !~~ '%password%' AND lower(key) !~~ '%private%'
    AND lower(key) !~~ '%webhook%' AND lower(key) !~~ '%credential%'
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'editor')
    AND lower(key) !~~ '%secret%' AND lower(key) !~~ '%api_key%'
    AND lower(key) !~~ '%apikey%' AND lower(key) !~~ '%token%'
    AND lower(key) !~~ '%password%' AND lower(key) !~~ '%private%'
    AND lower(key) !~~ '%webhook%' AND lower(key) !~~ '%credential%'
  );

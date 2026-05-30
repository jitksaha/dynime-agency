-- 1. Fix is_admin to require admin-level roles only
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin'::app_role, 'manager'::app_role)
  )
$$;

-- 2. Tighten write policies — drop overly-permissive ALL policies and restrict to admins
-- site_settings
DROP POLICY IF EXISTS "Admins can manage settings" ON public.site_settings;
CREATE POLICY "Admins can manage settings" ON public.site_settings
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- contact_info
DROP POLICY IF EXISTS "Admins can manage contact info" ON public.contact_info;
CREATE POLICY "Admins can manage contact info" ON public.contact_info
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- form_templates
DROP POLICY IF EXISTS "Admins can manage form templates" ON public.form_templates;
CREATE POLICY "Admins can manage form templates" ON public.form_templates
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- pages: admin manage + restrict public SELECT to published only
DROP POLICY IF EXISTS "Admins can manage pages" ON public.pages;
CREATE POLICY "Admins can manage pages" ON public.pages
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Anyone can read published pages" ON public.pages;
CREATE POLICY "Anyone can read published pages" ON public.pages
  FOR SELECT TO public
  USING (is_published = true);

-- portfolio_projects
DROP POLICY IF EXISTS "Admins can manage portfolio projects" ON public.portfolio_projects;
CREATE POLICY "Admins can manage portfolio projects" ON public.portfolio_projects
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- products
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products" ON public.products
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- coupons: remove public SELECT (clients use validate_coupon RPC)
DROP POLICY IF EXISTS "Anyone can read active coupons" ON public.coupons;
DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;
CREATE POLICY "Admins can manage coupons" ON public.coupons
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- service_pricing
DROP POLICY IF EXISTS "Admins can manage service pricing" ON public.service_pricing;
CREATE POLICY "Admins can manage service pricing" ON public.service_pricing
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- form_submissions: admin-only read/update (already admin-scoped, keep but ensure)
DROP POLICY IF EXISTS "Admins can read submissions" ON public.form_submissions;
CREATE POLICY "Admins can read submissions" ON public.form_submissions
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins can update submissions" ON public.form_submissions;
CREATE POLICY "Admins can update submissions" ON public.form_submissions
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

-- newsletter_subscribers: ensure admin-only
DROP POLICY IF EXISTS "Admins can read subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Admins can read subscribers" ON public.newsletter_subscribers
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins can manage subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Admins can manage subscribers" ON public.newsletter_subscribers
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins can delete subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Admins can delete subscribers" ON public.newsletter_subscribers
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- orders: admin policies
DROP POLICY IF EXISTS "Admins can read orders" ON public.orders;
CREATE POLICY "Admins can read orders" ON public.orders
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins can update orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

-- chat_messages: admin update
DROP POLICY IF EXISTS "Admins can update chat messages" ON public.chat_messages;
CREATE POLICY "Admins can update chat messages" ON public.chat_messages
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

-- 3. chat_messages: replace public SELECT with session-scoped RPC
DROP POLICY IF EXISTS "Anyone can read chat messages by session" ON public.chat_messages;
-- Allow only admins to SELECT directly; anonymous visitors read via SECURITY DEFINER RPC
CREATE POLICY "Admins can read chat messages" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.get_chat_messages(_session_id text)
RETURNS TABLE (
  id uuid,
  session_id text,
  sender_type text,
  sender_name text,
  message text,
  is_read boolean,
  created_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id, session_id, sender_type, sender_name, message, is_read, created_at
  FROM public.chat_messages
  WHERE session_id = _session_id
    AND length(trim(_session_id)) >= 8
  ORDER BY created_at ASC
  LIMIT 500;
$$;

-- 4. Remove sensitive tables from Realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.orders;
ALTER PUBLICATION supabase_realtime DROP TABLE public.form_submissions;
ALTER PUBLICATION supabase_realtime DROP TABLE public.chat_messages;

-- 5. Lock down SECURITY DEFINER function execution
-- Revoke broad EXECUTE then grant only to needed roles
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.redeem_coupon(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_assign_first_admin() FROM PUBLIC, anon, authenticated;

-- Functions intended to be callable from the client
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, numeric) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_status_by_session(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_chat_messages(text) TO anon, authenticated;
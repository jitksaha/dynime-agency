-- Wire up the existing handler functions to fire when a new auth user is created.
-- Without these triggers, signups never create a profile and the first user
-- never gets the super_admin role, leaving ALL admin-only tables (incl. site_settings)
-- unreachable behind their `is_admin(auth.uid())` RLS policies.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_created_assign_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_first_admin();
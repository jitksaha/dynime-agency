import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import RouteProgress from "@/components/shared/RouteProgress";

const EmployeeProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, userRole, isAdmin } = useAuth();
  const location = useLocation();

  const { data: hasEmployee, isLoading: empLoading } = useQuery({
    queryKey: ["employee-membership", user?.id, user?.email],
    enabled: !!user?.id && userRole !== "employee" && !isAdmin,
    queryFn: async () => {
      const { count } = await supabase
        .from("employees")
        .select("id", { count: "exact", head: true })
        .or(`user_id.eq.${user!.id},email.ilike.${user!.email ?? ""}`);
      return (count ?? 0) > 0;
    },
  });

  if (loading || empLoading) {
    return <RouteProgress />;
  }

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/employee/login?next=${next}`} replace />;
  }

  const allowed = isAdmin || userRole === "employee" || !!hasEmployee;
  if (!allowed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md space-y-3">
          <h1 className="font-heading text-2xl font-bold">Employees only</h1>
          <p className="text-muted-foreground text-sm">
            We couldn't find an employee record linked to <strong>{user.email}</strong>.
            Ask HR to add or update your record, then sign in again.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Link to="/" className="text-primary hover:underline text-sm">Back to website</Link>
            <Link to="/contact" className="text-primary hover:underline text-sm">Contact HR</Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default EmployeeProtectedRoute;

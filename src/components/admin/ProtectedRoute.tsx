import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { canAccessRoute } from "@/lib/role-permissions";
import type { Database } from "@/integrations/db/types";
import RouteProgress from "@/components/shared/RouteProgress";

type AppRole = Database["public"]["Enums"]["app_role"];

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isAdmin, userRole, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return <RouteProgress />;
  }

  if (!user) {
    return <Navigate to="/superadmin/login" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            You don't have permission to access the admin panel. (Current role: <strong>{userRole || "none"}</strong>)
          </p>
          <div className="flex flex-col gap-3 items-center mt-4">
            <button
              onClick={() => signOut().then(() => window.location.href = "/superadmin/login")}
              className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/95 text-sm font-medium rounded-lg shadow-sm w-full max-w-xs"
            >
              Sign Out & Login as Admin
            </button>
            <Link to="/" className="text-primary hover:underline text-sm mt-1">
              ← Back to website
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Per-route role check
  if (!canAccessRoute(userRole as AppRole | null, location.pathname)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Restricted</h1>
          <p className="text-muted-foreground mb-4">
            Your role ({userRole}) doesn't have access to this section. Ask a Super Admin if you need it.
          </p>
          <Link to="/superadmin" className="text-primary hover:underline text-sm">← Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;

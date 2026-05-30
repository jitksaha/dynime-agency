import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import RouteProgress from "@/components/shared/RouteProgress";

const InvestorProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, userRole, isAdmin } = useAuth();
  const location = useLocation();

  // Fallback: any user that has at least one investment row is also allowed in.
  const { data: hasInvestment, isLoading: invLoading } = useQuery({
    queryKey: ["investor-membership", user?.id],
    enabled: !!user?.id && userRole !== "investor" && !isAdmin,
    queryFn: async () => {
      const { count } = await supabase
        .from("investments" as any)
        .select("id", { count: "exact", head: true })
        .eq("investor_id", user!.id);
      return (count ?? 0) > 0;
    },
  });

  if (loading || invLoading) {
    return <RouteProgress />;
  }

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/investor/login?next=${next}`} replace />;
  }

  const allowed = isAdmin || userRole === "investor" || !!hasInvestment;
  if (!allowed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md space-y-3">
          <h1 className="font-heading text-2xl font-bold">Investor access only</h1>
          <p className="text-muted-foreground text-sm">
            Your account isn't linked to an investor profile yet. Submit the investor interest
            form and our IR team will activate your portal access.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Link to="/invest" className="text-primary hover:underline text-sm">View plans</Link>
            <Link to="/investor-relations" className="text-primary hover:underline text-sm">Contact IR</Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default InvestorProtectedRoute;

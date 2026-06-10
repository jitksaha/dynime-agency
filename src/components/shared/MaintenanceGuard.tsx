import { useLocation, Navigate } from "react-router-dom";
import { useSiteSettings } from "@/hooks/use-data";

export const MaintenanceGuard = ({ children }: { children: React.ReactNode }) => {
  const { data: settings, isLoading } = useSiteSettings();
  const location = useLocation();

  // If settings are still loading, do not block the render, just show children
  if (isLoading) {
    return <>{children}</>;
  }

  const isMaintenanceActive = settings?.maintenance_mode === "true" || settings?.maintenance_mode === "1";

  if (isMaintenanceActive) {
    const path = location.pathname.toLowerCase();
    
    // Check if the current route is one of the bypass routes
    const isBypassRoute = 
      path.startsWith("/superadmin") || 
      path.startsWith("/admin") || 
      path.startsWith("/employee") || 
      path.startsWith("/investor") || 
      path.startsWith("/api") ||
      path === "/maintenance";
      
    if (!isBypassRoute) {
      return <Navigate to="/maintenance" replace />;
    }
  } else {
    // If maintenance mode is NOT active, and user tries to access /maintenance directly, redirect to home
    if (location.pathname.toLowerCase() === "/maintenance") {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};

export default MaintenanceGuard;

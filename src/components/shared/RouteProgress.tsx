import { useEffect } from "react";
import NProgress from "nprogress";

/**
 * Renders nothing but drives the top NProgress bar while a route/auth check
 * is in-flight. Replaces full-screen spinners so navigations feel instant.
 */
const RouteProgress = () => {
  useEffect(() => {
    NProgress.start();
    return () => {
      NProgress.done();
    };
  }, []);
  return null;
};

export default RouteProgress;

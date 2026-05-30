import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Legacy /superadmin/employees route — replaced by the unified
 * /superadmin/hr "HR & Employees" hub. We map the old ?tab= values to the
 * new ones so existing bookmarks keep working.
 */
const LEGACY_TAB_MAP: Record<string, string> = {
  accounts: "employees",
  section: "team-section",
  cards: "id-cards",
  overview: "employees",
};

const AdminEmployees = () => {
  const navigate = useNavigate();
  const { search } = useLocation();
  useEffect(() => {
    const legacy = new URLSearchParams(search).get("tab") || "";
    const target = LEGACY_TAB_MAP[legacy];
    // Team Accounts is now its own top-level page.
    if (legacy === "accounts") {
      navigate("/superadmin/team", { replace: true });
      return;
    }
    navigate(target ? `/superadmin/hr?tab=${target}` : "/superadmin/hr", { replace: true });
  }, [navigate, search]);
  return null;
};

export default AdminEmployees;

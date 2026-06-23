import type { Database } from "@/integrations/db/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

/**
 * Map each route prefix in the admin panel to the roles that may access it.
 * super_admin and manager always have full access.
 */
export const ROUTE_ACCESS: Record<string, AppRole[]> = {
  "/superadmin": ["super_admin", "manager", "editor", "support", "hr", "sales"], // dashboard

  // Engagement
  "/superadmin/submissions": ["super_admin", "manager", "support"],
  "/superadmin/chat": ["super_admin", "manager", "support"],
  "/superadmin/subscribers": ["super_admin", "manager", "support", "editor"],
  "/superadmin/invest-leads": ["super_admin", "manager", "sales"],
  "/superadmin/forms": ["super_admin", "manager", "editor"],
  "/superadmin/contact-info": ["super_admin", "manager", "editor"],
  "/superadmin/notifications": ["super_admin", "manager"],
  "/superadmin/country-eligibility": ["super_admin", "manager", "editor"],

  // Content
  "/superadmin/pages": ["super_admin", "manager", "editor"],
  "/superadmin/blog": ["super_admin", "manager", "editor"],
  "/superadmin/portfolio": ["super_admin", "manager", "editor"],
  "/superadmin/team": ["super_admin"],
  "/superadmin/team-section": ["super_admin", "manager", "hr", "editor"],
  "/superadmin/id-cards": ["super_admin", "manager", "hr"],
  "/superadmin/employees": ["super_admin", "manager", "hr", "editor"],
  "/superadmin/about-timeline": ["super_admin", "manager", "editor"],
  "/superadmin/careers": ["super_admin", "manager", "hr"],
  "/superadmin/seo": ["super_admin", "manager", "editor"],
  "/superadmin/page-seo": ["super_admin", "manager", "editor"],
  "/superadmin/seo-rules": ["super_admin", "manager", "editor"],
  "/superadmin/search-console": ["super_admin", "manager"],
  "/superadmin/og-validator": ["super_admin", "manager", "editor"],
  "/superadmin/seo-hub": ["super_admin", "manager", "editor"],
  "/superadmin/seo-dashboard": ["super_admin", "manager", "editor"],
  "/superadmin/seo-integrations": ["super_admin", "manager"],
  "/superadmin/keyword-tracker": ["super_admin", "manager"],
  "/superadmin/header-footer": ["super_admin", "manager", "editor"],
  "/superadmin/social-links": ["super_admin", "manager", "editor"],
  "/superadmin/brand-tone": ["super_admin", "manager", "editor"],

  // Commerce
  "/superadmin/orders": ["super_admin", "manager", "sales"],
  "/superadmin/fx-orders": ["super_admin", "manager"],
  "/superadmin/customer-services": ["super_admin", "manager", "sales"],
  "/superadmin/coupons": ["super_admin", "manager", "sales"],
  "/superadmin/pricing": ["super_admin", "manager", "sales"],
  "/superadmin/usa-state-pricing": ["super_admin", "manager", "sales"],
  "/superadmin/payment-gateways": ["super_admin", "manager", "sales"],

  // System
  "/superadmin/product-urls": ["super_admin", "manager"],
  "/superadmin/settings": ["super_admin"],
  "/superadmin/whatsapp-portal": ["super_admin", "manager"],
  "/superadmin/hr-requests": ["super_admin", "manager", "hr"],
  "/superadmin/hr-extras": ["super_admin", "manager", "hr"],
  "/superadmin/payroll": ["super_admin", "manager", "hr"],
  "/superadmin/crm": ["super_admin", "manager", "sales", "support"],
};

export const STAFF_ROLES: AppRole[] = ["super_admin", "manager", "editor", "support", "hr", "sales"];

export const isStaff = (role: AppRole | null | undefined): boolean =>
  !!role && STAFF_ROLES.includes(role);

export const canAccessRoute = (role: AppRole | null | undefined, path: string): boolean => {
  if (!role) return false;
  if (role === "super_admin" || role === "manager") return true;
  // Find longest matching prefix
  const match = Object.keys(ROUTE_ACCESS)
    .filter((p) => path === p || path.startsWith(p + "/"))
    .sort((a, b) => b.length - a.length)[0];
  if (!match) return false;
  return ROUTE_ACCESS[match].includes(role);
};

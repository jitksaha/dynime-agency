// Roles that grant access to admin-only endpoints.
// Mirrors the frontend isAdmin check in src/hooks/use-auth.tsx.
export const ADMIN_ROLES = [
  'super_admin',
  'manager',
  'editor',
  'support',
  'hr',
  'sales',
] as const;

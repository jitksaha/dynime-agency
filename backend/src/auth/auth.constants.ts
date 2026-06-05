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

export function sanitizeRoles(email: string | null | undefined, roles: string[]): string[] {
  const normalizedEmail = email?.toLowerCase().trim();
  if (normalizedEmail === 'mail.dynime@gmail.com') {
    // mail.dynime@gmail.com is the ONLY super_admin. We also grant other admin privileges.
    const adminRoles = new Set(['super_admin', 'admin', 'manager', ...roles]);
    return Array.from(adminRoles);
  } else {
    // Keep only public roles (like partner) and strip admin privileges
    const ADMIN_ROLES_SET = new Set(['super_admin', 'admin', 'manager', 'editor', 'support', 'hr', 'sales']);
    return roles.filter(role => !ADMIN_ROLES_SET.has(role));
  }
}

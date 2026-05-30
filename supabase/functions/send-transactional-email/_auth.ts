import { createClient } from 'npm:@supabase/supabase-js@2'

export const PUBLIC_ANON_TEMPLATES = new Set<string>([
  'admin-new-submission',
  'contact-confirmation',
  'job-application-received',
])

export type AuthzResult =
  | { ok: true; isAdmin: boolean }
  | { ok: false; status: number; error: string }

export async function authorizeCaller(
  req: Request,
  supabaseUrl: string,
  serviceKey: string,
  templateName: string | undefined,
  action: string,
): Promise<AuthzResult> {
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return { ok: false, status: 401, error: 'Unauthorized' }
  if (token === serviceKey) return { ok: true, isAdmin: true }

  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const publishableKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!
  const isAnonOrPublishable = token === anonKey || token === publishableKey

  if (templateName && PUBLIC_ANON_TEMPLATES.has(templateName) && isAnonOrPublishable) {
    return { ok: true, isAdmin: false }
  }

  try {
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data: claimsData } = await userClient.auth.getClaims(token)
    const claims = claimsData?.claims as Record<string, any> | undefined
    if (claims) {
      if (claims.role === 'service_role') return { ok: true, isAdmin: true }
      const sub = claims.sub
      if (sub) {
        const admin = createClient(supabaseUrl, serviceKey)
        const { data: roleRow } = await admin
          .from('user_roles')
          .select('role')
          .eq('user_id', sub)
          .in('role', ['super_admin', 'manager'])
          .maybeSingle()
        if (roleRow) return { ok: true, isAdmin: true }
      }
    }
  } catch (_e) { /* fall through */ }

  return { ok: false, status: action === 'test-smtp' ? 403 : 401, error: 'Forbidden' }
}

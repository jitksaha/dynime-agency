import type { SmtpConfig, IdentityOverride } from './_smtp.ts'

export async function loadSmtpConfig(supabase: any): Promise<SmtpConfig | null> {
  const { data } = await supabase
    .from('notification_settings')
    .select('value')
    .eq('key', 'smtp_config')
    .maybeSingle()
  const v = data?.value as Partial<SmtpConfig> | undefined
  if (!v?.host || !v?.port || !v?.from_email) return null
  return {
    host: v.host,
    port: Number(v.port),
    username: v.username || '',
    password: v.password || '',
    from_email: v.from_email,
    from_name: v.from_name || '',
    secure: v.secure ?? Number(v.port) === 465,
  }
}

export async function loadIdentityOverride(
  supabase: any,
  templateName: string,
): Promise<IdentityOverride | null> {
  const { data } = await supabase
    .from('notification_settings')
    .select('value')
    .eq('key', 'email_identities')
    .maybeSingle()
  const map = (data?.value ?? {}) as Record<string, IdentityOverride>
  const override = map?.[templateName] || map?.['*'] || map?.['default']
  if (!override) return null
  const cleaned: IdentityOverride = {}
  if (override.from_email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(override.from_email)) {
    cleaned.from_email = override.from_email.trim()
  }
  if (override.from_name && override.from_name.trim()) cleaned.from_name = override.from_name.trim()
  if (override.reply_to && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(override.reply_to)) {
    cleaned.reply_to = override.reply_to.trim()
  }
  return Object.keys(cleaned).length ? cleaned : null
}

export async function loadNotificationSettings(supabase: any): Promise<Record<string, any>> {
  const { data } = await supabase
    .from('notification_settings')
    .select('value')
    .eq('key', 'email_notifications')
    .maybeSingle()
  return (data?.value ?? {}) as Record<string, any>
}

import { createClient } from 'npm:@supabase/supabase-js@2'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'
import { corsHeaders, jsonResponse } from './_cors.ts'
import { sendViaSmtp } from './_smtp.ts'
import { authorizeCaller } from './_auth.ts'
import { loadSmtpConfig, loadIdentityOverride, loadNotificationSettings } from './_settings.ts'
import { renderTemplate } from './_render.ts'
import { handleTestSmtp } from './_test_smtp.ts'

interface ParsedRequest {
  templateName: string
  recipientEmail: string
  templateData: Record<string, any>
  messageId: string
  action: string
}

async function parseRequest(req: Request): Promise<ParsedRequest | { error: string }> {
  try {
    const body = await req.json()
    return {
      templateName: body.templateName || body.template_name,
      recipientEmail: body.recipientEmail || body.recipient_email,
      templateData:
        body.templateData && typeof body.templateData === 'object' ? body.templateData : {},
      messageId: body.idempotencyKey || body.idempotency_key || crypto.randomUUID(),
      action: body.action || 'send',
    }
  } catch {
    return { error: 'Invalid JSON in request body' }
  }
}

function resolveAdminTemplateOverrides(
  templateName: string,
  templateData: Record<string, any>,
  notif: Record<string, any>,
  fallbackRecipient: string,
): { effectiveRecipient: string; templateData: Record<string, any>; skip?: string } {
  let recipient = fallbackRecipient
  let data = templateData

  if (templateName === 'admin-new-submission') {
    if (notif.enabled === false) return { effectiveRecipient: recipient, templateData: data, skip: 'admin_notifications_disabled' }
    if (typeof notif.admin_recipient === 'string' && notif.admin_recipient.trim()) {
      recipient = notif.admin_recipient.trim()
    }
    if (typeof notif.admin_panel_url === 'string') {
      data = { ...data, adminUrl: notif.admin_panel_url }
    }
  }

  if (templateName === 'contact-confirmation' && notif.send_customer_confirmation === false) {
    return { effectiveRecipient: recipient, templateData: data, skip: 'customer_confirmation_disabled' }
  }

  return { effectiveRecipient: recipient, templateData: data }
}

async function isSuppressed(supabase: any, email: string): Promise<boolean> {
  const { data } = await supabase
    .from('suppressed_emails')
    .select('id')
    .eq('email', email.toLowerCase())
    .maybeSingle()
  return Boolean(data)
}

function deliverInBackground(params: {
  supabase: any
  smtp: any
  identityOverride: any
  recipient: string
  subject: string
  html: string
  plainText: string
  messageId: string
  templateName: string
}) {
  const { supabase, smtp, identityOverride, recipient, subject, html, plainText, messageId, templateName } = params
  const deliver = (async () => {
    try {
      await sendViaSmtp(smtp, recipient, subject, html, plainText, messageId, identityOverride)
      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: templateName,
        recipient_email: recipient,
        status: 'sent',
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('SMTP send failed', { error: msg, templateName, recipient })
      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: templateName,
        recipient_email: recipient,
        status: 'failed',
        error_message: `SMTP: ${msg}`.slice(0, 500),
      })
    }
  })()

  // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
  if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime?.waitUntil) {
    // @ts-ignore
    EdgeRuntime.waitUntil(deliver)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !supabaseServiceKey) {
    return jsonResponse({ error: 'Server configuration error' }, 500)
  }

  const parsed = await parseRequest(req)
  if ('error' in parsed) return jsonResponse({ error: parsed.error }, 400)
  const { templateName, recipientEmail, messageId, action } = parsed
  let { templateData } = parsed

  const authz = await authorizeCaller(req, supabaseUrl, supabaseServiceKey, templateName, action)
  if (!authz.ok) return jsonResponse({ error: authz.error }, authz.status)

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const smtp = await loadSmtpConfig(supabase)

  if (action === 'test-smtp') {
    return handleTestSmtp({ supabase, smtp, isAdmin: authz.isAdmin, recipientEmail, messageId })
  }

  const template = TEMPLATES[templateName]
  if (!template) {
    return jsonResponse(
      { error: `Template '${templateName}' not found. Available: ${Object.keys(TEMPLATES).join(', ')}` },
      404,
    )
  }

  const notif = await loadNotificationSettings(supabase)
  const overrides = resolveAdminTemplateOverrides(
    templateName,
    templateData,
    notif,
    template.to || recipientEmail,
  )
  if (overrides.skip) {
    return jsonResponse({ success: false, reason: overrides.skip })
  }
  const effectiveRecipient = overrides.effectiveRecipient
  templateData = overrides.templateData

  if (!effectiveRecipient) {
    return jsonResponse({ error: 'recipientEmail is required' }, 400)
  }

  if (!smtp) {
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'failed',
      error_message: 'SMTP not configured',
    })
    return jsonResponse({ error: 'SMTP is not configured. Set it in Admin → Email notifications.' }, 503)
  }

  if (await isSuppressed(supabase, effectiveRecipient)) {
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'suppressed',
    })
    return jsonResponse({ success: false, reason: 'email_suppressed' })
  }

  const { html, plainText, subject } = await renderTemplate(template, templateData, supabase)

  await supabase.from('email_send_log').insert({
    message_id: messageId,
    template_name: templateName,
    recipient_email: effectiveRecipient,
    status: 'pending',
  })

  const identityOverride = await loadIdentityOverride(supabase, templateName)

  deliverInBackground({
    supabase,
    smtp,
    identityOverride,
    recipient: effectiveRecipient,
    subject,
    html,
    plainText,
    messageId,
    templateName,
  })

  return jsonResponse({ success: true, queued: true, messageId })
})

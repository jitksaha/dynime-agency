import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  // Require a shared secret to prevent unauthenticated public abuse.
  // Accept either Authorization: Bearer <secret> or X-Cron-Secret: <secret>.
  // Service-role calls (e.g., from supabase.functions.invoke server-side) are also allowed.
  const cronSecret = Deno.env.get('CRON_SECRET')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authHeader = req.headers.get('Authorization') || ''
  const bearer = authHeader.replace(/^Bearer\s+/i, '').trim()
  const xCron = (req.headers.get('x-cron-secret') || '').trim()
  const authorized =
    (cronSecret && (bearer === cronSecret || xCron === cronSecret)) ||
    (serviceKey && bearer === serviceKey)
  if (!authorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const now = new Date()
  const horizon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const grace = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const results = { reminded: 0, expired: 0, charged: 0, errors: [] as string[] }

  try {
    // 1. Mark services past their grace period as expired
    const { data: expiredRows, error: expErr } = await supabase
      .from('customer_services')
      .update({ status: 'expired' })
      .eq('type', 'recurring')
      .in('status', ['active', 'pending_renewal'])
      .lt('current_period_end', grace)
      .select('id')
    if (expErr) results.errors.push(`expire: ${expErr.message}`)
    results.expired = expiredRows?.length ?? 0

    // 2. Renewal reminders: due within 7 days, not yet reminded today
    const { data: dueServices, error: dueErr } = await supabase
      .from('customer_services')
      .select('*')
      .eq('type', 'recurring')
      .eq('status', 'active')
      .lte('current_period_end', horizon)
      .gte('current_period_end', now.toISOString())

    if (dueErr) throw dueErr

    for (const svc of dueServices || []) {
      const periodEnd = new Date(svc.current_period_end)
      const daysRemaining = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / 86400000))

      // Skip if already reminded in last 24h
      const { data: recent } = await supabase
        .from('service_renewals')
        .select('id')
        .eq('customer_service_id', svc.id)
        .gte('attempted_at', new Date(now.getTime() - 86400000).toISOString())
        .limit(1)
      if (recent && recent.length > 0) continue

      // Auto-charge if enabled and method available
      if (svc.auto_renew && svc.payment_method) {
        try {
          const { error: chargeErr } = await supabase.functions.invoke('process-payment', {
            body: {
              renewal: true,
              customer_service_id: svc.id,
              amount: svc.price,
              currency: svc.currency,
              customer_email: svc.customer_email,
              payment_method: svc.payment_method,
            },
          })
          if (chargeErr) throw chargeErr
          await supabase.from('service_renewals').insert({
            customer_service_id: svc.id,
            outcome: 'charged',
            amount: svc.price,
            notes: 'Auto-renewal charge attempted',
          })
          results.charged++
          continue
        } catch (e) {
          await supabase.from('service_renewals').insert({
            customer_service_id: svc.id,
            outcome: 'failed',
            amount: svc.price,
            notes: String(e),
          })
        }
      }

      // Otherwise send email reminder
      try {
        await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'service-renewal-reminder',
            recipientEmail: svc.customer_email,
            templateData: {
              name: svc.customer_email.split('@')[0],
              serviceName: svc.service_name,
              renewalDate: periodEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
              daysRemaining,
              amount: `${svc.currency} ${Number(svc.price).toFixed(2)}`,
              cycle: svc.billing_cycle,
              manageUrl: 'https://dynime.com/account/services/recurring',
            },
          },
        })
        await supabase.from('service_renewals').insert({
          customer_service_id: svc.id,
          outcome: 'email_sent',
          notes: `Reminder sent (${daysRemaining}d remaining)`,
        })
        await supabase.from('customer_services').update({ status: 'pending_renewal' }).eq('id', svc.id)
        results.reminded++
      } catch (e) {
        results.errors.push(`email ${svc.id}: ${e}`)
      }
    }

    return new Response(JSON.stringify({ ok: true, ...results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e), ...results }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

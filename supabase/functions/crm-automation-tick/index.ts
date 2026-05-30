// CRM workflow runner - processes due workflow_runs every minute via pg_cron.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

function interpolate(s: string, lead: any): string {
  if (!s) return s;
  return s.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => String(lead?.[k] ?? ""));
}

async function sendEmail(lead: any, cfg: any) {
  if (!lead.email) throw new Error("Lead has no email");
  let subject = cfg.subject || "";
  let body = cfg.body_html || "";
  if (cfg.template_id) {
    const { data: tpl } = await sb.from("crm_email_templates").select("*").eq("id", cfg.template_id).maybeSingle();
    if (tpl) { subject = tpl.subject; body = tpl.body_html; }
  }
  subject = interpolate(subject, lead);
  body = interpolate(body, lead);

  await sb.functions.invoke("send-transactional-email", {
    body: {
      to: lead.email,
      subject,
      html: body,
      purpose: "transactional",
      idempotency_key: `wf-${lead.id}-${Date.now()}`,
    },
  }).catch(() => null);
}


async function execStep(step: any, lead: any, run: any): Promise<{ delayMs: number; cancel?: boolean }> {
  const cfg = step.config || {};
  switch (step.step_type) {
    case "delay": {
      const minutes = Number(cfg.minutes || 0) + Number(cfg.hours || 0) * 60 + Number(cfg.days || 0) * 1440;
      return { delayMs: minutes * 60_000 };
    }
    case "condition": {
      // simple: { field, op, value } op: eq, neq, gt, lt, contains
      const v = lead?.[cfg.field];
      const target = cfg.value;
      let pass = true;
      switch (cfg.op) {
        case "eq": pass = String(v) === String(target); break;
        case "neq": pass = String(v) !== String(target); break;
        case "gt": pass = Number(v) > Number(target); break;
        case "lt": pass = Number(v) < Number(target); break;
        case "contains": pass = String(v || "").toLowerCase().includes(String(target).toLowerCase()); break;
      }
      if (!pass) return { delayMs: 0, cancel: true };
      return { delayMs: 0 };
    }
    case "send_email":
      await sendEmail(lead, cfg);
      return { delayMs: 0 };
    case "create_task":
      await sb.from("crm_activities").insert({
        lead_id: lead.id,
        type: cfg.activity_type || "task",
        subject: interpolate(cfg.subject || "Follow up", lead),
        description: interpolate(cfg.description || "", lead),
        due_at: cfg.due_in_days ? new Date(Date.now() + Number(cfg.due_in_days) * 86400000).toISOString() : null,
        priority: cfg.priority || "normal",
        status: "open",
        assignee_id: lead.owner_id || null,
      });
      return { delayMs: 0 };
    case "update_score": {
      const delta = Number(cfg.delta || 0);
      const newScore = Math.max(0, Math.min(100, (lead.score || 0) + delta));
      await sb.from("crm_leads").update({ score: newScore }).eq("id", lead.id);
      return { delayMs: 0 };
    }
    case "change_status":
      if (cfg.status) await sb.from("crm_leads").update({ status: cfg.status }).eq("id", lead.id);
      return { delayMs: 0 };
    case "add_tag": {
      const tags = Array.isArray(lead.tags) ? lead.tags : [];
      if (cfg.tag && !tags.includes(cfg.tag)) {
        await sb.from("crm_leads").update({ tags: [...tags, cfg.tag] }).eq("id", lead.id);
      }
      return { delayMs: 0 };
    }
    case "assign_owner":
      if (cfg.owner_id) await sb.from("crm_leads").update({ owner_id: cfg.owner_id }).eq("id", lead.id);
      return { delayMs: 0 };
    default:
      return { delayMs: 0 };
  }
}

async function processRun(run: any) {
  // Load lead + steps
  const { data: lead } = await sb.from("crm_leads").select("*").eq("id", run.lead_id).maybeSingle();
  if (!lead) {
    await sb.from("crm_workflow_runs").update({ status: "cancelled", last_error: "Lead not found", completed_at: new Date().toISOString() }).eq("id", run.id);
    return;
  }
  const { data: steps } = await sb.from("crm_workflow_steps").select("*").eq("workflow_id", run.workflow_id).order("position");
  const list = steps || [];
  if (run.current_step >= list.length) {
    await sb.from("crm_workflow_runs").update({ status: "done", completed_at: new Date().toISOString() }).eq("id", run.id);
    return;
  }
  await sb.from("crm_workflow_runs").update({ status: "running" }).eq("id", run.id);

  const step = list[run.current_step];
  try {
    const { delayMs, cancel } = await execStep(step, lead, run);
    if (cancel) {
      await sb.from("crm_workflow_runs").update({ status: "cancelled", completed_at: new Date().toISOString(), last_error: "Condition not met" }).eq("id", run.id);
      return;
    }
    const next = run.current_step + 1;
    if (next >= list.length) {
      await sb.from("crm_workflow_runs").update({ status: "done", current_step: next, completed_at: new Date().toISOString() }).eq("id", run.id);
    } else {
      await sb.from("crm_workflow_runs").update({
        status: "pending",
        current_step: next,
        next_run_at: new Date(Date.now() + delayMs).toISOString(),
        last_error: null,
      }).eq("id", run.id);
    }
  } catch (e: any) {
    const retries = (run.retries || 0) + 1;
    if (retries >= 5) {
      await sb.from("crm_workflow_runs").update({ status: "failed", retries, last_error: String(e.message || e), completed_at: new Date().toISOString() }).eq("id", run.id);
    } else {
      const backoffMs = Math.min(60 * 60 * 1000, Math.pow(2, retries) * 60_000);
      await sb.from("crm_workflow_runs").update({
        status: "pending",
        retries,
        next_run_at: new Date(Date.now() + backoffMs).toISOString(),
        last_error: String(e.message || e),
      }).eq("id", run.id);
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Auth guard: only pg_cron / admin callers with the shared secret or service role key
  const cronSecret = Deno.env.get("CRON_SECRET");
  const bearer = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim();
  const xCron = req.headers.get("x-cron-secret")?.trim();
  const authorized =
    (cronSecret && (bearer === cronSecret || xCron === cronSecret)) ||
    (SERVICE_KEY && bearer === SERVICE_KEY);
  if (!authorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { data: due, error } = await sb
      .from("crm_workflow_runs")
      .select("*")
      .eq("status", "pending")
      .lte("next_run_at", new Date().toISOString())
      .order("next_run_at")
      .limit(25);
    if (error) throw error;
    const runs = due || [];
    for (const r of runs) {
      await processRun(r);
    }
    return new Response(JSON.stringify({ processed: runs.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

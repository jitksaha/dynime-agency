import { supabase } from "@/integrations/supabase/client";

type SubmissionRow = { label: string; value: string };

interface NotifyOptions {
  formType: string;                 // e.g. "quote request", "contact message"
  customerName?: string;
  customerEmail: string;
  fields: Record<string, unknown>;  // raw form payload
  source?: string;                  // for idempotency key
  adminRecipient?: string;          // override default admin recipient
}

const HUMAN_LABELS: Record<string, string> = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  company: "Company",
  service: "Service",
  budget: "Budget",
  timeline: "Timeline",
  message: "Message",
  notes: "Notes",
};

const HIDDEN = new Set(["consent", "source", "submitted_at"]);

function toRows(fields: Record<string, unknown>): SubmissionRow[] {
  return Object.entries(fields)
    .filter(([k, v]) => !HIDDEN.has(k) && v !== undefined && v !== null && v !== "")
    .map(([k, v]) => ({
      label: HUMAN_LABELS[k] ?? k.replace(/_/g, " "),
      value: typeof v === "string" ? v : JSON.stringify(v),
    }));
}

interface NotificationConfig {
  enabled: boolean;
  admin_recipient: string;
  send_customer_confirmation: boolean;
  admin_panel_url?: string;
}

async function loadConfig(): Promise<NotificationConfig> {
  // Public clients can't read notification_settings (admin-only RLS), so we
  // ship safe defaults. Admin overrides apply on the server side via a future
  // server-read in the edge function. Defaults match the seeded row.
  return {
    enabled: true,
    admin_recipient: "contact@dynime.com",
    send_customer_confirmation: true,
    admin_panel_url: "https://dynime.com/superadmin/submissions",
  };
}

/**
 * Fire-and-forget email notifications after a form submission.
 * Sends:
 *   1. Admin alert to contact@dynime.com (configurable in admin panel).
 *   2. Customer confirmation to the submitter.
 * Failures are logged but never thrown — they must NOT break form submission.
 */
export async function notifySubmission(opts: NotifyOptions): Promise<void> {
  try {
    const cfg = await loadConfig();
    if (!cfg.enabled) return;

    const submission = toRows(opts.fields);
    const idBase = opts.source ?? "submission";
    const stamp = `${idBase}-${Date.now()}`;

    const adminPayload = {
      templateName: "admin-new-submission",
      recipientEmail: opts.adminRecipient || cfg.admin_recipient,
      idempotencyKey: `admin-${stamp}`,
      templateData: {
        formType: opts.formType,
        customerName: opts.customerName,
        customerEmail: opts.customerEmail,
        submission,
        adminUrl: cfg.admin_panel_url,
      },
    };

    const customerPayload = cfg.send_customer_confirmation
      ? {
          templateName: "contact-confirmation",
          recipientEmail: opts.customerEmail,
          idempotencyKey: `cust-${stamp}`,
          templateData: {
            name: opts.customerName,
            formType: opts.formType,
            summary: submission,
          },
        }
      : null;

    // Fire both in parallel; await to surface errors in console but don't throw.
    const sends: Promise<unknown>[] = [
      supabase.functions.invoke("send-transactional-email", { body: adminPayload }),
    ];
    if (customerPayload) {
      sends.push(
        supabase.functions.invoke("send-transactional-email", { body: customerPayload }),
      );
    }
    const results = await Promise.allSettled(sends);
    results.forEach((r) => {
      if (r.status === "rejected") console.warn("[notify] send failed:", r.reason);
    });
  } catch (err) {
    console.warn("[notify] unexpected error:", err);
  }
}

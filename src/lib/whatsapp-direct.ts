/**
 * whatsapp-direct.ts
 *
 * Calls the Meta WhatsApp Cloud API directly from the browser
 * using credentials saved in notification_settings.
 *
 * This avoids reliance on an edge function and works as long as
 * the Meta token has been configured in the WhatsApp Config tab.
 */
import { db } from "@/integrations/db/client";

interface WhatsAppConfig {
  enabled: boolean;
  access_token: string;
  phone_number_id: string;
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/** Loads the WhatsApp config saved in notification_settings */
export async function loadWhatsAppConfig(): Promise<WhatsAppConfig | null> {
  const { data, error } = await db
    .from("notification_settings")
    .select("value")
    .eq("key", "whatsapp_config")
    .maybeSingle();

  if (error || !data?.value) return null;
  return data.value as unknown as WhatsAppConfig;
}

/**
 * Send a plain-text WhatsApp message via Meta Cloud API.
 *
 * @param phone    Recipient phone number including country code, e.g. "+8801711..."
 * @param message  The text body to send
 */
export async function sendWhatsAppMessage(
  phone: string,
  message: string
): Promise<SendResult> {
  // 1. Load config
  const config = await loadWhatsAppConfig();

  if (!config) {
    return { success: false, error: "WhatsApp configuration not found. Please save your API Config first." };
  }
  if (!config.enabled) {
    return { success: false, error: "WhatsApp notifications are disabled. Enable them in the API Config tab." };
  }
  if (!config.access_token || !config.phone_number_id) {
    return { success: false, error: "WhatsApp Cloud API token or Phone Number ID is missing. Please check API Config." };
  }

  // 2. Sanitize phone — remove spaces/dashes but keep the leading +
  const sanitizedPhone = phone.replace(/[\s\-\(\)]/g, "");

  // 3. Call Meta Graph API
  const url = `https://graph.facebook.com/v21.0/${config.phone_number_id}/messages`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: sanitizedPhone,
        type: "text",
        text: { preview_url: false, body: message },
      }),
    });

    const data = await res.json();

    if (res.ok && data?.messages?.[0]?.id) {
      // 4. Log success to whatsapp_send_log
      await db.from("whatsapp_send_log").insert({
        message_id: data.messages[0].id,
        template_name: "direct_text",
        recipient_phone: sanitizedPhone,
        status: "dispatched",
        error_message: null,
      }).then(() => {/* fire-and-forget */});

      return { success: true, messageId: data.messages[0].id };
    }

    const errMsg = data?.error?.message || "Meta API returned an error";

    // Log failure
    await db.from("whatsapp_send_log").insert({
      message_id: null,
      template_name: "direct_text",
      recipient_phone: sanitizedPhone,
      status: "failed",
      error_message: errMsg,
    }).then(() => {});

    return { success: false, error: errMsg };
  } catch (e: any) {
    return { success: false, error: e.message || "Network error contacting Meta API" };
  }
}

/**
 * Send a WhatsApp message using a named template from notification_settings.
 * Replaces {{1}}, {{2}}, ... with the provided vars array.
 */
export async function sendWhatsAppTemplate(
  phone: string,
  templateKey: string,
  vars: string[],
  customMessage?: string
): Promise<SendResult> {
  // If it's a custom message, send as plain text
  if (templateKey === "custom" && customMessage) {
    return sendWhatsAppMessage(phone, customMessage);
  }

  // Load templates
  const { data: tplRow } = await db
    .from("notification_settings")
    .select("value")
    .eq("key", "whatsapp_templates")
    .maybeSingle();

  let messageBody = customMessage || "";

  if (tplRow?.value && Array.isArray(tplRow.value)) {
    const tpl = (tplRow.value as any[]).find((t: any) => t.key === templateKey);
    if (tpl?.body) {
      messageBody = tpl.body;
      vars.forEach((val, idx) => {
        messageBody = messageBody.replace(`{{${idx + 1}}}`, val);
      });
    }
  }

  if (!messageBody) {
    return { success: false, error: "Template not found or message body is empty." };
  }

  return sendWhatsAppMessage(phone, messageBody);
}

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { db } from "@/integrations/db/client";
import { Send, Loader2, MessageSquare } from "lucide-react";
import { sendWhatsAppTemplate } from "@/lib/whatsapp-direct";

export interface WhatsAppTemplate {
  key: string;
  label: string;
  body: string;
  variables: string[];
}

const TEMPLATE_DEFAULTS: WhatsAppTemplate[] = [
  {
    key: "custom",
    label: "Custom Message (No Template)",
    body: "",
    variables: [],
  },
  {
    key: "order_update",
    label: "Order Status Update",
    body: "Hello {{1}}, your order {{2}} status is now: {{3}}. Thank you for choosing Dynime!",
    variables: ["Customer Name", "Order ID", "Status"],
  },
  {
    key: "payment_link",
    label: "Payment Link / Invoice",
    body: "Hi {{1}}, here is your payment link for invoice {{2}} of amount {{3}}: {{4}}",
    variables: ["Customer Name", "Invoice Number", "Amount", "Link"],
  },
  {
    key: "recurring_service",
    label: "Recurring Service Renewal Alert",
    body: "Hello {{1}}, this is a reminder that your recurring service '{{2}}' is due for renewal on {{3}}. Amount: {{4}}.",
    variables: ["Customer Name", "Service Name", "Renewal Date", "Amount"],
  },
  {
    key: "job_confirmation",
    label: "Job Application Update",
    body: "Hi {{1}}, thank you for applying for the '{{2}}' role. We have received your application and will review it shortly.",
    variables: ["Applicant Name", "Job Role"],
  },
  {
    key: "id_verification",
    label: "ID Card Verification",
    body: "Hello {{1}}, your ID Card assignment status is now: {{2}}.",
    variables: ["Subject Name", "Status"],
  },
  {
    key: "credit_application",
    label: "Credit Application Update",
    body: "Hi {{1}}, your credit application/FlexPay status is now: {{2}}.",
    variables: ["Applicant Name", "Status"],
  },
];

interface WhatsAppSendDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recipientPhone: string;
  recipientName?: string;
  defaultTemplateKey?: string;
  defaultVars?: Record<number, string>;
}

export default function WhatsAppSendDialog({
  isOpen,
  onClose,
  recipientPhone,
  recipientName = "",
  defaultTemplateKey = "custom",
  defaultVars = {},
}: WhatsAppSendDialogProps) {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>(TEMPLATE_DEFAULTS);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState(defaultTemplateKey);
  const [phone, setPhone] = useState(recipientPhone);
  const [varValues, setVarValues] = useState<Record<number, string>>(defaultVars);
  const [customBody, setCustomBody] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);

  // Sync props when opening
  useEffect(() => {
    if (isOpen) {
      setPhone(recipientPhone);
      setSelectedTemplateKey(defaultTemplateKey);
      setVarValues(defaultVars);
      fetchTemplates();
    }
  }, [isOpen, recipientPhone, defaultTemplateKey, defaultVars]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data } = await db
        .from("notification_settings")
        .select("value")
        .eq("key", "whatsapp_templates")
        .maybeSingle();

      if (data?.value && Array.isArray(data.value)) {
        // Merge DB templates with default ones to ensure all are available
        const dbTemplates = data.value as WhatsAppTemplate[];
        const merged = [...TEMPLATE_DEFAULTS];
        dbTemplates.forEach((dt) => {
          const idx = merged.findIndex((m) => m.key === dt.key);
          if (idx !== -1) {
            merged[idx] = dt;
          } else {
            merged.push(dt);
          }
        });
        setTemplates(merged);
      }
    } catch (e) {
      console.error("Failed to load custom templates", e);
    } finally {
      setLoading(false);
    }
  };

  const activeTemplate = templates.find((t) => t.key === selectedTemplateKey) || templates[0];

  // Sync preview body
  useEffect(() => {
    if (selectedTemplateKey === "custom") {
      setCustomBody("");
    } else {
      let body = activeTemplate.body;
      activeTemplate.variables.forEach((_, idx) => {
        const placeholder = `{{${idx + 1}}}`;
        const val = varValues[idx] || `[${activeTemplate.variables[idx]}]`;
        body = body.replace(placeholder, val);
      });
      setCustomBody(body);
    }
  }, [selectedTemplateKey, varValues, templates, activeTemplate]);

  const handleVarChange = (idx: number, val: string) => {
    setVarValues((prev) => ({ ...prev, [idx]: val }));
  };

  const handleSend = async () => {
    if (!phone.trim()) {
      toast.error("Recipient phone number is required.");
      return;
    }

    setSending(true);
    try {
      const vars = selectedTemplateKey === "custom"
        ? []
        : Object.keys(varValues)
            .sort((a, b) => Number(a) - Number(b))
            .map(k => varValues[Number(k)]);

      const result = await sendWhatsAppTemplate(
        phone,
        selectedTemplateKey,
        vars,
        selectedTemplateKey === "custom" ? customBody : undefined
      );

      if (result.success) {
        // Log to whatsapp_send_log
        await db.from("whatsapp_send_log").upsert({
          message_id: result.messageId || null,
          template_name: selectedTemplateKey,
          recipient_phone: phone,
          status: "dispatched",
          error_message: null,
        });
        toast.success("WhatsApp message sent successfully! ✓");
        onClose();
      } else {
        toast.error(result.error || "Failed to send WhatsApp message.");
      }
    } catch (e: any) {
      toast.error("Send error: " + e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl border-border/80 bg-card/95 backdrop-blur-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-500" /> Send WhatsApp Notification
          </DialogTitle>
          <DialogDescription>
            Dispatch template alerts or direct messages to {recipientName || "recipient"} via Meta Cloud API.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="wa-dialog-phone">Phone Number (with Country Code)</Label>
              <Input
                id="wa-dialog-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1..."
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="wa-dialog-template">Notification Template</Label>
              <Select value={selectedTemplateKey} onValueChange={(v) => { setSelectedTemplateKey(v); }}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.key} value={t.key}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {activeTemplate.variables.length > 0 && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Template Fields Autofill</span>
              <div className="grid grid-cols-1 gap-2.5">
                {activeTemplate.variables.map((vName, idx) => (
                  <div key={idx} className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">{vName}</Label>
                    <Input
                      value={varValues[idx] || ""}
                      onChange={(e) => handleVarChange(idx, e.target.value)}
                      placeholder={`Enter ${vName.toLowerCase()}`}
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="wa-dialog-preview">Message Body Preview</Label>
            <Textarea
              id="wa-dialog-preview"
              value={customBody}
              onChange={(e) => setCustomBody(e.target.value)}
              placeholder="Write a custom message body..."
              className="mt-1 min-h-[100px] text-sm"
              disabled={selectedTemplateKey !== "custom"}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending || loading} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send Message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
import { sendWhatsAppTemplate, TEMPLATE_DEFAULTS, type WhatsAppTemplate } from "@/lib/whatsapp-direct";

interface WhatsAppSendDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recipientPhone: string;
  recipientName?: string;
  defaultTemplateKey?: string;
  defaultVars?: Record<number, string>;
}

const normalizeLabel = (label: string) => {
  return label.toLowerCase().replace(/[^a-z0-9]/g, "");
};

const getSemanticKey = (norm: string) => {
  if (norm.includes("name")) return "name";
  if (norm.includes("phone") || norm.includes("mobile") || norm.includes("number")) {
    if (norm.includes("invoice") || norm.includes("order") || norm.includes("id")) {
      return "id";
    }
    return "phone";
  }
  if (norm.includes("id") || norm.includes("invoice") || norm.includes("order") || norm.includes("ref")) return "id";
  if (norm.includes("status")) return "status";
  if (norm.includes("role") || norm.includes("job") || norm.includes("service")) return "service";
  return norm;
};

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
  
  // Semantic Map state to store variables contextually
  const [semanticMap, setSemanticMap] = useState<Record<string, string>>({});

  // Sync props when opening
  useEffect(() => {
    if (isOpen) {
      setPhone(recipientPhone);
      setSelectedTemplateKey(defaultTemplateKey);
      setVarValues(defaultVars);
      fetchTemplates();
    }
  }, [isOpen, recipientPhone, defaultTemplateKey, defaultVars]);

  // Build semanticMap when dialog is open and templates are loaded
  useEffect(() => {
    if (isOpen && templates.length > 0) {
      const initialMap: Record<string, string> = {
        name: recipientName,
        phone: recipientPhone,
      };

      const defaultTpl = templates.find((t) => t.key === defaultTemplateKey);
      if (defaultTpl) {
        defaultTpl.variables.forEach((vName, idx) => {
          const val = defaultVars[idx];
          if (val !== undefined && val !== null) {
            const norm = normalizeLabel(vName);
            initialMap[norm] = val;
            const semKey = getSemanticKey(norm);
            initialMap[semKey] = val;
          }
        });
      }

      setSemanticMap(initialMap);
    }
  }, [isOpen, defaultTemplateKey, defaultVars, templates, recipientName, recipientPhone]);

  // Prefill variables semantically when template changes
  useEffect(() => {
    if (!isOpen) return;

    const activeTpl = templates.find((t) => t.key === selectedTemplateKey);
    if (!activeTpl) return;

    const newValues: Record<number, string> = {};
    activeTpl.variables.forEach((vName, idx) => {
      const norm = normalizeLabel(vName);
      const semKey = getSemanticKey(norm);

      if (semanticMap[norm] !== undefined) {
        newValues[idx] = semanticMap[norm];
      } else if (semanticMap[semKey] !== undefined) {
        newValues[idx] = semanticMap[semKey];
      } else if (selectedTemplateKey === defaultTemplateKey && defaultVars[idx] !== undefined) {
        newValues[idx] = defaultVars[idx];
      } else if (semKey === "name") {
        newValues[idx] = recipientName;
      } else if (semKey === "phone") {
        newValues[idx] = phone || recipientPhone;
      } else {
        newValues[idx] = "";
      }
    });

    setVarValues(newValues);
  }, [selectedTemplateKey, templates, semanticMap, isOpen, defaultTemplateKey, defaultVars, recipientName, recipientPhone]);

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

    const vName = activeTemplate?.variables?.[idx];
    if (vName) {
      const norm = normalizeLabel(vName);
      const semKey = getSemanticKey(norm);
      setSemanticMap((prev) => ({
        ...prev,
        [norm]: val,
        [semKey]: val,
      }));
    }
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
            {activeTemplate.mode === "template" && (
              <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium my-0.5">
                Note: This is registered as a Meta Approved Template. The body below is a preview; variables will be sent as structured parameters to Meta.
              </p>
            )}
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

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { db } from "@/integrations/db/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Settings, RefreshCw, AlertTriangle, CheckCircle2, Ban, Send, Save, Loader2, ListFilter } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import SectionHelp from "@/components/admin/SectionHelp";

interface WhatsAppConfig {
  enabled: boolean;
  access_token: string;
  phone_number_id: string;
}

interface WhatsAppTemplate {
  key: string;
  label: string;
  body: string;
  variables: string[]; // e.g. ["customer_name", "order_id"]
}

interface WhatsAppLog {
  id: string;
  message_id: string;
  template_name: string;
  recipient_phone: string;
  status: string;
  error_message: string | null;
  created_at: string;
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
];

export default function AdminWhatsAppPortal() {
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingTemplates, setSavingTemplates] = useState(false);
  // Tracks what was last successfully saved (for the saved-info card)
  const [savedSnapshot, setSavedSnapshot] = useState<WhatsAppConfig | null>(null);
  const [showToken, setShowToken] = useState(false);

  // Configurations state
  const [config, setConfig] = useState<WhatsAppConfig>({
    enabled: true,
    access_token: "",
    phone_number_id: "",
  });

  // Templates state
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>(TEMPLATE_DEFAULTS);

  // Send Direct Message State
  const [sendPhone, setSendPhone] = useState("");
  const [selectedTemplateKey, setSelectedTemplateKey] = useState("custom");
  const [varValues, setVarValues] = useState<Record<string, string>>({});
  const [customBody, setCustomBody] = useState("");

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "direct";

  const handleTabChange = (val: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", val);
      return next;
    }, { replace: true });
  };

  const fetchPortalData = async () => {
    setLoading(true);
    try {
      // 1. Fetch configs
      const { data: configRow } = await db
        .from("notification_settings")
        .select("value")
        .eq("key", "whatsapp_config")
        .maybeSingle();

      if (configRow?.value) {
        const loaded = { ...{ enabled: true, access_token: "", phone_number_id: "" }, ...(configRow.value as any) };
        setConfig(loaded);
        // Show saved-info card for already-persisted config on load
        if (loaded.phone_number_id || loaded.access_token) setSavedSnapshot(loaded);
      }

      // 2. Fetch templates
      const { data: templateRow } = await db
        .from("notification_settings")
        .select("value")
        .eq("key", "whatsapp_templates")
        .maybeSingle();

      if (templateRow?.value && Array.isArray(templateRow.value)) {
        setTemplates(templateRow.value as WhatsAppTemplate[]);
      }

      // 3. Fetch logs
      const { data: logsRows } = await db
        .from("whatsapp_send_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (logsRows) {
        setLogs(logsRows as WhatsAppLog[]);
      }
    } catch (e: any) {
      toast.error("Failed to load portal configuration: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortalData();
  }, []);

  const saveConfig = async () => {
    setSavingConfig(true);
    try {
      const { error } = await db
        .from("notification_settings")
        .upsert(
          { key: "whatsapp_config", value: config as any },
          { onConflict: "key" }
        );

      if (error) throw error;
      setSavedSnapshot({ ...config }); // capture what was just saved
      setShowToken(false);             // re-mask the token on save
      toast.success("WhatsApp configuration saved successfully.");
    } catch (e: any) {
      toast.error("Failed to save configuration: " + e.message);
    } finally {
      setSavingConfig(false);
    }
  };

  const saveTemplates = async () => {
    setSavingTemplates(true);
    try {
      const { error } = await db
        .from("notification_settings")
        .upsert(
          { key: "whatsapp_templates", value: templates as any },
          { onConflict: "key" }
        );

      if (error) throw error;
      toast.success("WhatsApp templates saved successfully.");
    } catch (e: any) {
      toast.error("Failed to save templates: " + e.message);
    } finally {
      setSavingTemplates(false);
    }
  };

  // Watch for template changes to autofill variable fields or custom text area
  const activeTemplate = templates.find((t) => t.key === selectedTemplateKey) || templates[0];

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
  }, [selectedTemplateKey, varValues, templates]);

  const handleVarChange = (index: number, val: string) => {
    setVarValues((prev) => ({ ...prev, [index]: val }));
  };

  const handleTemplateBodyChange = (key: string, body: string) => {
    setTemplates((prev) =>
      prev.map((t) => (t.key === key ? { ...t, body } : t))
    );
  };

  const triggerSendMessage = async () => {
    if (!sendPhone.trim()) {
      toast.error("Phone number is required.");
      return;
    }

    setSending(true);
    try {
      const payload = {
        phone: sendPhone,
        templateName: selectedTemplateKey,
        message: customBody,
        vars: selectedTemplateKey === "custom" ? [] : Object.values(varValues),
      };

      const res = await db.functions.invoke("send-whatsapp-test", {
        body: payload,
      });

      if (res.error) {
        toast.error("Failed to send message: " + (res.error.message || "Unknown error"));
      } else if (res.data?.success === false) {
        toast.error("Delivery failed: " + (res.data.error || "Unknown response error"));
      } else {
        toast.success("WhatsApp message dispatched successfully!");
        // Fetch logs fresh
        const { data: logsRows } = await db
          .from("whatsapp_send_log")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200);
        if (logsRows) {
          setLogs(logsRows as WhatsAppLog[]);
        }
      }
    } catch (e: any) {
      toast.error("Dispatch error: " + e.message);
    } finally {
      setSending(false);
    }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, { label: string; cls: string; icon: any }> = {
      sent: { label: "Dispatched", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
      failed: { label: "Failed", cls: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30", icon: AlertTriangle },
    };
    const v = map[s] || { label: s, cls: "bg-muted text-muted-foreground border-border", icon: MessageSquare };
    const Icon = v.icon;
    return (
      <Badge variant="outline" className={`gap-1 ${v.cls}`}>
        <Icon className="h-3 w-3" /> {v.label}
      </Badge>
    );
  };

  const filteredLogs = logs.filter(
    (l) =>
      l.recipient_phone.toLowerCase().includes(search.toLowerCase()) ||
      l.template_name.toLowerCase().includes(search.toLowerCase()) ||
      (l.error_message && l.error_message.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-500 to-indigo-500 bg-clip-text text-transparent">WhatsApp Notification Portal</h1>
            <p className="text-sm text-muted-foreground">Manage templates, direct message broadcasts, automated alert rules, and delivery logs.</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchPortalData} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        <SectionHelp
          storageKey="whatsapp-portal"
          title="How to set up & use the WhatsApp Notification Portal"
          subtitle="API Config → Templates → Send. Click to expand the full guide."
          steps={[
            "Go to the 'API Config' tab first. Paste your Meta Business Phone Number ID and your Permanent System User Access Token, then toggle 'Enable WhatsApp Notifications' ON and click Save.",
            "Go to 'Templates Settings' to customise the message body for each notification type (order updates, payment links, ID verification, etc.). Variables like {{1}}, {{2}} are auto-filled when sending from a record page.",
            "Use the 'Send Message' tab to manually broadcast a message to any phone number. Select a template, fill in the variables, or switch to Custom Message for free-text.",
            "Every sent message is logged under 'Delivery Logs' with timestamp, template used, recipient, status (Dispatched/Failed), and Meta's message ID.",
            "To send from a specific record, click the green WhatsApp icon on any Orders, Verifications, Job Applications, or Credit row — the dialog opens pre-filled.",
          ]}
          tips={[
            "You can get the Phone Number ID from your WhatsApp Business app in Meta for Developers → My Apps → WhatsApp → API Setup.",
            "Always use a Permanent System User Token (from Business Settings → System Users), NOT a temporary user token — it expires after 60 days.",
            "Template variables {{1}}, {{2}} map to the order they are listed under each template in the Templates tab.",
            "Use the 'Custom Message' template key when you need to send a one-off message that doesn't fit a standard template.",
          ]}
          warnings={[
            "Never share your Access Token. It grants full send access to your WhatsApp Business number.",
            "If 'Enable WhatsApp Notifications' is OFF, the Send button will still show on record pages but messages will not be dispatched.",
          ]}
        />

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-muted/40 p-1 rounded-lg border border-border/60">
            <TabsTrigger value="direct">Send Message</TabsTrigger>
            <TabsTrigger value="templates">Templates Settings</TabsTrigger>
            <TabsTrigger value="config">API Config</TabsTrigger>
            <TabsTrigger value="logs">Delivery Logs</TabsTrigger>
          </TabsList>

          {/* 1. Send Message Tab */}
          <TabsContent value="direct" className="space-y-6 mt-4">
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-2 border-b border-border/40 pb-4">
                  <Send className="w-5 h-5 text-emerald-500" />
                  <div>
                    <h2 className="font-semibold text-lg">Send Custom & Template Alerts</h2>
                    <p className="text-xs text-muted-foreground">Select a preconfigured template to autofill variables, or write a direct custom text message.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column inputs */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="send-phone">Recipient Phone (Include country code, e.g. +1...)</Label>
                      <Input
                        id="send-phone"
                        value={sendPhone}
                        onChange={(e) => setSendPhone(e.target.value)}
                        placeholder="+1 (555) 019-2834"
                        className="mt-1.5"
                      />
                    </div>

                    <div>
                      <Label htmlFor="template-select">Message Template</Label>
                      <Select value={selectedTemplateKey} onValueChange={(v) => { setSelectedTemplateKey(v); setVarValues({}); }}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="Select a template" />
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

                    {/* Dynamic Autofill Variable Fields */}
                    {activeTemplate.variables.length > 0 && (
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Autofill Template Variables</span>
                        <div className="grid grid-cols-1 gap-3">
                          {activeTemplate.variables.map((vName, idx) => (
                            <div key={idx}>
                              <Label className="text-xs text-muted-foreground">{vName}</Label>
                              <Input
                                size={28}
                                value={varValues[idx] || ""}
                                onChange={(e) => handleVarChange(idx, e.target.value)}
                                placeholder={`Enter ${vName.toLowerCase()}`}
                                className="mt-1 h-8 text-sm"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column message preview & Custom body */}
                  <div className="space-y-4 flex flex-col justify-between">
                    <div>
                      <Label htmlFor="custom-body">Message Body (Live Preview / Custom edit)</Label>
                      <Textarea
                        id="custom-body"
                        value={customBody}
                        onChange={(e) => setCustomBody(e.target.value)}
                        placeholder="Write a custom message..."
                        className="mt-1.5 font-sans min-h-[160px]"
                        disabled={selectedTemplateKey !== "custom"}
                      />
                    </div>

                    <Button onClick={triggerSendMessage} disabled={sending || !config.enabled} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-2">
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Send WhatsApp Message
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 2. Templates Settings Tab */}
          <TabsContent value="templates" className="space-y-6 mt-4">
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-border/40 pb-4">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-indigo-500" />
                    <div>
                      <h2 className="font-semibold text-lg">Autofill Templates Mappings</h2>
                      <p className="text-xs text-muted-foreground">Customize template bodies that trigger on transaction events or direct alerts.</p>
                    </div>
                  </div>
                  <Button onClick={saveTemplates} disabled={savingTemplates} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                    {savingTemplates ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Templates
                  </Button>
                </div>

                <div className="space-y-4">
                  {templates.filter(t => t.key !== "custom").map((t) => (
                    <div key={t.key} className="rounded-xl border border-border p-4 space-y-3 bg-muted/20">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground">{t.label}</span>
                        <code className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">{t.key}</code>
                      </div>
                      <div>
                        <Label htmlFor={`t-body-${t.key}`} className="text-xs">Template Body</Label>
                        <Textarea
                          id={`t-body-${t.key}`}
                          value={t.body}
                          onChange={(e) => handleTemplateBodyChange(t.key, e.target.value)}
                          className="mt-1.5 min-h-[80px]"
                        />
                        <div className="flex gap-2 flex-wrap mt-2">
                          {t.variables.map((vName, idx) => (
                            <Badge key={idx} variant="outline" className="text-[10px] font-mono">
                              {"{{"}{idx + 1}{"}}"} : {vName}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 3. API Config Tab */}
          <TabsContent value="config" className="space-y-6 mt-4">
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-border/40 pb-4">
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-primary" />
                    <div>
                      <h2 className="font-semibold text-lg">Meta Business Cloud API Configuration</h2>
                      <p className="text-xs text-muted-foreground">Provide credentials of your Meta Graph API platform to initiate sending.</p>
                    </div>
                  </div>
                  <Button onClick={saveConfig} disabled={savingConfig} className="bg-primary hover:bg-primary/95 text-primary-foreground gap-2">
                    {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Configuration
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl border border-border p-4 bg-muted/20">
                    <div>
                      <span className="text-sm font-semibold">Enable WhatsApp Notifications</span>
                      <p className="text-xs text-muted-foreground">Control global state of the sending service.</p>
                    </div>
                    <Switch
                      checked={config.enabled}
                      onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, enabled: checked }))}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label htmlFor="wa-phone-id">Phone Number ID *</Label>
                      <Input
                        id="wa-phone-id"
                        value={config.phone_number_id}
                        onChange={(e) => setConfig((prev) => ({ ...prev, phone_number_id: e.target.value }))}
                        placeholder="e.g. 104294191983020"
                        className="mt-1.5"
                      />
                    </div>

                    <div>
                      <Label htmlFor="wa-token">Permanent System User Access Token *</Label>
                      <Input
                        id="wa-token"
                        type="password"
                        value={config.access_token}
                        onChange={(e) => setConfig((prev) => ({ ...prev, access_token: e.target.value }))}
                        placeholder="EAAB..."
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Saved Configuration Info Card ───────────────────────── */}
            {savedSnapshot && (savedSnapshot.phone_number_id || savedSnapshot.access_token) && (
              <Card className="border-emerald-500/30 bg-emerald-500/5 backdrop-blur-sm">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="font-semibold text-sm text-emerald-700 dark:text-emerald-400">
                      Saved Configuration
                    </span>
                    <Badge className="ml-auto bg-emerald-500/15 text-emerald-600 border-emerald-400/30 text-[10px]">
                      {savedSnapshot.enabled ? "✓ Active" : "Disabled"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Phone Number ID */}
                    <div className="rounded-lg border border-border/60 bg-background/60 p-3">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-1">
                        Phone Number ID
                      </p>
                      <p className="text-sm font-mono font-medium text-foreground break-all">
                        {savedSnapshot.phone_number_id || (
                          <span className="text-muted-foreground italic">Not set</span>
                        )}
                      </p>
                    </div>

                    {/* Access Token */}
                    <div className="rounded-lg border border-border/60 bg-background/60 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">
                          Access Token
                        </p>
                        {savedSnapshot.access_token && (
                          <button
                            type="button"
                            onClick={() => setShowToken((v) => !v)}
                            className="text-[10px] text-primary hover:underline flex items-center gap-1"
                          >
                            {showToken ? (
                              <><Ban className="w-3 h-3" /> Hide</>
                            ) : (
                              <><CheckCircle2 className="w-3 h-3" /> View</>
                            )}
                          </button>
                        )}
                      </div>
                      <p className="text-sm font-mono break-all text-foreground">
                        {!savedSnapshot.access_token ? (
                          <span className="text-muted-foreground italic">Not set</span>
                        ) : showToken ? (
                          savedSnapshot.access_token
                        ) : (
                          "•".repeat(Math.min(savedSnapshot.access_token.length, 44))
                        )}
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    These credentials are stored securely in your database. To update them,
                    edit the fields above and click <strong>Save Configuration</strong> again.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>


          {/* 4. Logs Tab */}
          <TabsContent value="logs" className="space-y-6 mt-4">
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
              <CardContent className="p-0">
                <div className="p-4 border-b border-border/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ListFilter className="w-5 h-5 text-muted-foreground" />
                    <span className="font-semibold">Delivery Log History</span>
                  </div>
                  <Input
                    placeholder="Search phone number, template..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full max-w-[280px]"
                  />
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Template / Mode</TableHead>
                      <TableHead>Recipient Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Message ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                    ) : filteredLogs.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No logs found.</TableCell></TableRow>
                    ) : filteredLogs.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="whitespace-nowrap text-xs">
                          {format(new Date(l.created_at), "MMM d, HH:mm")}
                        </TableCell>
                        <TableCell className="text-sm font-medium">{l.template_name}</TableCell>
                        <TableCell className="text-sm font-mono">{l.recipient_phone}</TableCell>
                        <TableCell>{statusBadge(l.status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {l.message_id}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SuperAdminLayout>
  );
}

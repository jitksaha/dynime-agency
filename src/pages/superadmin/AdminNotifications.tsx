import { useEffect, useState } from "react";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Loader2, Mail, Save, Send, ShieldCheck, Server, XCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { z } from "zod";

const nonEmptyString = (label: string) =>
  z.string({ required_error: `${label} is required` }).trim().min(1, `${label} is required`);

const summaryRowSchema = z.object({
  label: nonEmptyString("Row label"),
  value: nonEmptyString("Row value"),
});

const TEMPLATE_SCHEMAS: Record<string, z.ZodTypeAny> = {
  "admin-new-submission": z.object({
    formType: nonEmptyString("Form type"),
    customerName: nonEmptyString("Customer name"),
    customerEmail: nonEmptyString("Customer email").email("Customer email must be a valid email"),
    submission: z.array(summaryRowSchema).min(1, "Submission must include at least one row"),
    adminUrl: z.string().trim().url("Admin URL must be a valid URL").optional().or(z.literal("")),
  }),
  "contact-confirmation": z.object({
    name: nonEmptyString("Recipient name"),
    formType: nonEmptyString("Form type"),
    summary: z.array(summaryRowSchema).min(1, "Summary must include at least one row"),
  }),
  "order-status-update": z.object({
    name: nonEmptyString("Recipient name"),
    status: z.enum(["received", "in_progress", "completed"], {
      errorMap: () => ({ message: "Status must be received, in_progress, or completed" }),
    }),
    invoiceNumber: nonEmptyString("Invoice number"),
    primaryService: nonEmptyString("Primary service"),
    total: nonEmptyString("Total"),
  }),
  "service-renewal-reminder": z.object({
    name: nonEmptyString("Recipient name"),
    serviceName: nonEmptyString("Service name"),
    renewalDate: nonEmptyString("Renewal date"),
    daysRemaining: z.number({ invalid_type_error: "Days remaining must be a number" }).int().nonnegative(),
    amount: nonEmptyString("Amount"),
    cycle: nonEmptyString("Billing cycle"),
  }),
};

const TEST_TEMPLATES: Record<string, { label: string; required: string[]; data: Record<string, any> }> = {
  "admin-new-submission": {
    label: "Admin alert — new submission",
    required: ["formType", "customerName", "customerEmail", "submission"],
    data: {
      formType: "quote request",
      customerName: "Jane Doe",
      customerEmail: "jane@example.com",
      submission: [
        { label: "Service", value: "Web Development" },
        { label: "Budget", value: "$2,000 – $5,000" },
        { label: "Message", value: "This is a test email from your admin panel." },
      ],
      adminUrl: "https://dynime.com/superadmin/submissions",
    },
  },
  "contact-confirmation": {
    label: "Customer — contact / quote confirmation",
    required: ["name", "formType", "summary"],
    data: {
      name: "Jane Doe",
      formType: "quote request",
      summary: [
        { label: "Service", value: "Web Development" },
        { label: "Budget", value: "$2,000 – $5,000" },
      ],
    },
  },
  "order-status-update": {
    label: "Customer — order status update",
    required: ["name", "status", "invoiceNumber", "primaryService", "total"],
    data: {
      name: "Jane Doe",
      status: "in_progress",
      invoiceNumber: "INV-2026-000123",
      primaryService: "Web Development",
      total: "$2,500.00",
    },
  },
  "service-renewal-reminder": {
    label: "Customer — service renewal reminder",
    required: ["name", "serviceName", "renewalDate", "daysRemaining", "amount", "cycle"],
    data: {
      name: "Alex",
      serviceName: "USA LLC Annual Compliance",
      renewalDate: "May 20, 2026",
      daysRemaining: 7,
      amount: "$199.00",
      cycle: "yearly",
    },
  },
};

export function validateTemplateData(
  templateName: string,
  data: Record<string, any>,
): { ok: true } | { ok: false; errors: string[] } {
  const schema = TEMPLATE_SCHEMAS[templateName];
  if (!schema) return { ok: false, errors: [`Unknown template "${templateName}"`] };
  const result = schema.safeParse(data);
  if (result.success) return { ok: true };
  const errors = result.error.errors.map((e) => {
    const path = e.path.join(".");
    return path ? `${path}: ${e.message}` : e.message;
  });
  return { ok: false, errors };
}

interface NotifSettings {
  enabled: boolean;
  admin_recipient: string;
  send_customer_confirmation: boolean;
  admin_panel_url: string;
}

interface SmtpSettings {
  host: string;
  port: number;
  username: string;
  password: string;
  from_email: string;
  from_name: string;
  secure: boolean;
}

const notifDefaults: NotifSettings = {
  enabled: true,
  admin_recipient: "contact@dynime.com",
  send_customer_confirmation: true,
  admin_panel_url: "https://dynime.com/superadmin/submissions",
};

const smtpDefaults: SmtpSettings = {
  host: "",
  port: 587,
  username: "",
  password: "",
  from_email: "",
  from_name: "Dynime",
  secure: false,
};

const AdminNotifications = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testTemplate, setTestTemplate] = useState<string>("admin-new-submission");
  const [testRecipient, setTestRecipient] = useState<string>("");
  const [sendingTemplateTest, setSendingTemplateTest] = useState(false);
  const [testLogs, setTestLogs] = useState<any[]>([]);
  const [n, setN] = useState<NotifSettings>(notifDefaults);
  const [smtp, setSmtp] = useState<SmtpSettings>(smtpDefaults);
  const [identities, setIdentities] = useState<Record<string, { from_email: string; from_name: string; reply_to: string }>>({});
  const [savingIdentities, setSavingIdentities] = useState(false);

  const identityLabels: Record<string, string> = {
    "*": "Default (applies to any template without its own override)",
    ...Object.fromEntries(Object.entries(TEST_TEMPLATES).map(([k, v]) => [k, v.label])),
  };
  const identityKeys = ["*", ...Object.keys(TEST_TEMPLATES)];
  const getIdentity = (key: string) =>
    identities[key] || { from_email: "", from_name: "", reply_to: "" };
  const setIdentity = (
    key: string,
    patch: Partial<{ from_email: string; from_name: string; reply_to: string }>,
  ) => {
    setIdentities((prev) => ({ ...prev, [key]: { ...getIdentity(key), ...patch } }));
  };

  // Deliverability: derive the authenticated SMTP domain so we can warn when
  // From / Reply-To use a different domain (causes SPF/DKIM/DMARC misalignment).
  const domainOf = (email: string): string => {
    const at = (email || "").trim().toLowerCase().split("@");
    return at.length === 2 ? at[1] : "";
  };
  const hostDomain = (host: string): string => {
    const h = (host || "").trim().toLowerCase().replace(/^smtp[._-]?/, "");
    const parts = h.split(".").filter(Boolean);
    return parts.length >= 2 ? parts.slice(-2).join(".") : h;
  };
  const smtpAuthDomain =
    domainOf(smtp.from_email) ||
    domainOf(smtp.username) ||
    hostDomain(smtp.host);

  type IdentityCheck = {
    from: { domain: string; mismatch: boolean };
    reply: { domain: string; mismatch: boolean };
    hasMismatch: boolean;
  };
  const checkIdentity = (
    v: { from_email: string; from_name: string; reply_to: string },
  ): IdentityCheck => {
    const fd = domainOf(v.from_email);
    const rd = domainOf(v.reply_to);
    const fromMismatch = !!smtpAuthDomain && !!fd && fd !== smtpAuthDomain;
    // Reply-To is OK if it matches SMTP domain OR matches the From domain
    const replyMismatch =
      !!smtpAuthDomain && !!rd && rd !== smtpAuthDomain && rd !== fd;
    return {
      from: { domain: fd, mismatch: fromMismatch },
      reply: { domain: rd, mismatch: replyMismatch },
      hasMismatch: fromMismatch || replyMismatch,
    };
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("notification_settings")
        .select("key,value")
        .in("key", ["email_notifications", "smtp_config", "email_identities"]);
      data?.forEach((row: any) => {
        if (row.key === "email_notifications" && row.value) {
          setN({ ...notifDefaults, ...row.value });
        }
        if (row.key === "smtp_config" && row.value) {
          setSmtp({ ...smtpDefaults, ...row.value });
        }
        if (row.key === "email_identities" && row.value && typeof row.value === "object") {
          setIdentities(row.value);
        }
      });
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (loading) return;
    (supabase as any)
      .from("email_send_log")
      .select("message_id,template_name,recipient_email,status,error_message,created_at")
      .order("created_at", { ascending: false })
      .limit(8)
      .then(({ data }: any) => setTestLogs(data || []));

    const channel = supabase
      .channel("email-send-log-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "email_send_log" }, (payload) => {
        setTestLogs((rows) => [payload.new, ...rows].slice(0, 8));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loading]);

  // Scroll to #smtp anchor when navigated from sidebar
  useEffect(() => {
    if (loading) return;
    if (window.location.hash === "#smtp") {
      requestAnimationFrame(() => {
        document.getElementById("smtp")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [loading]);

  const saveNotif = async () => {
    if (!n.admin_recipient.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast.error("Please enter a valid admin recipient email.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("notification_settings")
      .upsert({ key: "email_notifications", value: n as any }, { onConflict: "key" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Notification settings saved.");
  };

  const saveSmtp = async () => {
    if (!smtp.host || !smtp.port || !smtp.from_email) {
      toast.error("Host, port, and From email are required.");
      return;
    }
    if (!smtp.from_email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast.error("Please enter a valid From email.");
      return;
    }
    setSavingSmtp(true);
    const { error } = await supabase
      .from("notification_settings")
      .upsert({ key: "smtp_config", value: smtp as any }, { onConflict: "key" });
    setSavingSmtp(false);
    if (error) return toast.error(error.message);
    toast.success("SMTP settings saved — applied immediately.");
  };

  const saveIdentities = async () => {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleaned: Record<string, { from_email?: string; from_name?: string; reply_to?: string }> = {};
    for (const [key, raw] of Object.entries(identities)) {
      const entry: { from_email?: string; from_name?: string; reply_to?: string } = {};
      const fe = (raw.from_email || "").trim();
      const fn = (raw.from_name || "").trim();
      const rt = (raw.reply_to || "").trim();
      if (fe) {
        if (!emailRe.test(fe)) return toast.error(`Invalid From email for "${identityLabels[key] ?? key}"`);
        entry.from_email = fe;
      }
      if (fn) entry.from_name = fn;
      if (rt) {
        if (!emailRe.test(rt)) return toast.error(`Invalid Reply-To for "${identityLabels[key] ?? key}"`);
        entry.reply_to = rt;
      }
      if (Object.keys(entry).length) cleaned[key] = entry;
    }
    setSavingIdentities(true);
    const { error } = await supabase
      .from("notification_settings")
      .upsert({ key: "email_identities", value: cleaned as any }, { onConflict: "key" });
    setSavingIdentities(false);
    if (error) return toast.error(error.message);
    const mismatchCount = Object.values(identities).reduce(
      (acc, v) => acc + (checkIdentity(v).hasMismatch ? 1 : 0),
      0,
    );
    if (mismatchCount > 0) {
      toast.warning(
        `Saved, but ${mismatchCount} identity has a domain mismatch with your SMTP host (${smtpAuthDomain}). Emails may land in spam.`,
      );
    } else {
      toast.success("Sender identities saved — applied immediately.");
    }
  };

  const testConnection = async () => {
    setTestingConnection(true);
    const messageId = `smtp-test-${Date.now()}`;
    const { data, error } = await supabase.functions.invoke("send-transactional-email", {
      body: {
        action: "test-smtp",
        templateName: "admin-new-submission",
        recipientEmail: n.admin_recipient || smtp.from_email,
        idempotencyKey: messageId,
      },
    });
    setTestingConnection(false);
    if (error) return toast.error(`SMTP connection failed: ${error.message}`);
    if (data && (data as any).error) return toast.error((data as any).detail || (data as any).error);
    toast.success("SMTP connection verified.");
  };

  const sendTest = async () => {
    setTesting(true);
    const messageId = `email-test-${Date.now()}`;
    const { data, error } = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "admin-new-submission",
        recipientEmail: n.admin_recipient,
        idempotencyKey: messageId,
        templateData: {
          formType: "test alert",
          customerName: "Test Customer",
          customerEmail: "test@example.com",
          submission: [
            { label: "Service", value: "Web Development" },
            { label: "Budget", value: "$2,000 – $5,000" },
            { label: "Message", value: "This is a test email from your admin panel." },
          ],
          adminUrl: n.admin_panel_url,
        },
      },
    });
    setTesting(false);
    if (error) return toast.error(`Could not send: ${error.message}`);
    if (data && (data as any).error) return toast.error((data as any).error);
    toast.success(`Test email sent to ${n.admin_recipient}`);
  };

  const sendTemplateTest = async () => {
    const recipient = (testRecipient || n.admin_recipient || smtp.from_email || "").trim();
    if (!recipient.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return toast.error("Enter a valid recipient email.");
    }
    const tpl = TEST_TEMPLATES[testTemplate];
    if (!tpl) return toast.error("Pick a template.");

    const validation = validateTemplateData(testTemplate, tpl.data);
    if (validation.ok !== true) {
      const errs = validation.errors;
      toast.error(`Template data is incomplete for "${tpl.label}"`, {
        description: errs.slice(0, 4).join(" • "),
      });
      return;
    }

    setSendingTemplateTest(true);
    const messageId = `tpl-test-${testTemplate}-${Date.now()}`;
    const { data, error } = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: testTemplate,
        recipientEmail: recipient,
        idempotencyKey: messageId,
        templateData: tpl.data,
      },
    });
    setSendingTemplateTest(false);
    if (error) return toast.error(`Could not send: ${error.message}`);
    if (data && (data as any).error) return toast.error((data as any).error);
    toast.success(`Test "${tpl.label}" sent to ${recipient}`);
  };

  if (loading) {
    return (
      <SuperAdminLayout>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Email notifications</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Configure your custom SMTP server and notification preferences. Changes apply instantly — no redeploy needed.
          </p>
        </div>

        {/* SMTP CONFIG */}
        <div id="smtp" className="space-y-5 rounded-2xl border border-border bg-card p-6 scroll-mt-24">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-primary" />
            <div>
              <h2 className="font-semibold text-foreground">Custom SMTP server</h2>
              <p className="text-xs text-muted-foreground">All app emails will be sent through this server.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Label htmlFor="smtp-host">Host *</Label>
              <Input
                id="smtp-host"
                value={smtp.host}
                onChange={(e) => setSmtp({ ...smtp, host: e.target.value })}
                placeholder="smtp.gmail.com"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="smtp-port">Port *</Label>
              <Input
                id="smtp-port"
                type="number"
                value={smtp.port}
                onChange={(e) => setSmtp({ ...smtp, port: Number(e.target.value) })}
                placeholder="587"
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="smtp-user">Username</Label>
              <Input
                id="smtp-user"
                value={smtp.username}
                onChange={(e) => setSmtp({ ...smtp, username: e.target.value })}
                placeholder="user@yourdomain.com"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="smtp-pass">Password</Label>
              <Input
                id="smtp-pass"
                type="password"
                value={smtp.password}
                onChange={(e) => setSmtp({ ...smtp, password: e.target.value })}
                placeholder="••••••••"
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="smtp-from">From email *</Label>
              <Input
                id="smtp-from"
                type="email"
                value={smtp.from_email}
                onChange={(e) => setSmtp({ ...smtp, from_email: e.target.value })}
                placeholder="noreply@yourdomain.com"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="smtp-from-name">From name</Label>
              <Input
                id="smtp-from-name"
                value={smtp.from_name}
                onChange={(e) => setSmtp({ ...smtp, from_name: e.target.value })}
                placeholder="Dynime"
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-1">
            <div>
              <Label className="text-base">Use implicit TLS (SSL)</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enable for port 465. Leave off for STARTTLS on 587/25.
              </p>
            </div>
            <Switch checked={smtp.secure} onCheckedChange={(v) => setSmtp({ ...smtp, secure: v })} />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="hero" onClick={saveSmtp} disabled={savingSmtp} className="w-full sm:w-auto">
              {savingSmtp ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save SMTP settings
            </Button>
            <Button variant="outline" onClick={testConnection} disabled={testingConnection} className="w-full sm:w-auto">
              {testingConnection ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Server className="w-4 h-4 mr-2" />}
              Test connection
            </Button>
          </div>

          <div className="flex items-start gap-2 text-xs text-muted-foreground border-t border-border pt-4">
            <ShieldCheck className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
            <span>
              Credentials are stored in your database with admin-only access. They're read live on every send — updates take effect immediately.
            </span>
          </div>

          {/* SEND TEST EMAIL — any template */}
          <div className="space-y-3 border-t border-border pt-5">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-foreground text-sm">Send test email</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Pick any email type your app sends (admin alerts and customer-facing) and deliver a real test through the SMTP above.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="test-template">Email template</Label>
                <Select value={testTemplate} onValueChange={setTestTemplate}>
                  <SelectTrigger id="test-template" className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TEST_TEMPLATES).map(([key, t]) => (
                      <SelectItem key={key} value={key}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {TEST_TEMPLATES[testTemplate] && (
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    Required fields:{" "}
                    <span className="font-mono text-foreground">
                      {TEST_TEMPLATES[testTemplate].required.join(", ")}
                    </span>
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="test-recipient">Recipient</Label>
                <Input
                  id="test-recipient"
                  type="email"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  placeholder={n.admin_recipient || smtp.from_email || "you@example.com"}
                  className="mt-1.5"
                />
              </div>
            </div>
            <Button
              variant="hero"
              onClick={sendTemplateTest}
              disabled={sendingTemplateTest}
              className="w-full sm:w-auto"
            >
              {sendingTemplateTest ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Send test email
            </Button>
          </div>
        </div>

        {/* PER-TEMPLATE SENDER IDENTITIES */}
        <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            <div>
              <h2 className="font-semibold text-foreground">Sender identities (From / Reply-To)</h2>
              <p className="text-xs text-muted-foreground">
                Override the visible <span className="font-mono">From</span> name, <span className="font-mono">From</span> email and <span className="font-mono">Reply-To</span> per email type. Empty fields fall back to the SMTP defaults above. The SMTP envelope sender stays on your authenticated mailbox so SPF/DKIM alignment is preserved.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {identityKeys.map((key) => {
              const v = getIdentity(key);
              const check = checkIdentity(v);
              const cardBorder = check.hasMismatch
                ? "border-amber-500/60 bg-amber-500/5"
                : "border-border bg-muted/20";
              const fromInputCls = check.from.mismatch
                ? "mt-1.5 border-amber-500 focus-visible:ring-amber-500"
                : "mt-1.5";
              const replyInputCls = check.reply.mismatch
                ? "mt-1.5 border-amber-500 focus-visible:ring-amber-500"
                : "mt-1.5";
              return (
                <div key={key} className={`rounded-xl border p-4 space-y-3 ${cardBorder}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold text-foreground">{identityLabels[key] ?? key}</div>
                      {check.hasMismatch && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/50 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                          <AlertTriangle className="w-3 h-3" />
                          Domain mismatch
                        </span>
                      )}
                    </div>
                    <code className="text-[10.5px] text-muted-foreground">{key}</code>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor={`id-name-${key}`} className="text-xs">From name</Label>
                      <Input
                        id={`id-name-${key}`}
                        value={v.from_name}
                        onChange={(e) => setIdentity(key, { from_name: e.target.value })}
                        placeholder={smtp.from_name || "Dynime"}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`id-from-${key}`} className="text-xs flex items-center gap-1.5">
                        From email
                        {check.from.mismatch && <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />}
                      </Label>
                      <Input
                        id={`id-from-${key}`}
                        type="email"
                        value={v.from_email}
                        onChange={(e) => setIdentity(key, { from_email: e.target.value })}
                        placeholder={smtp.from_email || "noreply@yourdomain.com"}
                        className={fromInputCls}
                        aria-invalid={check.from.mismatch || undefined}
                      />
                      {check.from.mismatch && (
                        <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                          Domain <span className="font-mono">@{check.from.domain}</span> ≠ SMTP <span className="font-mono">@{smtpAuthDomain}</span>
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor={`id-reply-${key}`} className="text-xs flex items-center gap-1.5">
                        Reply-To
                        {check.reply.mismatch && <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />}
                      </Label>
                      <Input
                        id={`id-reply-${key}`}
                        type="email"
                        value={v.reply_to}
                        onChange={(e) => setIdentity(key, { reply_to: e.target.value })}
                        placeholder="support@yourdomain.com"
                        className={replyInputCls}
                        aria-invalid={check.reply.mismatch || undefined}
                      />
                      {check.reply.mismatch && (
                        <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                          Domain <span className="font-mono">@{check.reply.domain}</span> ≠ SMTP <span className="font-mono">@{smtpAuthDomain}</span>
                          {check.from.domain && !check.from.mismatch && (
                            <> or From <span className="font-mono">@{check.from.domain}</span></>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                  {check.hasMismatch && (
                    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-[12px] text-amber-700 dark:text-amber-300 flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <span>
                        Detected SMTP domain: <span className="font-mono font-semibold">{smtpAuthDomain}</span>.
                        {check.from.mismatch && (
                          <> The <strong>From email</strong> uses <span className="font-mono">{check.from.domain}</span>, which fails SPF/DMARC alignment and may land in spam.</>
                        )}
                        {check.reply.mismatch && (
                          <> The <strong>Reply-To</strong> uses <span className="font-mono">{check.reply.domain}</span> — replies still work but some providers flag this.</>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {smtpAuthDomain ? (
            <p className="text-[11px] text-muted-foreground">
              Authenticated SMTP domain detected: <span className="font-mono text-foreground">{smtpAuthDomain}</span>. From / Reply-To addresses on this domain align with SPF and DKIM.
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Save your SMTP settings above so we can validate sender domains.
            </p>
          )}

          <Button variant="hero" onClick={saveIdentities} disabled={savingIdentities} className="w-full sm:w-auto">
            {savingIdentities ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save sender identities
          </Button>
        </div>

        <div className="space-y-6 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-semibold text-foreground">Notification preferences</h2>

          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-base">Enable email notifications</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Master switch for submission alerts.</p>
            </div>
            <Switch checked={n.enabled} onCheckedChange={(v) => setN({ ...n, enabled: v })} />
          </div>

          <div>
            <Label htmlFor="admin-recipient">Admin recipient *</Label>
            <div className="relative mt-1.5">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="admin-recipient"
                type="email"
                value={n.admin_recipient}
                onChange={(e) => setN({ ...n, admin_recipient: e.target.value })}
                placeholder="contact@dynime.com"
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-base">Send confirmation to customer</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Auto-reply summarising what they submitted.</p>
            </div>
            <Switch
              checked={n.send_customer_confirmation}
              onCheckedChange={(v) => setN({ ...n, send_customer_confirmation: v })}
            />
          </div>

          <div>
            <Label htmlFor="admin-url">Admin panel URL</Label>
            <Input
              id="admin-url"
              value={n.admin_panel_url}
              onChange={(e) => setN({ ...n, admin_panel_url: e.target.value })}
              placeholder="https://dynime.com/superadmin/submissions"
              className="mt-1.5"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button variant="hero" onClick={saveNotif} disabled={saving} className="flex-1">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save settings
            </Button>
            <Button variant="outline" onClick={sendTest} disabled={testing}>
              {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Send test email
            </Button>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <div>
            <h2 className="font-semibold text-foreground">Realtime email test results</h2>
            <p className="text-xs text-muted-foreground mt-1">New SMTP connection and send results appear here automatically.</p>
          </div>
          <div className="space-y-2">
            {testLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No test results yet.</p>
            ) : testLogs.map((row) => {
              const ok = row.status === "sent";
              const failed = row.status === "failed" || row.status === "suppressed";
              return (
                <div key={`${row.message_id}-${row.created_at}`} className="rounded-xl border border-border bg-muted/30 p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{row.template_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{row.recipient_email}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      {ok ? <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> : failed ? <XCircle className="w-3.5 h-3.5 text-destructive" /> : <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {row.status}
                    </span>
                  </div>
                  {row.error_message && <p className="mt-2 text-xs text-destructive">{row.error_message}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
};

export default AdminNotifications;

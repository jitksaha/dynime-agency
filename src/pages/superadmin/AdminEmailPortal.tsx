import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { db } from "@/integrations/db/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Mail, Settings, RefreshCw, AlertTriangle, CheckCircle2, Clock, Ban, Eye, Server, Send, ShieldCheck, Save, XCircle, Loader2, Bell } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { apiPost } from "@/lib/api";

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
  password?: string;
  from_email: string;
  from_name: string;
  secure: boolean;
}

interface RoutingSettings {
  general_receive: string;   // email where general contact/quote forms are received
  general_from: string;      // email shown in From field for general outgoing mail
  general_reply_to: string;  // reply-to for general mail
  orders_receive: string;    // email where order notifications are received
  orders_from: string;       // From address for order confirmation emails
  orders_reply_to: string;   // reply-to for order emails
  jobs_receive: string;      // email where job application notifications are received
  jobs_from: string;         // From address for job application acknowledgement emails
  jobs_reply_to: string;     // reply-to for job-related emails
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

const routingDefaults: RoutingSettings = {
  general_receive: "",
  general_from: "",
  general_reply_to: "",
  orders_receive: "",
  orders_from: "",
  orders_reply_to: "",
  jobs_receive: "",
  jobs_from: "",
  jobs_reply_to: "",
};

type Status = "all" | "sent" | "failed" | "pending" | "suppressed" | "skipped";

interface EmailLog {
  id: string;
  message_id: string;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

interface Suppressed {
  id: string;
  email: string;
  reason: string;
  source: string | null;
  created_at: string;
}

const PRESETS: Record<string, number> = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
  all: 0,
};

const statusBadge = (s: string) => {
  const map: Record<string, { label: string; cls: string; icon: any }> = {
    sent: { label: "Sent", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
    failed: { label: "Failed", cls: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30", icon: AlertTriangle },
    pending: { label: "Pending", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30", icon: Clock },
    suppressed: { label: "Suppressed", cls: "bg-muted text-muted-foreground border-border", icon: Ban },
    skipped: { label: "Skipped", cls: "bg-muted text-muted-foreground border-border", icon: Ban },
  };
  const v = map[s] || { label: s, cls: "bg-muted text-muted-foreground border-border", icon: Mail };
  const Icon = v.icon;
  return (
    <Badge variant="outline" className={`gap-1 ${v.cls}`}>
      <Icon className="h-3 w-3" /> {v.label}
    </Badge>
  );
};

const getInputClass = (hasValue: boolean, baseClass = "") => {
  return `${baseClass} transition-all ${
    hasValue 
      ? "text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50/20 dark:bg-indigo-950/10 border-indigo-500/30" 
      : ""
  }`;
};

export default function AdminEmailPortal() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [suppressed, setSuppressed] = useState<Suppressed[]>([]);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<string>("7d");
  const [template, setTemplate] = useState<string>("all");
  const [status, setStatus] = useState<Status>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [smtpConfigured, setSmtpConfigured] = useState<boolean | null>(null);
  const [smtpHost, setSmtpHost] = useState<string>("");
  const [selected, setSelected] = useState<EmailLog | null>(null);

  // States from AdminNotifications
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
  const [routing, setRouting] = useState<RoutingSettings>(routingDefaults);
  const [savingRouting, setSavingRouting] = useState(false);

  // ── Tab driven by URL ?tab= — sidebar links update URL, component reacts ──
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "logs";

  const handleTabChange = (val: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", val);
      return next;
    }, { replace: true });
  };

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
    const replyMismatch =
      !!smtpAuthDomain && !!rd && rd !== smtpAuthDomain && rd !== fd;
    return {
      from: { domain: fd, mismatch: fromMismatch },
      reply: { domain: rd, mismatch: replyMismatch },
      hasMismatch: fromMismatch || replyMismatch,
    };
  };

  const pageSize = 50;

  const fetchAll = async () => {
    setLoading(true);

    const days = PRESETS[preset];
    const sinceISO = days > 0 ? new Date(Date.now() - days * 86400_000).toISOString() : null;

    let q = db
      .from("email_send_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (sinceISO) q = q.gte("created_at", sinceISO);
    const { data, error } = await q;
    if (error) {
      toast.error("Failed to load email logs");
      setLoading(false);
      return;
    }

    // Deduplicate by message_id: keep latest status per email
    const byMsg = new Map<string, EmailLog>();
    for (const row of (data || []) as EmailLog[]) {
      if (!byMsg.has(row.message_id)) byMsg.set(row.message_id, row);
    }
    setLogs(Array.from(byMsg.values()));

    const [{ data: sup, error: dbError }, { data: notifRows, error: notifError }] = await Promise.all([
      db.from("suppressed_emails").select("*").order("created_at", { ascending: false }).limit(500),
      db.from("notification_settings").select("key,value").in("key", ["email_notifications", "smtp_config", "email_identities", "email_routing"]),
    ]);

    if (dbError) console.warn("[EmailPortal] suppressed_emails fetch error:", dbError.message);
    setSuppressed((sup || []) as Suppressed[]);

    if (notifError) {
      console.error("[EmailPortal] notification_settings fetch error:", notifError.message);
    } else {
      // Process notification_settings
      notifRows?.forEach((row: any) => {
        if (row.key === "email_notifications" && row.value) {
          setN({ ...notifDefaults, ...row.value });
        }
        if (row.key === "smtp_config" && row.value) {
          const value = row.value;
          setSmtp({ ...smtpDefaults, ...value });
          setSmtpConfigured(!!(value?.host && value?.port && value?.from_email));
          setSmtpHost(value?.host || "");
        }
        if (row.key === "email_identities" && row.value && typeof row.value === "object") {
          setIdentities(row.value);
        }
        if (row.key === "email_routing" && row.value && typeof row.value === "object") {
          setRouting({ ...routingDefaults, ...row.value });
        }
      });
    }

    setLoading(false);
  };

  const saveNotif = async () => {
    if (!n.admin_recipient.trim()) {
      toast.error("Admin recipient email is required.");
      return;
    }
    if (!n.admin_recipient.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast.error("Please enter a valid admin recipient email.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await db
        .from("notification_settings")
        .upsert({ key: "email_notifications", value: n as any }, { onConflict: "key" });
      if (error) { toast.error(error.message); return; }
      toast.success("Notification settings saved.");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save notification settings.");
    } finally {
      setSaving(false);
    }
  };

  const saveSmtp = async () => {
    if (!smtp.host.trim() || !smtp.port || !smtp.from_email.trim()) {
      toast.error("Host, port, and From email are required.");
      return;
    }
    if (!smtp.from_email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast.error("Please enter a valid From email.");
      return;
    }
    setSavingSmtp(true);
    try {
      // Strip empty password before saving (don't overwrite existing with blank)
      const smtpToSave = { ...smtp };
      if (!smtpToSave.password) delete smtpToSave.password;

      // 1. Save to Supabase notification_settings
      const { error } = await db
        .from("notification_settings")
        .upsert({ key: "smtp_config", value: smtpToSave as any }, { onConflict: "key" });
      if (error) { toast.error(error.message); return; }

      // 2. Sync to Laravel site_settings (best-effort, non-blocking)
      try {
        const encryptionMode = smtp.secure ? "ssl" : (smtp.port === 587 ? "tls" : "none");
        await apiPost("/cms/site-settings/bulk", {
          settings: [
            { key: "smtp_host",         value: JSON.stringify(smtp.host) },
            { key: "smtp_port",         value: JSON.stringify(String(smtp.port)) },
            { key: "smtp_username",     value: JSON.stringify(smtp.username || "") },
            { key: "smtp_password",     value: JSON.stringify(smtp.password || "") },
            { key: "smtp_encryption",   value: JSON.stringify(encryptionMode) },
            { key: "smtp_from_address", value: JSON.stringify(smtp.from_email) },
            { key: "smtp_from_name",    value: JSON.stringify(smtp.from_name || "Dynime") },
          ],
        });
      } catch (apiErr: any) {
        // Non-fatal — Supabase is the primary store
        console.warn("[SMTP] Laravel sync skipped:", apiErr?.message);
      }

      setSmtpConfigured(true);
      setSmtpHost(smtp.host);
      toast.success("SMTP settings saved and applied immediately.");
    } catch (e: any) {
      toast.error(e?.message || "Unexpected error saving SMTP.");
    } finally {
      setSavingSmtp(false);
    }
  };

  const saveRouting = async () => {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const fields: Array<{ key: keyof RoutingSettings; label: string }> = [
      { key: "general_receive", label: "General receive" },
      { key: "general_from",    label: "General from" },
      { key: "general_reply_to", label: "General reply-to" },
      { key: "orders_receive",  label: "Orders receive" },
      { key: "orders_from",     label: "Orders from" },
      { key: "orders_reply_to", label: "Orders reply-to" },
      { key: "jobs_receive",    label: "Job Applications receive" },
      { key: "jobs_from",       label: "Job Applications from" },
      { key: "jobs_reply_to",   label: "Job Applications reply-to" },
    ];
    for (const { key, label } of fields) {
      const val = (routing[key] || "").trim();
      if (val && !emailRe.test(val)) {
        toast.error(`Invalid email for "${label}".`);
        return;
      }
    }
    setSavingRouting(true);
    try {
      const { error } = await db
        .from("notification_settings")
        .upsert({ key: "email_routing", value: routing as any }, { onConflict: "key" });
      if (error) { toast.error(error.message); return; }
      toast.success("Email routing saved — applied immediately.");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save routing.");
    } finally {
      setSavingRouting(false);
    }
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
        if (!emailRe.test(fe)) { toast.error(`Invalid From email for "${identityLabels[key] ?? key}"`); return; }
        entry.from_email = fe;
      }
      if (fn) entry.from_name = fn;
      if (rt) {
        if (!emailRe.test(rt)) { toast.error(`Invalid Reply-To for "${identityLabels[key] ?? key}"`); return; }
        entry.reply_to = rt;
      }
      if (Object.keys(entry).length) cleaned[key] = entry;
    }
    setSavingIdentities(true);
    try {
      const { error } = await db
        .from("notification_settings")
        .upsert({ key: "email_identities", value: cleaned as any }, { onConflict: "key" });
      if (error) { toast.error(error.message); return; }
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
    } catch (e: any) {
      toast.error(e?.message || "Failed to save sender identities.");
    } finally {
      setSavingIdentities(false);
    }
  };

  const testConnection = async () => {
    const recipient = (n.admin_recipient || smtp.from_email || "").trim();
    if (!recipient) {
      toast.error("Set an admin recipient email (Notification Prefs tab) or a From email (SMTP Settings) before testing.");
      return;
    }
    setTestingConnection(true);
    try {
      const messageId = `smtp-test-${Date.now()}`;
      const { data, error } = await db.functions.invoke("send-transactional-email", {
        body: {
          action: "test-smtp",
          templateName: "admin-new-submission",
          recipientEmail: recipient,
          idempotencyKey: messageId,
          smtpConfig: smtp,
        },
      });
      if (error) { toast.error(`SMTP connection failed: ${error.message}`); return; }
      if (data && (data as any).error) { toast.error((data as any).detail || (data as any).error); return; }
      toast.success("SMTP connection verified ✓");
    } catch (e: any) {
      toast.error(`SMTP test error: ${e?.message || "unknown"}`);
    } finally {
      setTestingConnection(false);
    }
  };

  const sendTest = async () => {
    const recipient = (n.admin_recipient || smtp.from_email || "").trim();
    if (!recipient) {
      toast.error("Set an admin recipient email in Notification Prefs before sending a test.");
      return;
    }
    setTesting(true);
    try {
      const messageId = `email-test-${Date.now()}`;
      const { data, error } = await db.functions.invoke("send-transactional-email", {
        body: {
          templateName: "admin-new-submission",
          recipientEmail: recipient,
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
            adminUrl: n.admin_panel_url || "https://dynime.com/superadmin",
          },
        },
      });
      if (error) { toast.error(`Could not send: ${error.message}`); return; }
      if (data && (data as any).error) { toast.error((data as any).error); return; }
      toast.success(`Test email sent to ${recipient}`);
    } catch (e: any) {
      toast.error(`Send error: ${e?.message || "unknown"}`);
    } finally {
      setTesting(false);
    }
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
      toast.error(`Template data is incomplete for "${tpl.label}"`, {
        description: validation.errors.slice(0, 4).join(" • "),
      });
      return;
    }

    setSendingTemplateTest(true);
    try {
      const messageId = `tpl-test-${testTemplate}-${Date.now()}`;
      const { data, error } = await db.functions.invoke("send-transactional-email", {
        body: {
          templateName: testTemplate,
          recipientEmail: recipient,
          idempotencyKey: messageId,
          templateData: tpl.data,
        },
      });
      if (error) { toast.error(`Could not send: ${error.message}`); return; }
      if (data && (data as any).error) { toast.error((data as any).error); return; }
      toast.success(`Test "${tpl.label}" sent to ${recipient}`);
    } catch (e: any) {
      toast.error(`Send error: ${e?.message || "unknown"}`);
    } finally {
      setSendingTemplateTest(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset]);

  // Realtime: stream new/updated email log rows + suppression list changes
  useEffect(() => {
    const channel = db
      .channel("email-portal-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "email_send_log" },
        (payload) => {
          const row = (payload.new || payload.old) as EmailLog;
          if (!row?.message_id) return;
          setLogs((prev) => {
            const idx = prev.findIndex((l) => l.message_id === row.message_id);
            if (payload.eventType === "DELETE") {
              return idx >= 0 ? prev.filter((_, i) => i !== idx) : prev;
            }
            // Keep latest status per message_id, newest first
            const next = idx >= 0 ? [...prev.slice(0, idx), ...prev.slice(idx + 1)] : [...prev];
            next.unshift(row);
            return next;
          });
          if (payload.eventType === "INSERT" && (row as EmailLog).status === "sent") {
            toast.success(`Email sent → ${(row as EmailLog).recipient_email}`, { duration: 2500 });
          } else if ((row as EmailLog).status === "failed") {
            toast.error(`Email failed → ${(row as EmailLog).recipient_email}`, { duration: 3500 });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "suppressed_emails" },
        (payload) => {
          const row = (payload.new || payload.old) as Suppressed;
          setSuppressed((prev) => {
            if (payload.eventType === "DELETE") return prev.filter((s) => s.id !== row.id);
            const without = prev.filter((s) => s.id !== row.id);
            return [row, ...without];
          });
        }
      )
      .subscribe();

    return () => {
      db.removeChannel(channel);
    };
  }, []);

  const templates = useMemo(
    () => Array.from(new Set(logs.map((l) => l.template_name))).sort(),
    [logs]
  );

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (template !== "all" && l.template_name !== template) return false;
      if (status !== "all" && l.status !== status) return false;
      if (search) {
        const s = search.toLowerCase();
        if (
          !l.recipient_email.toLowerCase().includes(s) &&
          !l.template_name.toLowerCase().includes(s) &&
          !(l.error_message || "").toLowerCase().includes(s)
        ) return false;
      }
      return true;
    });
  }, [logs, template, status, search]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const sent = filtered.filter((l) => l.status === "sent").length;
    const failed = filtered.filter((l) => l.status === "failed").length;
    const suppressedCount = filtered.filter((l) => l.status === "suppressed" || l.status === "skipped").length;
    const pending = filtered.filter((l) => l.status === "pending").length;
    return { total, sent, failed, suppressed: suppressedCount, pending };
  }, [filtered]);

  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  return (
    <SuperAdminLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Mail className="h-6 w-6 text-primary" /> Email Portal
            </h1>
            <p className="text-sm text-muted-foreground">
              Central hub for SMTP configuration, delivery logs, and suppression list.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button size="sm" onClick={() => handleTabChange("smtp")}>
              <Settings className="h-4 w-4 mr-2" /> SMTP Settings
            </Button>
          </div>
        </div>

        {/* SMTP status banner */}
        <Card className={smtpConfigured === false ? "border-red-500/40 bg-red-500/5" : ""}>
          <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              {smtpConfigured ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )}
              <div>
                <div className="font-medium">
                  {smtpConfigured ? "SMTP is configured" : "SMTP not configured"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {smtpConfigured
                    ? `All system emails route through ${smtpHost}.`
                    : "Configure SMTP to enable system email sending (orders, applications, etc.)."}
                </div>
              </div>
            </div>
            <Button variant={smtpConfigured ? "outline" : "default"} size="sm" onClick={() => handleTabChange("smtp")}>
              {smtpConfigured ? "Edit settings" : "Configure SMTP"}
            </Button>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Total", value: stats.total, cls: "" },
            { label: "Sent", value: stats.sent, cls: "text-emerald-600 dark:text-emerald-400" },
            { label: "Failed", value: stats.failed, cls: "text-red-600 dark:text-red-400" },
            { label: "Pending", value: stats.pending, cls: "text-amber-600 dark:text-amber-400" },
            { label: "Suppressed", value: stats.suppressed, cls: "text-muted-foreground" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className={`text-2xl font-bold ${s.cls}`}>{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-6 mb-6 flex-wrap">
            <TabsTrigger value="logs" className="border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-1 py-3 bg-transparent data-[state=active]:bg-transparent font-medium">Email Logs ({filtered.length})</TabsTrigger>
            <TabsTrigger value="suppressed" className="border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-1 py-3 bg-transparent data-[state=active]:bg-transparent font-medium">Suppressed ({suppressed.length})</TabsTrigger>
            <TabsTrigger value="smtp" className="border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-1 py-3 bg-transparent data-[state=active]:bg-transparent font-medium">SMTP Settings</TabsTrigger>
            <TabsTrigger value="routing" className="border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-1 py-3 bg-transparent data-[state=active]:bg-transparent font-medium">Email Routing</TabsTrigger>
            <TabsTrigger value="identities" className="border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-1 py-3 bg-transparent data-[state=active]:bg-transparent font-medium">Sender Identities</TabsTrigger>
            <TabsTrigger value="alerts" className="border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-1 py-3 bg-transparent data-[state=active]:bg-transparent font-medium">Notification Prefs</TabsTrigger>
          </TabsList>

          <TabsContent value="logs" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                <Select value={preset} onValueChange={setPreset}>
                  <SelectTrigger><SelectValue placeholder="Time range" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">Last 24 hours</SelectItem>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={template} onValueChange={setTemplate}>
                  <SelectTrigger><SelectValue placeholder="Template" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All templates</SelectItem>
                    {templates.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                  <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="suppressed">Suppressed</SelectItem>
                    <SelectItem value="skipped">Skipped</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Search recipient, template, error…"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Error</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                    ) : paginated.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No emails match these filters.</TableCell></TableRow>
                    ) : paginated.map((l) => (
                      <TableRow key={l.id} className="cursor-pointer" onClick={() => setSelected(l)}>
                        <TableCell className="whitespace-nowrap text-xs">
                          {format(new Date(l.created_at), "MMM d, HH:mm")}
                        </TableCell>
                        <TableCell className="text-sm font-medium">{l.template_name}</TableCell>
                        <TableCell className="text-sm">{l.recipient_email}</TableCell>
                        <TableCell>{statusBadge(l.status)}</TableCell>
                        <TableCell className="text-xs text-red-600 dark:text-red-400 max-w-[280px] truncate">
                          {l.error_message || ""}
                        </TableCell>
                        <TableCell><Eye className="h-4 w-4 text-muted-foreground" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {totalPages > 1 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Page {page + 1} of {totalPages}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="suppressed">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Added</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppressed.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No suppressed addresses.</TableCell></TableRow>
                    ) : suppressed.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.email}</TableCell>
                        <TableCell><Badge variant="outline">{s.reason}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{s.source || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{format(new Date(s.created_at), "MMM d, yyyy HH:mm")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="smtp" className="space-y-6">
            <Card>
              <CardContent className="p-6 space-y-5">
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
                      value={smtp.password || ""}
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

                {/* Send template test email block */}
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── EMAIL ROUTING TAB ─────────────────────────────────────── */}
          <TabsContent value="routing" className="space-y-6">
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-border">
                  <Settings className="w-5 h-5 text-primary" />
                  <div>
                    <h2 className="font-semibold text-foreground">Email Routing</h2>
                    <p className="text-xs text-muted-foreground">
                      Configure dedicated receive &amp; send email addresses per purpose.
                      All mail still flows through the single SMTP server above — these just control the <span className="font-mono">To</span>, <span className="font-mono">From</span>, and <span className="font-mono">Reply-To</span> headers for each category.
                    </p>
                  </div>
                </div>

                {/* ── General / Contact / Quote ── */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                    <h3 className="font-semibold text-sm text-foreground">General Mail — Contact &amp; Quote Forms</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Emails from the public contact form and quote requests. The <em>Receive</em> address is where admin alerts land; <em>From / Reply-To</em> appear on outgoing confirmation emails to customers.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="gen-receive">Receive (Admin inbox)</Label>
                      <Input id="gen-receive" type="email" className={getInputClass(!!routing.general_receive, "mt-1.5")}
                        placeholder="contact@dynime.com"
                        value={routing.general_receive || ""}
                        onChange={(e) => setRouting({ ...routing, general_receive: e.target.value })} />
                      <p className="text-[11px] text-muted-foreground mt-1">Where admin notifications are sent</p>
                    </div>
                    <div>
                      <Label htmlFor="gen-from">From (Outgoing)</Label>
                      <Input id="gen-from" type="email" className={getInputClass(!!routing.general_from, "mt-1.5")}
                        placeholder="noreply@dynime.com"
                        value={routing.general_from || ""}
                        onChange={(e) => setRouting({ ...routing, general_from: e.target.value })} />
                      <p className="text-[11px] text-muted-foreground mt-1">Shown as sender in customer emails</p>
                    </div>
                    <div>
                      <Label htmlFor="gen-reply">Reply-To</Label>
                      <Input id="gen-reply" type="email" className={getInputClass(!!routing.general_reply_to, "mt-1.5")}
                        placeholder="support@dynime.com"
                        value={routing.general_reply_to || ""}
                        onChange={(e) => setRouting({ ...routing, general_reply_to: e.target.value })} />
                      <p className="text-[11px] text-muted-foreground mt-1">Where customer replies will go</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border/60" />

                {/* ── Orders ── */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                    <h3 className="font-semibold text-sm text-foreground">Orders Mail — Order Confirmations &amp; Status Updates</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Sent when customers place orders or when order status changes. The <em>Receive</em> address gets admin copies; <em>From / Reply-To</em> appear on order confirmation and update emails.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="ord-receive">Receive (Admin inbox)</Label>
                      <Input id="ord-receive" type="email" className={getInputClass(!!routing.orders_receive, "mt-1.5")}
                        placeholder="orders@dynime.com"
                        value={routing.orders_receive || ""}
                        onChange={(e) => setRouting({ ...routing, orders_receive: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="ord-from">From (Outgoing)</Label>
                      <Input id="ord-from" type="email" className={getInputClass(!!routing.orders_from, "mt-1.5")}
                        placeholder="orders@dynime.com"
                        value={routing.orders_from || ""}
                        onChange={(e) => setRouting({ ...routing, orders_from: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="ord-reply">Reply-To</Label>
                      <Input id="ord-reply" type="email" className={getInputClass(!!routing.orders_reply_to, "mt-1.5")}
                        placeholder="support@dynime.com"
                        value={routing.orders_reply_to || ""}
                        onChange={(e) => setRouting({ ...routing, orders_reply_to: e.target.value })} />
                    </div>
                  </div>
                </div>

                <div className="border-t border-border/60" />

                {/* ── Job Applications ── */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    <h3 className="font-semibold text-sm text-foreground">Job Applications — Career &amp; Hiring Emails</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Sent when candidates apply for a job post. The <em>Receive</em> address is where HR gets notified; <em>From / Reply-To</em> appear on candidate acknowledgement emails.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="job-receive">Receive (HR inbox)</Label>
                      <Input id="job-receive" type="email" className={getInputClass(!!routing.jobs_receive, "mt-1.5")}
                        placeholder="careers@dynime.com"
                        value={routing.jobs_receive || ""}
                        onChange={(e) => setRouting({ ...routing, jobs_receive: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="job-from">From (Outgoing)</Label>
                      <Input id="job-from" type="email" className={getInputClass(!!routing.jobs_from, "mt-1.5")}
                        placeholder="careers@dynime.com"
                        value={routing.jobs_from || ""}
                        onChange={(e) => setRouting({ ...routing, jobs_from: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="job-reply">Reply-To</Label>
                      <Input id="job-reply" type="email" className={getInputClass(!!routing.jobs_reply_to, "mt-1.5")}
                        placeholder="hr@dynime.com"
                        value={routing.jobs_reply_to || ""}
                        onChange={(e) => setRouting({ ...routing, jobs_reply_to: e.target.value })} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2 border-t border-border">
                  <Button variant="hero" onClick={saveRouting} disabled={savingRouting} className="w-full sm:w-auto">
                    {savingRouting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Routing Config
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Empty fields fall back to the global SMTP <span className="font-mono">From</span> address above.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="identities" className="space-y-6">
            <Card>
              <CardContent className="p-6 space-y-5">
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-primary" />
                  <div>
                    <h2 className="font-semibold text-foreground">Sender identities (From / Reply-To)</h2>
                    <p className="text-xs text-muted-foreground">
                      Override the visible <span className="font-mono">From</span> name, <span className="font-mono">From</span> email and <span className="font-mono">Reply-To</span> per email type. Empty fields fall back to the SMTP defaults.
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
                                <AlertTriangle className="w-3.5 h-3.5" />
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
                              value={v.from_name || ""}
                              onChange={(e) => setIdentity(key, { from_name: e.target.value })}
                              placeholder={smtp.from_name || "Dynime"}
                              className={getInputClass(!!v.from_name, "mt-1.5")}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`id-from-${key}`} className="text-xs flex items-center gap-1.5">
                              From email
                              {check.from.mismatch && <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                            </Label>
                            <Input
                              id={`id-from-${key}`}
                              type="email"
                              value={v.from_email || ""}
                              onChange={(e) => setIdentity(key, { from_email: e.target.value })}
                              placeholder={smtp.from_email || "noreply@yourdomain.com"}
                              className={getInputClass(!!v.from_email, fromInputCls)}
                              aria-invalid={check.from.mismatch || undefined}
                            />
                            {check.from.mismatch && (
                              <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                                Domain <span className="font-mono">@{check.from.domain}</span> &ne; SMTP <span className="font-mono">@{smtpAuthDomain}</span>
                              </p>
                            )}
                          </div>
                          <div>
                            <Label htmlFor={`id-reply-${key}`} className="text-xs flex items-center gap-1.5">
                              Reply-To
                              {check.reply.mismatch && <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                            </Label>
                            <Input
                              id={`id-reply-${key}`}
                              type="email"
                              value={v.reply_to || ""}
                              onChange={(e) => setIdentity(key, { reply_to: e.target.value })}
                              placeholder="support@yourdomain.com"
                              className={getInputClass(!!v.reply_to, replyInputCls)}
                              aria-invalid={check.reply.mismatch || undefined}
                            />
                            {check.reply.mismatch && (
                              <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                                Domain <span className="font-mono">@{check.reply.domain}</span> &ne; SMTP <span className="font-mono">@{smtpAuthDomain}</span>
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

                <div className="flex flex-col gap-2 pt-2">
                  <Button variant="hero" onClick={saveIdentities} disabled={savingIdentities} className="w-full sm:w-auto">
                    {savingIdentities ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save sender identities
                  </Button>
                  {smtpAuthDomain ? (
                    <p className="text-[11px] text-muted-foreground">
                      Authenticated SMTP domain detected: <span className="font-mono text-foreground">{smtpAuthDomain}</span>. From / Reply-To addresses on this domain align with SPF and DKIM.
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      Save your SMTP settings under SMTP tab so we can validate sender domains.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-6">
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  <div>
                    <h2 className="font-semibold text-foreground">Notification preferences</h2>
                    <p className="text-xs text-muted-foreground">Master switch and recipient settings for submission alerts.</p>
                  </div>
                </div>

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
              </CardContent>
            </Card>

            {/* Realtime Email Test Results */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <h2 className="font-semibold text-foreground">Realtime email test results</h2>
                  <p className="text-xs text-muted-foreground mt-1">New SMTP connection and send results appear here automatically.</p>
                </div>
                <div className="space-y-2">
                  {testLogs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No test results yet.</p>
                  ) : (
                    testLogs.map((row) => {
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
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Email details</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><div className="text-xs text-muted-foreground">Template</div><div className="font-medium">{selected.template_name}</div></div>
                <div><div className="text-xs text-muted-foreground">Status</div><div>{statusBadge(selected.status)}</div></div>
                <div><div className="text-xs text-muted-foreground">Recipient</div><div className="font-medium break-all">{selected.recipient_email}</div></div>
                <div><div className="text-xs text-muted-foreground">Sent at</div><div>{format(new Date(selected.created_at), "PPpp")}</div></div>
                <div className="col-span-2"><div className="text-xs text-muted-foreground">Message ID</div><div className="font-mono text-xs break-all">{selected.message_id}</div></div>
              </div>
              {selected.error_message && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Error</div>
                  <div className="rounded-md border border-red-500/30 bg-red-500/5 p-3 text-red-700 dark:text-red-400 text-xs whitespace-pre-wrap">{selected.error_message}</div>
                </div>
              )}
              {selected.metadata && Object.keys(selected.metadata).length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Metadata</div>
                  <pre className="rounded-md border bg-muted/50 p-3 text-xs overflow-auto max-h-64">{JSON.stringify(selected.metadata, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
}

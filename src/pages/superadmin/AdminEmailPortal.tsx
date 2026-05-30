import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mail, Settings, RefreshCw, AlertTriangle, CheckCircle2, Clock, Ban, Eye } from "lucide-react";
import { toast } from "sonner";

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

  const pageSize = 50;

  const fetchAll = async () => {
    setLoading(true);

    const days = PRESETS[preset];
    const sinceISO = days > 0 ? new Date(Date.now() - days * 86400_000).toISOString() : null;

    let q = supabase
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

    const [{ data: sup }, { data: cfg }] = await Promise.all([
      supabase.from("suppressed_emails").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("notification_settings").select("value").eq("key", "smtp_config").maybeSingle(),
    ]);
    setSuppressed((sup || []) as Suppressed[]);
    const v = ((cfg as any)?.value || {}) as any;
    setSmtpConfigured(!!(v?.host && v?.port && v?.from_email));
    setSmtpHost(v?.host || "");
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset]);

  // Realtime: stream new/updated email log rows + suppression list changes
  useEffect(() => {
    const channel = supabase
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
      supabase.removeChannel(channel);
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
            <Button asChild size="sm">
              <Link to="/superadmin/notifications#smtp">
                <Settings className="h-4 w-4 mr-2" /> SMTP Settings
              </Link>
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
            <Button asChild variant={smtpConfigured ? "outline" : "default"} size="sm">
              <Link to="/superadmin/notifications#smtp">
                {smtpConfigured ? "Edit settings" : "Configure SMTP"}
              </Link>
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

        <Tabs defaultValue="logs">
          <TabsList>
            <TabsTrigger value="logs">Email Logs ({filtered.length})</TabsTrigger>
            <TabsTrigger value="suppressed">Suppressed ({suppressed.length})</TabsTrigger>
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

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, MessageSquare, Check, X, Eye, CircleDot, Search,
  Inbox, Clock, ShieldCheck, AlertCircle, Mail, Paperclip, Upload, Trash2, FileIcon, Download,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { usePageTitle } from "@/hooks/use-page-title";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 5;
const fmtBytes = (b: number) =>
  b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1024 / 1024).toFixed(2)} MB`;

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400",
  in_review: "bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-400",
  approved: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400",
  fulfilled: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
  cancelled: "bg-muted text-muted-foreground border-border",
};

const PRIORITY_COLOR: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-secondary text-secondary-foreground",
  high: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  urgent: "bg-destructive/15 text-destructive",
};

const CATEGORIES = [
  { value: "all", label: "All categories" },
  { value: "leave", label: "Leave" },
  { value: "document", label: "Document" },
  { value: "payslip_reissue", label: "Payslip reissue" },
  { value: "salary_review", label: "Salary review" },
  { value: "equipment", label: "Equipment" },
  { value: "access", label: "System access" },
  { value: "grievance", label: "Grievance" },
  { value: "other", label: "Other" },
];

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

const AdminHRRequests = () => {
  usePageTitle("Admin · HR Requests");
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fulfillOpen, setFulfillOpen] = useState(false);
  const [fulfillText, setFulfillText] = useState("");
  const [fulfillFiles, setFulfillFiles] = useState<File[]>([]);
  const [fulfilling, setFulfilling] = useState(false);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-hr-requests"],
    queryFn: async () => {
      return (await apiGet<any[]>('/hrm/hr-requests')) ?? [];
    },
  });

  const { data: events } = useQuery({
    queryKey: ["admin-hr-request-events", activeId],
    enabled: !!activeId,
    queryFn: async () => {
      return (await apiGet<any[]>(`/hrm/hr-requests/${activeId}/events`)) ?? [];
    },
  });

  // Derive the active request from the live list so it stays in sync automatically.
  const active = useMemo(
    () => (activeId ? (rows ?? []).find((r: any) => r.id === activeId) ?? null : null),
    [activeId, rows]
  );

  // Single shared refresh entry-point: invalidates the list (which also refreshes
  // the derived `active` row + embedded employee details) and, optionally, the
  // event timeline for a specific request.
  const refreshAll = useCallback(
    (requestId?: string | null) => {
      queryClient.invalidateQueries({ queryKey: ["admin-hr-requests"] });
      const id = requestId ?? activeId;
      if (id) {
        queryClient.invalidateQueries({ queryKey: ["admin-hr-request-events", id] });
      }
    },
    [queryClient, activeId]
  );

  // Realtime subscriptions removed — NestJS WebSocket pub/sub pending.
  // Use the refresh button or mutations to re-fetch data.

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rows ?? []).filter((r: any) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
      if (priorityFilter !== "all" && r.priority !== priorityFilter) return false;
      if (q) {
        const hay = [
          r.subject, r.details, r.employees?.full_name,
          r.employees?.email, r.employees?.employee_code,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, statusFilter, categoryFilter, priorityFilter, search]);

  const counts = useMemo(() => {
    const c = { total: 0, pending: 0, in_review: 0, urgent: 0 };
    (rows ?? []).forEach((r: any) => {
      c.total++;
      if (r.status === "pending") c.pending++;
      if (r.status === "in_review") c.in_review++;
      if (r.priority === "urgent" && !["fulfilled", "rejected", "cancelled"].includes(r.status)) c.urgent++;
    });
    return c;
  }, [rows]);

  const ACTION_VERB: Record<string, string> = {
    in_review: "marked as in review",
    approved: "approved",
    rejected: "rejected",
    fulfilled: "fulfilled",
  };

  const decide = async (status: "in_review" | "approved" | "rejected" | "fulfilled") => {
    if (!active) return;
    if ((status === "rejected" || status === "approved") && !note.trim()) {
      setNoteError(
        `A note is required to ${status === "rejected" ? "reject" : "approve"} this request. Please explain the decision so the employee understands the outcome.`
      );
      return;
    }
    setNoteError(null);
    setBusy(true);
    const fromStatus = active.status as string;
    const trimmedNote = note.trim();
    try {
      const patch: any = { status };
      if (status !== "in_review") {
        patch.decided_by = user!.id;
        patch.decided_at = new Date().toISOString();
        if (trimmedNote) patch.decision_note = trimmedNote;
      }
      await apiPatch(`/hrm/hr-requests/${active.id}`, patch);

      const verb = ACTION_VERB[status] ?? `set to ${status}`;
      const summary = `Request ${verb}${trimmedNote ? ` — ${trimmedNote}` : ""}`;
      await apiPost(`/hrm/hr-requests/${active.id}/events`, {
        author_id: user!.id,
        author_role: "admin",
        event_type: "status_change",
        message: summary,
        metadata: {
          action: status,
          from_status: fromStatus,
          to_status: status,
          note: trimmedNote || null,
          actor_email: user?.email ?? null,
          decided_at: patch.decided_at ?? null,
        },
      });

      toast.success(`Request ${verb}`);
      setNote("");
      refreshAll(active.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to update request");
    } finally {
      setBusy(false);
    }
  };

  const addComment = async () => {
    if (!active || !note.trim()) return;
    setBusy(true);
    try {
      await apiPost(`/hrm/hr-requests/${active.id}/events`, {
        author_id: user!.id,
        author_role: "admin",
        event_type: "comment",
        message: note.trim(),
      });
      toast.success("Comment added");
      setNote("");
      refreshAll(active.id);
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  const addFulfillFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const next = [...fulfillFiles];
    for (const f of Array.from(incoming)) {
      if (next.length >= MAX_FILES) { toast.error(`Max ${MAX_FILES} files`); break; }
      if (f.size > MAX_FILE_BYTES) { toast.error(`${f.name} exceeds 10 MB`); continue; }
      next.push(f);
    }
    setFulfillFiles(next);
  };

  const submitFulfillment = async () => {
    if (!active) return;
    const text = fulfillText.trim();
    if (!text && fulfillFiles.length === 0) {
      toast.error("Add a response message or at least one file");
      return;
    }
    setFulfilling(true);
    const fromStatus = active.status as string;
    try {
      // 1) Upload files under fulfillment/<request_id>/...
      const uploaded: Array<{ name: string; path: string; size: number; type: string }> = [];
      for (const f of fulfillFiles) {
        const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `fulfillment/${active.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("hr-request-attachments")
          .upload(path, f, { contentType: f.type || "application/octet-stream", upsert: false });
        if (upErr) throw upErr;
        uploaded.push({ name: f.name, path, size: f.size, type: f.type });
      }

      // 2) Update request: status=fulfilled, decision_note=text
      const decidedAt = new Date().toISOString();
      await apiPatch(`/hrm/hr-requests/${active.id}`, {
        status: "fulfilled",
        decided_by: user!.id,
        decided_at: decidedAt,
        decision_note: text || active.decision_note || null,
      });

      // 3) Insert a fulfillment event with attachments in metadata
      await apiPost(`/hrm/hr-requests/${active.id}/events`, {
        author_id: user!.id,
        author_role: "admin",
        event_type: "fulfillment",
        message: text || (uploaded.length > 0 ? `Request fulfilled with ${uploaded.length} attachment${uploaded.length === 1 ? "" : "s"}.` : "Request fulfilled."),
        metadata: {
          action: "fulfilled",
          from_status: fromStatus,
          to_status: "fulfilled",
          note: text || null,
          attachments: uploaded,
          actor_email: user?.email ?? null,
          decided_at: decidedAt,
        },
      });

      toast.success("Request fulfilled");
      setFulfillText("");
      setFulfillFiles([]);
      setFulfillOpen(false);
      refreshAll(active.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to fulfill request");
    } finally {
      setFulfilling(false);
    }
  };

  const downloadAttachment = async (path: string, name: string) => {
    const { data, error } = await supabase.storage
      .from("hr-request-attachments")
      .createSignedUrl(path, 60);
    if (error || !data) return toast.error(error?.message || "Could not get download URL");
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = name;
    a.target = "_blank";
    a.click();
  };

  const stats = [
    { label: "Total", value: counts.total, icon: Inbox, tone: "text-foreground" },
    { label: "Pending", value: counts.pending, icon: Clock, tone: "text-amber-600 dark:text-amber-400" },
    { label: "In review", value: counts.in_review, icon: Eye, tone: "text-blue-600 dark:text-blue-400" },
    { label: "Urgent open", value: counts.urgent, icon: AlertCircle, tone: "text-destructive" },
  ];

  return (
    <SuperAdminLayout>
      <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Employee Requests</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Review and respond to HR, access, and self-service requests from employees.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg bg-muted flex items-center justify-center ${s.tone}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold leading-none">{s.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search subject, employee, email…"
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_review">In review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="fulfilled">Fulfilled</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* List */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center">
                <Loader2 className="h-5 w-5 animate-spin inline text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                <Inbox className="h-10 w-10 mx-auto mb-2 opacity-40" />
                No requests match the current filters.
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map((r: any) => (
                  <button
                    key={r.id}
                    onClick={() => { setActiveId(r.id); setNote(""); setNoteError(null); }}
                    className="w-full text-left flex items-center justify-between p-4 gap-4 hover:bg-muted/40 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium truncate">{r.subject}</span>
                        {r.priority !== "normal" && r.priority !== "low" && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide ${PRIORITY_COLOR[r.priority]}`}>
                            {r.priority}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        <span className="capitalize">{String(r.category).replace("_", " ")}</span>
                        {" · "}
                        {r.employees?.full_name ?? "Unknown employee"}
                        {r.employees?.employee_code && <span className="font-mono ml-1">({r.employees.employee_code})</span>}
                        {" · "}
                        {fmtDate(r.created_at)}
                      </div>
                    </div>
                    <Badge className={STATUS_COLOR[r.status]} variant="outline">
                      {String(r.status).replace("_", " ")}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail drawer */}
      <Sheet open={!!active} onOpenChange={(o) => !o && setActiveId(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {active && (
            <>
              <SheetHeader className="space-y-2 text-left">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={STATUS_COLOR[active.status]} variant="outline">
                    {String(active.status).replace("_", " ")}
                  </Badge>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide ${PRIORITY_COLOR[active.priority]}`}>
                    {active.priority}
                  </span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {String(active.category).replace("_", " ")}
                  </span>
                </div>
                <SheetTitle className="text-xl">{active.subject}</SheetTitle>
              </SheetHeader>

              <div className="space-y-5 text-sm mt-5">
                <div className="rounded-lg border p-3 bg-muted/30 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div>
                    <div className="text-muted-foreground">Employee</div>
                    <div className="font-medium text-foreground">{active.employees?.full_name ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Code</div>
                    <div className="font-mono text-foreground">{active.employees?.employee_code ?? "—"}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-muted-foreground">Email</div>
                    <div className="text-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {active.employees?.email ?? "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Department</div>
                    <div className="text-foreground">{active.employees?.department ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Designation</div>
                    <div className="text-foreground">{active.employees?.designation ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Submitted</div>
                    <div className="text-foreground">{fmtDate(active.created_at)}</div>
                  </div>
                  {active.decided_at && (
                    <div>
                      <div className="text-muted-foreground">Decided</div>
                      <div className="text-foreground">{fmtDate(active.decided_at)}</div>
                    </div>
                  )}
                </div>

                {active.details && (
                  <div>
                    <div className="text-xs font-semibold uppercase text-muted-foreground mb-1.5">Details</div>
                    <p className="whitespace-pre-wrap border rounded-md p-3 text-sm">{active.details}</p>
                  </div>
                )}

                {Array.isArray(active.attachments) && active.attachments.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 flex items-center gap-1">
                      <Paperclip className="h-3 w-3" /> Employee attachments
                    </div>
                    <div className="space-y-1">
                      {active.attachments.map((a: any, i: number) => (
                        <button
                          key={i}
                          onClick={() => downloadAttachment(a.path, a.name)}
                          className="w-full flex items-center gap-2 text-sm border rounded-md px-2 py-1.5 hover:bg-muted/40 text-left"
                        >
                          <FileIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate flex-1">{a.name}</span>
                          <span className="text-xs text-muted-foreground">{fmtBytes(a.size)}</span>
                          <Download className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {active.decision_note && (
                  <div>
                    <div className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" /> Decision note
                    </div>
                    <p className="whitespace-pre-wrap border rounded-md p-3 text-sm bg-muted/30">{active.decision_note}</p>
                  </div>
                )}

                <div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> Activity
                  </div>
                  <div className="space-y-2">
                    {events && events.length > 0 ? events.map((e: any) => {
                      const meta = e.metadata ?? {};
                      const isStatus = e.event_type === "status_change";
                      return (
                        <div key={e.id} className="border rounded-md p-2.5">
                          <div className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold capitalize text-foreground">{e.author_role}</span>
                            <span>·</span>
                            <span>{fmtDate(e.created_at)}</span>
                            {isStatus && meta.from_status && meta.to_status && (
                              <span className="inline-flex items-center gap-1">
                                <Badge className={STATUS_COLOR[meta.from_status]} variant="outline">
                                  {String(meta.from_status).replace("_", " ")}
                                </Badge>
                                <span>→</span>
                                <Badge className={STATUS_COLOR[meta.to_status]} variant="outline">
                                  {String(meta.to_status).replace("_", " ")}
                                </Badge>
                              </span>
                            )}
                            {!isStatus && e.event_type !== "comment" && (
                              <span className="italic">({String(e.event_type).replace("_", " ")})</span>
                            )}
                          </div>
                          <div className="text-sm whitespace-pre-wrap">{e.message}</div>
                          {Array.isArray(meta.attachments) && meta.attachments.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {meta.attachments.map((a: any, i: number) => (
                                <button
                                  key={i}
                                  onClick={() => downloadAttachment(a.path, a.name)}
                                  className="w-full flex items-center gap-2 text-xs border rounded-md px-2 py-1 hover:bg-muted/40 text-left"
                                >
                                  <FileIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                                  <span className="truncate flex-1">{a.name}</span>
                                  <span className="text-muted-foreground">{fmtBytes(a.size)}</span>
                                  <Download className="h-3 w-3 text-muted-foreground" />
                                </button>
                              ))}
                            </div>
                          )}
                          {meta.actor_email && (
                            <div className="text-[10px] text-muted-foreground mt-1">by {meta.actor_email}</div>
                          )}
                        </div>
                      );
                    }) : <div className="text-xs text-muted-foreground italic">No activity yet.</div>}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Note (required for approve / reject)
                  </label>
                  <Textarea
                    rows={3}
                    value={note}
                    onChange={(e) => {
                      setNote(e.target.value);
                      if (noteError && e.target.value.trim()) setNoteError(null);
                    }}
                    placeholder="Explain the decision or add a comment…"
                    aria-invalid={!!noteError}
                    aria-describedby={noteError ? "decision-note-error" : undefined}
                    className={`mt-1 ${noteError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  />
                  {noteError && (
                    <p
                      id="decision-note-error"
                      role="alert"
                      className="mt-1.5 text-xs text-destructive"
                    >
                      {noteError}
                    </p>
                  )}
                </div>
              </div>

              <SheetFooter className="flex-wrap gap-2 mt-6 sm:justify-end">
                <Button variant="outline" size="sm" onClick={addComment} disabled={busy || !note.trim()}>
                  <MessageSquare className="h-4 w-4 mr-1.5" />Comment
                </Button>
                <Button variant="outline" size="sm" onClick={() => decide("in_review")} disabled={busy}>
                  <Eye className="h-4 w-4 mr-1.5" />In review
                </Button>
                <Button variant="destructive" size="sm" onClick={() => decide("rejected")} disabled={busy}>
                  <X className="h-4 w-4 mr-1.5" />Reject
                </Button>
                <Button size="sm" onClick={() => decide("approved")} disabled={busy}>
                  <Check className="h-4 w-4 mr-1.5" />Approve
                </Button>
                <Button size="sm" variant="secondary" onClick={() => { setFulfillText(active.decision_note ?? ""); setFulfillFiles([]); setFulfillOpen(true); }} disabled={busy}>
                  <CircleDot className="h-4 w-4 mr-1.5" />Fulfill…
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Fulfillment dialog */}
      <Dialog open={fulfillOpen} onOpenChange={(o) => { if (!fulfilling) setFulfillOpen(o); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CircleDot className="h-4 w-4 text-emerald-600" /> Fulfill request
            </DialogTitle>
            <DialogDescription>
              {active ? <>Send a response to <span className="font-medium">{active.employees?.full_name ?? "the employee"}</span> for "{active.subject}". You can include a message, files, or both.</> : null}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Response message</Label>
              <Textarea
                rows={4}
                value={fulfillText}
                onChange={(e) => setFulfillText(e.target.value)}
                placeholder="Explain how the request was resolved, link to documents, or give instructions…"
                maxLength={4000}
              />
              <div className="text-[11px] text-muted-foreground text-right mt-1">{fulfillText.length} / 4000</div>
            </div>

            <div>
              <Label className="flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5" /> Attach files
                <span className="text-[11px] font-normal text-muted-foreground">
                  (up to {MAX_FILES} files, 10 MB each)
                </span>
              </Label>
              <label className="mt-1 flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-muted/30 transition">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Click to add files or drop here</span>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => { addFulfillFiles(e.target.files); e.target.value = ""; }}
                />
              </label>
              {fulfillFiles.length > 0 && (
                <div className="mt-2 space-y-1">
                  {fulfillFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm border rounded-md px-2 py-1.5">
                      <FileIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate flex-1">{f.name}</span>
                      <span className="text-xs text-muted-foreground">{fmtBytes(f.size)}</span>
                      <button
                        onClick={() => setFulfillFiles(fulfillFiles.filter((_, idx) => idx !== i))}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Remove file"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setFulfillOpen(false)} disabled={fulfilling}>
              Cancel
            </Button>
            <Button onClick={submitFulfillment} disabled={fulfilling || (!fulfillText.trim() && fulfillFiles.length === 0)}>
              {fulfilling ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <CircleDot className="h-4 w-4 mr-1.5" />}
              Send & mark fulfilled
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
};

export default AdminHRRequests;

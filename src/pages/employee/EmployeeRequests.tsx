import { useEffect, useState } from "react";
import EmployeePortalLayout from "@/components/employee/EmployeePortalLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { useMyEmployee } from "@/hooks/use-my-employee";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/integrations/db/client";
import { useAuth } from "@/hooks/use-auth";
import {
  Plus, Loader2, MessageSquare, X, Paperclip, CalendarDays, FileText, Wallet,
  Banknote, Laptop, Lock, AlertTriangle, HelpCircle, Upload, ChevronLeft, ChevronRight,
  CheckCircle2, FileIcon, Trash2, Send, Eye, Check, Ban, Inbox, Sparkles, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { usePageTitle } from "@/hooks/use-page-title";

type CategoryDef = {
  value: string;
  label: string;
  description: string;
  icon: typeof CalendarDays;
  defaultSubject?: string;
};

const CATEGORIES: CategoryDef[] = [
  { value: "leave", label: "Leave request", description: "Casual, sick, earned, or unpaid leave.", icon: CalendarDays, defaultSubject: "Leave request" },
  { value: "document", label: "Document request", description: "Offer letter, salary certificate, NOC, experience letter.", icon: FileText, defaultSubject: "Document request" },
  { value: "payslip_reissue", label: "Payslip reissue", description: "Resend or correct a monthly payslip.", icon: Wallet, defaultSubject: "Payslip reissue" },
  { value: "salary_review", label: "Salary review", description: "Request appraisal, revision, or increment review.", icon: Banknote, defaultSubject: "Salary review request" },
  { value: "equipment", label: "Equipment / hardware", description: "Laptop, monitor, peripherals, or repair.", icon: Laptop, defaultSubject: "Equipment request" },
  { value: "access", label: "System access", description: "Tool access, software license, account permissions.", icon: Lock, defaultSubject: "System access request" },
  { value: "grievance", label: "Grievance", description: "Confidential complaint or workplace concern.", icon: AlertTriangle, defaultSubject: "Grievance" },
  { value: "other", label: "Other", description: "Any other request not listed above.", icon: HelpCircle, defaultSubject: "" },
];

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400",
  in_review: "bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-400",
  approved: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400",
  fulfilled: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
  cancelled: "bg-muted text-muted-foreground border-border",
};

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_FILES = 5;

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

const fmtBytes = (b: number) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
};

// ---------------- New request wizard ----------------
const NewRequestDialog = ({ employeeId, onCreated }: { employeeId: string; onCreated: () => void }) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [category, setCategory] = useState<CategoryDef | null>(null);
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [priority, setPriority] = useState("normal");
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setStep(1); setCategory(null); setSubject(""); setDetails("");
    setPriority("normal"); setFiles([]); setSaving(false);
  };

  const closeDialog = (next: boolean) => {
    setOpen(next);
    if (!next) setTimeout(reset, 200);
  };

  const pickCategory = (c: CategoryDef) => {
    setCategory(c);
    if (!subject && c.defaultSubject) setSubject(c.defaultSubject);
    setStep(2);
  };

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const next: File[] = [...files];
    for (const f of Array.from(incoming)) {
      if (next.length >= MAX_FILES) { toast.error(`Max ${MAX_FILES} files`); break; }
      if (f.size > MAX_FILE_BYTES) { toast.error(`${f.name} exceeds 10 MB`); continue; }
      next.push(f);
    }
    setFiles(next);
  };

  const removeFile = (idx: number) => setFiles(files.filter((_, i) => i !== idx));

  const submit = async () => {
    if (!category) return;
    if (!subject.trim()) { setStep(2); return toast.error("Add a subject"); }
    setSaving(true);
    try {
      // 1) Upload attachments
      const uploaded: Array<{ name: string; path: string; size: number; type: string }> = [];
      for (const f of files) {
        const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
        const { error: upErr } = await db.storage
          .from("hr-request-attachments")
          .upload(path, f, { contentType: f.type || "application/octet-stream", upsert: false });
        if (upErr) throw upErr;
        uploaded.push({ name: f.name, path, size: f.size, type: f.type });
      }

      // 2) Insert request row
      const { error } = await db.from("hr_requests").insert({
        employee_id: employeeId,
        created_by: user!.id,
        category: category.value,
        subject: subject.trim(),
        details: details.trim() || null,
        priority,
        attachments: uploaded,
      });
      if (error) throw error;

      setStep(4);
      onCreated();
    } catch (err: any) {
      toast.error(err.message || "Could not submit");
    } finally {
      setSaving(false);
    }
  };

  const stepLabels = ["Category", "Details", "Review", "Done"];

  return (
    <Dialog open={open} onOpenChange={closeDialog}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1.5" />New request</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New request</DialogTitle>
          <DialogDescription>
            Submit a request to HR / company admin. You'll be notified of the response.
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="flex items-center gap-2 my-2">
          {stepLabels.map((label, i) => {
            const n = i + 1;
            const active = step === n;
            const done = step > n;
            return (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold border ${
                  active ? "bg-primary text-primary-foreground border-primary" :
                  done ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" :
                  "bg-muted text-muted-foreground border-border"
                }`}>
                  {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : n}
                </div>
                <span className={`text-xs ${active ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                  {label}
                </span>
                {i < stepLabels.length - 1 && <div className="flex-1 h-px bg-border" />}
              </div>
            );
          })}
        </div>

        {/* Step 1 — Category */}
        {step === 1 && (
          <div className="grid sm:grid-cols-2 gap-3 mt-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => pickCategory(c)}
                className="text-left rounded-lg border bg-card hover:border-primary hover:shadow-sm transition p-4 flex gap-3 items-start"
              >
                <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <c.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-sm">{c.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{c.description}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 2 — Details + attachments */}
        {step === 2 && category && (
          <div className="space-y-4 mt-2">
            <div className="rounded-md bg-muted/40 border px-3 py-2 flex items-center gap-2 text-sm">
              <category.icon className="h-4 w-4 text-primary" />
              <span className="font-medium">{category.label}</span>
              <button className="ml-auto text-xs text-muted-foreground hover:underline" onClick={() => setStep(1)}>
                Change
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Subject *</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={150}
                  placeholder="Short summary"
                />
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Details</Label>
              <Textarea
                rows={5}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                maxLength={4000}
                placeholder="Add context — dates, reasons, links, specifics HR needs to act…"
              />
              <div className="text-[11px] text-muted-foreground text-right mt-1">{details.length} / 4000</div>
            </div>

            <div>
              <Label className="flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5" /> Attachments
                <span className="text-[11px] font-normal text-muted-foreground">
                  (up to {MAX_FILES} files, 10 MB each)
                </span>
              </Label>
              <label className="mt-1 flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-5 cursor-pointer hover:bg-muted/30 transition">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Click to add files or drop here</span>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
                />
              </label>
              {files.length > 0 && (
                <div className="mt-2 space-y-1">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm border rounded-md px-2 py-1.5">
                      <FileIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate flex-1">{f.name}</span>
                      <span className="text-xs text-muted-foreground">{fmtBytes(f.size)}</span>
                      <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3 — Review */}
        {step === 3 && category && (
          <div className="space-y-4 mt-2 text-sm">
            <div className="rounded-lg border divide-y">
              <Row label="Category" value={<span className="flex items-center gap-1.5"><category.icon className="h-3.5 w-3.5 text-primary" />{category.label}</span>} />
              <Row label="Subject" value={subject || <em className="text-muted-foreground">Empty</em>} />
              <Row label="Priority" value={<span className="capitalize">{priority}</span>} />
              <Row label="Details" value={details ? <span className="whitespace-pre-wrap">{details}</span> : <em className="text-muted-foreground">No details</em>} />
              <Row label="Attachments" value={
                files.length === 0 ? <em className="text-muted-foreground">None</em> :
                <ul className="space-y-1">
                  {files.map((f, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-xs">
                      <FileIcon className="h-3 w-3" />{f.name} <span className="text-muted-foreground">({fmtBytes(f.size)})</span>
                    </li>
                  ))}
                </ul>
              } />
            </div>
            <p className="text-xs text-muted-foreground">
              Once submitted, HR / admin will be notified. You can track the status under My Requests.
            </p>
          </div>
        )}

        {/* Step 4 — Done */}
        {step === 4 && (
          <div className="py-10 text-center space-y-3">
            <div className="h-14 w-14 mx-auto rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <div className="font-semibold text-lg">Request submitted</div>
              <p className="text-sm text-muted-foreground mt-1">
                Your request was sent successfully. You'll see updates here as HR responds.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="flex-row justify-between sm:justify-between mt-4">
          {step > 1 && step < 4 ? (
            <Button variant="ghost" onClick={() => setStep((step - 1) as 1 | 2 | 3)}>
              <ChevronLeft className="h-4 w-4 mr-1" />Back
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            {step === 4 ? (
              <Button onClick={() => closeDialog(false)}>Done</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => closeDialog(false)}>Cancel</Button>
                {step === 2 && (
                  <Button onClick={() => {
                    if (!subject.trim()) return toast.error("Subject is required");
                    setStep(3);
                  }}>
                    Review<ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
                {step === 3 && (
                  <Button onClick={submit} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit request"}
                  </Button>
                )}
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="grid grid-cols-[110px_1fr] gap-3 p-3">
    <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="text-sm">{value}</div>
  </div>
);

// ---------------- Timeline ----------------
type TimelineNode = {
  id: string;
  kind: "submitted" | "comment" | "status_change" | "event";
  author_role: string;
  created_at: string;
  message?: string | null;
  to_status?: string | null;
  from_status?: string | null;
  raw_type?: string;
  attachments?: Array<{ name: string; path: string; size: number; type: string }>;
};

const STATUS_ICON: Record<string, typeof Clock> = {
  pending: Clock,
  in_review: Eye,
  approved: Check,
  fulfilled: CheckCircle2,
  rejected: X,
  cancelled: Ban,
};

const STATUS_DOT: Record<string, string> = {
  pending: "bg-amber-500 text-white",
  in_review: "bg-blue-500 text-white",
  approved: "bg-emerald-500 text-white",
  fulfilled: "bg-emerald-600 text-white",
  rejected: "bg-destructive text-destructive-foreground",
  cancelled: "bg-muted-foreground text-background",
};

const Timeline = ({ request, events, onDownload }: { request: any; events: any[]; onDownload: (path: string, name: string) => void }) => {
  const nodes: TimelineNode[] = [
    {
      id: `submitted-${request.id}`,
      kind: "submitted",
      author_role: "employee",
      created_at: request.created_at,
      message: "Request submitted",
      to_status: "pending",
    },
    ...events.map((e: any): TimelineNode => ({
      id: e.id,
      kind: e.event_type === "comment" ? "comment" :
            e.event_type === "status_change" ? "status_change" : "event",
      author_role: e.author_role,
      created_at: e.created_at,
      message: e.message,
      from_status: e.metadata?.from_status ?? null,
      to_status: e.metadata?.to_status ?? null,
      raw_type: e.event_type,
      attachments: Array.isArray(e.metadata?.attachments) ? e.metadata.attachments : [],
    })),
  ];

  return (
    <ol className="relative border-l-2 border-border ml-3 space-y-4">
      {nodes.map((n) => {
        const status = n.to_status as string | undefined;
        const Icon = n.kind === "comment"
          ? MessageSquare
          : n.kind === "submitted"
          ? Sparkles
          : status && STATUS_ICON[status]
          ? STATUS_ICON[status]
          : Inbox;
        const dotColor = n.kind === "comment"
          ? "bg-muted text-foreground"
          : status && STATUS_DOT[status]
          ? STATUS_DOT[status]
          : "bg-primary text-primary-foreground";
        return (
          <li key={n.id} className="ml-5 relative">
            <span className={`absolute -left-[34px] top-0 h-6 w-6 rounded-full flex items-center justify-center ring-4 ring-background ${dotColor}`}>
              <Icon className="h-3 w-3" />
            </span>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold capitalize text-foreground">
                {n.author_role === "employee" ? "You" : n.author_role}
              </span>
              <span>·</span>
              <span title={new Date(n.created_at).toLocaleString()}>{fmtDate(n.created_at)}</span>
              {n.kind === "status_change" && n.from_status && n.to_status && (
                <span className="inline-flex items-center gap-1 ml-1">
                  <Badge className={STATUS_COLOR[n.from_status]} variant="outline">
                    {n.from_status.replace("_", " ")}
                  </Badge>
                  <span>→</span>
                  <Badge className={STATUS_COLOR[n.to_status]} variant="outline">
                    {n.to_status.replace("_", " ")}
                  </Badge>
                </span>
              )}
              {n.kind === "event" && n.raw_type && (
                <span className="italic">({n.raw_type.replace("_", " ")})</span>
              )}
            </div>
            {n.message && (
              <div className={`mt-1 text-sm whitespace-pre-wrap ${
                n.kind === "comment" ? "border rounded-md p-2.5 bg-card" : "text-foreground"
              }`}>
                {n.message}
              </div>
            )}
            {n.attachments && n.attachments.length > 0 && (
              <div className="mt-2 space-y-1">
                {n.attachments.map((a, i) => (
                  <button
                    key={i}
                    onClick={() => onDownload(a.path, a.name)}
                    className="w-full flex items-center gap-2 text-xs border rounded-md px-2 py-1 hover:bg-muted/40 text-left"
                  >
                    <FileIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1">{a.name}</span>
                    <span className="text-muted-foreground">{fmtBytes(a.size)}</span>
                  </button>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
};

// ---------------- Detail view ----------------
const RequestDetail = ({ request, onClose, onChanged }: any) => {
  const { user } = useAuth();
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);

  const { data: events, refetch } = useQuery({
    queryKey: ["hr-request-events", request.id],
    queryFn: async () => {
      const { data } = await db
        .from("hr_request_events")
        .select("id, author_role, event_type, message, created_at, metadata")
        .eq("request_id", request.id)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  // Realtime: stream new events + status changes for this request
  useEffect(() => {
    const channel = db
      .channel(`hr-request-${request.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "hr_request_events",
          filter: `request_id=eq.${request.id}`,
        },
        () => refetch()
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "hr_requests",
          filter: `id=eq.${request.id}`,
        },
        () => {
          refetch();
          onChanged?.();
        }
      )
      .subscribe();

    return () => {
      db.removeChannel(channel);
    };
  }, [request.id, refetch, onChanged]);

  const addComment = async () => {
    if (!comment.trim()) return;
    setPosting(true);
    try {
      const { error } = await db.from("hr_request_events").insert({
        request_id: request.id,
        author_id: user!.id,
        author_role: "employee",
        event_type: "comment",
        message: comment.trim(),
      });
      if (error) throw error;
      setComment("");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Could not post comment");
    } finally {
      setPosting(false);
    }
  };

  const cancel = async () => {
    if (!confirm("Cancel this request?")) return;
    const { error } = await db.from("hr_requests").update({ status: "cancelled" }).eq("id", request.id);
    if (error) return toast.error(error.message);
    toast.success("Request cancelled");
    onChanged();
    onClose();
  };

  const downloadAttachment = async (path: string, name: string) => {
    const { data, error } = await db.storage
      .from("hr-request-attachments")
      .createSignedUrl(path, 60);
    if (error || !data) return toast.error(error?.message || "Could not get download URL");
    const a = document.createElement("a");
    a.href = data.signedUrl; a.download = name; a.target = "_blank";
    a.click();
  };

  const attachments: Array<{ name: string; path: string; size: number; type: string }> =
    Array.isArray(request.attachments) ? request.attachments : [];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">{request.subject}
            <Badge className={STATUS_COLOR[request.status]} variant="outline">{request.status.replace("_", " ")}</Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div>Category: <span className="text-foreground capitalize">{request.category.replace("_", " ")}</span></div>
            <div>Priority: <span className="text-foreground capitalize">{request.priority}</span></div>
            <div>Submitted: <span className="text-foreground">{fmtDate(request.created_at)}</span></div>
            {request.decided_at && <div>Decided: <span className="text-foreground">{fmtDate(request.decided_at)}</span></div>}
          </div>
          {request.details && <p className="whitespace-pre-wrap border rounded-md p-3 bg-muted/40">{request.details}</p>}

          {attachments.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 flex items-center gap-1">
                <Paperclip className="h-3 w-3" /> Attachments
              </div>
              <div className="space-y-1">
                {attachments.map((a, i) => (
                  <button key={i} onClick={() => downloadAttachment(a.path, a.name)}
                    className="w-full flex items-center gap-2 text-sm border rounded-md px-2 py-1.5 hover:bg-muted/40 text-left">
                    <FileIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1">{a.name}</span>
                    <span className="text-xs text-muted-foreground">{fmtBytes(a.size)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {request.decision_note && (
            <div className="border-l-4 border-primary pl-3 py-1 text-sm">
              <div className="font-semibold text-xs text-muted-foreground uppercase">HR note</div>
              {request.decision_note}
            </div>
          )}

          <div>
            <div className="font-semibold mb-3 flex items-center gap-1.5">
              <Clock className="h-4 w-4" /> Timeline
            </div>
            <Timeline
              request={request}
              events={events ?? []}
              onDownload={downloadAttachment}
            />
            <div className="mt-4 flex gap-2 items-start">
              <Textarea
                rows={2}
                placeholder="Add a comment for HR…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={1000}
              />
              <Button onClick={addComment} disabled={posting || !comment.trim()}>
                {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-1.5" />Post</>}
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          {(request.status === "pending" || request.status === "in_review") && (
            <Button variant="outline" onClick={cancel}><X className="h-4 w-4 mr-1.5" />Cancel request</Button>
          )}
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ---------------- List page ----------------
const EmployeeRequests = () => {
  usePageTitle("Employee · Requests");
  const { data: emp } = useMyEmployee();
  const qc = useQueryClient();
  const [active, setActive] = useState<any | null>(null);

  const { data: requests, isLoading, refetch } = useQuery({
    queryKey: ["employee-requests", emp?.id],
    enabled: !!emp?.id,
    queryFn: async () => {
      const { data, error } = await db
        .from("hr_requests")
        .select("*")
        .eq("employee_id", emp!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <EmployeePortalLayout
      title="My Requests"
      description="Submit and track HR or company requests. Super admin reviews each one."
      actions={emp && <NewRequestDialog employeeId={emp.id} onCreated={() => { refetch(); qc.invalidateQueries({ queryKey: ["employee-stats"] }); }} />}
    >
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
          ) : !requests || requests.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No requests yet. Click <strong>New request</strong> to submit one.
            </div>
          ) : (
            <div className="divide-y">
              {requests.map((r: any) => {
                const attachCount = Array.isArray(r.attachments) ? r.attachments.length : 0;
                return (
                  <button key={r.id} onClick={() => setActive(r)} className="w-full text-left flex items-center justify-between p-4 gap-4 hover:bg-muted/40">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{r.subject}</div>
                      <div className="text-xs text-muted-foreground capitalize flex items-center gap-1.5">
                        {r.category.replace("_", " ")} · {fmtDate(r.created_at)}
                        {attachCount > 0 && (
                          <span className="inline-flex items-center gap-0.5">· <Paperclip className="h-3 w-3" />{attachCount}</span>
                        )}
                      </div>
                    </div>
                    <Badge className={STATUS_COLOR[r.status]} variant="outline">{r.status.replace("_", " ")}</Badge>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {active && <RequestDetail request={active} onClose={() => setActive(null)} onChanged={refetch} />}
    </EmployeePortalLayout>
  );
};

export default EmployeeRequests;

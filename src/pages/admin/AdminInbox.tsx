import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useState } from "react";
import {
  Mail, Search, Loader2, Inbox as InboxIcon, RefreshCw, Radio,
  ArrowLeft, Send, ArrowDownLeft, ArrowUpRight, CheckCircle2, AlertCircle, Clock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import AdminReplyDialog from "@/components/admin/AdminReplyDialog";
import AttachmentList, { InlineAttachmentPreviews } from "@/components/admin/EmailAttachmentList";
import DOMPurify from "isomorphic-dompurify";

type Attachment = {
  filename: string;
  contentType: string;
  size: number;
  path: string;
  contentId?: string;
};

type InboundEmail = {
  id: string;
  message_id: string | null;
  from_email: string;
  from_name: string | null;
  to_email: string | null;
  subject: string | null;
  snippet: string | null;
  body_text: string | null;
  body_html: string | null;
  received_at: string;
  is_read: boolean;
  is_archived: boolean;
  in_reply_to: string | null;
  metadata: { attachments?: Attachment[] } | null;
};

type AdminReply = {
  id: string;
  recipient_email: string;
  subject: string;
  body: string;
  sent_by_name: string | null;
  sent_by_email: string | null;
  created_at: string;
  status: string;
};

type ThreadItem =
  | { kind: "in"; at: string; email: InboundEmail }
  | { kind: "out"; at: string; reply: AdminReply };

const AdminInbox = () => {
  const [emails, setEmails] = useState<InboundEmail[]>([]);
  const [replies, setReplies] = useState<AdminReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: emailsData, error: e1 }, { data: repliesData, error: e2 }] =
      await Promise.all([
        supabase
          .from("inbound_emails")
          .select(
            "id,message_id,from_email,from_name,to_email,subject,snippet,body_text,body_html,received_at,is_read,is_archived,in_reply_to,metadata",
          )
          .eq("is_archived", false)
          .order("received_at", { ascending: false })
          .limit(200),
        supabase
          .from("admin_replies")
          .select("id,recipient_email,subject,body,sent_by_name,sent_by_email,created_at,status")
          .order("created_at", { ascending: false })
          .limit(300),
      ]);
    if (e1) toast.error(`Failed to load inbox: ${e1.message}`);
    else setEmails((emailsData ?? []) as InboundEmail[]);
    if (e2) console.warn("[inbox] replies load failed:", e2.message);
    else setReplies((repliesData ?? []) as AdminReply[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("inbox-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "inbound_emails" },
        (payload) => {
          const row = payload.new as InboundEmail;
          setEmails((prev) => [row, ...prev.filter((e) => e.id !== row.id)]);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "inbound_emails" },
        (payload) => {
          const row = payload.new as InboundEmail;
          setEmails((prev) =>
            row.is_archived
              ? prev.filter((e) => e.id !== row.id)
              : prev.map((e) => (e.id === row.id ? { ...e, ...row } : e)),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_replies" },
        (payload) => {
          const row = payload.new as AdminReply;
          setReplies((prev) => [row, ...prev.filter((r) => r.id !== row.id)]);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "admin_replies" },
        (payload) => {
          const row = payload.new as AdminReply;
          setReplies((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...row } : r)));
        },
      )
      .subscribe((status) => {
        setLive(status === "SUBSCRIBED");
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return emails;
    return emails.filter((e) =>
      [e.from_email, e.from_name, e.subject, e.snippet]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    );
  }, [emails, search]);

  const selected = useMemo(
    () => emails.find((e) => e.id === selectedId) ?? null,
    [emails, selectedId],
  );

  const thread: ThreadItem[] = useMemo(() => {
    if (!selected) return [];
    const addr = selected.from_email.toLowerCase();
    const ins: ThreadItem[] = emails
      .filter((e) => e.from_email.toLowerCase() === addr)
      .map((e) => ({ kind: "in" as const, at: e.received_at, email: e }));
    const outs: ThreadItem[] = replies
      .filter((r) => r.recipient_email.toLowerCase() === addr)
      .map((r) => ({ kind: "out" as const, at: r.created_at, reply: r }));
    return [...ins, ...outs].sort(
      (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
    );
  }, [selected, emails, replies]);

  const markRead = async (id: string, value = true) => {
    const { error } = await supabase
      .from("inbound_emails")
      .update({ is_read: value })
      .eq("id", id);
    if (error) toast.error(error.message);
  };

  const archive = async (id: string) => {
    const { error } = await supabase
      .from("inbound_emails")
      .update({ is_archived: true })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Archived");
      if (selectedId === id) setSelectedId(null);
    }
  };

  const pollNow = async () => {
    setPolling(true);
    try {
      const { data, error } = await supabase.functions.invoke("imap-poll", {});
      if (error) throw error;
      const inserted = (data as any)?.inserted ?? 0;
      toast.success(
        inserted > 0 ? `Fetched ${inserted} new email(s)` : "Inbox is up to date",
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to poll inbox");
    } finally {
      setPolling(false);
    }
  };

  const unreadCount = emails.filter((e) => !e.is_read).length;

  return (
    <SuperAdminLayout>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" /> Inbox
          </h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            <Radio className={`h-3.5 w-3.5 ${live ? "text-emerald-400 animate-pulse" : "text-muted-foreground"}`} />
            {live ? "Live — incoming & outgoing in real time" : "Connecting to realtime…"}
            <span className="text-muted-foreground">·</span>
            <span>{unreadCount} unread</span>
            <span className="text-muted-foreground">·</span>
            <span>{replies.length} sent</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={pollNow} disabled={polling}>
            {polling ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Fetch now
          </Button>
        </div>
      </div>

      <div className="glass-card !flex-row !h-auto items-center gap-3 px-4 py-3 mb-4">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by sender, subject, or content…"
          className="border-0 bg-transparent focus-visible:ring-0 px-0 h-8"
        />
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {filtered.length} {filtered.length === 1 ? "email" : "emails"}
        </span>
      </div>

      {loading ? (
        <div className="glass-card flex flex-col items-center justify-center px-6 py-16 gap-3 min-h-[280px]">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
          <p className="text-sm font-medium">Loading inbox…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center px-6 py-16 gap-3 min-h-[280px]">
          <div className="h-12 w-12 rounded-full bg-secondary/60 flex items-center justify-center">
            <InboxIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No replies yet</p>
          <p className="text-xs text-muted-foreground text-center max-w-sm">
            New customer replies to your emails will appear here in real time.
          </p>
        </div>
      ) : selected ? (
        <div className="glass-card !h-auto p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setSelectedId(null)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to inbox
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => markRead(selected.id, !selected.is_read)}>
                Mark {selected.is_read ? "unread" : "read"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => archive(selected.id)}>
                Archive
              </Button>
              <Button size="sm" onClick={() => setReplyOpen(true)}>
                <Send className="h-3.5 w-3.5 mr-1" /> Reply
              </Button>
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold">{selected.subject || "(no subject)"}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Conversation with{" "}
              <span className="font-medium text-foreground">
                {selected.from_name || selected.from_email}
              </span>{" "}
              &lt;{selected.from_email}&gt;
            </p>
          </div>

          <div className="mt-5 space-y-4">
            {thread.map((item, idx) =>
              item.kind === "in" ? (
                <div key={`in-${item.email.id}-${idx}`} className="rounded-lg border border-border bg-secondary/30 p-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="secondary" className="bg-primary/15 text-primary border-primary/30">
                        <ArrowDownLeft className="h-3 w-3 mr-1" /> Received
                      </Badge>
                      <span className="font-medium text-foreground text-sm">
                        {item.email.from_name || item.email.from_email}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.at).toLocaleString()}
                    </span>
                  </div>
                  {item.email.subject && item.email.subject !== selected.subject && (
                    <p className="text-xs text-muted-foreground mb-2">Subject: {item.email.subject}</p>
                  )}
                  {item.email.body_html ? (
                    <div
                      className="prose prose-invert max-w-none text-sm"
                      // Sanitize inbound email HTML — sender-controlled content.
                      // Strips <script>, inline event handlers, javascript: URLs, etc.
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(item.email.body_html, {
                          FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "link", "meta"],
                          FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur"],
                          ALLOW_DATA_ATTR: false,
                        }),
                      }}
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap font-sans text-sm text-foreground/90">
                      {item.email.body_text || item.email.snippet || "(empty message)"}
                    </pre>
                  )}
                  <InlineAttachmentPreviews attachments={item.email.metadata?.attachments ?? []} />
                  <AttachmentList attachments={item.email.metadata?.attachments ?? []} />
                </div>
              ) : (
                <div key={`out-${item.reply.id}-${idx}`} className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                        <ArrowUpRight className="h-3 w-3 mr-1" /> Sent
                      </Badge>
                      {(() => {
                        const s = (item.reply.status || "").toLowerCase();
                        if (s === "failed" || s === "error" || s === "bounced") {
                          return (
                            <Badge variant="secondary" className="bg-destructive/15 text-destructive border-destructive/30">
                              <AlertCircle className="h-3 w-3 mr-1" /> {item.reply.status}
                            </Badge>
                          );
                        }
                        if (s === "pending" || s === "queued") {
                          return (
                            <Badge variant="secondary" className="bg-amber-500/15 text-amber-400 border-amber-500/30">
                              <Clock className="h-3 w-3 mr-1" /> {item.reply.status}
                            </Badge>
                          );
                        }
                        return (
                          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Delivered
                          </Badge>
                        );
                      })()}
                      <span className="font-medium text-foreground text-sm">
                        {item.reply.sent_by_name || item.reply.sent_by_email || "You"}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">Subject: {item.reply.subject}</p>
                  <pre className="whitespace-pre-wrap font-sans text-sm text-foreground/90">
                    {item.reply.body}
                  </pre>
                </div>
              ),
            )}
          </div>

          <AdminReplyDialog
            open={replyOpen}
            onOpenChange={setReplyOpen}
            recipientEmail={selected.from_email}
            recipientName={selected.from_name ?? undefined}
            defaultSubject={
              selected.subject?.toLowerCase().startsWith("re:")
                ? selected.subject
                : `Re: ${selected.subject ?? ""}`.trim()
            }
            source="inbox reply"
            targetType="inbound_email"
            targetId={selected.id}
            onSent={() => load()}
          />
        </div>
      ) : (
        <div className="glass-card !h-auto divide-y divide-border overflow-hidden">
          {filtered.map((e) => {
            const replyCount = replies.filter(
              (r) => r.recipient_email.toLowerCase() === e.from_email.toLowerCase(),
            ).length;
            return (
              <button
                key={e.id}
                onClick={() => {
                  setSelectedId(e.id);
                  if (!e.is_read) markRead(e.id, true);
                }}
                className={`w-full text-left px-4 py-3 hover:bg-secondary/40 transition-colors flex items-start gap-3 ${
                  !e.is_read ? "bg-primary/5" : ""
                }`}
              >
                <div className="h-9 w-9 rounded-full bg-secondary/60 flex items-center justify-center text-sm font-semibold uppercase shrink-0">
                  {(e.from_name || e.from_email).slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className={`text-sm truncate ${!e.is_read ? "font-semibold" : ""}`}>
                      {e.from_name || e.from_email}
                    </p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(e.received_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className={`text-sm truncate ${!e.is_read ? "font-medium" : "text-foreground/90"}`}>
                    {e.subject || "(no subject)"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {e.snippet || ""}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {!e.is_read && (
                    <Badge variant="secondary" className="bg-primary/15 text-primary border-primary/30">
                      New
                    </Badge>
                  )}
                  {replyCount > 0 && (
                    <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400">
                      <ArrowUpRight className="h-2.5 w-2.5 mr-0.5" /> {replyCount}
                    </Badge>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </SuperAdminLayout>
  );
};

export default AdminInbox;

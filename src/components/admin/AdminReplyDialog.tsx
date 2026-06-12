import { useEffect, useState } from "react";
import { db } from "@/integrations/db/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Send } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientEmail: string;
  recipientName?: string;
  defaultSubject?: string;
  context?: string;
  /** Called after the reply is sent; use to update lead status / notes. */
  onSent?: (info: { subject: string; body: string }) => void | Promise<void>;
  /** Friendly label shown in the dialog title (e.g., "investor lead"). */
  source?: string;
  /** Logs the reply to admin_replies for thread history. */
  targetType?: "invest_lead" | "form_submission" | "inbound_email";
  targetId?: string;
}

const AdminReplyDialog = ({
  open,
  onOpenChange,
  recipientEmail,
  recipientName,
  defaultSubject = "",
  context,
  onSent,
  source,
  targetType,
  targetId,
}: Props) => {
  const { user } = useAuth();
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setSubject(defaultSubject);
      setBody("");
    }
  }, [open, defaultSubject]);

  const send = async () => {
    if (!subject.trim()) return toast.error("Subject is required");
    if (body.trim().length < 5) return toast.error("Reply body is too short");
    setSending(true);
    try {
      const agentName =
        (user?.user_metadata as any)?.full_name ||
        (user?.email ? user.email.split("@")[0] : "Dynime team");
      const trimmedSubject = subject.trim();
      const trimmedBody = body.trim();
      const { error } = await db.functions.invoke("send-transactional-email", {
        body: {
          templateName: "admin-reply",
          recipientEmail,
          idempotencyKey: `reply-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          templateData: {
            recipientName,
            subject: trimmedSubject,
            body: trimmedBody,
            agentName,
            agentEmail: user?.email,
            context,
          },
        },
      });
      if (error) throw error;

      // Log the reply for thread history (best-effort).
      if (targetType && targetId) {
        const { error: logErr } = await db.from("admin_replies" as any).insert({
          target_type: targetType,
          target_id: targetId,
          recipient_email: recipientEmail,
          subject: trimmedSubject,
          body: trimmedBody,
          sent_by: user?.id ?? null,
          sent_by_name: agentName,
          sent_by_email: user?.email ?? null,
          status: "sent",
          metadata: { context, source },
        });
        if (logErr) console.warn("[admin-reply] log failed:", logErr.message);
      }

      toast.success(`Reply sent to ${recipientEmail}`);
      await onSent?.({ subject: trimmedSubject, body: trimmedBody });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Could not send reply");
    } finally {
      setSending(false);
    }

  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Reply to {recipientName || recipientEmail}</DialogTitle>
          <DialogDescription>
            Sends an email from your configured Dynime address{source ? ` · ${source}` : ""}.
            The recipient&apos;s reply will land in your inbox.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="reply-to">To</Label>
            <Input id="reply-to" value={recipientEmail} disabled />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reply-subject">Subject</Label>
            <Input
              id="reply-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Re: your enquiry"
              maxLength={180}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reply-body">Message</Label>
            <Textarea
              id="reply-body"
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your reply… (blank lines start a new paragraph)"
              maxLength={4000}
            />
            <p className="text-[11px] text-muted-foreground">{body.length}/4000</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={send} disabled={sending}>
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Send reply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminReplyDialog;

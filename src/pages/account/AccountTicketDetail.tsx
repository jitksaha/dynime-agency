import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import AccountLayout from "@/components/account/AccountLayout";
import { useAuth } from "@/hooks/use-auth";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, CheckCircle2, RotateCcw, Shield } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { toast } from "sonner";
import { format } from "date-fns";

const STATUS_VARIANTS: Record<string, string> = {
  open: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  resolved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  closed: "bg-muted text-muted-foreground border-border",
};

const AccountTicketDetail = () => {
  usePageTitle("Ticket");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => apiGet<any>(`/tickets/${id}`),
    enabled: !!id,
  });

  const { data: messages } = useQuery({
    queryKey: ["ticket-messages", id],
    queryFn: () => apiGet<any[]>(`/tickets/${id}/messages`),
    enabled: !!id,
    refetchInterval: 15000,
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  const send = async () => {
    if (!reply.trim() || !user || !ticket) return;
    setSending(true);
    try {
      await apiPost(`/tickets/${ticket.id}/messages`, { message: reply.trim() });
      setReply("");
      qc.invalidateQueries({ queryKey: ["ticket-messages", id] });
      qc.invalidateQueries({ queryKey: ["ticket", id] });
    } catch (e: any) {
      toast.error(e.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const setStatus = async (status: string) => {
    if (!ticket) return;
    try {
      await apiPatch(`/tickets/${ticket.id}/status`, { status });
      toast.success(`Ticket ${status}`);
      qc.invalidateQueries({ queryKey: ["ticket", id] });
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    }
  };

  if (isLoading) {
    return (
      <AccountLayout title="Ticket">
        <Skeleton className="h-96 rounded-xl" />
      </AccountLayout>
    );
  }

  if (!ticket) {
    return (
      <AccountLayout title="Ticket not found">
        <div className="rounded-2xl border border-border bg-card text-center py-12">
          <p className="text-muted-foreground mb-4">This ticket doesn't exist or you don't have access.</p>
          <Button asChild><Link to="/account/tickets">Back to tickets</Link></Button>
        </div>
      </AccountLayout>
    );
  }

  const isClosed = ticket.status === "closed" || ticket.status === "resolved";

  return (
    <AccountLayout
      title={ticket.subject}
      description={`Ticket ${ticket.ticket_number} · opened ${format(new Date(ticket.created_at), "MMM d, yyyy")}`}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/account/tickets")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          {ticket.status !== "resolved" && ticket.status !== "closed" ? (
            <Button variant="outline" size="sm" onClick={() => setStatus("resolved")}>
              <CheckCircle2 className="w-4 h-4 mr-2" /> Mark resolved
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setStatus("open")}>
              <RotateCcw className="w-4 h-4 mr-2" /> Reopen
            </Button>
          )}
        </div>
      }
    >
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Badge variant="outline" className={STATUS_VARIANTS[ticket.status] || ""}>{ticket.status}</Badge>
        <Badge variant="outline" className="capitalize">{ticket.priority} priority</Badge>
        <Badge variant="outline" className="capitalize">{ticket.category}</Badge>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-4 md:p-6 space-y-4 max-h-[60vh] overflow-y-auto bg-muted/20">
          {(messages || []).map((m: any) => {
            const isAdmin = m.sender_type === "admin";
            return (
              <div
                key={m.id}
                className={`flex gap-3 ${isAdmin ? "flex-row" : "flex-row-reverse"}`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  isAdmin ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"
                }`}>
                  {isAdmin ? <Shield className="w-4 h-4" /> : (m.sender_name?.[0] || "Y").toUpperCase()}
                </div>
                <div className={`max-w-[75%] ${isAdmin ? "items-start" : "items-end"} flex flex-col`}>
                  <div className={`rounded-2xl px-4 py-2.5 ${
                    isAdmin
                      ? "bg-card border border-border rounded-tl-sm"
                      : "bg-primary text-primary-foreground rounded-tr-sm"
                  }`}>
                    <p className="text-sm whitespace-pre-wrap break-words">{m.message}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 px-1">
                    {isAdmin ? "Support" : "You"} · {format(new Date(m.created_at), "MMM d, h:mm a")}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        {!isClosed ? (
          <div className="border-t border-border p-3 md:p-4 bg-card">
            <Textarea
              placeholder="Write a reply…"
              rows={3}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              className="resize-none mb-2"
            />
            <div className="flex justify-end">
              <Button onClick={send} disabled={sending || !reply.trim()}>
                <Send className="w-4 h-4 mr-2" />
                {sending ? "Sending…" : "Send reply"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="border-t border-border p-4 bg-muted/30 text-center text-sm text-muted-foreground">
            This ticket is {ticket.status}. Reopen it to add a reply.
          </div>
        )}
      </div>
    </AccountLayout>
  );
};

export default AccountTicketDetail;

import { useState } from "react";
import { Link } from "react-router-dom";
import AccountLayout from "@/components/account/AccountLayout";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { LifeBuoy, Plus, MessageSquare, ChevronRight, Clock } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const STATUS_VARIANTS: Record<string, string> = {
  open: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  resolved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  closed: "bg-muted text-muted-foreground border-border",
};

const PRIORITY_VARIANTS: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-primary/10 text-primary",
  high: "bg-orange-500/10 text-orange-600",
  urgent: "bg-destructive/10 text-destructive",
};

const NewTicketDialog = ({ onCreated }: { onCreated: () => void }) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    subject: "",
    category: "general",
    priority: "normal",
    message: "",
  });

  const submit = async () => {
    if (!user?.email) return;
    if (!form.subject.trim() || !form.message.trim()) {
      toast.error("Subject and message are required");
      return;
    }
    setSubmitting(true);
    try {
      const fullName = (user.user_metadata as any)?.full_name as string | undefined;
      const { data: ticket, error } = await supabase
        .from("support_tickets")
        .insert({
          user_id: user.id,
          customer_email: user.email,
          customer_name: fullName || null,
          subject: form.subject.trim(),
          category: form.category,
          priority: form.priority,
        })
        .select()
        .single();
      if (error) throw error;

      const { error: msgError } = await supabase
        .from("ticket_messages")
        .insert({
          ticket_id: ticket.id,
          sender_type: "customer",
          sender_name: fullName || null,
          sender_email: user.email,
          message: form.message.trim(),
        });
      if (msgError) throw msgError;

      toast.success(`Ticket ${ticket.ticket_number} created`);
      setForm({ subject: "", category: "general", priority: "normal", message: "" });
      setOpen(false);
      onCreated();
    } catch (e: any) {
      toast.error(e.message || "Failed to create ticket");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="w-4 h-4 mr-2" /> New Ticket</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Open a support ticket</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Briefly describe your issue"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="orders">Orders</SelectItem>
                  <SelectItem value="formation">Company Formation</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
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
          <div className="space-y-1.5">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              rows={5}
              placeholder="Provide as much detail as possible…"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const AccountTickets = () => {
  usePageTitle("Support Tickets");
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["account-tickets", user?.email],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .or(`user_id.eq.${user!.id},customer_email.eq.${user!.email}`)
        .order("last_reply_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.email,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["account-tickets"] });

  return (
    <AccountLayout
      title="Support Tickets"
      description="Get help from our team. Open a ticket and track every conversation in one place."
      actions={<NewTicketDialog onCreated={refresh} />}
    >
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : !tickets || tickets.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <LifeBuoy className="w-8 h-8" />
          </div>
          <h3 className="font-heading text-lg font-semibold mb-1">No tickets yet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            Need help with an order, an invoice, or anything else? Our team usually replies within a few hours.
          </p>
          <NewTicketDialog onCreated={refresh} />
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map((t: any) => (
            <Link
              key={t.id}
              to={`/account/tickets/${t.id}`}
              className="group flex items-start gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs font-mono text-muted-foreground">{t.ticket_number}</span>
                  <Badge variant="outline" className={STATUS_VARIANTS[t.status] || ""}>
                    {t.status}
                  </Badge>
                  <Badge variant="outline" className={PRIORITY_VARIANTS[t.priority] || ""}>
                    {t.priority}
                  </Badge>
                  <Badge variant="outline" className="capitalize">{t.category}</Badge>
                </div>
                <p className="font-semibold text-sm truncate">{t.subject}</p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  Last reply {formatDistanceToNow(new Date(t.last_reply_at), { addSuffix: true })} · by {t.last_reply_by}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </AccountLayout>
  );
};

export default AccountTickets;

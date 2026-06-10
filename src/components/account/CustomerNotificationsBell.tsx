import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Check, CheckCheck, ShieldAlert, MessageSquare, CreditCard, CheckCircle2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export interface CustomerNotification {
  id: string;
  kind: 'order' | 'ticket' | 'verification' | 'invoice';
  title: string;
  body: string;
  link: string;
  created_at: string;
  priority: 'info' | 'warning' | 'success' | 'danger';
}

const ICONS = {
  order: CreditCard,
  ticket: MessageSquare,
  verification: ShieldAlert,
  invoice: CreditCard,
};

const PRIORITY_COLORS = {
  info: "text-primary bg-primary/10",
  warning: "text-amber-500 bg-amber-500/10",
  success: "text-emerald-500 bg-emerald-500/10",
  danger: "text-destructive bg-destructive/10",
};

export const fetchCustomerNotifications = async (userEmail: string, fullName?: string | null) => {
  const [orders, tickets, verifications] = await Promise.all([
    apiGet<any[]>("/orders/mine").catch(() => []),
    apiGet<any[]>("/tickets/mine").catch(() => []),
    apiGet<{ kyc: any; kyb: any[] }>("/verification/me").catch(() => ({ kyc: null, kyb: [] })),
  ]);

  const list: CustomerNotification[] = [];

  // 1. Support Tickets
  (tickets || []).forEach((t: any) => {
    if (t.status === "open" || t.status === "pending") {
      const isRepliedByAgent = t.last_reply_by &&
        t.last_reply_by.toLowerCase() !== userEmail.toLowerCase() &&
        (!fullName || t.last_reply_by.toLowerCase() !== fullName.toLowerCase());

      if (isRepliedByAgent) {
        list.push({
          id: `ticket-reply-${t.id}-${new Date(t.last_reply_at).getTime()}`,
          kind: 'ticket',
          title: "Support Ticket Update",
          body: `Agent replied on ticket: "${t.subject}"`,
          link: `/account/tickets/${t.id}`,
          created_at: t.last_reply_at || t.updated_at || new Date().toISOString(),
          priority: 'info',
        });
      }
    }
  });

  // 2. Orders & Invoices
  (orders || []).forEach((o: any) => {
    const isPaid = ["paid", "completed", "verified"].includes(o.status);
    const invoiceLabel = o.invoice_number || `Order #${o.id.slice(0, 8).toUpperCase()}`;

    if (!isPaid) {
      list.push({
        id: `invoice-pending-${o.id}`,
        kind: 'invoice',
        title: "Unpaid Invoice",
        body: `${invoiceLabel} is pending payment of $${Number(o.total).toFixed(2)}.`,
        link: `/account/invoices`,
        created_at: o.created_at,
        priority: 'warning',
      });
    } else {
      const days = (Date.now() - new Date(o.updated_at).getTime()) / (1000 * 60 * 60 * 24);
      if (days <= 7) {
        list.push({
          id: `invoice-paid-${o.id}`,
          kind: 'order',
          title: "Payment Successful",
          body: `Payment for ${invoiceLabel} was successfully received.`,
          link: `/account/orders`,
          created_at: o.updated_at,
          priority: 'success',
        });
      }
    }
  });

  // 3. Verifications
  const kyc = verifications?.kyc;
  if (!kyc || kyc.status === "not_started" || kyc.status === "not_submitted") {
    list.push({
      id: "kyc-required",
      kind: 'verification',
      title: "KYC Identity Verification",
      body: "Identity verification is required to unlock all premium account features.",
      link: "/account/verification",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      priority: 'warning',
    });
  } else if (kyc.status === "rejected" || kyc.status === "failed") {
    list.push({
      id: `kyc-failed-${new Date(kyc.updated_at || kyc.created_at).getTime()}`,
      kind: 'verification',
      title: "KYC Verification Failed",
      body: "Your identity verification attempt was declined. Click to retry.",
      link: "/account/verification",
      created_at: kyc.updated_at || kyc.created_at || new Date().toISOString(),
      priority: 'danger',
    });
  }

  const kybs = verifications?.kyb || [];
  kybs.forEach((k: any) => {
    if (k.status === "rejected" || k.status === "failed") {
      list.push({
        id: `kyb-failed-${k.id}-${new Date(k.updated_at || k.created_at).getTime()}`,
        kind: 'verification',
        title: "KYB Verification Failed",
        body: `Business compliance validation for "${k.company_name}" failed.`,
        link: "/account/verification",
        created_at: k.updated_at || k.created_at || new Date().toISOString(),
        priority: 'danger',
      });
    }
  });

  return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 20);
};

const CustomerNotificationsBell = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const fullName = (user?.user_metadata as any)?.full_name || "";

  const { data: notifications = [] } = useQuery({
    queryKey: ["customer-notifications", user?.id],
    enabled: !!user?.id,
    refetchInterval: 4000,
    queryFn: () => fetchCustomerNotifications(user!.email!, fullName),
  });

  const [readIds, setReadIds] = useState<string[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    try {
      const saved = localStorage.getItem(`dynime_read_notifs_${user.id}`);
      if (saved) {
        setReadIds(JSON.parse(saved));
      }
    } catch {}
  }, [user?.id]);

  const saveReadIds = (ids: string[]) => {
    if (!user?.id) return;
    setReadIds(ids);
    try {
      localStorage.setItem(`dynime_read_notifs_${user.id}`, JSON.stringify(ids));
    } catch {}
  };

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !readIds.includes(n.id)).length;
  }, [notifications, readIds]);

  const markRead = (id: string) => {
    if (readIds.includes(id)) return;
    saveReadIds([...readIds, id]);
  };

  const markAllRead = () => {
    const allIds = notifications.map((n) => n.id);
    const uniqueIds = Array.from(new Set([...readIds, ...allIds]));
    saveReadIds(uniqueIds);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative h-9 w-9 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 active:scale-[0.95] transition-all duration-200"
          title="Notifications"
        >
          <Bell className="w-[18px] h-[18px] text-foreground/80 hover:text-foreground transition-colors" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0 rounded-2xl border border-border shadow-2xl bg-card/90 backdrop-blur-md overflow-hidden z-50">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/60 bg-muted/20">
          <span className="font-semibold text-sm">Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllRead}
              className="h-7 text-xs text-primary hover:text-primary/80 hover:bg-primary/5 rounded-full px-2.5 transition-colors"
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" /> Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[340px]">
          {notifications.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2.5" />
              No notifications yet.
            </div>
          ) : (
            <ul className="divide-y divide-border/40">
              {notifications.map((n) => {
                const Icon = ICONS[n.kind] || Bell;
                const isUnread = !readIds.includes(n.id);
                return (
                  <li
                    key={n.id}
                    className={cn(
                      "p-3.5 hover:bg-muted/40 transition-colors relative",
                      isUnread && "bg-primary/5 hover:bg-primary/10"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", PRIORITY_COLORS[n.priority])}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link
                          to={n.link}
                          onClick={() => { markRead(n.id); setOpen(false); }}
                          className="block group"
                        >
                          <div className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                            {n.title}
                            {isUnread && (
                              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 animate-pulse" />
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed font-medium">
                            {n.body}
                          </div>
                        </Link>
                        <div className="text-[10px] text-muted-foreground/60 mt-1 flex items-center justify-between">
                          <span>
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                          </span>
                          {isUnread && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                              className="text-[10px] text-primary/75 hover:text-primary font-semibold hover:underline"
                            >
                              Mark read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
        <div className="border-t border-border/60 bg-muted/20 px-4 py-2.5 text-center">
          <Link
            to="/account/notifications"
            onClick={() => setOpen(false)}
            className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            View all notifications →
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default CustomerNotificationsBell;

import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Bell, Inbox, MessageSquare, LifeBuoy, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";

type NotifKind = "submission" | "chat" | "ticket";

interface Notif {
  id: string;
  kind: NotifKind;
  title: string;
  subtitle: string;
  created_at: string;
  href: string;
  isUnread: boolean;
}

const ICONS: Record<NotifKind, any> = {
  submission: Inbox,
  chat: MessageSquare,
  ticket: LifeBuoy,
};

const CLOSED_TICKET_STATUSES = new Set(["closed", "resolved"]);

const NotificationsBell = () => {
  const [items, setItems] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);

  const fetchAll = useCallback(async () => {
    const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString();

    const [subs, chats, tix] = await Promise.all([
      supabase
        .from("form_submissions")
        .select("id, data, created_at, status")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(15),
      supabase
        .from("chat_messages")
        .select("id, session_id, sender_name, message, created_at, sender_type, is_read")
        .eq("sender_type", "user")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(15),
      supabase
        .from("support_tickets")
        .select("id, ticket_number, subject, customer_name, created_at, status")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(15),
    ]);

    const merged: Notif[] = [];

    (subs.data || []).forEach((r: any) => {
      const d = r.data || {};
      merged.push({
        id: `sub-${r.id}`,
        kind: "submission",
        title: "New form submission",
        subtitle: d.name || d.email || d.service || "View details",
        created_at: r.created_at,
        href: "/superadmin/submissions",
        isUnread: r.status === "new",
      });
    });

    (chats.data || []).forEach((r: any) => {
      merged.push({
        id: `chat-${r.id}`,
        kind: "chat",
        title: `Live chat: ${r.sender_name || "Visitor"}`,
        subtitle: (r.message || "").slice(0, 80),
        created_at: r.created_at,
        href: "/superadmin/chat",
        isUnread: r.is_read === false,
      });
    });

    (tix.data || []).forEach((r: any) => {
      merged.push({
        id: `tix-${r.id}`,
        kind: "ticket",
        title: `Ticket #${r.ticket_number}`,
        subtitle: r.subject || r.customer_name || "New support ticket",
        created_at: r.created_at,
        href: "/superadmin/tickets",
        isUnread: !CLOSED_TICKET_STATUSES.has((r.status || "").toLowerCase()),
      });
    });

    merged.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    setItems(merged.slice(0, 20));
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);

    const channel = supabase
      .channel("admin-notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "form_submissions" },
        () => fetchAll(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages" },
        () => fetchAll(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_tickets" },
        () => fetchAll(),
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  const unread = items.filter((i) => i.isUnread).length;

  const markAllRead = async () => {
    const unreadItems = items.filter((i) => i.isUnread);
    const subIds = unreadItems.filter((i) => i.kind === "submission").map((i) => i.id.replace(/^sub-/, ""));
    const chatIds = unreadItems.filter((i) => i.kind === "chat").map((i) => i.id.replace(/^chat-/, ""));

    // Optimistic UI
    setItems((prev) => prev.map((i) => ({ ...i, isUnread: false })));

    await Promise.all([
      subIds.length
        ? supabase.from("form_submissions").update({ status: "read" }).in("id", subIds)
        : Promise.resolve(),
      chatIds.length
        ? supabase.from("chat_messages").update({ is_read: true }).in("id", chatIds)
        : Promise.resolve(),
    ]);
    fetchAll();
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative h-9 w-9 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unread > 0 && (
            <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="text-sm font-semibold">Notifications</div>
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <CheckCheck className="w-3 h-3" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            items.map((n) => {
              const Icon = ICONS[n.kind];
              const isUnread = n.isUnread;
              return (
                <Link
                  key={n.id}
                  to={n.href}
                  onClick={() => setOpen(false)}
                  className={`flex gap-2.5 px-3 py-2.5 border-b last:border-b-0 hover:bg-secondary/60 transition-colors ${
                    isUnread ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="mt-0.5">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-foreground truncate">
                      {n.title}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {n.subtitle}
                    </div>
                    <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </div>
                  </div>
                  {isUnread && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  )}
                </Link>
              );
            })
          )}
        </div>
        <div className="border-t px-3 py-2">
          <Link
            to="/superadmin/submissions"
            onClick={() => setOpen(false)}
            className="text-xs text-primary hover:underline"
          >
            View all submissions →
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationsBell;

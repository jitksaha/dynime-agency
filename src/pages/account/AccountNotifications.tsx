import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Check, CheckCheck, ShieldAlert, MessageSquare, CreditCard, ChevronRight, Inbox, RefreshCw } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import AccountLayout from "@/components/account/AccountLayout";
import { fetchCustomerNotifications, CustomerNotification } from "@/components/account/CustomerNotificationsBell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { usePageTitle } from "@/hooks/use-page-title";
import { toast } from "sonner";

const ICONS = {
  order: CreditCard,
  ticket: MessageSquare,
  verification: ShieldAlert,
  invoice: CreditCard,
};

const PRIORITY_COLORS = {
  info: "text-primary bg-primary/10 border-primary/20",
  warning: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  success: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  danger: "text-destructive bg-destructive/10 border-destructive/20",
};

const AccountNotifications = () => {
  usePageTitle("Notifications");
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [readIds, setReadIds] = useState<string[]>([]);

  const fullName = (user?.user_metadata as any)?.full_name || "";

  const { data: notifications = [], isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["customer-notifications-page", user?.id],
    enabled: !!user?.id,
    queryFn: () => fetchCustomerNotifications(user!.email!, fullName),
  });

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
    // Invalidate the bell query to sync unread badges
    qc.invalidateQueries({ queryKey: ["customer-notifications", user.id] });
  };

  const markRead = (id: string) => {
    if (readIds.includes(id)) return;
    saveReadIds([...readIds, id]);
    toast.success("Notification marked as read");
  };

  const markAllRead = () => {
    const allIds = notifications.map((n) => n.id);
    const uniqueIds = Array.from(new Set([...readIds, ...allIds]));
    saveReadIds(uniqueIds);
    toast.success("All notifications marked as read");
  };

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      const isUnread = !readIds.includes(n.id);
      if (activeTab === "unread") return isUnread;
      if (activeTab === "orders") return n.kind === "order" || n.kind === "invoice";
      if (activeTab === "tickets") return n.kind === "ticket";
      if (activeTab === "verification") return n.kind === "verification";
      return true;
    });
  }, [notifications, readIds, activeTab]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !readIds.includes(n.id)).length;
  }, [notifications, readIds]);

  return (
    <AccountLayout
      title="Notifications Portal"
      description="Stay updated with your active company files, verification progress, invoices, and support chat messages."
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="h-9"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", (isLoading || isRefetching) && "animate-spin")} />
            Refresh
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="hero"
              size="sm"
              onClick={markAllRead}
              className="h-9 shadow-md"
            >
              <CheckCheck className="w-4 h-4 mr-1.5" /> Mark all read
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-muted/60 p-1 rounded-xl h-11 border border-border/40">
            <TabsTrigger value="all" className="rounded-lg text-xs font-semibold px-4">
              All
            </TabsTrigger>
            <TabsTrigger value="unread" className="rounded-lg text-xs font-semibold px-4 relative">
              Unread
              {unreadCount > 0 && (
                <Badge className="ml-1.5 h-4 min-w-4 p-0 px-1 text-[9px] bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="orders" className="rounded-lg text-xs font-semibold px-4">
              Billing &amp; Orders
            </TabsTrigger>
            <TabsTrigger value="tickets" className="rounded-lg text-xs font-semibold px-4">
              Support
            </TabsTrigger>
            <TabsTrigger value="verification" className="rounded-lg text-xs font-semibold px-4">
              Verifications
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="animate-pulse border-border/40">
                <CardContent className="h-20" />
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-border bg-card text-center py-20 px-6 max-w-xl mx-auto shadow-sm">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Inbox className="w-8 h-8" />
            </div>
            <h3 className="font-heading text-lg font-bold mb-1">No notifications found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
              There are no notifications matching the "{activeTab}" filter.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((n) => {
              const Icon = ICONS[n.kind] || Bell;
              const isUnread = !readIds.includes(n.id);
              return (
                <div
                  key={n.id}
                  className={cn(
                    "group flex items-start gap-4 p-4 md:p-5 rounded-2xl border border-border/60 bg-card hover:border-primary/40 hover:shadow-md transition-all duration-300 relative overflow-hidden",
                    isUnread && "bg-primary/5 border-primary/25"
                  )}
                >
                  {isUnread && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                  )}
                  
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border", PRIORITY_COLORS[n.priority])}>
                    <Icon className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                        {n.title}
                      </span>
                      {isUnread && (
                        <Badge variant="secondary" className="h-4 p-0 px-1.5 text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary border-none">
                          New
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground/60 ml-auto shrink-0 font-medium">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mt-1 font-medium">
                      {n.body}
                    </p>
                    <div className="flex items-center gap-3 mt-3.5">
                      <Button asChild size="sm" variant="default" className="rounded-full shadow-sm">
                        <Link to={n.link} onClick={() => markRead(n.id)}>
                          View Details <ChevronRight className="w-4.5 h-4.5 ml-1" />
                        </Link>
                      </Button>
                      {isUnread && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markRead(n.id)}
                          className="h-8 text-xs text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/80"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" /> Mark read
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AccountLayout>
  );
};

export default AccountNotifications;

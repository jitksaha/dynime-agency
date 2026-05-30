import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { useChatSessions, useChatMessages, useSendChat } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send, Search, Radio, MessageSquare, CheckCheck } from "lucide-react";

const AdminChat = () => {
  const [params, setParams] = useSearchParams();
  const { data: sessions, isLoading } = useChatSessions();
  const [activeSession, setActiveSession] = useState<string>(params.get("session") || "");
  const { data: messages } = useChatMessages(activeSession);
  const sendChat = useSendChat();
  const qc = useQueryClient();

  const [reply, setReply] = useState("");
  const [search, setSearch] = useState("");
  const [liveConnected, setLiveConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const seenIds = useRef<Set<string>>(new Set());

  // Sync URL with active session for deep-linking from Submissions
  useEffect(() => {
    if (activeSession) setParams({ session: activeSession }, { replace: true });
  }, [activeSession, setParams]);

  // Realtime: surface new visitor messages anywhere, refresh caches
  useEffect(() => {
    const channel = supabase
      .channel("admin-chat-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const row = payload.new as any;
          if (seenIds.current.has(row.id)) return;
          seenIds.current.add(row.id);

          qc.invalidateQueries({ queryKey: ["chat-sessions"] });
          qc.invalidateQueries({ queryKey: ["chat-messages", row.session_id] });

          if (row.sender_type !== "admin" && row.session_id !== activeSession) {
            toast.message(`New message from ${row.sender_name || "Visitor"}`, {
              description: row.message?.slice(0, 80),
              action: {
                label: "Open",
                onClick: () => setActiveSession(row.session_id),
              },
            });
          }
        }
      )
      .subscribe((status) => setLiveConnected(status === "SUBSCRIBED"));
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeSession, qc]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Mark visitor messages as read when opening a session
  useEffect(() => {
    if (!activeSession) return;
    void supabase
      .from("chat_messages")
      .update({ is_read: true })
      .eq("session_id", activeSession)
      .neq("sender_type", "admin")
      .eq("is_read", false)
      .then(() => qc.invalidateQueries({ queryKey: ["chat-sessions"] }));
  }, [activeSession, messages?.length, qc]);

  const filteredSessions = useMemo(() => {
    const list = sessions ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (s) =>
        (s.sender_name || "").toLowerCase().includes(q) ||
        (s.last_message || "").toLowerCase().includes(q)
    );
  }, [sessions, search]);

  const totalUnread = (sessions ?? []).reduce((acc, s) => acc + (s.unread || 0), 0);

  const handleSend = () => {
    if (!reply.trim() || !activeSession) return;
    sendChat.mutate({
      session_id: activeSession,
      sender_type: "admin",
      sender_name: "Admin",
      message: reply.trim(),
    });
    setReply("");
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    return sameDay
      ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <SuperAdminLayout>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-primary" />
            Live Chat
            {totalUnread > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                {totalUnread} unread
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Reply to visitors instantly. Messages sync in real time.
          </p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border ${liveConnected ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-muted text-muted-foreground border-border"}`}>
          <Radio className={`w-3.5 h-3.5 ${liveConnected ? "animate-pulse" : ""}`} />
          {liveConnected ? "Live" : "Connecting…"}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-220px)]">
        {/* Sessions */}
        <div className="glass-card p-4 overflow-y-auto flex flex-col">
          <div className="relative mb-3">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="w-full pl-9 pr-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : filteredSessions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
              <MessageSquare className="w-10 h-10 text-muted-foreground mb-2" />
              <p className="text-sm text-foreground">No conversations yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Visitor chats will appear here in real time.</p>
            </div>
          ) : (
            filteredSessions.map((s) => (
              <button
                key={s.session_id}
                onClick={() => setActiveSession(s.session_id)}
                className={`w-full text-left p-3 rounded-lg mb-2 transition-colors ${activeSession === s.session_id ? "bg-primary/10 ring-1 ring-primary/40" : "hover:bg-secondary/50"}`}
              >
                <div className="flex justify-between items-center gap-2">
                  <span className="text-sm text-foreground font-medium truncate">{s.sender_name || "Visitor"}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(s.last_time)}</span>
                </div>
                <div className="flex justify-between items-center gap-2 mt-0.5">
                  <p className="text-xs text-muted-foreground truncate flex-1">{s.last_message}</p>
                  {s.unread > 0 && (
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center shrink-0">
                      {s.unread}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Messages */}
        <div className="lg:col-span-2 glass-card flex flex-col">
          {activeSession ? (
            <>
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {sessions?.find((s) => s.session_id === activeSession)?.sender_name || "Visitor"}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-mono">{activeSession}</p>
                </div>
                <span className="text-[10px] flex items-center gap-1 text-emerald-400">
                  <CheckCheck className="w-3.5 h-3.5" /> Read receipts on
                </span>
              </div>
              <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-3">
                {messages?.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender_type === "admin" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${msg.sender_type === "admin" ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary text-foreground rounded-bl-md"}`}>
                      <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                      <p className="text-[10px] mt-1 opacity-60">{new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </div>
                ))}
                {(!messages || messages.length === 0) && (
                  <p className="text-center text-sm text-muted-foreground py-8">No messages yet.</p>
                )}
              </div>
              <div className="p-4 border-t border-border flex gap-2">
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
                  placeholder="Type a reply… (Enter to send)"
                  className="flex-1 px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <Button variant="hero" size="sm" onClick={handleSend} disabled={!reply.trim() || sendChat.isPending}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Select a conversation to start chatting.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </SuperAdminLayout>
  );
};

export default AdminChat;

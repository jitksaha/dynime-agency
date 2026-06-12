import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send } from "lucide-react";
import { db } from "@/integrations/db/client";

const LiveChatWidget = () => {
  const location = useLocation();
  const isEcommercePage = ["/checkout"].some(p => location.pathname.startsWith(p));
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [started, setStarted] = useState(false);
  const [sessionId] = useState(() => `visitor_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const [messages, setMessages] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const positionClasses = isEcommercePage
    ? "fixed bottom-6 left-6 z-50"
    : "fixed bottom-28 right-6 z-50";

  // Initial load + realtime subscription for incoming admin replies
  useEffect(() => {
    if (!started) return;
    let cancelled = false;

    (async () => {
      const { data } = await db.rpc("get_chat_messages", { _session_id: sessionId });
      if (!cancelled && data) setMessages(data);
    })();

    const channel = db
      .channel(`chat-session-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const row = payload.new as any;
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      db.removeChannel(channel);
    };
  }, [started, sessionId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const startChat = async () => {
    if (!name.trim()) return;
    setStarted(true);
    await db.from("chat_messages").insert({
      session_id: sessionId,
      sender_type: "visitor",
      sender_name: name.trim(),
      message: `${name.trim()} started a chat`,
    });
  };

  const sendMessage = async () => {
    if (!message.trim()) return;
    await db.from("chat_messages").insert({
      session_id: sessionId,
      sender_type: "visitor",
      sender_name: name,
      message: message.trim(),
    });
    setMessages([...messages, { sender_type: "visitor", message: message.trim(), created_at: new Date().toISOString() }]);
    setMessage("");
  };

  return (
    <>
      {/* Trigger button - replaces the StickyCTA when chat opens */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className={`${positionClasses} w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg hover:scale-110 transition-transform`}
            onClick={() => setOpen(true)}
          >
            <MessageCircle className="w-6 h-6 text-primary-foreground" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`${positionClasses} w-80 sm:w-96 h-[480px] rounded-2xl bg-card border border-border shadow-2xl flex flex-col overflow-hidden`}
          >
            {/* Header */}
            <div className="bg-primary px-4 py-3 flex items-center justify-between">
              <div>
                <p className="font-heading font-semibold text-primary-foreground text-sm">Live Chat</p>
                <p className="text-xs text-primary-foreground/70">Dynime Support</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-primary-foreground/70 hover:text-primary-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!started ? (
              <div className="flex-1 p-6 flex flex-col justify-center">
                <p className="text-sm text-foreground mb-4">Hi! What's your name?</p>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && startChat()}
                  placeholder="Your name..."
                  className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground mb-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button onClick={startChat} className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                  Start Chat
                </button>
              </div>
            ) : (
              <>
                <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-3">
                  <div className="flex justify-start">
                    <div className="max-w-[80%] px-3 py-2 rounded-2xl rounded-bl-md bg-secondary text-foreground text-sm">
                      Hi {name}! How can we help you today? An agent will respond shortly.
                    </div>
                  </div>
                  {messages.filter(m => m.message !== `${name} started a chat`).map((msg, i) => (
                    <div key={i} className={`flex ${msg.sender_type === "visitor" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${msg.sender_type === "visitor" ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary text-foreground rounded-bl-md"}`}>
                        {msg.message}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-border flex gap-2">
                  <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <button onClick={sendMessage} className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LiveChatWidget;

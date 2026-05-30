import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import AdminReplyDialog from "@/components/admin/AdminReplyDialog";
import ReplyHistory from "@/components/admin/ReplyHistory";
import { useFormSubmissions, useFormTemplates } from "@/hooks/use-data";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Inbox, Search, Radio, Mail, Phone, Calendar, ChevronDown, ChevronRight, Reply, Loader2, SearchX } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";


type Submission = {
  id: string;
  form_id: string;
  status: string;
  data: Record<string, any>;
  created_at: string;
  form_templates?: { name?: string } | null;
};

const STATUSES = ["new", "read", "replied", "archived"] as const;

const statusStyles: Record<string, string> = {
  new: "bg-primary/15 text-primary border-primary/30",
  read: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  replied: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  archived: "bg-muted text-muted-foreground border-border",
};

const AdminSubmissions = () => {
  const { data: submissions, isLoading } = useFormSubmissions();
  const { data: forms } = useFormTemplates();
  const qc = useQueryClient();

  const [filterForm, setFilterForm] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [replyTo, setReplyTo] = useState<Submission | null>(null);
  const [replyRefresh, setReplyRefresh] = useState(0);
  const [liveConnected, setLiveConnected] = useState(false);


  // Toast on new submission inserts (separate channel for UX feedback)
  const seenIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (submissions) submissions.forEach((s) => seenIds.current.add(s.id));
  }, [submissions]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-submissions-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "form_submissions" },
        (payload) => {
          const row = payload.new as Submission;
          if (seenIds.current.has(row.id)) return;
          seenIds.current.add(row.id);
          const name = (row.data as any)?.name || (row.data as any)?.email || "Anonymous";
          toast.success(`New submission from ${name}`, {
            description: "Refreshed admin panel in real time.",
          });
          qc.invalidateQueries({ queryKey: ["form-submissions"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "form_submissions" },
        () => {
          qc.invalidateQueries({ queryKey: ["form-submissions"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "form_submissions" },
        () => {
          qc.invalidateQueries({ queryKey: ["form-submissions"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_replies" },
        (payload) => {
          const row = (payload.new ?? payload.old) as any;
          if (row?.target_type !== "form_submission") return;
          qc.invalidateQueries({ queryKey: ["admin-replies", "form_submission", row.target_id] });
          setReplyRefresh((n) => n + 1);
          if (payload.eventType === "INSERT") {
            toast.success("New reply sent", {
              description: `To ${row.recipient_email}`,
            });
          }
        }
      )
      .subscribe((status) => {
        setLiveConnected(status === "SUBSCRIBED");
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const list = (submissions ?? []) as Submission[];

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: list.length, new: 0, read: 0, replied: 0, archived: 0 };
    list.forEach((s) => { c[s.status] = (c[s.status] || 0) + 1; });
    return c;
  }, [list]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((s) => {
      if (filterForm && s.form_id !== filterForm) return false;
      if (filterStatus && s.status !== filterStatus) return false;
      if (q) {
        const blob = JSON.stringify(s.data || {}).toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [list, filterForm, filterStatus, search]);

  const markAs = async (id: string, status: string) => {
    await supabase.from("form_submissions").update({ status }).eq("id", id);
    toast.success(`Marked as ${status}`);
    qc.invalidateQueries({ queryKey: ["form-submissions"] });
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const fieldIcon = (key: string) => {
    const k = key.toLowerCase();
    if (k.includes("email")) return <Mail className="w-3.5 h-3.5" />;
    if (k.includes("phone")) return <Phone className="w-3.5 h-3.5" />;
    if (k.includes("date") || k.includes("time")) return <Calendar className="w-3.5 h-3.5" />;
    return null;
  };

  return (
    <SuperAdminLayout>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-3">
            <Inbox className="w-6 h-6 text-primary" />
            Quote & Form Submissions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            All inquiries appear instantly as users submit them.
          </p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border ${liveConnected ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-muted text-muted-foreground border-border"}`}>
          <Radio className={`w-3.5 h-3.5 ${liveConnected ? "animate-pulse" : ""}`} />
          {liveConnected ? "Live" : "Connecting…"}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { key: "", label: "All", value: counts.all },
          ...STATUSES.map((s) => ({ key: s, label: s, value: counts[s] || 0 })),
        ].map((card) => (
          <button
            key={card.label}
            onClick={() => setFilterStatus(card.key)}
            className={`glass-card p-4 text-left transition-all hover:scale-[1.02] ${filterStatus === card.key ? "ring-2 ring-primary" : ""}`}
          >
            <p className="text-xs uppercase tracking-wide text-muted-foreground capitalize">{card.label}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{card.value}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="glass-card p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, message…"
            className="pl-10"
          />
        </div>
        <Select value={filterForm || "all"} onValueChange={(v) => setFilterForm(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Forms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Forms</SelectItem>
            {forms?.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} of {list.length} shown
        </span>
      </div>

      {isLoading ? (
        <div className="glass-card flex flex-col items-center justify-center text-center px-6 py-16 min-h-[280px] gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
          <p className="text-foreground font-medium">Loading submissions…</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Fetching the latest quote and form entries from your inbox.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center text-center px-6 py-16 min-h-[280px] gap-3">
          <div className="w-12 h-12 rounded-full bg-secondary/60 border border-border flex items-center justify-center">
            {list.length === 0 ? (
              <Inbox className="w-5 h-5 text-muted-foreground" />
            ) : (
              <SearchX className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <p className="text-foreground font-medium">
            {list.length === 0 ? "No submissions yet." : "No submissions match your filters."}
          </p>
          <p className="text-sm text-muted-foreground max-w-sm">
            {list.length === 0
              ? "New quote requests will appear here in real time as visitors submit your forms."
              : "Try clearing the search or selecting a different status to see more results."}
          </p>
          {list.length > 0 && (search || filterForm || filterStatus) && (
            <button
              onClick={() => { setSearch(""); setFilterForm(""); setFilterStatus(""); }}
              className="mt-2 text-xs px-3 py-1.5 rounded-full border border-border text-foreground hover:bg-secondary transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((sub) => {
            const data = sub.data || {};
            const name = data.name || data.full_name || "Anonymous";
            const email = data.email || "";
            const service = data.service || data.subject || "";
            const isOpen = expanded.has(sub.id);
            return (
              <div key={sub.id} className="glass-card overflow-hidden">
                <button
                  onClick={() => toggleExpand(sub.id)}
                  className="w-full text-left p-5 hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      {isOpen ? <ChevronDown className="w-4 h-4 mt-1 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground truncate">{name}</span>
                          <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border ${statusStyles[sub.status] || statusStyles.new}`}>
                            {sub.status}
                          </span>
                          <span className="text-xs text-primary font-medium truncate">
                            {sub.form_templates?.name || "Form"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                          {email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{email}</span>}
                          {service && <span>· {service}</span>}
                          <span>· {new Date(sub.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-border p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {Object.entries(data).map(([key, val]) => (
                        <div key={key} className="bg-secondary/30 rounded p-2">
                          <span className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                            {fieldIcon(key)} {key.replace(/_/g, " ")}
                          </span>
                          <p className="text-sm text-foreground break-words whitespace-pre-wrap">
                            {typeof val === "object" ? JSON.stringify(val) : String(val)}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                      {STATUSES.map((s) => (
                        <button
                          key={s}
                          onClick={(e) => { e.stopPropagation(); markAs(sub.id, s); }}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${sub.status === s ? statusStyles[s] : "bg-secondary text-muted-foreground border-border hover:bg-secondary/80"}`}
                        >
                          Mark {s}
                        </button>
                      ))}
                      {email && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setReplyTo(sub); }}
                          className="text-xs px-3 py-1.5 rounded-full bg-primary text-primary-foreground hover:opacity-90 ml-auto inline-flex items-center gap-1.5"
                        >
                          <Reply className="w-3.5 h-3.5" /> Reply in app
                        </button>
                      )}
                      {email && (
                        <a
                          href={`mailto:${email}?subject=Re: Your inquiry`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs px-3 py-1.5 rounded-full border border-border text-foreground hover:bg-secondary"
                        >
                          Open mail client
                        </a>
                      )}

                    </div>

                    <ReplyHistory
                      targetType="form_submission"
                      targetId={sub.id}
                      refreshKey={replyRefresh}
                    />
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      <AdminReplyDialog
        open={!!replyTo}
        onOpenChange={(o) => !o && setReplyTo(null)}
        recipientEmail={(replyTo?.data as any)?.email ?? ""}
        recipientName={(replyTo?.data as any)?.name || (replyTo?.data as any)?.full_name}
        defaultSubject={
          replyTo
            ? `Re: ${(replyTo.data as any)?.subject || (replyTo.data as any)?.service || replyTo.form_templates?.name || "your enquiry"}`
            : ""
        }
        context={replyTo?.form_templates?.name ? `Re: ${replyTo.form_templates.name}` : undefined}
        source={replyTo?.form_templates?.name || "form submission"}
        targetType="form_submission"
        targetId={replyTo?.id}
        onSent={async () => {
          if (!replyTo) return;
          await supabase.from("form_submissions").update({ status: "replied" }).eq("id", replyTo.id);
          qc.invalidateQueries({ queryKey: ["form-submissions"] });
          setReplyRefresh((n) => n + 1);
        }}
      />
    </SuperAdminLayout>
  );
};



export default AdminSubmissions;

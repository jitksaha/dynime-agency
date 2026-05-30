import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import AdminReplyDialog from "@/components/admin/AdminReplyDialog";
import ReplyHistory from "@/components/admin/ReplyHistory";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  TrendingUp, Search, Mail, Phone, Calendar, Globe, MessageSquare,
  ChevronDown, ChevronRight, Radio, Loader2, Download, Reply,
} from "lucide-react";


import { streamCsvExport, type CsvColumn } from "@/lib/csv-export";

const LEAD_CSV_COLUMNS: CsvColumn<InvestLead>[] = [
  { header: "Created", value: (l) => l.created_at },
  { header: "Full name", value: (l) => l.full_name },
  { header: "Email", value: (l) => l.email },
  { header: "Phone", value: (l) => l.phone },
  { header: "Country", value: (l) => l.country },
  { header: "Investment amount", value: (l) => l.investment_amount },
  { header: "Currency", value: (l) => l.currency },
  { header: "Plan", value: (l) => l.plan_slug },
  { header: "Preferred contact", value: (l) => l.preferred_contact },
  { header: "Status", value: (l) => l.status },
  { header: "Message", value: (l) => l.message },
  { header: "Admin notes", value: (l) => l.admin_notes },
  { header: "Updated", value: (l) => l.updated_at },
];

type InvestLead = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  country: string | null;
  investment_amount: number | null;
  currency: string | null;
  preferred_contact: string | null;
  message: string | null;
  plan_slug: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

const STATUSES = ["new", "contacted", "qualified", "converted", "rejected"] as const;

const statusStyles: Record<string, string> = {
  new: "bg-primary/15 text-primary border-primary/30",
  contacted: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  qualified: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  converted: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  rejected: "bg-muted text-muted-foreground border-border",
};

const fmtMoney = (n: number | null, currency = "USD") => {
  if (n == null) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency, maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `$${Math.round(n).toLocaleString()}`;
  }
};

const fmtDate = (s: string) =>
  new Date(s).toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

const AdminInvestLeads = () => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-invest-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invest_leads" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as InvestLead[];
    },
  });

  const [filterStatus, setFilterStatus] = useState<string>("");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [replyTo, setReplyTo] = useState<InvestLead | null>(null);
  const [replyRefresh, setReplyRefresh] = useState(0);
  const [liveConnected, setLiveConnected] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    setExportProgress(0);
    const toastId = toast.loading("Preparing export…");
    const q = search.trim();
    try {
      const written = await streamCsvExport<InvestLead>({
        filename: `investor-interest-${new Date().toISOString().slice(0, 10)}.csv`,
        columns: LEAD_CSV_COLUMNS,
        pageSize: 1000,
        onProgress: ({ written }) => {
          setExportProgress(written);
          toast.loading(`Exporting… ${written.toLocaleString()} rows`, { id: toastId });
        },
        fetchPage: async (offset, limit) => {
          // Build the query with the same filters the UI applies, server-side.
          let query = supabase
            .from("invest_leads" as any)
            .select(
              "id, full_name, email, phone, country, investment_amount, currency, " +
              "preferred_contact, message, plan_slug, status, admin_notes, created_at, updated_at",
              { count: "exact" },
            )
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);
          if (filterStatus) query = query.eq("status", filterStatus);
          if (q) {
            const like = `%${q.replace(/[%_]/g, (m) => "\\" + m)}%`;
            query = query.or(
              [
                `full_name.ilike.${like}`,
                `email.ilike.${like}`,
                `phone.ilike.${like}`,
                `country.ilike.${like}`,
                `plan_slug.ilike.${like}`,
                `message.ilike.${like}`,
              ].join(","),
            );
          }
          const { data, error, count } = await query;
          if (error) throw error;
          return { rows: (data ?? []) as unknown as InvestLead[], total: count ?? null };
        },
      });
      if (written === 0) {
        toast.dismiss(toastId);
        toast.message("Nothing to export", { description: "No matching submissions found." });
      } else {
        toast.success(`Exported ${written.toLocaleString()} submission${written === 1 ? "" : "s"}`, { id: toastId });
      }
    } catch (e: any) {
      toast.error(e?.message || "Export failed", { id: toastId });
    } finally {
      setExporting(false);
      setExportProgress(0);
    }
  };


  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("admin-invest-leads-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "invest_leads" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as InvestLead;
            toast.success(`New investor interest: ${row.full_name}`);
          }
          qc.invalidateQueries({ queryKey: ["admin-invest-leads"] });
        }
      )
      .subscribe((status) => setLiveConnected(status === "SUBSCRIBED"));
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const list = data ?? [];

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: list.length };
    STATUSES.forEach((s) => (c[s] = 0));
    list.forEach((l) => { c[l.status] = (c[l.status] || 0) + 1; });
    return c;
  }, [list]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((l) => {
      if (filterStatus && l.status !== filterStatus) return false;
      if (!q) return true;
      return (
        l.full_name?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.phone?.toLowerCase().includes(q) ||
        l.country?.toLowerCase().includes(q) ||
        l.plan_slug?.toLowerCase().includes(q) ||
        l.message?.toLowerCase().includes(q)
      );
    });
  }, [list, filterStatus, search]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("invest_leads" as any)
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Marked as ${status}`);
    qc.invalidateQueries({ queryKey: ["admin-invest-leads"] });
  };

  const updateNotes = async (id: string, admin_notes: string) => {
    const { error } = await supabase
      .from("invest_leads" as any)
      .update({ admin_notes, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["admin-invest-leads"] });
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              Investor interest
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Submissions from the investor relations form. Update status as you progress with each lead.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Radio className={`h-3.5 w-3.5 ${liveConnected ? "text-emerald-500 animate-pulse" : "text-muted-foreground"}`} />
            <span className="text-muted-foreground">{liveConnected ? "Live" : "Connecting…"}</span>
          </div>
        </div>

        {/* Status pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterStatus("")}
            className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
              !filterStatus ? "bg-foreground text-background border-foreground" : "border-border hover:border-foreground/40"
            }`}
          >
            All <span className="ml-1 opacity-70">{counts.all}</span>
          </button>
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs border capitalize transition-colors ${
                filterStatus === s ? statusStyles[s] : "border-border hover:border-foreground/40"
              }`}
            >
              {s} <span className="ml-1 opacity-70">{counts[s] ?? 0}</span>
            </button>
          ))}
        </div>

        {/* Search + Export */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, phone, country, plan…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            title="Streams all matching rows from the server in 1k chunks"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background text-sm hover:border-primary hover:text-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {exporting ? `Exporting…` : "Export CSV"}
            <span className="text-[10px] text-muted-foreground">
              {exporting ? exportProgress.toLocaleString() : `(${filtered.length}${list.length >= 500 ? "+" : ""})`}
            </span>
          </button>
        </div>


        {/* List */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <TrendingUp className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
            <p className="text-sm text-muted-foreground">No investor interest submissions yet.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            <div className="divide-y divide-border">
              {filtered.map((lead) => {
                const isOpen = expanded.has(lead.id);
                return (
                  <div key={lead.id} className="hover:bg-muted/30 transition-colors">
                    <div
                      className="p-4 flex flex-wrap gap-4 items-center cursor-pointer"
                      onClick={() => toggleExpand(lead.id)}
                    >
                      <button className="text-muted-foreground shrink-0">
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{lead.full_name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wide border capitalize ${statusStyles[lead.status] ?? statusStyles.new}`}>
                            {lead.status}
                          </span>
                          {lead.plan_slug && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-muted text-muted-foreground border border-border">
                              {lead.plan_slug}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-3">
                          <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{lead.email}</span>
                          {lead.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</span>}
                          {lead.country && <span className="inline-flex items-center gap-1"><Globe className="h-3 w-3" />{lead.country}</span>}
                          <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{fmtDate(lead.created_at)}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-semibold tabular-nums">
                          {fmtMoney(lead.investment_amount, lead.currency ?? "USD")}
                        </div>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          via {lead.preferred_contact ?? "email"}
                        </div>
                      </div>
                    </div>
                    {isOpen && (
                      <div className="px-4 pb-4 pl-12 space-y-3">
                        {lead.message && (
                          <div>
                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" /> Message
                            </div>
                            <p className="text-sm whitespace-pre-wrap text-foreground/90 bg-muted/40 rounded-md p-3 border border-border">
                              {lead.message}
                            </p>
                          </div>
                        )}
                        <div>
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">Update status</div>
                          <div className="flex flex-wrap gap-1.5">
                            {STATUSES.map((s) => (
                              <button
                                key={s}
                                onClick={() => updateStatus(lead.id, s)}
                                disabled={lead.status === s}
                                className={`px-2.5 py-1 rounded-md text-[11px] capitalize border transition-colors ${
                                  lead.status === s
                                    ? `${statusStyles[s]} cursor-default`
                                    : "border-border hover:border-foreground/50"
                                }`}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">Internal notes</div>
                          <textarea
                            defaultValue={lead.admin_notes ?? ""}
                            onBlur={(e) => {
                              if ((e.target.value || "") !== (lead.admin_notes ?? "")) {
                                updateNotes(lead.id, e.target.value);
                              }
                            }}
                            rows={2}
                            placeholder="Add follow-up notes (saved on blur)…"
                            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:border-primary"
                          />
                        </div>
                        <div className="flex gap-2 pt-1 flex-wrap">
                          <button
                            onClick={() => setReplyTo(lead)}
                            className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 inline-flex items-center gap-1.5"
                          >
                            <Reply className="h-3.5 w-3.5" /> Reply in app
                          </button>
                          <a
                            href={`mailto:${lead.email}`}
                            className="text-xs px-3 py-1.5 rounded-md border border-border hover:border-primary hover:text-primary inline-flex items-center gap-1.5"
                          >
                            <Mail className="h-3.5 w-3.5" /> Open mail client
                          </a>
                          {lead.phone && (
                            <a
                              href={`tel:${lead.phone}`}
                              className="text-xs px-3 py-1.5 rounded-md border border-border hover:border-primary hover:text-primary inline-flex items-center gap-1.5"
                            >
                              <Phone className="h-3.5 w-3.5" /> Call
                            </a>
                          )}
                        </div>

                        <ReplyHistory
                          targetType="invest_lead"
                          targetId={lead.id}
                          refreshKey={replyRefresh}
                        />
                      </div>

                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <AdminReplyDialog
        open={!!replyTo}
        onOpenChange={(o) => !o && setReplyTo(null)}
        recipientEmail={replyTo?.email ?? ""}
        recipientName={replyTo?.full_name}
        defaultSubject={
          replyTo
            ? `Re: your investor enquiry${replyTo.plan_slug ? ` (${replyTo.plan_slug})` : ""}`
            : ""
        }
        context="Re: investor enquiry"
        source="investor lead"
        targetType="invest_lead"
        targetId={replyTo?.id}
        onSent={async ({ subject, body }) => {
          if (!replyTo) return;
          const stamp = new Date().toLocaleString();
          const note = `[${stamp}] Replied — ${subject}\n${body}`;
          const merged = replyTo.admin_notes ? `${replyTo.admin_notes}\n\n${note}` : note;
          await supabase
            .from("invest_leads" as any)
            .update({
              admin_notes: merged,
              status: replyTo.status === "new" ? "contacted" : replyTo.status,
              updated_at: new Date().toISOString(),
            })
            .eq("id", replyTo.id);
          qc.invalidateQueries({ queryKey: ["admin-invest-leads"] });
          setReplyRefresh((n) => n + 1);
        }}
      />
    </SuperAdminLayout>
  );
};

export default AdminInvestLeads;



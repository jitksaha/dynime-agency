import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/integrations/db/client";
import { History, Mail, User, Loader2, Copy, Check, Search, X, Filter, ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const PAGE_SIZE = 25;

export type ReplyTargetType = "invest_lead" | "form_submission";

interface AdminReplyRow {
  id: string;
  target_type: ReplyTargetType;
  target_id: string;
  recipient_email: string;
  subject: string;
  body: string;
  sent_by_name: string | null;
  sent_by_email: string | null;
  status: string;
  created_at: string;
}

const fmtDate = (s: string) =>
  new Date(s).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

interface Props {
  targetType: ReplyTargetType;
  targetId: string;
  /** Bump this number after sending a new reply to refresh the list. */
  refreshKey?: number;
}

const ReplyHistory = ({ targetType, targetId, refreshKey = 0 }: Props) => {
  const qc = useQueryClient();

  useEffect(() => {
    if (!targetId) return;
    const channel = db
      .channel(`admin-replies:${targetType}:${targetId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "admin_replies",
          filter: `target_id=eq.${targetId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["admin-replies", targetType, targetId] });
        }
      )
      .subscribe();
    return () => {
      db.removeChannel(channel);
    };
  }, [qc, targetType, targetId]);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["admin-replies", targetType, targetId, refreshKey],
      initialPageParam: 0,
      queryFn: async ({ pageParam = 0 }) => {
        const from = (pageParam as number) * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        const { data, error, count } = await db
          .from("admin_replies" as any)
          .select("*", { count: "exact" })
          .eq("target_type", targetType)
          .eq("target_id", targetId)
          .order("created_at", { ascending: false })
          .range(from, to);
        if (error) throw error;
        return {
          rows: (data ?? []) as unknown as AdminReplyRow[],
          nextPage: (data?.length ?? 0) === PAGE_SIZE ? (pageParam as number) + 1 : null,
          total: count ?? 0,
        };
      },
      getNextPageParam: (last) => last.nextPage,
    });

  const replies = useMemo(
    () => (data?.pages ?? []).flatMap((p) => p.rows),
    [data],
  );
  const totalCount = data?.pages?.[0]?.total ?? replies.length;
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const toggle = (id: string) =>
    setExpanded((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromTs = dateFrom ? new Date(dateFrom + "T00:00:00").getTime() : null;
    const toTs = dateTo ? new Date(dateTo + "T23:59:59.999").getTime() : null;
    return replies.filter((r) => {
      const ts = new Date(r.created_at).getTime();
      if (fromTs != null && ts < fromTs) return false;
      if (toTs != null && ts > toTs) return false;
      if (!q) return true;
      const sender = `${r.sent_by_name ?? ""} ${r.sent_by_email ?? ""}`.toLowerCase();
      return (
        r.subject?.toLowerCase().includes(q) ||
        r.body?.toLowerCase().includes(q) ||
        r.recipient_email?.toLowerCase().includes(q) ||
        sender.includes(q)
      );
    });
  }, [replies, search, dateFrom, dateTo]);

  const hasFilters = !!(search || dateFrom || dateTo);
  const clearFilters = () => {
    setSearch("");
    setDateFrom("");
    setDateTo("");
  };

  const copyReply = async (
    e: React.MouseEvent,
    r: AdminReplyRow,
    mode: "full" | "subject" | "body",
  ) => {
    e.stopPropagation();
    const text =
      mode === "subject"
        ? r.subject
        : mode === "body"
          ? r.body
          : `Subject: ${r.subject}\n\n${r.body}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      const key = `${r.id}:${mode}`;
      setCopiedId(key);
      toast.success(
        mode === "full" ? "Reply copied" : `${mode === "subject" ? "Subject" : "Body"} copied`,
      );
      setTimeout(() => setCopiedId((c) => (c === key ? null : c)), 1500);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading reply history…
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <History className="h-3 w-3" />
          Reply history
          {replies.length > 0 && (
            <span className="normal-case tracking-normal text-[10px]">
              ({hasFilters
                ? `${filtered.length} of ${replies.length}${totalCount > replies.length ? ` · ${totalCount} total` : ""}`
                : `${replies.length}${totalCount > replies.length ? ` of ${totalCount}` : ""}`})
            </span>
          )}
        </div>
        {replies.length > 0 && (
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] border transition-colors ${
              filtersOpen || hasFilters
                ? "border-primary text-primary bg-primary/5"
                : "border-border bg-background hover:border-primary hover:text-primary"
            }`}
          >
            <Filter className="h-3 w-3" />
            {hasFilters ? "Filters on" : "Search & filter"}
          </button>
        )}
      </div>

      {replies.length > 0 && filtersOpen && (
        <div className="rounded-md border border-border bg-muted/20 p-2 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search subject, body, sender or recipient…"
              className="w-full pl-8 pr-7 py-1.5 rounded-md border border-border bg-background text-xs focus:outline-none focus:border-primary"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[10px] uppercase tracking-wide text-muted-foreground">From</label>
            <input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-2 py-1 rounded-md border border-border bg-background text-xs focus:outline-none focus:border-primary"
            />
            <label className="text-[10px] uppercase tracking-wide text-muted-foreground">To</label>
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-2 py-1 rounded-md border border-border bg-background text-xs focus:outline-none focus:border-primary"
            />
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>
        </div>
      )}

      {replies.length === 0 ? (
        <div className="text-xs text-muted-foreground italic px-3 py-2 rounded-md border border-dashed border-border">
          No replies sent yet.
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-xs text-muted-foreground italic px-3 py-2 rounded-md border border-dashed border-border flex items-center justify-between gap-2">
          <span>No replies match your filters.</span>
          <button
            type="button"
            onClick={clearFilters}
            className="text-primary hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((r) => {
            const isOpen = expanded.has(r.id);
            const sender = r.sent_by_name || r.sent_by_email || "Admin";
            return (
              <li
                key={r.id}
                className="rounded-md border border-border bg-muted/30 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggle(r.id)}
                  className="w-full text-left px-3 py-2 hover:bg-muted/60 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate text-foreground">
                        {r.subject}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3 w-3" /> {sender}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {r.recipient_email}
                        </span>
                        <span>{fmtDate(r.created_at)}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[9px] uppercase tracking-wide border ${
                            r.status === "sent"
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                              : "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {r.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => copyReply(e, r, "full")}
                        title="Copy subject + body"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] border border-border bg-background hover:border-primary hover:text-primary transition-colors"
                      >
                        {copiedId === `${r.id}:full` ? (
                          <Check className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        Copy
                      </button>
                      <span className="text-[11px] text-primary">
                        {isOpen ? "Hide" : "View"}
                      </span>
                    </div>
                  </div>
                </button>
                {isOpen && (
                  <div className="px-3 pb-3 pt-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => copyReply(e, r, "subject")}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] border border-border bg-background hover:border-primary hover:text-primary transition-colors"
                      >
                        {copiedId === `${r.id}:subject` ? (
                          <Check className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        Copy subject
                      </button>
                      <button
                        type="button"
                        onClick={(e) => copyReply(e, r, "body")}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] border border-border bg-background hover:border-primary hover:text-primary transition-colors"
                      >
                        {copiedId === `${r.id}:body` ? (
                          <Check className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        Copy body
                      </button>
                      <button
                        type="button"
                        onClick={(e) => copyReply(e, r, "full")}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] border border-border bg-background hover:border-primary hover:text-primary transition-colors"
                      >
                        {copiedId === `${r.id}:full` ? (
                          <Check className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        Copy full reply
                      </button>
                    </div>
                    <p className="text-sm whitespace-pre-wrap text-foreground/90 bg-background rounded-md p-3 border border-border">
                      {r.body}
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {hasNextPage && replies.length > 0 && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs border border-border bg-background hover:border-primary hover:text-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> Loading…
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" />
                Load more
                {totalCount > replies.length && (
                  <span className="text-muted-foreground">
                    ({totalCount - replies.length} remaining)
                  </span>
                )}
              </>
            )}
          </button>
          {hasFilters && (
            <p className="mt-1 text-[10px] text-muted-foreground text-center">
              Filters apply to loaded replies. Load more to search older entries.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ReplyHistory;

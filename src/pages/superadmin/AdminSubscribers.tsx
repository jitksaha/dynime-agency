import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/integrations/db/client";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Mail, Search, Download, RefreshCw, Trash2, Users, UserCheck, UserX,
  Calendar, Loader2, ExternalLink,
} from "lucide-react";
import { useSiteSettings } from "@/hooks/use-data";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

type Subscriber = {
  id: string;
  email: string;
  status: string;
  source: string | null;
  subscribed_at: string;
  unsubscribed_at: string | null;
  created_at: string;
};

const useSubscribers = () =>
  useQuery({
    queryKey: ["newsletter-subscribers"],
    queryFn: async () => {
      const { data, error } = await db
        .from("newsletter_subscribers")
        .select("*")
        .order("subscribed_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as Subscriber[];
    },
  });

const StatCard = ({
  icon: Icon, label, value, accent,
}: { icon: typeof Users; label: string; value: number | string; accent?: string }) => (
  <div className="glass-card p-5">
    <div className="flex items-center justify-between mb-2">
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${accent ?? "bg-primary/10 text-primary"}`}>
        <Icon className="w-4 h-4" />
      </span>
    </div>
    <p className="font-heading text-2xl font-bold text-foreground">{value}</p>
    <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
  </div>
);

const AdminSubscribers = () => {
  const qc = useQueryClient();
  const { data: subscribers, isLoading, refetch } = useSubscribers();
  const { data: settings } = useSiteSettings();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "subscribed" | "unsubscribed">("all");
  const [syncing, setSyncing] = useState(false);

  const provider = (settings?.newsletter_provider || "builtin").toLowerCase();
  const lastSyncRaw = settings?.newsletter_last_sync;
  const lastSync = useMemo(() => {
    if (!lastSyncRaw) return null;
    try { return JSON.parse(lastSyncRaw); } catch { return null; }
  }, [lastSyncRaw]);

  const stats = useMemo(() => {
    const list = subscribers ?? [];
    const subbed = list.filter((s) => s.status === "subscribed").length;
    const unsubbed = list.filter((s) => s.status === "unsubscribed").length;
    const last30 = list.filter((s) => {
      const d = new Date(s.subscribed_at).getTime();
      return Date.now() - d < 1000 * 60 * 60 * 24 * 30;
    }).length;
    return { total: list.length, subbed, unsubbed, last30 };
  }, [subscribers]);

  const filtered = useMemo(() => {
    let list = subscribers ?? [];
    if (statusFilter !== "all") list = list.filter((s) => s.status === statusFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((s) => s.email.toLowerCase().includes(q) || (s.source ?? "").toLowerCase().includes(q));
    }
    return list;
  }, [subscribers, statusFilter, query]);

  const exportCsv = () => {
    const list = filtered;
    if (!list.length) { toast.error("Nothing to export."); return; }
    const header = "email,status,source,subscribed_at,unsubscribed_at\n";
    const rows = list
      .map((s) => [
        s.email,
        s.status,
        s.source ?? "",
        s.subscribed_at,
        s.unsubscribed_at ?? "",
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("newsletter_subscribers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["newsletter-subscribers"] });
      toast.success("Subscriber removed.");
    },
    onError: (e: any) => toast.error(e?.message || "Delete failed."),
  });

  const toggleStatus = useMutation({
    mutationFn: async (s: Subscriber) => {
      const next = s.status === "subscribed" ? "unsubscribed" : "subscribed";
      const { error } = await db
        .from("newsletter_subscribers")
        .update({
          status: next,
          unsubscribed_at: next === "unsubscribed" ? new Date().toISOString() : null,
        })
        .eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["newsletter-subscribers"] });
    },
    onError: (e: any) => toast.error(e?.message || "Update failed."),
  });

  const handleSync = async () => {
    if (provider === "builtin") {
      toast.error("Configure a provider (Mailchimp / SendGrid / Resend) in Header & Footer settings first.");
      return;
    }
    setSyncing(true);
    try {
      const { data, error } = await db.functions.invoke("sync-newsletter-subscribers", {
        body: {},
      });
      if (error) throw error;
      const r = data as any;
      if (r?.error) throw new Error(r.error);
      toast.success(`Synced ${r?.synced ?? 0} of ${r?.total ?? 0} to ${r?.provider}.`);
      if (r?.failed > 0) {
        toast.warning(`${r.failed} failed. Check function logs.`);
      }
      qc.invalidateQueries({ queryKey: ["site-settings"] });
    } catch (e: any) {
      toast.error(e?.message || "Sync failed.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <SuperAdminLayout>
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Newsletter Subscribers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage subscribers and sync to your email provider.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
          </Button>
          <Button variant="hero" size="sm" onClick={handleSync} disabled={syncing}>
            {syncing ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
            Sync to {provider === "builtin" ? "provider" : provider}
          </Button>
        </div>
      </div>

      {/* Provider hint */}
      {provider === "builtin" ? (
        <div className="mb-6 rounded-xl border border-border bg-secondary/40 p-4 flex items-start gap-3">
          <Mail className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">No external provider connected</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Subscribers are stored locally only. Connect Mailchimp, SendGrid, or Resend to enable automatic sync.
            </p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/superadmin/header-footer">
              Configure <ExternalLink className="w-3 h-3 ml-1" />
            </Link>
          </Button>
        </div>
      ) : (
        <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            Auto-syncing to <span className="capitalize text-primary">{provider}</span>
          </span>
          <span className="text-xs text-muted-foreground">
            New subscribers are forwarded automatically. Use "Sync" to push existing list.
          </span>
          {lastSync && (
            <span className="ml-auto text-xs text-muted-foreground inline-flex items-center gap-1.5">
              <Calendar className="w-3 h-3" />
              Last bulk sync {formatDistanceToNow(new Date(lastSync.at), { addSuffix: true })}
              {" · "}{lastSync.synced} ok, {lastSync.failed} failed
            </span>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label="Total subscribers" value={stats.total} />
        <StatCard icon={UserCheck} label="Subscribed" value={stats.subbed} accent="bg-emerald-500/10 text-emerald-500" />
        <StatCard icon={UserX} label="Unsubscribed" value={stats.unsubbed} accent="bg-rose-500/10 text-rose-500" />
        <StatCard icon={Calendar} label="Last 30 days" value={stats.last30} accent="bg-amber-500/10 text-amber-500" />
      </div>

      {/* Filters */}
      <div className="glass-card p-4 mb-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search email or source…"
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="subscribed">Subscribed only</SelectItem>
            <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} of {subscribers?.length ?? 0} shown
        </span>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading subscribers…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Mail className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground">No subscribers yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Once visitors sign up via the footer form, they'll show up here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Email</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 font-semibold">Source</th>
                  <th className="text-left px-4 py-3 font-semibold">Subscribed</th>
                  <th className="text-right px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 text-foreground font-medium break-all">{s.email}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleStatus.mutate(s)}
                        className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full transition-colors ${
                          s.status === "subscribed"
                            ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                            : "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
                        }`}
                        title="Click to toggle"
                      >
                        {s.status}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{s.source || "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(s.subscribed_at), { addSuffix: true })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${s.email}?`)) deleteMut.mutate(s.id);
                        }}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-md hover:bg-destructive/10"
                        aria-label="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
};

export default AdminSubscribers;

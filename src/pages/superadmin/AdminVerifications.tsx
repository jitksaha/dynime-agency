import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { apiGet, apiPost } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import VerificationBadge from "@/components/verification/VerificationBadge";
import {
  Copy, ExternalLink, Loader2, Send, Shield, Building2, Eye,
  RefreshCw, CheckCircle2, Clock, Check, AlertCircle, ShieldAlert,
  ArrowRight, Activity, Terminal, MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import WhatsAppSendDialog from "@/components/admin/WhatsAppSendDialog";

const AdminVerifications = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [page, setPage] = useState(1);
  const [syncingAll, setSyncingAll] = useState(false);
  const [whatsAppTarget, setWhatsAppTarget] = useState<any>(null);

  // 1. Fetch dashboard aggregated stats & activity logs
  const { data: dashboard, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-verification-dashboard"],
    queryFn: () => apiGet<any>("/verification/admin/dashboard"),
    refetchInterval: 10000,
  });

  // 2. Fetch paginated list of verification requests
  const { data: requestsData, isLoading: listLoading } = useQuery({
    queryKey: ["admin-verification-requests", filterType, filterStatus, page],
    queryFn: () => {
      const typeParam = filterType ? `&type=${filterType}` : "";
      const statusParam = filterStatus ? `&status=${filterStatus}` : "";
      return apiGet<any>(`/verification/admin/requests?page=${page}&limit=15${typeParam}${statusParam}`);
    },
    refetchInterval: 5000,
  });

  const isLoading = statsLoading || listLoading;
  const requests = requestsData?.items || [];
  const totalItems = requestsData?.total || 0;
  const totalPages = Math.ceil(totalItems / 15);

  const stats = dashboard?.overview || {
    total: 0,
    kyc: 0,
    kyb: 0,
    approved: 0,
    pending: 0,
    declined: 0,
    inReview: 0,
    expired: 0,
  };

  const syncAllSessions = async () => {
    setSyncingAll(true);
    toast.info("Syncing active pending sessions with Didit...");
    try {
      const result = await apiPost<{ success: boolean; synced_count: number }>(
        "/verification/admin/sync-all?sync_mock=true"
      );
      if (result?.success) {
        toast.success(`Sync completed! Updated ${result.synced_count} pending verifications.`);
        qc.invalidateQueries({ queryKey: ["admin-verification-dashboard"] });
        qc.invalidateQueries({ queryKey: ["admin-verification-requests"] });
      } else {
        toast.error("Failed to sync verification records");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Sync request failed");
    } finally {
      setSyncingAll(false);
    }
  };

  // Local client-side filtering for search term
  const filteredRequests = requests.filter((r: any) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      r.customer_name?.toLowerCase().includes(term) ||
      r.customer_email?.toLowerCase().includes(term) ||
      r.didit_session_id?.toLowerCase().includes(term) ||
      r.invoice_number?.toLowerCase().includes(term)
    );
  });

  return (
    <>
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
              Compliance &amp; Verification Center
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Consolidated workspace to audit KYC/KYB records, track webhook event logs, and manage customer verification links
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={syncAllSessions}
              disabled={syncingAll}
              variant="outline"
              className="h-10 hover:bg-muted font-medium transition-all text-xs border-muted/50"
            >
              {syncingAll ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin text-primary" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2 text-muted-foreground" />
              )}
              Sync Pending Sessions
            </Button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card className="border-muted/50 shadow-sm bg-card/30 backdrop-blur-md">
            <CardHeader className="pb-2">
              <CardDescription className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total Requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {stats.kyc} KYC · {stats.kyb} KYB
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-muted/50 shadow-sm bg-card/30 backdrop-blur-md">
            <CardHeader className="pb-2">
              <CardDescription className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Approved</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 flex items-baseline gap-1">
                {stats.approved}
                <span className="text-xs font-normal text-muted-foreground">
                  ({stats.total ? Math.round((stats.approved / stats.total) * 100) : 0}%)
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Identities verified</p>
            </CardContent>
          </Card>

          <Card className="border-muted/50 shadow-sm bg-card/30 backdrop-blur-md">
            <CardHeader className="pb-2">
              <CardDescription className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Pending</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                {stats.pending}
                {stats.pending > 0 && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Awaiting completion</p>
            </CardContent>
          </Card>

          <Card className="border-muted/50 shadow-sm bg-card/30 backdrop-blur-md">
            <CardHeader className="pb-2">
              <CardDescription className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">In Review</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.inReview}</div>
              <p className="text-[10px] text-muted-foreground mt-1">Manual audits required</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Workspace Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          
          {/* Left Columns (3/4 width): Requests Registry */}
          <div className="xl:col-span-3 space-y-6">
            
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
              <div className="flex flex-wrap items-center gap-2">
                {/* Type filters */}
                <div className="flex items-center rounded-lg border bg-muted/20 p-1">
                  <button
                    onClick={() => { setFilterType(""); setPage(1); }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      filterType === "" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All Type
                  </button>
                  <button
                    onClick={() => { setFilterType("kyc"); setPage(1); }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${
                      filterType === "kyc" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Shield className="h-3 w-3 text-blue-500" /> KYC
                  </button>
                  <button
                    onClick={() => { setFilterType("kyb"); setPage(1); }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${
                      filterType === "kyb" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Building2 className="h-3 w-3 text-purple-500" /> KYB
                  </button>
                </div>

                {/* Status filters */}
                <div className="flex items-center rounded-lg border bg-muted/20 p-1">
                  <button
                    onClick={() => { setFilterStatus(""); setPage(1); }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      filterStatus === "" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All Status
                  </button>
                  <button
                    onClick={() => { setFilterStatus("verified"); setPage(1); }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      filterStatus === "verified" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Verified
                  </button>
                  <button
                    onClick={() => { setFilterStatus("pending"); setPage(1); }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      filterStatus === "pending" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    onClick={() => { setFilterStatus("rejected"); setPage(1); }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      filterStatus === "rejected" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Declined
                  </button>
                </div>
              </div>

              <div className="relative w-full md:max-w-xs">
                <Input
                  placeholder="Search name, email, order..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-background/50 backdrop-blur-sm h-9 text-xs"
                />
              </div>
            </div>

            {/* Table */}
            <Card className="border-muted/65 shadow-md bg-card/40 backdrop-blur-md overflow-hidden">
              <CardHeader className="pb-3 border-b border-muted/20 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Verification requests</CardTitle>
                  <CardDescription className="text-xs">Compliance registry list</CardDescription>
                </div>
                <Badge variant="outline" className="font-semibold text-xs border-muted/80 bg-muted/20">
                  {totalItems} records
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground">Retrieving registry...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="py-2.5 px-4 text-xs font-semibold">Customer / Company</TableHead>
                          <TableHead className="py-2.5 px-4 text-xs font-semibold">Status</TableHead>
                          <TableHead className="py-2.5 px-4 text-xs font-semibold">Type</TableHead>
                          <TableHead className="py-2.5 px-4 text-xs font-semibold">Service Order</TableHead>
                          <TableHead className="py-2.5 px-4 text-xs font-semibold">Created On</TableHead>
                          <TableHead className="py-2.5 px-4 text-right text-xs font-semibold">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRequests.map((r: any) => {
                          const isKyc = r.type === "kyc" || r.type === "aml";
                          return (
                            <TableRow key={r.id} className="hover:bg-muted/10 transition-colors border-b border-muted/20">
                              <TableCell className="py-3 px-4">
                                <div className="space-y-0.5">
                                  <div className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                                    {isKyc ? (
                                      <Shield className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                    ) : (
                                      <Building2 className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                                    )}
                                    {r.customer_name || "Unknown"}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground font-mono">{r.customer_email}</div>
                                </div>
                              </TableCell>
                              <TableCell className="py-3 px-4">
                                <VerificationBadge status={r.status} />
                              </TableCell>
                              <TableCell className="py-3 px-4">
                                {isKyc ? (
                                  <Badge variant="outline" className="border-blue-500/25 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold text-[10px] px-1.5 py-0">
                                    KYC
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="border-purple-500/25 bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold text-[10px] px-1.5 py-0">
                                    KYB
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="py-3 px-4 text-xs">
                                {r.invoice_number !== "N/A" ? (
                                  <span className="font-medium text-foreground">Invoice #{r.invoice_number}</span>
                                ) : (
                                  <span className="text-muted-foreground text-[11px]">—</span>
                                )}
                              </TableCell>
                              <TableCell className="py-3 px-4 text-[10px] text-muted-foreground font-medium">
                                {new Date(r.created_at).toLocaleString()}
                              </TableCell>
                              <TableCell className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => {
                                      if (r.verification_url) {
                                        navigator.clipboard.writeText(r.verification_url);
                                        toast.success("Verification link copied");
                                      }
                                    }}
                                    disabled={!r.verification_url}
                                    title="Copy Link"
                                    className="h-8 w-8 hover:bg-muted text-muted-foreground hover:text-foreground"
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    asChild
                                    disabled={!r.verification_url}
                                    title="Open Link"
                                    className="h-8 w-8 hover:bg-muted text-muted-foreground hover:text-foreground"
                                  >
                                    <a href={r.verification_url} target="_blank" rel="noreferrer">
                                      <ExternalLink className="h-3.5 w-3.5" />
                                    </a>
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => setWhatsAppTarget(r)}
                                    title="Send WhatsApp notification"
                                    className="h-8 w-8 hover:bg-emerald-500/10 text-emerald-600 hover:text-emerald-700"
                                  >
                                    <MessageSquare className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    asChild
                                    title="View details dossier"
                                    className="h-8 w-8 hover:bg-muted text-primary hover:text-primary/80"
                                  >
                                    <Link to={`/superadmin/verifications/${r.id}`}>
                                      <ArrowRight className="h-3.5 w-3.5" />
                                    </Link>
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {filteredRequests.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                              <div className="flex flex-col items-center justify-center gap-2">
                                <ShieldAlert className="h-8 w-8 text-muted-foreground/50" />
                                <span className="text-xs font-semibold">No verification requests found</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>
                  Page {page} of {totalPages} ({totalItems} total requests)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    variant="outline"
                    className="h-8 text-[11px] font-medium"
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    variant="outline"
                    className="h-8 text-[11px] font-medium"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column (1/4 width): Webhook Activity Monitoring */}
          <div className="space-y-6">
            
            {/* Recent Activity Log */}
            <Card className="border-muted/50 shadow bg-card/25 backdrop-blur-md">
              <CardHeader className="pb-3 border-b border-muted/20">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <Activity className="h-4 w-4 text-primary" />
                  Live Activity Monitoring
                </CardTitle>
                <CardDescription className="text-[10px]">Lifecycle events log</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 px-3">
                {dashboard?.recentLogs && dashboard.recentLogs.length > 0 ? (
                  <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                    {dashboard.recentLogs.map((log: any) => {
                      let color = "bg-primary/20 border-primary text-primary";
                      if (log.action === "approved" || log.action === "order_updated") {
                        color = "bg-emerald-500/20 border-emerald-500 text-emerald-500";
                      } else if (log.action === "declined" || log.action === "order_flagged") {
                        color = "bg-destructive/20 border-destructive text-destructive";
                      }
                      return (
                        <div key={log.id} className="relative pl-4 border-l border-muted/60 text-[11px] space-y-1">
                          <div className={`absolute -left-[5px] top-1.5 rounded-full w-2.5 h-2.5 ${color}`} />
                          <div className="flex items-center justify-between text-[9px] uppercase tracking-wider font-semibold">
                            <span className="text-foreground/80">{log.action.replace(/_/g, " ")}</span>
                            <span className="text-muted-foreground font-mono">{new Date(log.created_at).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-muted-foreground text-[10px] leading-relaxed font-medium">
                            {log.description}
                          </p>
                          <span className="text-[9px] font-semibold text-foreground/70 block">
                            Subject: {log.customer_name} ({log.request_type.toUpperCase()})
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    No activity logs recorded.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Webhook Events Log */}
            <Card className="border-muted/50 shadow bg-card/25 backdrop-blur-md">
              <CardHeader className="pb-3 border-b border-muted/20">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <Terminal className="h-4 w-4 text-primary" />
                  Recent Webhooks
                </CardTitle>
                <CardDescription className="text-[10px]">Real-time Didit POST callbacks</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 px-3">
                {dashboard?.webhookLogs && dashboard.webhookLogs.length > 0 ? (
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                    {dashboard.webhookLogs.map((log: any) => (
                      <div key={log.id} className="p-2 border border-muted/30 rounded bg-muted/10 space-y-1.5 text-[11px] hover:border-muted-foreground/10 transition-colors">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="font-mono text-[9px] bg-primary/5 text-primary border-primary/20 leading-none">
                            {log.webhook_type}
                          </Badge>
                          <span className="text-[9px] text-muted-foreground font-mono">
                            {new Date(log.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-[9px] text-muted-foreground flex justify-between">
                          <span>Session ID:</span>
                          <span className="font-mono font-semibold">{log.session_id ? `${log.session_id.slice(0, 8)}...` : "N/A"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    No webhook events logged.
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </SuperAdminLayout>

    {/* WhatsApp Notification Dialog */}
    <WhatsAppSendDialog
      isOpen={!!whatsAppTarget}
      onClose={() => setWhatsAppTarget(null)}
      recipientPhone={whatsAppTarget?.phone || ""}
      recipientName={whatsAppTarget?.customer_name || ""}
      defaultTemplateKey="id_verification"
      defaultVars={{
        0: whatsAppTarget?.customer_name || "",
        1: whatsAppTarget?.status || "",
      }}
    />
    </>
  );
};

export default AdminVerifications;

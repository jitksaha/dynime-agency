import { useState, useEffect } from "react";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
  Banknote, Filter, RefreshCw, AlertTriangle,
  Loader2, CheckCircle2, Clock,
} from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";

type PayoutStatus = "pending" | "paid" | "rejected";

interface PayoutPartner {
  id: string;
  name: string;
  email: string;
}

interface Payout {
  id: string;
  partner_id: string;
  partners: PayoutPartner;
  amount: number;
  currency?: string;
  method: string;
  status: PayoutStatus;
  details?: any;
  transaction_id?: string;
  requested_at: string;
  paid_at?: string;
}

const statusBadge: Record<PayoutStatus, string> = {
  pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  paid: "bg-green-500/10 text-green-500 border-green-500/20",
  rejected: "bg-red-500/10 text-red-400 border-red-500/20",
};

const fmtCurrency = (n: number, currency = "USD") =>
  `$${(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const renderDetails = (details: any) => {
  if (!details) return "—";
  
  let parsed = details;
  if (typeof details === "string") {
    try {
      parsed = JSON.parse(details);
    } catch {
      return details;
    }
  }
  
  const info = parsed?.paymentInfo || parsed;
  if (!info) return "—";
  
  if (info.accountHolderName) {
    return (
      <div className="space-y-0.5 text-[11px] leading-tight font-mono text-muted-foreground">
        <div>Name: {info.accountHolderName}</div>
        <div>Bank: {info.bankName} ({info.bankCountry})</div>
        <div>IBAN: {info.iban}</div>
        <div>SWIFT: {info.swift}</div>
      </div>
    );
  }
  
  if (info.email) {
    return <span className="text-[11px] font-mono text-muted-foreground">Payoneer: {info.email}</span>;
  }
  
  if (info.coin) {
    return (
      <div className="space-y-0.5 text-[11px] leading-tight font-mono text-muted-foreground">
        <div>Coin: {info.coin} ({info.network})</div>
        <div className="truncate">Addr: {info.walletAddress}</div>
      </div>
    );
  }
  
  if (info.redotpayId) {
    return <span className="text-[11px] font-mono text-muted-foreground">RedotPay ID: {info.redotpayId}</span>;
  }
  
  if (info.kastUsername) {
    return <span className="text-[11px] font-mono text-muted-foreground">Kast: {info.kastUsername}</span>;
  }

  if (typeof info === "object") {
    return <span className="text-[11px] font-mono text-muted-foreground truncate">{JSON.stringify(info)}</span>;
  }
  
  return <span className="text-[11px] font-mono text-muted-foreground">{String(info)}</span>;
};

const AdminPayoutRequests = () => {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [approveTarget, setApproveTarget] = useState<Payout | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [isApproving, setIsApproving] = useState(false);

  const [rejectTarget, setRejectTarget] = useState<Payout | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");

  const fetchPayouts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiGet<any>("/referrals/admin/payouts");
      setPayouts(Array.isArray(data) ? data : data.data ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load payouts");
      toast.error("Failed to load payouts");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchPayouts();
  }, []);

  const approvePayout = async () => {
    if (!approveTarget) return;
    if (!transactionId.trim()) {
      toast.error("Please enter a transaction ID");
      return;
    }
    setIsApproving(true);
    try {
      await apiPost(`/referrals/admin/payouts/${approveTarget.id}/approve`, {
        transactionId: transactionId.trim(),
        adminNotes: adminNotes.trim() || undefined,
      });
      toast.success("Payout approved successfully");
      
      const noteToSave = adminNotes.trim() || undefined;
      // Optimistically update
      setPayouts((prev) =>
        prev.map((p) =>
          p.id === approveTarget.id
            ? { 
                ...p, 
                status: "paid", 
                transaction_id: transactionId.trim(), 
                paid_at: new Date().toISOString(),
                details: typeof p.details === 'object'
                  ? { ...p.details, adminNotes: noteToSave }
                  : { adminNotes: noteToSave }
              }
            : p
        )
      );
      setApproveTarget(null);
      setTransactionId("");
      setAdminNotes("");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to approve payout");
    } finally {
      setIsApproving(false);
    }
  };

  const rejectPayout = async () => {
    if (!rejectTarget) return;
    setIsRejecting(true);
    try {
      await apiPost(`/referrals/admin/payouts/${rejectTarget.id}/reject`, {
        adminNotes: adminNotes.trim() || undefined,
      });
      toast.success("Payout rejected successfully");
      
      const noteToSave = adminNotes.trim() || undefined;
      // Optimistically update
      setPayouts((prev) =>
        prev.map((p) =>
          p.id === rejectTarget.id
            ? { 
                ...p, 
                status: "rejected", 
                details: typeof p.details === 'object'
                  ? { ...p.details, adminNotes: noteToSave }
                  : { adminNotes: noteToSave }
              }
            : p
        )
      );
      setRejectTarget(null);
      setAdminNotes("");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to reject payout");
    } finally {
      setIsRejecting(false);
    }
  };

  const openApprove = (payout: Payout) => {
    setApproveTarget(payout);
    setTransactionId("");
    setAdminNotes("");
  };

  const openReject = (payout: Payout) => {
    setRejectTarget(payout);
    setAdminNotes("");
  };

  const filtered = payouts.filter((p) =>
    statusFilter === "all" ? true : p.status === statusFilter
  );

  const pendingTotal = payouts
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const pendingCount = payouts.filter((p) => p.status === "pending").length;

  return (
    <SuperAdminLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Payout Requests</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Review and approve partner payout requests</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void fetchPayouts()}>
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      {/* Pending amount summary */}
      {!isLoading && !error && pendingCount > 0 && (
        <div className="glass-card p-4 border-amber-500/30 bg-amber-500/5 flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <p className="font-semibold text-amber-400">
                {pendingCount} pending payout{pendingCount !== 1 ? "s" : ""}
              </p>
              <p className="text-xs text-amber-500/70">Awaiting your approval</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-heading font-bold text-amber-400">{fmtCurrency(pendingTotal)}</p>
            <p className="text-xs text-muted-foreground">total pending</p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3 mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="glass-card p-12 text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-3 text-muted-foreground animate-spin" />
          <p className="text-sm text-muted-foreground">Loading payouts…</p>
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="glass-card p-8 text-center border-destructive/30">
          <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-destructive" />
          <p className="text-sm text-destructive font-medium">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => void fetchPayouts()}>
            Try again
          </Button>
        </div>
      )}

      {/* Table */}
      {!isLoading && !error && (
        filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Banknote className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No payout requests found.</p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 text-muted-foreground font-medium">Partner</th>
                    <th className="text-right p-3 text-muted-foreground font-medium">Amount</th>
                    <th className="text-left p-3 text-muted-foreground font-medium">Method</th>
                    <th className="text-left p-3 text-muted-foreground font-medium">Status</th>
                    <th className="text-left p-3 text-muted-foreground font-medium">Details</th>
                    <th className="text-left p-3 text-muted-foreground font-medium">Requested</th>
                    <th className="text-right p-3 text-muted-foreground font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((payout) => {
                    const partner = payout.partners;
                    
                    // Parse admin notes
                    let notes = "";
                    if (payout.details && typeof payout.details === 'object') {
                      notes = payout.details.adminNotes || "";
                    } else if (payout.details && typeof payout.details === 'string') {
                      try {
                        const parsed = JSON.parse(payout.details);
                        notes = parsed.adminNotes || "";
                      } catch {}
                    }

                    return (
                      <tr
                        key={payout.id}
                        className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                      >
                        <td className="p-3">
                          <div className="font-medium text-foreground">
                            {partner?.name || "—"}
                          </div>
                          <div className="text-xs text-muted-foreground">{partner?.email || "—"}</div>
                        </td>
                        <td className="p-3 text-right font-heading font-bold text-foreground">
                          {fmtCurrency(payout.amount, payout.currency)}
                        </td>
                        <td className="p-3">
                          <span className="text-xs text-muted-foreground capitalize font-mono bg-secondary px-2 py-0.5 rounded">
                            {payout.method === "Kast" ? "Kast (SSB USA)" : payout.method}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${statusBadge[payout.status] ?? ""}`}
                          >
                            {payout.status}
                          </span>
                        </td>
                        <td className="p-3">
                          {renderDetails(payout.details)}
                          {payout.transaction_id && (
                            <div className="text-[10px] text-green-400 mt-1 font-mono">
                              TX: {payout.transaction_id}
                            </div>
                          )}
                          {notes && (
                            <div className="text-[10px] text-primary mt-1 border-t border-border/20 pt-1">
                              Note: {notes}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {payout.requested_at
                            ? format(new Date(payout.requested_at), "MMM d, yyyy h:mm a")
                            : "—"}
                        </td>
                        <td className="p-3 text-right">
                          {payout.status === "pending" && (
                            <div className="flex justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1.5 border-green-500/40 text-green-400 hover:bg-green-500/10 hover:border-green-500/60"
                                onClick={() => openApprove(payout)}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1.5 border-rose-500/40 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/60"
                                onClick={() => openReject(payout)}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                          {payout.status === "paid" && (
                            <span className="text-xs text-green-500/70 font-medium">
                              {payout.paid_at
                                ? format(new Date(payout.paid_at), "MMM d, yyyy")
                                : "Paid"}
                            </span>
                          )}
                          {payout.status === "rejected" && (
                            <span className="text-xs text-rose-500/70 font-medium">Rejected</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Approve Modal */}
      <Dialog
        open={!!approveTarget}
        onOpenChange={(open) => {
          if (!open && !isApproving) {
            setApproveTarget(null);
            setTransactionId("");
            setAdminNotes("");
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Approve Payout</DialogTitle>
          </DialogHeader>
          {approveTarget && (
            <div className="space-y-4 mt-2">
              <div className="rounded-lg bg-secondary/50 border border-border p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Partner</span>
                  <span className="font-medium text-foreground">{approveTarget.partners?.name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-heading font-bold text-foreground">
                    {fmtCurrency(approveTarget.amount, approveTarget.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Method</span>
                  <span className="capitalize text-foreground">
                    {approveTarget.method === "Kast" ? "Kast (SSB USA)" : approveTarget.method}
                  </span>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold mb-1 tracking-wider">Payment Details:</div>
                  <div className="p-2 rounded bg-background/50 border border-border/40">
                    {renderDetails(approveTarget.details)}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Transaction ID <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. TXN_abc123xyz"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Admin Notes (Optional)
                </label>
                <textarea
                  placeholder="e.g. Sent via Payoneer, transfer ID confirmation"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setApproveTarget(null); setTransactionId(""); setAdminNotes(""); }}
                  disabled={isApproving}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 gap-1.5 bg-green-600 hover:bg-green-500 text-white"
                  onClick={() => void approvePayout()}
                  disabled={isApproving || !transactionId.trim()}
                >
                  {isApproving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Approving…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Confirm Payout
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog
        open={!!rejectTarget}
        onOpenChange={(open) => {
          if (!open && !isRejecting) {
            setRejectTarget(null);
            setAdminNotes("");
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject Payout</DialogTitle>
          </DialogHeader>
          {rejectTarget && (
            <div className="space-y-4 mt-2">
              <div className="rounded-lg bg-secondary/50 border border-border p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Partner</span>
                  <span className="font-medium text-foreground">{rejectTarget.partners?.name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-heading font-bold text-foreground">
                    {fmtCurrency(rejectTarget.amount, rejectTarget.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Method</span>
                  <span className="capitalize text-foreground">
                    {rejectTarget.method === "Kast" ? "Kast (SSB USA)" : rejectTarget.method}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Rejection Reason / Admin Notes <span className="text-destructive">*</span>
                </label>
                <textarea
                  placeholder="Explain why this request is rejected..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  required
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  autoFocus
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setRejectTarget(null); setAdminNotes(""); }}
                  disabled={isRejecting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 gap-1.5"
                  onClick={() => void rejectPayout()}
                  disabled={isRejecting || !adminNotes.trim()}
                >
                  {isRejecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Rejecting…
                    </>
                  ) : (
                    "Reject Payout"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
};

export default AdminPayoutRequests;

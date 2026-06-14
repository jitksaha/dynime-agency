import { useState } from "react";
import { Link } from "react-router-dom";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/integrations/db/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package, Eye, ExternalLink, Search, Filter, Plus, Download, Pencil,
  ShieldCheck, ShieldAlert, ShieldQuestion, ServerCog, RefreshCw, Clock, Trash2, X, Link2,
  Receipt, Undo2, Send, Loader2, Copy, Check, Upload,
} from "lucide-react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";

const PUBLIC_INVOICE_HOST = "https://dynime.com";
const buildPublicInvoiceUrl = (ref: string) => `${PUBLIC_INVOICE_HOST}/invoice/${ref}`;
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { useOrdersRealtime } from "@/hooks/useOrdersRealtime";
import RecurringHealthWidget from "@/components/admin/RecurringHealthWidget";


type VerificationMeta = {
  provider?: string;
  verified_at?: string;
  signature_valid?: boolean | null;
  server_query_used?: boolean;
  invoice_mismatch?: boolean | null;
  authoritative_status?: string | null;
  retry_attempts?: number;
  retry_exhausted?: boolean;
  notes?: string;
};

const STATUS_OPTIONS = ["pending", "confirmed", "processing", "completed", "cancelled", "refunded"];

const statusColor: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20 font-semibold",
  paid: "bg-green-500/10 text-green-600 border-green-500/20",
  failed: "bg-red-500/10 text-red-600 border-red-500/20",
  confirmed: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  processing: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  completed: "bg-green-500/10 text-green-600 border-green-500/20",
  cancelled: "bg-muted text-muted-foreground border-border",
  refunded: "bg-red-500/10 text-red-600 border-red-500/20",
};

// Compact verification status (for the table row badge).
const verificationSummary = (meta: VerificationMeta | null) => {
  if (!meta) return { tone: "neutral", label: "No verification", icon: ShieldQuestion };
  if (meta.signature_valid === false || meta.invoice_mismatch === true)
    return { tone: "bad", label: "Verification issue", icon: ShieldAlert };
  if (meta.retry_exhausted)
    return { tone: "warn", label: "Retries exhausted", icon: RefreshCw };
  if (meta.server_query_used)
    return { tone: "good", label: "Verified", icon: ShieldCheck };
  return { tone: "warn", label: "Unverified", icon: ShieldQuestion };
};

const toneClass = (tone: string) =>
  tone === "good"
    ? "text-green-600 dark:text-green-500"
    : tone === "warn"
      ? "text-yellow-600 dark:text-yellow-500"
      : tone === "bad"
        ? "text-destructive"
        : "text-muted-foreground";

// Unified verification status (combining payment and identity verification)
const getOrderVerificationStatus = (order: any) => {
  const idVerify = order.service_brief?.identity_verification;
  const payVerify = order.payment_verification as VerificationMeta | null;

  const isIdVerified = idVerify?.status === "verified";
  const isPayVerified = payVerify?.server_query_used || payVerify?.signature_valid === true;

  if (isIdVerified || isPayVerified) {
    return {
      status: "verified",
      tone: "good",
      label: isIdVerified ? (idVerify.type === "kyb" ? "KYB Verified" : "KYC Verified") : "Payment Verified",
      icon: Check,
    };
  }

  const isIdPending = idVerify?.status === "pending" || idVerify?.status === "in_review";
  if (isIdPending) {
    return {
      status: "pending",
      tone: "warn",
      label: idVerify.status === "in_review" ? "ID In Review" : "ID Pending",
      icon: Clock,
    };
  }

  const isIdRejected = idVerify?.status === "rejected";
  const isPayBad = payVerify && (payVerify.signature_valid === false || payVerify.invoice_mismatch === true);
  if (isIdRejected || isPayBad) {
    return {
      status: "failed",
      tone: "bad",
      label: isIdRejected ? "ID Rejected" : "Payment Issue",
      icon: ShieldAlert,
    };
  }

  return {
    status: "none",
    tone: "neutral",
    label: "No verification",
    icon: ShieldQuestion,
  };
};

const fetchAllOrders = async () => {
  const res = await apiGet<{ data: any[] }>("/orders?limit=10000");
  return res.data;
};

const AdminOrders = () => {
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [verifyType, setVerifyType] = useState<"kyc" | "kyb">("kyc");
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ url: string; type: string } | null>(null);
  const qc = useQueryClient();
  const [importing, setImporting] = useState(false);

  const handleExportOrders = async () => {
    try {
      const orders = await apiGet<any[]>("/orders/export");
      const dataStr = JSON.stringify(orders, null, 2);
      const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

      const exportFileDefaultName = `dynime-orders-export-${format(new Date(), "yyyy-MM-dd")}.json`;

      const linkElement = document.createElement("a");
      linkElement.setAttribute("href", dataUri);
      linkElement.setAttribute("download", exportFileDefaultName);
      linkElement.click();
      toast.success("Orders exported successfully");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to export orders");
    }
  };

  const handleImportOrders = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result;
        if (typeof text !== "string") return;

        const orders = JSON.parse(text);
        if (!Array.isArray(orders)) {
          toast.error("Invalid file format. File must contain an array of orders.");
          return;
        }

        if (orders.length === 0) {
          toast.error("Exported file is empty.");
          return;
        }

        const confirm = window.confirm(`Are you sure you want to import ${orders.length} orders? Existing orders matching by ID or Invoice Number will be overwritten.`);
        if (!confirm) return;

        setImporting(true);
        const res = await apiPost<{ created: number; updated: number }>("/orders/import", { orders });
        toast.success(`Import completed successfully! Created: ${res.created}, Updated/Overwritten: ${res.updated}`);
        qc.invalidateQueries({ queryKey: ["admin-orders"] });
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to parse or import orders file.");
      } finally {
        setImporting(false);
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  useOrdersRealtime("admin-orders-list", [
    ["admin-orders"],
    ["dash-orders"],
    ["dash-count"],
    ["account-orders"],
    ["account-orders-full"],
  ]);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: fetchAllOrders,
    refetchInterval: 4000,
  });

  const currentOrder = orders?.find((o: any) => o.id === selectedOrder?.id) || selectedOrder;

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      await apiPatch(`/orders/${orderId}`, { status: newStatus });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update status");
      return;
    }
    toast.success(`Order status updated to ${newStatus}`);
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
    if (selectedOrder?.id === orderId) {
      setSelectedOrder((prev: any) => ({ ...prev, status: newStatus }));
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      const data = await apiDelete<{ ok: boolean; alreadyDeleted?: boolean }>(`/orders/${orderId}`);
      if (!data?.ok) {
        toast.error("Order could not be deleted");
        return;
      }

      toast.success(data.alreadyDeleted ? "Order was already deleted" : "Order deleted");
      setDeleteTarget(null);
      if (selectedOrder?.id === orderId) setSelectedOrder(null);

      // Optimistically remove from every cached orders list so the row disappears instantly
      const stripList = (old: any) =>
        Array.isArray(old) ? old.filter((o: any) => o?.id !== orderId) : old;
      qc.setQueriesData({ queryKey: ["admin-orders"] }, stripList);
      qc.setQueriesData({ queryKey: ["dash-orders"] }, stripList);
      qc.setQueriesData({ queryKey: ["account-orders"] }, stripList);
      qc.setQueriesData({ queryKey: ["account-orders-full"] }, stripList);

      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["dash-orders"] });
      qc.invalidateQueries({ queryKey: ["dash-count"] });
      qc.invalidateQueries({ queryKey: ["account-orders"] });
      qc.invalidateQueries({ queryKey: ["account-orders-full"] });
    } catch (e: any) {
      console.error("[adminDeleteOrder] unexpected", e);
      toast.error(e?.message || "Could not delete order");
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const bulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    setBulkProgress({ done: 0, total: ids.length });
    let ok = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        const data = await apiDelete<{ ok: boolean }>(`/orders/${id}`);
        if (!data?.ok) {
          failed++;
          console.error("[bulkDelete]", id);
        } else {
          ok++;
          const stripList = (old: any) =>
            Array.isArray(old) ? old.filter((o: any) => o?.id !== id) : old;
          qc.setQueriesData({ queryKey: ["admin-orders"] }, stripList);
          qc.setQueriesData({ queryKey: ["dash-orders"] }, stripList);
          qc.setQueriesData({ queryKey: ["account-orders"] }, stripList);
          qc.setQueriesData({ queryKey: ["account-orders-full"] }, stripList);
        }
      } catch (e) {
        failed++;
        console.error("[bulkDelete] unexpected", e);
      }
      setBulkProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
    }
    setBulkProgress(null);
    setBulkConfirmOpen(false);
    clearSelection();
    if (ok) toast.success(`Deleted ${ok} order${ok === 1 ? "" : "s"}${failed ? ` · ${failed} failed` : ""}`);
    else toast.error(`Failed to delete ${failed} order${failed === 1 ? "" : "s"}`);
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
    qc.invalidateQueries({ queryKey: ["dash-count"] });
  };

  const filtered = orders
    ?.filter((o: any) => statusFilter === "all" || o.status === statusFilter)
    .filter((o: any) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        o.customer_email?.toLowerCase().includes(q) ||
        o.customer_name?.toLowerCase().includes(q) ||
        o.id?.toLowerCase().includes(q) ||
        o.invoice_number?.toLowerCase().includes(q) ||
        o.stripe_session_id?.toLowerCase().includes(q)
      );
    });

  const { data: recurringCount = 0, isLoading: loadingRecurring } = useQuery({
    queryKey: ["admin-orders-recurring-count"],
    queryFn: async () => {
      const res = await apiGet<any[]>("/subscriptions?type=recurring");
      return res.length;
    },
    staleTime: 30000,
  });

  const stats = {
    total: orders?.length ?? 0,
    pending: orders?.filter((o: any) => o.status === "pending").length ?? 0,
    completed: orders?.filter((o: any) => o.status === "completed").length ?? 0,
    revenue: orders
      ?.filter((o: any) => o.status === "completed")
      .reduce((sum: number, o: any) => sum + Number(o.total), 0) ?? 0,
  };

  const scrollToRecurring = () => {
    document.getElementById("recurring-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <SuperAdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">Order Management</h1>
        <Button asChild variant="hero" size="sm" className="gap-1.5">
          <Link to="/superadmin/orders/new"><Plus className="w-4 h-4" /> New manual invoice</Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: "Total Orders", value: stats.total, onClick: () => setStatusFilter("all"), loading: isLoading },
          { label: "Pending", value: stats.pending, onClick: () => setStatusFilter("pending"), loading: isLoading },
          { label: "Completed", value: stats.completed, onClick: () => setStatusFilter("completed"), loading: isLoading },
          { label: "Revenue", value: `$${stats.revenue.toFixed(2)}`, onClick: () => setStatusFilter("completed"), loading: isLoading },
          { label: "Recurring", value: recurringCount, onClick: scrollToRecurring, accent: true, loading: loadingRecurring },
        ].map((s: any) => (
          <button
            key={s.label}
            type="button"
            onClick={s.onClick}
            className={`glass-card p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/40 ${s.accent ? "border-primary/30" : ""}`}
          >
            <p className="text-xs text-muted-foreground">{s.label}</p>
            {s.loading ? (
              <Skeleton className="h-7 w-20 mt-1 bg-muted/40" />
            ) : (
              <p className={`text-xl font-heading font-bold mt-1 ${s.accent ? "text-primary" : "text-foreground"}`}>{s.value}</p>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by invoice, order ID, payment ref, name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2 sm:ml-auto">
          <Button type="button" variant="outline" size="sm" onClick={handleExportOrders} className="gap-1.5 h-9 text-xs">
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
          <label className="cursor-pointer">
            <Button type="button" asChild variant="outline" size="sm" className="gap-1.5 h-9 text-xs" disabled={importing}>
              <span>
                {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                Import
              </span>
            </Button>
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportOrders}
              disabled={importing}
            />
          </label>
        </div>
      </div>

      {/* Orders Table */}
      {isLoading ? (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-3 w-10">
                    <Checkbox disabled aria-label="Select all" />
                  </th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Invoice / Order</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Customer</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Total</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Status</th>
                  <th className="text-center p-3 text-muted-foreground font-medium w-16">
                    <div className="flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4 text-muted-foreground/80" />
                    </div>
                  </th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Date</th>
                  <th className="text-right p-3 text-muted-foreground font-medium animate-pulse">Loading orders…</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="p-3">
                      <Skeleton className="h-4 w-4 rounded bg-muted/20" />
                    </td>
                    <td className="p-3">
                      <Skeleton className="h-4 w-24 mb-1.5 bg-muted/30" />
                      <Skeleton className="h-3 w-16 bg-muted/20" />
                    </td>
                    <td className="p-3">
                      <Skeleton className="h-4 w-28 mb-1.5 bg-muted/30" />
                      <Skeleton className="h-3 w-36 bg-muted/20" />
                    </td>
                    <td className="p-3">
                      <Skeleton className="h-4 w-16 bg-muted/30" />
                    </td>
                    <td className="p-3">
                      <Skeleton className="h-5 w-16 rounded-full bg-muted/20" />
                    </td>
                    <td className="p-3">
                      <div className="flex justify-center">
                        <Skeleton className="h-4 w-4 rounded-full bg-muted/20" />
                      </div>
                    </td>
                    <td className="p-3">
                      <Skeleton className="h-3.5 w-24 bg-muted/20" />
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Skeleton className="h-7 w-20 rounded bg-muted/20" />
                        <Skeleton className="h-7 w-7 rounded bg-muted/20" />
                        <Skeleton className="h-7 w-7 rounded bg-muted/20" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : filtered?.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No orders found.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between gap-3 px-4 py-2 bg-destructive/10 border-b border-destructive/30">
              <div className="text-sm text-foreground">
                <span className="font-semibold">{selectedIds.size}</span> selected
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={clearSelection} className="h-8">
                  <X className="w-3.5 h-3.5 mr-1" /> Clear
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-8"
                  onClick={() => setBulkConfirmOpen(true)}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete selected
                </Button>
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-3 w-10">
                    <Checkbox
                      checked={
                        (filtered?.length ?? 0) > 0 &&
                        filtered!.every((o: any) => selectedIds.has(o.id))
                      }
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedIds(new Set(filtered!.map((o: any) => o.id)));
                        } else {
                          clearSelection();
                        }
                      }}
                      aria-label="Select all"
                    />
                  </th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Invoice / Order</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Customer</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Total</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Status</th>
                  <th className="text-center p-3 text-muted-foreground font-medium w-16">
                    <div className="flex items-center justify-center" title="Verification Status">
                      <ShieldCheck className="w-4 h-4 text-muted-foreground/80" />
                    </div>
                  </th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Date</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered?.map((order: any) => {
                  const checked = selectedIds.has(order.id);
                  return (
                  <tr key={order.id} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${checked ? "bg-destructive/5" : ""}`}>
                    <td className="p-3">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(c) => toggleOne(order.id, !!c)}
                        aria-label={`Select order ${order.invoice_number || order.id}`}
                      />
                    </td>
                    <td className="p-3 text-xs">
                      <div className="font-mono font-semibold text-foreground">{order.invoice_number || "—"}</div>
                      <div className="font-mono text-muted-foreground">{order.id.slice(0, 8)}…</div>
                      {order.stripe_session_id && (
                        <div className="font-mono text-muted-foreground/70 truncate max-w-[180px]" title={order.stripe_session_id}>
                          ref: {order.stripe_session_id}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="text-foreground font-medium">{order.customer_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{order.customer_email}</div>
                    </td>
                    <td className="p-3 font-heading font-bold text-foreground">{formatCurrency(Number(order.total), order.currency || "USD")}</td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${statusColor[order.status] || ""}`}>
                        {order.status === "pending" ? "Dont Miss It" : order.status}
                      </span>
                    </td>
                    <td className="p-3">
                      {(() => {
                        const status = getOrderVerificationStatus(order);
                        const Icon = status.icon;
                        if (status.status === "verified") {
                          return (
                            <div className="flex justify-center" title={status.label}>
                              <Check className="w-5 h-5 text-green-500 stroke-[3px] filter drop-shadow-[0_0_4px_rgba(34,197,94,0.3)]" />
                            </div>
                          );
                        }
                        if (status.status === "pending") {
                          return (
                            <div className="flex justify-center" title={status.label}>
                              <Clock className="w-4 h-4 text-amber-500" />
                            </div>
                          );
                        }
                        if (status.status === "failed") {
                          return (
                            <div className="flex justify-center animate-pulse" title={status.label}>
                              <ShieldAlert className="w-4 h-4 text-rose-500" />
                            </div>
                          );
                        }
                        return (
                          <div className="flex justify-center text-muted-foreground/30" title="No verification requested">
                            <ShieldQuestion className="w-4 h-4 text-muted-foreground/20" />
                          </div>
                        );
                      })()}
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">{format(new Date(order.created_at), "MMM d, yyyy h:mm a")}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Select value={order.status} onValueChange={(v) => updateStatus(order.id, v)}>
                          <SelectTrigger className="h-7 text-xs w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((s) => (
                              <SelectItem key={s} value={s} className="capitalize text-xs">{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedOrder(order)} title="Quick view">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button asChild variant="ghost" size="icon" className="h-7 w-7" title="Edit invoice">
                          <Link to={`/superadmin/orders/${order.id}/edit`}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                        <Button asChild variant="ghost" size="icon" className="h-7 w-7" title="Open full detail page">
                          <Link to={`/superadmin/orders/${order.id}`}>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                        <Button asChild variant="ghost" size="icon" className="h-7 w-7" title="Download PDF invoice">
                          <a
                            href={`/invoice/${order.invoice_number || order.id}?print=1`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Copy public invoice link (dynime.com)"
                          onClick={async () => {
                            const url = buildPublicInvoiceUrl(order.invoice_number || order.id);
                            try {
                              await navigator.clipboard.writeText(url);
                              toast.success("Invoice link copied", { description: url });
                            } catch {
                              toast.error("Could not copy link");
                            }
                          }}
                        >
                          <Link2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Delete order"
                          onClick={() => setDeleteTarget(order)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => { if (!open) { setSelectedOrder(null); setVerifyResult(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {currentOrder && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Invoice</p>
                  <p className="font-mono text-xs text-foreground">{currentOrder.invoice_number || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Order ID</p>
                  <p className="font-mono text-xs text-foreground break-all">{currentOrder.id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${statusColor[currentOrder.status] || ""}`}>
                    {currentOrder.status === "pending" ? "Dont Miss It" : currentOrder.status}
                  </span>
                </div>
                <div>
                  <p className="text-muted-foreground">Customer</p>
                  <p className="text-foreground font-medium">{currentOrder.customer_name || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="text-foreground">{currentOrder.customer_email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="text-foreground">{format(new Date(currentOrder.created_at), "MMM d, yyyy h:mm a")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Payment Ref</p>
                  <p className="text-foreground text-xs font-mono">{currentOrder.stripe_session_id || "—"}</p>
                </div>
              </div>

              <div>
                <p className="text-muted-foreground text-sm mb-2">Items</p>
                <div className="border border-border rounded-lg divide-y divide-border">
                  {(Array.isArray(currentOrder.items) ? currentOrder.items : []).map((item: any, i: number) => (
                    <div key={i} className="flex justify-between p-3 text-sm">
                      <span className="text-foreground">{item.name} <span className="text-muted-foreground">× {item.quantity}</span></span>
                      <span className="font-medium text-foreground">{formatCurrency(item.price * item.quantity, currentOrder.currency || "USD")}</span>
                    </div>
                  ))}
                  <div className="flex justify-between p-3 font-bold text-sm bg-secondary/30">
                    <span>Total</span>
                    <span>{formatCurrency(Number(currentOrder.total), currentOrder.currency || "USD")}</span>
                  </div>
                </div>
              </div>

              {/* VAT / Tax breakdown */}
              <TaxBreakdownPanel order={currentOrder} />


              {/* Payment verification (signature, server query, retries) */}
              {currentOrder.payment_verification && (
                <VerificationDetails meta={currentOrder.payment_verification as VerificationMeta} />
              )}

              {/* Identity / business verification request */}
              {(() => {
                const identityVerification = currentOrder?.service_brief?.identity_verification;
                const activeVerification = (identityVerification ? {
                  url: identityVerification.verification_url || `${window.location.origin}/verify-order/${currentOrder.id}`,
                  type: identityVerification.type,
                  status: identityVerification.status,
                  session_id: identityVerification.session_id,
                } : null) || verifyResult;

                const getStatusBadge = (status: string) => {
                  const styles: Record<string, string> = {
                    verified: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                    pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
                    in_review: "bg-blue-500/10 text-blue-500 border-blue-500/20",
                    rejected: "bg-destructive/10 text-destructive border-destructive/20",
                    expired: "bg-muted text-muted-foreground border-muted-foreground/20",
                  };
                  return (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${styles[status] || ""}`}>
                      {status.replace("_", " ")}
                    </span>
                  );
                };

                const clearVerification = async () => {
                  setVerifyResult(null);
                  if (identityVerification) {
                    try {
                      const updatedBrief = { ...currentOrder.service_brief };
                      delete updatedBrief.identity_verification;
                      await apiPatch(`/orders/${currentOrder.id}`, { service_brief: updatedBrief });
                      
                      qc.setQueryData(["admin-orders"], (oldOrders: any[] | undefined) => {
                        if (!oldOrders) return oldOrders;
                        return oldOrders.map((o: any) => 
                          o.id === currentOrder.id ? { ...o, service_brief: updatedBrief } : o
                        );
                      });

                      setSelectedOrder((prev: any) => ({ ...prev, service_brief: updatedBrief }));
                      toast.success("Verification cleared. You can create a new request.");
                    } catch (e) {
                      toast.error("Failed to reset verification request");
                    }
                  }
                };

                return (
                  <div className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                        <Send className="h-4 w-4 text-primary" />Request Verification
                      </p>
                      {activeVerification?.status && getStatusBadge(activeVerification.status)}
                    </div>
                    {activeVerification ? (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          {activeVerification.type === "kyc" ? "KYC (includes AML)" : activeVerification.type.toUpperCase()} link created. Copy and send to the customer.
                        </p>
                        <div className="flex gap-2">
                          <input
                            readOnly
                            value={activeVerification.url}
                            className="flex-1 text-xs font-mono border rounded px-2 py-1 bg-muted/40 truncate"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => { navigator.clipboard.writeText(activeVerification.url); toast.success("Link copied"); }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        {activeVerification?.session_id && (
                          <div className="text-[10px] font-mono text-muted-foreground bg-muted/20 px-2 py-1 rounded truncate select-all">
                            Session ID: {activeVerification.session_id}
                          </div>
                        )}
                        <Button size="sm" variant="ghost" onClick={clearVerification}>
                          New request
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2 items-center">
                        <Select value={verifyType} onValueChange={(v) => setVerifyType(v as typeof verifyType)}>
                          <SelectTrigger className="w-28 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="kyc">KYC (includes AML)</SelectItem>
                            <SelectItem value="kyb">KYB</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={verifyBusy}
                          onClick={async () => {
                            setVerifyBusy(true);
                            try {
                              const profileRow = await apiGet<{ id: string }>(`/users/by-email/${encodeURIComponent(currentOrder.customer_email)}`);
                              if (!profileRow?.id) throw new Error("Could not find user account for this email");
                              const result = await apiPost<{ verification_url?: string; session_id?: string }>("/verification/admin/request", {
                                user_id: profileRow.id,
                                type: verifyType,
                                order_id: currentOrder.id,
                                frontend_origin: window.location.origin,
                              });
                              if (!result?.verification_url) throw new Error("No verification URL returned");
                              
                              const newIV = {
                                type: verifyType,
                                session_id: result.session_id || "pending_refresh",
                                status: "pending",
                                verification_url: result.verification_url,
                                updated_at: new Date().toISOString()
                              };
                              const updatedBrief = {
                                ...currentOrder.service_brief,
                                identity_verification: newIV
                              };

                              setVerifyResult({
                                url: result.verification_url,
                                type: verifyType,
                                status: "pending",
                                session_id: result.session_id
                              });

                              qc.setQueryData(["admin-orders"], (oldOrders: any[] | undefined) => {
                                if (!oldOrders) return oldOrders;
                                return oldOrders.map((o: any) => 
                                  o.id === currentOrder.id ? { ...o, service_brief: updatedBrief } : o
                                );
                              });

                              setSelectedOrder((prev: any) => ({
                                ...prev,
                                service_brief: updatedBrief
                              }));
                            } catch (e: any) {
                              toast.error(e?.message ?? "Failed to create verification link");
                            } finally { setVerifyBusy(false); }
                          }}
                        >
                          {verifyBusy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                          Send
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="flex gap-2">
                <Select value={selectedOrder.status} onValueChange={(v) => updateStatus(selectedOrder.id, v)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button asChild variant="outline">
                  <Link to={`/superadmin/orders/${selectedOrder.id}`}>
                    Open detail page <ExternalLink className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !isDeleting && setDeleteTarget(null)}>
        <AlertDialogContent onCloseAutoFocus={(event) => event.preventDefault()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this order?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes order{" "}
              <span className="font-mono font-semibold">
                {deleteTarget?.invoice_number || deleteTarget?.id?.slice(0, 8)}
              </span>{" "}
              for {deleteTarget?.customer_email}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Keep order</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={() => {
                if (deleteTarget) void deleteOrder(deleteTarget.id);
              }}
              className="sm:min-w-32"
            >
              {isDeleting ? "Deleting…" : "Delete order"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkConfirmOpen} onOpenChange={(open) => !open && !bulkProgress && setBulkConfirmOpen(false)}>
        <AlertDialogContent onCloseAutoFocus={(event) => event.preventDefault()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} order{selectedIds.size === 1 ? "" : "s"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the selected orders and their related milestones, services, and ticket links. This action cannot be undone.
              {bulkProgress && (
                <span className="block mt-2 text-foreground font-medium">
                  Deleting {bulkProgress.done} / {bulkProgress.total}…
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!bulkProgress}>Keep orders</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={!!bulkProgress}
              onClick={() => void bulkDelete()}
              className="sm:min-w-32"
            >
              {bulkProgress ? `Deleting ${bulkProgress.done}/${bulkProgress.total}…` : `Delete ${selectedIds.size}`}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Recurring services section */}
      <section id="recurring-section" className="mt-8 scroll-mt-20">
        <RecurringHealthWidget />
      </section>
    </SuperAdminLayout>
  );
};

const VerificationRow = ({
  Icon,
  label,
  value,
  tone,
}: {
  Icon: typeof ShieldCheck;
  label: string;
  value: string;
  tone: "good" | "warn" | "bad" | "neutral";
}) => (
  <div className="flex items-center justify-between gap-3 text-xs">
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className={`w-3.5 h-3.5 ${toneClass(tone)}`} />
      <span>{label}</span>
    </div>
    <span className={`font-medium ${toneClass(tone)}`}>{value}</span>
  </div>
);

const VerificationDetails = ({ meta }: { meta: VerificationMeta }) => {
  const sigTone =
    meta.signature_valid === true ? "good" : meta.signature_valid === false ? "bad" : "neutral";
  const sigLabel =
    meta.signature_valid === true
      ? "Valid"
      : meta.signature_valid === false
        ? "Invalid"
        : "Not configured";
  const queryTone = meta.server_query_used ? "good" : "warn";
  const queryLabel = meta.server_query_used ? "Confirmed via provider API" : "Not used";
  const mismatchTone =
    meta.invoice_mismatch === true ? "bad" : meta.invoice_mismatch === false ? "good" : "neutral";
  const mismatchLabel =
    meta.invoice_mismatch === true
      ? "Mismatch detected"
      : meta.invoice_mismatch === false
        ? "Matches order"
        : "N/A";
  const verifiedAt = meta.verified_at ? new Date(meta.verified_at).toLocaleString() : null;

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ShieldCheck className="w-4 h-4 text-primary" />
          Payment verification
        </div>
        {meta.provider && (
          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
            {meta.provider}
          </Badge>
        )}
      </div>
      <VerificationRow
        Icon={meta.signature_valid === false ? ShieldAlert : meta.signature_valid === true ? ShieldCheck : ShieldQuestion}
        label="Signature"
        value={sigLabel}
        tone={sigTone as "good" | "warn" | "bad" | "neutral"}
      />
      <VerificationRow Icon={ServerCog} label="Server-to-server check" value={queryLabel} tone={queryTone as "good" | "warn"} />
      <VerificationRow
        Icon={meta.invoice_mismatch === true ? ShieldAlert : ShieldCheck}
        label="Invoice number"
        value={mismatchLabel}
        tone={mismatchTone as "good" | "warn" | "bad" | "neutral"}
      />
      {meta.authoritative_status && (
        <VerificationRow Icon={ShieldCheck} label="Provider status" value={meta.authoritative_status} tone="neutral" />
      )}
      {typeof meta.retry_attempts === "number" && meta.retry_attempts > 0 && (
        <VerificationRow
          Icon={meta.retry_exhausted ? ShieldAlert : RefreshCw}
          label="Provider API attempts"
          value={
            meta.retry_exhausted
              ? `${meta.retry_attempts} (retries exhausted)`
              : `${meta.retry_attempts}${meta.retry_attempts > 1 ? " (auto-retried)" : ""}`
          }
          tone={meta.retry_exhausted ? "warn" : meta.retry_attempts > 1 ? "warn" : "good"}
        />
      )}
      {verifiedAt && (
        <VerificationRow Icon={Clock} label="Verified at" value={verifiedAt} tone="neutral" />
      )}
      {meta.notes && (
        <p className="text-[11px] leading-relaxed text-yellow-700 dark:text-yellow-500 border-t border-border pt-2">
          {meta.notes}
        </p>
      )}
    </div>
  );
};


const TaxBreakdownPanel = ({ order }: { order: any }) => {
  const total = Number(order?.total ?? 0);
  const taxAmount = Number(order?.tax_amount ?? 0);
  const taxPercent = Number(order?.tax_percent ?? 0);
  const rawMode = String(order?.tax_mode ?? "").toLowerCase();
  const mode: "inclusive" | "exclusive" | "none" =
    rawMode === "inclusive" ? "inclusive" : rawMode === "exclusive" ? "exclusive" : "none";
  const label = String(order?.tax_label || "VAT");
  const refundedAmount = Number(order?.refunded_amount ?? 0);
  const refundedTax = Number(order?.refunded_tax_amount ?? 0);

  // Derive net/gross from stored values. If we have a tax mode we trust the stored numbers.
  let net = 0;
  let gross = 0;
  if (mode === "inclusive") {
    gross = total;
    net = total - taxAmount;
  } else if (mode === "exclusive") {
    net = total - taxAmount;
    gross = total;
  } else {
    net = total - taxAmount;
    gross = total;
  }

  const hasTax = taxAmount > 0 || taxPercent > 0 || mode !== "none";
  const netRefund = refundedAmount - refundedTax;

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Receipt className="w-4 h-4 text-primary" />
          {label} breakdown
        </div>
        {hasTax && (
          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
            {mode === "inclusive" ? "Inclusive" : mode === "exclusive" ? "Exclusive" : "Untaxed"}
            {taxPercent > 0 ? ` · ${taxPercent}%` : ""}
          </Badge>
        )}
      </div>

      {!hasTax ? (
        <p className="text-xs text-muted-foreground">No tax was applied to this order.</p>
      ) : (
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Net (excl. {label})</span>
            <span className="font-medium text-foreground">{formatCurrency(net, order?.currency || "USD")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {label} ({taxPercent}% {mode})
            </span>
            <span className="font-medium text-foreground">{formatCurrency(taxAmount, order?.currency || "USD")}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-1.5">
            <span className="text-foreground font-semibold">Gross (charged)</span>
            <span className="font-bold text-foreground">{formatCurrency(gross, order?.currency || "USD")}</span>
          </div>
          {mode === "inclusive" && (
            <p className="text-[11px] text-muted-foreground pt-1">
              Customer paid the displayed price — {label} was extracted from the total.
            </p>
          )}
          {mode === "exclusive" && (
            <p className="text-[11px] text-muted-foreground pt-1">
              {label} was added on top of the net price at checkout.
            </p>
          )}
        </div>
      )}

      {(refundedAmount > 0 || refundedTax > 0) && (
        <div className="border-t border-border pt-2 space-y-1 text-xs">
          <div className="flex items-center gap-1.5 text-foreground font-semibold">
            <Undo2 className="w-3.5 h-3.5 text-destructive" /> Refunded
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Refunded total</span>
            <span className="font-medium text-destructive">-{formatCurrency(refundedAmount, order?.currency || "USD")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Refunded {label}</span>
            <span className="font-medium text-destructive">-{formatCurrency(refundedTax, order?.currency || "USD")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Net refund (excl. {label})</span>
            <span className="font-medium text-destructive">-{formatCurrency(netRefund, order?.currency || "USD")}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-1.5">
            <span className="text-foreground font-semibold">Net retained</span>
            <span className="font-bold text-foreground">{formatCurrency(total - refundedAmount, order?.currency || "USD")}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;

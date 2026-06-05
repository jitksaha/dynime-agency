import { useState, useEffect } from "react";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Users, Search, Pencil, RefreshCw, AlertTriangle, Loader2,
} from "lucide-react";
import { apiGet, apiPatch } from "@/lib/api";

type PartnerTier = "standard" | "reseller" | "strategic";
type PartnerStatus = "active" | "suspended" | "pending";

interface Partner {
  id: string;
  name: string;
  email: string;
  referral_code: string;
  tier: PartnerTier;
  status: PartnerStatus;
  total_referrals: number;
  commission_earned: number;
  commission_paid: number;
  commission_multiplier: number;
}

interface EditForm {
  status: PartnerStatus;
  tier: PartnerTier;
  commission_multiplier: number;
}

const tierBadge: Record<PartnerTier, string> = {
  standard: "bg-secondary text-muted-foreground border-border",
  reseller: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  strategic: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

const statusBadge: Record<PartnerStatus, string> = {
  active: "bg-green-500/10 text-green-500 border-green-500/20",
  suspended: "bg-red-500/10 text-red-400 border-red-500/20",
  pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
};

const fmtCurrency = (n: number) =>
  `$${(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const AdminPartnersList = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editTarget, setEditTarget] = useState<Partner | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    status: "active",
    tier: "standard",
    commission_multiplier: 1,
  });
  const [isSaving, setIsSaving] = useState(false);

  const fetchPartners = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiGet<any>("/referrals/admin/partners");
      setPartners(Array.isArray(data) ? data : data.data ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load partners");
      toast.error("Failed to load partners");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchPartners();
  }, []);

  const openEdit = (partner: Partner) => {
    setEditTarget(partner);
    setEditForm({
      status: partner.status,
      tier: partner.tier,
      commission_multiplier: partner.commission_multiplier ?? 1,
    });
  };

  const savePartner = async () => {
    if (!editTarget) return;
    setIsSaving(true);
    try {
      await apiPatch(`/referrals/admin/partners/${editTarget.id}`, {
        status: editForm.status,
        tier: editForm.tier,
        commission_multiplier: editForm.commission_multiplier,
      });
      toast.success("Partner updated successfully");
      setEditTarget(null);
      // Optimistically update local state
      setPartners((prev) =>
        prev.map((p) =>
          p.id === editTarget.id
            ? { ...p, ...editForm }
            : p
        )
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update partner");
    } finally {
      setIsSaving(false);
    }
  };

  const filtered = partners.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      p.name?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.referral_code?.toLowerCase().includes(q)
    );
  });

  return (
    <SuperAdminLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Partners</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage referral partner accounts</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void fetchPartners()}>
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name, email or code…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="glass-card p-12 text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-3 text-muted-foreground animate-spin" />
          <p className="text-sm text-muted-foreground">Loading partners…</p>
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="glass-card p-8 text-center border-destructive/30">
          <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-destructive" />
          <p className="text-sm text-destructive font-medium">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => void fetchPartners()}>
            Try again
          </Button>
        </div>
      )}

      {/* Table */}
      {!isLoading && !error && (
        filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{search ? "No partners match your search." : "No partners found."}</p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 text-muted-foreground font-medium">Partner</th>
                    <th className="text-left p-3 text-muted-foreground font-medium">Code</th>
                    <th className="text-left p-3 text-muted-foreground font-medium">Tier</th>
                    <th className="text-left p-3 text-muted-foreground font-medium">Status</th>
                    <th className="text-right p-3 text-muted-foreground font-medium">Referrals</th>
                    <th className="text-right p-3 text-muted-foreground font-medium">Earned</th>
                    <th className="text-right p-3 text-muted-foreground font-medium">Paid</th>
                    <th className="text-right p-3 text-muted-foreground font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((partner) => (
                    <tr
                      key={partner.id}
                      className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                    >
                      <td className="p-3">
                        <div className="font-medium text-foreground">{partner.name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{partner.email}</div>
                      </td>
                      <td className="p-3">
                        <span className="font-mono text-xs text-foreground bg-secondary px-2 py-0.5 rounded">
                          {partner.referral_code}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${tierBadge[partner.tier] ?? ""}`}
                        >
                          {partner.tier}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${statusBadge[partner.status] ?? ""}`}
                        >
                          {partner.status}
                        </span>
                      </td>
                      <td className="p-3 text-right font-heading font-bold text-foreground">
                        {partner.total_referrals?.toLocaleString() ?? 0}
                      </td>
                      <td className="p-3 text-right text-emerald-400 font-semibold">
                        {fmtCurrency(partner.commission_earned)}
                      </td>
                      <td className="p-3 text-right text-muted-foreground">
                        {fmtCurrency(partner.commission_paid)}
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Edit partner"
                          onClick={() => openEdit(partner)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Edit Modal */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open && !isSaving) setEditTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Partner</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <div className="space-y-4 mt-2">
              <div>
                <p className="font-medium text-foreground">{editTarget.name}</p>
                <p className="text-xs text-muted-foreground">{editTarget.email}</p>
              </div>

              <div className="space-y-3">
                {/* Status */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Status</label>
                  <Select
                    value={editForm.status}
                    onValueChange={(v) => setEditForm((f) => ({ ...f, status: v as PartnerStatus }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Tier */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Tier</label>
                  <Select
                    value={editForm.tier}
                    onValueChange={(v) => setEditForm((f) => ({ ...f, tier: v as PartnerTier }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="reseller">Reseller</SelectItem>
                      <SelectItem value="strategic">Strategic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Commission Multiplier */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Commission Multiplier</label>
                  <input
                    type="number"
                    min={0.1}
                    max={10}
                    step={0.1}
                    value={editForm.commission_multiplier}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        commission_multiplier: parseFloat(e.target.value) || 1,
                      }))
                    }
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Multiplies the base commission rate. E.g. 1.5 = 150% of base.
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setEditTarget(null)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button className="flex-1" onClick={() => void savePartner()} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Save changes"
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

export default AdminPartnersList;

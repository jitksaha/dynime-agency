import { useEffect, useMemo, useState } from "react";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Save, Search, MapPin, RefreshCw } from "lucide-react";
import { STATES } from "@/data/usa-formation";
import type { UsaStatePricingRow } from "@/hooks/use-usa-state-pricing";
import { useQueryClient } from "@tanstack/react-query";
import { useUsaStatePricingAdmin, useUpsertUsaStatePricing } from "@/hooks/use-cms-data";

type Row = Omit<UsaStatePricingRow, "id"> & { id?: string };

const emptyRow = (abbr = "", state = ""): Row => ({
  state,
  abbr,
  llc_formation: 0,
  corp_formation: 0,
  llc_annual: 0,
  llc_annual_label: "$0",
  corp_annual: 0,
  corp_annual_label: "$0",
  llc_renewal: 0,
  corp_renewal: 0,
  state_tax_note: "",
  franchise_tax: "No",
  notes: "",
  sort_order: 0,
  is_active: true,
});

const AdminUSAStatePricing = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dirty, setDirty] = useState<Set<string>>(new Set());

  const { data: initialRows = [], isLoading: loading } = useUsaStatePricingAdmin();
  const upsertStatePricing = useUpsertUsaStatePricing();

  const load = () => {
    qc.invalidateQueries({ queryKey: ["usa-state-pricing-admin"] });
  };

  useEffect(() => {
    if (initialRows.length > 0) {
      setRows(initialRows);
    }
  }, [initialRows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.state.toLowerCase().includes(q) ||
        r.abbr.toLowerCase().includes(q) ||
        (r.notes || "").toLowerCase().includes(q),
    );
  }, [rows, search]);

  const update = (abbr: string, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r.abbr === abbr ? { ...r, ...patch } : r)));
    setDirty((d) => new Set(d).add(abbr));
  };

  const saveRow = async (row: Row) => {
    setSaving(row.abbr);
    const payload = {
      ...row,
      llc_formation: Number(row.llc_formation) || 0,
      corp_formation: Number(row.corp_formation) || 0,
      llc_annual: Number(row.llc_annual) || 0,
      corp_annual: Number(row.corp_annual) || 0,
      llc_renewal: Number(row.llc_renewal) || 0,
      corp_renewal: Number(row.corp_renewal) || 0,
      sort_order: Number(row.sort_order) || 0,
    };
    try {
      await upsertStatePricing.mutateAsync(payload);
      setDirty((d) => {
        const n = new Set(d);
        n.delete(row.abbr);
        return n;
      });
      qc.invalidateQueries({ queryKey: ["usa-state-pricing-admin"] });
      qc.invalidateQueries({ queryKey: ["usa-state-pricing"] });
      toast({ title: `${row.state} saved` });
    } catch (error: any) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const seedMissing = async () => {
    const existing = new Set(rows.map((r) => r.abbr));
    const toAdd = STATES.filter((s) => !existing.has(s.abbr)).map((s, i) => ({
      state: s.state,
      abbr: s.abbr,
      llc_formation: s.llcFormation,
      corp_formation: s.corpFormation,
      llc_annual: s.llcAnnual,
      llc_annual_label: s.llcAnnualLabel,
      corp_annual: s.corpAnnual,
      corp_annual_label: s.corpAnnualLabel,
      llc_renewal: 0,
      corp_renewal: 0,
      state_tax_note: "",
      franchise_tax: s.franchiseTax,
      notes: s.notes,
      sort_order: rows.length + i,
      is_active: true,
    }));
    if (toAdd.length === 0) {
      toast({ title: "Nothing to add — all 50 states already exist" });
      return;
    }
    try {
      await Promise.all(
        toAdd.map((item) => upsertStatePricing.mutateAsync(item))
      );
      toast({ title: `Added ${toAdd.length} missing state(s)` });
      qc.invalidateQueries({ queryKey: ["usa-state-pricing-admin"] });
    } catch (error: any) {
      toast({ title: "Seed failed", description: error.message, variant: "destructive" });
    }
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              USA State Pricing
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage formation, renewal, annual & tax fees for every state. Updates appear instantly on the public US Formation page and pricing widget.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by state name or abbreviation"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground">No states match your search.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((row) => {
              const isDirty = dirty.has(row.abbr);
              return (
                <div
                  key={row.abbr}
                  className={`rounded-xl border p-4 bg-card ${
                    isDirty ? "border-primary/60 shadow-[0_0_0_1px_hsl(var(--primary)/0.3)]" : "border-border"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
                      {row.abbr}
                    </span>
                    <h3 className="font-semibold">{row.state}</h3>
                    <div className="ml-auto flex items-center gap-3">
                      <div className="flex items-center gap-2 text-xs">
                        <Switch
                          checked={row.is_active}
                          onCheckedChange={(v) => update(row.abbr, { is_active: v })}
                        />
                        <span className="text-muted-foreground">Active</span>
                      </div>
                      <Button
                        size="sm"
                        variant={isDirty ? "default" : "ghost"}
                        onClick={() => saveRow(row)}
                        disabled={saving === row.abbr}
                      >
                        <Save className="w-3.5 h-3.5 mr-1.5" />
                        {saving === row.abbr ? "Saving…" : "Save"}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Field label="LLC formation ($)" type="number" value={row.llc_formation}
                      onChange={(v) => update(row.abbr, { llc_formation: Number(v) })} />
                    <Field label="Corp formation ($)" type="number" value={row.corp_formation}
                      onChange={(v) => update(row.abbr, { corp_formation: Number(v) })} />
                    <Field label="LLC annual ($)" type="number" value={row.llc_annual}
                      onChange={(v) => update(row.abbr, { llc_annual: Number(v) })} />
                    <Field label="LLC annual label" value={row.llc_annual_label}
                      onChange={(v) => update(row.abbr, { llc_annual_label: v })} />
                    <Field label="Corp annual ($)" type="number" value={row.corp_annual}
                      onChange={(v) => update(row.abbr, { corp_annual: Number(v) })} />
                    <Field label="Corp annual label" value={row.corp_annual_label}
                      onChange={(v) => update(row.abbr, { corp_annual_label: v })} />
                    <Field label="LLC renewal ($)" type="number" value={row.llc_renewal}
                      onChange={(v) => update(row.abbr, { llc_renewal: Number(v) })} />
                    <Field label="Corp renewal ($)" type="number" value={row.corp_renewal}
                      onChange={(v) => update(row.abbr, { corp_renewal: Number(v) })} />
                    <Field label="Franchise tax" value={row.franchise_tax || ""}
                      onChange={(v) => update(row.abbr, { franchise_tax: v })} />
                    <Field label="State tax note" value={row.state_tax_note || ""}
                      onChange={(v) => update(row.abbr, { state_tax_note: v })} />
                    <Field label="Notes" value={row.notes || ""}
                      onChange={(v) => update(row.abbr, { notes: v })} />
                    <Field label="Sort order" type="number" value={row.sort_order}
                      onChange={(v) => update(row.abbr, { sort_order: Number(v) })} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
};

const Field = ({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
}) => (
  <div>
    <Label className="text-[11px] text-muted-foreground">{label}</Label>
    <Input
      type={type}
      value={value as any}
      onChange={(e) => onChange(e.target.value)}
      className="mt-1 h-9 text-sm"
    />
  </div>
);

export default AdminUSAStatePricing;

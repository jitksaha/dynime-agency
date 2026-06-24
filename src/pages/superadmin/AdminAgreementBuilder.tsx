import { useMemo, useState, useEffect } from "react";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import AgreementPreview from "@/components/admin/AgreementPreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, UserRound, Printer, ScrollText, PenLine, Trash2, Loader2, Save } from "lucide-react";
import { useHomeSections } from "@/hooks/use-home-sections";
import type { TeamMember } from "@/lib/home-sections-defaults";
import { printWithSignatureFonts } from "@/lib/print-with-fonts";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiGet, apiPost, apiDelete } from "@/lib/api";

type IssuerMode = "company" | "employee";

export default function AdminAgreementBuilder() {
  const [issuerMode, setIssuerMode] = useState<IssuerMode>("company");
  const [issuerKey, setIssuerKey] = useState("");
  const { data: home } = useHomeSections();
  const employees = useMemo<TeamMember[]>(
    () => (home?.team?.items ?? []).filter((m) => (m.status ?? "active") === "active" && !m.paused),
    [home],
  );
  const selectedEmployee = useMemo(
    () => employees.find((e) => (e.employeeKey || e.name) === issuerKey) || null,
    [employees, issuerKey],
  );

  const [title, setTitle] = useState("Service Agreement");
  const [reference, setReference] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [scope, setScope] = useState("");
  const [term, setTerm] = useState("This agreement remains in effect until all deliverables are completed and accepted.");
  const [paymentTerms, setPaymentTerms] = useState("50% advance, 50% on delivery. Invoices are payable within 14 days of issuance.");
  const [jurisdiction, setJurisdiction] = useState("Bangladesh");
  const [clauses, setClauses] = useState(
    "Confidentiality: Both parties agree to keep all shared information confidential.\nIntellectual Property: All deliverables transfer to the Client upon full payment.\nTermination: Either party may terminate this agreement with 14 days written notice.",
  );

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerCompany, setCustomerCompany] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [total, setTotal] = useState(0);
  const [itemsRaw, setItemsRaw] = useState("");

  const [pSigner, setPSigner] = useState("");
  const [pDate, setPDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [cSigner, setCSigner] = useState("");
  const [cDate, setCDate] = useState("");

  const [activeTab, setActiveTab] = useState("builder");
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);

  const items = useMemo(
    () =>
      itemsRaw
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => ({ name: l, price: 0, quantity: 1 })),
    [itemsRaw],
  );

  const issuer = useMemo(() => {
    if (issuerMode === "employee" && selectedEmployee) {
      return {
        type: "employee" as const,
        name: selectedEmployee.name,
        email: selectedEmployee.email || null,
        phone: selectedEmployee.phone || null,
        country: selectedEmployee.country || null,
      };
    }
    return { type: "company" as const };
  }, [issuerMode, selectedEmployee]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await apiGet<any[]>('/admin/agreements');
      setHistory(data || []);
    } catch (e: any) {
      toast.error(e.message || "Failed to load history");
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const saveAgreement = async (silent = false) => {
    if (!customerName) {
      if (!silent) {
        toast.error("Please enter a client name first");
      }
      return null;
    }
    setSaving(true);
    try {
      const payload = {
        title,
        reference: reference || null,
        effective_date: effectiveDate,
        client_name: customerName,
        client_email: customerEmail || null,
        client_company: customerCompany || null,
        client_phone: customerPhone || null,
        scope: scope || null,
        term: term || null,
        payment_terms: paymentTerms || null,
        jurisdiction: jurisdiction || null,
        currency: currency || "USD",
        total: total || 0,
        clauses: clauses.split("\n").map((l) => l.trim()).filter(Boolean),
        items,
        provider_signer: pSigner || null,
        provider_signed_date: pDate || null,
        client_signer: cSigner || null,
        client_signed_date: cDate || null,
      };

      const result = await apiPost<any>('/admin/agreements', payload);
      if (!silent) {
        toast.success("Agreement saved to history");
      }
      fetchHistory();
      return result;
    } catch (e: any) {
      if (!silent) {
        toast.error(e.message || "Failed to save agreement");
      }
      console.error(e);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const loadAgreement = (agreement: any) => {
    setTitle(agreement.title || "");
    setReference(agreement.reference || "");
    setEffectiveDate(agreement.effective_date || "");
    setCustomerName(agreement.client_name || "");
    setCustomerEmail(agreement.client_email || "");
    setCustomerCompany(agreement.client_company || "");
    setCustomerPhone(agreement.client_phone || "");
    setScope(agreement.scope || "");
    setTerm(agreement.term || "");
    setPaymentTerms(agreement.payment_terms || "");
    setJurisdiction(agreement.jurisdiction || "");
    setCurrency(agreement.currency || "USD");
    setTotal(Number(agreement.total || 0));

    if (Array.isArray(agreement.clauses)) {
      setClauses(agreement.clauses.join("\n"));
    } else {
      setClauses("");
    }

    if (Array.isArray(agreement.items)) {
      setItemsRaw(agreement.items.map((it: any) => it.name).join("\n"));
    } else {
      setItemsRaw("");
    }

    setPSigner(agreement.provider_signer || "");
    setPDate(agreement.provider_signed_date || "");
    setCSigner(agreement.client_signer || "");
    setCDate(agreement.client_signed_date || "");
  };

  const deleteAgreement = async (id: string) => {
    if (!confirm("Are you sure you want to delete this saved agreement?")) return;
    try {
      await apiDelete(`/admin/agreements/${id}`);
      toast.success("Agreement deleted");
      fetchHistory();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete agreement");
    }
  };

  const handlePrint = async () => {
    try {
      await saveAgreement(true);
    } catch (err) {
      console.error("Silent auto-save failed", err);
    }
    printWithSignatureFonts();
  };

  return (
    <SuperAdminLayout>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
          <ScrollText className="w-5 h-5 text-primary" /> Agreement Builder
        </h1>
        <div className="flex items-center gap-2 print:hidden">
          <Button onClick={() => saveAgreement(false)} variant="secondary" className="gap-1.5" disabled={saving || !customerName}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
          </Button>
          <Button onClick={handlePrint} variant="outline" className="gap-1.5" disabled={saving || !customerName}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />} Print / Save as PDF
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 mb-4 print:hidden">
          <TabsTrigger value="builder" className="gap-1.5">
            <ScrollText className="w-4 h-4" /> Builder
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <Save className="w-4 h-4" /> History / Saved
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="outline-none">
          <div className="grid lg:grid-cols-2 gap-5">
            {/* Form */}
            <div className="space-y-4 print:hidden">
              <section className="glass-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <Label className="text-sm font-semibold">Issue agreement as</Label>
                  <div className="inline-flex rounded-md border border-border bg-background p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setIssuerMode("company")}
                      className={`px-3 py-1.5 rounded inline-flex items-center gap-1.5 ${
                        issuerMode === "company" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" /> Company
                    </button>
                    <button
                      type="button"
                      onClick={() => setIssuerMode("employee")}
                      className={`px-3 py-1.5 rounded inline-flex items-center gap-1.5 ${
                        issuerMode === "employee" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <UserRound className="w-3.5 h-3.5" /> Employee
                    </button>
                  </div>
                </div>
                {issuerMode === "employee" && (
                  <Select value={issuerKey} onValueChange={setIssuerKey}>
                    <SelectTrigger>
                      <SelectValue placeholder={employees.length ? "Choose an employee…" : "No active employees"} />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((m) => {
                        const k = m.employeeKey || m.name;
                        return <SelectItem key={k} value={k}>{m.name}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                )}
              </section>

              <section className="glass-card p-4 grid sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <Label>Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div>
                  <Label>Reference</Label>
                  <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. AG-2026-001" />
                </div>
                <div>
                  <Label>Effective date</Label>
                  <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
                </div>
              </section>

              <section className="glass-card p-4 grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>Client name</Label>
                  <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                </div>
                <div>
                  <Label>Client email</Label>
                  <Input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
                </div>
                <div>
                  <Label>Client company</Label>
                  <Input value={customerCompany} onChange={(e) => setCustomerCompany(e.target.value)} />
                </div>
                <div>
                  <Label>Client phone</Label>
                  <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                </div>
              </section>

              <section className="glass-card p-4 space-y-3">
                <div>
                  <Label>Scope of work</Label>
                  <Textarea rows={3} value={scope} onChange={(e) => setScope(e.target.value)} />
                </div>
                <div>
                  <Label>Services (one per line)</Label>
                  <Textarea rows={3} value={itemsRaw} onChange={(e) => setItemsRaw(e.target.value)} />
                </div>
                <div>
                  <Label>Term</Label>
                  <Textarea rows={2} value={term} onChange={(e) => setTerm(e.target.value)} />
                </div>
                <div>
                  <Label>Payment terms</Label>
                  <Textarea rows={2} value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <Label>Governing law / Jurisdiction</Label>
                    <Input value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)} />
                  </div>
                  <div>
                    <Label>Currency</Label>
                    <Input value={currency} onChange={(e) => setCurrency(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Total agreed value</Label>
                  <Input type="number" min={0} step="0.01" value={total} onChange={(e) => setTotal(Number(e.target.value))} />
                </div>
                <div>
                  <Label>Additional clauses (one per line, use "Title: body")</Label>
                  <Textarea rows={5} value={clauses} onChange={(e) => setClauses(e.target.value)} />
                </div>
              </section>

              <section className="glass-card p-4 text-xs text-muted-foreground flex items-start gap-2">
                <PenLine className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span>
                  The client's first name is auto-signed in a handwriting font picked at random per
                  agreement (from 5 signature styles). The Service Provider side shows the full company
                  name and the agreement date — no signature required.
                </span>
              </section>
            </div>

            {/* Preview */}
            <div className="lg:sticky lg:top-4 self-start print:static">
              <AgreementPreview
                title={title}
                effectiveDate={effectiveDate}
                scope={scope}
                term={term}
                paymentTerms={paymentTerms}
                jurisdiction={jurisdiction}
                clauses={clauses.split("\n").map((l) => l.trim()).filter(Boolean)}
                issuer={issuer}
                customerName={customerName}
                customerEmail={customerEmail}
                customerCompany={customerCompany}
                customerPhone={customerPhone}
                items={items}
                currency={currency}
                total={total}
                referenceLabel={reference || undefined}
                providerSignerName={pSigner}
                providerSignedDate={pDate}
                clientSignerName={cSigner}
                clientSignedDate={cDate}
                onProviderSignerNameChange={setPSigner}
                onProviderSignedDateChange={setPDate}
                onClientSignerNameChange={setCSigner}
                onClientSignedDateChange={setCDate}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="outline-none">
          <div className="glass-card p-4 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-lg font-semibold">Agreement History</h2>
              <Button onClick={fetchHistory} variant="ghost" size="sm" disabled={loadingHistory}>
                {loadingHistory ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} Refresh
              </Button>
            </div>

            <div className="border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="text-left px-4 py-3">Date</th>
                      <th className="text-left px-4 py-3">Title / Ref</th>
                      <th className="text-left px-4 py-3">Client</th>
                      <th className="text-left px-4 py-3">Jurisdiction</th>
                      <th className="text-left px-4 py-3">Total</th>
                      <th className="text-right px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingHistory ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-muted-foreground">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                          Loading history...
                        </td>
                      </tr>
                    ) : history.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-muted-foreground">
                          No agreements saved yet.
                        </td>
                      </tr>
                    ) : (
                      history.map((ag) => (
                        <tr key={ag.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {new Date(ag.created_at || ag.effective_date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-foreground">{ag.title}</div>
                            {ag.reference && (
                              <div className="text-xs font-mono text-muted-foreground">{ag.reference}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground">{ag.client_name}</div>
                            {ag.client_company && (
                              <div className="text-xs text-muted-foreground">{ag.client_company}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {ag.jurisdiction || "—"}
                          </td>
                          <td className="px-4 py-3 font-medium whitespace-nowrap">
                            {ag.currency} {(ag.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                loadAgreement(ag);
                                setActiveTab("builder");
                                toast.success("Loaded agreement details into builder form");
                              }}
                            >
                              Load
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                loadAgreement(ag);
                                setTimeout(() => {
                                  printWithSignatureFonts();
                                }, 300);
                              }}
                            >
                              <Printer className="w-3.5 h-3.5 mr-1" /> Print
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteAgreement(ag.id)}
                              className="text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </SuperAdminLayout>
  );
}

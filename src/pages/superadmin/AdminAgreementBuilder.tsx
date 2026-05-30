import { useMemo, useState } from "react";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import AgreementPreview from "@/components/admin/AgreementPreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, UserRound, Printer, ScrollText, PenLine } from "lucide-react";
import { useHomeSections } from "@/hooks/use-home-sections";
import type { TeamMember } from "@/lib/home-sections-defaults";
import { printWithSignatureFonts } from "@/lib/print-with-fonts";

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

  return (
    <SuperAdminLayout>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
          <ScrollText className="w-5 h-5 text-primary" /> Agreement Builder
        </h1>
        <Button onClick={() => printWithSignatureFonts()} variant="outline" className="gap-1.5">
          <Printer className="w-4 h-4" /> Print / Save as PDF
        </Button>
      </div>

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
    </SuperAdminLayout>
  );
}

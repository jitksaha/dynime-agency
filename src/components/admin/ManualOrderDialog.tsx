import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2, FileText, Building2, UserRound, ScrollText, Eye, EyeOff, Wand2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import AgreementPreview from "@/components/admin/AgreementPreview";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useHomeSections } from "@/hooks/use-home-sections";
import type { TeamMember } from "@/lib/home-sections-defaults";

type IssuerMode = "company" | "employee";

interface LineItem {
  name: string;
  description?: string;
  price: number;
  quantity: number;
}

const STATUSES = ["pending", "confirmed", "processing", "completed", "paid", "cancelled"];
const GATEWAYS = ["bank_transfer", "bkash", "stripe", "sslcommerz", "dodopayment", "manual"];
const CURRENCIES = ["USD", "BDT", "EUR", "GBP", "INR"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (orderId: string) => void;
}

export default function ManualOrderDialog({ open, onOpenChange, onCreated }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [status, setStatus] = useState("pending");
  const [gateway, setGateway] = useState("manual");
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [included, setIncluded] = useState(""); // newline separated "Services we provide"
  const [items, setItems] = useState<LineItem[]>([
    { name: "", description: "", price: 0, quantity: 1 },
  ]);

  // Issuer / "From" on the invoice — defaults to the company, but admins can
  // switch to a specific employee for clients that only accept invoices from a
  // named person rather than from Dynime Inc..
  const [issuerMode, setIssuerMode] = useState<IssuerMode>("company");
  const [issuerEmployeeKey, setIssuerEmployeeKey] = useState<string>("");
  const { data: homeSections } = useHomeSections();
  const employees = useMemo<TeamMember[]>(() => {
    const all = homeSections?.team?.items ?? [];
    return all.filter((m) => (m.status ?? "active") === "active" && !m.paused);
  }, [homeSections]);
  const selectedEmployee = useMemo(
    () => employees.find((e) => (e.employeeKey || e.name) === issuerEmployeeKey) || null,
    [employees, issuerEmployeeKey],
  );

  // Service Agreement builder — optional companion document to the invoice.
  // When enabled, a printable agreement is rendered at /agreement/:id with the
  // same issuer (company or selected employee) as the invoice.
  const [agreementOn, setAgreementOn] = useState(false);
  const [agTitle, setAgTitle] = useState("Service Agreement");
  const [agScope, setAgScope] = useState("");
  const [agEffectiveDate, setAgEffectiveDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [agTerm, setAgTerm] = useState("This agreement remains in effect until all deliverables are completed and accepted.");
  const [agPaymentTerms, setAgPaymentTerms] = useState("50% advance, 50% on delivery. Invoices are payable within 14 days of issuance.");
  const [agJurisdiction, setAgJurisdiction] = useState("Bangladesh");
  const [agClauses, setAgClauses] = useState<string>("Confidentiality: Both parties agree to keep all shared information confidential.\nIntellectual Property: All deliverables transfer to the Client upon full payment.\nTermination: Either party may terminate this agreement with 14 days written notice.");
  const [agProviderSigner, setAgProviderSigner] = useState("");
  const [agProviderSignedDate, setAgProviderSignedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [agClientSigner, setAgClientSigner] = useState("");
  const [agClientSignedDate, setAgClientSignedDate] = useState<string>("");
  const [agReference, setAgReference] = useState<string>("");
  const [showAgPreview, setShowAgPreview] = useState(true);

  // Optional: prefill the dialog from an existing order/invoice
  const [prefillRef, setPrefillRef] = useState("");
  const [prefillLoading, setPrefillLoading] = useState(false);

  const prefillFromOrder = async () => {
    const ref = prefillRef.trim();
    if (!ref) {
      toast.error("Enter an invoice number or order ID");
      return;
    }
    setPrefillLoading(true);
    try {
      let row: Record<string, unknown> | null = null;
      const { data: r1 } = await supabase
        .from("orders")
        .select("*")
        .eq("invoice_number", ref)
        .maybeSingle();
      if (r1) row = r1 as Record<string, unknown>;
      if (!row && /^[0-9a-f-]{36}$/i.test(ref)) {
        const { data: r2 } = await supabase.from("orders").select("*").eq("id", ref).maybeSingle();
        if (r2) row = r2 as Record<string, unknown>;
      }
      if (!row) {
        toast.error("Order not found");
        return;
      }
      const addr = (row.billing_address || {}) as Record<string, unknown>;
      const brief = (row.service_brief || {}) as Record<string, unknown>;
      setCustomerName(String(row.customer_name || ""));
      setCustomerEmail(String(row.customer_email || ""));
      setPhone(String(addr.phone || ""));
      setCompany(String(addr.company || ""));
      setCurrency(String(row.currency || "USD"));
      setStatus(String(row.status || "pending"));
      setGateway(String(row.payment_gateway || "manual"));
      setDiscount(Number(row.discount_amount || 0));
      setNotes(String(row.notes || ""));
      const incl = Array.isArray(brief.included_services) ? (brief.included_services as unknown[]) : [];
      setIncluded(incl.map((s) => String(s)).join("\n"));
      const itemsArr = Array.isArray(row.items) ? (row.items as Array<Record<string, unknown>>) : [];
      if (itemsArr.length) {
        setItems(itemsArr.map((it) => ({
          name: String(it.name || ""),
          description: String(it.description || ""),
          price: Number(it.price || 0),
          quantity: Number(it.quantity || 1),
        })));
      }
      const issuer = (brief.issuer || {}) as Record<string, unknown>;
      if (issuer.type === "employee") {
        setIssuerMode("employee");
        setIssuerEmployeeKey(String(issuer.employee_key || issuer.name || ""));
      } else {
        setIssuerMode("company");
        setIssuerEmployeeKey("");
      }
      const invoiceNumber = String(row.invoice_number || (typeof row.id === "string" ? row.id.slice(0, 8).toUpperCase() : ""));
      setAgReference(invoiceNumber);
      // Auto-populate agreement scope from items if empty
      const existingAg = (brief.agreement || null) as Record<string, unknown> | null;
      if (existingAg) {
        setAgreementOn(true);
        if (existingAg.title) setAgTitle(String(existingAg.title));
        if (existingAg.scope) setAgScope(String(existingAg.scope));
        if (existingAg.effective_date) setAgEffectiveDate(String(existingAg.effective_date));
        if (existingAg.term) setAgTerm(String(existingAg.term));
        if (existingAg.payment_terms) setAgPaymentTerms(String(existingAg.payment_terms));
        if (existingAg.jurisdiction) setAgJurisdiction(String(existingAg.jurisdiction));
        if (Array.isArray(existingAg.clauses)) setAgClauses((existingAg.clauses as unknown[]).map(String).join("\n"));
        const sigs = (existingAg.signatures || {}) as Record<string, Record<string, unknown>>;
        if (sigs.provider?.signer_name) setAgProviderSigner(String(sigs.provider.signer_name));
        if (sigs.provider?.signed_date) setAgProviderSignedDate(String(sigs.provider.signed_date));
        if (sigs.client?.signer_name) setAgClientSigner(String(sigs.client.signer_name));
        if (sigs.client?.signed_date) setAgClientSignedDate(String(sigs.client.signed_date));
      } else if (itemsArr.length && !agScope.trim()) {
        setAgScope(
          `Provision of the following services: ${itemsArr.map((it) => String(it.name || "")).filter(Boolean).join(", ")}.`,
        );
      }
      toast.success(`Prefilled from ${invoiceNumber || "order"}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to prefill");
    } finally {
      setPrefillLoading(false);
    }
  };

  const reset = () => {
    setCustomerName(""); setCustomerEmail(""); setPhone(""); setCompany("");
    setCurrency("USD"); setStatus("pending"); setGateway("manual");
    setDiscount(0); setNotes(""); setIncluded("");
    setIssuerMode("company"); setIssuerEmployeeKey("");
    setItems([{ name: "", description: "", price: 0, quantity: 1 }]);
    setAgreementOn(false);
    setAgTitle("Service Agreement");
    setAgScope("");
    setAgEffectiveDate(new Date().toISOString().slice(0, 10));
    setAgTerm("This agreement remains in effect until all deliverables are completed and accepted.");
    setAgPaymentTerms("50% advance, 50% on delivery. Invoices are payable within 14 days of issuance.");
    setAgJurisdiction("Bangladesh");
    setAgClauses("Confidentiality: Both parties agree to keep all shared information confidential.\nIntellectual Property: All deliverables transfer to the Client upon full payment.\nTermination: Either party may terminate this agreement with 14 days written notice.");
    setAgProviderSigner("");
    setAgProviderSignedDate(new Date().toISOString().slice(0, 10));
    setAgClientSigner("");
    setAgClientSignedDate("");
    setAgReference("");
    setPrefillRef("");
  };

  const updateItem = (idx: number, patch: Partial<LineItem>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };
  const addItem = () => setItems((p) => [...p, { name: "", description: "", price: 0, quantity: 1 }]);
  const removeItem = (idx: number) => setItems((p) => p.filter((_, i) => i !== idx));

  const subtotal = items.reduce((s, it) => s + Number(it.price || 0) * Number(it.quantity || 0), 0);
  const total = Math.max(0, subtotal - Number(discount || 0));

  const submit = async () => {
    const cleanItems = items
      .map((it) => ({
        ...it,
        name: it.name.trim(),
        price: Number(it.price) || 0,
        quantity: Number(it.quantity) || 1,
      }))
      .filter((it) => it.name.length > 0);

    if (!customerEmail.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(customerEmail)) {
      toast.error("Valid customer email is required");
      return;
    }
    if (cleanItems.length === 0) {
      toast.error("Add at least one item");
      return;
    }

    const includedServices = included
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const billing_address: Record<string, unknown> = {};
    if (phone) billing_address.phone = phone;
    if (company) billing_address.company = company;

    const service_brief: Record<string, unknown> = {
      manual_invoice: true,
    };
    if (includedServices.length) service_brief.included_services = includedServices;

    if (issuerMode === "employee") {
      if (!selectedEmployee) {
        toast.error("Pick an employee to issue this invoice under");
        return;
      }
      service_brief.issuer = {
        type: "employee",
        name: selectedEmployee.name,
        email: selectedEmployee.email || null,
        phone: selectedEmployee.phone || null,
        country: selectedEmployee.country || null,
        employee_key: selectedEmployee.employeeKey || selectedEmployee.name,
      };
    } else {
      service_brief.issuer = { type: "company" };
    }

    if (agreementOn) {
      const clauseList = agClauses
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      service_brief.agreement = {
        include: true,
        title: agTitle.trim() || "Service Agreement",
        scope: agScope.trim() || null,
        effective_date: agEffectiveDate || null,
        term: agTerm.trim() || null,
        payment_terms: agPaymentTerms.trim() || null,
        jurisdiction: agJurisdiction.trim() || null,
        clauses: clauseList,
        signatures: {
          provider: {
            signer_name: agProviderSigner.trim() || null,
            signed_date: agProviderSignedDate || null,
          },
          client: {
            signer_name: agClientSigner.trim() || null,
            signed_date: agClientSignedDate || null,
          },
        },
      };
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .insert([{
          customer_name: customerName.trim() || null,
          customer_email: customerEmail.trim(),
          items: cleanItems,
          currency,
          subtotal,
          discount_amount: Number(discount) || 0,
          total,
          status,
          payment_gateway: gateway,
          notes: notes.trim() || null,
          billing_address: billing_address as never,
          service_brief: service_brief as never,
        }])
        .select("id, invoice_number")
        .single();

      if (error) throw error;
      toast.success(`Invoice ${data?.invoice_number || "created"}`);
      reset();
      onOpenChange(false);
      if (data?.id) onCreated?.(data.id);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create invoice");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!submitting) onOpenChange(v); }}>
      <DialogContent className={`${agreementOn && showAgPreview ? "max-w-6xl" : "max-w-3xl"} max-h-[90vh] overflow-y-auto transition-[max-width] duration-200`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Create manual invoice
          </DialogTitle>
          <DialogDescription>
            Manually create an order/invoice for a customer. They can view & pay it from the invoice link.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Optional: prefill from an existing order/invoice */}
          <section className="rounded-lg border border-dashed border-border bg-secondary/20 p-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5 text-primary" /> Prefill from existing order
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-normal ml-1">optional</span>
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Auto-fill customer, items, totals and the agreement reference from a previous invoice. Leave blank to start fresh.
                </p>
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              <Input
                value={prefillRef}
                onChange={(e) => setPrefillRef(e.target.value)}
                placeholder="Invoice number or order ID (e.g. INV-2024-0042)"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); prefillFromOrder(); } }}
                disabled={prefillLoading}
              />
              <Button type="button" variant="outline" onClick={prefillFromOrder} disabled={prefillLoading || !prefillRef.trim()}>
                {prefillLoading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Wand2 className="w-4 h-4 mr-1.5" />}
                Prefill
              </Button>
            </div>
          </section>

          {/* Customer */}
          <section className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Customer name</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Jane Doe" />
            </div>
            <div>
              <Label>Customer email *</Label>
              <Input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="jane@example.com" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label>Company</Label>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
          </section>

          {/* Settings */}
          <section className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment method</Label>
              <Select value={gateway} onValueChange={setGateway}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GATEWAYS.map((g) => <SelectItem key={g} value={g} className="capitalize">{g.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </section>

          {/* Issuer ("From" on the invoice) */}
          <section className="rounded-lg border border-border bg-secondary/30 p-3 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <Label className="text-sm font-semibold">Issue invoice as</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Default is your company. Switch to an employee for clients that only accept invoices in a specific person's name.
                </p>
              </div>
              <div className="inline-flex rounded-md border border-border bg-background p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setIssuerMode("company")}
                  className={`px-3 py-1.5 rounded inline-flex items-center gap-1.5 transition-colors ${
                    issuerMode === "company" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" /> Company
                </button>
                <button
                  type="button"
                  onClick={() => setIssuerMode("employee")}
                  className={`px-3 py-1.5 rounded inline-flex items-center gap-1.5 transition-colors ${
                    issuerMode === "employee" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <UserRound className="w-3.5 h-3.5" /> Employee
                </button>
              </div>
            </div>

            {issuerMode === "employee" && (
              <div className="space-y-2">
                <Select value={issuerEmployeeKey} onValueChange={setIssuerEmployeeKey}>
                  <SelectTrigger>
                    <SelectValue placeholder={employees.length ? "Choose an employee…" : "No active employees found"} />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((m) => {
                      const k = m.employeeKey || m.name;
                      return (
                        <SelectItem key={k} value={k}>
                          {m.name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {selectedEmployee && (
                  <div className="text-xs text-muted-foreground bg-background border border-border rounded p-2 space-y-0.5">
                    <p>
                      Invoice will show <span className="font-semibold text-foreground">{selectedEmployee.name}</span> in the “From” section instead of Dynime Inc..
                    </p>
                    {selectedEmployee.email && <p>Contact: {selectedEmployee.email}</p>}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Items */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-semibold">Line items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add item
              </Button>
            </div>
            <div className="space-y-3">
              {items.map((it, i) => (
                <div key={i} className="border border-border rounded-lg p-3 space-y-2">
                  <div className="grid grid-cols-12 gap-2">
                    <Input
                      className="col-span-12 sm:col-span-6"
                      placeholder="Item name"
                      value={it.name}
                      onChange={(e) => updateItem(i, { name: e.target.value })}
                    />
                    <Input
                      className="col-span-4 sm:col-span-2"
                      type="number" min={1}
                      placeholder="Qty"
                      value={it.quantity}
                      onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })}
                    />
                    <Input
                      className="col-span-6 sm:col-span-3"
                      type="number" min={0} step="0.01"
                      placeholder="Unit price"
                      value={it.price}
                      onChange={(e) => updateItem(i, { price: Number(e.target.value) })}
                    />
                    <Button
                      type="button" variant="ghost" size="icon"
                      className="col-span-2 sm:col-span-1 text-destructive"
                      onClick={() => removeItem(i)}
                      disabled={items.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Optional description (shown on invoice)"
                    value={it.description}
                    rows={2}
                    onChange={(e) => updateItem(i, { description: e.target.value })}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Services we provide */}
          <section>
            <Label className="text-sm font-semibold">What's included / Services we provide</Label>
            <p className="text-xs text-muted-foreground mb-1.5">
              One per line. These appear on the invoice as a checklist of deliverables.
            </p>
            <Textarea
              rows={5}
              value={included}
              onChange={(e) => setIncluded(e.target.value)}
              placeholder={"Domain registration\nLanding page design\n3 rounds of revisions\n30 days of support"}
            />
          </section>

          {/* Service Agreement builder */}
          <section className="rounded-lg border border-border bg-secondary/30 p-3 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-2">
                <ScrollText className="w-4 h-4 mt-0.5 text-primary" />
                <div>
                  <Label className="text-sm font-semibold">Attach service agreement</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Generates a printable agreement at <span className="font-mono">/agreement/&lt;invoice&gt;</span> using the same issuer (company or selected employee) as the invoice.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {agreementOn && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => setShowAgPreview((v) => !v)}
                  >
                    {showAgPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {showAgPreview ? "Hide preview" : "Show preview"}
                  </Button>
                )}
                <Switch checked={agreementOn} onCheckedChange={setAgreementOn} />
              </div>
            </div>

            {agreementOn && (
              <div className={showAgPreview ? "grid lg:grid-cols-2 gap-4" : ""}>
                <div className="space-y-3">
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <Label>Agreement title</Label>
                      <Input value={agTitle} onChange={(e) => setAgTitle(e.target.value)} placeholder="Service Agreement" />
                    </div>
                    <div>
                      <Label>Effective date</Label>
                      <Input type="date" value={agEffectiveDate} onChange={(e) => setAgEffectiveDate(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label>Scope of work</Label>
                    <Textarea
                      rows={3}
                      value={agScope}
                      onChange={(e) => setAgScope(e.target.value)}
                      placeholder="Describe the services covered by this agreement (e.g. design and build a 5-page marketing website, including hosting setup and 30 days of post-launch support)."
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label>Term / duration</Label>
                      <Textarea rows={3} value={agTerm} onChange={(e) => setAgTerm(e.target.value)} />
                    </div>
                    <div>
                      <Label>Payment terms</Label>
                      <Textarea rows={3} value={agPaymentTerms} onChange={(e) => setAgPaymentTerms(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label>Governing jurisdiction</Label>
                    <Input value={agJurisdiction} onChange={(e) => setAgJurisdiction(e.target.value)} placeholder="e.g. Bangladesh" />
                  </div>
                  <div>
                    <Label>Additional clauses</Label>
                    <p className="text-xs text-muted-foreground mb-1.5">One clause per line. Each line becomes a numbered clause in the agreement.</p>
                    <Textarea
                      rows={5}
                      value={agClauses}
                      onChange={(e) => setAgClauses(e.target.value)}
                    />
                  </div>
                </div>

                {showAgPreview && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Live preview</Label>
                      <span className="text-[10px] text-muted-foreground">PDF / print layout</span>
                    </div>
                    <div className="rounded-lg border border-border bg-background p-2 max-h-[70vh] overflow-y-auto">
                      <AgreementPreview
                        title={agTitle}
                        effectiveDate={agEffectiveDate}
                        scope={agScope}
                        term={agTerm}
                        paymentTerms={agPaymentTerms}
                        jurisdiction={agJurisdiction}
                        clauses={agClauses.split("\n").map((l) => l.trim()).filter(Boolean)}
                        issuer={
                          issuerMode === "employee" && selectedEmployee
                            ? {
                                type: "employee",
                                name: selectedEmployee.name,
                                email: selectedEmployee.email,
                                phone: selectedEmployee.phone,
                                country: selectedEmployee.country,
                              }
                            : { type: "company" }
                        }
                        customerName={customerName}
                        customerEmail={customerEmail}
                        customerCompany={company}
                        customerPhone={phone}
                        items={items}
                        referenceLabel={agReference || undefined}
                        currency={currency}
                        total={total}
                        providerSignerName={agProviderSigner}
                        providerSignedDate={agProviderSignedDate}
                        clientSignerName={agClientSigner}
                        clientSignedDate={agClientSignedDate}
                        onProviderSignerNameChange={setAgProviderSigner}
                        onProviderSignedDateChange={setAgProviderSignedDate}
                        onClientSignerNameChange={setAgClientSigner}
                        onClientSignedDateChange={setAgClientSignedDate}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Totals & notes */}
          <section className="grid sm:grid-cols-2 gap-4 items-start">
            <div>
              <Label>Internal / customer notes</Label>
              <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Visible on the invoice" />
            </div>
            <div className="space-y-2 bg-secondary/30 border border-border rounded-lg p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums">{subtotal.toFixed(2)} {currency}</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-muted-foreground">Discount</span>
                <Input
                  type="number" min={0} step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="h-8 w-28 text-right tabular-nums"
                />
              </div>
              <div className="flex justify-between font-bold text-base border-t border-border pt-2">
                <span>Total</span>
                <span className="tabular-nums">{total.toFixed(2)} {currency}</span>
              </div>
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <FileText className="w-4 h-4 mr-1.5" />}
            Create invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

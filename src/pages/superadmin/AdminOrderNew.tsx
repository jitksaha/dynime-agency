import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link, useParams, useSearchParams, UNSAFE_NavigationContext } from "react-router-dom";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2, FileText, ArrowLeft, Building2, UserRound, Eye, EyeOff, CheckCircle2, Mail, Phone, MapPin, Globe } from "lucide-react";
import ServiceItemPicker from "@/components/admin/ServiceItemPicker";
import { toast } from "sonner";
import { db } from "@/integrations/db/client";
import { useHomeSections } from "@/hooks/use-home-sections";
import type { TeamMember } from "@/lib/home-sections-defaults";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import { cn } from "@/lib/utils";
import SiteLogo from "@/components/shared/SiteLogo";

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
const LEAVE_CONFIRM_MESSAGE = "You have unsaved changes. Leave this page and discard them?";

interface Props { mode?: "new" | "edit" }

export default function AdminOrderNew({ mode = "new" }: Props) {
  const navigate = useNavigate();
  const { navigator } = useContext(UNSAFE_NavigationContext);
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEdit = mode === "edit";

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [status, setStatus] = useState("pending");
  const [gateway, setGateway] = useState("manual");
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [included, setIncluded] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split("T")[0];
  });
  const [items, setItems] = useState<LineItem[]>([
    { name: "", description: "", price: 0, quantity: 1 },
  ]);

  useEffect(() => {
    if (isEdit) return;
    const name = searchParams.get("name");
    const email = searchParams.get("email");
    const ph = searchParams.get("phone");
    const co = searchParams.get("company");
    if (name) setCustomerName(name);
    if (email) setCustomerEmail(email);
    if (ph) setPhone(ph);
    if (co) setCompany(co);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Issuer: company (default) or a specific employee
  const [issuerMode, setIssuerMode] = useState<IssuerMode>("company");
  const [issuerEmployeeKey, setIssuerEmployeeKey] = useState("");
  const { data: homeSections } = useHomeSections();
  const employees = useMemo<TeamMember[]>(
    () => (homeSections?.team?.items ?? []).filter((m) => (m.status ?? "active") === "active" && !m.paused),
    [homeSections],
  );
  const selectedEmployee = useMemo(
    () => employees.find((e) => (e.employeeKey || e.name) === issuerEmployeeKey) || null,
    [employees, issuerEmployeeKey],
  );

  // --- account auto-link by email and/or phone ---
  type LookupHit = { user_id: string; name: string | null; email: string | null } | null;
  const [emailMatch, setEmailMatch] = useState<LookupHit>(null);
  const [phoneMatch, setPhoneMatch] = useState<LookupHit>(null);
  const [emailLookupBusy, setEmailLookupBusy] = useState(false);
  const [phoneLookupBusy, setPhoneLookupBusy] = useState(false);
  const linkedUserId = emailMatch?.user_id ?? phoneMatch?.user_id ?? null;
  const linkedName = emailMatch?.name ?? phoneMatch?.name ?? null;
  const linkedSource: "email" | "phone" | null =
    emailMatch ? "email" : phoneMatch ? "phone" : null;

  useEffect(() => {
    const email = customerEmail.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setEmailMatch(null); setEmailLookupBusy(false); return;
    }
    let cancelled = false;
    setEmailLookupBusy(true);
    const t = setTimeout(async () => {
      try {
        const data = await apiGet<any>(`/users/by-email/${encodeURIComponent(email)}`);
        if (cancelled) return;
        setEmailMatch(data?.id ? { user_id: data.id, name: data.full_name || null, email: data.email || null } : null);
      } catch (err) {
        if (cancelled) return;
        setEmailMatch(null);
      } finally {
        if (!cancelled) setEmailLookupBusy(false);
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [customerEmail]);

  useEffect(() => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 6) {
      setPhoneMatch(null); setPhoneLookupBusy(false); return;
    }
    let cancelled = false;
    setPhoneLookupBusy(true);
    const t = setTimeout(async () => {
      try {
        const data = await apiGet<any>(`/users/by-phone/${encodeURIComponent(phone)}`);
        if (cancelled) return;
        setPhoneMatch(data?.user_id ? { user_id: data.user_id, name: data.name || null, email: data.email || null } : null);
      } catch (err) {
        if (cancelled) return;
        setPhoneMatch(null);
      } finally {
        if (!cancelled) setPhoneLookupBusy(false);
      }
    }, 500);
    return () => { cancelled = true; clearTimeout(t); };
  }, [phone]);

  // (templates feature removed)

  // --- unsaved-changes guard ---
  const baselineRef = useRef<string | null>(null);
  const skipGuardRef = useRef(false);
  const currentHistoryIndexRef = useRef<number | null>(typeof window === "undefined" ? null : window.history.state?.idx ?? null);
  const snapshot = useMemo(
    () => JSON.stringify({
      customerName, customerEmail, phone, company, currency, status,
      gateway, discount, notes, included, items, issuerMode, issuerEmployeeKey, referralCode, dueDate,
    }),
    [customerName, customerEmail, phone, company, currency, status, gateway, discount, notes, included, items, issuerMode, issuerEmployeeKey, referralCode, dueDate]
  );
  // --- autosave (new mode only) ---
  const AUTOSAVE_KEY = "admin:manual-invoice:draft:v1";
  const restoredRef = useRef(false);
  const [autosavedAt, setAutosavedAt] = useState<Date | null>(null);

  // Restore draft on first mount in new mode
  useEffect(() => {
    if (isEdit || restoredRef.current) return;
    restoredRef.current = true;
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.customerName) setCustomerName(d.customerName);
      if (d.customerEmail) setCustomerEmail(d.customerEmail);
      if (d.phone) setPhone(d.phone);
      if (d.company) setCompany(d.company);
      if (d.currency) setCurrency(d.currency);
      if (d.status) setStatus(d.status);
      if (d.gateway) setGateway(d.gateway);
      if (typeof d.discount === "number") setDiscount(d.discount);
      if (typeof d.notes === "string") setNotes(d.notes);
      if (typeof d.included === "string") setIncluded(d.included);
      if (Array.isArray(d.items) && d.items.length) setItems(d.items);
      if (typeof d.referralCode === "string") setReferralCode(d.referralCode);
      if (typeof d.dueDate === "string") setDueDate(d.dueDate);
      if (d.savedAt) setAutosavedAt(new Date(d.savedAt));
      toast.info("Restored unsaved draft");
    } catch { /* ignore */ }
  }, [isEdit]);

  // For "new" mode, set baseline immediately. For "edit", baseline is set after load.
  useEffect(() => {
    if (!isEdit && baselineRef.current === null) baselineRef.current = snapshot;
  }, [isEdit, snapshot]);

  // Persist draft (new mode) whenever the form changes — debounced.
  useEffect(() => {
    if (isEdit || !restoredRef.current) return;
    const t = setTimeout(() => {
      try {
        const payload = JSON.parse(snapshot);
        payload.savedAt = new Date().toISOString();
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(payload));
        setAutosavedAt(new Date());
      } catch { /* ignore */ }
    }, 600);
    return () => clearTimeout(t);
  }, [snapshot, isEdit]);

  const clearDraft = () => {
    try { localStorage.removeItem(AUTOSAVE_KEY); } catch { /* ignore */ }
    setAutosavedAt(null);
  };

  const discardDraft = () => {
    if (!window.confirm("Discard the saved draft and clear this form?")) return;
    clearDraft();
    setCustomerName(""); setCustomerEmail(""); setPhone(""); setCompany("");
    setCurrency("USD"); setStatus("pending"); setGateway("manual");
    setDiscount(0); setNotes(""); setIncluded(""); setReferralCode("");
    const defaultD = new Date();
    defaultD.setDate(defaultD.getDate() + 14);
    setDueDate(defaultD.toISOString().split("T")[0]);
    setItems([{ name: "", description: "", price: 0, quantity: 1 }]);
    skipGuardRef.current = true;
    requestAnimationFrame(() => { baselineRef.current = null; skipGuardRef.current = false; });
    toast.success("Draft discarded");
  };

  const isDirty = baselineRef.current !== null && baselineRef.current !== snapshot;

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty || skipGuardRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const confirmLeave = () => {
    if (!isDirty || skipGuardRef.current) return true;
    const confirmed = window.confirm(LEAVE_CONFIRM_MESSAGE);
    if (confirmed) {
      skipGuardRef.current = true;
      setTimeout(() => { skipGuardRef.current = false; }, 100);
    }
    return confirmed;
  };

  useEffect(() => {
    const guardedNavigator = navigator as typeof navigator & {
      push: typeof navigator.push;
      replace: typeof navigator.replace;
      go: typeof navigator.go;
    };
    const originalPush = guardedNavigator.push.bind(guardedNavigator);
    const originalReplace = guardedNavigator.replace.bind(guardedNavigator);
    const originalGo = guardedNavigator.go.bind(guardedNavigator);
    guardedNavigator.push = ((...args: Parameters<typeof guardedNavigator.push>) => {
      if (confirmLeave()) originalPush(...args);
    }) as typeof guardedNavigator.push;
    guardedNavigator.replace = ((...args: Parameters<typeof guardedNavigator.replace>) => {
      if (confirmLeave()) originalReplace(...args);
    }) as typeof guardedNavigator.replace;
    guardedNavigator.go = ((...args: Parameters<typeof guardedNavigator.go>) => {
      if (confirmLeave()) originalGo(...args);
    }) as typeof guardedNavigator.go;

    return () => {
      guardedNavigator.push = originalPush as typeof guardedNavigator.push;
      guardedNavigator.replace = originalReplace as typeof guardedNavigator.replace;
      guardedNavigator.go = originalGo as typeof guardedNavigator.go;
    };
  }, [isDirty, navigator]);

  useEffect(() => {
    currentHistoryIndexRef.current = window.history.state?.idx ?? currentHistoryIndexRef.current;
    const onPopState = (event: PopStateEvent) => {
      const nextIndex = event.state?.idx ?? null;
      const currentIndex = currentHistoryIndexRef.current;
      const delta = typeof nextIndex === "number" && typeof currentIndex === "number" ? nextIndex - currentIndex : null;

      if (!isDirty || skipGuardRef.current) {
        currentHistoryIndexRef.current = nextIndex;
        return;
      }

      if (window.confirm(LEAVE_CONFIRM_MESSAGE)) {
        currentHistoryIndexRef.current = nextIndex;
        skipGuardRef.current = true;
        setTimeout(() => { skipGuardRef.current = false; }, 100);
        return;
      }

      event.stopImmediatePropagation();
      event.preventDefault();
      if (delta !== null && delta !== 0) {
        skipGuardRef.current = true;
        window.history.go(-delta);
        setTimeout(() => { skipGuardRef.current = false; }, 100);
      }
    };
    window.addEventListener("popstate", onPopState, true);
    return () => window.removeEventListener("popstate", onPopState, true);
  }, [isDirty]);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (!isDirty || skipGuardRef.current || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target || anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      if (!window.confirm(LEAVE_CONFIRM_MESSAGE)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      skipGuardRef.current = true;
      setTimeout(() => { skipGuardRef.current = false; }, 100);
    };
    document.addEventListener("click", onDocumentClick, true);
    return () => document.removeEventListener("click", onDocumentClick, true);
  }, [isDirty]);

  const guardedNavigate = (to: string) => {
    if (!confirmLeave()) return;
    navigate(to);
  };
  const handleBackClick = (e: React.MouseEvent) => {
    if (!confirmLeave()) e.preventDefault();
  };

  useEffect(() => {
    if (!isEdit || !id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await apiGet<any>(`/orders/${id}`);
        if (cancelled) return;
        if (!data) {
          toast.error("Failed to load order");
          setLoading(false);
          return;
        }
        const o: any = data;
        setInvoiceNumber(o.invoice_number || null);
        setCustomerName(o.customer_name || "");
        setCustomerEmail(o.customer_email || "");
        const ba = o.billing_address || {};
        setPhone(ba.phone || "");
        setCompany(ba.company || "");
        setCurrency(o.currency || "USD");
        setStatus(o.status || "pending");
        setGateway(o.payment_gateway || "manual");
        setDiscount(Number(o.discount_amount) || 0);
        setNotes(o.notes || "");
        const sb = (o.service_brief || {}) as any;
        const inc = Array.isArray(sb.included_services) ? sb.included_services : [];
        setIncluded(inc.join("\n"));
        if (sb.due_date) {
          setDueDate(sb.due_date);
        } else {
          const d = o.created_at ? new Date(o.created_at) : new Date();
          d.setDate(d.getDate() + 14);
          setDueDate(d.toISOString().split("T")[0]);
        }
        const sbIssuer = (sb.issuer || {}) as any;
        if (sbIssuer.type === "employee") {
          setIssuerMode("employee");
          setIssuerEmployeeKey(String(sbIssuer.employee_key || sbIssuer.name || ""));
        } else {
          setIssuerMode("company");
          setIssuerEmployeeKey("");
        }
        setReferralCode((o.referral_code as string) || "");
        const its: LineItem[] = Array.isArray(o.items) && o.items.length
          ? o.items.map((it: any) => ({
              name: it.name || "",
              description: it.description || "",
              price: Number(it.price) || 0,
              quantity: Number(it.quantity) || 1,
            }))
          : [{ name: "", description: "", price: 0, quantity: 1 }];
        setItems(its);
        setLoading(false);
        requestAnimationFrame(() => {
          baselineRef.current = JSON.stringify({
            customerName: o.customer_name || "",
            customerEmail: o.customer_email || "",
            phone: ba.phone || "",
            company: ba.company || "",
            currency: o.currency || "USD",
            status: o.status || "pending",
            gateway: o.payment_gateway || "manual",
            discount: Number(o.discount_amount) || 0,
            notes: o.notes || "",
            included: inc.join("\n"),
            items: its,
            issuerMode: sbIssuer.type === "employee" ? "employee" : "company",
            issuerEmployeeKey: sbIssuer.type === "employee" ? String(sbIssuer.employee_key || sbIssuer.name || "") : "",
            referralCode: (o.referral_code as string) || "",
            dueDate: sb.due_date || (() => {
              const d = o.created_at ? new Date(o.created_at) : new Date();
              d.setDate(d.getDate() + 14);
              return d.toISOString().split("T")[0];
            })(),
          });
        });
      } catch (err) {
        if (!cancelled) {
          toast.error("Failed to load order");
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [id, isEdit]);

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

    setSubmitting(true);
    try {
      if (isEdit && id) {
        // Preserve existing billing_address / service_brief keys by fetching via NestJS
        const existing = await apiGet<any>(`/orders/${id}`);
        const existingBA = existing?.billing_address || {};
        const existingSB = existing?.service_brief || {};
        const billing_address = { ...existingBA, phone: phone || null, company: company || null };
        const service_brief: Record<string, unknown> = {
          ...existingSB,
          manual_invoice: true,
          included_services: includedServices,
          due_date: dueDate || null,
        };
        if (issuerMode === "employee") {
          if (!selectedEmployee) { toast.error("Pick an employee to issue this invoice under"); setSubmitting(false); return; }
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

        await apiPatch<any>(`/orders/${id}`, {
          customer_name: customerName.trim() || null,
          customer_email: customerEmail.trim(),
          user_id: linkedUserId || null, // re-link if email changed
          items: cleanItems,
          currency,
          subtotal,
          discount_amount: Number(discount) || 0,
          total,
          status,
          payment_gateway: gateway,
          notes: notes.trim() || null,
          billing_address,
          service_brief,
          referral_code: referralCode.trim().toUpperCase() || null,
        });
        toast.success("Invoice updated");
        skipGuardRef.current = true;
        baselineRef.current = snapshot;
        navigate(`/superadmin/orders/${id}`);
      } else {
        const billing_address: Record<string, unknown> = {};
        if (phone) billing_address.phone = phone;
        if (company) billing_address.company = company;
        const service_brief: Record<string, unknown> = { manual_invoice: true, due_date: dueDate || null };
        if (includedServices.length) service_brief.included_services = includedServices;
        if (issuerMode === "employee") {
          if (!selectedEmployee) { toast.error("Pick an employee to issue this invoice under"); setSubmitting(false); return; }
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

        const data = await apiPost<any>("/orders", {
          customer_name: customerName.trim() || null,
          customer_email: customerEmail.trim(),
          user_id: linkedUserId || null,
          items: cleanItems,
          currency,
          subtotal,
          discount_amount: Number(discount) || 0,
          total,
          status,
          payment_gateway: gateway,
          notes: notes.trim() || null,
          billing_address,
          service_brief,
          referral_code: referralCode.trim().toUpperCase() || null,
        });

        toast.success(`Invoice ${data?.invoice_number || "created"}`);
        skipGuardRef.current = true;
        baselineRef.current = snapshot;
        clearDraft();
        if (data?.id) navigate(`/superadmin/orders/${data.id}`);
        else navigate("/superadmin/orders");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : isEdit ? "Failed to update invoice" : "Failed to create invoice");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SuperAdminLayout>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading invoice…
        </div>
      </SuperAdminLayout>
    );
  }

  const backHref = isEdit && id ? `/superadmin/orders/${id}` : "/superadmin/orders";
  const titleText = isEdit ? `Edit invoice${invoiceNumber ? ` ${invoiceNumber}` : ""}` : "Create manual invoice";
  const ctaText = isEdit ? "Save changes" : "Create invoice";

  const [showPreview, setShowPreview] = useState(true);

  // Live preview computed values
  const previewIssuerIsEmployee = issuerMode === "employee" && !!selectedEmployee;
  const previewIssuerName = previewIssuerIsEmployee ? (selectedEmployee?.name ?? "") : "Dynime Inc.";
  const previewIssuerEmail = previewIssuerIsEmployee ? (selectedEmployee?.email ?? "") : "support@dynime.com";
  const previewIssuerRole = previewIssuerIsEmployee ? "" : "Web · Marketing · Software · Consultancy";
  const previewDueDate = dueDate ? new Date(dueDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—";
  const previewFmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);

  return (
    <SuperAdminLayout>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon">
            <Link to={backHref} aria-label="Back" onClick={handleBackClick}><ArrowLeft className="w-4 h-4" /></Link>
          </Button>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> {titleText}
          </h1>
        </div>
        <div className="flex gap-2 items-center">
          {!isEdit && autosavedAt && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Draft saved {autosavedAt.toLocaleTimeString()}
            </span>
          )}
          {!isEdit && autosavedAt && (
            <Button variant="ghost" size="sm" onClick={discardDraft} disabled={submitting}>Discard draft</Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowPreview(v => !v)} className="gap-1.5 hidden sm:flex">
            {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showPreview ? "Hide preview" : "Show preview"}
          </Button>
          <Button variant="outline" onClick={() => guardedNavigate(backHref)} disabled={submitting}>Cancel</Button>

          <Button onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <FileText className="w-4 h-4 mr-1.5" />}
            {ctaText}
          </Button>
        </div>
      </div>

      <div className={cn("gap-6", showPreview ? "grid xl:grid-cols-2" : "max-w-4xl")}>
        {/* LIVE PREVIEW PANEL */}
        {showPreview && (
          <div className="order-last xl:order-first">
            <div className="sticky top-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" /> Live Preview
              </p>
              <div className="bg-white dark:bg-card border border-border rounded-xl shadow-md overflow-hidden text-sm">
                {/* ribbon */}
                <div className="h-1 w-full bg-primary" />

                {/* header */}
                <div className="p-5 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="font-heading text-2xl font-bold">Invoice</h2>
                    {invoiceNumber && <p className="text-xs text-muted-foreground font-mono mt-0.5">{invoiceNumber}</p>}
                    <p className="text-xs text-muted-foreground mt-1">Due {previewDueDate}</p>
                  </div>
                  <div className="text-right">
                    {previewIssuerIsEmployee ? (
                      <div className="flex items-center justify-end gap-2 mb-1">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs">
                          {previewIssuerName.split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold">{previewIssuerName}</span>
                      </div>
                    ) : (
                      <SiteLogo variant="light" className="h-7 w-auto ml-auto mb-1" />
                    )}
                    <p className="text-xs text-muted-foreground">{previewIssuerName}</p>
                    {previewIssuerEmail && <p className="text-xs text-muted-foreground">{previewIssuerEmail}</p>}
                  </div>
                </div>

                {/* meta */}
                <div className="px-5 pb-4 grid grid-cols-2 gap-x-6 gap-y-1 text-xs border-t border-border pt-3">
                  <div className="flex justify-between"><span className="text-muted-foreground">Currency</span><span className="font-medium">{currency}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="font-medium capitalize">{status}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><span className="font-medium capitalize">{gateway.replace("_", " ")}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Due date</span><span className="font-medium">{previewDueDate}</span></div>
                </div>

                {/* from / billed to */}
                <div className="px-5 py-4 grid grid-cols-2 gap-6 border-t border-border">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 flex items-center gap-1">
                      {previewIssuerIsEmployee ? <UserRound className="w-3 h-3" /> : <Building2 className="w-3 h-3" />} From
                    </p>
                    <p className="font-semibold text-xs">{previewIssuerName}</p>
                    {previewIssuerRole && <p className="text-[11px] text-muted-foreground">{previewIssuerRole}</p>}
                    {previewIssuerEmail && (
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Mail className="w-2.5 h-2.5" /> {previewIssuerEmail}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> Billed to
                    </p>
                    <p className="font-semibold text-xs">{customerName || "Customer"}</p>
                    {company && <p className="text-[11px]">{company}</p>}
                    <p className="text-[11px] text-muted-foreground">{customerEmail || "email@example.com"}</p>
                    {phone && <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Phone className="w-2.5 h-2.5" />{phone}</p>}
                  </div>
                </div>

                {/* amount due */}
                <div className="px-5 py-4 border-t border-border bg-primary/5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Amount due</p>
                  <p className="font-heading text-3xl font-bold">{previewFmt(total)}</p>
                  <p className="text-xs text-muted-foreground">due {previewDueDate}</p>
                </div>

                {/* items */}
                <div className="px-5 py-4 border-t border-border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b-2 border-foreground/80 text-left">
                        <th className="py-1.5 pr-2 font-semibold">Description</th>
                        <th className="py-1.5 px-2 font-semibold text-center w-10">Qty</th>
                        <th className="py-1.5 px-2 font-semibold text-right w-20">Price</th>
                        <th className="py-1.5 pl-2 font-semibold text-right w-20">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.filter(it => it.name.trim()).map((it, i) => (
                        <tr key={i} className="border-b border-border/60">
                          <td className="py-2 pr-2">
                            <p className="font-medium">{it.name}</p>
                            {it.description && <p className="text-[10px] text-muted-foreground">{it.description}</p>}
                          </td>
                          <td className="py-2 px-2 text-center tabular-nums">{it.quantity}</td>
                          <td className="py-2 px-2 text-right tabular-nums">{previewFmt(it.price)}</td>
                          <td className="py-2 pl-2 text-right tabular-nums font-medium">{previewFmt(it.price * it.quantity)}</td>
                        </tr>
                      ))}
                      {items.filter(it => it.name.trim()).length === 0 && (
                        <tr><td colSpan={4} className="py-4 text-center text-muted-foreground italic">No items yet</td></tr>
                      )}
                    </tbody>
                  </table>
                  <div className="mt-3 flex justify-end">
                    <div className="w-48 space-y-1 text-xs">
                      <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">{previewFmt(subtotal)}</span></div>
                      {Number(discount) > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span className="tabular-nums">−{previewFmt(Number(discount))}</span></div>}
                      <div className="flex justify-between font-bold text-sm border-t border-foreground/20 pt-1">
                        <span>Total</span><span className="tabular-nums">{previewFmt(total)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* included services */}
                {included.trim() && (
                  <div className="px-5 py-4 border-t border-border bg-muted/20">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> What's included
                    </p>
                    <ul className="space-y-1">
                      {included.split("\n").filter(Boolean).map((s, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* notes */}
                {notes.trim() && (
                  <div className="px-5 py-3 border-t border-border">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Notes</p>
                    <p className="text-xs whitespace-pre-line">{notes}</p>
                  </div>
                )}

                {/* footer */}
                <div className="px-5 py-3 border-t border-border bg-muted/10 text-center text-[10px] text-muted-foreground">
                  <p>Thank you for choosing <span className="font-semibold text-foreground">Dynime</span>.</p>
                  <p>Questions? Email support@dynime.com</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-5">
        <section className="glass-card p-4 grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Customer name</Label>
            <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Jane Doe" />
          </div>
          <div>
            <Label>Customer email *</Label>
            <Input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="jane@example.com" />
            <p className={`text-[11px] mt-1 ${emailMatch ? "text-emerald-600" : "text-muted-foreground"}`}>
              {emailLookupBusy
                ? "Checking for an existing account…"
                : emailMatch
                  ? `✓ Email matches account${emailMatch.name ? ` — ${emailMatch.name}` : ""}. Order will appear in their dashboard.`
                  : /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(customerEmail)
                    ? phoneMatch
                      ? `No account on this email — but linked via phone (${phoneMatch.name || phoneMatch.email || "account"}).`
                      : "No account yet — order will auto-link when this user signs up with this email, or they can claim it from their dashboard."
                    : "Enter the customer email. If they have an account it will be linked automatically."}
            </p>
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+8801..." />
            <p className={`text-[11px] mt-1 ${phoneMatch ? "text-emerald-600" : "text-muted-foreground"}`}>
              {phoneLookupBusy
                ? "Checking for an account by phone…"
                : phoneMatch
                  ? `✓ Phone matches account${phoneMatch.name ? ` — ${phoneMatch.name}` : ""}${phoneMatch.email ? ` (${phoneMatch.email})` : ""}.`
                  : phone.replace(/\D/g, "").length >= 6
                    ? "No account found with this phone on past orders."
                    : "Optional — we'll link by phone if a previous order used the same number."}
            </p>
            {linkedSource && (
              <p className="text-[11px] mt-1 text-emerald-600">
                Linking via <strong>{linkedSource}</strong>{linkedName ? ` → ${linkedName}` : ""}.
              </p>
            )}
          </div>
          <div>
            <Label>Company</Label>
            <Input value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>
          <div>
            <Label>Referral Code (Optional)</Label>
            <Input
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              placeholder="e.g. PARTNER123"
            />
          </div>
        </section>

        <section className="glass-card p-4 grid sm:grid-cols-4 gap-3">
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
          <div>
            <Label>Due Date</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </section>

        {/* Issuer: Company or Employee */}
        <section className="glass-card p-4 space-y-3">
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
                    return <SelectItem key={k} value={k}>{m.name}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
              {selectedEmployee && (
                <div className="text-xs text-muted-foreground bg-background border border-border rounded p-2 space-y-0.5">
                  <p>
                    Invoice will show <span className="font-semibold text-foreground">{selectedEmployee.name}</span> in the "From" section instead of Dynime Inc.
                  </p>
                  {selectedEmployee.email && <p>Contact: {selectedEmployee.email}</p>}
                </div>
              )}
            </div>
          )}
        </section>

        <section className="glass-card p-4">
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
                  <div className="col-span-12 sm:col-span-6">
                    <ServiceItemPicker
                      value={it.name}
                      currency={currency}
                      onChangeName={(name) => updateItem(i, { name })}
                      onSelect={({ name, price }) => updateItem(i, { name, price })}
                    />
                  </div>
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

        <section className="glass-card p-4">
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

        <section className="grid sm:grid-cols-2 gap-4 items-start">
          <div className="glass-card p-4">
            <Label>Internal / customer notes</Label>
            <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Visible on the invoice" />
          </div>
          <div className="space-y-2 bg-secondary/30 border border-border rounded-lg p-4 text-sm">
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

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => guardedNavigate(backHref)} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <FileText className="w-4 h-4 mr-1.5" />}
            {ctaText}
          </Button>
        </div>
        </div>{/* end inner form div */}
      </div>{/* end outer grid */}
    </SuperAdminLayout>
  );
}

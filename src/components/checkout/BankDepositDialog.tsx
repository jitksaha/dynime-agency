import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Copy, CheckCircle2, Mail, Upload, FileImage, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type BankAccount = {
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  routing_number?: string;
  iban?: string;
  swift?: string;
  swift_code?: string;
  branch?: string;
  country?: string;
  notes?: string;
  // Allow any extra admin-defined fields
  [key: string]: string | undefined;
};

export type BankDepositInfo = {
  open: boolean;
  onClose: () => void;
  orderNumber: string; // session_id or invoice number used as deposit reference
  amount: number;
  currency?: string;
  accounts: BankAccount[];
  instructions?: string;
  displayName?: string;
  customerEmail?: string;
};

const FIELD_LABELS: Record<string, string> = {
  bank_name: "Bank",
  account_name: "Account name",
  account_number: "Account number",
  routing_number: "Routing / SWIFT",
  iban: "IBAN",
  swift: "SWIFT / BIC",
  swift_code: "SWIFT / BIC",
  branch: "Branch",
  country: "Country",
  notes: "Notes",
};

const CopyRow = ({ label, value }: { label: string; value: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed");
    }
  };
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-border/60 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm font-medium break-all">{value}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        className="shrink-0 inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 px-2 py-1 rounded-md hover:bg-primary/10 transition-colors"
        aria-label={`Copy ${label}`}
      >
        {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
};

const BankDepositDialog = ({
  open,
  onClose,
  orderNumber,
  amount,
  currency = "USD",
  accounts,
  instructions,
  displayName = "Bank Transfer",
  customerEmail,
}: BankDepositInfo) => {
  const countryOptions = useMemo(() => {
    return Array.from(new Set(accounts.map((a) => a.country?.trim()).filter(Boolean) as string[])).sort();
  }, [accounts]);
  const [countryFilter, setCountryFilter] = useState("all");
  const visibleAccounts = countryFilter === "all"
    ? accounts
    : accounts.filter((a) => a.country?.trim() === countryFilter);
  const isSingle = visibleAccounts.length <= 1;

  // Public support email pulled live from admin contact info
  const [supportEmail, setSupportEmail] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("contact_info")
        .select("value, type, label")
        .eq("is_active", true)
        .or("type.eq.email,label.ilike.%email%")
        .order("sort_order", { ascending: true })
        .limit(1);
      const email = data?.[0]?.value?.trim();
      if (!cancelled && email && /\S+@\S+\.\S+/.test(email)) setSupportEmail(email);
    })();
    return () => { cancelled = true; };
  }, [open]);

  // Receipt upload state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  const ALLOWED = ["image/png", "image/jpeg", "image/jpg", "image/webp", "application/pdf"];
  const MAX = 8 * 1024 * 1024; // 8MB

  const onPick = (f: File | null) => {
    if (!f) return setFile(null);
    if (!ALLOWED.includes(f.type)) { toast.error("Use PNG, JPG, WEBP or PDF"); return; }
    if (f.size > MAX) { toast.error("Max file size is 8MB"); return; }
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file) { toast.error("Choose a file first"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const safeRef = (orderNumber || "order").replace(/[^a-zA-Z0-9_-]/g, "_");
      const path = `${safeRef}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("bank-receipts")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;

      const { error: fnErr } = await supabase.functions.invoke("attach-bank-receipt", {
        body: {
          session_id: orderNumber,
          path,
          filename: file.name,
          size: file.size,
          content_type: file.type,
        },
      });
      if (fnErr) throw fnErr;

      setUploaded(true);
      toast.success("Receipt uploaded — we'll verify shortly");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="mx-auto inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary mb-1">
            <Building2 className="w-5 h-5" />
          </div>
          <DialogTitle className="text-center text-xl">Order placed — awaiting deposit</DialogTitle>
          <DialogDescription className="text-center text-sm">
            Send your payment to one of the accounts below using the order number as the deposit reference. We'll review and confirm your order once the deposit is received.
          </DialogDescription>
        </DialogHeader>

        {/* Order summary */}
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Order number</span>
            <CopyOnly value={orderNumber} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Amount due</span>
            <span className="font-heading text-base font-bold">
              {currency} {amount.toFixed(2)}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug pt-1">
            ⚠️ Please include the order number in your transfer description so we can match the deposit to your order.
          </p>
        </div>

        {/* Bank accounts */}
        <div className="space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              {displayName} — deposit accounts
            </h3>
            {countryOptions.length > 1 && (
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger className="h-9 sm:w-48 text-xs">
                  <SelectValue placeholder="Filter country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All countries</SelectItem>
                  {countryOptions.map((country) => <SelectItem key={country} value={country}>{country}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className={`grid gap-2 ${isSingle ? "grid-cols-1" : "md:grid-cols-2"}`}>
          {visibleAccounts.map((acc, idx) => {
            const entries = Object.entries(acc).filter(([key, v]) => key !== "id" && v && String(v).trim().length > 0);
            return (
              <div key={acc.id || idx} className="rounded-lg border border-border bg-card p-3">
                {entries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No details configured.</p>
                ) : (
                  <div className="space-y-0">
                    {entries.map(([key, value]) => (
                      <CopyRow
                        key={key}
                        label={FIELD_LABELS[key] || key.replace(/_/g, " ")}
                        value={String(value)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </div>

        {instructions && (
          <div className="rounded-lg bg-accent/30 border border-border p-3 text-sm text-foreground/90 whitespace-pre-wrap">
            {instructions}
          </div>
        )}

        {supportEmail && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 justify-center">
            <Mail className="w-3.5 h-3.5" />
            Need help? Contact <a href={`mailto:${supportEmail}`} className="font-medium text-foreground hover:text-primary">{supportEmail}</a>
          </p>
        )}

        {/* Receipt upload */}
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <FileImage className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-semibold">Upload deposit receipt</h4>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Attach a screenshot or PDF of your bank transfer to speed up verification (PNG, JPG, WEBP, PDF — max 8MB).
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0] || null)}
          />
          {!uploaded ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex-1 inline-flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs hover:bg-accent/30 transition-colors disabled:opacity-50"
              >
                <span className="truncate text-left">
                  {file ? file.name : "Choose file…"}
                </span>
                {file ? (
                  <X
                    className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground"
                    onClick={(e) => { e.stopPropagation(); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  />
                ) : (
                  <Upload className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </button>
              <Button
                type="button"
                onClick={handleUpload}
                disabled={!file || uploading}
                className="h-9 rounded-md text-xs sm:w-32"
              >
                {uploading ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Uploading</> : <><Upload className="w-3.5 h-3.5 mr-1.5" />Upload</>}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              Receipt attached to your order. You can upload another if needed.
              <button
                type="button"
                onClick={() => { setUploaded(false); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                className="ml-auto text-primary hover:underline"
              >
                Add another
              </button>
            </div>
          )}
        </div>

        <Button onClick={onClose} className="w-full h-11 rounded-xl">
          Done
        </Button>
      </DialogContent>
    </Dialog>
  );
};

const CopyOnly = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Order number copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed");
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold text-primary hover:text-primary/80 px-2 py-1 rounded-md hover:bg-primary/10 transition-colors"
    >
      {value}
      {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
};

export default BankDepositDialog;

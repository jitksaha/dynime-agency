import { useEffect, useState } from "react";
import { db } from "@/integrations/db/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  FileText, Upload, Download, Trash2, Loader2, CheckCircle2, Clock,
  BadgeCheck, Banknote, FilePlus2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type DocSlot = {
  key: string;
  label: string;
  icon?: any;
};

export const FORMATION_DOC_SLOTS: DocSlot[] = [
  { key: "certification", label: "Certification of Formation", icon: FileText },
  { key: "operating_agreement", label: "Operating Agreement", icon: FileText },
  { key: "ein_letter", label: "EIN Confirmation Letter", icon: BadgeCheck },
  { key: "bank_intro", label: "Bank Introduction Pack", icon: Banknote },
];

type StoredFile = {
  name: string;
  id?: string;
  updated_at?: string;
  metadata?: { size?: number; mimetype?: string } | null;
};

type Props = {
  serviceId: string;
  /** When true, allow upload/delete and status updates. */
  editable?: boolean;
  /** Render compact (customer view) or admin (with upload zones). */
  variant?: "customer" | "admin";
  slots?: DocSlot[];
  className?: string;
};

const BUCKET = "company-documents";

const fileSizeLabel = (n?: number) => {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

const slotKeyFromName = (name: string) => name.split("__")[0];

const DocumentManager = ({
  serviceId,
  editable = false,
  variant = "customer",
  slots = FORMATION_DOC_SLOTS,
  className,
}: Props) => {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await db.storage
      .from(BUCKET)
      .list(serviceId, { sortBy: { column: "updated_at", order: "desc" }, limit: 100 });
    if (error) {
      // Folder may simply be empty; only toast on real errors
      if (!`${error.message}`.toLowerCase().includes("not found")) {
        toast.error(error.message);
      }
      setFiles([]);
    } else {
      setFiles((data || []) as StoredFile[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (serviceId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId]);

  const fileForSlot = (key: string) =>
    files.find((f) => slotKeyFromName(f.name) === key) || null;

  const updateServiceStatus = async (key: string, completedNow: boolean) => {
    // Patch metadata.documents to reflect current latest filenames + completion flags
    const { data: svc } = await db
      .from("customer_services")
      .select("metadata, status")
      .eq("id", serviceId)
      .maybeSingle();
    const meta = (svc?.metadata as any) || {};
    const docs: any[] = Array.isArray(meta.documents) ? meta.documents : [];
    const next = docs.filter((d) => d.key !== key);
    const file = fileForSlot(key);
    if (completedNow && file) {
      next.push({
        key,
        label: slots.find((s) => s.key === key)?.label || key,
        path: `${serviceId}/${file.name}`,
        completed: true,
        updated_at: new Date().toISOString(),
      });
    }
    const allDone = slots.every((s) =>
      next.some((d: any) => d.key === s.key && d.completed)
    );
    const patch: any = { metadata: { ...meta, documents: next } };
    if (allDone) {
      patch.status = "delivered";
      patch.delivered_at = new Date().toISOString();
    } else if (svc?.status === "pending") {
      patch.status = "in_progress";
    }
    await db.from("customer_services").update(patch).eq("id", serviceId);
  };

  const onUpload = async (key: string, file: File) => {
    if (file.size > 25 * 1024 * 1024) {
      toast.error("File too large (max 25MB)");
      return;
    }
    setBusyKey(key);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${serviceId}/${key}__${Date.now()}_${safeName}`;
      const existing = fileForSlot(key);
      if (existing) {
        await db.storage.from(BUCKET).remove([`${serviceId}/${existing.name}`]);
      }
      const { error } = await db.storage.from(BUCKET).upload(path, file, {
        upsert: true,
        contentType: file.type || undefined,
      });
      if (error) throw error;
      await load();
      await updateServiceStatus(key, true);
      toast.success("Document uploaded — marked Completed");
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setBusyKey(null);
    }
  };

  const onDelete = async (key: string) => {
    const file = fileForSlot(key);
    if (!file) return;
    if (!confirm(`Delete "${file.name}"?`)) return;
    setBusyKey(key);
    try {
      const { error } = await db.storage.from(BUCKET).remove([`${serviceId}/${file.name}`]);
      if (error) throw error;
      await load();
      await updateServiceStatus(key, false);
      toast.success("Document removed");
    } catch (err: any) {
      toast.error(err?.message || "Delete failed");
    } finally {
      setBusyKey(null);
    }
  };

  const onDownload = async (key: string) => {
    const file = fileForSlot(key);
    if (!file) return;
    setBusyKey(key);
    try {
      const { data, error } = await db.storage
        .from(BUCKET)
        .createSignedUrl(`${serviceId}/${file.name}`, 60 * 5);
      if (error) throw error;
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      toast.error(err?.message || "Could not generate download link");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className={cn("grid sm:grid-cols-2 gap-3", className)}>
      {slots.map((slot) => {
        const Icon = slot.icon || FileText;
        const file = fileForSlot(slot.key);
        const completed = !!file;
        const busy = busyKey === slot.key;
        return (
          <div
            key={slot.key}
            className={cn(
              "rounded-xl border p-4 flex flex-col gap-3 transition-all",
              completed ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-secondary/20"
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                completed ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"
              )}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm truncate">{slot.label}</p>
                  {completed ? (
                    <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 text-[10px] shrink-0">
                      <CheckCircle2 className="w-3 h-3 mr-0.5" /> Completed
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      <Clock className="w-3 h-3 mr-0.5" /> Pending
                    </Badge>
                  )}
                </div>
                {file ? (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {file.name.split("__").slice(1).join("__") || file.name}
                    {file.metadata?.size ? ` · ${fileSizeLabel(file.metadata.size)}` : ""}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {editable ? "Upload a file to mark as completed." : "Will appear when uploaded by our team."}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {file && (
                <Button
                  size="sm"
                  variant={completed ? "hero" : "outline"}
                  className="rounded-full h-8 px-3"
                  onClick={() => onDownload(slot.key)}
                  disabled={busy || loading}
                >
                  {busy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1" />}
                  Download
                </Button>
              )}
              {editable && (
                <>
                  <label className="inline-flex">
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) onUpload(slot.key, f);
                        e.target.value = "";
                      }}
                      disabled={busy}
                    />
                    <Button asChild size="sm" variant="outline" className="rounded-full h-8 px-3" disabled={busy}>
                      <span>
                        {busy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> :
                          file ? <FilePlus2 className="w-3.5 h-3.5 mr-1" /> : <Upload className="w-3.5 h-3.5 mr-1" />}
                        {file ? "Replace" : "Upload"}
                      </span>
                    </Button>
                  </label>
                  {file && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-full h-8 px-2 text-destructive hover:text-destructive"
                      onClick={() => onDelete(slot.key)}
                      disabled={busy}
                      aria-label="Delete document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
      {variant === "admin" && (
        <p className="sm:col-span-2 text-[11px] text-muted-foreground">
          Files stored privately in <code className="font-mono">company-documents</code>. Customers can only view their own files via signed URLs.
        </p>
      )}
    </div>
  );
};

export default DocumentManager;

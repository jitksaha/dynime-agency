import { useEffect, useState } from "react";
import { Paperclip, Download, Loader2, Eye, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/integrations/db/client";
import { toast } from "sonner";

export type Attachment = {
  filename: string;
  contentType: string;
  size: number;
  path: string;
  contentId?: string;
};

const isImage = (ct: string) => !!ct && ct.startsWith("image/");
const isPdf = (ct: string) => ct === "application/pdf";
const isText = (ct: string) =>
  !!ct && (ct.startsWith("text/") || ct === "application/json" || ct === "application/xml");

export const InlineAttachmentPreviews = ({ attachments }: { attachments: Attachment[] }) => {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [texts, setTexts] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const previewable = (attachments ?? []).filter(
      (a) => isImage(a.contentType) || isPdf(a.contentType) || isText(a.contentType),
    );
    if (previewable.length === 0) return;
    (async () => {
      const entries = await Promise.all(
        previewable.map(async (att) => {
          const { data } = await db.storage
            .from("email-attachments")
            .createSignedUrl(att.path, 600);
          return [att.path, data?.signedUrl ?? ""] as const;
        }),
      );
      if (cancelled) return;
      const map: Record<string, string> = {};
      entries.forEach(([k, v]) => v && (map[k] = v));
      setUrls(map);

      // Fetch text bodies for inline display (cap size for safety)
      const textAtts = previewable.filter(
        (a) => isText(a.contentType) && (a.size ?? 0) <= 200_000 && map[a.path],
      );
      const textEntries = await Promise.all(
        textAtts.map(async (att) => {
          try {
            const res = await fetch(map[att.path]);
            const t = await res.text();
            return [att.path, t.slice(0, 20_000)] as const;
          } catch {
            return [att.path, ""] as const;
          }
        }),
      );
      if (cancelled) return;
      const tmap: Record<string, string> = {};
      textEntries.forEach(([k, v]) => v && (tmap[k] = v));
      setTexts(tmap);
    })();
    return () => {
      cancelled = true;
    };
  }, [attachments]);

  if (!attachments || attachments.length === 0) return null;
  const previewable = attachments.filter(
    (a) => isImage(a.contentType) || isPdf(a.contentType) || isText(a.contentType),
  );
  if (previewable.length === 0) return null;

  return (
    <div className="mt-3 grid gap-3">
      {previewable.map((att, i) => {
        const url = urls[att.path];
        return (
          <div
            key={`prev-${att.path}-${i}`}
            className="rounded-md border border-border/60 bg-background/30 overflow-hidden"
          >
            <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] text-muted-foreground border-b border-border/50">
              {isImage(att.contentType) ? (
                <Eye className="h-3 w-3" />
              ) : (
                <FileText className="h-3 w-3" />
              )}
              <span className="truncate font-medium text-foreground/80">{att.filename}</span>
              <span>·</span>
              <span>{att.contentType}</span>
            </div>
            {!url ? (
              <div className="flex items-center gap-2 p-4 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading preview…
              </div>
            ) : isImage(att.contentType) ? (
              <a href={url} target="_blank" rel="noopener noreferrer" className="block bg-black/20">
                <img
                  src={url}
                  alt={att.filename}
                  className="max-h-96 w-auto mx-auto object-contain"
                  loading="lazy"
                />
              </a>
            ) : isPdf(att.contentType) ? (
              <iframe
                src={url}
                title={att.filename}
                className="w-full h-[480px] bg-background"
              />
            ) : (
              <pre className="max-h-72 overflow-auto p-3 text-xs whitespace-pre-wrap font-mono text-foreground/80">
                {texts[att.path] ?? "Loading text…"}
              </pre>
            )}
          </div>
        );
      })}
    </div>
  );
};

const formatSize = (bytes: number) => {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const AttachmentList = ({ attachments }: { attachments: Attachment[] }) => {
  const [busy, setBusy] = useState<string | null>(null);

  if (!attachments || attachments.length === 0) return null;

  const open = async (att: Attachment, mode: "view" | "download") => {
    setBusy(`${att.path}-${mode}`);
    try {
      const { data, error } = await db.storage
        .from("email-attachments")
        .createSignedUrl(
          att.path,
          300,
          mode === "download" ? { download: att.filename } : undefined,
        );
      if (error || !data?.signedUrl) throw error ?? new Error("No URL");
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not open attachment");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-4 border-t border-border/60 pt-3">
      <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
        <Paperclip className="h-3.5 w-3.5" />
        {attachments.length} attachment{attachments.length === 1 ? "" : "s"}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {attachments.map((att, i) => {
          const previewable =
            att.contentType?.startsWith("image/") ||
            att.contentType === "application/pdf" ||
            att.contentType?.startsWith("text/");
          return (
            <div
              key={`${att.path}-${i}`}
              className="flex items-center gap-2 rounded-md border border-border bg-background/40 px-3 py-2 text-sm"
            >
              <div className="h-8 w-8 rounded bg-secondary/60 flex items-center justify-center shrink-0">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{att.filename}</p>
                <p className="text-[11px] text-muted-foreground">
                  {att.contentType || "file"} · {formatSize(att.size)}
                </p>
              </div>
              {previewable && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => open(att, "view")}
                  disabled={busy === `${att.path}-view`}
                  title="Preview"
                >
                  {busy === `${att.path}-view` ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => open(att, "download")}
                disabled={busy === `${att.path}-download`}
                title="Download"
              >
                {busy === `${att.path}-download` ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AttachmentList;

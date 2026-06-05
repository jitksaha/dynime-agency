import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Upload,
  Trash2,
  Image as ImageIcon,
  Save,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { useSiteSettings } from "@/hooks/use-data";
import { inspectImage, formatBytes, formatAspect, type InspectResult } from "@/lib/image-inspect";
import dynimeLogoLight from "@/assets/dynime-logo-light.webp";
import dynimeLogoDark from "@/assets/dynime-logo-dark.webp";
import { apiPost } from "@/lib/api";

const BUCKET = "site-assets";
const MAX_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const ALLOWED_EXT = ["png", "jpg", "jpeg", "webp", "svg"];
const ALLOWED_LABEL = "SVG, PNG, JPG or WebP";
const RECOMMENDED_MIN_W = 400;
const RECOMMENDED_MIN_H = 120;

// Default bundled fallback assets — surfaced in error messages so admins
// know exactly which file is expected when a preview fails to load.
const DEFAULT_LIGHT_LOGO_PATH = "src/assets/dynime-logo-light.svg";
const DEFAULT_DARK_LOGO_PATH = "src/assets/dynime-logo-dark.svg";

type LogoMeta = { width: number; height: number; format?: string } | null;

const validateLogoFile = (file: File): string | null => {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const typeOk = ALLOWED.includes(file.type);
  const extOk = ALLOWED_EXT.includes(ext);
  if (!typeOk && !extOk) {
    return `Unsupported file "${file.name}" (${file.type || "unknown type"}). Allowed formats: ${ALLOWED_LABEL}.`;
  }
  if (file.size > MAX_BYTES) {
    return `File "${file.name}" is ${formatBytes(file.size)} — must be under ${formatBytes(MAX_BYTES)}.`;
  }
  return null;
};

// Append a cache-busting query param so the browser refetches the new
// asset immediately after upload, even when CDN/edge caching would
// otherwise return a stale copy of the same storage URL.
const withCacheBuster = (url: string) =>
  url ? `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}` : url;

const upsertSetting = async (key: string, value: string) => {
  await apiPost("/cms/site-settings", { key, value: JSON.stringify(value) });
};

const upsertSettingJson = async (key: string, value: unknown) => {
  await apiPost("/cms/site-settings", { key, value: JSON.stringify(value) });
};

const parseMeta = (raw: unknown): LogoMeta => {
  if (!raw) return null;
  try {
    const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (obj && typeof obj === "object" && "width" in obj && "height" in obj) {
      return obj as LogoMeta;
    }
    return null;
  } catch {
    return null;
  }
};

const LogoSlot = ({
  label,
  description,
  preview,
  meta,
  onPick,
  onClear,
  uploading,
  bgClass,
}: {
  label: string;
  description: string;
  preview: string;
  meta: LogoMeta;
  onPick: (file: File) => void;
  onClear: () => void;
  uploading: boolean;
  bgClass: string;
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [imgError, setImgError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragDepth = useRef(0);
  const looksSmall =
    meta &&
    meta.format !== "SVG" &&
    (meta.width < RECOMMENDED_MIN_W || meta.height < RECOMMENDED_MIN_H);

  // Reset error state when preview source changes
  useEffect(() => {
    setImgError(null);
  }, [preview]);

  const expectedAsset =
    label.toLowerCase().includes("dark") ? DEFAULT_DARK_LOGO_PATH : DEFAULT_LIGHT_LOGO_PATH;

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (uploading) return;
    dragDepth.current += 1;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = uploading ? "none" : "copy";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = 0;
    setIsDragging(false);
    if (uploading) return;

    const files = Array.from(e.dataTransfer?.files ?? []);
    if (files.length === 0) {
      toast.error("No file detected. Try dropping a single image file.");
      return;
    }
    if (files.length > 1) {
      toast.error("Drop one logo at a time.");
      return;
    }
    onPick(files[0]);
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border bg-secondary/30 flex items-center gap-2">
        <ImageIcon className="w-4 h-4 text-primary" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-foreground">{label}</div>
          <div className="text-[11px] text-muted-foreground">{description}</div>
        </div>
      </div>

      <div
        className={`relative p-6 flex items-center justify-center min-h-[120px] transition-colors ${bgClass} ${
          isDragging ? "ring-2 ring-inset ring-primary/70" : ""
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        role="button"
        aria-label={`Drop a ${label.toLowerCase()} image here or use the upload button`}
      >
        {imgError ? (
          <div className="text-center text-xs text-destructive space-y-1 px-3">
            <div className="flex items-center justify-center gap-1.5 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              Logo failed to load
            </div>
            <div className="text-muted-foreground break-all">
              Missing path: <code className="font-mono">{imgError}</code>
            </div>
            <div className="text-muted-foreground">
              Expected default asset: <code className="font-mono">{expectedAsset}</code>
            </div>
          </div>
        ) : (
          <img
            // key forces React to swap the DOM node when the URL changes,
            // ensuring the browser fetches the freshly-uploaded asset
            // instead of reusing a cached <img> element.
            key={preview}
            src={preview}
            alt={label}
            className="h-12 w-auto max-w-[80%] object-contain pointer-events-none"
            onError={() => setImgError(preview || "(empty url)")}
          />
        )}

        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-primary/10 backdrop-blur-[1px] pointer-events-none">
            <div className="rounded-md bg-background/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-primary" />
              Drop to upload — {ALLOWED_LABEL}
            </div>
          </div>
        )}
      </div>

      {meta && (
        <div className="px-4 py-2 border-t border-border text-[11px] text-muted-foreground flex items-center justify-between">
          <span>
            {meta.format || "Image"} · {meta.width}×{meta.height}
          </span>
          {looksSmall && (
            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-3 h-3" />
              May look blurry
            </span>
          )}
        </div>
      )}

      <div className="px-4 py-3 flex items-center gap-2 border-t border-border">
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED.join(",")}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPick(f);
            e.target.value = "";
          }}
        />
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="w-3.5 h-3.5 mr-1" />
          {uploading ? "Uploading…" : "Upload new"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive"
          disabled={uploading}
          onClick={onClear}
          title="Reset to default"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};

type PendingUpload = {
  file: File;
  kind: "light" | "dark";
  previewUrl: string;
  inspect: InspectResult;
};

const FaviconUploader = () => {
  const qc = useQueryClient();
  const { data: settings } = useSiteSettings();
  const [light, setLight] = useState("");
  const [dark, setDark] = useState("");
  const [busy, setBusy] = useState<null | "light" | "dark">(null);
  const [dragOver, setDragOver] = useState<null | "light" | "dark">(null);
  const lightRef = useRef<HTMLInputElement | null>(null);
  const darkRef = useRef<HTMLInputElement | null>(null);

  const handleDrop = (e: React.DragEvent, kind: "light" | "dark") => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(null);
    if (busy === kind) return;
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (files.length === 0) {
      toast.error("No file detected. Try dropping a single image file.");
      return;
    }
    if (files.length > 1) {
      toast.error("Drop one favicon at a time.");
      return;
    }
    upload(files[0], kind);
  };

  useEffect(() => {
    setLight(settings?.favicon_url || "");
    setDark(settings?.favicon_dark_url || "");
  }, [settings?.favicon_url, settings?.favicon_dark_url]);

  const upload = async (file: File, kind: "light" | "dark") => {
    const validationErr = validateLogoFile(file);
    if (validationErr) {
      toast.error(validationErr);
      return;
    }
    setBusy(kind);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `favicon/${kind}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type, cacheControl: "31536000" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const url = pub.publicUrl;
      const previewSrc = withCacheBuster(url);
      const key = kind === "light" ? "favicon_url" : "favicon_dark_url";
      // Persist clean URL to settings; only the local preview gets the buster.
      await upsertSetting(key, url);
      if (kind === "light") setLight(previewSrc);
      else setDark(previewSrc);
      qc.invalidateQueries({ queryKey: ["site-settings"] });
      toast.success(`${kind === "light" ? "Light" : "Dark"} favicon updated — live in browser tabs.`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  };

  const reset = async (kind: "light" | "dark") => {
    const key = kind === "light" ? "favicon_url" : "favicon_dark_url";
    await upsertSetting(key, "");
    if (kind === "light") setLight("");
    else setDark("");
    qc.invalidateQueries({ queryKey: ["site-settings"] });
    toast.success("Reverted to default favicon.");
  };

  const Slot = ({
    kind,
    url,
    bgClass,
    fallback,
    inputRef,
  }: {
    kind: "light" | "dark";
    url: string;
    bgClass: string;
    fallback: string;
    inputRef: React.RefObject<HTMLInputElement>;
  }) => (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border bg-secondary/30">
        <div className="text-sm font-semibold text-foreground capitalize">{kind} mode favicon</div>
        <div className="text-[11px] text-muted-foreground">
          Shown in browser tabs. Square PNG/SVG (32×32 or larger), ≤ 2 MB.
        </div>
      </div>
      <div
        className={`relative p-6 flex items-center justify-center min-h-[100px] transition-colors ${bgClass} ${
          dragOver === kind ? "ring-2 ring-inset ring-primary/70" : ""
        }`}
        onDragEnter={(e) => {
          e.preventDefault();
          if (busy !== kind) setDragOver(kind);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (e.dataTransfer) e.dataTransfer.dropEffect = busy === kind ? "none" : "copy";
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(null);
        }}
        onDrop={(e) => handleDrop(e, kind)}
        role="button"
        aria-label={`Drop a ${kind} mode favicon image here`}
      >
        <img src={url || fallback} alt={`${kind} favicon`} className="h-10 w-10 object-contain pointer-events-none" />
        {dragOver === kind && (
          <div className="absolute inset-0 flex items-center justify-center bg-primary/10 backdrop-blur-[1px] pointer-events-none">
            <div className="rounded-md bg-background/90 px-2.5 py-1 text-[11px] font-medium text-foreground shadow-sm flex items-center gap-1.5">
              <Upload className="w-3 h-3 text-primary" />
              Drop to upload
            </div>
          </div>
        )}
      </div>
      <div className="px-4 py-3 flex items-center gap-2 border-t border-border">
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED.join(",")}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f, kind);
            e.target.value = "";
          }}
        />
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          disabled={busy === kind}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="w-3.5 h-3.5 mr-1" />
          {busy === kind ? "Uploading…" : "Upload new"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive"
          disabled={busy === kind}
          onClick={() => reset(kind)}
          title="Reset to default"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="glass-card p-6 max-w-3xl mb-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Favicon</h2>
        <p className="text-xs text-muted-foreground mt-1">
          The icon shown in browser tabs and bookmarks. Updates appear instantly — no redeploy.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Slot kind="light" url={light} bgClass="bg-white" fallback="/favicon.png" inputRef={lightRef} />
        <Slot kind="dark" url={dark} bgClass="bg-neutral-900" fallback="/favicon-dark.png" inputRef={darkRef} />
      </div>
    </div>
  );
};

const SiteLogoUploader = () => {
  const qc = useQueryClient();
  const { data: settings } = useSiteSettings();
  const [lightUrl, setLightUrl] = useState("");
  const [darkUrl, setDarkUrl] = useState("");
  const [lightMeta, setLightMeta] = useState<LogoMeta>(null);
  const [darkMeta, setDarkMeta] = useState<LogoMeta>(null);
  const [altText, setAltText] = useState("");
  const [uploading, setUploading] = useState<null | "light" | "dark">(null);
  const [altDirty, setAltDirty] = useState(false);
  const [pending, setPending] = useState<PendingUpload | null>(null);

  useEffect(() => {
    if (!settings) return;
    setLightUrl(settings.logo_light || "");
    setDarkUrl(settings.logo_dark || "");
    setLightMeta(parseMeta(settings.logo_light_meta));
    setDarkMeta(parseMeta(settings.logo_dark_meta));
    setAltText(settings.logo_alt || "");
    setAltDirty(false);
  }, [settings]);

  // Cleanup any blob URL when dialog closes
  useEffect(() => {
    return () => {
      if (pending) URL.revokeObjectURL(pending.previewUrl);
    };
  }, [pending]);

  const handlePick = async (file: File, kind: "light" | "dark") => {
    const validationErr = validateLogoFile(file);
    if (validationErr) {
      toast.error(validationErr);
      return;
    }
    const inspect = await inspectImage(file);
    const previewUrl = URL.createObjectURL(file);
    setPending({ file, kind, previewUrl, inspect });
  };

  const closePending = () => {
    if (pending) URL.revokeObjectURL(pending.previewUrl);
    setPending(null);
  };

  const performUpload = async () => {
    if (!pending) return;
    const { file, kind, inspect } = pending;
    setUploading(kind);
    closePending();
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `logo/${kind}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type, cacheControl: "31536000" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const url = pub.publicUrl;
      const previewSrc = withCacheBuster(url);
      const urlKey = kind === "light" ? "logo_light" : "logo_dark";
      const metaKey = kind === "light" ? "logo_light_meta" : "logo_dark_meta";
      const meta = { width: inspect.width, height: inspect.height, format: inspect.format };
      // Persist clean URL to DB so other surfaces don't accumulate query strings.
      await upsertSetting(urlKey, url);
      await upsertSettingJson(metaKey, meta);
      // Local preview uses the cache-busted URL so the new SVG/PNG appears
      // instantly without a manual page refresh.
      if (kind === "light") {
        setLightUrl(previewSrc);
        setLightMeta(meta);
      } else {
        setDarkUrl(previewSrc);
        setDarkMeta(meta);
      }
      qc.invalidateQueries({ queryKey: ["site-settings"] });
      toast.success(`${kind === "light" ? "Light" : "Dark"} logo updated — live everywhere.`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      const lower = msg.toLowerCase();
      if (lower.includes("row-level") || lower.includes("policy") || lower.includes("permission")) {
        toast.error("Permission denied — only admins can upload site assets.");
      } else {
        toast.error(msg);
      }
    } finally {
      setUploading(null);
    }
  };

  const clearLogo = useMutation({
    mutationFn: async (kind: "light" | "dark") => {
      const urlKey = kind === "light" ? "logo_light" : "logo_dark";
      const metaKey = kind === "light" ? "logo_light_meta" : "logo_dark_meta";
      await upsertSetting(urlKey, "");
      await upsertSettingJson(metaKey, null);
      if (kind === "light") {
        setLightUrl("");
        setLightMeta(null);
      } else {
        setDarkUrl("");
        setDarkMeta(null);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site-settings"] });
      toast.success("Reverted to default logo.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveAlt = useMutation({
    mutationFn: async () => {
      await upsertSetting("logo_alt", altText.trim());
    },
    onSuccess: () => {
      setAltDirty(false);
      qc.invalidateQueries({ queryKey: ["site-settings"] });
      toast.success("Alt text saved.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const hasWarnings = pending ? pending.inspect.warnings.length > 0 : false;

  return (
    <div className="glass-card p-6 max-w-3xl mb-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Site Logo</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Upload separate logos for light and dark mode. Updates appear instantly across the header,
          footer, admin panel and login screens — no redeploy needed.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LogoSlot
          label="Light mode logo"
          description="Shown on light backgrounds. Drop or upload SVG/PNG, ≤ 2 MB."
          preview={lightUrl || dynimeLogoLight}
          meta={lightUrl ? lightMeta : null}
          onPick={(f) => handlePick(f, "light")}
          onClear={() => clearLogo.mutate("light")}
          uploading={uploading === "light"}
          bgClass="bg-white"
        />
        <LogoSlot
          label="Dark mode logo"
          description="Shown on dark backgrounds. Drop or upload SVG/PNG, ≤ 2 MB."
          preview={darkUrl || dynimeLogoDark}
          meta={darkUrl ? darkMeta : null}
          onPick={(f) => handlePick(f, "dark")}
          onClear={() => clearLogo.mutate("dark")}
          uploading={uploading === "dark"}
          bgClass="bg-neutral-900"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Logo alt text (accessibility)</Label>
        <div className="flex gap-2">
          <Input
            value={altText}
            onChange={(e) => {
              setAltText(e.target.value);
              setAltDirty(true);
            }}
            placeholder="e.g. Acme Inc — Digital Solutions"
          />
          <Button
            size="sm"
            disabled={!altDirty || saveAlt.isPending}
            onClick={() => saveAlt.mutate()}
          >
            <Save className="w-3.5 h-3.5 mr-1" />
            {saveAlt.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Describes the logo for screen readers and search engines.
        </p>
      </div>

      <AlertDialog open={!!pending} onOpenChange={(open) => !open && closePending()}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm logo upload</AlertDialogTitle>
            <AlertDialogDescription>
              Review the detected dimensions before publishing this logo site-wide.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {pending && (
            <div className="space-y-3">
              <div
                className={`rounded-lg border border-border p-4 flex items-center justify-center min-h-[120px] ${
                  pending.kind === "dark" ? "bg-neutral-900" : "bg-white"
                }`}
              >
                <img
                  src={pending.previewUrl}
                  alt="Preview"
                  className="h-14 w-auto max-w-[80%] object-contain"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md bg-secondary/40 px-3 py-2">
                  <div className="text-muted-foreground">Dimensions</div>
                  <div className="font-medium text-foreground">
                    {pending.inspect.isVector && (!pending.inspect.width || !pending.inspect.height)
                      ? "Vector (scales)"
                      : `${pending.inspect.width || "?"} × ${pending.inspect.height || "?"} px`}
                  </div>
                </div>
                <div className="rounded-md bg-secondary/40 px-3 py-2">
                  <div className="text-muted-foreground">File</div>
                  <div className="font-medium text-foreground">
                    {pending.inspect.format} · {formatBytes(pending.inspect.sizeBytes)}
                  </div>
                </div>
                <div className="rounded-md bg-secondary/40 px-3 py-2">
                  <div className="text-muted-foreground">Aspect ratio</div>
                  <div className="font-medium text-foreground">
                    {pending.inspect.aspectRatio
                      ? formatAspect(pending.inspect.width, pending.inspect.height)
                      : "—"}
                  </div>
                </div>
                <div className="rounded-md bg-secondary/40 px-3 py-2">
                  <div className="text-muted-foreground">Slot</div>
                  <div className="font-medium text-foreground capitalize">{pending.kind} mode</div>
                </div>
              </div>

              {hasWarnings ? (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm font-medium">
                    <AlertTriangle className="w-4 h-4" />
                    Possible quality issues
                  </div>
                  <ul className="text-xs text-amber-800 dark:text-amber-300 space-y-1 list-disc pl-5">
                    {pending.inspect.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  Looks good — dimensions and quality check out.
                </div>
              )}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={performUpload}
              className={
                hasWarnings ? "bg-amber-600 text-white hover:bg-amber-700" : undefined
              }
            >
              {hasWarnings ? "Upload anyway" : "Upload"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export { FaviconUploader };
export default SiteLogoUploader;

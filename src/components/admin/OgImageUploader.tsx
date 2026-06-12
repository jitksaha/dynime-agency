import { useRef, useState } from "react";
import { db } from "@/integrations/db/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Sparkles, X, Image as ImageIcon, Loader2 } from "lucide-react";

const BUCKET = "site-assets";
const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "image/webp"];

interface Props {
  value?: string;
  onChange: (url: string) => void;
  /** Used as auto-generation prompt subject */
  context?: { title?: string; description?: string };
  label?: string;
  /** Subfolder inside site-assets bucket */
  folder?: string;
}

const OgImageUploader = ({
  value,
  onChange,
  context,
  label = "OG / Social Share Image",
  folder = "og",
}: Props) => {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const upload = async (file: File) => {
    if (!ALLOWED.includes(file.type)) {
      toast.error("Use PNG, JPG or WebP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Max 4MB.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await db.storage.from(BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
      const { data } = db.storage.from(BUCKET).getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Image uploaded.");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
      if (ref.current) ref.current.value = "";
    }
  };

  const generate = async () => {
    if (!context?.title) {
      toast.error("Add a title first to auto-generate.");
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await db.functions.invoke("generate-og-image", {
        body: {
          title: context.title,
          description: context.description || "",
          folder,
        },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("No image returned");
      onChange(data.url);
      toast.success("OG image generated.");
    } catch (e: any) {
      toast.error(e?.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://… (1200×630 recommended)"
          className="flex-1"
        />
        <input
          ref={ref}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => ref.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1" />}
          Upload
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={generate}
          disabled={generating}
        >
          {generating ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
          Auto-generate
        </Button>
      </div>
      {value ? (
        <div className="relative inline-block">
          <img
            src={value}
            alt="OG preview"
            className="mt-2 rounded-md border border-border max-h-40 object-cover"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow"
            aria-label="Remove image"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <ImageIcon className="w-3.5 h-3.5" /> No image set — site default will be used.
        </div>
      )}
      <p className="text-[10px] text-muted-foreground">
        Used by Facebook, LinkedIn, Twitter/X, WhatsApp, Slack & search previews. 1200×630px is ideal.
      </p>
    </div>
  );
};

export default OgImageUploader;

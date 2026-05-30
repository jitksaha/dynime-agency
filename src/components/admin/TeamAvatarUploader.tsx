import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, Trash2, Loader2, User } from "lucide-react";

const BUCKET = "site-assets";
const MAX_BYTES = 3 * 1024 * 1024; // 3MB
const ALLOWED = ["image/png", "image/jpeg", "image/webp"];

type Props = {
  value?: string;
  onChange: (url: string) => void;
};

const TeamAvatarUploader = ({ value, onChange }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    if (!ALLOWED.includes(file.type)) {
      toast.error("Use a PNG, JPG, or WebP image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Image must be under 3MB.");
      return;
    }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `team/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type, cacheControl: "31536000" });
      if (error) throw error;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Photo uploaded.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="h-16 w-16 rounded-full overflow-hidden bg-muted border border-border grid place-items-center shrink-0">
        {value ? (
          <img src={value} alt="Profile" className="h-full w-full object-cover" />
        ) : (
          <User className="w-6 h-6 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED.join(",")}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
          />
          <Button type="button" size="sm" variant="outline" disabled={busy}
            onClick={() => inputRef.current?.click()}>
            {busy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1" />}
            {busy ? "Uploading…" : value ? "Replace" : "Upload"}
          </Button>
          {value && (
            <Button type="button" size="sm" variant="ghost" className="text-destructive"
              disabled={busy} onClick={() => onChange("")}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
        <Input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="…or paste a URL"
          className="h-8 text-xs"
        />
      </div>
    </div>
  );
};

export default TeamAvatarUploader;

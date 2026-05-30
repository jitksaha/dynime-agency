import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Block } from "@/components/page-builder/types";
import PageBuilder from "@/components/page-builder/PageBuilder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, Save, Settings, Eye } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import type { Json } from "@/integrations/supabase/types";

const PageEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: page, isLoading } = useQuery({
    queryKey: ["page-editor", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("pages").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (page) {
      setTitle(page.title);
      setSlug(page.slug);
      setMetaTitle(page.meta_title || "");
      setMetaDescription(page.meta_description || "");
      setOgImage(page.og_image || "");
      setIsPublished(page.is_published);
      setBlocks(Array.isArray(page.content) ? (page.content as unknown as Block[]) : []);
    }
  }, [page]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("pages")
        .update({
          title,
          slug,
          meta_title: metaTitle || null,
          meta_description: metaDescription || null,
          og_image: ogImage || null,
          is_published: isPublished,
          content: blocks as unknown as Json,
        })
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Page saved successfully");
      qc.invalidateQueries({ queryKey: ["admin-pages"] });
      qc.invalidateQueries({ queryKey: ["page-editor", id] });
      setHasChanges(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleBlocksChange = (newBlocks: Block[]) => {
    setBlocks(newBlocks);
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading editor...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-3 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate("/superadmin/pages")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>

        <Input
          value={title}
          onChange={(e) => { setTitle(e.target.value); setHasChanges(true); }}
          className="max-w-xs h-8 text-sm font-medium"
          placeholder="Page Title"
        />

        <div className="flex-1" />

        <div className="flex items-center gap-2 text-sm">
          <Label className="text-xs text-muted-foreground">Published</Label>
          <Switch checked={isPublished} onCheckedChange={(v) => { setIsPublished(v); setHasChanges(true); }} />
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const STATIC = new Set(["home", "about", "services", "portfolio", "blog", "contact"]);
            const path = slug === "home" ? "/" : STATIC.has(slug) ? `/${slug}` : `/page/${slug}`;
            window.open(path, "_blank");
          }}
        >
          <Eye className="w-4 h-4 mr-1" /> View
        </Button>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4 mr-1" /> SEO
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Page SEO Settings</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label className="text-xs">URL Slug</Label>
                <Input value={slug} onChange={(e) => { setSlug(e.target.value); setHasChanges(true); }} />
                <p className="text-xs text-muted-foreground mt-1">yourdomain.com/page/{slug}</p>
              </div>
              <div>
                <Label className="text-xs">Meta Title</Label>
                <Input
                  value={metaTitle}
                  onChange={(e) => { setMetaTitle(e.target.value); setHasChanges(true); }}
                  placeholder={title}
                />
                <p className="text-xs text-muted-foreground mt-1">{(metaTitle || title).length}/60 characters</p>
              </div>
              <div>
                <Label className="text-xs">Meta Description</Label>
                <Textarea
                  value={metaDescription}
                  onChange={(e) => { setMetaDescription(e.target.value); setHasChanges(true); }}
                  rows={3}
                  placeholder="Brief description for search engines..."
                />
                <p className="text-xs text-muted-foreground mt-1">{metaDescription.length}/160 characters</p>
              </div>
              <div>
                <Label className="text-xs">OG Image URL</Label>
                <Input
                  value={ogImage}
                  onChange={(e) => { setOgImage(e.target.value); setHasChanges(true); }}
                  placeholder="https://..."
                />
              </div>

              {/* SEO Preview */}
              <div className="p-4 bg-secondary/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Search Preview</p>
                <p className="text-sm text-primary truncate">{metaTitle || title || "Page Title"}</p>
                <p className="text-xs text-green-500 truncate">yourdomain.com/page/{slug}</p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                  {metaDescription || "No description set."}
                </p>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <Button
          size="sm"
          onClick={() => saveMutation.mutate()}
          disabled={!hasChanges || saveMutation.isPending}
        >
          <Save className="w-4 h-4 mr-1" />
          {saveMutation.isPending ? "Saving..." : "Save"}
        </Button>
      </header>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <PageBuilder blocks={blocks} onChange={handleBlocksChange} />
      </div>
    </div>
  );
};

export default PageEditor;

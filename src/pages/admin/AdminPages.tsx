import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Plus, Search, Pencil, Trash2, Globe, FileText, ExternalLink, Layout, File, Zap,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import NewPageDialog from "@/components/admin/NewPageDialog";
import { servicePages } from "@/data/services";

// Static routes that have hardcoded React components
const STATIC_SLUGS = new Set(["home", "about", "services", "portfolio", "blog", "contact"]);
const SERVICE_SLUGS = new Set(servicePages.map((s) => s.slug));

const slugToPath = (slug: string) => {
  if (slug === "home") return "/";
  if (STATIC_SLUGS.has(slug)) return `/${slug}`;
  if (SERVICE_SLUGS.has(slug)) return `/${slug}`;
  return `/page/${slug}`;
};

const AdminPages = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newPageOpen, setNewPageOpen] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "static" | "service" | "custom">("all");

  const { data: pages, isLoading } = useQuery({
    queryKey: ["admin-pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pages")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deletePage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pages").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ["admin-pages"] });
      const previous = qc.getQueryData<any[]>(["admin-pages"]);
      qc.setQueryData<any[]>(["admin-pages"], (old) => (old || []).filter((p) => p.id !== id));
      setDeleteId(null);
      return { previous };
    },
    onError: (err: any, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(["admin-pages"], ctx.previous);
      toast.error(err?.message || "Delete failed");
    },
    onSuccess: () => toast.success("Page deleted"),
    onSettled: () => qc.invalidateQueries({ queryKey: ["admin-pages"] }),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase.from("pages").update({ is_published: published }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, published }) => {
      await qc.cancelQueries({ queryKey: ["admin-pages"] });
      const previous = qc.getQueryData<any[]>(["admin-pages"]);
      qc.setQueryData<any[]>(["admin-pages"], (old) =>
        (old || []).map((p) => (p.id === id ? { ...p, is_published: published } : p)),
      );
      return { previous };
    },
    onError: (err: any, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["admin-pages"], ctx.previous);
      toast.error(err?.message || "Update failed");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["admin-pages"] }),
  });

  const getPageType = (slug: string) => {
    if (STATIC_SLUGS.has(slug)) return "static";
    if (SERVICE_SLUGS.has(slug)) return "service";
    return "custom";
  };

  const filtered = (pages || []).filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase());
    const pageType = getPageType(p.slug);
    const matchesFilter = filterType === "all" || filterType === pageType;
    return matchesSearch && matchesFilter;
  });

  const staticCount = (pages || []).filter((p) => STATIC_SLUGS.has(p.slug)).length;
  const serviceCount = (pages || []).filter((p) => SERVICE_SLUGS.has(p.slug)).length;
  const customCount = (pages || []).filter((p) => !STATIC_SLUGS.has(p.slug) && !SERVICE_SLUGS.has(p.slug)).length;

  return (
    <SuperAdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Page Manager</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage all website pages — edit SEO, design, and publish status
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/superadmin/seo")}>
            <Globe className="w-4 h-4 mr-1" /> SEO Tools
          </Button>
          <Button size="sm" onClick={() => setNewPageOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> New Page
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: "All Pages", count: (pages || []).length, filter: "all" as const },
          { label: "Static Pages", count: staticCount, filter: "static" as const },
          { label: "Service Pages", count: serviceCount, filter: "service" as const },
          { label: "Custom Pages", count: customCount, filter: "custom" as const },
        ].map((s) => (
          <button
            key={s.filter}
            onClick={() => setFilterType(s.filter)}
            className={`p-3 rounded-lg border text-left transition-colors ${
              filterType === s.filter
                ? "border-primary bg-primary/5 text-primary"
                : "border-border bg-card text-foreground hover:border-primary/30"
            }`}
          >
            <p className="text-2xl font-bold">{s.count}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search pages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-14 text-muted-foreground">Loading pages...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-14">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">No pages found</p>
          <Button onClick={() => setNewPageOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Create Your First Page
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((page) => {
            const pageType = getPageType(page.slug);
            return (
              <div
                key={page.id}
                className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg hover:border-primary/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  {pageType === "static" ? (
                    <Layout className="w-5 h-5 text-primary" />
                  ) : pageType === "service" ? (
                    <Zap className="w-5 h-5 text-primary" />
                  ) : (
                    <File className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground truncate">{page.title}</h3>
                    <Badge variant={page.is_published ? "default" : "secondary"} className="text-[10px]">
                      {page.is_published ? "Published" : "Draft"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {pageType === "static" ? "Static" : pageType === "service" ? "Service" : "Custom"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{slugToPath(page.slug)}</p>
                  <p className="text-xs text-muted-foreground">
                    Updated {new Date(page.updated_at).toLocaleDateString()}
                    {page.meta_title && (
                      <span className="ml-2 text-primary/60">• SEO configured</span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <Switch
                    checked={page.is_published}
                    onCheckedChange={(v) => togglePublish.mutate({ id: page.id, published: v })}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(`/superadmin/pages/${page.id}`)}
                    title="Edit page"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.open(slugToPath(page.slug), "_blank")}
                    title="View page"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                  {pageType === "custom" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(page.id)}
                      title="Delete page"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Page Dialog */}
      <NewPageDialog open={newPageOpen} onOpenChange={setNewPageOpen} />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Page?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deletePage.mutate(deleteId)} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SuperAdminLayout>
  );
};

export default AdminPages;

import { useState, useEffect } from "react";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Star, Eye, EyeOff, Upload, X, Search, GripVertical, CheckSquare, History, RotateCcw, Sparkles, Zap } from "lucide-react";
import { generateAltText } from "@/lib/alt-text";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const CATEGORIES = ["Web", "Marketing", "Consultancy"];

const useAdminPortfolio = () => {
  return useQuery({
    queryKey: ["admin-portfolio"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolio_projects")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });
};

interface ProjectForm {
  title: string;
  slug: string;
  category: string;
  description: string;
  client_name: string;
  project_url: string;
  technologies: string;
  is_featured: boolean;
  is_published: boolean;
  sort_order: number;
  thumbnail_url: string;
  thumbnail_path: string;
  alt_text: string;
}

const emptyForm: ProjectForm = {
  title: "",
  slug: "",
  category: "Web",
  description: "",
  client_name: "",
  project_url: "",
  technologies: "",
  is_featured: false,
  is_published: true,
  sort_order: 0,
  thumbnail_url: "",
  thumbnail_path: "",
  alt_text: "",
};

interface ThumbnailHistoryItem {
  name: string;
  path: string;
  url: string;
  createdAt: string;
  size: number;
}

const AdminPortfolio = () => {
  const qc = useQueryClient();
  const { data: projects, isLoading } = useAdminPortfolio();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [history, setHistory] = useState<ThumbnailHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Quick Publish state
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickUrls, setQuickUrls] = useState("");
  const [quickCategory, setQuickCategory] = useState("Web");
  
  const [quickPublishing, setQuickPublishing] = useState(false);
  const [quickFallbackFile, setQuickFallbackFile] = useState<File | null>(null);
  const [quickFallbackPreview, setQuickFallbackPreview] = useState<string>("");
  const [quickFallbackUploading, setQuickFallbackUploading] = useState(false);

  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!filtered) return;
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((p) => p.id)));
    }
  };

  const bulkMutation = useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: Record<string, any> }) => {
      const { error } = await supabase.from("portfolio_projects").update(updates as any).in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-portfolio"] });
      qc.invalidateQueries({ queryKey: ["portfolio-projects"] });
      setSelected(new Set());
      const action = Object.keys(vars.updates)[0];
      toast.success(`${vars.ids.length} projects updated`);
    },
    onError: (e) => toast.error(e.message),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("portfolio_projects").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      qc.invalidateQueries({ queryKey: ["admin-portfolio"] });
      qc.invalidateQueries({ queryKey: ["portfolio-projects"] });
      setSelected(new Set());
      setBulkDeleteConfirm(false);
      toast.success(`${ids.length} projects deleted`);
    },
    onError: (e) => toast.error(e.message),
  });

  const saveMutation = useMutation({
    mutationFn: async (data: ProjectForm & { id?: string }) => {
      const techArray = data.technologies
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      // Auto-generate alt if user left it blank
      const finalAlt =
        data.alt_text?.trim() ||
        generateAltText({
          title: data.title,
          category: data.category,
          clientName: data.client_name || null,
          description: data.description || null,
          technologies: techArray,
        });

      const payload = {
        title: data.title,
        slug: data.slug,
        category: data.category,
        description: data.description || null,
        client_name: data.client_name || null,
        project_url: data.project_url || null,
        technologies: techArray,
        is_featured: data.is_featured,
        is_published: data.is_published,
        sort_order: data.sort_order,
        thumbnail_url: data.thumbnail_url || null,
        thumbnail_path: data.thumbnail_path || null,
        alt_text: finalAlt,
      };

      if (data.id) {
        const { error } = await supabase.from("portfolio_projects").update(payload as any).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("portfolio_projects").insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-portfolio"] });
      qc.invalidateQueries({ queryKey: ["portfolio-projects"] });
      setDialogOpen(false);
      setEditId(null);
      toast.success(editId ? "Project updated" : "Project created");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("portfolio_projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-portfolio"] });
      qc.invalidateQueries({ queryKey: ["portfolio-projects"] });
      setDeleteConfirm(null);
      toast.success("Project deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: boolean }) => {
      const { error } = await supabase.from("portfolio_projects").update({ [field]: value } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-portfolio"] });
      qc.invalidateQueries({ queryKey: ["portfolio-projects"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const uploadFile = async (file: File) => {
    setUploadError(null);

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      const msg = `Unsupported file type: ${file.type || "unknown"}. Use JPG, PNG, WEBP, GIF, or SVG.`;
      setUploadError(msg);
      toast.error(msg);
      return;
    }
    // Validate size
    if (file.size > MAX_SIZE) {
      const msg = `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 5MB.`;
      setUploadError(msg);
      toast.error(msg);
      return;
    }

    // Verify auth (RLS requires admin)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      const msg = "You must be signed in as an admin to upload images.";
      setUploadError(msg);
      toast.error(msg);
      return;
    }

    const safeSlug = (form.slug || "project").replace(/[^a-z0-9-]/gi, "-").toLowerCase();
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";

    // REPLACE FLOW: overwrite the same stable path on every upload.
    // Versioned snapshot is also stored under /history/ for the history panel.
    const stablePath = form.thumbnail_path || `projects/${safeSlug}/thumbnail.${ext}`;
    const historyPath = `projects/${safeSlug}/history/${Date.now()}.${ext}`;

    setUploading(true);
    setUploadProgress(10);
    try {
      setUploadProgress(30);
      const { error: uploadErr } = await supabase.storage
        .from("portfolio")
        .upload(stablePath, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
      if (uploadErr) throw uploadErr;

      setUploadProgress(60);
      // Snapshot copy for history (best-effort)
      const { error: histErr } = await supabase.storage
        .from("portfolio")
        .upload(historyPath, file, { upsert: false, contentType: file.type, cacheControl: "3600" });
      if (histErr) console.warn("History snapshot failed:", histErr.message);

      setUploadProgress(85);
      const { data } = supabase.storage.from("portfolio").getPublicUrl(stablePath);
      // Cache-bust so the browser shows the new image immediately
      const bustedUrl = `${data.publicUrl}?v=${Date.now()}`;

      setForm((f) => ({
        ...f,
        thumbnail_url: bustedUrl,
        thumbnail_path: stablePath,
        alt_text:
          f.alt_text ||
          generateAltText({
            title: f.title,
            category: f.category,
            clientName: f.client_name || null,
            description: f.description || null,
            technologies: f.technologies.split(",").map((t) => t.trim()).filter(Boolean),
          }),
      }));
      setUploadProgress(100);
      await loadHistory(safeSlug);
      toast.success("Thumbnail replaced");
    } catch (err: any) {
      const msg = err?.message?.includes("row-level security")
        ? "Permission denied — admin access required to upload."
        : err?.message || "Upload failed";
      setUploadError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 800);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await uploadFile(file);
    e.target.value = "";
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await uploadFile(file);
  };

  // ===== Upload history =====
  const loadHistory = async (slug: string) => {
    if (!slug) {
      setHistory([]);
      return;
    }
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from("portfolio")
        .list(`projects/${slug}/history`, {
          limit: 5,
          sortBy: { column: "created_at", order: "desc" },
        });
      if (error) {
        setHistory([]);
        return;
      }
      const items: ThumbnailHistoryItem[] = (data || [])
        .filter((f) => f.name && !f.name.endsWith("/"))
        .slice(0, 5)
        .map((f) => {
          const path = `projects/${slug}/history/${f.name}`;
          const { data: pub } = supabase.storage.from("portfolio").getPublicUrl(path);
          return {
            name: f.name,
            path,
            url: pub.publicUrl,
            createdAt: (f as any).created_at || f.updated_at || new Date().toISOString(),
            size: (f as any).metadata?.size || 0,
          };
        });
      setHistory(items);
    } finally {
      setHistoryLoading(false);
    }
  };

  const reselectFromHistory = async (item: ThumbnailHistoryItem) => {
    if (!form.slug) return;
    const safeSlug = form.slug.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
    const ext = item.name.split(".").pop()?.toLowerCase() || "png";
    const stablePath = form.thumbnail_path || `projects/${safeSlug}/thumbnail.${ext}`;

    try {
      setUploading(true);
      setUploadProgress(20);
      const { data: blob, error: dlErr } = await supabase.storage.from("portfolio").download(item.path);
      if (dlErr) throw dlErr;

      setUploadProgress(60);
      const { error: upErr } = await supabase.storage
        .from("portfolio")
        .upload(stablePath, blob, { upsert: true, cacheControl: "3600", contentType: blob.type });
      if (upErr) throw upErr;

      setUploadProgress(90);
      const { data: pub } = supabase.storage.from("portfolio").getPublicUrl(stablePath);
      setForm((f) => ({
        ...f,
        thumbnail_url: `${pub.publicUrl}?v=${Date.now()}`,
        thumbnail_path: stablePath,
      }));
      setUploadProgress(100);
      toast.success("Restored from history");
    } catch (err: any) {
      toast.error(err?.message || "Restore failed");
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 800);
    }
  };

  // ===== Quick Publish: bulk-create projects from URLs =====
  const handleQuickPublish = async () => {
    const urls = quickUrls
      .split(/\s+|,/)
      .map((u) => u.trim())
      .filter(Boolean);

    if (urls.length === 0) {
      toast.error("Paste at least one URL");
      return;
    }

    setQuickPublishing(true);
    try {
      // If a fallback image is provided, upload it once to the shared
      // portfolio bucket and reuse the URL for any project where the
      // auto-screenshot is disabled or known to fail.
      let fallbackUrl = "";
      if (quickFallbackFile) {
        if (!ALLOWED_TYPES.includes(quickFallbackFile.type)) {
          throw new Error("Unsupported fallback image type");
        }
        if (quickFallbackFile.size > MAX_SIZE) {
          throw new Error("Fallback image is larger than 5MB");
        }
        setQuickFallbackUploading(true);
        const ext = quickFallbackFile.name.split(".").pop()?.toLowerCase() || "png";
        const path = `quick-publish/fallback-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("portfolio")
          .upload(path, quickFallbackFile, {
            upsert: false,
            contentType: quickFallbackFile.type,
            cacheControl: "3600",
          });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("portfolio").getPublicUrl(path);
        fallbackUrl = pub.publicUrl;
        setQuickFallbackUploading(false);
      }

      const baseSort = (projects?.length || 0) + 1;
      const rows = urls.map((raw, i) => {
        let url = raw;
        if (!/^https?:\/\//i.test(url)) url = "https://" + url;
        let host = url;
        try {
          host = new URL(url).hostname.replace(/^www\./, "");
        } catch {
          /* ignore */
        }
        const namePart = host.split(".")[0] || host;
        const title = namePart
          .replace(/[-_]+/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        const slug = host.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
        // Auto-screenshot disabled by default — providers like thum.io often
        // return "Image not authorized". Use uploaded fallback or null so the
        // public card renders our branded placeholder instead.
        const thumbnail_url = fallbackUrl || null;
        return {
          title,
          slug,
          category: quickCategory,
          description: `${quickCategory} project — ${host}`,
          project_url: url,
          thumbnail_url,
          technologies: [] as string[],
          is_published: true,
          is_featured: false,
          sort_order: baseSort + i,
          alt_text: generateAltText({
            title,
            category: quickCategory,
            clientName: null,
            description: null,
            technologies: [],
          }),
        };
      });

      const { error } = await supabase.from("portfolio_projects").insert(rows as any);
      if (error) throw error;

      qc.invalidateQueries({ queryKey: ["admin-portfolio"] });
      qc.invalidateQueries({ queryKey: ["portfolio-projects"] });
      toast.success(`${rows.length} project${rows.length > 1 ? "s" : ""} published`);
      setQuickOpen(false);
      setQuickUrls("");
      setQuickFallbackFile(null);
      setQuickFallbackPreview("");
    } catch (err: any) {
      toast.error(err?.message || "Quick publish failed");
    } finally {
      setQuickPublishing(false);
      setQuickFallbackUploading(false);
    }
  };

  const openCreate = () => {
    setEditId(null);
    setForm({ ...emptyForm, sort_order: (projects?.length || 0) + 1 });
    setHistory([]);
    setDialogOpen(true);
  };

  const openEdit = (p: any) => {
    setEditId(p.id);
    setForm({
      title: p.title,
      slug: p.slug,
      category: p.category,
      description: p.description || "",
      client_name: p.client_name || "",
      project_url: p.project_url || "",
      technologies: (p.technologies || []).join(", "),
      is_featured: p.is_featured,
      is_published: p.is_published,
      sort_order: p.sort_order,
      thumbnail_url: p.thumbnail_url || "",
      thumbnail_path: p.thumbnail_path || "",
      alt_text: p.alt_text || "",
    });
    setDialogOpen(true);
    if (p.slug) loadHistory(p.slug);
  };

  const handleSave = () => {
    if (!form.title || !form.slug) {
      toast.error("Title and slug are required");
      return;
    }
    saveMutation.mutate({ ...form, id: editId || undefined });
  };

  const autoSlug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const filtered = projects?.filter((p) => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "all" || p.category === filterCat;
    return matchSearch && matchCat;
  });

  return (
    <SuperAdminLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">Portfolio Projects</h1>
        <div className="flex gap-2">
          <Button onClick={() => setQuickOpen(true)} variant="outline" className="gap-2">
            <Zap className="w-4 h-4" /> Quick Publish
          </Button>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> Add Project
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Actions Bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
          <span className="text-sm font-medium text-foreground">{selected.size} selected</span>
          <div className="flex items-center gap-2 ml-auto">
            <Button size="sm" variant="outline" onClick={() => bulkMutation.mutate({ ids: [...selected], updates: { is_published: true } })} disabled={bulkMutation.isPending}>
              <Eye className="w-3.5 h-3.5 mr-1.5" /> Publish
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkMutation.mutate({ ids: [...selected], updates: { is_published: false } })} disabled={bulkMutation.isPending}>
              <EyeOff className="w-3.5 h-3.5 mr-1.5" /> Unpublish
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkMutation.mutate({ ids: [...selected], updates: { is_featured: true } })} disabled={bulkMutation.isPending}>
              <Star className="w-3.5 h-3.5 mr-1.5" /> Feature
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setBulkDeleteConfirm(true)} disabled={bulkDeleteMutation.isPending}>
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-9 text-muted-foreground">Loading...</div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="p-3 w-10">
                    <Checkbox
                      checked={filtered && filtered.length > 0 && selected.size === filtered.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground w-8">#</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Thumbnail</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Title</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Category</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">URL</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Featured</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Published</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered?.map((p) => (
                  <tr key={p.id} className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${selected.has(p.id) ? "bg-primary/5" : ""}`}>
                    <td className="p-3">
                      <Checkbox
                        checked={selected.has(p.id)}
                        onCheckedChange={() => toggleSelect(p.id)}
                      />
                    </td>
                    <td className="p-3 text-muted-foreground">{p.sort_order}</td>
                    <td className="p-3">
                      {p.thumbnail_url ? (
                        <img src={p.thumbnail_url} alt={p.alt_text || p.title} className="w-12 h-8 rounded object-cover" />
                      ) : (
                        <div className="w-12 h-8 rounded bg-secondary flex items-center justify-center text-xs text-muted-foreground">—</div>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="font-medium text-foreground">{p.title}</span>
                      <span className="block md:hidden text-xs text-muted-foreground mt-0.5">{p.category}</span>
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      <Badge variant="outline" className="text-xs">{p.category}</Badge>
                    </td>
                    <td className="p-3 hidden lg:table-cell">
                      {p.project_url ? (
                        <a href={p.project_url} target="_blank" rel="noopener noreferrer" className="text-primary text-xs hover:underline truncate block max-w-[200px]">
                          {p.project_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <Switch
                        checked={p.is_featured}
                        onCheckedChange={(v) => toggleMutation.mutate({ id: p.id, field: "is_featured", value: v })}
                      />
                    </td>
                    <td className="p-3 text-center">
                      <Switch
                        checked={p.is_published}
                        onCheckedChange={(v) => toggleMutation.mutate({ id: p.id, field: "is_published", value: v })}
                      />
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(p.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered?.length === 0 && (
            <div className="text-center py-9 text-muted-foreground">No projects found.</div>
          )}
        </div>
      )}

      <div className="mt-3 text-xs text-muted-foreground">
        {filtered?.length} of {projects?.length} projects
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Project" : "Add Project"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    setForm((f) => ({ ...f, title, slug: editId ? f.slug : autoSlug(title) }));
                  }}
                  placeholder="Project title"
                />
              </div>
              <div className="space-y-2">
                <Label>Slug *</Label>
                <Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="project-slug" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} placeholder="Brief project description..." />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Project URL</Label>
                <Input value={form.project_url} onChange={(e) => setForm((f) => ({ ...f, project_url: e.target.value }))} placeholder="https://example.com" />
              </div>
              <div className="space-y-2">
                <Label>Client Name</Label>
                <Input value={form.client_name} onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))} placeholder="Acme Corp" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Technologies (comma-separated)</Label>
              <Input value={form.technologies} onChange={(e) => setForm((f) => ({ ...f, technologies: e.target.value }))} placeholder="WordPress, Elementor, CSS" />
            </div>

            {/* Thumbnail */}
            <div className="space-y-2">
              <Label>Thumbnail</Label>
              <div
                className={`flex items-start gap-4 rounded-lg p-3 border-2 border-dashed transition-colors ${
                  isDragging ? "border-primary bg-primary/5" : "border-transparent"
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                {form.thumbnail_url ? (
                  <div className="relative shrink-0">
                    <img src={form.thumbnail_url} alt={form.alt_text || form.title || "Project thumbnail"} className="w-32 h-20 rounded-lg object-cover border border-border" />
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, thumbnail_url: "" }))}
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                      aria-label="Remove image"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-32 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground text-xs shrink-0">
                    {isDragging ? "Drop here" : "No image"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <label className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-secondary/30 text-sm transition-colors ${uploading ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:bg-secondary/50"}`}>
                    <Upload className="w-4 h-4" />
                    {uploading ? `Uploading... ${uploadProgress}%` : "Upload or drop image"}
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" className="hidden" onChange={handleUpload} disabled={uploading} />
                  </label>

                  {uploading && (
                    <div className="mt-2 h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                      <div className="h-full bg-primary transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  )}

                  {uploadError && (
                    <div className="mt-2 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                      <X className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span className="flex-1">{uploadError}</span>
                      <button type="button" onClick={() => setUploadError(null)} className="hover:opacity-70" aria-label="Dismiss">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <p className="text-[11px] text-muted-foreground mt-1.5">JPG, PNG, WEBP, GIF, SVG · max 5MB · or paste URL:</p>
                  <Input
                    value={form.thumbnail_url}
                    onChange={(e) => setForm((f) => ({ ...f, thumbnail_url: e.target.value }))}
                    placeholder="https://..."
                    className="mt-1 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Alt text — auto-generated, editable */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Image Alt Text <span className="text-xs text-muted-foreground font-normal">(SEO &amp; accessibility)</span></Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => {
                    const techArray = form.technologies.split(",").map((t) => t.trim()).filter(Boolean);
                    setForm((f) => ({
                      ...f,
                      alt_text: generateAltText({
                        title: f.title,
                        category: f.category,
                        clientName: f.client_name || null,
                        description: f.description || null,
                        technologies: techArray,
                      }),
                    }));
                    toast.success("Alt text generated");
                  }}
                  disabled={!form.title}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Auto-generate
                </Button>
              </div>
              <Input
                value={form.alt_text}
                onChange={(e) => setForm((f) => ({ ...f, alt_text: e.target.value }))}
                placeholder="Auto-generated on upload — describes the image for search engines &amp; screen readers"
              />
            </div>

            {/* Upload history */}
            {editId && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" />
                    Upload History <span className="text-xs text-muted-foreground font-normal">(last 5)</span>
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => form.slug && loadHistory(form.slug)}
                    disabled={historyLoading}
                  >
                    {historyLoading ? "Loading…" : "Refresh"}
                  </Button>
                </div>
                {history.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground text-center">
                    {historyLoading ? "Loading history…" : "No previous uploads yet."}
                  </div>
                ) : (
                  <div className="grid grid-cols-5 gap-2">
                    {history.map((item) => (
                      <button
                        key={item.path}
                        type="button"
                        onClick={() => reselectFromHistory(item)}
                        disabled={uploading}
                        className="group relative aspect-video rounded-lg overflow-hidden border border-border bg-secondary/30 hover:border-primary transition-colors disabled:opacity-50"
                        title={`Restore upload from ${new Date(item.createdAt).toLocaleString()}`}
                      >
                        <img src={item.url} alt="Previous thumbnail" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-background/0 group-hover:bg-background/60 transition-colors flex items-center justify-center">
                          <RotateCcw className="w-4 h-4 text-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-background/90 to-transparent px-1.5 py-1 text-[10px] text-muted-foreground text-left">
                          {new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}{" "}
                          {new Date(item.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_featured} onCheckedChange={(v) => setForm((f) => ({ ...f, is_featured: v }))} />
                <Label className="cursor-pointer">Featured</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_published} onCheckedChange={(v) => setForm((f) => ({ ...f, is_published: v }))} />
                <Label className="cursor-pointer">Published</Label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : editId ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Project?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This action cannot be undone. The project will be permanently removed.</p>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation */}
      <Dialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {selected.size} Projects?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This action cannot be undone. All selected projects will be permanently removed.</p>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setBulkDeleteConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => bulkDeleteMutation.mutate([...selected])} disabled={bulkDeleteMutation.isPending}>
              {bulkDeleteMutation.isPending ? "Deleting..." : `Delete ${selected.size}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Publish Dialog */}
      <Dialog open={quickOpen} onOpenChange={setQuickOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Quick Publish Projects
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Paste one or more project URLs (one per line or comma-separated). Titles, slugs and
              alt text are auto-generated from the domain. If no thumbnail is provided, a styled
              placeholder is shown on the public site.
            </p>
            <div>
              <Label className="mb-1.5 block">Category</Label>
              <Select value={quickCategory} onValueChange={setQuickCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block">Project URLs</Label>
              <Textarea
                rows={8}
                placeholder={"https://example.com\nhttps://anotherproject.com"}
                value={quickUrls}
                onChange={(e) => setQuickUrls(e.target.value)}
              />
            </div>
            {/* Manual thumbnail upload — auto-screenshots are disabled to avoid unreliable captures */}
            <div className="rounded-lg border border-border p-3 space-y-3">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" />
                <div>
                  <div className="text-sm font-medium">Thumbnail image (optional)</div>
                  <div className="text-xs text-muted-foreground">
                    Used as the card image for every project below. If left empty, a branded placeholder is shown.
                  </div>
                </div>
              </div>

              {quickFallbackPreview ? (
                <div className="relative rounded-md overflow-hidden border border-border">
                  <img
                    src={quickFallbackPreview}
                    alt="Fallback thumbnail preview"
                    className="w-full h-32 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setQuickFallbackFile(null);
                      setQuickFallbackPreview("");
                    }}
                    className="absolute top-2 right-2 p-1 rounded-full bg-background/80 hover:bg-background border border-border"
                    aria-label="Remove fallback image"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 cursor-pointer rounded-md border border-dashed border-border bg-muted/30 hover:bg-muted/50 transition-colors py-4 text-sm text-muted-foreground">
                  <Upload className="w-4 h-4" />
                  Choose image (JPG, PNG, WEBP — max 5MB)
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      if (!ALLOWED_TYPES.includes(file.type)) {
                        toast.error("Unsupported image type");
                        return;
                      }
                      if (file.size > MAX_SIZE) {
                        toast.error("Image is larger than 5MB");
                        return;
                      }
                      setQuickFallbackFile(file);
                      setQuickFallbackPreview(URL.createObjectURL(file));
                    }}
                  />
                </label>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={() => setQuickOpen(false)} disabled={quickPublishing}>
              Cancel
            </Button>
            <Button onClick={handleQuickPublish} disabled={quickPublishing} className="gap-2">
              <Zap className="w-4 h-4" />
              {quickPublishing ? "Publishing..." : "Publish All"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
};

export default AdminPortfolio;

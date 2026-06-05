import { useEffect, useMemo, useState } from "react";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Star, Eye, EyeOff, Search, Sparkles, Database, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import SeoScorePanel from "@/components/admin/SeoScorePanel";
import OgImageUploader from "@/components/admin/OgImageUploader";
import { useBlogPostsAdmin, useUpsertBlogPost, useDeleteBlogPost } from "@/hooks/use-cms-data";

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  cover_image_url: string | null;
  category: string;
  tags: string[];
  author: string;
  read_minutes: number;
  is_featured: boolean;
  is_published: boolean;
  sort_order: number;
  published_at: string;
  created_at: string;
  updated_at: string;
  view_count?: number;
}

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

interface FormState {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url: string;
  category: string;
  tags: string;
  author: string;
  read_minutes: number;
  is_featured: boolean;
  is_published: boolean;
}

const empty: FormState = {
  title: "", slug: "", excerpt: "", content: "", cover_image_url: "",
  category: "General", tags: "", author: "Dynime Team",
  read_minutes: 6, is_featured: false, is_published: true,
};

const AdminBlog = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [seeding, setSeeding] = useState(false);

  const { data: posts = [], isLoading } = useBlogPostsAdmin();
  const upsertPost = useUpsertBlogPost();
  const deletePost = useDeleteBlogPost();

  // Realtime auto-sync — reflects external edits instantly
  useEffect(() => {
    const channel = supabase
      .channel("admin:blog_posts")
      .on("postgres_changes", { event: "*", schema: "public", table: "blog_posts" }, () => {
        qc.invalidateQueries({ queryKey: ["blog-posts-admin"] });
        qc.invalidateQueries({ queryKey: ["blog-posts"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const categories = useMemo(() => {
    const s = new Set<string>();
    posts.forEach((p) => s.add(p.category));
    return ["All", ...Array.from(s).sort()];
  }, [posts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return posts.filter((p) => {
      if (filterCat !== "All" && p.category !== filterCat) return false;
      if (!q) return true;
      return p.title.toLowerCase().includes(q) || p.slug.includes(q) || p.tags.some((t) => t.toLowerCase().includes(q));
    });
  }, [posts, search, filterCat]);

  const upsert = useMutation({
    mutationFn: async () => {
      const payload = {
        id: editId || undefined,
        title: form.title.trim(),
        slug: (form.slug || slugify(form.title)).trim(),
        excerpt: form.excerpt.trim() || null,
        content: form.content || null,
        cover_image_url: form.cover_image_url.trim() || null,
        category: form.category.trim() || "General",
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        author: form.author.trim() || "Dynime Team",
        read_minutes: Math.max(1, Number(form.read_minutes) || 6),
        is_featured: form.is_featured,
        is_published: form.is_published,
      };
      return upsertPost.mutateAsync(payload);
    },
    onSuccess: () => {
      toast.success(editId ? "Post updated" : "Post created");
      setOpen(false); setEditId(null); setForm(empty);
      qc.invalidateQueries({ queryKey: ["blog-posts-admin"] });
      qc.invalidateQueries({ queryKey: ["blog-posts"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to save"),
  });

  const togglePublish = useMutation({
    mutationFn: (p: BlogPost) => upsertPost.mutateAsync({ id: p.id, is_published: !p.is_published }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blog-posts-admin"] });
      qc.invalidateQueries({ queryKey: ["blog-posts"] });
    },
  });

  const toggleFeatured = useMutation({
    mutationFn: (p: BlogPost) => upsertPost.mutateAsync({ id: p.id, is_featured: !p.is_featured }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blog-posts-admin"] });
      qc.invalidateQueries({ queryKey: ["blog-posts"] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deletePost.mutateAsync(id),
    onSuccess: () => {
      toast.success("Post deleted");
      qc.invalidateQueries({ queryKey: ["blog-posts-admin"] });
      qc.invalidateQueries({ queryKey: ["blog-posts"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete"),
  });

  const startEdit = (p: BlogPost) => {
    setEditId(p.id);
    setForm({
      title: p.title, slug: p.slug, excerpt: p.excerpt ?? "",
      content: p.content ?? "", cover_image_url: p.cover_image_url ?? "",
      category: p.category, tags: p.tags.join(", "), author: p.author,
      read_minutes: p.read_minutes, is_featured: p.is_featured, is_published: p.is_published,
    });
    setOpen(true);
  };

  const startNew = () => { setEditId(null); setForm(empty); setOpen(true); };

  const seedPosts = async () => {
    if (!confirm("Import 244 SEO-optimized blog posts? Existing slugs are skipped.")) return;
    setSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke("seed-blog-posts", { body: {} });
      if (error) throw error;
      toast.success(`Imported ${data?.inserted ?? 0} new posts (${data?.skipped ?? 0} already existed)`);
      qc.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      qc.invalidateQueries({ queryKey: ["blog-posts"] });
    } catch (e: any) {
      toast.error(e.message || "Seed failed");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Blog Manager</h1>
            <p className="text-sm text-muted-foreground">{posts.length} posts · Manage SEO-optimized articles synced with the public /blog page</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={seedPosts} disabled={seeding}>
              <Database className="w-4 h-4 mr-2" />
              {seeding ? "Importing…" : "Import 244 SEO Posts"}
            </Button>
            <Button onClick={startNew}>
              <Plus className="w-4 h-4 mr-2" /> New Post
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search title, slug or tag…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setFilterCat(c)}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${
                  filterCat === c
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border overflow-hidden bg-card/50">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              No posts. Click <span className="font-semibold">Import 244 SEO Posts</span> or <span className="font-semibold">New Post</span>.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3">Post</th>
                    <th className="text-left px-4 py-3">Category</th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">Tags</th>
                    <th className="text-left px-4 py-3 hidden sm:table-cell">Views</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-right px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-t border-border hover:bg-secondary/20 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.cover_image_url ? (
                            <img src={p.cover_image_url} alt="" loading="lazy" className="w-12 h-12 rounded-md object-cover shrink-0" />
                          ) : (
                            <div className="w-12 h-12 rounded-md bg-secondary shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="font-medium truncate max-w-[360px]">{p.title}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[360px]">/{p.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><Badge variant="secondary">{p.category}</Badge></td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex flex-wrap gap-1 max-w-[260px]">
                          {p.tags.slice(0, 3).map((t) => (
                            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/70">{t}</span>
                          ))}
                          {p.tags.length > 3 && <span className="text-[10px] text-muted-foreground">+{p.tags.length - 3}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-xs tabular-nums text-muted-foreground">{(p.view_count ?? 0).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {p.is_published ? (
                            <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/20">Live</Badge>
                          ) : (
                            <Badge variant="outline">Draft</Badge>
                          )}
                          {p.is_featured && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <Button size="icon" variant="ghost" title="Open" asChild>
                            <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4" /></a>
                          </Button>
                          <Button size="icon" variant="ghost" title="Toggle featured" onClick={() => toggleFeatured.mutate(p)}>
                            <Star className={`w-4 h-4 ${p.is_featured ? "fill-amber-500 text-amber-500" : ""}`} />
                          </Button>
                          <Button size="icon" variant="ghost" title="Toggle publish" onClick={() => togglePublish.mutate(p)}>
                            {p.is_published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => startEdit(p)}><Pencil className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Delete this post?")) remove.mutate(p.id); }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> {editId ? "Edit Post" : "New Post"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: editId ? form.slug : slugify(e.target.value) })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Slug</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} />
              </div>
              <div>
                <Label>Category</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Excerpt (SEO meta description)</Label>
              <Textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} maxLength={180} rows={2} />
              <div className="text-[10px] text-muted-foreground mt-1">{form.excerpt.length}/160 — keep under 160 chars for best SEO</div>
            </div>
            <OgImageUploader
              value={form.cover_image_url}
              onChange={(url) => setForm({ ...form, cover_image_url: url })}
              context={{ title: form.title, description: form.excerpt }}
              folder={`og/blog/${form.slug || "draft"}`}
              label="Cover / Social Share Image"
            />
            <div>
              <Label>Content (HTML)</Label>
              <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={12} className="font-mono text-xs" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Tags (comma-separated)</Label>
                <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
              </div>
              <div>
                <Label>Author</Label>
                <Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
              </div>
              <div>
                <Label>Read minutes</Label>
                <Input type="number" min={1} value={form.read_minutes} onChange={(e) => setForm({ ...form, read_minutes: Number(e.target.value) })} />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
                Published
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} />
                Featured
              </label>
            </div>

            {/* Live SEO score */}
            <SeoScorePanel
              input={{
                title: form.title,
                metaDescription: form.excerpt,
                slug: form.slug,
                content: form.content,
                primaryKeyword: form.tags?.split(",")[0]?.trim(),
                secondaryKeywords: form.tags?.split(",").slice(1).map((s) => s.trim()).filter(Boolean),
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => upsert.mutate()} disabled={upsert.isPending || !form.title.trim()}>
              {upsert.isPending ? "Saving…" : editId ? "Save Changes" : "Create Post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
};

export default AdminBlog;

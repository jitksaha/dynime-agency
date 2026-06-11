import { useMemo, useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Briefcase, Star, Trash2, Edit2, Search, MapPin, Clock, ExternalLink, Copy, Link2, Globe2, Upload, Image as ImageIcon, X } from "lucide-react";
import { JOB_CHANNELS, findChannel, type PostingChannel } from "@/lib/job-channels";
import OfficeLocationsDialog, { useOfficeLocations } from "@/components/admin/OfficeLocationsDialog";
import { useCareersAdmin, useUpsertCareer, useDeleteCareer } from "@/hooks/use-cms-data";

interface JobPost {
  id: string;
  slug: string;
  title: string;
  department: string;
  location: string;
  employment_type: string;
  experience_level: string | null;
  salary_range: string | null;
  description: string | null;
  content_html: string | null;
  hero_image_url: string | null;
  responsibilities: string[];
  requirements: string[];
  apply_url: string;
  posting_channels: PostingChannel[];
  is_featured: boolean;
  is_active: boolean;
  sort_order: number;
  vacancies: number;
  office_location_id: string | null;
  posted_at: string;
}

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

const EMPTY = {
  slug: "",
  title: "",
  department: "Engineering",
  location: "Hybrid",
  employment_type: "Full-time",
  experience_level: "",
  salary_range: "",
  description: "",
  content_html: "",
  hero_image_url: "",
  responsibilities: [] as string[],
  requirements: [] as string[],
  apply_url: "",
  posting_channels: [] as PostingChannel[],
  is_featured: false,
  is_active: true,
  sort_order: 0,
  vacancies: 1,
  office_location_id: null as string | null,
};

const linesToArr = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);
const arrToLines = (a: string[]) => (a || []).join("\n");

const DEFAULT_HTML = `<h2>About the role</h2>
<p>Tell candidates about the role, the team, and the impact they'll have.</p>
<h2>What you'll do</h2>
<ul>
  <li>Ship product features end-to-end</li>
  <li>Collaborate with design and product</li>
</ul>
<h2>What we're looking for</h2>
<ul>
  <li>3+ years of relevant experience</li>
  <li>Strong communication skills</li>
</ul>`;

const OfficeSelect = ({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) => {
  const { data: offices = [], isLoading } = useOfficeLocations({ onlyActive: true });
  return (
    <Select
      value={value || "__none__"}
      onValueChange={(v) => onChange(v === "__none__" ? null : v)}
      disabled={isLoading}
    >
      <SelectTrigger><SelectValue placeholder="Select an office…" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">— No office —</SelectItem>
        {offices.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.name}{o.city ? ` · ${o.city}` : ""}{o.country ? `, ${o.country}` : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const AdminCareers = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<JobPost | null>(null);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [respText, setRespText] = useState("");
  const [reqText, setReqText] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  // Bulk channel editor state
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkUrls, setBulkUrls] = useState<Record<string, string>>({});
  const [bulkMode, setBulkMode] = useState<"merge" | "replace">("merge");
  const [heroUploading, setHeroUploading] = useState(false);

  const { data: jobs = [], isLoading } = useCareersAdmin();
  const upsertCareer = useUpsertCareer();
  const deleteCareer = useDeleteCareer();

  // Realtime: keep admin list in sync with DB and the public /careers page
  useEffect(() => {
    const channel = supabase
      .channel("careers-admin-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "careers" },
        () => {
          qc.invalidateQueries({ queryKey: ["careers-admin"] });
          qc.invalidateQueries({ queryKey: ["careers"] });
          qc.invalidateQueries({ queryKey: ["career"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        j.department.toLowerCase().includes(q) ||
        j.location.toLowerCase().includes(q),
    );
  }, [jobs, search]);

  const stats = useMemo(
    () => ({
      total: jobs.length,
      active: jobs.filter((j) => j.is_active).length,
      featured: jobs.filter((j) => j.is_featured).length,
      departments: new Set(jobs.map((j) => j.department)).size,
    }),
    [jobs],
  );

  // Auto-derive slug from title until user edits it
  useEffect(() => {
    if (!slugTouched && !editing) {
      setForm((f) => ({ ...f, slug: slugify(f.title) }));
    }
  }, [form.title, slugTouched, editing]);

  const resetForm = () => {
    setForm(EMPTY);
    setRespText("");
    setReqText("");
    setEditing(null);
    setSlugTouched(false);
  };

  const openNew = () => {
    resetForm();
    setForm({ ...EMPTY, content_html: DEFAULT_HTML });
    setOpen(true);
  };

  const openEdit = (j: JobPost) => {
    setEditing(j);
    setSlugTouched(true);
    setForm({
      slug: j.slug,
      title: j.title,
      department: j.department,
      location: j.location,
      employment_type: j.employment_type,
      experience_level: j.experience_level || "",
      salary_range: j.salary_range || "",
      description: j.description || "",
      content_html: j.content_html || "",
      hero_image_url: j.hero_image_url || "",
      responsibilities: j.responsibilities,
      requirements: j.requirements,
      apply_url: j.apply_url,
      posting_channels: Array.isArray(j.posting_channels) ? j.posting_channels : [],
      is_featured: j.is_featured,
      is_active: j.is_active,
      sort_order: j.sort_order,
      vacancies: j.vacancies ?? 1,
      office_location_id: j.office_location_id ?? null,
    });
    setRespText(arrToLines(j.responsibilities));
    setReqText(arrToLines(j.requirements));
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.title.trim() || !form.apply_url.trim()) {
        throw new Error("Title and apply URL are required");
      }
      const finalSlug = (form.slug || slugify(form.title)).trim();
      if (!finalSlug) throw new Error("Slug could not be generated");

      const payload = {
        id: editing?.id || undefined,
        slug: finalSlug,
        title: form.title,
        department: form.department,
        location: form.location,
        employment_type: form.employment_type,
        experience_level: form.experience_level || null,
        salary_range: form.salary_range || null,
        description: form.description || null,
        content_html: form.content_html || null,
        hero_image_url: form.hero_image_url || null,
        responsibilities: linesToArr(respText),
        requirements: linesToArr(reqText),
        apply_url: /^https?:\/\//i.test(form.apply_url.trim()) ? form.apply_url.trim() : `https://${form.apply_url.trim()}`,
        posting_channels: form.posting_channels
          .filter((c) => c.url?.trim())
          .map((c) => ({ ...c, url: /^https?:\/\//i.test(c.url.trim()) ? c.url.trim() : `https://${c.url.trim()}` })) as any,
        is_featured: form.is_featured,
        is_active: form.is_active,
        sort_order: form.sort_order,
        vacancies: Math.max(0, Number(form.vacancies) || 0),
        office_location_id: (form.location === "On-site" || form.location === "Hybrid") ? (form.office_location_id || null) : null,
      };
      return upsertCareer.mutateAsync(payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Job updated" : "Job posted");
      qc.invalidateQueries({ queryKey: ["careers-admin"] });
      setOpen(false);
      resetForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: "is_active" | "is_featured"; value: boolean }) => {
      const patch = field === "is_active" ? { is_active: value } : { is_featured: value };
      return upsertCareer.mutateAsync({ id, ...patch });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["careers-admin"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCareer.mutateAsync(id),
    onSuccess: () => {
      toast.success("Job deleted");
      qc.invalidateQueries({ queryKey: ["careers-admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ---- posting channel helpers ----
  const addChannel = (id: string) => {
    if (form.posting_channels.some((c) => c.id === id)) return;
    setForm({ ...form, posting_channels: [...form.posting_channels, { id, url: "" }] });
  };
  const updateChannel = (idx: number, patch: Partial<PostingChannel>) => {
    const next = [...form.posting_channels];
    next[idx] = { ...next[idx], ...patch };
    setForm({ ...form, posting_channels: next });
  };
  const removeChannel = (idx: number) => {
    setForm({ ...form, posting_channels: form.posting_channels.filter((_, i) => i !== idx) });
  };

  // ---- hero image upload (site-assets bucket) ----
  const uploadHeroImage = async (file: File) => {
    const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif"];
    const MAX = 5 * 1024 * 1024;
    if (!ALLOWED.includes(file.type)) { toast.error("Use PNG, JPG, WebP or GIF."); return; }
    if (file.size > MAX) { toast.error("Image must be under 5 MB."); return; }
    setHeroUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `careers/hero-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("site-assets")
        .upload(path, file, { upsert: true, contentType: file.type, cacheControl: "31536000" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("site-assets").getPublicUrl(path);
      setForm((f) => ({ ...f, hero_image_url: pub.publicUrl }));
      toast.success("Hero image uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setHeroUploading(false);
    }
  };

  const copyShareLink = (slug: string) => {
    const url = `${window.location.origin}/careers/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Public link copied");
  };

  // ---- bulk channel editor ----
  const openBulk = () => {
    setBulkSelected(new Set(jobs.filter((j) => j.is_active).map((j) => j.id)));
    setBulkUrls({});
    setBulkMode("merge");
    setBulkOpen(true);
  };

  const toggleBulkJob = (id: string) => {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const bulkApplyMutation = useMutation({
    mutationFn: async () => {
      const ids = Array.from(bulkSelected);
      if (ids.length === 0) throw new Error("Select at least one job");
      const incoming: PostingChannel[] = Object.entries(bulkUrls)
        .map(([id, url]) => ({ id, url: url.trim() }))
        .filter((c) => c.url);
      if (incoming.length === 0) throw new Error("Enter at least one platform URL");

      const targets = jobs.filter((j) => bulkSelected.has(j.id));
      await Promise.all(
        targets.map((j) => {
          let next: PostingChannel[];
          if (bulkMode === "replace") {
            next = incoming;
          } else {
            const map = new Map<string, PostingChannel>();
            (j.posting_channels || []).forEach((c) => map.set(c.id, c));
            incoming.forEach((c) => map.set(c.id, c));
            next = Array.from(map.values());
          }
          return upsertCareer.mutateAsync({
            id: j.id,
            posting_channels: next,
          });
        })
      );
    },
    onSuccess: () => {
      toast.success(`Updated ${bulkSelected.size} job${bulkSelected.size === 1 ? "" : "s"}`);
      qc.invalidateQueries({ queryKey: ["careers-admin"] });
      setBulkOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-primary" /> Job Posts
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create open positions, write rich descriptions, and track where each is cross-posted.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={openBulk}>
              <Globe2 className="w-4 h-4 mr-2" /> Bulk Channels
            </Button>
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
              <DialogTrigger asChild>
                <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> New Job</Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Job Post" : "Create Job Post"}</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }}
                className="space-y-5"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label>Title *</Label>
                    <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Senior Full Stack Engineer" required />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label className="flex items-center gap-2">
                      <Link2 className="w-3.5 h-3.5" /> URL Slug *
                      <span className="text-xs text-muted-foreground font-normal">/careers/{form.slug || "your-slug"}</span>
                    </Label>
                    <Input
                      value={form.slug}
                      onChange={(e) => { setSlugTouched(true); setForm({ ...form, slug: slugify(e.target.value) }); }}
                      placeholder="senior-full-stack-engineer"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Department</Label>
                    <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Location</Label>
                    <Select
                      value={["On-site", "Remote", "Hybrid"].includes(form.location) ? form.location : "Hybrid"}
                      onValueChange={(v) => setForm({ ...form, location: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["On-site", "Remote", "Hybrid"].map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {(form.location === "On-site" || form.location === "Hybrid") && (
                    <div className="space-y-1.5 md:col-span-2">
                      <div className="flex items-center justify-between gap-3">
                        <Label>Office location {form.location === "On-site" ? "*" : <span className="text-xs text-muted-foreground font-normal">(optional)</span>}</Label>
                        <OfficeLocationsDialog />
                      </div>
                      <OfficeSelect
                        value={form.office_location_id}
                        onChange={(v) => setForm({ ...form, office_location_id: v })}
                      />
                      <p className="text-[11px] text-muted-foreground">
                        {form.location === "On-site"
                          ? "Choose which office this on-site role is based at."
                          : "Hybrid roles can also be tied to an office — employees may need to come in occasionally."}
                      </p>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label>Employment Type</Label>
                    <Select value={form.employment_type} onValueChange={(v) => setForm({ ...form, employment_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Full-time", "Part-time", "Contract", "Internship", "Freelance"].map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Experience Level</Label>
                    <Input value={form.experience_level} onChange={(e) => setForm({ ...form, experience_level: e.target.value })} placeholder="e.g. Mid-level" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Salary Range</Label>
                    <Input value={form.salary_range} onChange={(e) => setForm({ ...form, salary_range: e.target.value })} placeholder="$60k – $90k" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Vacancies</Label>
                    <Input type="number" min={0} value={form.vacancies} onChange={(e) => setForm({ ...form, vacancies: Number(e.target.value) })} placeholder="1" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Sort Order</Label>
                    <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label>Primary Apply URL *</Label>
                    <Input
                      type="text"
                      inputMode="url"
                      required
                      value={form.apply_url}
                      onChange={(e) => setForm({ ...form, apply_url: e.target.value })}
                      placeholder="https://forms.example.com/apply"
                    />
                    <p className="text-[11px] text-muted-foreground">Paste any URL — we'll add https:// automatically if missing.</p>
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label className="flex items-center gap-2">
                      <ImageIcon className="w-3.5 h-3.5" /> Hero Image
                      <span className="text-xs text-muted-foreground font-normal">Recommended 1600×600 · PNG/JPG/WebP · ≤ 5 MB</span>
                    </Label>
                    {form.hero_image_url ? (
                      <div className="relative group rounded-lg overflow-hidden border border-border bg-muted/40">
                        <img src={form.hero_image_url} alt="Hero preview" className="w-full h-40 object-cover" />
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          className="absolute top-2 right-2 h-7 w-7 p-0"
                          onClick={() => setForm({ ...form, hero_image_url: "" })}
                          title="Remove"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <label
                        className={`flex flex-col items-center justify-center gap-1 h-32 rounded-lg border-2 border-dashed border-border bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors ${heroUploading ? "opacity-60 pointer-events-none" : ""}`}
                      >
                        <Upload className="w-5 h-5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {heroUploading ? "Uploading…" : "Click or drop image"}
                        </span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) uploadHeroImage(f);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    )}
                    <Input
                      value={form.hero_image_url}
                      onChange={(e) => setForm({ ...form, hero_image_url: e.target.value })}
                      placeholder="…or paste an image URL"
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label>Short Description (card preview)</Label>
                    <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label>Full Description (HTML supported)</Label>
                    <Textarea
                      rows={10}
                      value={form.content_html}
                      onChange={(e) => setForm({ ...form, content_html: e.target.value })}
                      placeholder="<h2>About the role</h2><p>...</p>"
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      You can use HTML: headings, lists, links, bold, etc. Scripts are stripped for security.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Responsibilities <span className="text-xs text-muted-foreground">(one per line)</span></Label>
                    <Textarea rows={5} value={respText} onChange={(e) => setRespText(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Requirements <span className="text-xs text-muted-foreground">(one per line)</span></Label>
                    <Textarea rows={5} value={reqText} onChange={(e) => setReqText(e.target.value)} />
                  </div>
                </div>

                {/* Posting channels */}
                <div className="space-y-3 pt-3 border-t border-border">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <Label className="text-base">Cross-posted on</Label>
                      <p className="text-xs text-muted-foreground">Track every platform where this job is published.</p>
                    </div>
                    <Select onValueChange={addChannel}>
                      <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="+ Add platform" /></SelectTrigger>
                      <SelectContent>
                        {JOB_CHANNELS.filter((c) => !form.posting_channels.some((x) => x.id === c.id)).map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {form.posting_channels.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic px-1">No channels yet — add Bdjobs, LinkedIn, Indeed, etc.</p>
                  ) : (
                    <div className="space-y-2">
                      {form.posting_channels.map((ch, idx) => {
                        const def = findChannel(ch.id);
                        return (
                          <div key={ch.id + idx} className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-2">
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-semibold text-white shrink-0" style={{ backgroundColor: def.color }}>
                              {def.name}
                            </span>
                            <Input
                              value={ch.url}
                              onChange={(e) => updateChannel(idx, { url: e.target.value })}
                              placeholder={def.hint}
                              className="h-9"
                            />
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeChannel(idx)} className="text-destructive hover:bg-destructive/10">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-6 pt-2 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                    <Label className="cursor-pointer">Active</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} />
                    <Label className="cursor-pointer">Featured</Label>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? "Saving…" : editing ? "Update Job" : "Publish Job"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats.total, icon: Briefcase },
            { label: "Active", value: stats.active, icon: Clock },
            { label: "Featured", value: stats.featured, icon: Star },
            { label: "Departments", value: stats.departments, icon: MapPin },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 rounded-md bg-primary/10 text-primary"><s.icon className="w-3.5 h-3.5" /></div>
                  <p className="text-xs font-semibold text-muted-foreground">{s.label}</p>
                </div>
                <p className="text-xl font-bold text-foreground">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="text-lg">All Jobs</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{filtered.length} of {jobs.length} positions</p>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by title, dept, location…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            {isLoading ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-40 rounded-xl bg-muted/40 animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Briefcase className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
                <p className="text-sm font-medium">No jobs found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {search ? "Try a different search term." : 'Click "New Job" to create one.'}
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((j) => {
                  const channels = Array.isArray(j.posting_channels) ? j.posting_channels : [];
                  return (
                    <div
                      key={j.id}
                      className={`group relative flex flex-col rounded-xl border bg-card transition-all hover:shadow-lg hover:-translate-y-0.5 ${
                        j.is_active ? "border-border/70" : "border-dashed border-muted-foreground/30 opacity-75"
                      }`}
                    >
                      {/* Hero strip */}
                      <div className="relative h-20 rounded-t-xl overflow-hidden bg-gradient-to-br from-primary/15 via-primary/5 to-muted">
                        {j.hero_image_url && (
                          <img src={j.hero_image_url} alt="" className="w-full h-full object-cover opacity-90" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
                        {j.is_featured && (
                          <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider shadow">
                            <Star className="w-2.5 h-2.5 fill-current" /> Featured
                          </span>
                        )}
                        <div className="absolute top-2 right-2 flex items-center gap-1.5 rounded-full bg-background/90 backdrop-blur px-2 py-1 shadow-sm">
                          <Switch
                            checked={j.is_active}
                            onCheckedChange={(v) => toggleMutation.mutate({ id: j.id, field: "is_active", value: v })}
                            className="scale-75 -my-1"
                          />
                          <span className="text-[10px] font-semibold">{j.is_active ? "Live" : "Off"}</span>
                        </div>
                      </div>

                      {/* Body */}
                      <div className="flex-1 p-4 pt-3 flex flex-col">
                        <h3 className="font-heading font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                          {j.title}
                        </h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">/{j.slug}</p>

                        <div className="flex items-center flex-wrap gap-1.5 mt-2.5">
                          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-medium">{j.department}</Badge>
                          <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-medium">
                            <Clock className="w-2.5 h-2.5 mr-1" />{j.employment_type}
                          </Badge>
                          {j.location && (
                            <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-medium">
                              <MapPin className="w-2.5 h-2.5 mr-1" />{j.location}
                            </Badge>
                          )}
                        </div>

                        {/* Channels */}
                        <div className="mt-3 flex items-center gap-1 flex-wrap min-h-[20px]">
                          {channels.length === 0 ? (
                            <span className="text-[10px] text-muted-foreground italic">No cross-posts</span>
                          ) : (
                            <>
                              {channels.slice(0, 5).map((ch, i) => {
                                const def = findChannel(ch.id);
                                return (
                                  <span
                                    key={i}
                                    title={def.name}
                                    className="inline-flex items-center justify-center w-5 h-5 rounded text-[9px] font-bold text-white shrink-0 ring-1 ring-background"
                                    style={{ backgroundColor: def.color }}
                                  >
                                    {def.name.slice(0, 1).toUpperCase()}
                                  </span>
                                );
                              })}
                              {channels.length > 5 && (
                                <span className="text-[10px] text-muted-foreground font-medium">+{channels.length - 5}</span>
                              )}
                            </>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="mt-auto pt-3 flex items-center justify-between gap-1 border-t border-border/60 -mx-4 px-3 mt-3">
                          <div className="flex items-center">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Copy public link" onClick={() => copyShareLink(j.slug)}>
                              <Copy className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Open public page" asChild>
                              <a href={`/careers/${j.slug}`} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              title="Toggle featured"
                              onClick={() => toggleMutation.mutate({ id: j.id, field: "is_featured", value: !j.is_featured })}
                            >
                              <Star className={`w-3.5 h-3.5 ${j.is_featured ? "fill-amber-500 text-amber-500" : ""}`} />
                            </Button>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs" onClick={() => openEdit(j)}>
                              <Edit2 className="w-3 h-3 mr-1" /> Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              title="Delete"
                              onClick={() => {
                                if (confirm(`Delete "${j.title}"? This cannot be undone.`)) deleteMutation.mutate(j.id);
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bulk channel editor */}
        <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Globe2 className="w-5 h-5 text-primary" /> Bulk Edit Posting Channels
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5">
              <div>
                <Label className="text-sm">Platform URLs</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Enter a URL for each platform you want to set. Empty fields are skipped.
                </p>
                <div className="space-y-2">
                  {JOB_CHANNELS.map((c) => (
                    <div key={c.id} className="flex items-center gap-2">
                      <span
                        className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold text-white shrink-0 w-[110px] justify-center"
                        style={{ backgroundColor: c.color }}
                      >
                        {c.name}
                      </span>
                      <Input
                        value={bulkUrls[c.id] || ""}
                        onChange={(e) => setBulkUrls({ ...bulkUrls, [c.id]: e.target.value })}
                        placeholder={c.hint}
                        className="h-9"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Apply mode</Label>
                <Select value={bulkMode} onValueChange={(v: "merge" | "replace") => setBulkMode(v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="merge">Merge — keep existing, update entered platforms</SelectItem>
                    <SelectItem value="replace">Replace — overwrite all channels</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm">
                    Apply to ({bulkSelected.size}/{jobs.length} jobs)
                  </Label>
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setBulkSelected(new Set(jobs.map((j) => j.id)))}>
                      All
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setBulkSelected(new Set())}>
                      None
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setBulkSelected(new Set(jobs.filter((j) => j.is_active).map((j) => j.id)))}>
                      Active only
                    </Button>
                  </div>
                </div>
                <div className="border border-border rounded-md max-h-64 overflow-y-auto divide-y divide-border">
                  {jobs.map((j) => (
                    <label key={j.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/40 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bulkSelected.has(j.id)}
                        onChange={() => toggleBulkJob(j.id)}
                        className="h-4 w-4 accent-primary"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{j.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {j.department} · /{j.slug} · {(j.posting_channels || []).length} channels
                        </p>
                      </div>
                      {!j.is_active && <Badge variant="secondary" className="text-[10px]">Hidden</Badge>}
                    </label>
                  ))}
                  {jobs.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">No jobs available</p>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setBulkOpen(false)}>Cancel</Button>
              <Button onClick={() => bulkApplyMutation.mutate()} disabled={bulkApplyMutation.isPending}>
                {bulkApplyMutation.isPending ? "Applying…" : `Apply to ${bulkSelected.size} job${bulkSelected.size === 1 ? "" : "s"}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SuperAdminLayout>
  );
};

export default AdminCareers;

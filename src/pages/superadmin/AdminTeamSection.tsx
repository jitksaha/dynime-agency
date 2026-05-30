import { useEffect, useMemo, useState } from "react";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, Save, ChevronUp, ChevronDown, Users, Loader2, IdCard, Search, X, Pause, Play, EyeOff } from "lucide-react";
import { useHomeSections, HOME_SECTIONS_KEY } from "@/hooks/use-home-sections";
import type { TeamMember } from "@/lib/home-sections-defaults";
import TeamAvatarUploader from "@/components/admin/TeamAvatarUploader";
import { useTeamCardIds, lookupTeamCardId, teamSectionSubjectKey, teamSectionSubjectKeys } from "@/hooks/use-team-card-ids";
import { Pencil, Check } from "lucide-react";

const COLOR_PRESETS = [
  "from-blue-500/20 to-indigo-500/20",
  "from-violet-500/20 to-purple-500/20",
  "from-pink-500/20 to-rose-500/20",
  "from-amber-500/20 to-orange-500/20",
  "from-cyan-500/20 to-sky-500/20",
  "from-emerald-500/20 to-teal-500/20",
  "from-slate-500/20 to-gray-500/20",
  "from-rose-500/20 to-pink-500/20",
  "from-yellow-500/20 to-amber-500/20",
  "from-fuchsia-500/20 to-pink-500/20",
  "from-green-500/20 to-emerald-500/20",
  "from-indigo-500/20 to-blue-500/20",
];

const initials = (name: string) =>
  name.trim().split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";

const slug = (value?: string | null) =>
  (value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const freshEmployeeKey = () => `cms-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const keyBaseFor = (m: TeamMember) =>
  `cms-${[slug(m.name), slug(m.role), slug(m.specialty)].filter(Boolean).join("-") || freshEmployeeKey()}`.slice(0, 96);

const ensureEmployeeKeys = (members: TeamMember[]) => {
  const seen = new Set<string>();
  return members.map((m) => {
    const base = (m.employeeKey?.trim() || keyBaseFor(m)).replace(/-+$/g, "") || freshEmployeeKey();
    let key = base;
    let n = 2;
    while (seen.has(key)) key = `${base}-${n++}`;
    seen.add(key);
    return { ...m, employeeKey: key };
  });
};

const sameEmployee = (a: TeamMember, b: TeamMember) =>
  !!a.employeeKey && !!b.employeeKey
    ? a.employeeKey === b.employeeKey
    : a.name === b.name && a.role === b.role && a.specialty === b.specialty;

const blank = (i = 0): TeamMember => ({
  name: "",
  role: "",
  initials: "",
  specialty: "",
  color: COLOR_PRESETS[i % COLOR_PRESETS.length],
  employeeKey: freshEmployeeKey(),
});

const AdminTeamSection = () => {
  const { data: sections } = useHomeSections();
  const { data: cardMap } = useTeamCardIds();
  const qc = useQueryClient();
  const [eyebrow, setEyebrow] = useState("");
  const [headingPrefix, setHeadingPrefix] = useState("");
  const [headingHighlight, setHeadingHighlight] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<TeamMember[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  const visibleIndices = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = items.map((_, i) => i);
    if (!q) return all;
    return all.filter((i) => {
      const m = items[i];
      const cid = lookupTeamCardId(cardMap, m, i) || "";
      return [m.name, m.role, m.email, m.phone, m.specialty, cid]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [items, query, cardMap]);

  useEffect(() => {
    if (!sections) return;
    setEyebrow(sections.team.eyebrow);
    setHeadingPrefix(sections.team.heading_prefix);
    setHeadingHighlight(sections.team.heading_highlight);
    setDescription(sections.team.description);
    setItems(ensureEmployeeKeys(sections.team.items));
    setEnabled(sections.team.enabled);
  }, [sections]);

  const update = (i: number, patch: Partial<TeamMember>) =>
    setItems((arr) => arr.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));

  const add = () => setItems((arr) => [...arr, blank(arr.length)]);
  const remove = (i: number) => setItems((arr) => arr.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) =>
    setItems((arr) => {
      const j = i + dir;
      if (j < 0 || j >= arr.length) return arr;
      const next = arr.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const save = async () => {
    if (!sections) return;
    setSaving(true);
    try {
      const cleaned = ensureEmployeeKeys(items)
        .filter((m) => m.name.trim())
        .map((m) => {
          const prev = sections.team.items.find((p) => sameEmployee(p, m));
          const statusChanged = prev?.status !== m.status;
          return {
            ...m,
            initials: m.initials?.trim() || initials(m.name),
            status: m.status || "active",
            statusChangedAt: statusChanged ? new Date().toISOString() : m.statusChangedAt,
          };
        });
      const next = {
        ...sections,
        team: {
          enabled,
          eyebrow,
          heading_prefix: headingPrefix,
          heading_highlight: headingHighlight,
          description,
          items: cleaned,
        },
      };
      const { error } = await supabase
        .from("site_settings")
        .upsert([{ key: HOME_SECTIONS_KEY, value: JSON.stringify(next) }], { onConflict: "key" });
      if (error) throw error;
      toast.success("Team section saved. Frontend will update automatically.");
      qc.invalidateQueries({ queryKey: ["home-sections"] });
      qc.invalidateQueries({ queryKey: ["site-settings"] });
    } catch (e: any) {
      toast.error(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" /> Team Section
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Edit the team carousel shown on the homepage and About page. Changes go live instantly.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <RebuildIdsButton items={items} onDone={() => qc.invalidateQueries({ queryKey: ["team-card-ids"] })} />
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save changes
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Section heading</CardTitle>
            <CardDescription>Eyebrow, title and description shown above the carousel.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Eyebrow</Label>
              <Input value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Heading prefix</Label>
              <Input value={headingPrefix} onChange={(e) => setHeadingPrefix(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Heading highlight</Label>
              <Input value={headingHighlight} onChange={(e) => setHeadingHighlight(e.target.value)} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Description</Label>
              <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm md:col-span-2">
              <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
              Show team section on the site
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <div>
              <CardTitle className="text-base">Members ({visibleIndices.length}/{items.length})</CardTitle>
              <CardDescription>Add, edit, reorder or delete team members.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search ID, name, email…"
                  className="h-8 w-56 pl-7 pr-7 text-xs"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <Button size="sm" variant="outline" onClick={add}>
                <Plus className="w-4 h-4 mr-1" /> Add member
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No members yet — click “Add member” to begin.</p>
            )}
            {items.length > 0 && visibleIndices.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No members match “{query}”.</p>
            )}
            {visibleIndices.map((i) => {
              const m = items[i];
              return (
              <div key={i} className={`rounded-xl border p-4 ${m.paused ? "border-amber-500/40 bg-amber-500/5" : "border-border bg-card/40"}`}>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <EmployeeIdEditor
                    subjectKey={teamSectionSubjectKey(i, m)}
                    member={m}
                    currentId={lookupTeamCardId(cardMap, m, i)}
                    onSaved={() => qc.invalidateQueries({ queryKey: ["team-card-ids"] })}
                  />
                  {m.paused && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-full px-2 py-0.5">
                      <EyeOff className="w-3 h-3" /> Hidden from public team
                    </span>
                  )}
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center gap-1 pt-1">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    <button title="Move up" className="text-muted-foreground hover:text-foreground" onClick={() => move(i, -1)}>
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button title="Move down" className="text-muted-foreground hover:text-foreground" onClick={() => move(i, 1)}>
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid flex-1 gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Name</Label>
                      <Input value={m.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="Jane Doe" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Role</Label>
                      <Input value={m.role} onChange={(e) => update(i, { role: e.target.value })} placeholder="Lead Designer" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Initials (optional)</Label>
                      <Input value={m.initials} onChange={(e) => update(i, { initials: e.target.value.toUpperCase() })} maxLength={3} placeholder={initials(m.name)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Color theme</Label>
                      <Select value={m.color} onValueChange={(v) => update(i, { color: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {COLOR_PRESETS.map((c) => (
                            <SelectItem key={c} value={c}>
                              <span className="flex items-center gap-2">
                                <span className={`inline-block w-4 h-4 rounded bg-gradient-to-br ${c}`} />
                                <span className="text-xs">{c.replace(/from-|to-|\/20/g, "")}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-xs">Specialty</Label>
                      <Input value={m.specialty} onChange={(e) => update(i, { specialty: e.target.value })} placeholder="React & Node.js" />
                    </div>

                    {/* --- Public details (also flow into the ID card) --- */}
                    <div className="md:col-span-2 mt-1 pt-3 border-t border-border/60">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                        Public details · synced to ID card
                      </p>
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-xs">Profile photo</Label>
                      <TeamAvatarUploader
                        value={m.photoUrl || ""}
                        onChange={(url) => update(i, { photoUrl: url })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Email</Label>
                      <Input type="email" value={m.email || ""} onChange={(e) => update(i, { email: e.target.value })} placeholder="jane@dynime.com" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Phone</Label>
                      <Input value={m.phone || ""} onChange={(e) => update(i, { phone: e.target.value })} placeholder="+880 ..." />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Country</Label>
                      <Input value={m.country || ""} onChange={(e) => update(i, { country: e.target.value })} placeholder="Bangladesh" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Joined date</Label>
                      <Input type="date" value={m.joinedAt || ""} onChange={(e) => update(i, { joinedAt: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Expire date (optional, contractual)</Label>
                      <Input type="date" value={m.expiresAt || ""} onChange={(e) => update(i, { expiresAt: e.target.value })} />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-xs">Short bio (optional)</Label>
                      <Textarea rows={2} value={m.bio || ""} onChange={(e) => update(i, { bio: e.target.value })} placeholder="One-liner shown on hover / detail." />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">LinkedIn URL</Label>
                      <Input value={m.linkedinUrl || ""} onChange={(e) => update(i, { linkedinUrl: e.target.value })} placeholder="https://linkedin.com/in/..." />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Twitter / X URL</Label>
                      <Input value={m.twitterUrl || ""} onChange={(e) => update(i, { twitterUrl: e.target.value })} placeholder="https://x.com/..." />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-xs">GitHub URL</Label>
                      <Input value={m.githubUrl || ""} onChange={(e) => update(i, { githubUrl: e.target.value })} placeholder="https://github.com/..." />
                    </div>

                    {/* --- Employment status (controls QR verification validity) --- */}
                    <div className="md:col-span-2 mt-1 pt-3 border-t border-border/60">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                        Employment status · controls QR verification
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Status</Label>
                      <Select value={m.status || "active"} onValueChange={(v) => update(i, { status: v as any })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active employee</SelectItem>
                          <SelectItem value="resigned">Resigned</SelectItem>
                          <SelectItem value="terminated">Fired / terminated</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                          <SelectItem value="on_leave">On leave</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Status note (optional, public)</Label>
                      <Input value={m.statusNote || ""} onChange={(e) => update(i, { statusNote: e.target.value })} placeholder="e.g. Resigned on 12 May 2026" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={m.paused ? "text-emerald-600 hover:text-emerald-600 hover:bg-emerald-500/10" : "text-amber-600 hover:text-amber-600 hover:bg-amber-500/10"}
                      title={m.paused ? "Resume — show on public team again" : "Pause — temporarily hide from public team (ID card stays valid)"}
                      onClick={() => update(i, { paused: !m.paused })}
                    >
                      {m.paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      title="Delete member permanently"
                      onClick={() => {
                        if (confirm(`Remove ${m.name || "this member"}?`)) remove(i);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save changes
          </Button>
        </div>
      </div>
    </SuperAdminLayout>
  );
};

/**
 * Inline editor for an employee's locked card ID. Lets admins:
 *  - Issue a brand-new sequential ID when none exists (DTLE000001 → 000002 …)
 *  - Override the issued ID with a custom value (collision-checked)
 * All updates write to `id_card_assignments` and invalidate the lookup map
 * so the public team list, About page, ID card maker and Verify page all
 * pick up the change instantly.
 */
const EmployeeIdEditor = ({
  subjectKey,
  member,
  currentId,
  onSaved,
}: {
  subjectKey: string;
  member: TeamMember;
  currentId: string | null;
  onSaved: () => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(currentId || "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDraft(currentId || "");
  }, [currentId]);

  // Compute the next sequential card_id following the existing scheme:
  // `<COMPANY>E<digits>`. Pulls the current max numeric suffix for EMP rows
  // sharing the same company short code and adds 1.
  const issueSequential = async (): Promise<string> => {
    const { data: brandRow } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "id_card_brand_v4")
      .maybeSingle();
    let brand: any = brandRow?.value || {};
    while (typeof brand === "string") {
      try { brand = JSON.parse(brand); } catch { break; }
    }
    const companyName = brand.companyName || "Dynime Inc.";
    const digits = Math.max(4, Math.min(8, Math.floor(Number(brand.idDigits) || 6)));
    const cleaned = companyName.replace(/[^A-Za-z0-9 ]/g, " ").trim();
    const words = cleaned.split(/\s+/).filter(Boolean);
    const shortCode = (words.length >= 2
      ? words.map((w: string) => w[0]).join("").slice(0, 4)
      : (words[0] || "ID").slice(0, 3)
    ).toUpperCase();
    const prefix = `${shortCode}E`;

    const { data: rows } = await supabase
      .from("id_card_assignments")
      .select("card_id")
      .eq("kind", "EMP")
      .like("card_id", `${prefix}%`);

    let max = 0;
    for (const r of rows || []) {
      const m = String(r.card_id).match(new RegExp(`^${prefix}(\\d+)$`));
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > max) max = n;
      }
    }
    const next = Math.max(max + 1, 1);
    return `${prefix}${String(next).padStart(digits, "0")}`;
  };

  const issueNow = async () => {
    setBusy(true);
    try {
      for (let attempt = 0; attempt < 50; attempt++) {
        const candidate = await issueSequential();
        const { error } = await supabase.from("id_card_assignments").insert({
          kind: "EMP",
          subject_key: subjectKey,
          card_id: candidate,
          company_short: candidate.replace(/E\d+$/, ""),
          subject_name: member.name,
          subject_email: member.email || null,
          qr_payload: {
            v: 1,
            k: "EMP",
            n: member.name,
            r: member.role,
            e: member.email || undefined,
            c: member.country || undefined,
            i: new Date().toISOString().slice(0, 10),
            o: "Dynime Inc.",
            p: member.photoUrl || undefined,
            id: candidate,
          } as any,
          locked_at: new Date().toISOString(),
        });
        if (!error) {
          toast.success(`Issued ${candidate}`);
          onSaved();
          return;
        }
        if (error.code !== "23505") throw error;
      }
      throw new Error("Could not allocate a unique ID after 50 attempts");
    } catch (e: any) {
      toast.error(e?.message || "Failed to issue ID");
    } finally {
      setBusy(false);
    }
  };

  const saveOverride = async () => {
    const next = draft.trim().toUpperCase();
    if (!next) return toast.error("ID cannot be empty");
    if (next === currentId) { setEditing(false); return; }
    setBusy(true);
    try {
      // Collision check
      const { data: clash } = await supabase
        .from("id_card_assignments")
        .select("subject_key")
        .eq("card_id", next)
        .maybeSingle();
      if (clash && clash.subject_key !== subjectKey) {
        throw new Error(`ID ${next} is already used by another employee`);
      }
      const { error } = currentId
        ? await supabase
          .from("id_card_assignments")
          .update({ card_id: next, subject_key: subjectKey })
          .eq("kind", "EMP")
          .eq("card_id", currentId)
        : await supabase
          .from("id_card_assignments")
          .update({ card_id: next })
          .eq("kind", "EMP")
          .eq("subject_key", subjectKey);
      if (error) throw error;
      toast.success(`Updated to ${next}`);
      setEditing(false);
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update ID");
    } finally {
      setBusy(false);
    }
  };

  if (!currentId) {
    return (
      <div className="mb-3 inline-flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted rounded-full px-2.5 py-1">
          <IdCard className="w-3.5 h-3.5" /> No ID issued
        </span>
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={issueNow} disabled={busy}>
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : "Issue ID"}
        </Button>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="mb-3 flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="h-7 w-44 font-mono text-xs"
          placeholder="DTLE000001"
          autoFocus
        />
        <Button size="sm" className="h-7 px-2" onClick={saveOverride} disabled={busy}>
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setDraft(currentId); setEditing(false); }}>
          <X className="w-3 h-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="mb-3 inline-flex items-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-primary bg-primary/10 ring-1 ring-primary/20 rounded-full px-2.5 py-1">
        <IdCard className="w-3.5 h-3.5" /> {currentId}
      </span>
      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditing(true)}>
        <Pencil className="w-3 h-3 mr-1" /> Edit
      </Button>
    </div>
  );
};

/**
 * Admin action: scan every EMP row in `id_card_assignments` and rebuild
 * sequential `<COMPANY>E######` serials in chronological order. Subject_key
 * mapping is preserved — only the human-facing card_id changes. The locked
 * qr_payload.id field is rewritten in-step so the verify page keeps matching.
 *
 * Uses a two-phase rename (temp id → final id) to dodge the UNIQUE(card_id)
 * constraint when reassigning numbers that may overlap existing rows.
 */
const RebuildIdsButton = ({ items, onDone }: { items: TeamMember[]; onDone: () => void }) => {
  const [busy, setBusy] = useState(false);

  const rebuild = async () => {
    if (!confirm(
      "Rebuild ALL employee IDs as a clean DTLE sequence?\n\n" +
      "This renumbers every existing employee card_id and updates the locked QR " +
      "payload to match. Already-printed QR codes pointing at the OLD ids will stop " +
      "verifying. Continue?",
    )) return;

    setBusy(true);
    try {
      const { data: brandRow } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "id_card_brand_v4")
        .maybeSingle();
      let brand: any = brandRow?.value || {};
      while (typeof brand === "string") {
        try { brand = JSON.parse(brand); } catch { break; }
      }
      const companyName = brand.companyName || "Dynime Inc.";
      const digits = Math.max(4, Math.min(8, Math.floor(Number(brand.idDigits) || 6)));
      const cleaned = companyName.replace(/[^A-Za-z0-9 ]/g, " ").trim();
      const words = cleaned.split(/\s+/).filter(Boolean);
      const shortCode = (words.length >= 2
        ? words.map((w: string) => w[0]).join("").slice(0, 4)
        : (words[0] || "ID").slice(0, 3)
      ).toUpperCase();
      const prefix = `${shortCode}E`;
      const minStart = 1;
      const ordered = ensureEmployeeKeys(items.filter((m) => m.name.trim()));

      const { data: rows, error: fetchErr } = await supabase
        .from("id_card_assignments")
        .select("id, card_id, subject_key, subject_name, subject_email, qr_payload, created_at")
        .eq("kind", "EMP")
        .order("created_at", { ascending: true })
        .order("subject_key", { ascending: true });
      if (fetchErr) throw fetchErr;
      if (!rows || rows.length === 0) {
        toast.info("No employee IDs to rebuild");
        return;
      }

      const unusedRows = [...rows] as any[];
      const takeRow = (member: TeamMember, index: number) => {
        const keys = teamSectionSubjectKeys(index, member);
        const email = (member.email || "").trim().toLowerCase();
        const exact = unusedRows.findIndex((r) => keys.includes(r.subject_key));
        const byEmail = exact < 0 && email ? unusedRows.findIndex((r) => ((r.qr_payload as any)?.e || r.subject_email || "").trim().toLowerCase() === email) : -1;
        const byPerson = exact < 0 && byEmail < 0 ? unusedRows.findIndex((r) =>
          ((r.qr_payload as any)?.n || r.subject_name || "").trim().toLowerCase() === member.name.trim().toLowerCase()
          && ((r.qr_payload as any)?.r || "").trim().toLowerCase() === member.role.trim().toLowerCase()
        ) : -1;
        const found = [exact, byEmail, byPerson].find((n) => n >= 0) ?? -1;
        return found >= 0 ? unusedRows.splice(found, 1)[0] : null;
      };
      const assignments = ordered.map((member, i) => ({ row: takeRow(member, i), member, index: i })).filter((x) => x.row);
      unusedRows.forEach((row, offset) => assignments.push({ row, member: null as any, index: ordered.length + offset }));
      const finalIds = assignments.map((_, i) => `${prefix}${String(minStart + i).padStart(digits, "0")}`);
      const tempIds = assignments.map((a, i) => `__REBUILD__${a.row.id}__${i}`);

      // Phase A: park each row under a temporary id
      for (let i = 0; i < assignments.length; i++) {
        const { error } = await supabase
          .from("id_card_assignments")
          .update({ card_id: tempIds[i] })
          .eq("id", assignments[i].row.id);
        if (error) throw new Error(`Phase A failed at row ${i}: ${error.message}`);
      }

      // Phase B: assign final sequential ids + rewrite qr_payload.id
      let duplicatesFound = 0;
      const seenSubjectKeys = new Set<string>();
      for (let i = 0; i < assignments.length; i++) {
        const { row, member, index } = assignments[i] as any;
        if (seenSubjectKeys.has(row.subject_key)) duplicatesFound++;
        const nextSubjectKey = member ? teamSectionSubjectKey(index, member) : row.subject_key;
        seenSubjectKeys.add(nextSubjectKey);

        const newId = finalIds[i];
        const newPayload = row.qr_payload
          ? { ...row.qr_payload, id: newId, n: member?.name ?? row.qr_payload.n, r: member?.role ?? row.qr_payload.r, m: member?.specialty ?? row.qr_payload.m, e: member?.email || row.qr_payload.e }
          : row.qr_payload;
        const { error } = await supabase
          .from("id_card_assignments")
          .update({
            card_id: newId,
            company_short: shortCode,
            subject_key: nextSubjectKey,
            subject_name: member?.name ?? row.subject_name,
            subject_email: member?.email || row.subject_email,
            qr_payload: newPayload,
          })
          .eq("id", row.id);
        if (error) throw new Error(`Phase B failed at row ${i}: ${error.message}`);
      }

      toast.success(
        `Rebuilt ${rows.length} ID${rows.length === 1 ? "" : "s"} → ${finalIds[0]} … ${finalIds[finalIds.length - 1]}` +
        (duplicatesFound ? ` (${duplicatesFound} duplicate subject_keys collapsed)` : ""),
      );
      onDone();
    } catch (e: any) {
      toast.error(e?.message || "Rebuild failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={rebuild}
      disabled={busy}
      title="Re-issue every employee ID as a clean DTLE sequence"
    >
      {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <IdCard className="w-4 h-4 mr-2" />}
      Rebuild Employer IDs
    </Button>
  );
};

export default AdminTeamSection;

import { Fragment, useEffect, useMemo, useState } from "react";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCrmLeads, useUpsertLead } from "@/hooks/use-crm";
import { Plus, Search, Mail, Phone, Settings2, Info, Copy, PhoneCall, MessageCircle, ChevronRight, ShoppingCart } from "lucide-react";
import PhoneInput, { detectCountryFromPhone } from "@/components/shared/PhoneInput";
import LeadActivities from "@/components/shared/LeadActivities";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const prettySource = (s: string) => cap((s || "").replace(/_/g, " "));

type Weights = Record<string, number>;
const WEIGHT_GROUPS: { title: string; items: { key: string; label: string }[] }[] = [
  {
    title: "Contactability",
    items: [
      { key: "contact_email", label: "Has email" },
      { key: "contact_phone", label: "Has phone" },
      { key: "contact_company", label: "Has company" },
      { key: "contact_job_title", label: "Has job title" },
      { key: "contact_country", label: "Has country" },
    ],
  },
  {
    title: "Source quality",
    items: [
      { key: "source_invest_lead", label: "Investor lead" },
      { key: "source_contact_form", label: "Contact form" },
      { key: "source_newsletter", label: "Newsletter" },
      { key: "source_other", label: "Other source" },
    ],
  },
  {
    title: "Engagement",
    items: [
      { key: "engagement_contacted", label: "Contacted at least once" },
      { key: "engagement_recent_7d", label: "Contacted in last 7 days" },
      { key: "engagement_priority_high", label: "Marked high priority" },
    ],
  },
];

const STATUS_OPTS = ["new", "working", "qualified", "unqualified", "converted"];
const STATUS_COLOR: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-600 hover:bg-blue-500/15",
  working: "bg-amber-500/10 text-amber-600 hover:bg-amber-500/15",
  qualified: "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15",
  unqualified: "bg-gray-500/10 text-gray-600 hover:bg-gray-500/15",
  converted: "bg-purple-500/10 text-purple-600 hover:bg-purple-500/15",
};

const emptyLead = { full_name: "", email: "", phone: "", company: "", source: "manual", status: "new", priority: "normal", message: "" };

const AdminCrmLeads = () => {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [weightsOpen, setWeightsOpen] = useState(false);
  const [editing, setEditing] = useState<any>(emptyLead);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const { data: leads = [], isLoading } = useCrmLeads({ q: q || undefined, status: status || undefined });
  const upsert = useUpsertLead();
  const qc = useQueryClient();

  const changeStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("crm_leads").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-leads"] });
      toast.success("Status updated");
    },
    onError: (e: any) => toast.error(e.message || "Failed to update status"),
  });

  const createOrderFromLead = (l: any) => {
    const params = new URLSearchParams();
    if (l.full_name) params.set("name", l.full_name);
    if (l.email) params.set("email", l.email);
    if (l.phone) params.set("phone", l.phone);
    if (l.company) params.set("company", l.company);
    if (l.id) params.set("lead_id", l.id);
    navigate(`/superadmin/orders/new?${params.toString()}`);
  };

  const { data: weightsRow } = useQuery({
    queryKey: ["crm_score_weights"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("crm_score_weights").select("weights").eq("id", 1).maybeSingle();
      if (error) throw error;
      return (data?.weights || {}) as Weights;
    },
  });
  const [draftWeights, setDraftWeights] = useState<Weights>({});
  useEffect(() => { if (weightsRow) setDraftWeights(weightsRow); }, [weightsRow]);

  const saveWeights = useMutation({
    mutationFn: async (w: Weights) => {
      const { error } = await (supabase as any).from("crm_score_weights").update({ weights: w, updated_at: new Date().toISOString() }).eq("id", 1);
      if (error) throw error;
      // Recompute scores for existing leads
      await (supabase as any).rpc("recompute_crm_lead_scores");
    },
    onSuccess: () => {
      toast.success("Weights saved. Recomputing scores…");
      qc.invalidateQueries({ queryKey: ["crm_score_weights"] });
      qc.invalidateQueries({ queryKey: ["crm_leads"] });
      setWeightsOpen(false);
    },
    onError: (e: any) => toast.error(e.message || "Failed to save"),
  });

  const { data: statusCounts = {} } = useQuery({
    queryKey: ["crm-leads", "status-counts", q || null],
    queryFn: async () => {
      let query = supabase.from("crm_leads").select("status", { count: "exact" });
      if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,company.ilike.%${q}%`);
      const { data, error } = await query.limit(5000);
      if (error) throw error;
      const by: Record<string, number> = {};
      (data || []).forEach((l: any) => { by[l.status] = (by[l.status] || 0) + 1; });
      return by;
    },
  });
  const stats = statusCounts as Record<string, number>;

  const save = async () => {
    try {
      await upsert.mutateAsync(editing);
      setOpen(false); setEditing(emptyLead);
    } catch (e: any) {
      if (String(e?.message || "").toLowerCase().includes("crm_leads_phone_unique_idx") || e?.code === "23505") {
        toast.error("Another lead already uses this phone number.");
      }
    }
  };

  const weightsTotal = useMemo(() => Object.values(draftWeights).reduce((a, b) => a + (Number(b) || 0), 0), [draftWeights]);

  return (
    <SuperAdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">CRM Leads</h1>
            <p className="text-sm text-muted-foreground">Auto-ingested from contact forms, invest leads, and subscribers — plus manual entries.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setWeightsOpen(true)}>
              <Settings2 className="h-4 w-4 mr-2" /> Score weights
            </Button>
            <Button onClick={() => { setEditing(emptyLead); setOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> New lead
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {STATUS_OPTS.map((s) => {
            const active = status === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(active ? "" : s)}
                className={`text-left rounded-lg border p-4 transition-all hover:border-primary/50 hover:shadow-sm ${active ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "bg-card"}`}
                aria-pressed={active}
              >
                <div className={`text-xs uppercase ${active ? "text-primary font-semibold" : "text-muted-foreground"}`}>{cap(s)}</div>
                <div className="text-2xl font-bold">{stats[s] || 0}</div>
              </button>
            );
          })}
        </div>

        <Card className="p-4">
          <div className="flex gap-3 flex-wrap mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search name, email, company…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUS_OPTS.map((s) => <SelectItem key={s} value={s}>{cap(s)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b">
                <tr>
                  <th className="py-2 w-8"></th>
                  <th className="pr-4">Name</th>
                  <th className="pr-4">Contact</th>
                  <th className="pr-4">Source</th>
                  <th className="pr-4">Score</th>
                  <th className="pr-4">Status</th>
                  <th className="pr-4">Created</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading && <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">Loading…</td></tr>}
                {!isLoading && leads.length === 0 && <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">No leads found.</td></tr>}
                {leads.map((l: any) => {
                  const score = Number(l.score || 0);
                  const tone = score >= 70 ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : score >= 40 ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "bg-muted text-muted-foreground";
                  const isOpen = !!expanded[l.id];
                  return (
                  <Fragment key={l.id}>
                  <tr key={l.id} className="border-b hover:bg-muted/30">
                    <td className="py-3 align-top">
                      <button
                        type="button"
                        onClick={() => setExpanded((s) => ({ ...s, [l.id]: !s[l.id] }))}
                        className="p-1 rounded hover:bg-muted text-muted-foreground"
                        title={isOpen ? "Collapse" : "Expand activities"}
                      >
                        <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                      </button>
                    </td>
                    <td className="py-3 pr-4 font-medium cursor-pointer align-top" onClick={() => { setEditing(l); setOpen(true); }}>
                      <div>{l.full_name}</div>
                      {l.company && <div className="text-[11px] text-muted-foreground font-normal mt-0.5">{l.company}</div>}
                    </td>
                    <td>
                      {l.email && (
                        <div className="flex items-center gap-1.5 text-xs group/contact">
                          <Mail className="h-3 w-3 shrink-0 text-muted-foreground" />
                          <a href={`mailto:${l.email}`} className="hover:underline truncate max-w-[180px]">{l.email}</a>
                          <button
                            type="button"
                            title="Copy email"
                            onClick={() => { navigator.clipboard.writeText(l.email); toast.success("Email copied"); }}
                            className="opacity-0 group-hover/contact:opacity-100 transition-opacity p-0.5 hover:text-primary"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                      {l.phone && (
                        <div className="flex items-center gap-1.5 text-xs group/contact">
                          <Phone className="h-3 w-3 shrink-0 text-muted-foreground" />
                          <a href={`tel:${l.phone}`} className="hover:underline">{l.phone}</a>
                          <a
                            href={`tel:${l.phone}`}
                            title="Call"
                            className="opacity-0 group-hover/contact:opacity-100 transition-opacity p-0.5 hover:text-primary"
                          >
                            <PhoneCall className="h-3 w-3" />
                          </a>
                          <a
                            href={`https://web.whatsapp.com/send?phone=${l.phone.replace(/[^\d]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="WhatsApp"
                            className="opacity-0 group-hover/contact:opacity-100 transition-opacity p-0.5 hover:text-emerald-600"
                          >
                            <MessageCircle className="h-3 w-3" />
                          </a>
                          <button
                            type="button"
                            title="Copy phone"
                            onClick={() => { navigator.clipboard.writeText(l.phone); toast.success("Phone copied"); }}
                            className="opacity-0 group-hover/contact:opacity-100 transition-opacity p-0.5 hover:text-primary"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="pr-4"><Badge variant="outline">{prettySource(l.source)}</Badge></td>
                    <td className="pr-4">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className={`text-xs font-semibold px-2 py-0.5 rounded inline-flex items-center gap-1 ${tone}`}>
                            {score}<Info className="h-3 w-3 opacity-70" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-3" align="start">
                          <div className="text-xs font-semibold mb-2">Score breakdown · {score}/100</div>
                          {Array.isArray(l.score_breakdown) && l.score_breakdown.length > 0 ? (
                            <ul className="space-y-1">
                              {l.score_breakdown.map((p: any, i: number) => (
                                <li key={i} className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">{p.label}</span>
                                  <span className="font-medium">+{p.points}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-muted-foreground">No signals matched yet.</p>
                          )}
                        </PopoverContent>
                      </Popover>
                    </td>
                    <td className="pr-4">
                      <Select
                        value={l.status}
                        onValueChange={(v) => changeStatus.mutate({ id: l.id, status: v })}
                      >
                        <SelectTrigger
                          className={`h-7 w-[110px] border-0 text-xs font-medium px-2 ${STATUS_COLOR[l.status] || ""}`}
                        >
                          <SelectValue>{cap(l.status)}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTS.map((s) => (
                            <SelectItem key={s} value={s}>{cap(s)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="pr-4 text-xs text-muted-foreground whitespace-nowrap">{format(new Date(l.created_at), "MMM d, yyyy")}</td>
                    <td>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => createOrderFromLead(l)}
                        title="Create order from this lead"
                      >
                        <ShoppingCart className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr key={l.id + "-act"} className="border-b bg-muted/20">
                      <td></td>
                      <td colSpan={7} className="py-4 pr-4">
                        <LeadActivities leadId={l.id} />
                      </td>
                    </tr>
                  )}
                  </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader><DialogTitle>{editing.id ? "Edit lead" : "New lead"}</DialogTitle></DialogHeader>
            {editing.id && (editing.email || editing.phone) && (
              <div className="flex flex-wrap gap-2 -mt-2">
                {editing.email && (
                  <>
                    <Button asChild size="sm" variant="outline"><a href={`mailto:${editing.email}`}><Mail className="h-3.5 w-3.5 mr-1.5" />Email</a></Button>
                    <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(editing.email); toast.success("Email copied"); }}>
                      <Copy className="h-3.5 w-3.5 mr-1.5" />Copy
                    </Button>
                  </>
                )}
                {editing.phone && (
                  <>
                    <Button asChild size="sm" variant="outline"><a href={`tel:${editing.phone}`}><PhoneCall className="h-3.5 w-3.5 mr-1.5" />Call</a></Button>
                    <Button asChild size="sm" variant="outline">
                      <a href={`https://web.whatsapp.com/send?phone=${editing.phone.replace(/[^\d]/g, "")}`} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="h-3.5 w-3.5 mr-1.5" />WhatsApp
                      </a>
                    </Button>
                  </>
                )}
                {editing.id && (
                  <Button size="sm" onClick={() => { setOpen(false); createOrderFromLead(editing); }}>
                    <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />Create order
                  </Button>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Full name *</Label>
                <Input value={editing.full_name} onChange={(e) => setEditing({ ...editing, full_name: e.target.value })} />
              </div>
              <div className="space-y-1"><Label>Email</Label><Input value={editing.email ?? ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <PhoneInput value={editing.phone ?? ""} onChange={(v) => setEditing({ ...editing, phone: v })} />
                {editing.phone && (() => {
                  const c = detectCountryFromPhone(editing.phone);
                  return c ? (
                    <p className="text-[11px] text-muted-foreground">Detected: {c.flag} {c.name}</p>
                  ) : (
                    <p className="text-[11px] text-amber-600">Country not detected — pick a code from the dropdown.</p>
                  );
                })()}
              </div>
              <div className="space-y-1"><Label>Company</Label><Input value={editing.company ?? ""} onChange={(e) => setEditing({ ...editing, company: e.target.value })} /></div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={editing.status} onValueChange={(v) => setEditing({ ...editing, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_OPTS.map((s) => <SelectItem key={s} value={s}>{cap(s)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Notes / message</Label>
                <Textarea rows={3} value={editing.message ?? ""} onChange={(e) => setEditing({ ...editing, message: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={upsert.isPending || !editing.full_name}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={weightsOpen} onOpenChange={setWeightsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Lead score weights</DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground -mt-2">
              Adjust how many points each signal contributes. Final scores are capped at 100. Sum of all weights: <span className="font-semibold">{weightsTotal}</span>.
            </p>
            <div className="grid sm:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto pr-1">
              {WEIGHT_GROUPS.map((g) => (
                <div key={g.title} className="space-y-2">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">{g.title}</div>
                  {g.items.map((it) => (
                    <div key={it.key} className="space-y-1">
                      <Label className="text-xs">{it.label}</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={draftWeights[it.key] ?? 0}
                        onChange={(e) => setDraftWeights({ ...draftWeights, [it.key]: Number(e.target.value) || 0 })}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { if (weightsRow) setDraftWeights(weightsRow); setWeightsOpen(false); }}>Cancel</Button>
              <Button onClick={() => saveWeights.mutate(draftWeights)} disabled={saveWeights.isPending}>
                {saveWeights.isPending ? "Saving…" : "Save & recompute"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SuperAdminLayout>
  );
};

export default AdminCrmLeads;

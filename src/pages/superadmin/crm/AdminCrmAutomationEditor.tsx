import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch } from "@/lib/api";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, GripVertical, Save } from "lucide-react";
import { toast } from "sonner";

const TRIGGERS = [
  { v: "lead_created", label: "When a new lead is created" },
  { v: "status_changed", label: "When lead status changes" },
  { v: "manual", label: "Manual only (run from lead page)" },
];

const STEP_TYPES = [
  { v: "send_email", label: "Send email" },
  { v: "create_task", label: "Create task / activity" },
  { v: "update_score", label: "Update lead score" },
  { v: "change_status", label: "Change lead status" },
  { v: "add_tag", label: "Add tag" },
  
  { v: "delay", label: "Wait / delay" },
  { v: "condition", label: "If condition" },
];

const LEAD_STATUSES = ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"];

const AdminCrmAutomationEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [wf, setWf] = useState<any>(null);
  const [steps, setSteps] = useState<any[]>([]);

  const { data: templates = [] } = useQuery({
    queryKey: ["crm-email-templates"],
    queryFn: async () => (await apiGet<any[]>("/crm/email-templates")) ?? [],
  });

  useEffect(() => {
    (async () => {
      try {
        const data = await apiGet<any>(`/crm/workflows/${id}`);
        if (data) {
          setWf(data);
          setSteps((data.crm_workflow_steps || []).sort((a: any, b: any) => a.position - b.position));
        }
      } catch (e: any) {
        toast.error("Failed to load workflow details");
      }
    })();
  }, [id]);

  const save = useMutation({
    mutationFn: async () => {
      await apiPatch(`/crm/workflows/${id}`, {
        name: wf.name,
        description: wf.description,
        trigger_type: wf.trigger_type,
        trigger_config: wf.trigger_config || {},
        is_active: wf.is_active,
        steps,
      });
    },
    onSuccess: () => {
      toast.success("Workflow saved");
      qc.invalidateQueries({ queryKey: ["crm-workflows"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to save workflow"),
  });

  const addStep = (step_type: string) => setSteps([...steps, { step_type, config: {} }]);
  const removeStep = (i: number) => setSteps(steps.filter((_, idx) => idx !== i));
  const updateStep = (i: number, patch: any) =>
    setSteps(steps.map((s, idx) => idx === i ? { ...s, ...patch, config: { ...s.config, ...(patch.config || {}) } } : s));

  if (!wf) return <SuperAdminLayout><div className="p-6">Loading…</div></SuperAdminLayout>;

  return (
    <SuperAdminLayout>
      <div className="p-6 space-y-4 max-w-4xl">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/superadmin/crm/automations")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            <Save className="h-4 w-4 mr-2" /> {save.isPending ? "Saving…" : "Save workflow"}
          </Button>
        </div>

        <Card className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={wf.name || ""} onChange={(e) => setWf({ ...wf, name: e.target.value })} />
            </div>
            <div className="space-y-1 flex items-end gap-3">
              <div className="flex-1">
                <Label>Trigger</Label>
                <Select value={wf.trigger_type} onValueChange={(v) => setWf({ ...wf, trigger_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRIGGERS.map((t) => <SelectItem key={t.v} value={t.v}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pb-2">
                <Switch checked={wf.is_active} onCheckedChange={(v) => setWf({ ...wf, is_active: v })} />
                <span className="text-sm">Active</span>
              </div>
            </div>
            {wf.trigger_type === "status_changed" && (
              <div className="space-y-1 md:col-span-2">
                <Label>Run when status changes to (optional)</Label>
                <Select value={wf.trigger_config?.to_status || ""}
                  onValueChange={(v) => setWf({ ...wf, trigger_config: { ...(wf.trigger_config || {}), to_status: v || undefined } })}>
                  <SelectTrigger><SelectValue placeholder="Any status" /></SelectTrigger>
                  <SelectContent>
                    {LEAD_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1 md:col-span-2">
              <Label>Description</Label>
              <Textarea rows={2} value={wf.description || ""} onChange={(e) => setWf({ ...wf, description: e.target.value })} />
            </div>
          </div>
        </Card>

        <div className="space-y-2">
          <div className="text-sm font-semibold uppercase text-muted-foreground">Steps (run in order)</div>
          {steps.map((s, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-start gap-3">
                <GripVertical className="h-5 w-5 text-muted-foreground mt-1" />
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge>{i + 1}</Badge>
                    <Select value={s.step_type} onValueChange={(v) => updateStep(i, { step_type: v, config: {} })}>
                      <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STEP_TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button size="icon" variant="ghost" className="ml-auto text-destructive" onClick={() => removeStep(i)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <StepConfig step={s} onChange={(cfg) => updateStep(i, { config: cfg })} templates={templates} />
                </div>
              </div>
            </Card>
          ))}
          <div className="flex flex-wrap gap-2 pt-2">
            {STEP_TYPES.map((t) => (
              <Button key={t.v} size="sm" variant="outline" onClick={() => addStep(t.v)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> {t.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
};

const StepConfig = ({ step, onChange, templates }: any) => {
  const c = step.config || {};
  switch (step.step_type) {
    case "delay":
      return (
        <div className="grid grid-cols-3 gap-2">
          <div><Label className="text-xs">Days</Label><Input type="number" value={c.days || 0} onChange={(e) => onChange({ days: Number(e.target.value) })} /></div>
          <div><Label className="text-xs">Hours</Label><Input type="number" value={c.hours || 0} onChange={(e) => onChange({ hours: Number(e.target.value) })} /></div>
          <div><Label className="text-xs">Minutes</Label><Input type="number" value={c.minutes || 0} onChange={(e) => onChange({ minutes: Number(e.target.value) })} /></div>
        </div>
      );
    case "send_email":
      return (
        <div className="space-y-2">
          <div>
            <Label className="text-xs">Template</Label>
            <Select value={c.template_id || ""} onValueChange={(v) => onChange({ template_id: v })}>
              <SelectTrigger><SelectValue placeholder="Pick a template or write inline" /></SelectTrigger>
              <SelectContent>
                {templates.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {!c.template_id && (
            <>
              <div><Label className="text-xs">Subject</Label><Input value={c.subject || ""} onChange={(e) => onChange({ subject: e.target.value })} placeholder="Hi {{full_name}}…" /></div>
              <div><Label className="text-xs">Body (HTML)</Label><Textarea rows={4} value={c.body_html || ""} onChange={(e) => onChange({ body_html: e.target.value })} /></div>
            </>
          )}
          
          <p className="text-xs text-muted-foreground">Variables: {`{{full_name}} {{email}} {{company}}`}</p>
        </div>
      );
    case "create_task":
      return (
        <div className="grid grid-cols-2 gap-2">
          <div><Label className="text-xs">Subject</Label><Input value={c.subject || ""} onChange={(e) => onChange({ subject: e.target.value })} placeholder="Call {{full_name}}" /></div>
          <div><Label className="text-xs">Type</Label>
            <Select value={c.activity_type || "task"} onValueChange={(v) => onChange({ activity_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["call", "email", "meeting", "follow_up", "task", "note"].map((t) => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Due in (days)</Label><Input type="number" value={c.due_in_days || 1} onChange={(e) => onChange({ due_in_days: Number(e.target.value) })} /></div>
          <div><Label className="text-xs">Priority</Label>
            <Select value={c.priority || "normal"} onValueChange={(v) => onChange({ priority: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["low", "normal", "high"].map((p) => <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label className="text-xs">Description</Label><Textarea rows={2} value={c.description || ""} onChange={(e) => onChange({ description: e.target.value })} /></div>
        </div>
      );
    case "update_score":
      return <div><Label className="text-xs">Delta (+/-)</Label><Input type="number" value={c.delta || 0} onChange={(e) => onChange({ delta: Number(e.target.value) })} /></div>;
    case "change_status":
      return (
        <div>
          <Label className="text-xs">New status</Label>
          <Select value={c.status || ""} onValueChange={(v) => onChange({ status: v })}>
            <SelectTrigger><SelectValue placeholder="Pick status" /></SelectTrigger>
            <SelectContent>
              {LEAD_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      );
    case "add_tag":
      return <div><Label className="text-xs">Tag</Label><Input value={c.tag || ""} onChange={(e) => onChange({ tag: e.target.value })} /></div>;
    case "condition":
      return (
        <div className="grid grid-cols-3 gap-2">
          <div><Label className="text-xs">Field</Label>
            <Select value={c.field || ""} onValueChange={(v) => onChange({ field: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["status", "source", "score", "country", "company", "priority"].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Operator</Label>
            <Select value={c.op || "eq"} onValueChange={(v) => onChange({ op: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[["eq", "="], ["neq", "≠"], ["gt", ">"], ["lt", "<"], ["contains", "contains"]].map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Value</Label><Input value={c.value || ""} onChange={(e) => onChange({ value: e.target.value })} /></div>
          <p className="text-xs text-muted-foreground col-span-3">If condition fails, workflow stops for this lead.</p>
        </div>
      );
    default:
      return null;
  }
};

export default AdminCrmAutomationEditor;

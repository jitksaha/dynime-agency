import { useMemo, useState } from "react";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCrmPipelines, useCrmDeals, useMoveDeal, useUpsertDeal } from "@/hooks/use-crm";
import { Plus, GripVertical } from "lucide-react";

const emptyDeal = { title: "", value: 0, currency: "USD", expected_close_date: "", customer_email: "", description: "" };

const AdminCrmPipeline = () => {
  const { data: pipelines = [] } = useCrmPipelines();
  const pipeline = pipelines[0];
  const { data: deals = [] } = useCrmDeals(pipeline?.id);
  const move = useMoveDeal();
  const upsert = useUpsertDeal();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(emptyDeal);
  const [dragId, setDragId] = useState<string | null>(null);

  const dealsByStage = useMemo(() => {
    const m: Record<string, any[]> = {};
    deals.forEach((d: any) => { (m[d.stage_id] ||= []).push(d); });
    return m;
  }, [deals]);

  const totalsByStage = (id: string) => (dealsByStage[id] || []).reduce((s, d) => s + Number(d.value || 0), 0);

  const onDrop = (stageId: string) => {
    if (!dragId) return;
    move.mutate({ id: dragId, stage_id: stageId });
    setDragId(null);
  };

  const save = async () => {
    if (!pipeline) return;
    const stage_id = editing.stage_id || pipeline.stages[0]?.id;
    await upsert.mutateAsync({ ...editing, pipeline_id: pipeline.id, stage_id, value: Number(editing.value) || 0 });
    setOpen(false); setEditing(emptyDeal);
  };

  return (
    <SuperAdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Sales Pipeline</h1>
            <p className="text-sm text-muted-foreground">Drag deals across stages.</p>
          </div>
          <Button onClick={() => { setEditing({ ...emptyDeal, stage_id: pipeline?.stages[0]?.id }); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> New deal
          </Button>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-4">
          {pipeline?.stages.map((s: any) => (
            <div
              key={s.id}
              className="min-w-[280px] flex-1 bg-muted/30 rounded-lg p-3"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(s.id)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: s.color || "#888" }} />
                  <span className="font-medium text-sm">{s.name}</span>
                  <Badge variant="secondary" className="text-xs">{(dealsByStage[s.id] || []).length}</Badge>
                </div>
                <span className="text-xs text-muted-foreground">${totalsByStage(s.id).toLocaleString()}</span>
              </div>
              <div className="space-y-2">
                {(dealsByStage[s.id] || []).map((d: any) => (
                  <Card
                    key={d.id}
                    draggable
                    onDragStart={() => setDragId(d.id)}
                    onClick={() => { setEditing(d); setOpen(true); }}
                    className="p-3 cursor-grab active:cursor-grabbing hover:border-primary/50"
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{d.title}</div>
                        <div className="text-xs text-muted-foreground truncate">{d.customer_email || "—"}</div>
                        <div className="mt-1 text-sm font-semibold">{d.currency} {Number(d.value).toLocaleString()}</div>
                      </div>
                    </div>
                  </Card>
                ))}
                {(dealsByStage[s.id] || []).length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-6">Drop deals here</div>
                )}
              </div>
            </div>
          ))}
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing.id ? "Edit deal" : "New deal"}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1"><Label>Title *</Label><Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
              <div className="space-y-1"><Label>Value</Label><Input type="number" value={editing.value} onChange={(e) => setEditing({ ...editing, value: e.target.value })} /></div>
              <div className="space-y-1"><Label>Currency</Label><Input value={editing.currency} onChange={(e) => setEditing({ ...editing, currency: e.target.value })} /></div>
              <div className="col-span-2 space-y-1"><Label>Customer email</Label><Input value={editing.customer_email ?? ""} onChange={(e) => setEditing({ ...editing, customer_email: e.target.value })} /></div>
              <div className="space-y-1"><Label>Expected close</Label><Input type="date" value={editing.expected_close_date ?? ""} onChange={(e) => setEditing({ ...editing, expected_close_date: e.target.value })} /></div>
              <div className="space-y-1">
                <Label>Stage</Label>
                <Select value={editing.stage_id ?? pipeline?.stages[0]?.id} onValueChange={(v) => setEditing({ ...editing, stage_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{pipeline?.stages.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={!editing.title || upsert.isPending}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SuperAdminLayout>
  );
};

export default AdminCrmPipeline;

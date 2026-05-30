import { useState } from "react";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useCrmActivities, useUpsertActivity } from "@/hooks/use-crm";
import { Plus, CheckCircle2, Circle, Clock } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const TYPES = ["call", "meeting", "email", "follow_up", "task", "note"];
const emptyAct = { type: "task", subject: "", description: "", due_at: "", priority: "normal", status: "open" };

const ActivityList = ({ items, onToggle, onEdit }: any) => (
  <div className="space-y-2">
    {items.length === 0 && <Card className="p-6 text-center text-sm text-muted-foreground">No activities here.</Card>}
    {items.map((a: any) => {
      const due = a.due_at ? new Date(a.due_at) : null;
      const overdue = due && a.status === "open" && isPast(due) && !isToday(due);
      return (
        <Card key={a.id} className="p-3 flex items-center gap-3">
          <Checkbox checked={a.status === "done"} onCheckedChange={() => onToggle(a)} />
          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onEdit(a)}>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize text-xs">{a.type.replace("_", " ")}</Badge>
              <span className={`font-medium truncate ${a.status === "done" ? "line-through text-muted-foreground" : ""}`}>{a.subject}</span>
            </div>
            {a.description && <div className="text-xs text-muted-foreground line-clamp-1 mt-1">{a.description}</div>}
          </div>
          {due && (
            <div className={`text-xs flex items-center gap-1 ${overdue ? "text-destructive" : "text-muted-foreground"}`}>
              <Clock className="h-3 w-3" /> {format(due, "MMM d, p")}
            </div>
          )}
        </Card>
      );
    })}
  </div>
);

const AdminCrmActivities = () => {
  const { data: all = [] } = useCrmActivities();
  const upsert = useUpsertActivity();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(emptyAct);

  const overdue = all.filter((a: any) => a.status === "open" && a.due_at && isPast(new Date(a.due_at)) && !isToday(new Date(a.due_at)));
  const today = all.filter((a: any) => a.status === "open" && a.due_at && isToday(new Date(a.due_at)));
  const upcoming = all.filter((a: any) => a.status === "open" && (!a.due_at || (!isPast(new Date(a.due_at)) && !isToday(new Date(a.due_at)))));
  const done = all.filter((a: any) => a.status === "done");

  const toggle = async (a: any) => {
    const next = a.status === "done" ? "open" : "done";
    const { error } = await supabase.from("crm_activities").update({
      status: next, completed_at: next === "done" ? new Date().toISOString() : null,
    }).eq("id", a.id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["crm-activities"] });
  };

  const save = async () => {
    await upsert.mutateAsync({ ...editing, due_at: editing.due_at || null });
    setOpen(false); setEditing(emptyAct);
  };

  return (
    <SuperAdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Activities & Tasks</h1>
            <p className="text-sm text-muted-foreground">Calls, meetings, follow-ups and reminders.</p>
          </div>
          <Button onClick={() => { setEditing(emptyAct); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />New activity</Button>
        </div>

        <Tabs defaultValue="today">
          <TabsList>
            <TabsTrigger value="overdue">Overdue <Badge variant="destructive" className="ml-2">{overdue.length}</Badge></TabsTrigger>
            <TabsTrigger value="today">Today <Badge variant="secondary" className="ml-2">{today.length}</Badge></TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming <Badge variant="secondary" className="ml-2">{upcoming.length}</Badge></TabsTrigger>
            <TabsTrigger value="done">Done <Badge variant="secondary" className="ml-2">{done.length}</Badge></TabsTrigger>
          </TabsList>
          <TabsContent value="overdue"><ActivityList items={overdue} onToggle={toggle} onEdit={(a: any) => { setEditing(a); setOpen(true); }} /></TabsContent>
          <TabsContent value="today"><ActivityList items={today} onToggle={toggle} onEdit={(a: any) => { setEditing(a); setOpen(true); }} /></TabsContent>
          <TabsContent value="upcoming"><ActivityList items={upcoming} onToggle={toggle} onEdit={(a: any) => { setEditing(a); setOpen(true); }} /></TabsContent>
          <TabsContent value="done"><ActivityList items={done} onToggle={toggle} onEdit={(a: any) => { setEditing(a); setOpen(true); }} /></TabsContent>
        </Tabs>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing.id ? "Edit" : "New"} activity</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Type</Label>
                  <Select value={editing.type} onValueChange={(v) => setEditing({ ...editing, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Due</Label>
                  <Input type="datetime-local" value={editing.due_at ? editing.due_at.slice(0,16) : ""} onChange={(e) => setEditing({ ...editing, due_at: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1"><Label>Subject *</Label><Input value={editing.subject} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} /></div>
              <div className="space-y-1"><Label>Notes</Label><Textarea rows={3} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={!editing.subject}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SuperAdminLayout>
  );
};

export default AdminCrmActivities;

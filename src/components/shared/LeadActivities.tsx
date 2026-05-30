import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Clock, Phone, Mail, Calendar, ListTodo, StickyNote, Repeat } from "lucide-react";
import { format, formatDistanceToNow, isPast, isToday } from "date-fns";
import { toast } from "sonner";

const TYPES = [
  { v: "call", label: "Call", icon: Phone },
  { v: "email", label: "Email", icon: Mail },
  { v: "meeting", label: "Meeting", icon: Calendar },
  { v: "follow_up", label: "Follow-up", icon: Repeat },
  { v: "task", label: "Task", icon: ListTodo },
  { v: "note", label: "Note", icon: StickyNote },
];
const typeIcon = (t: string) => TYPES.find((x) => x.v === t)?.icon ?? StickyNote;

const empty = { type: "call", subject: "", description: "", due_at: "", priority: "normal", status: "open" };

const LeadActivities = ({ leadId }: { leadId: string }) => {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<any>(empty);
  const [showForm, setShowForm] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["crm-activities", "lead", leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_activities")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        ...draft,
        lead_id: leadId,
        due_at: draft.due_at || null,
      };
      const { error } = await supabase.from("crm_activities").insert(payload);
      if (error) throw error;
      await supabase
        .from("crm_leads")
        .update({ last_contacted_at: new Date().toISOString() })
        .eq("id", leadId);
    },
    onSuccess: () => {
      toast.success("Activity added");
      qc.invalidateQueries({ queryKey: ["crm-activities", "lead", leadId] });
      qc.invalidateQueries({ queryKey: ["crm-activities"] });
      qc.invalidateQueries({ queryKey: ["crm-leads"] });
      setDraft(empty);
      setShowForm(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggle = async (a: any) => {
    const next = a.status === "done" ? "open" : "done";
    const { error } = await supabase
      .from("crm_activities")
      .update({ status: next, completed_at: next === "done" ? new Date().toISOString() : null })
      .eq("id", a.id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["crm-activities", "lead", leadId] });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase text-muted-foreground">
          Activities & Timeline · {items.length}
        </div>
        <Button size="sm" variant={showForm ? "outline" : "default"} onClick={() => setShowForm((s) => !s)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> {showForm ? "Cancel" : "New activity"}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-md border bg-background p-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={draft.type} onValueChange={(v) => setDraft({ ...draft, type: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Subject *</Label>
              <Input className="h-9" value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} placeholder="e.g. Called to introduce services" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Due</Label>
              <Input className="h-9" type="datetime-local" value={draft.due_at} onChange={(e) => setDraft({ ...draft, due_at: e.target.value })} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Notes</Label>
              <Textarea rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" disabled={!draft.subject || save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? "Saving…" : "Add activity"}
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-xs text-muted-foreground py-2">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">No activities yet for this lead.</p>
      ) : (
        <ol className="relative border-l border-border ml-2 space-y-3">
          {items.map((a: any) => {
            const Icon = typeIcon(a.type);
            const due = a.due_at ? new Date(a.due_at) : null;
            const overdue = due && a.status === "open" && isPast(due) && !isToday(due);
            return (
              <li key={a.id} className="ml-4">
                <span className="absolute -left-[7px] flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary/15 ring-2 ring-background">
                  <Icon className="h-2.5 w-2.5 text-primary" />
                </span>
                <div className="rounded-md border bg-background p-2.5">
                  <div className="flex items-start gap-2">
                    <Checkbox checked={a.status === "done"} onCheckedChange={() => toggle(a)} className="mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="capitalize text-[10px] h-4">{a.type.replace("_", " ")}</Badge>
                        <span className={`text-sm font-medium ${a.status === "done" ? "line-through text-muted-foreground" : ""}`}>{a.subject}</span>
                      </div>
                      {a.description && <div className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{a.description}</div>}
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                        <span>{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</span>
                        {due && (
                          <span className={`inline-flex items-center gap-1 ${overdue ? "text-destructive" : ""}`}>
                            <Clock className="h-3 w-3" /> {format(due, "MMM d, p")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};

export default LeadActivities;

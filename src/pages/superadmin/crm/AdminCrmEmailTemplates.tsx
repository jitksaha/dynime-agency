import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Mail, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

const empty = { id: "", name: "", subject: "", body_html: "" };

const AdminCrmEmailTemplates = () => {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<any>(null);

  const { data: list = [] } = useQuery({
    queryKey: ["crm-email-templates"],
    queryFn: async () => (await supabase.from("crm_email_templates").select("*").order("name")).data || [],
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { name: edit.name, subject: edit.subject, body_html: edit.body_html };
      if (edit.id) {
        const { error } = await supabase.from("crm_email_templates").update(payload).eq("id", edit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("crm_email_templates").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["crm-email-templates"] });
      setEdit(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_email_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["crm-email-templates"] }); },
  });

  return (
    <SuperAdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Mail className="h-6 w-6 text-primary" /> Email Templates</h1>
            <p className="text-sm text-muted-foreground">Reusable email bodies for your drip and one-off campaigns.</p>
          </div>
          <Button onClick={() => setEdit(empty)}><Plus className="h-4 w-4 mr-2" /> New template</Button>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          {list.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground md:col-span-2">No templates yet.</Card>
          ) : list.map((t: any) => (
            <Card key={t.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-sm text-muted-foreground truncate">{t.subject}</div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEdit(t)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive"
                    onClick={() => { if (confirm("Delete?")) remove.mutate(t.id); }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-2 line-clamp-3 whitespace-pre-wrap">{t.body_html?.replace(/<[^>]+>/g, " ")}</div>
            </Card>
          ))}
        </div>

        <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{edit?.id ? "Edit template" : "New template"}</DialogTitle></DialogHeader>
            {edit && (
              <div className="space-y-3">
                <div><Label>Name</Label><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
                <div><Label>Subject</Label><Input value={edit.subject} onChange={(e) => setEdit({ ...edit, subject: e.target.value })} placeholder="Welcome, {{full_name}}!" /></div>
                <div><Label>Body (HTML)</Label><Textarea rows={10} value={edit.body_html} onChange={(e) => setEdit({ ...edit, body_html: e.target.value })} /></div>
                <p className="text-xs text-muted-foreground">Variables: {`{{full_name}} {{email}} {{company}} {{phone}}`}</p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button>
              <Button onClick={() => save.mutate()} disabled={!edit?.name || !edit?.subject || save.isPending}>
                {save.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SuperAdminLayout>
  );
};

export default AdminCrmEmailTemplates;

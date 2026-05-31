import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Zap, Pencil, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";

const TRIGGER_LABELS: Record<string, string> = {
  lead_created: "New lead created",
  status_changed: "Lead status changed",
  activity_completed: "Activity completed",
  score_threshold: "Score crosses threshold",
  time_based: "Time-based",
  manual: "Manual only",
};

const AdminCrmAutomations = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ["crm-workflows"],
    queryFn: async () => (await apiGet<any[]>('/crm/workflows')) ?? [],
  });

  const { data: stats } = useQuery({
    queryKey: ["crm-workflow-stats"],
    queryFn: async () => (await apiGet<any>('/crm/workflow-stats')) ?? { total: 0, running: 0, done: 0, failed: 0 },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: any) =>
      apiPatch(`/crm/workflows/${id}`, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-workflows"] }),
  });

  const createNew = useMutation({
    mutationFn: async () =>
      apiPost<any>('/crm/workflows', {
        name: "Untitled workflow",
        trigger_type: "lead_created",
        trigger_config: {},
        is_active: false,
      }),
    onSuccess: (wf: any) => {
      toast.success("Workflow created");
      navigate(`/superadmin/crm/automations/${wf.id}`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => apiDelete(`/crm/workflows/${id}`),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["crm-workflows"] });
    },
  });

  return (
    <SuperAdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" /> Automations
            </h1>
            <p className="text-sm text-muted-foreground">
              Trigger emails, tasks and status changes automatically when leads enter your funnel.
            </p>
          </div>
          <Button onClick={() => createNew.mutate()} disabled={createNew.isPending}>
            <Plus className="h-4 w-4 mr-2" /> New workflow
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4">
            <div className="text-xs uppercase text-muted-foreground">Active workflows</div>
            <div className="text-2xl font-bold">{workflows.filter((w: any) => w.is_active).length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs uppercase text-muted-foreground">Total runs</div>
            <div className="text-2xl font-bold">{stats?.total ?? 0}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs uppercase text-muted-foreground">In progress</div>
            <div className="text-2xl font-bold">{stats?.running ?? 0}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs uppercase text-muted-foreground">Failed</div>
            <div className="text-2xl font-bold text-destructive">{stats?.failed ?? 0}</div>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Trigger</th>
                <th className="text-left p-3">Steps</th>
                <th className="text-left p-3">Created</th>
                <th className="text-left p-3">Active</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
              ) : workflows.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No workflows yet. Create one to start automating.</td></tr>
              ) : workflows.map((w: any) => (
                <tr key={w.id} className="border-t hover:bg-muted/30">
                  <td className="p-3">
                    <Link to={`/superadmin/crm/automations/${w.id}`} className="font-medium hover:underline">{w.name}</Link>
                    {w.description && <div className="text-xs text-muted-foreground">{w.description}</div>}
                  </td>
                  <td className="p-3">
                    <Badge variant="outline">{TRIGGER_LABELS[w.trigger_type] || w.trigger_type}</Badge>
                  </td>
                  <td className="p-3 text-muted-foreground">{w.steps?.length ?? 0}</td>
                  <td className="p-3 text-muted-foreground">{format(new Date(w.created_at), "MMM d, yyyy")}</td>
                  <td className="p-3">
                    <Switch checked={w.is_active} onCheckedChange={(v) => toggleActive.mutate({ id: w.id, is_active: v })} />
                  </td>
                  <td className="p-3 text-right">
                    <Button asChild size="icon" variant="ghost" className="h-8 w-8">
                      <Link to={`/superadmin/crm/automations/${w.id}`}><Pencil className="h-4 w-4" /></Link>
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive"
                      onClick={() => { if (confirm("Delete this workflow?")) remove.mutate(w.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </SuperAdminLayout>
  );
};

export default AdminCrmAutomations;

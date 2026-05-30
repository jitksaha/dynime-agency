import { useMemo } from "react";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { Card } from "@/components/ui/card";
import { useCrmLeads, useCrmPipelines, useCrmDeals, useCrmActivities } from "@/hooks/use-crm";
import { Users, Target, Calendar, DollarSign, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

const Stat = ({ label, value, icon: Icon, sub }: any) => (
  <Card className="p-5">
    <div className="flex items-center justify-between mb-2">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <Icon className="h-4 w-4 text-primary" />
    </div>
    <div className="text-3xl font-bold">{value}</div>
    {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
  </Card>
);

const AdminCrmDashboard = () => {
  const { data: leads = [] } = useCrmLeads();
  const { data: pipelines = [] } = useCrmPipelines();
  const pipeline = pipelines[0];
  const { data: deals = [] } = useCrmDeals(pipeline?.id);
  const { data: activities = [] } = useCrmActivities();

  const totalValue = deals.reduce((s: number, d: any) => s + Number(d.value || 0), 0);
  const open = activities.filter((a: any) => a.status === "open").length;
  const newLeads = leads.filter((l: any) => l.status === "new").length;

  const stageBreakdown = useMemo(() => {
    if (!pipeline) return [];
    return pipeline.stages.map((s: any) => ({
      ...s,
      count: deals.filter((d: any) => d.stage_id === s.id).length,
      value: deals.filter((d: any) => d.stage_id === s.id).reduce((sum: number, d: any) => sum + Number(d.value || 0), 0),
    }));
  }, [pipeline, deals]);

  return (
    <SuperAdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">CRM Dashboard</h1>
          <p className="text-sm text-muted-foreground">Live snapshot of your sales pipeline.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="Total leads" value={leads.length} icon={Users} sub={`${newLeads} new`} />
          <Stat label="Open deals" value={deals.length} icon={Target} />
          <Stat label="Pipeline value" value={`$${totalValue.toLocaleString()}`} icon={DollarSign} />
          <Stat label="Open tasks" value={open} icon={Calendar} />
        </div>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Pipeline by stage</h3>
          </div>
          <div className="space-y-3">
            {stageBreakdown.map((s: any) => {
              const max = Math.max(1, ...stageBreakdown.map((x: any) => x.value));
              return (
                <div key={s.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{s.name}</span>
                    <span className="text-muted-foreground">{s.count} deals · ${s.value.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${(s.value / max) * 100}%`, background: s.color || "var(--primary)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-5">
            <h3 className="font-semibold mb-3">Recent leads</h3>
            <div className="space-y-2">
              {leads.slice(0, 6).map((l: any) => (
                <Link key={l.id} to="/superadmin/crm/leads" className="flex justify-between items-center hover:bg-muted/40 px-2 py-1.5 rounded">
                  <div>
                    <div className="text-sm font-medium">{l.full_name}</div>
                    <div className="text-xs text-muted-foreground">{l.email}</div>
                  </div>
                  <span className="text-xs text-muted-foreground capitalize">{l.source.replace("_", " ")}</span>
                </Link>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="font-semibold mb-3">Tasks due soon</h3>
            <div className="space-y-2">
              {activities.filter((a: any) => a.status === "open").slice(0, 6).map((a: any) => (
                <Link key={a.id} to="/superadmin/crm/activities" className="flex justify-between items-center hover:bg-muted/40 px-2 py-1.5 rounded">
                  <div className="text-sm">{a.subject}</div>
                  <span className="text-xs text-muted-foreground capitalize">{a.type.replace("_", " ")}</span>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </SuperAdminLayout>
  );
};

export default AdminCrmDashboard;

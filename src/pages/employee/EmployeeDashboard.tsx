import { Link } from "react-router-dom";
import EmployeePortalLayout from "@/components/employee/EmployeePortalLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMyEmployee } from "@/hooks/use-my-employee";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/db/client";
import { FileText, Inbox, Plus, Briefcase, Calendar, MapPin, Building2 } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—");
const money = (n: number, c: string) => new Intl.NumberFormat(undefined, { style: "currency", currency: c || "USD", maximumFractionDigits: 0 }).format(n || 0);

const EmployeeDashboard = () => {
  usePageTitle("Employee · Dashboard");
  const { data: emp, isLoading } = useMyEmployee();

  const { data: stats } = useQuery({
    queryKey: ["employee-stats", emp?.id],
    enabled: !!emp?.id,
    queryFn: async () => {
      const [docs, reqs, pending] = await Promise.all([
        db.from("hr_documents").select("id", { count: "exact", head: true }).eq("employee_id", emp!.id),
        db.from("hr_requests").select("id", { count: "exact", head: true }).eq("employee_id", emp!.id),
        db.from("hr_requests").select("id", { count: "exact", head: true }).eq("employee_id", emp!.id).in("status", ["pending", "in_review"]),
      ]);
      return { docs: docs.count ?? 0, reqs: reqs.count ?? 0, pending: pending.count ?? 0 };
    },
  });

  const { data: recent } = useQuery({
    queryKey: ["employee-recent-requests", emp?.id],
    enabled: !!emp?.id,
    queryFn: async () => {
      const { data } = await db
        .from("hr_requests")
        .select("id, subject, category, status, created_at")
        .eq("employee_id", emp!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  if (isLoading) {
    return (
      <EmployeePortalLayout title="Welcome">
        <div className="text-muted-foreground">Loading…</div>
      </EmployeePortalLayout>
    );
  }

  if (!emp) {
    return (
      <EmployeePortalLayout title="No employee profile">
        <Card><CardContent className="p-6 text-sm text-muted-foreground">
          We couldn't find an employee record for your account. Please contact HR.
        </CardContent></Card>
      </EmployeePortalLayout>
    );
  }

  return (
    <EmployeePortalLayout
      title={`Hi, ${emp.full_name.split(" ")[0]} 👋`}
      description="Your work documents and requests, all in one place."
      actions={
        <Button asChild size="sm"><Link to="/employee/requests"><Plus className="h-4 w-4 mr-1.5" /> New request</Link></Button>
      }
    >
      <div className="grid gap-4">
        {/* Profile card */}
        <Card>
          <CardContent className="p-6 flex flex-col md:flex-row gap-6 items-start">
            <div className="h-20 w-20 rounded-full overflow-hidden bg-muted flex-shrink-0 border">
              {emp.photo_url ? (
                <img src={emp.photo_url} alt={emp.full_name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-2xl font-semibold text-muted-foreground">
                  {emp.full_name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 grid gap-2 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-heading text-xl font-bold">{emp.full_name}</h2>
                <Badge variant="outline" className="capitalize">{emp.status}</Badge>
                {emp.employee_code && <Badge variant="secondary">{emp.employee_code}</Badge>}
              </div>
              <div className="grid sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><Briefcase className="h-4 w-4" />{emp.designation || "—"}</div>
                <div className="flex items-center gap-2"><Building2 className="h-4 w-4" />{emp.department || "—"}</div>
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4" />Joined {fmtDate(emp.joining_date)}</div>
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4" />{emp.work_location || "—"}</div>
              </div>
              <div className="text-sm pt-2">
                <span className="text-muted-foreground">Current CTC:</span>{" "}
                <span className="font-semibold">{money(emp.gross_salary, emp.currency)}</span>
                <span className="text-muted-foreground"> / {emp.pay_cycle}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Documents</div>
              <div className="text-3xl font-bold mt-1">{stats?.docs ?? 0}</div>
              <Button variant="link" className="px-0 mt-1" asChild><Link to="/employee/documents">View all <FileText className="h-3.5 w-3.5 ml-1" /></Link></Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Total requests</div>
              <div className="text-3xl font-bold mt-1">{stats?.reqs ?? 0}</div>
              <Button variant="link" className="px-0 mt-1" asChild><Link to="/employee/requests">View all <Inbox className="h-3.5 w-3.5 ml-1" /></Link></Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Awaiting decision</div>
              <div className="text-3xl font-bold mt-1 text-amber-600">{stats?.pending ?? 0}</div>
              <div className="text-xs text-muted-foreground mt-1">Pending or in review</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent requests */}
        <Card>
          <CardHeader><CardTitle className="text-base">Recent requests</CardTitle></CardHeader>
          <CardContent className="pt-0">
            {recent && recent.length > 0 ? (
              <div className="divide-y">
                {recent.map((r) => (
                  <Link key={r.id} to="/employee/requests" className="flex items-center justify-between py-3 hover:bg-muted/40 -mx-2 px-2 rounded">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{r.subject}</div>
                      <div className="text-xs text-muted-foreground capitalize">{r.category.replace("_", " ")} · {fmtDate(r.created_at)}</div>
                    </div>
                    <Badge variant="outline" className="capitalize">{r.status.replace("_", " ")}</Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground py-6 text-center">
                No requests yet. Click "New request" to raise one.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </EmployeePortalLayout>
  );
};

export default EmployeeDashboard;

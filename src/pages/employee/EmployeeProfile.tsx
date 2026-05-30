import EmployeePortalLayout from "@/components/employee/EmployeePortalLayout";
import { Card, CardContent } from "@/components/ui/card";
import { useMyEmployee } from "@/hooks/use-my-employee";
import { usePageTitle } from "@/hooks/use-page-title";

const Row = ({ label, value }: { label: string; value: any }) => (
  <div className="grid grid-cols-3 gap-3 py-2 border-b last:border-b-0">
    <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="col-span-2 text-sm">{value || "—"}</div>
  </div>
);

const EmployeeProfile = () => {
  usePageTitle("Employee · Profile");
  const { data: emp } = useMyEmployee();

  return (
    <EmployeePortalLayout title="My Profile" description="Personal and employment details on file. Need a change? Raise a request.">
      <Card><CardContent className="p-6">
        {emp ? (
          <div className="space-y-1">
            <Row label="Full name" value={emp.full_name} />
            <Row label="Employee code" value={emp.employee_code} />
            <Row label="Email" value={emp.email} />
            <Row label="Phone" value={emp.phone} />
            <Row label="Address" value={emp.address} />
            <Row label="Designation" value={emp.designation} />
            <Row label="Department" value={emp.department} />
            <Row label="Employment type" value={emp.employment_type} />
            <Row label="Work location" value={emp.work_location} />
            <Row label="Joining date" value={emp.joining_date} />
            <Row label="Reporting to" value={emp.reporting_to} />
            <Row label="Status" value={emp.status} />
          </div>
        ) : <div className="text-muted-foreground text-sm">Loading…</div>}
      </CardContent></Card>
    </EmployeePortalLayout>
  );
};

export default EmployeeProfile;

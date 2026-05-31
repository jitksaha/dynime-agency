import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch } from "@/lib/api";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import VerificationBadge from "@/components/verification/VerificationBadge";
import { Loader2, Check, X, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const AdminCredit = () => {
  const qc = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-credit"],
    queryFn: () => apiGet<any[]>("/credit/applications"),
    refetchInterval: 20_000,
  });

  const setStatus = async (id: string, status: "approved" | "rejected" | "info_requested") => {
    setBusyId(id);
    try {
      await apiPatch(`/credit/applications/${id}`, {
        status,
        admin_notes: notes[id] ?? null,
      });
      toast.success(`Marked as ${status}`);
      qc.invalidateQueries({ queryKey: ["admin-credit"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally { setBusyId(null); }
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Credit Review</h1>
          <p className="text-sm text-muted-foreground">Approve, reject or request more information on credit limit applications</p>
        </div>

        <Card>
          <CardHeader><CardTitle>Applications ({rows.length})</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Admin Notes</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium text-sm">{r.profiles?.email || r.user_id?.slice(0, 8)}</div>
                        <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</div>
                      </TableCell>
                      <TableCell className="font-medium">${Number(r.requested_limit).toLocaleString()}</TableCell>
                      <TableCell className="text-sm">{r.business_revenue ? `$${Number(r.business_revenue).toLocaleString()}` : "—"}</TableCell>
                      <TableCell className="text-sm">{r.industry || "—"}</TableCell>
                      <TableCell><VerificationBadge status={r.status === "approved" ? "verified" : r.status === "rejected" ? "rejected" : r.status === "info_requested" ? "in_review" : "pending"} /></TableCell>
                      <TableCell className="min-w-[200px]">
                        <Textarea
                          rows={2}
                          defaultValue={r.admin_notes ?? ""}
                          onChange={e => setNotes({ ...notes, [r.id]: e.target.value })}
                          placeholder="Internal notes..."
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Button size="sm" onClick={() => setStatus(r.id, "approved")} disabled={busyId === r.id}><Check className="h-4 w-4 mr-1" />Approve</Button>
                          <Button size="sm" variant="destructive" onClick={() => setStatus(r.id, "rejected")} disabled={busyId === r.id}><X className="h-4 w-4 mr-1" />Reject</Button>
                          <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "info_requested")} disabled={busyId === r.id}><HelpCircle className="h-4 w-4 mr-1" />Request info</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No credit applications yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
};

export default AdminCredit;

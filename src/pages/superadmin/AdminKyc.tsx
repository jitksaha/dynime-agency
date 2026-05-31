import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { apiGet, apiPost } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import VerificationBadge from "@/components/verification/VerificationBadge";
import { Copy, ExternalLink, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const AdminKyc = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-kyc"],
    queryFn: () => apiGet<any[]>("/verification/kyc"),
    refetchInterval: 20_000,
  });

  const filtered = rows.filter((r: any) =>
    !search || [r.profile?.email, r.profile?.full_name, r.user_id, r.didit_session_id].some(
      (v: string) => v?.toLowerCase().includes(search.toLowerCase()),
    ),
  );

  const triggerFor = async (userId: string) => {
    setBusyId(userId);
    try {
      const data = await apiPost<{ verification_url?: string }>("/verification/session", {
        type: "kyc",
        target_user_id: userId,
        frontend_origin: window.location.origin,
      });
      if (data?.verification_url) {
        navigator.clipboard.writeText(data.verification_url);
        toast.success("New verification link created and copied");
      }
      qc.invalidateQueries({ queryKey: ["admin-kyc"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create verification link");
    } finally { setBusyId(null); }
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">KYC Management</h1>
            <p className="text-sm text-muted-foreground">Identity verifications powered by Didit</p>
          </div>
          <Input placeholder="Search email, name, session..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        </div>

        <Card>
          <CardHeader><CardTitle>All KYC Records ({filtered.length})</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Verified On</TableHead>
                    <TableHead>Session ID</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium">{r.profile?.full_name || r.profile?.email || r.user_id.slice(0, 8)}</div>
                        <div className="text-xs text-muted-foreground">{r.profile?.email}</div>
                      </TableCell>
                      <TableCell><VerificationBadge status={r.status} /></TableCell>
                      <TableCell className="text-sm">{r.verification_date ? new Date(r.verification_date).toLocaleString() : "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{r.didit_session_id?.slice(0, 12) || "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {r.verification_url && (
                            <>
                              <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(r.verification_url); toast.success("Link copied"); }}><Copy className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" asChild><a href={r.verification_url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a></Button>
                            </>
                          )}
                          <Button size="sm" variant="outline" onClick={() => triggerFor(r.user_id)} disabled={busyId === r.user_id}>
                            {busyId === r.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                            New link
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No verifications yet</TableCell></TableRow>
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

export default AdminKyc;

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import VerificationBadge from "@/components/verification/VerificationBadge";
import { Copy, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const AdminKyb = () => {
  const [search, setSearch] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-kyb"],
    queryFn: async () => {
      const { data } = await supabase
        .from("kyb_verifications")
        .select("*")
        .order("updated_at", { ascending: false });
      const rows = data ?? [];
      const uids = Array.from(new Set(rows.map((r: any) => r.user_id))).filter(Boolean);
      if (uids.length) {
        const { data: profs } = await supabase.from("profiles").select("id,email,full_name").in("id", uids);
        const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
        rows.forEach((r: any) => { r.profiles = map.get(r.user_id) ?? null; });
      }
      return rows;
    },
    refetchInterval: 20_000,
  });

  const filtered = rows.filter((r: any) =>
    !search || [r.company_name, r.profiles?.email, r.registration_number, r.didit_session_id]
      .some((v: string) => v?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <SuperAdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">KYB Management</h1>
            <p className="text-sm text-muted-foreground">Business verifications powered by Didit</p>
          </div>
          <Input placeholder="Search company, email..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        </div>

        <Card>
          <CardHeader><CardTitle>All KYB Records ({filtered.length})</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Verified On</TableHead>
                    <TableHead>Session</TableHead>
                    <TableHead>Link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium">{r.company_name}</div>
                        <div className="text-xs text-muted-foreground">{r.registration_number}</div>
                      </TableCell>
                      <TableCell className="text-sm">{r.profiles?.email || r.user_id.slice(0, 8)}</TableCell>
                      <TableCell className="text-sm">{r.country || "—"}</TableCell>
                      <TableCell><VerificationBadge status={r.status} /></TableCell>
                      <TableCell className="text-sm">{r.verification_date ? new Date(r.verification_date).toLocaleString() : "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{r.didit_session_id?.slice(0, 12) || "—"}</TableCell>
                      <TableCell>
                        {r.verification_url && (
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(r.verification_url); toast.success("Copied"); }}><Copy className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" asChild><a href={r.verification_url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a></Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No business verifications yet</TableCell></TableRow>
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

export default AdminKyb;

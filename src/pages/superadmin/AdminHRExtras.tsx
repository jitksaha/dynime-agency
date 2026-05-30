import { useState } from "react";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useAnnouncements, useUpsertAnnouncement, useLeaveRequests, useDecideLeave, useAttendance } from "@/hooks/use-hrm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pin, Check, X } from "lucide-react";
import { format } from "date-fns";

const emptyAnn = { title: "", body: "", audience: "all", pinned: false, is_published: true };

const AdminHRExtras = () => {
  const { data: anns = [] } = useAnnouncements();
  const upsertAnn = useUpsertAnnouncement();
  const { data: leaves = [] } = useLeaveRequests();
  const decide = useDecideLeave();
  const { data: attendance = [] } = useAttendance();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(emptyAnn);

  const save = async () => { await upsertAnn.mutateAsync(editing); setOpen(false); setEditing(emptyAnn); };

  return (
    <SuperAdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">HR Operations</h1>
          <p className="text-sm text-muted-foreground">Attendance, leave approvals, and company announcements.</p>
        </div>

        <Tabs defaultValue="leave">
          <TabsList>
            <TabsTrigger value="leave">Leave requests <Badge variant="secondary" className="ml-2 capitalize">{leaves.filter((l: any) => l.status === "pending").length}</Badge></TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="announcements">Announcements</TabsTrigger>
          </TabsList>

          <TabsContent value="leave" className="space-y-2">
            {leaves.length === 0 && <Card className="p-6 text-center text-sm text-muted-foreground">No leave requests yet.</Card>}
            {leaves.map((l: any) => (
              <Card key={l.id} className="p-4 flex items-center gap-4">
                <div className="flex-1">
                  <div className="font-medium">{l.leave_types?.name || "Leave"} — {l.days} days</div>
                  <div className="text-xs text-muted-foreground">{l.from_date} → {l.to_date}</div>
                  {l.reason && <div className="text-sm mt-1">{l.reason}</div>}
                </div>
                <Badge variant={l.status === "pending" ? "outline" : l.status === "approved" ? "default" : "destructive"} className="capitalize">{l.status}</Badge>
                {l.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => decide.mutate({ id: l.id, status: "approved" })}><Check className="h-4 w-4" /></Button>
                    <Button size="sm" variant="outline" onClick={() => decide.mutate({ id: l.id, status: "rejected" })}><X className="h-4 w-4" /></Button>
                  </div>
                )}
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="attendance">
            <Card className="p-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b">
                  <tr><th className="py-2">Date</th><th>Employee</th><th>Clock in</th><th>Clock out</th><th>Total</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {attendance.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">No records yet.</td></tr>}
                  {attendance.map((r: any) => (
                    <tr key={r.id} className="border-b">
                      <td className="py-2">{r.work_date}</td>
                      <td className="font-mono text-xs">{r.employee_id.slice(0, 8)}</td>
                      <td>{r.clock_in ? format(new Date(r.clock_in), "p") : "—"}</td>
                      <td>{r.clock_out ? format(new Date(r.clock_out), "p") : "—"}</td>
                      <td>{r.total_minutes ? `${Math.floor(r.total_minutes/60)}h ${r.total_minutes%60}m` : "—"}</td>
                      <td><Badge variant="outline" className="capitalize">{r.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </TabsContent>

          <TabsContent value="announcements" className="space-y-3">
            <div className="flex justify-end"><Button onClick={() => { setEditing(emptyAnn); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />New announcement</Button></div>
            {anns.map((a: any) => (
              <Card key={a.id} className="p-4 cursor-pointer hover:border-primary/50" onClick={() => { setEditing(a); setOpen(true); }}>
                <div className="flex items-center gap-2 mb-1">
                  {a.pinned && <Pin className="h-3 w-3 text-primary" />}
                  <div className="font-semibold">{a.title}</div>
                  <Badge variant="outline" className="ml-auto">{a.audience}</Badge>
                </div>
                <div className="text-sm text-muted-foreground line-clamp-2">{a.body}</div>
              </Card>
            ))}

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogContent>
                <DialogHeader><DialogTitle>{editing.id ? "Edit" : "New"} announcement</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Title</Label><Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
                  <div><Label>Body</Label><Textarea rows={6} value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} /></div>
                  <div className="flex items-center gap-3"><Switch checked={editing.pinned} onCheckedChange={(v) => setEditing({ ...editing, pinned: v })} /><Label>Pin to top</Label></div>
                  <div className="flex items-center gap-3"><Switch checked={editing.is_published} onCheckedChange={(v) => setEditing({ ...editing, is_published: v })} /><Label>Published</Label></div>
                </div>
                <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} disabled={!editing.title || !editing.body}>Save</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </div>
    </SuperAdminLayout>
  );
};

export default AdminHRExtras;

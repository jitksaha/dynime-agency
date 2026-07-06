import { useMemo, useState } from "react";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Briefcase, Star, Search, MapPin, Clock, ExternalLink, Copy, RefreshCw } from "lucide-react";
import { useSyncedJobs, useSyncFlowmingoJobs } from "@/hooks/use-cms-data";

const AdminCareers = () => {
  const [search, setSearch] = useState("");

  const { data: response, isLoading } = useSyncedJobs({ per_page: 200 });
  const syncJobsMutation = useSyncFlowmingoJobs();

  const jobs = useMemo(() => response?.data || [], [response]);

  const handleSyncFlowmingo = async () => {
    const toastId = toast.loading("Syncing jobs from Flowmingo ATS...");
    try {
      await syncJobsMutation.mutateAsync();
      toast.success("Jobs synchronized successfully!", { id: toastId });
    } catch (e: any) {
      toast.error(e.message || "Failed to synchronize jobs", { id: toastId });
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        (j.department || "").toLowerCase().includes(q) ||
        (j.location || "").toLowerCase().includes(q),
    );
  }, [jobs, search]);

  const stats = useMemo(
    () => ({
      total: jobs.length,
      active: jobs.filter((j) => j.status === "open").length,
      closed: jobs.filter((j) => j.status === "closed").length,
      departments: new Set(jobs.map((j) => j.department).filter(Boolean)).size,
    }),
    [jobs],
  );

  const copyShareLink = (slug: string) => {
    const url = `${window.location.protocol}//${window.location.host}/careers/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Public link copied to clipboard!");
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-primary" /> Synced Job Posts
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Synchronize, monitor, and view all active positions posted on your Flowmingo ATS.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleSyncFlowmingo} disabled={syncJobsMutation.isPending} className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-xl">
              <RefreshCw className={`w-4 h-4 mr-2 ${syncJobsMutation.isPending ? "animate-spin" : ""}`} /> Sync Flowmingo
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Synced", value: stats.total, icon: Briefcase },
            { label: "Open/Active", value: stats.active, icon: Clock },
            { label: "Closed", value: stats.closed, icon: Clock },
            { label: "Departments", value: stats.departments, icon: MapPin },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 rounded-md bg-primary/10 text-primary"><s.icon className="w-3.5 h-3.5" /></div>
                  <p className="text-xs font-semibold text-muted-foreground">{s.label}</p>
                </div>
                <p className="text-xl font-bold text-foreground">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="text-lg">All Sync Positions</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{filtered.length} of {jobs.length} synced positions</p>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by title, dept, location…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading synced positions...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Briefcase className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
                <p className="text-sm font-medium">No synced positions found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Click "Sync Flowmingo" to fetch latest positions from ATS.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Salary</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((j) => {
                      const displaySalary = j.salary_range || (
                        j.salary_min != null && j.salary_max != null
                          ? `${j.salary_currency || 'USD'} ${Number(j.salary_min).toLocaleString()} – ${Number(j.salary_max).toLocaleString()}${j.salary_period ? ' / ' + j.salary_period : ''}`
                          : "Negotiable"
                      );
                      return (
                        <TableRow key={j.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-1.5">
                              {j.title}
                              {j.featured && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[9px] font-bold uppercase tracking-wider">
                                  <Star className="w-2 h-2 fill-amber-500" /> Featured
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">/{j.slug}</div>
                          </TableCell>
                          <TableCell className="text-xs">{j.department || "General"}</TableCell>
                          <TableCell className="text-xs">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-[10px] text-foreground">{j.location}</span>
                              <span className="text-[9px] text-muted-foreground">{j.employment_type}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">{displaySalary}</TableCell>
                          <TableCell className="text-xs">
                            <Badge variant={j.status === "open" ? "default" : "secondary"} className="text-[9px] h-5 px-1.5 uppercase font-bold">
                              {j.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Copy public link" onClick={() => copyShareLink(j.slug)}>
                                <Copy className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Open public page" asChild>
                                <a href={`/careers/${j.slug}`} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
};

export default AdminCareers;

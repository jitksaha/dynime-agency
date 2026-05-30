import { useState } from "react";
import EmployeePortalLayout from "@/components/employee/EmployeePortalLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMyEmployee } from "@/hooks/use-my-employee";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePageTitle } from "@/hooks/use-page-title";

const KIND_LABEL: Record<string, string> = {
  offer: "Offer Letter",
  agreement: "Employment Agreement",
  payslip: "Payslip",
  experience: "Experience Letter",
  relieving: "Relieving Letter",
};

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—");

const EmployeeDocuments = () => {
  usePageTitle("Employee · Documents");
  const { data: emp } = useMyEmployee();
  const [downloading, setDownloading] = useState<string | null>(null);

  const { data: docs, isLoading } = useQuery({
    queryKey: ["employee-docs", emp?.id],
    enabled: !!emp?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_documents")
        .select("id, kind, doc_number, title, period_month, issue_date, status, pdf_storage_path")
        .eq("employee_id", emp!.id)
        .order("issue_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const download = async (docId: string) => {
    setDownloading(docId);
    try {
      const { data, error } = await supabase.functions.invoke("get-my-hr-document", { body: { doc_id: docId } });
      if (error) throw error;
      if (!data?.url) throw new Error("No download URL");
      window.open(data.url as string, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Could not get download link");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <EmployeePortalLayout title="My Documents" description="Offer letters, agreements, payslips and more — all your HR documents in one place.">
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Loading…</div>
          ) : !docs || docs.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">No documents issued yet.</div>
          ) : (
            <div className="divide-y">
              {docs.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between p-4 gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{KIND_LABEL[d.kind] ?? d.kind}{d.period_month ? ` · ${new Date(d.period_month).toLocaleDateString(undefined, { month: "short", year: "numeric" })}` : ""}</div>
                      <div className="text-xs text-muted-foreground font-mono">{d.doc_number || "—"} · Issued {fmtDate(d.issue_date)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">{d.status}</Badge>
                    <Button size="sm" variant="outline" disabled={!d.pdf_storage_path || downloading === d.id} onClick={() => download(d.id)}>
                      {downloading === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Download className="h-4 w-4 mr-1.5" />PDF</>}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </EmployeePortalLayout>
  );
};

export default EmployeeDocuments;

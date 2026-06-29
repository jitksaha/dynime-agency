import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/db/client";
import { useAuth } from "@/hooks/use-auth";
import InvestorPortalLayout from "@/components/investor/InvestorPortalLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { usePageTitle } from "@/hooks/use-page-title";
import { useSEO } from "@/hooks/use-seo";

const fmt = (n: number, cur = "USD") =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: cur }).format(n || 0);

const typeLabel: Record<string, string> = {
  monthly: "Monthly return",
  bonus: "Biannual bonus",
  profit_share: "Profit share",
  principal: "Principal return",
  adjustment: "Adjustment",
  fee: "Fee",
  penalty: "Penalty",
  loss: "Loss",
};

const InvestorStatements = () => {
  usePageTitle("Investor · Statements");
  useSEO({ title: "Investor Statements", noIndex: true });
  const { user } = useAuth();

  const { data: payouts, isLoading } = useQuery({
    queryKey: ["investor-statements", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await db
        .from("investment_payouts" as any)
        .select("*, investments:investment_id(plan_name)")
        .eq("investor_id", user!.id)
        .order("period_end", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const downloadStatement = async (path: string) => {
    try {
      const { data, error } = await db.storage
        .from("investor-documents")
        .createSignedUrl(path, 60 * 60);
      if (error) throw error;
      window.open(data.signedUrl, "_blank", "noopener");
    } catch (err: any) {
      toast.error(err?.message || "Could not open statement");
    }
  };

  return (
    <InvestorPortalLayout
      title="Statements & payouts"
      description="Every monthly return, biannual bonus and profit-share distribution from Dynime LLC."
    >
      {isLoading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : !payouts?.length ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            No statements yet. Once your first payout is scheduled it will appear here.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground border-b">
                  <tr>
                    <th className="text-left py-3 px-4">Period</th>
                    <th className="text-left py-3 px-2">Plan</th>
                    <th className="text-left py-3 px-2">Type</th>
                    <th className="text-right py-3 px-2">Amount</th>
                    <th className="text-left py-3 px-2">Status</th>
                    <th className="text-left py-3 px-2">Paid on</th>
                    <th className="text-right py-3 px-4">Statement</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {payouts.map((p: any) => (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="py-3 px-4">
                        {p.period_start ? new Date(p.period_start).toLocaleDateString() : "—"}
                        {p.period_end ? ` – ${new Date(p.period_end).toLocaleDateString()}` : ""}
                      </td>
                      <td className="py-3 px-2 text-muted-foreground">
                        {p.investments?.plan_name ?? "—"}
                      </td>
                      <td className="py-3 px-2">
                        <span className="inline-flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                          {typeLabel[p.payout_type] ?? p.payout_type}
                        </span>
                      </td>
                      <td className={`py-3 px-2 text-right font-medium ${Number(p.amount) < 0 ? "text-destructive" : ""}`}>{fmt(Number(p.amount), p.currency)}</td>
                      <td className="py-3 px-2">
                        <Badge variant={p.status === "paid" ? "default" : "outline"} className="capitalize">{p.status}</Badge>
                      </td>
                      <td className="py-3 px-2 text-muted-foreground">
                        {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {p.statement_pdf_path ? (
                          <Button size="sm" variant="ghost" onClick={() => downloadStatement(p.statement_pdf_path)}>
                            <Download className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </InvestorPortalLayout>
  );
};

export default InvestorStatements;

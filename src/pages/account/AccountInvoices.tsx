import { Link } from "react-router-dom";
import AccountLayout from "@/components/account/AccountLayout";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Eye } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";

const AccountInvoices = () => {
  usePageTitle("Invoices");
  const { user } = useAuth();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["account-invoices", user?.email],
    queryFn: async () => {
      return apiGet<any[]>("/orders/mine");
    },
    enabled: !!user?.email,
  });

  const invoices = (orders || []).filter((o: any) => o.invoice_number || o.status === "paid" || o.status === "completed");

  return (
    <AccountLayout title="Invoices" description="Download and view all your Dynime invoices.">
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : invoices.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card text-center py-12">
          <FileText className="w-14 h-14 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="font-heading text-lg font-semibold mb-1">No invoices yet</h3>
          <p className="text-sm text-muted-foreground">Your invoices will appear here after your first paid order.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {/* Header (desktop) */}
          <div className="hidden md:grid grid-cols-[1.2fr_1fr_1fr_120px_180px] gap-4 px-5 py-3 border-b border-border bg-secondary/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <div>Invoice</div>
            <div>Date</div>
            <div>Status</div>
            <div className="text-right">Amount</div>
            <div className="text-right">Actions</div>
          </div>

          {invoices.map((o: any) => {
            const ref = o.invoice_number || o.id;
            const isPaid = o.status === "paid" || o.status === "completed";
            return (
              <div
                key={o.id}
                className="grid md:grid-cols-[1.2fr_1fr_1fr_120px_180px] gap-2 md:gap-4 px-5 py-4 border-b border-border last:border-0 items-center hover:bg-secondary/30 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <span className="font-mono text-sm font-semibold truncate">
                      {o.invoice_number || `#${o.id.slice(0, 8).toUpperCase()}`}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5 md:hidden">
                    {new Date(o.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="hidden md:block text-sm text-muted-foreground">
                  {new Date(o.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </div>
                <div>
                  <Badge
                    variant="outline"
                    className={
                      isPaid
                        ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
                        : "bg-yellow-500/15 text-yellow-700 border-yellow-500/30"
                    }
                  >
                    {isPaid ? "Paid" : o.status}
                  </Badge>
                </div>
                <div className="text-right font-semibold">${Number(o.total).toFixed(2)}</div>
                <div className="flex md:justify-end gap-2">
                  <Link
                    to={`/invoice/${ref}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-secondary hover:bg-secondary/70 text-foreground transition-colors"
                  >
                    <Eye className="w-3 h-3" /> View
                  </Link>
                  <a
                    href={`/invoice/${ref}?print=1`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:brightness-110 transition-all"
                  >
                    <Download className="w-3 h-3" /> PDF
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AccountLayout>
  );
};

export default AccountInvoices;

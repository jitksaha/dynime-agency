import { Link } from "react-router-dom";
import AccountLayout from "@/components/account/AccountLayout";
import { useCustomerServices } from "@/hooks/use-customer-services";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Package, FileText, Calendar, Sparkles } from "lucide-react";
import { useState } from "react";
import { usePageTitle } from "@/hooks/use-page-title";

const TABS = [
  { key: "all", label: "All" },
  { key: "web", label: "Web" },
  { key: "marketing", label: "Marketing" },
  { key: "gateway", label: "Gateway" },
  { key: "other", label: "Other" },
] as const;

const AccountServices = () => {
  usePageTitle("My Services");
  const [tab, setTab] = useState<typeof TABS[number]["key"]>("all");
  const { data: services, isLoading } = useCustomerServices();

  const filtered = (services || []).filter((s) => s.category !== "company_formation").filter((s) => tab === "all" || s.category === tab);

  return (
    <AccountLayout title="My Services" description="Web, marketing, gateway and other deliverable services.">
      <div className="flex gap-1 p-1 bg-secondary rounded-lg mb-5 w-fit">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${tab === t.key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card text-center py-12">
          <Sparkles className="w-14 h-14 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="font-heading text-lg font-semibold mb-1">No services in this category</h3>
          <Link to="/services" className="text-sm font-semibold text-primary hover:underline">Discover our services →</Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((s) => (
            <div key={s.id} className="rounded-2xl border border-border bg-card p-5 flex flex-col">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Package className="w-5 h-5" /></div>
                <Badge variant="outline" className="capitalize">{s.status.replace("_", " ")}</Badge>
              </div>
              <h3 className="font-heading text-base font-semibold mb-1 line-clamp-2">{s.service_name}</h3>
              <p className="text-xs text-muted-foreground capitalize mb-2">{s.category} · {s.type === "recurring" ? s.billing_cycle : "one-time"}</p>
              <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-4">
                <Calendar className="w-3 h-3" /> {new Date(s.started_at).toLocaleDateString()}
              </div>
              <div className="mt-auto pt-3 border-t border-border flex items-center justify-between">
                <span className="font-heading text-lg font-bold">${Number(s.price).toFixed(2)}</span>
                {s.invoice_number && (
                  <Link to={`/invoice/${s.invoice_number}`} className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1">
                    <FileText className="w-3 h-3" /> Invoice
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AccountLayout>
  );
};

export default AccountServices;

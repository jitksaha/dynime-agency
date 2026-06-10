import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import InvestorPortalLayout from "@/components/investor/InvestorPortalLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { FileSignature, Download, Eye, Loader2, ShieldCheck } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { useSEO } from "@/hooks/use-seo";

const fmt = (n: number, cur = "USD") =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: cur }).format(n || 0);

const InvestorAgreements = () => {
  usePageTitle("Investor · Agreements");
  useSEO({ title: "Investor Agreements", noIndex: true });
  const { user } = useAuth();
  const qc = useQueryClient();

  const [signOpen, setSignOpen] = useState(false);
  const [activeInv, setActiveInv] = useState<any>(null);
  const [signerName, setSignerName] = useState("");
  const [consent, setConsent] = useState(false);
  const [busyAction, setBusyAction] = useState<"preview" | "sign" | null>(null);

  const { data: investments, isLoading } = useQuery({
    queryKey: ["investor-agreements", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investments" as any)
        .select("*")
        .eq("investor_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const callFn = async (inv: any, action: "preview" | "sign") => {
    setBusyAction(action);
    try {
      const { data, error } = await supabase.functions.invoke("generate-investment-agreement", {
        body: {
          investment_id: inv.id,
          action,
          signer_name: action === "sign" ? signerName.trim() : undefined,
        },
      });
      if (error) throw error;
      const url = (data as any)?.signed_url || (data as any)?.url;
      if (url) window.open(url, "_blank", "noopener");
      if (action === "sign") {
        toast.success("Agreement signed");
        setSignOpen(false);
        setSignerName("");
        setConsent(false);
        await qc.invalidateQueries({ queryKey: ["investor-agreements", user?.id] });
        await qc.invalidateQueries({ queryKey: ["investor-investments", user?.id] });
      }
    } catch (err: any) {
      toast.error(err?.message || "Could not generate agreement");
    } finally {
      setBusyAction(null);
    }
  };

  const downloadSigned = async (inv: any) => {
    if (!inv.agreement_pdf_path) return;
    try {
      const { data, error } = await supabase.storage
        .from("investor-documents")
        .createSignedUrl(inv.agreement_pdf_path, 60 * 60);
      if (error) throw error;
      window.open(data.signedUrl, "_blank", "noopener");
    } catch (err: any) {
      toast.error(err?.message || "Could not open document");
    }
  };

  return (
    <InvestorPortalLayout
      title="Agreements"
      description="Preview and digitally sign your investment agreements. Signed copies are stored in your portal."
    >
      {isLoading ? (
        <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : !investments?.length ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            You don't have any investments yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {investments.map((inv: any) => {
            const signed = inv.agreement_status === "signed";
            return (
              <Card key={inv.id}>
                <CardContent className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <FileSignature className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{inv.plan_name} agreement</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {fmt(Number(inv.amount), inv.currency)} ·{" "}
                        {inv.lock_period_months ? `${inv.lock_period_months}-month cycle` : "Custom"} ·{" "}
                        Created {new Date(inv.created_at).toLocaleDateString()}
                      </div>
                      {signed && inv.agreement_signed_at && (
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" />
                          Signed by {inv.agreement_signed_by_name} on{" "}
                          {new Date(inv.agreement_signed_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={signed ? "default" : "outline"}>{inv.agreement_status}</Badge>
                    <Button size="sm" variant="outline" onClick={() => callFn(inv, "preview")}>
                      <Eye className="h-4 w-4 mr-1.5" /> Preview
                    </Button>
                    {signed ? (
                      <Button size="sm" variant="outline" onClick={() => downloadSigned(inv)}>
                        <Download className="h-4 w-4 mr-1.5" /> Signed PDF
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => {
                          setActiveInv(inv);
                          setSignerName((user?.user_metadata as any)?.full_name ?? "");
                          setConsent(false);
                          setSignOpen(true);
                        }}
                      >
                        <FileSignature className="h-4 w-4 mr-1.5" /> Sign now
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={signOpen} onOpenChange={setSignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign agreement</DialogTitle>
            <DialogDescription>
              By signing you confirm you have read the {activeInv?.plan_name} terms and accept them as a binding
              contract with Dynime Inc.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="signer">Full legal name</Label>
              <Input
                id="signer"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="As it appears on your ID"
                autoFocus
              />
            </div>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={consent} onCheckedChange={(v) => setConsent(!!v)} className="mt-0.5" />
              <span className="text-muted-foreground">
                I have reviewed the agreement, understand the lock-in period and risk policy, and consent to a
                digital signature equivalent to a handwritten signature.
              </span>
            </label>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setSignOpen(false)} disabled={busyAction === "sign"}>Cancel</Button>
            <Button
              onClick={() => callFn(activeInv, "sign")}
              disabled={!signerName.trim() || !consent || busyAction === "sign"}
            >
              {busyAction === "sign" ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <FileSignature className="h-4 w-4 mr-1.5" />}
              Sign & save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </InvestorPortalLayout>
  );
};

export default InvestorAgreements;

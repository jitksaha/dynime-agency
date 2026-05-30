import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import AccountLayout from "@/components/account/AccountLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import VerificationBadge from "@/components/verification/VerificationBadge";
import { ShieldCheck, Building2, CreditCard, ExternalLink, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";

const AccountVerification = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [creatingKyc, setCreatingKyc] = useState(false);
  const [creatingKyb, setCreatingKyb] = useState(false);
  const [creatingCredit, setCreatingCredit] = useState(false);
  const [kybOpen, setKybOpen] = useState(false);
  const [creditOpen, setCreditOpen] = useState(false);

  const [kybForm, setKybForm] = useState({
    company_name: "", registration_number: "", country: "", business_type: "",
    website: "", tax_id: "",
  });
  const [creditForm, setCreditForm] = useState({
    requested_limit: "", business_revenue: "", business_age: "",
    industry: "", country: "", notes: "",
  });

  const { data: kyc } = useQuery({
    enabled: !!user,
    queryKey: ["kyc", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("kyc_verifications").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    refetchInterval: 15_000,
  });

  const { data: kybs = [] } = useQuery({
    enabled: !!user,
    queryKey: ["kyb", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("kyb_verifications").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
    refetchInterval: 15_000,
  });

  const { data: creditApps = [] } = useQuery({
    enabled: !!user,
    queryKey: ["credit-apps", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("credit_applications").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const kybVerified = useMemo(() => kybs.some((k: any) => k.status === "verified"), [kybs]);
  const kycVerified = kyc?.status === "verified";
  const creditEligible = kycVerified && kybVerified;

  const startKyc = async () => {
    setCreatingKyc(true);
    try {
      const { data, error } = await supabase.functions.invoke("didit-create-session", { body: { type: "kyc" } });
      if (error) throw error;
      if (data?.verification_url) {
        window.open(data.verification_url, "_blank", "noopener,noreferrer");
        toast.success("Verification link opened in a new tab");
      }
      qc.invalidateQueries({ queryKey: ["kyc"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to start verification");
    } finally { setCreatingKyc(false); }
  };

  const startKyb = async () => {
    if (!kybForm.company_name.trim()) return toast.error("Company name is required");
    setCreatingKyb(true);
    try {
      const { data, error } = await supabase.functions.invoke("didit-create-session", {
        body: { type: "kyb", ...kybForm },
      });
      if (error) throw error;
      if (data?.verification_url) {
        window.open(data.verification_url, "_blank", "noopener,noreferrer");
        toast.success("Business verification link opened");
      }
      setKybOpen(false);
      setKybForm({ company_name: "", registration_number: "", country: "", business_type: "", website: "", tax_id: "" });
      qc.invalidateQueries({ queryKey: ["kyb"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to start business verification");
    } finally { setCreatingKyb(false); }
  };

  const submitCredit = async () => {
    if (!creditEligible) return toast.error("Both KYC and KYB must be verified first");
    const amt = parseFloat(creditForm.requested_limit);
    if (!amt || amt <= 0) return toast.error("Enter a valid requested limit");
    setCreatingCredit(true);
    try {
      const { error } = await supabase.from("credit_applications").insert({
        user_id: user!.id,
        requested_limit: amt,
        business_revenue: creditForm.business_revenue ? parseFloat(creditForm.business_revenue) : null,
        business_age: creditForm.business_age || null,
        industry: creditForm.industry || null,
        country: creditForm.country || null,
        notes: creditForm.notes || null,
      });
      if (error) throw error;
      toast.success("Credit application submitted");
      setCreditOpen(false);
      setCreditForm({ requested_limit: "", business_revenue: "", business_age: "", industry: "", country: "", notes: "" });
      qc.invalidateQueries({ queryKey: ["credit-apps"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to submit");
    } finally { setCreatingCredit(false); }
  };

  const copy = (s?: string | null) => {
    if (!s) return;
    navigator.clipboard.writeText(s);
    toast.success("Link copied");
  };

  return (
    <AccountLayout title="Verification Center" description="Verify your identity and business to unlock services like payment processing, credit limits and virtual cards.">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* KYC */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />Identity (KYC)</CardTitle>
              <VerificationBadge status={kyc?.status} />
            </div>
            <CardDescription>Personal identity verification powered by Didit.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {kyc?.verification_date && (
              <div className="text-sm text-muted-foreground">Verified on {new Date(kyc.verification_date).toLocaleDateString()}</div>
            )}
            {kyc?.verification_url && kyc.status !== "verified" && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={kyc.verification_url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 mr-1" />Resume</a>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => copy(kyc.verification_url)}><Copy className="h-4 w-4 mr-1" />Copy link</Button>
              </div>
            )}
            {kyc?.status !== "verified" && (
              <Button onClick={startKyc} disabled={creatingKyc} className="w-full">
                {creatingKyc && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {kyc ? "Restart verification" : "Verify Identity"}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* KYB */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" />Business (KYB)</CardTitle>
              <VerificationBadge status={kybVerified ? "verified" : (kybs[0]?.status ?? "not_submitted")} />
            </div>
            <CardDescription>Verify your company for payment services and credit access.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {kybs.length > 0 && (
              <div className="space-y-2">
                {kybs.slice(0, 3).map((k: any) => (
                  <div key={k.id} className="flex items-center justify-between text-sm border rounded-md px-3 py-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{k.company_name}</div>
                      <div className="text-xs text-muted-foreground truncate">{k.country || "—"}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <VerificationBadge status={k.status} />
                      {k.verification_url && k.status !== "verified" && (
                        <Button size="icon" variant="ghost" onClick={() => copy(k.verification_url)}><Copy className="h-4 w-4" /></Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Dialog open={kybOpen} onOpenChange={setKybOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">Verify Business</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Business Verification</DialogTitle></DialogHeader>
                <div className="grid gap-3">
                  <div><Label>Company Name *</Label><Input value={kybForm.company_name} onChange={e => setKybForm({ ...kybForm, company_name: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Registration #</Label><Input value={kybForm.registration_number} onChange={e => setKybForm({ ...kybForm, registration_number: e.target.value })} /></div>
                    <div><Label>Country</Label><Input value={kybForm.country} onChange={e => setKybForm({ ...kybForm, country: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Business Type</Label><Input placeholder="LLC, Corp..." value={kybForm.business_type} onChange={e => setKybForm({ ...kybForm, business_type: e.target.value })} /></div>
                    <div><Label>Tax ID (optional)</Label><Input value={kybForm.tax_id} onChange={e => setKybForm({ ...kybForm, tax_id: e.target.value })} /></div>
                  </div>
                  <div><Label>Website</Label><Input value={kybForm.website} onChange={e => setKybForm({ ...kybForm, website: e.target.value })} /></div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setKybOpen(false)}>Cancel</Button>
                  <Button onClick={startKyb} disabled={creatingKyb}>
                    {creatingKyb && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Start KYB
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Credit */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" />Credit Eligibility</CardTitle>
              <VerificationBadge status={creditEligible ? "verified" : "pending"} />
            </div>
            <CardDescription>Unlock credit limit & virtual cards by verifying both KYC and KYB.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="text-sm space-y-1.5">
              <li className="flex items-center justify-between"><span>Identity (KYC)</span><VerificationBadge status={kyc?.status} /></li>
              <li className="flex items-center justify-between"><span>Business (KYB)</span><VerificationBadge status={kybVerified ? "verified" : (kybs[0]?.status ?? "not_submitted")} /></li>
            </ul>
            <Dialog open={creditOpen} onOpenChange={setCreditOpen}>
              <DialogTrigger asChild>
                <Button className="w-full" disabled={!creditEligible}>
                  {creditEligible ? "Apply for Credit" : "Complete KYC & KYB first"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Credit Application</DialogTitle></DialogHeader>
                <div className="grid gap-3">
                  <div><Label>Requested Limit (USD) *</Label><Input type="number" value={creditForm.requested_limit} onChange={e => setCreditForm({ ...creditForm, requested_limit: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Business Revenue (USD/yr)</Label><Input type="number" value={creditForm.business_revenue} onChange={e => setCreditForm({ ...creditForm, business_revenue: e.target.value })} /></div>
                    <div><Label>Business Age</Label><Input placeholder="2 years" value={creditForm.business_age} onChange={e => setCreditForm({ ...creditForm, business_age: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Industry</Label><Input value={creditForm.industry} onChange={e => setCreditForm({ ...creditForm, industry: e.target.value })} /></div>
                    <div><Label>Country</Label><Input value={creditForm.country} onChange={e => setCreditForm({ ...creditForm, country: e.target.value })} /></div>
                  </div>
                  <div><Label>Notes</Label><Textarea value={creditForm.notes} onChange={e => setCreditForm({ ...creditForm, notes: e.target.value })} /></div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreditOpen(false)}>Cancel</Button>
                  <Button onClick={submitCredit} disabled={creatingCredit}>
                    {creatingCredit && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Submit
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      {creditApps.length > 0 && (
        <Card className="mt-6">
          <CardHeader><CardTitle>Your Credit Applications</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {creditApps.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between border rounded-md px-3 py-2 text-sm">
                  <div>
                    <div className="font-medium">${Number(a.requested_limit).toLocaleString()} requested</div>
                    <div className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div>
                  </div>
                  <VerificationBadge status={a.status === "approved" ? "verified" : a.status === "rejected" ? "rejected" : "in_review"} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </AccountLayout>
  );
};

export default AccountVerification;

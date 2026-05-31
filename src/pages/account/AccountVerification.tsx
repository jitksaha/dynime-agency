import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
import { ShieldCheck, Building2, CreditCard, Copy, Loader2, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";

/* ─── Popup helpers ────────────────────────────────────────────────── */
const openCenteredPopup = (url: string, name: string) => {
  const w = 540;
  const h = 720;
  const left = Math.max(0, Math.round((window.screen.width - w) / 2));
  const top = Math.max(0, Math.round((window.screen.height - h) / 2));
  return window.open(
    url, name,
    `width=${w},height=${h},left=${left},top=${top},scrollbars=yes,resizable=yes`,
  );
};

/* ─── Component ─────────────────────────────────────────────────────── */
const AccountVerification = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [creatingKyc, setCreatingKyc] = useState(false);
  const [creatingKyb, setCreatingKyb] = useState(false);
  const [creatingCredit, setCreatingCredit] = useState(false);
  const [kybOpen, setKybOpen] = useState(false);
  const [creditOpen, setCreditOpen] = useState(false);

  const [popupType, setPopupType] = useState<"kyc" | "kyb" | null>(null);
  const popupRef = useRef<Window | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [kybForm, setKybForm] = useState({
    company_name: "", registration_number: "", country: "", business_type: "",
    website: "", tax_id: "",
  });
  const [creditForm, setCreditForm] = useState({
    requested_limit: "", business_revenue: "", business_age: "",
    industry: "", country: "", notes: "",
  });

  /* ── Queries ── */
  const { data: kyc } = useQuery({
    enabled: !!user,
    queryKey: ["kyc", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("kyc_verifications").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    refetchInterval: 10_000,
  });

  const { data: kybs = [] } = useQuery({
    enabled: !!user,
    queryKey: ["kyb", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("kyb_verifications").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
    refetchInterval: 10_000,
  });

  const { data: creditApps = [] } = useQuery({
    enabled: !!user,
    queryKey: ["credit-apps", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("credit_applications").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  /* ── Handle Didit redirect-back params (?kyc_done=1 / ?kyb_done=1) ── */
  useEffect(() => {
    const kyc_done = searchParams.get("kyc_done");
    const kyb_done = searchParams.get("kyb_done");
    if (kyc_done || kyb_done) {
      // Remove the params from the URL without a hard reload
      setSearchParams({}, { replace: true });
      toast.success("Verification submitted! Status will update shortly.");
      // Give the webhook a few seconds then force-refetch
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ["kyc"] });
        qc.invalidateQueries({ queryKey: ["kyb"] });
      }, 2000);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Popup lifecycle ── */
  const startPopupPoll = (popup: Window, type: "kyc" | "kyb") => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(pollRef.current!);
        pollRef.current = null;
        setPopupType(null);
        popupRef.current = null;
        qc.invalidateQueries({ queryKey: ["kyc"] });
        qc.invalidateQueries({ queryKey: ["kyb"] });
        toast.info("Checking verification status…");
      }
    }, 600);
  };

  const dismissPopup = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    popupRef.current?.close();
    popupRef.current = null;
    setPopupType(null);
    qc.invalidateQueries({ queryKey: ["kyc"] });
    qc.invalidateQueries({ queryKey: ["kyb"] });
  };

  /* ── Actions ── */
  const startKyc = async () => {
    setCreatingKyc(true);
    try {
      const { data, error } = await supabase.functions.invoke("didit-create-session", {
        body: { type: "kyc", frontend_origin: window.location.origin },
      });
      if (error) throw error;
      const url: string | undefined = data?.verification_url;
      if (!url) throw new Error("No verification URL returned");

      const popup = openCenteredPopup(url, "didit_kyc");
      if (popup) {
        popupRef.current = popup;
        setPopupType("kyc");
        startPopupPoll(popup, "kyc");
      } else {
        // Popup blocked — fall back to new tab
        window.open(url, "_blank", "noopener,noreferrer");
        toast.info("Opened in a new tab — return here when done.");
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
        body: { type: "kyb", frontend_origin: window.location.origin, ...kybForm },
      });
      if (error) throw error;
      const url: string | undefined = data?.verification_url;
      if (!url) throw new Error("No verification URL returned");

      setKybOpen(false);
      setKybForm({ company_name: "", registration_number: "", country: "", business_type: "", website: "", tax_id: "" });

      const popup = openCenteredPopup(url, "didit_kyb");
      if (popup) {
        popupRef.current = popup;
        setPopupType("kyb");
        startPopupPoll(popup, "kyb");
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
        toast.info("Opened in a new tab — return here when done.");
      }
      qc.invalidateQueries({ queryKey: ["kyb"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to start business verification");
    } finally { setCreatingKyb(false); }
  };

  const submitCredit = async () => {
    const kybVerified = kybs.some((k: any) => k.status === "verified");
    const kycVerified = kyc?.status === "verified";
    if (!kycVerified || !kybVerified) return toast.error("Both KYC and KYB must be verified first");
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

  /* ── Derived state ── */
  const kybVerified = useMemo(() => kybs.some((k: any) => k.status === "verified"), [kybs]);
  const kycVerified = kyc?.status === "verified";
  const creditEligible = kycVerified && kybVerified;

  return (
    <AccountLayout title="Verification Center" description="Verify your identity and business to unlock services like payment processing, credit limits and virtual cards.">

      {/* ── In-app verification overlay (shown while popup is open) ── */}
      {popupType && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center space-y-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/20 mx-auto">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {popupType === "kyc" ? "Identity Verification" : "Business Verification"} in progress
              </h3>
              <p className="text-sm text-muted-foreground mt-1.5">
                Complete the steps in the popup window. Keep this page open — your status will update automatically when done.
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" size="sm" onClick={() => popupRef.current?.focus()}>
                Back to popup
              </Button>
              <Button variant="ghost" size="sm" onClick={dismissPopup}>
                <X className="h-4 w-4 mr-1" /> Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* ── KYC ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />Identity (KYC)
              </CardTitle>
              <VerificationBadge status={kyc?.status} />
            </div>
            <CardDescription>Personal identity verification powered by Didit.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {kyc?.status === "verified" && (
              <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                {kyc.verification_date
                  ? `Verified on ${new Date(kyc.verification_date).toLocaleDateString()}`
                  : "Identity verified"}
              </div>
            )}
            {kyc?.verification_url && kyc.status !== "verified" && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  const popup = openCenteredPopup(kyc.verification_url, "didit_kyc");
                  if (popup) { popupRef.current = popup; setPopupType("kyc"); startPopupPoll(popup, "kyc"); }
                  else window.open(kyc.verification_url, "_blank", "noopener,noreferrer");
                }}>
                  Resume
                </Button>
                <Button variant="ghost" size="sm" onClick={() => copy(kyc.verification_url)}>
                  <Copy className="h-4 w-4 mr-1" />Copy link
                </Button>
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

        {/* ── KYB ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />Business (KYB)
              </CardTitle>
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
                        <Button size="icon" variant="ghost" onClick={() => copy(k.verification_url)}>
                          <Copy className="h-4 w-4" />
                        </Button>
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
                    <div><Label>Business Type</Label><Input placeholder="LLC, Corp…" value={kybForm.business_type} onChange={e => setKybForm({ ...kybForm, business_type: e.target.value })} /></div>
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

        {/* ── Credit Eligibility ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />Credit Eligibility
              </CardTitle>
              <VerificationBadge status={creditEligible ? "verified" : "pending"} />
            </div>
            <CardDescription>Unlock credit limit &amp; virtual cards by verifying both KYC and KYB.</CardDescription>
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

      {/* ── Credit Applications ── */}
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

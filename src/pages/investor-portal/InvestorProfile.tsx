import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/integrations/db/client";
import { useAuth } from "@/hooks/use-auth";
import InvestorPortalLayout from "@/components/investor/InvestorPortalLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Loader2, Save, ShieldCheck, KeyRound } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { useSEO } from "@/hooks/use-seo";

const InvestorProfile = () => {
  usePageTitle("Investor · Profile");
  useSEO({ title: "Investor Profile", noIndex: true });
  const { user } = useAuth();
  const qc = useQueryClient();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [swift, setSwift] = useState("");
  const [saving, setSaving] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [newPwd, setNewPwd] = useState("");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["investor-profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await db.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  // Latest investment carries the bank details we collected at sign-up
  const { data: latestInv } = useQuery({
    queryKey: ["investor-profile-bank", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await db
        .from("investments" as any)
        .select("bank_details")
        .eq("investor_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as any;
    },
  });

  useEffect(() => {
    if (profile) {
      setFullName((profile as any).full_name ?? "");
      setPhone((profile as any).phone ?? "");
      setCountry((profile as any).country ?? "");
    }
    const bd = (latestInv?.bank_details ?? {}) as any;
    setBankName(bd.bank_name ?? "");
    setAccountName(bd.account_name ?? "");
    setAccountNumber(bd.account_number ?? "");
    setSwift(bd.swift ?? "");
  }, [profile, latestInv]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setSaving(true);
    try {
      const { error } = await db
        .from("profiles")
        .update({ full_name: fullName, phone, country } as any)
        .eq("id", user.id);
      if (error) throw error;
      toast.success("Profile updated");
      await qc.invalidateQueries({ queryKey: ["investor-profile", user.id] });
    } catch (err: any) {
      toast.error(err?.message || "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  const saveBank = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      // Update bank details on the investor's most recent investment.
      // Withdrawals capture their own bank details per request, so this is informational.
      const latestRes: any = await db
        .from("investments" as any)
        .select("id")
        .eq("investor_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const latest: any = latestRes.data;
      if (!latest?.id) {
        toast.error("Add an investment first to save default bank details");
        return;
      }
      const { error } = await (db as any)
        .from("investments")
        .update({
          bank_details: {
            bank_name: bankName,
            account_name: accountName,
            account_number: accountNumber,
            swift,
          },
        })
        .eq("id", latest.id)
        .eq("investor_id", user.id);
      if (error) throw error;
      toast.success("Bank details saved");
    } catch (err: any) {
      toast.error(err?.message || "Could not save bank details");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (newPwd.length < 6) return toast.error("Password must be at least 6 characters");
    setPwdSaving(true);
    try {
      const { error } = await db.auth.updateUser({ password: newPwd });
      if (error) throw error;
      toast.success("Password updated");
      setNewPwd("");
    } catch (err: any) {
      toast.error(err?.message || "Could not update password");
    } finally {
      setPwdSaving(false);
    }
  };

  return (
    <InvestorPortalLayout
      title="Profile & settings"
      description="Keep your contact info and bank details up to date so we can reach you and pay you on time."
    >
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-5 space-y-4">
            <div>
              <h2 className="font-heading text-lg font-semibold">Contact details</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Used for your agreements and IR communication.</p>
            </div>
            {isLoading ? (
              <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
            ) : (
              <form onSubmit={saveProfile} className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input value={user?.email ?? ""} disabled />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="country">Country</Label>
                    <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} />
                  </div>
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
                  Save profile
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-4">
            <div>
              <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
                Default bank details
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Stored privately and visible only to you and our finance team.
              </p>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Bank / Network</Label>
                <Input value={bankName} onChange={(e) => setBankName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Account holder</Label>
                <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Account number</Label>
                  <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>SWIFT / Routing</Label>
                  <Input value={swift} onChange={(e) => setSwift(e.target.value)} />
                </div>
              </div>
              <Button onClick={saveBank} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
                Save bank details
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="p-5 space-y-3">
            <div>
              <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
                <KeyRound className="h-4 w-4" /> Change password
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Use a strong password — minimum 6 characters.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
              <div className="space-y-1.5 flex-1">
                <Label htmlFor="newpwd">New password</Label>
                <Input id="newpwd" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} minLength={6} />
              </div>
              <Button onClick={changePassword} disabled={pwdSaving || newPwd.length < 6}>
                {pwdSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                Update password
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </InvestorPortalLayout>
  );
};

export default InvestorProfile;

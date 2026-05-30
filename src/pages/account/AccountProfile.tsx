import { useEffect, useState } from "react";
import AccountLayout from "@/components/account/AccountLayout";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { User as UserIcon, Mail, Calendar, Save, KeyRound, Bell, MapPin, CreditCard } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";

const AccountProfile = () => {
  usePageTitle("Profile & Settings");
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [renewalReminder, setRenewalReminder] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      setFullName(data?.full_name || user.user_metadata?.full_name || "");
    })();
    // Supabase exposes the unverified pending change on user.new_email
    setPendingEmail((user as any)?.new_email || null);
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({ id: user.id, email: user.email!, full_name: fullName }, { onConflict: "id" });
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Profile updated");
  };

  const changePassword = async () => {
    if (pwd.length < 6) return toast.error("Password must be at least 6 characters");
    setPwdSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setPwdSaving(false);
    if (error) toast.error(error.message); else { toast.success("Password updated"); setPwd(""); }
  };

  const requestEmailChange = async () => {
    const next = newEmail.trim().toLowerCase();
    if (!next || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(next)) {
      return toast.error("Enter a valid email address");
    }
    if (next === (user?.email || "").toLowerCase()) {
      return toast.error("That's already your current email");
    }
    setEmailSaving(true);
    const { error } = await supabase.auth.updateUser(
      { email: next },
      { emailRedirectTo: `${window.location.origin}/account` }
    );
    setEmailSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPendingEmail(next);
    setNewEmail("");
    toast.success(`Verification sent to ${next}. Click the link in both inboxes (old and new) to confirm. Your orders will re-link automatically once it's verified.`);
  };

  const cancelEmailChange = async () => {
    if (!user?.email) return;
    setEmailSaving(true);
    // Re-issuing updateUser with the current email cancels a pending change
    const { error } = await supabase.auth.updateUser({ email: user.email });
    setEmailSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPendingEmail(null);
    toast.success("Pending email change cancelled");
  };

  return (
    <AccountLayout title="Profile & Settings" description="Manage your profile, security, billing and notifications.">
      <Tabs defaultValue="profile" className="max-w-2xl">
        <TabsList className="grid grid-cols-4 mb-5 w-full">
          <TabsTrigger value="profile"><UserIcon className="w-3.5 h-3.5 mr-1.5" />Profile</TabsTrigger>
          <TabsTrigger value="security"><KeyRound className="w-3.5 h-3.5 mr-1.5" />Security</TabsTrigger>
          <TabsTrigger value="billing"><CreditCard className="w-3.5 h-3.5 mr-1.5" />Billing</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="w-3.5 h-3.5 mr-1.5" />Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
              <div className="w-14 h-14 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xl font-bold">
                {(fullName || user?.email || "?").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h3 className="font-heading text-lg font-semibold truncate">{fullName || "Add your name"}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1 truncate"><Mail className="w-3.5 h-3.5" /> {user?.email}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
              </div>
              <div className="space-y-1.5">
                <Label>Current email</Label>
                <Input value={user?.email || ""} disabled />
                <p className="text-[11px] text-muted-foreground">Used to link orders to your account.</p>
              </div>
              <Button onClick={save} disabled={saving} variant="hero"><Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save changes"}</Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-start gap-2">
              <Mail className="w-4 h-4 text-primary mt-0.5" />
              <div>
                <h3 className="font-heading text-base font-semibold">Change email</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  We'll send a verification link to the new address. Once confirmed, any unclaimed orders that match it will auto-link to your account.
                </p>
              </div>
            </div>

            {pendingEmail && (
              <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs">
                <p className="font-medium text-yellow-700 dark:text-yellow-500">Pending verification</p>
                <p className="text-muted-foreground mt-0.5">
                  Waiting for confirmation on <span className="font-medium text-foreground">{pendingEmail}</span>. Check both inboxes for the link.
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 mt-2 text-xs"
                  onClick={cancelEmailChange}
                  disabled={emailSaving}
                >
                  Cancel pending change
                </Button>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="new-email">New email</Label>
              <Input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={emailSaving}
              />
            </div>
            <Button onClick={requestEmailChange} disabled={emailSaving || !newEmail} variant="hero">
              {emailSaving ? "Sending..." : "Send verification link"}
            </Button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-heading text-base font-semibold mb-4 flex items-center gap-2"><UserIcon className="w-4 h-4 text-primary" /> Account info</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Member since</dt>
                <dd className="font-medium">{user?.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "—"}</dd>
              </div>
            </dl>
          </div>
        </TabsContent>

        <TabsContent value="security">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-heading text-base font-semibold flex items-center gap-2"><KeyRound className="w-4 h-4 text-primary" /> Change password</h3>
            <div className="space-y-1.5">
              <Label htmlFor="pwd">New password</Label>
              <Input id="pwd" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="Minimum 6 characters" />
            </div>
            <Button onClick={changePassword} disabled={pwdSaving} variant="hero">{pwdSaving ? "Updating..." : "Update password"}</Button>
          </div>
        </TabsContent>

        <TabsContent value="billing">
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <CreditCard className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="font-heading text-base font-semibold mb-1">No saved payment methods</h3>
            <p className="text-sm text-muted-foreground mb-1">Payment methods are saved automatically on successful recurring purchases.</p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-3"><MapPin className="w-3 h-3" /> Billing address is taken from your most recent invoice.</p>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Renewal reminders</p>
                <p className="text-xs text-muted-foreground mt-0.5">Email me 7 days before any recurring service renews.</p>
              </div>
              <Switch checked={renewalReminder} onCheckedChange={setRenewalReminder} />
            </div>
            <div className="flex items-start justify-between gap-4 pt-4 border-t border-border">
              <div>
                <p className="text-sm font-medium">Product updates</p>
                <p className="text-xs text-muted-foreground mt-0.5">Occasional emails about new services and offers.</p>
              </div>
              <Switch checked={marketing} onCheckedChange={setMarketing} />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </AccountLayout>
  );
};

export default AccountProfile;

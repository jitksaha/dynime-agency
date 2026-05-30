import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Lock, Mail, Loader2, ArrowRight, Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEmail?: string;
  /** Called once a session is established (sign in success). Sign-up via email
   *  confirmation will not fire this since no session exists yet. */
  onAuthenticated?: () => void;
  title?: string;
  description?: string;
}

const AuthDialog = ({
  open,
  onOpenChange,
  defaultEmail = "",
  onAuthenticated,
  title = "Sign in to continue",
  description = "Sign in or create an account — no page reload, you'll return right here.",
}: AuthDialogProps) => {
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [magicSending, setMagicSending] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  useEffect(() => {
    if (open && defaultEmail && !email) setEmail(defaultEmail);
  }, [open, defaultEmail]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-close on auth success (covers both this dialog's actions AND any
  // session that becomes available while it's open, e.g. magic-link in
  // another tab).
  useEffect(() => {
    if (!open) return;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        onAuthenticated?.();
        onOpenChange(false);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [open, onAuthenticated, onOpenChange]);

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setPwdLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        toast.success("Signed in");
        // SIGNED_IN handler will close the dialog.
      } else {
        if (password.length < 6) throw new Error("Password must be at least 6 characters");
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.href },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Account created");
        } else {
          toast.success("Account created — check your email to verify");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setPwdLoading(false);
    }
  };

  const sendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setMagicSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.href,
        shouldCreateUser: true,
      },
    });
    setMagicSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setMagicSent(true);
  };

  const sendPasswordReset = async () => {
    if (!email) { toast.error("Enter your email first"); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/account/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset email sent");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" /> {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="password" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="password" className="gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Password
            </TabsTrigger>
            <TabsTrigger value="magic" className="gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Magic link
            </TabsTrigger>
          </TabsList>

          <TabsContent value="password" className="mt-0">
            <form onSubmit={handlePassword} className="space-y-3">
              <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-muted/60 border border-border">
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className={[
                    "py-1.5 text-xs font-semibold rounded-md transition-colors",
                    mode === "signin" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className={[
                    "py-1.5 text-xs font-semibold rounded-md transition-colors",
                    mode === "signup" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  Create account
                </button>
              </div>

              <div className="space-y-1">
                <Label htmlFor="auth-dlg-email" className="text-xs">Email address</Label>
                <Input
                  id="auth-dlg-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auth-dlg-password" className="text-xs">Password</Label>
                  {mode === "signin" && (
                    <button type="button" onClick={sendPasswordReset} className="text-[11px] text-primary hover:underline">
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="auth-dlg-password"
                    type={showPwd ? "text" : "password"}
                    required
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground"
                    aria-label={showPwd ? "Hide password" : "Show password"}
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" disabled={pwdLoading} variant="hero" className="w-full">
                {pwdLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <KeyRound className="w-4 h-4 mr-1" />}
                {pwdLoading
                  ? (mode === "signin" ? "Signing in..." : "Creating account...")
                  : (mode === "signin" ? "Sign in" : "Create account")}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="magic" className="mt-0">
            {magicSent ? (
              <div className="text-center space-y-3 py-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto">
                  <Mail className="w-6 h-6" />
                </div>
                <h3 className="font-heading text-lg font-bold">Check your inbox</h3>
                <p className="text-sm text-muted-foreground">
                  We sent a sign-in link to <strong className="text-foreground">{email}</strong>. Click it to return here signed in.
                </p>
                <Button variant="ghost" size="sm" onClick={() => setMagicSent(false)}>Use a different email</Button>
              </div>
            ) : (
              <form onSubmit={sendMagicLink} className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  No password needed — we'll email a one-tap sign-in link.
                </p>
                <div className="space-y-1">
                  <Label htmlFor="auth-dlg-magic-email" className="text-xs">Email address</Label>
                  <Input
                    id="auth-dlg-magic-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <Button type="submit" disabled={magicSending} variant="outline" className="w-full">
                  {magicSending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-1" />}
                  {magicSending ? "Sending link..." : "Send magic link"}
                </Button>
              </form>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AuthDialog;

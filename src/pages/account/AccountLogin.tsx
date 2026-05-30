import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Mail, Sparkles, ShieldCheck, ArrowRight, Loader2, Lock, Eye, EyeOff, KeyRound,
  AlertCircle, RefreshCw, Inbox, Clock,
} from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { useSEO } from "@/hooks/use-seo";

const AccountLogin = () => {
  usePageTitle("Sign in");
  useSEO({ title: "Sign in", noIndex: true });
  const { user } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = params.get("next") || "/account";

  // Shared
  const [email, setEmail] = useState("");

  // Password mode
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [pwdLoading, setPwdLoading] = useState(false);

  // Magic link
  const [magicSending, setMagicSending] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [magicSentAt, setMagicSentAt] = useState<number | null>(null);
  const [secondsSince, setSecondsSince] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (!magicSent || !magicSentAt) return;
    const id = window.setInterval(() => {
      setSecondsSince(Math.floor((Date.now() - magicSentAt) / 1000));
      setResendCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [magicSent, magicSentAt]);

  const fromHost = typeof window !== "undefined" ? window.location.hostname.replace(/^www\./, "") : "your-domain.com";
  const fromAddress = `no-reply@${fromHost}`;

  useEffect(() => {
    if (user) navigate(next, { replace: true });
  }, [user, next, navigate]);

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
      } else {
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters");
        }
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${next}`,
          },
        });
        if (error) throw error;
        toast.success("Account created — check your email to verify if required");
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
    if (resendCooldown > 0) return;
    setMagicSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}${next}`,
        shouldCreateUser: true,
      },
    });
    setMagicSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setMagicSent(true);
    setMagicSentAt(Date.now());
    setSecondsSince(0);
    setResendCooldown(30);
  };

  const sendPasswordReset = async () => {
    if (!email) {
      toast.error("Enter your email first");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/account/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset email sent");
  };

  return (
    <Layout>
      <section className="section-padding">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-10 items-center max-w-5xl mx-auto">
            {/* Left: marketing */}
            <div className="space-y-5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" /> Account portal
              </span>
              <h1 className="font-heading text-3xl md:text-4xl font-bold">
                Sign in to your <span className="gradient-text">Dynime</span> account
              </h1>
              <p className="text-muted-foreground">
                Track orders, manage your purchased services, support tickets and download branded invoices — all in one place.
              </p>
              <ul className="space-y-2 text-sm">
                {[
                  "Order history and live status",
                  "Active services dashboard",
                  "Downloadable PDF invoices",
                  "Sign in with password or magic link",
                ].map((b) => (
                  <li key={b} className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary" /> {b}
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: form */}
            <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
              <Tabs defaultValue="password" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-5">
                  <TabsTrigger value="password" className="gap-1.5">
                    <Lock className="w-3.5 h-3.5" /> Password
                  </TabsTrigger>
                  <TabsTrigger value="magic" className="gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> Magic link
                  </TabsTrigger>
                </TabsList>

                {/* PASSWORD TAB */}
                <TabsContent value="password" className="mt-0">
                  <form onSubmit={handlePassword} className="space-y-3.5">
                    {/* Compact Sign in / Sign up segmented toggle */}
                    <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-muted/60 border border-border">
                      <button
                        type="button"
                        onClick={() => setMode("signin")}
                        className={[
                          "py-1.5 text-xs font-semibold rounded-md transition-colors",
                          mode === "signin"
                            ? "bg-background shadow-sm text-foreground"
                            : "text-muted-foreground hover:text-foreground",
                        ].join(" ")}
                      >
                        Sign in
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode("signup")}
                        className={[
                          "py-1.5 text-xs font-semibold rounded-md transition-colors",
                          mode === "signup"
                            ? "bg-background shadow-sm text-foreground"
                            : "text-muted-foreground hover:text-foreground",
                        ].join(" ")}
                      >
                        Create account
                      </button>
                    </div>

                    <p className="text-[12px] text-muted-foreground -mt-1">
                      {mode === "signin"
                        ? "Welcome back — sign in with your email and password."
                        : "Set a password to access your account anytime."}
                    </p>

                    <div className="space-y-1">
                      <Label htmlFor="email-pw" className="text-xs">Email address</Label>
                      <Input
                        id="email-pw"
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
                        <Label htmlFor="password" className="text-xs">Password</Label>
                        {mode === "signin" && (
                          <button
                            type="button"
                            onClick={sendPasswordReset}
                            className="text-[11px] text-primary hover:underline"
                          >
                            Forgot password?
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <Input
                          id="password"
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
                      {pwdLoading
                        ? <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        : <KeyRound className="w-4 h-4 mr-1" />}
                      {pwdLoading
                        ? (mode === "signin" ? "Signing in..." : "Creating account...")
                        : (mode === "signin" ? "Sign in" : "Create account")}
                    </Button>
                  </form>
                </TabsContent>

                {/* MAGIC LINK TAB */}
                <TabsContent value="magic" className="mt-0">
                  {magicSent ? (
                    <div className="space-y-4 py-2">
                      <div className="text-center space-y-3">
                        <div className="w-14 h-14 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto">
                          <Mail className="w-6 h-6" />
                        </div>
                        <h2 className="font-heading text-xl font-bold">Check your inbox</h2>
                        <p className="text-sm text-muted-foreground">
                          We sent a secure sign-in link to <strong className="text-foreground">{email}</strong>. Click it to access your account.
                        </p>
                        <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
                          <Clock className="w-3 h-3" /> Sent {secondsSince < 5 ? "just now" : `${secondsSince}s ago`}
                        </p>
                      </div>

                      {secondsSince >= 8 && (
                        <div className="rounded-lg border border-border bg-muted/40 p-3.5 space-y-2.5 text-left animate-in fade-in slide-in-from-bottom-1">
                          <div className="flex items-center gap-2 text-sm font-semibold">
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                            Didn't see it yet? Try these checks
                          </div>
                          <ul className="space-y-2 text-xs text-muted-foreground">
                            <li className="flex items-start gap-2">
                              <Inbox className="w-3.5 h-3.5 mt-0.5 shrink-0 text-foreground/70" />
                              <span><strong className="text-foreground">Check spam, junk and promotions</strong> — the email may have been filtered.</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <Mail className="w-3.5 h-3.5 mt-0.5 shrink-0 text-foreground/70" />
                              <span>It comes from <code className="text-foreground bg-background border border-border px-1 py-0.5 rounded text-[10.5px]">{fromAddress}</code> — add it to your contacts so future links arrive in your inbox.</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0 text-foreground/70" />
                              <span>Confirm you typed the email correctly — no typos, no extra spaces.</span>
                            </li>
                            {secondsSince >= 20 && (
                              <li className="flex items-start gap-2">
                                <KeyRound className="w-3.5 h-3.5 mt-0.5 shrink-0 text-foreground/70" />
                                <span>Corporate/Outlook inbox? Some firewalls strip auth links — try a personal email or the password tab.</span>
                              </li>
                            )}
                          </ul>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1.5"
                          disabled={resendCooldown > 0 || magicSending}
                          onClick={(e) => sendMagicLink(e as unknown as React.FormEvent)}
                        >
                          {magicSending ? (
                            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Resending…</>
                          ) : resendCooldown > 0 ? (
                            <><Clock className="w-3.5 h-3.5" /> Resend in {resendCooldown}s</>
                          ) : (
                            <><RefreshCw className="w-3.5 h-3.5" /> Resend link</>
                          )}
                        </Button>
                        <Button variant="ghost" size="sm" className="flex-1" onClick={() => { setMagicSent(false); setMagicSentAt(null); setResendCooldown(0); }}>
                          Use a different email
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={sendMagicLink} className="space-y-4">
                      <div>
                        <h2 className="font-heading text-xl font-bold">Email me a link</h2>
                        <p className="text-sm text-muted-foreground">No password needed — we'll email a one-tap sign-in link.</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="email-magic">Email address</Label>
                        <Input
                          id="email-magic"
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

              <p className="text-xs text-muted-foreground text-center mt-5 pt-5 border-t border-border">
                By continuing, you agree to our{" "}
                <Link to="/legal/terms" className="text-primary hover:underline">Terms</Link> and{" "}
                <Link to="/legal/privacy" className="text-primary hover:underline">Privacy</Link>.
              </p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default AccountLogin;

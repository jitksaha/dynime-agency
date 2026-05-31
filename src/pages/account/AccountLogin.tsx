import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Sparkles, ShieldCheck, Loader2, Lock, Eye, EyeOff, KeyRound,
} from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { useSEO } from "@/hooks/use-seo";

const AccountLogin = () => {
  usePageTitle("Sign in");
  useSEO({ title: "Sign in", noIndex: true });
  const { user, signIn } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = params.get("next") || "/account";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate(next, { replace: true });
  }, [user, next, navigate]);

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await signIn(email.trim(), password);
        if (error) throw new Error(error);
        toast.success("Signed in");
      } else {
        if (password.length < 6) throw new Error("Password must be at least 6 characters");
        const res = await fetch('/api/v1/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({})) as { message?: string };
          throw new Error(err.message ?? 'Registration failed');
        }
        toast.success("Account created — you can now sign in");
        setMode("signin");
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const sendPasswordReset = async () => {
    if (!email) { toast.error("Enter your email first"); return; }
    try {
      const res = await fetch('/api/v1/auth/password/reset-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) throw new Error();
      toast.success("Password reset email sent");
    } catch {
      toast.error("Could not send reset email");
    }
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
                  "Secure password-based login",
                ].map((b) => (
                  <li key={b} className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary" /> {b}
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: form */}
            <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
              <form onSubmit={handlePassword} className="space-y-3.5">
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

                <Button type="submit" disabled={loading} variant="hero" className="w-full">
                  {loading
                    ? <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    : <KeyRound className="w-4 h-4 mr-1" />}
                  {loading
                    ? (mode === "signin" ? "Signing in..." : "Creating account...")
                    : (mode === "signin" ? "Sign in" : "Create account")}
                </Button>
              </form>

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

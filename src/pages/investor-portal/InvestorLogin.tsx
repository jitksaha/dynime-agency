import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Lock, Eye, EyeOff, ArrowRight, Mail } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { useSEO } from "@/hooks/use-seo";

const InvestorLogin = () => {
  usePageTitle("Investor Portal · Sign in");
  useSEO({ title: "Investor Portal Sign in", noIndex: true });
  const { user } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = params.get("next") || "/investor";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);

  useEffect(() => {
    if (user) navigate(next, { replace: true });
  }, [user, next, navigate]);

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        toast.success("Welcome back");
      } else {
        if (password.length < 6) throw new Error("Password must be at least 6 characters");
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}${next}` },
        });
        if (error) throw error;
        toast.success("Account created — check your email to confirm");
      }
    } catch (err: any) {
      toast.error(err.message || "Could not sign in");
    } finally {
      setLoading(false);
    }
  };

  const handleMagic = async () => {
    if (!email) return toast.error("Enter your email first");
    setMagicLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}${next}` },
      });
      if (error) throw error;
      toast.success("Magic link sent — check your inbox");
    } catch (err: any) {
      toast.error(err.message || "Could not send link");
    } finally {
      setMagicLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-6 space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <ShieldCheck className="h-3.5 w-3.5" /> Dynime Inc.
            </div>
            <h1 className="font-heading text-3xl md:text-4xl font-bold">Investor Portal</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to view your investments, statements and signed agreements.
            </p>
          </div>

          <Card>
            <CardContent className="p-6">
              <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="signin">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Create account</TabsTrigger>
                </TabsList>

                <TabsContent value={mode} className="mt-4 space-y-4">
                  <form onSubmit={handlePassword} className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPwd ? "text" : "password"}
                          autoComplete={mode === "signin" ? "current-password" : "new-password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={6}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPwd((s) => !s)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label="Toggle password visibility"
                        >
                          {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                        <>
                          {mode === "signin" ? "Sign in" : "Create account"}
                          <ArrowRight className="ml-1.5 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">or</span>
                    </div>
                  </div>

                  <Button type="button" variant="outline" className="w-full" onClick={handleMagic} disabled={magicLoading}>
                    {magicLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                      <><Mail className="h-4 w-4 mr-1.5" /> Email me a sign-in link</>
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center pt-2">
                    <Lock className="inline h-3 w-3 mr-1" />
                    Same login as your <Link to="/account/login" className="underline">customer account</Link>.
                  </p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground text-center mt-6">
            New to Dynime? <Link to="/invest" className="text-primary hover:underline">View investment plans</Link> or{" "}
            <Link to="/investor-relations" className="text-primary hover:underline">contact IR</Link>.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default InvestorLogin;

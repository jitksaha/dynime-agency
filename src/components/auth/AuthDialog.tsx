import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock, Loader2, Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEmail?: string;
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
  const { signIn } = useAuth();
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await signIn(email.trim(), password);
        if (error) throw new Error(error);
        toast.success("Signed in");
        onAuthenticated?.();
        onOpenChange(false);
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
      if (!res.ok) throw new Error('Request failed');
      toast.success("Password reset email sent");
    } catch {
      toast.error("Could not send reset email");
    }
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

        <form onSubmit={handleSubmit} className="space-y-3">
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

          <Button type="submit" disabled={loading} variant="hero" className="w-full">
            {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <KeyRound className="w-4 h-4 mr-1" />}
            {loading
              ? (mode === "signin" ? "Signing in..." : "Creating account...")
              : (mode === "signin" ? "Sign in" : "Create account")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AuthDialog;

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, Loader2, MailX } from "lucide-react";

const SUPABASE_URL = "https://isweduliawwjqwhyvwhp.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlzd2VkdWxpYXd3anF3aHl2d2hwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMzU2NTIsImV4cCI6MjA5MjYxMTY1Mn0.I7InCnynzCOzjZPi_IOb3L9pVUJ7YgebDNWuNb6Uu9M";
const FN_URL = `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe`;

type State = "validating" | "ready" | "already" | "invalid" | "submitting" | "done" | "error";

const Unsubscribe = () => {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<State>("validating");
  const [email, setEmail] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    (async () => {
      try {
        const r = await fetch(`${FN_URL}?token=${encodeURIComponent(token)}`, {
          headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) { setState("invalid"); setErrorMsg(j?.error ?? "Invalid token."); return; }
        if (j?.alreadyUnsubscribed || j?.already_unsubscribed) {
          setEmail(j?.email ?? null); setState("already"); return;
        }
        setEmail(j?.email ?? null);
        setState("ready");
      } catch (e) {
        setState("error");
        setErrorMsg(e instanceof Error ? e.message : "Network error");
      }
    })();
  }, [token]);

  const confirm = async () => {
    setState("submitting");
    try {
      const r = await fetch(FN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: ANON_KEY,
          Authorization: `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({ token }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setState("error"); setErrorMsg(j?.error ?? "Could not unsubscribe."); return; }
      setState("done");
    } catch (e) {
      setState("error");
      setErrorMsg(e instanceof Error ? e.message : "Network error");
    }
  };

  return (
    <Layout>
      <section className="container-custom min-h-[70vh] flex items-center justify-center py-14">
        <div className="max-w-md w-full text-center rounded-3xl border border-border bg-card p-8 md:p-10 shadow-elevated">
          {state === "validating" && (
            <>
              <Loader2 className="w-10 h-10 text-primary mx-auto mb-4 animate-spin" />
              <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Checking your link…</h1>
              <p className="text-muted-foreground">One moment please.</p>
            </>
          )}

          {state === "ready" && (
            <>
              <div className="w-14 h-14 mx-auto rounded-full bg-primary/15 flex items-center justify-center mb-4">
                <MailX className="w-7 h-7 text-primary" />
              </div>
              <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Unsubscribe from Dynime emails?</h1>
              <p className="text-muted-foreground mb-6">
                {email ? <>We'll stop sending emails to <span className="text-foreground font-medium">{email}</span>.</> : "We'll stop sending emails to your address."}
              </p>
              <Button variant="hero" size="lg" onClick={confirm} className="w-full">
                Confirm unsubscribe
              </Button>
            </>
          )}

          {state === "submitting" && (
            <>
              <Loader2 className="w-10 h-10 text-primary mx-auto mb-4 animate-spin" />
              <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Updating your preferences…</h1>
            </>
          )}

          {state === "done" && (
            <>
              <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-4" />
              <h1 className="font-heading text-2xl font-bold text-foreground mb-2">You're unsubscribed</h1>
              <p className="text-muted-foreground">
                {email ? <><span className="text-foreground font-medium">{email}</span> won't receive any further emails from us.</> : "You won't receive any further emails from us."}
              </p>
            </>
          )}

          {state === "already" && (
            <>
              <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-4" />
              <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Already unsubscribed</h1>
              <p className="text-muted-foreground">
                {email ? <><span className="text-foreground font-medium">{email}</span> is already opted out.</> : "Your address is already opted out."}
              </p>
            </>
          )}

          {(state === "invalid" || state === "error") && (
            <>
              <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h1 className="font-heading text-2xl font-bold text-foreground mb-2">
                {state === "invalid" ? "Link no longer valid" : "Something went wrong"}
              </h1>
              <p className="text-muted-foreground">
                {errorMsg || "Please use the most recent unsubscribe link in your email."}
              </p>
            </>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Unsubscribe;

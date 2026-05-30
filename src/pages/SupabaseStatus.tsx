import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2, AlertTriangle, RefreshCw, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const REQUIRED_TABLES = [
  "profiles",
  "user_roles",
  "site_settings",
  "contact_info",
  "pages",
  "portfolio_projects",
  "products",
  "orders",
  "form_templates",
  "form_submissions",
  "chat_messages",
] as const;

type CheckStatus = "pending" | "ok" | "warn" | "fail";

interface CheckResult {
  status: CheckStatus;
  message: string;
  hint?: string;
}

interface TableResult {
  name: string;
  status: CheckStatus;
  message: string;
  hint?: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined;

function maskKey(key?: string) {
  if (!key) return "—";
  if (key.length < 16) return "••••";
  return `${key.slice(0, 8)}…${key.slice(-6)}`;
}

function StatusIcon({ status }: { status: CheckStatus }) {
  if (status === "ok") return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
  if (status === "fail") return <XCircle className="h-5 w-5 text-destructive" />;
  if (status === "warn") return <AlertTriangle className="h-5 w-5 text-amber-500" />;
  return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
}

function StatusBadge({ status }: { status: CheckStatus }) {
  const map: Record<CheckStatus, { label: string; className: string }> = {
    ok: { label: "OK", className: "bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border-emerald-600/30" },
    fail: { label: "Fail", className: "bg-destructive/15 text-destructive border-destructive/30" },
    warn: { label: "Warn", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
    pending: { label: "Checking…", className: "bg-muted text-muted-foreground border-border" },
  };
  const v = map[status];
  return <Badge variant="outline" className={v.className}>{v.label}</Badge>;
}

function classifyTableError(err: { code?: string; message?: string; status?: number } | null): TableResult["status"] | null {
  if (!err) return "ok";
  const msg = (err.message || "").toLowerCase();
  // PostgREST: relation does not exist
  if (err.code === "42P01" || msg.includes("does not exist") || msg.includes("not found in schema")) {
    return "fail";
  }
  // RLS — table exists, just no read policy for anon
  if (err.code === "42501" || msg.includes("permission denied") || msg.includes("row-level security")) {
    return "warn";
  }
  return "fail";
}

const SupabaseStatus = () => {
  const [envCheck, setEnvCheck] = useState<CheckResult>({ status: "pending", message: "Reading env vars…" });
  const [reachCheck, setReachCheck] = useState<CheckResult>({ status: "pending", message: "Pinging Supabase REST endpoint…" });
  const [authCheck, setAuthCheck] = useState<CheckResult>({ status: "pending", message: "Checking auth client…" });
  const [tables, setTables] = useState<TableResult[]>(
    REQUIRED_TABLES.map((name) => ({ name, status: "pending", message: "Queued" })),
  );
  const [running, setRunning] = useState(false);
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    document.title = "Supabase Status — Diagnostics";
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setRunning(true);

      // 1. Env vars
      const missing: string[] = [];
      if (!SUPABASE_URL) missing.push("VITE_SUPABASE_URL");
      if (!SUPABASE_KEY) missing.push("VITE_SUPABASE_PUBLISHABLE_KEY");
      let envOk = false;
      if (missing.length) {
        setEnvCheck({
          status: "fail",
          message: `Missing env vars: ${missing.join(", ")}`,
          hint: "Add them to your .env file (VITE_ prefix is required so Vite exposes them to the browser), then restart the dev server.",
        });
      } else if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(SUPABASE_URL!)) {
        setEnvCheck({
          status: "warn",
          message: `URL doesn't match the standard Supabase pattern: ${SUPABASE_URL}`,
          hint: "Expected format: https://<project-ref>.supabase.co. Custom domains are OK to ignore this warning.",
        });
        envOk = true;
      } else {
        setEnvCheck({ status: "ok", message: `URL and anon key present (project ${SUPABASE_PROJECT_ID || "—"})` });
        envOk = true;
      }

      if (!envOk) {
        setReachCheck({ status: "fail", message: "Skipped — env vars missing", hint: "Fix the env vars first." });
        setAuthCheck({ status: "fail", message: "Skipped — env vars missing" });
        if (!cancelled) {
          setTables((prev) => prev.map((t) => ({ ...t, status: "fail", message: "Skipped — env vars missing" })));
          setRunning(false);
        }
        return;
      }

      // 2. REST reachability + key validity
      try {
        const res = await fetch(`${SUPABASE_URL!.replace(/\/$/, "")}/rest/v1/?apikey=${SUPABASE_KEY}`, {
          headers: { apikey: SUPABASE_KEY!, Authorization: `Bearer ${SUPABASE_KEY}` },
        });
        if (cancelled) return;
        if (res.status === 401) {
          setReachCheck({
            status: "fail",
            message: `REST returned 401 Unauthorized`,
            hint: "Anon key is invalid or expired. Copy a fresh key from Supabase → Project Settings → API.",
          });
        } else if (res.status === 404) {
          setReachCheck({
            status: "fail",
            message: `REST returned 404 — project URL is wrong or paused`,
            hint: "Confirm the project ref in VITE_SUPABASE_URL matches your Supabase project.",
          });
        } else if (res.status >= 500) {
          setReachCheck({
            status: "warn",
            message: `REST returned ${res.status}. Supabase may be having issues.`,
            hint: "Check https://status.supabase.com",
          });
        } else {
          setReachCheck({ status: "ok", message: `REST endpoint responded (${res.status})` });
        }
      } catch (e: any) {
        if (cancelled) return;
        setReachCheck({
          status: "fail",
          message: `Network error: ${e?.message || "fetch failed"}`,
          hint: "The browser couldn't reach the Supabase URL. Check the URL, your network, and any ad/privacy blocker.",
        });
      }

      // 3. Auth client
      try {
        const { data, error } = await supabase.auth.getSession();
        if (cancelled) return;
        if (error) {
          setAuthCheck({ status: "fail", message: `auth.getSession failed: ${error.message}` });
        } else {
          setAuthCheck({
            status: "ok",
            message: data.session ? `Signed in as ${data.session.user.email || data.session.user.id}` : "Auth client OK (no active session)",
          });
        }
      } catch (e: any) {
        if (cancelled) return;
        setAuthCheck({ status: "fail", message: `Auth client threw: ${e?.message || e}` });
      }

      // 4. Required tables — probe each with HEAD count
      await Promise.all(
        REQUIRED_TABLES.map(async (name) => {
          try {
            const { error } = await supabase.from(name as any).select("*", { count: "exact", head: true }).limit(1);
            if (cancelled) return;
            const status = classifyTableError(error as any);
            setTables((prev) =>
              prev.map((t) =>
                t.name === name
                  ? status === "ok"
                    ? { name, status: "ok", message: "Reachable" }
                    : status === "warn"
                      ? {
                          name,
                          status: "warn",
                          message: error?.message || "Blocked by RLS",
                          hint: "Table exists but the anon role can't read it. Add a SELECT policy or query it from an authenticated session.",
                        }
                      : {
                          name,
                          status: "fail",
                          message: error?.message || "Unknown error",
                          hint: "Run the project's SQL migrations against this Supabase project to create missing tables.",
                        }
                  : t,
              ),
            );
          } catch (e: any) {
            if (cancelled) return;
            setTables((prev) =>
              prev.map((t) =>
                t.name === name ? { name, status: "fail", message: e?.message || "Threw exception" } : t,
              ),
            );
          }
        }),
      );

      if (!cancelled) setRunning(false);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [runId]);

  const summary = useMemo(() => {
    const all: CheckStatus[] = [envCheck.status, reachCheck.status, authCheck.status, ...tables.map((t) => t.status)];
    if (all.some((s) => s === "pending")) return "pending" as CheckStatus;
    if (all.some((s) => s === "fail")) return "fail" as CheckStatus;
    if (all.some((s) => s === "warn")) return "warn" as CheckStatus;
    return "ok" as CheckStatus;
  }, [envCheck, reachCheck, authCheck, tables]);

  const summaryText: Record<CheckStatus, string> = {
    ok: "All checks passing — Supabase is wired up correctly.",
    warn: "Connection works, but some tables are restricted by RLS or the URL looks unusual.",
    fail: "One or more checks failed. See details and hints below.",
    pending: "Running diagnostics…",
  };

  const copyReport = async () => {
    const lines = [
      `Supabase Status Report`,
      `Generated: ${new Date().toISOString()}`,
      ``,
      `URL: ${SUPABASE_URL || "(missing)"}`,
      `Project: ${SUPABASE_PROJECT_ID || "(missing)"}`,
      `Anon key: ${maskKey(SUPABASE_KEY)}`,
      ``,
      `Env: [${envCheck.status}] ${envCheck.message}`,
      `Reachability: [${reachCheck.status}] ${reachCheck.message}`,
      `Auth: [${authCheck.status}] ${authCheck.message}`,
      ``,
      `Tables:`,
      ...tables.map((t) => `  - ${t.name}: [${t.status}] ${t.message}`),
    ];
    await navigator.clipboard.writeText(lines.join("\n"));
    toast.success("Report copied to clipboard");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Supabase connection status</h1>
            <p className="text-muted-foreground mt-1">
              Diagnostics for the Supabase backend used by this app.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={copyReport}>
              <Copy className="h-4 w-4" /> Copy report
            </Button>
            <Button size="sm" onClick={() => setRunId((n) => n + 1)} disabled={running}>
              <RefreshCw className={`h-4 w-4 ${running ? "animate-spin" : ""}`} />
              Re-run
            </Button>
          </div>
        </header>

        <Alert
          className={
            summary === "ok"
              ? "border-emerald-600/40"
              : summary === "fail"
                ? "border-destructive/50"
                : summary === "warn"
                  ? "border-amber-500/50"
                  : ""
          }
        >
          <div className="flex items-center gap-2">
            <StatusIcon status={summary} />
            <AlertTitle className="m-0">{summaryText[summary]}</AlertTitle>
          </div>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>Values pulled from Vite env vars at build time.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Project ID</div>
              <div className="font-mono break-all">{SUPABASE_PROJECT_ID || "—"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">URL</div>
              <div className="font-mono break-all">{SUPABASE_URL || "—"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Anon key</div>
              <div className="font-mono break-all">{maskKey(SUPABASE_KEY)}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connection checks</CardTitle>
            <CardDescription>Environment, reachability, and auth client.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Environment variables", result: envCheck },
              { label: "REST reachability", result: reachCheck },
              { label: "Auth client", result: authCheck },
            ].map(({ label, result }) => (
              <div key={label} className="flex items-start gap-3 rounded-md border border-border p-3">
                <StatusIcon status={result.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{label}</div>
                    <StatusBadge status={result.status} />
                  </div>
                  <div className="text-sm text-muted-foreground break-words">{result.message}</div>
                  {result.hint && (
                    <div className="text-xs mt-1 text-foreground/70">
                      <span className="font-medium">Hint:</span> {result.hint}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Required tables</CardTitle>
            <CardDescription>
              Each table is probed with a HEAD request. <span className="font-medium">Warn</span> usually means RLS is blocking
              the anon role — the table exists.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {tables.map((t) => (
              <div key={t.name} className="flex items-start gap-3 rounded-md border border-border p-3">
                <StatusIcon status={t.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-mono text-sm">{t.name}</div>
                    <StatusBadge status={t.status} />
                  </div>
                  <div className="text-xs text-muted-foreground break-words">{t.message}</div>
                  {t.hint && (
                    <div className="text-xs mt-1 text-foreground/70">
                      <span className="font-medium">Hint:</span> {t.hint}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SupabaseStatus;

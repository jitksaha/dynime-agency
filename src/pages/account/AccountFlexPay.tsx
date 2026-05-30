import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AccountLayout from "@/components/account/AccountLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  CreditCard, Wallet, Clock, ArrowRight, CalendarDays, CheckCircle2,
  AlertTriangle, TrendingUp, Sparkles, ChevronDown, Loader2, XCircle, RefreshCw,
} from "lucide-react";
import VirtualCard, { type VirtualCardRow } from "@/components/flexpay/VirtualCard";
import PayInstallmentDialog from "@/components/flexpay/PayInstallmentDialog";
import InstallmentReceiptDialog from "@/components/flexpay/InstallmentReceiptDialog";
import { toast } from "sonner";


const fmt = (n: number, cur = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(Number(n) || 0);

const statusVariant = (s: string) =>
  s === "approved" || s === "active" || s === "paid" ? "default"
  : s === "rejected" || s === "overdue" ? "destructive"
  : "secondary";

// Parse a date-only string ("YYYY-MM-DD") as the END of that calendar day in the
// viewer's local timezone. This way an installment "due 2026-06-15" is only
// considered overdue after the user's own midnight passes — never off-by-one
// because of UTC parsing.
const parseDueDeadline = (s: string): Date => {
  if (!s) return new Date(NaN);
  // Already has time component? Trust it.
  if (/T\d/.test(s)) return new Date(s);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return new Date(s);
  const [, y, mo, d] = m;
  return new Date(Number(y), Number(mo) - 1, Number(d), 23, 59, 59, 999);
};

const startOfLocalDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

// Human-friendly countdown that switches granularity based on how far away the
// deadline is: minutes < 1h, hours < 24h, otherwise calendar days (computed in
// local time so DST and timezone shifts never produce "1 day left" while it's
// actually due in 3 hours).
const formatDueCountdown = (due: Date, now: Date): { label: string; overdue: boolean; urgent: boolean } => {
  if (Number.isNaN(due.getTime())) return { label: "", overdue: false, urgent: false };
  const diffMs = due.getTime() - now.getTime();
  const absMin = Math.round(Math.abs(diffMs) / 60000);

  if (diffMs < 0) {
    // Overdue — express in the largest unit that's >= 1.
    if (absMin < 60) return { label: `${absMin}m overdue`, overdue: true, urgent: true };
    const absHr = Math.round(absMin / 60);
    if (absHr < 24) return { label: `${absHr}h overdue`, overdue: true, urgent: true };
    const absDays = Math.floor(absHr / 24);
    return { label: `${absDays}d overdue`, overdue: true, urgent: true };
  }

  // Future. If the deadline falls on today's local calendar day, prefer the
  // hour/minute form so "Due today" never disappears into a confusing "0 days".
  const sameLocalDay =
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate();

  if (absMin < 60) return { label: `Due in ${absMin}m`, overdue: false, urgent: true };
  const hoursLeft = Math.round(absMin / 60);
  if (sameLocalDay || hoursLeft < 24) {
    return { label: `Due in ${hoursLeft}h`, overdue: false, urgent: hoursLeft <= 12 };
  }

  // > 24h away — compute whole calendar days between today's local midnight and
  // the deadline's local midnight so DST jumps don't shift the count.
  const dayDiff = Math.round(
    (startOfLocalDay(due).getTime() - startOfLocalDay(now).getTime()) / 86400000,
  );
  if (dayDiff === 1) return { label: "1 day left", overdue: false, urgent: true };
  return { label: `${dayDiff} days left`, overdue: false, urgent: false };
};

const AWAITING_KEY = "flexpay:awaiting-paid-id";

const AccountFlexPay = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [payInstallment, setPayInstallment] = useState<any | null>(null);
  const [receiptInstallment, setReceiptInstallment] = useState<any | null>(null);
  // Track an installment the user just initiated payment for, so we can auto-open
  // the receipt the moment the webhook flips it to "paid". Persisted in
  // sessionStorage so it survives the gateway-redirect round-trip.
  const [awaitingPaidId, setAwaitingPaidIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.sessionStorage.getItem(AWAITING_KEY);
  });
  const setAwaitingPaidId = (id: string | null) => {
    setAwaitingPaidIdState(id);
    try {
      if (id) window.sessionStorage.setItem(AWAITING_KEY, id);
      else window.sessionStorage.removeItem(AWAITING_KEY);
    } catch { /* ignore quota */ }
  };
  const autoShownRef = useRef<Set<string>>(new Set());

  const { data: account } = useQuery({
    enabled: !!user,
    queryKey: ["flexpay-account", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("flexpay_credit_accounts")
        .select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: card, refetch: refetchCard } = useQuery({
    enabled: !!user,
    queryKey: ["flexpay-card-mine", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("flexpay_virtual_cards")
        .select("id, cardholder_name, card_number, last4, cvv, exp_month, exp_year, status, theme, tier")
        .eq("user_id", user!.id)
        .in("status", ["active", "frozen"])
        .order("issued_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data as VirtualCardRow | null) || null;
    },
  });

  const { data: apps } = useQuery({
    enabled: !!user,
    queryKey: ["flexpay-apps-mine", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("flexpay_credit_applications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const { data: plans } = useQuery({
    enabled: !!user,
    queryKey: ["flexpay-plans-mine", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("flexpay_emi_plans")
        .select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: installments } = useQuery({
    enabled: !!user,
    queryKey: ["flexpay-installments-mine", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("flexpay_emi_installments")
        .select("*")
        .order("due_date", { ascending: true });
      return data || [];
    },
  });

  // Realtime: when an installment row of this user changes (webhook flips it to
  // "paid" / "failed"), refetch immediately so the UI status badge and the
  // auto-receipt effect below pick it up.
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`flexpay-installments-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "flexpay_emi_installments" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["flexpay-installments-mine", user.id] });
          queryClient.invalidateQueries({ queryKey: ["flexpay-account", user.id] });
        },
      )
      .subscribe();
    // Poll as a safety net while ANY installment is in flight — either the one
    // the user just initiated, or any "processing" row that hasn't resolved
    // (covers post-redirect resume and webhook lag).
    const anyProcessing = (installments || []).some((i: any) => i.status === "processing");
    const shouldPoll = !!awaitingPaidId || anyProcessing;
    const pollId = shouldPoll
      ? setInterval(() => {
          queryClient.invalidateQueries({ queryKey: ["flexpay-installments-mine", user.id] });
        }, 4000)
      : null;
    return () => {
      supabase.removeChannel(ch);
      if (pollId) clearInterval(pollId);
    };
  }, [user, queryClient, awaitingPaidId, installments]);

  // Handle return from the payment gateway (?payment=success|cancelled).
  // The webhook is the source of truth for status — we just nudge a refetch
  // and surface a transient toast so the user knows we're waiting on it.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const p = params.get("payment");
    if (!p) return;
    if (p === "success") {
      toast.info("Confirming your payment…", {
        description: "We're waiting for the gateway to confirm. This usually takes a few seconds.",
      });
    } else if (p === "cancelled") {
      toast.warning("Payment cancelled", {
        description: "No charge was made. You can retry from the installment list below.",
      });
    }
    if (user) {
      queryClient.invalidateQueries({ queryKey: ["flexpay-installments-mine", user.id] });
    }
    // Clean the URL so a refresh doesn't re-toast.
    const url = new URL(window.location.href);
    url.searchParams.delete("payment");
    window.history.replaceState({}, "", url.toString());
  }, [user, queryClient]);

  // Auto-react the moment the webhook flips the installment we just initiated
  // to a terminal state — open the receipt on success, toast on failure.
  useEffect(() => {
    if (!awaitingPaidId || !installments?.length) return;
    const target = (installments as any[]).find((i) => i.id === awaitingPaidId);
    if (!target || autoShownRef.current.has(target.id)) return;
    if (target.status === "paid") {
      autoShownRef.current.add(target.id);
      setPayInstallment(null);
      setReceiptInstallment(target);
      setAwaitingPaidId(null);
      toast.success("Payment succeeded", {
        description: `Installment #${target.sequence} is paid. Your invoice is ready to download.`,
      });
    } else if (target.status === "failed") {
      autoShownRef.current.add(target.id);
      setPayInstallment(null);
      setAwaitingPaidId(null);
      toast.error("Payment failed", {
        description: target.failure_reason || `Installment #${target.sequence} could not be charged. You can retry from the list below.`,
      });
    }
  }, [installments, awaitingPaidId]);

  const appIds = (apps || []).map((a: any) => a.id);
  const { data: appDocs, refetch: refetchDocs } = useQuery({
    enabled: !!user && appIds.length > 0,
    queryKey: ["flexpay-app-docs-mine", appIds.join(",")],
    queryFn: async () => {
      const { data } = await supabase
        .from("flexpay_application_documents")
        .select("*")
        .in("application_id", appIds)
        .order("requested_at", { ascending: false });
      return data || [];
    },
  });

  const total = Number(account?.total_limit || 0);
  const used = Number(account?.used_limit || 0);
  const available = Math.max(0, total - used);
  const utilization = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const cur = account?.currency || "USD";

  // Live "now" — re-renders every minute so hour/minute countdowns stay accurate
  // without us having to refetch any data.
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const today = useMemo(() => startOfLocalDay(now), [now]);
  const nextDue = useMemo(() => {
    const pending = (installments || [])
      .filter((i: any) => i.status === "pending")
      .sort((a: any, b: any) => a.due_date.localeCompare(b.due_date));
    return pending[0] || null;
  }, [installments]);

  const overdueCount = useMemo(
    () => (installments || []).filter((i: any) => i.status === "pending" && parseDueDeadline(i.due_date) < now).length,
    [installments, now],
  );

  const totalDueLifetime = useMemo(
    () => (installments || []).filter((i: any) => i.status === "pending").reduce((s: number, i: any) => s + Number(i.amount), 0),
    [installments],
  );

  const activePlans = (plans || []).filter((p: any) => p.status === "active").length;
  const hasPlans = (plans || []).length > 0;
  const allInstallmentsPaid = hasPlans && (installments || []).length > 0 &&
    (installments || []).every((i: any) => i.status === "paid");
  const canReapply = allInstallmentsPaid && used === 0;

  // Detect the most recent "paid early" installment (paid before its due date, within last 7 days)
  const [dismissedEarlyId, setDismissedEarlyId] = useState<string | null>(null);
  const recentEarlyPaid = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 86400000;
    const candidates = (installments || [])
      .filter((i: any) => {
        if (i.status !== "paid" || !i.paid_at) return false;
        const paidAt = new Date(i.paid_at).getTime();
        if (paidAt < sevenDaysAgo) return false;
        const dueStart = new Date(i.due_date); dueStart.setHours(0, 0, 0, 0);
        return paidAt < dueStart.getTime();
      })
      .sort((a: any, b: any) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime());
    return candidates[0] || null;
  }, [installments]);
  const earlyDaysSaved = recentEarlyPaid
    ? Math.max(1, Math.ceil((new Date(recentEarlyPaid.due_date).getTime() - new Date(recentEarlyPaid.paid_at).getTime()) / 86400000))
    : 0;

  const scrollToInstallments = () => {
    document.getElementById("flexpay-installments")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <AccountLayout title="FlexPay" description="Your credit limit, EMI plans and upcoming payments — all in one place.">
      {!account ? (
        <Card className="mb-6 border-dashed">
          <CardContent className="p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-4 justify-between">
            <div>
              <h2 className="font-heading text-xl font-bold">You don't have a FlexPay limit yet</h2>
              <p className="text-sm text-muted-foreground mt-1">Apply now to unlock EMI and Pay Later options at checkout.</p>
            </div>
            <Button asChild><Link to="/flexpay/apply">Apply for credit <ArrowRight className="w-4 h-4 ml-1.5" /></Link></Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ============== CREDIT LIMIT HERO ============== */}
          <Card className="mb-6 overflow-hidden border-primary/30 bg-gradient-to-br from-primary/10 via-background to-background relative">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.2),transparent_60%)]" />
            <CardContent className="p-6 md:p-8 grid md:grid-cols-2 gap-6 items-center">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary mb-3">
                  <Sparkles className="w-3.5 h-3.5" /> Dynime FlexPay
                </div>
                <div className="text-sm text-muted-foreground">Total credit limit</div>
                <div className="text-4xl md:text-5xl font-bold tracking-tight mt-1">{fmt(total, cur)}</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant={statusVariant(account.status)} className="capitalize">{account.status}</Badge>
                  <Badge variant="secondary">Up to {account.max_tenure_months} mo tenure</Badge>
                  <Badge variant="outline" className="capitalize">{account.risk_rating} risk</Badge>
                </div>
                <Button asChild size="sm" className="mt-5 rounded-full">
                  <Link to="/services">Spend with FlexPay <ArrowRight className="w-4 h-4 ml-1.5" /></Link>
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                    <span>Credit utilization</span>
                    <span className="font-semibold text-foreground">{utilization}%</span>
                  </div>
                  <Progress value={utilization} className="h-3" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                    <span>Used <strong className="text-foreground">{fmt(used, cur)}</strong></span>
                    <span>Available <strong className="text-primary">{fmt(available, cur)}</strong></span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <MiniStat label="Active plans" value={String(activePlans)} />
                  <MiniStat label="Outstanding" value={fmt(totalDueLifetime, cur)} />
                  <MiniStat label="Overdue" value={String(overdueCount)} danger={overdueCount > 0} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ============== VIRTUAL CARD ============== */}
          {card && (
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" /> Your FlexPay virtual card
                </CardTitle>
              </CardHeader>
              <CardContent>
                <VirtualCard
                  card={card}
                  available={available}
                  used={used}
                  currency={cur}
                  onUpdate={() => refetchCard()}
                  onRepay={scrollToInstallments}
                />
              </CardContent>
            </Card>
          )}

          {/* ============== REAPPLY FOR NEW LIMIT ============== */}
          {canReapply && (
            <Card className="mb-6 border-primary/40 bg-gradient-to-br from-primary/10 via-background to-background">
              <CardContent className="p-6 md:p-7 flex flex-col md:flex-row md:items-center gap-4 justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold">You're all paid up — ready for more?</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      All your installments are cleared. Reapply now for a fresh (or higher) credit limit on your next purchase.
                    </p>
                  </div>
                </div>
                <Button asChild className="rounded-full">
                  <Link to="/flexpay/apply">Reapply for new limit <ArrowRight className="w-4 h-4 ml-1.5" /></Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ============== ALERTS + NEXT PAYMENT ============== */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <Card className={nextDue ? "border-primary/30" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-primary" /> Next payment due
                </CardTitle>
              </CardHeader>
              <CardContent>
                {nextDue ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold">{fmt(Number(nextDue.amount), cur)}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {(() => {
                          const d = parseDueDeadline(nextDue.due_date);
                          const c = formatDueCountdown(d, now);
                          return `Due ${d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })} · ${c.label}`;
                        })()}
                      </div>
                    </div>
                    <Badge variant={parseDueDeadline(nextDue.due_date) < now ? "destructive" : "secondary"}>
                      {parseDueDeadline(nextDue.due_date) < now ? "Overdue" : "Upcoming"}
                    </Badge>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No upcoming installments. You're all caught up.</p>
                )}
              </CardContent>
            </Card>

            <Card className={overdueCount > 0 ? "border-destructive/40 bg-destructive/5" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  {overdueCount > 0
                    ? <AlertTriangle className="w-4 h-4 text-destructive" />
                    : <TrendingUp className="w-4 h-4 text-primary" />}
                  Account health
                </CardTitle>
              </CardHeader>
              <CardContent>
                {overdueCount > 0 ? (
                  <div>
                    <div className="text-2xl font-bold text-destructive">{overdueCount} overdue</div>
                    <p className="text-xs text-muted-foreground mt-1">Resolve missed installments to protect your credit limit.</p>
                  </div>
                ) : (
                  <div>
                    <div className="text-2xl font-bold text-primary">Excellent</div>
                    <p className="text-xs text-muted-foreground mt-1">All payments on schedule. Keep it up.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* ============== EMI PLANS ============== */}
      <Card className="mb-6">
        <CardHeader><CardTitle>EMI plans</CardTitle></CardHeader>
        <CardContent>
          {!plans?.length ? (
            <p className="text-sm text-muted-foreground">No active EMI plans yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {plans.map((p: any) => {
                const paid = (installments || []).filter((i: any) => i.plan_id === p.id && i.status === "paid").length;
                const pct = p.tenure_months > 0 ? Math.round((paid / p.tenure_months) * 100) : 0;
                return (
                  <div key={p.id} className="py-4">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <p className="font-semibold">{fmt(Number(p.monthly_amount), p.currency)} <span className="text-muted-foreground font-normal">/ mo</span></p>
                        <p className="text-xs text-muted-foreground">
                          {p.tenure_months} months · Financed {fmt(Number(p.financed_amount), p.currency)} · Started {new Date(p.started_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={statusVariant(p.status)} className="capitalize">{p.status}</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={pct} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{paid}/{p.tenure_months} paid</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ============== EARLY PAYMENT SUCCESS BANNER ============== */}
      {recentEarlyPaid && dismissedEarlyId !== recentEarlyPaid.id && (
        <Card className="mb-4 border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-background overflow-hidden">
          <CardContent className="p-4 md:p-5 flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold">Paid early — nicely done!</p>
                <Badge variant="default" className="text-[10px]">
                  {earlyDaysSaved} day{earlyDaysSaved === 1 ? "" : "s"} ahead
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Installment #{recentEarlyPaid.sequence} of {fmt(Number(recentEarlyPaid.amount), cur)} is settled before its due date.
              </p>
              <div className="mt-2 text-sm">
                <span className="text-muted-foreground">Next up: </span>
                {nextDue ? (
                  <button
                    type="button"
                    onClick={scrollToInstallments}
                    className="font-medium text-primary hover:underline"
                  >
                    Installment #{nextDue.sequence} · {fmt(Number(nextDue.amount), cur)} due{" "}
                    {new Date(nextDue.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </button>
                ) : allInstallmentsPaid ? (
                  <span className="font-medium text-foreground">All installments cleared 🎉 You can reapply for a fresh limit.</span>
                ) : (
                  <span className="font-medium text-foreground">No upcoming installments.</span>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground flex-shrink-0"
              onClick={() => setDismissedEarlyId(recentEarlyPaid.id)}
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ============== LIVE PROCESSING BANNER ============== */}
      {(() => {
        const processing = (installments || []).filter((i: any) => i.status === "processing");
        if (!processing.length) return null;
        return (
          <Card className="mb-4 border-primary/40 bg-primary/5">
            <CardContent className="p-4 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm">
                  Confirming payment{processing.length > 1 ? "s" : ""} with the gateway…
                </p>
                <p className="text-xs text-muted-foreground">
                  {processing.length === 1
                    ? `Installment #${processing[0].sequence} · ${fmt(Number(processing[0].amount), cur)} — this updates automatically the moment the gateway confirms.`
                    : `${processing.length} installments in flight — the list below updates automatically as each is confirmed.`}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* ============== INSTALLMENT SCHEDULE ============== */}
      {!!installments?.length && (
        <Card className="mb-6" id="flexpay-installments">
          <CardHeader><CardTitle>Installments</CardTitle></CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {(installments as any[]).slice(0, 12).map((i: any) => {
                const dueDeadline = parseDueDeadline(i.due_date);
                const dueStartOfDay = startOfLocalDay(dueDeadline);
                const countdown = formatDueCountdown(dueDeadline, now);
                const overdue = i.status === "pending" && countdown.overdue;
                // Anything not finalised as "paid" can be (re)paid by the user —
                // pending, failed, or a stuck "processing" attempt.
                const payable = i.status === "pending" || i.status === "failed" || i.status === "processing";
                const isFailed = i.status === "failed";
                const isProcessing = i.status === "processing";
                const isPaid = i.status === "paid";
                const paidEarly = isPaid && i.paid_at && new Date(i.paid_at).getTime() < dueStartOfDay.getTime();
                const daysEarly = paidEarly
                  ? Math.max(1, Math.ceil((dueStartOfDay.getTime() - new Date(i.paid_at).getTime()) / 86400000))
                  : 0;

                const statusLabel = isPaid ? (paidEarly ? "Paid early" : "Paid")
                  : isFailed ? "Failed"
                  : isProcessing ? "Processing"
                  : overdue ? "Overdue"
                  : "Pending";
                const statusVariantLocal: "default" | "secondary" | "destructive" | "outline" =
                  isPaid ? "default" : isFailed || overdue ? "destructive" : isProcessing ? "outline" : "secondary";

                const StatusIcon = isPaid ? CheckCircle2
                  : isFailed ? XCircle
                  : isProcessing ? Loader2
                  : Clock;

                const tsLine = isPaid && i.paid_at
                  ? `Paid ${new Date(i.paid_at).toLocaleString()}${paidEarly ? ` · ${daysEarly} day${daysEarly === 1 ? "" : "s"} early` : ""}`
                  : isFailed && i.failed_at
                  ? `Failed ${new Date(i.failed_at).toLocaleString()}${i.failure_reason ? ` — ${i.failure_reason}` : ""}`
                  : isProcessing && i.processing_at
                  ? `Started ${new Date(i.processing_at).toLocaleString()}`
                  : `Due ${dueDeadline.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;

                return (
                  <button
                    key={i.id}
                    type="button"
                    disabled={!payable && !isPaid}
                    onClick={() => {
                      if (payable) { setPayInstallment(i); setAwaitingPaidId(i.id); }
                      else if (isPaid) setReceiptInstallment(i);
                    }}
                    className={`w-full py-3 flex items-center justify-between gap-3 text-left ${(payable || isPaid) ? "hover:bg-muted/50 cursor-pointer rounded-md px-2 -mx-2 transition" : "opacity-90"}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isPaid ? "bg-primary/15 text-primary"
                        : isFailed || overdue ? "bg-destructive/15 text-destructive"
                        : isProcessing ? "bg-secondary text-foreground"
                        : "bg-muted text-muted-foreground"
                      }`}>
                        <StatusIcon className={`w-4 h-4 ${isProcessing ? "animate-spin" : ""}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium">#{i.sequence} · {fmt(Number(i.amount))}</p>
                        <p className="text-xs text-muted-foreground truncate">{tsLine}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                      <Badge variant={statusVariantLocal} className="capitalize hidden sm:inline-flex">{statusLabel}</Badge>
                      {payable && (() => {
                        const label = isFailed ? "Retry" : countdown.label;
                        return (
                          <span className="inline-flex flex-col items-end leading-tight flex-shrink-0">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary whitespace-nowrap">
                              {isFailed ? <RefreshCw className="w-3 h-3" /> : null}
                              {isFailed ? "Retry" : "Pay now →"}
                            </span>
                            {!isFailed && (
                              <span
                                className={`text-[10px] font-medium whitespace-nowrap ${
                                  countdown.overdue
                                    ? "text-destructive"
                                    : countdown.urgent
                                    ? "text-primary"
                                    : "text-muted-foreground"
                                }`}
                                title={dueDeadline.toLocaleString()}
                              >
                                {label}
                              </span>
                            )}
                          </span>
                        );
                      })()}
                      {isPaid && (
                        <span className="text-xs font-semibold text-primary inline-flex items-center gap-1 whitespace-nowrap flex-shrink-0">
                          Receipt →
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============== APPLICATIONS ============== */}
      <Card>
        <CardHeader><CardTitle>My applications</CardTitle></CardHeader>
        <CardContent>
          {!apps?.length ? (
            <p className="text-sm text-muted-foreground">No applications yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {apps.map((a: any) => {
                const statusLabel =
                  a.status === "approved" ? "Approved"
                  : a.status === "rejected" ? "Rejected"
                  : a.status === "under_review" ? "Under review"
                  : a.status === "requires_action" ? "Action required"
                  : "Pending review";
                const docsForApp = (appDocs || []).filter((d: any) => d.application_id === a.id);
                const approvedLimit = a.status === "approved" && account ? Number(account.total_limit) : null;
                const approvedAt = a.status === "approved" ? (account?.approved_at || a.reviewed_at) : a.reviewed_at;
                const limitDiff = approvedLimit !== null ? approvedLimit - Number(a.requested_limit) : 0;
                return (
                  <ApplicationRow
                    key={a.id}
                    app={a}
                    statusLabel={statusLabel}
                    statusVariant={statusVariant(a.status)}
                    approvedLimit={approvedLimit}
                    approvedAt={approvedAt}
                    limitDiff={limitDiff}
                    cur={cur}
                    docsForApp={docsForApp}
                    onDocsChange={refetchDocs}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <PayInstallmentDialog
        installment={payInstallment}
        open={!!payInstallment}
        onOpenChange={(o) => { if (!o) setPayInstallment(null); }}
      />

      <InstallmentReceiptDialog
        installment={receiptInstallment}
        open={!!receiptInstallment}
        onOpenChange={(o) => { if (!o) setReceiptInstallment(null); }}
      />
    </AccountLayout>
  );
};

const ApplicationRow = ({
  app: a, statusLabel, statusVariant: sv, approvedLimit, approvedAt, limitDiff, cur, docsForApp, onDocsChange,
}: any) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="py-3 space-y-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 text-left hover:bg-muted/40 -mx-2 px-2 py-1 rounded-md transition-colors"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold bg-muted px-2 py-0.5 rounded">{a.reference_no || a.id.slice(0,8).toUpperCase()}</span>
            <span className="font-medium truncate">{fmt(Number(a.requested_limit), cur)}</span>
            {approvedLimit !== null && approvedLimit !== Number(a.requested_limit) && (
              <span className="text-xs text-muted-foreground">
                → <span className="font-semibold text-foreground">{fmt(approvedLimit, cur)}</span>
                <span className={limitDiff > 0 ? "text-emerald-600 ml-1" : "text-amber-600 ml-1"}>
                  ({limitDiff > 0 ? "+" : ""}{fmt(limitDiff, cur)})
                </span>
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {a.full_name} · Submitted {new Date(a.created_at).toLocaleDateString()}
          </p>
          {a.status === "rejected" && a.rejection_reason && (
            <p className="text-xs text-destructive mt-1">{a.rejection_reason}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={sv}>{statusLabel}</Badge>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {open && (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
          {approvedLimit !== null && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <MiniStat label="Requested" value={fmt(Number(a.requested_limit), cur)} />
              <MiniStat label="Approved limit" value={fmt(approvedLimit, cur)} />
              <MiniStat label="Approved on" value={approvedAt ? new Date(approvedAt).toLocaleDateString() : "—"} />
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <DetailRow label="Email" value={a.email} />
            <DetailRow label="Phone" value={a.phone} />
            <DetailRow label="Country" value={a.country} />
            <DetailRow label="Occupation" value={a.occupation} />
            <DetailRow label="Employer" value={a.employer} />
            <DetailRow label="Monthly income" value={a.monthly_income ? fmt(Number(a.monthly_income), cur) : "—"} />
            <DetailRow label="Purpose" value={a.purpose} />
            <DetailRow label="Submitted" value={new Date(a.created_at).toLocaleString()} />
            {a.reviewed_at && <DetailRow label="Reviewed" value={new Date(a.reviewed_at).toLocaleString()} />}
          </div>
          {a.notes && (
            <div className="text-sm">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">Notes</div>
              <p className="text-foreground/80">{a.notes}</p>
            </div>
          )}
        </div>
      )}

      {docsForApp.length > 0 && (
        <ApplicationDocuments
          applicationId={a.id}
          docs={docsForApp}
          onChange={onDocsChange}
        />
      )}
    </div>
  );
};

const DetailRow = ({ label, value }: { label: string; value?: string | null }) => (
  <div className="flex justify-between gap-3 border-b border-border/40 py-1 last:border-0">
    <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
    <span className="text-sm font-medium text-right truncate">{value || "—"}</span>
  </div>
);

const MiniStat = ({ label, value, danger }: { label: string; value: string; danger?: boolean }) => (
  <div className={"rounded-lg border p-2.5 text-center " + (danger ? "border-destructive/40 bg-destructive/5" : "border-border bg-background/60")}>
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className={"text-sm font-bold mt-0.5 " + (danger ? "text-destructive" : "")}>{value}</div>
  </div>
);

const ApplicationDocuments = ({
  applicationId,
  docs,
  onChange,
}: {
  applicationId: string;
  docs: any[];
  onChange: () => void;
}) => {
  const pending = docs.filter((d) => d.status === "requested").length;
  const handleUpload = async (doc: any, file: File) => {
    if (file.size > 10 * 1024 * 1024) return toast.error("Max file size is 10MB");
    const ext = file.name.split(".").pop() || "bin";
    const path = `${applicationId}/${doc.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("flexpay-documents")
      .upload(path, file, { contentType: file.type, upsert: true });
    if (upErr) return toast.error(upErr.message);
    const { error } = await supabase
      .from("flexpay_application_documents")
      .update({
        file_path: path,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        uploaded_at: new Date().toISOString(),
        status: "uploaded",
      })
      .eq("id", doc.id);
    if (error) return toast.error(error.message);
    toast.success("Document uploaded");
    onChange();
  };

  return (
    <div className="rounded-lg border bg-muted/30 p-3 mt-2">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-amber-600" />
        <p className="text-sm font-semibold">
          {pending > 0
            ? `${pending} document${pending > 1 ? "s" : ""} requested by admin`
            : "Documents uploaded — under review"}
        </p>
      </div>
      <div className="space-y-2">
        {docs.map((d: any) => {
          const variant =
            d.status === "approved" ? "default"
            : d.status === "rejected" ? "destructive"
            : d.status === "uploaded" ? "secondary" : "outline";
          return (
            <div key={d.id} className="rounded-md bg-background p-2.5 border">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{d.label}</span>
                    <Badge variant={variant as any} className="capitalize">{d.status}</Badge>
                  </div>
                  {d.description && <p className="text-xs text-muted-foreground mt-0.5">{d.description}</p>}
                  {d.file_name && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {d.file_name} · uploaded {new Date(d.uploaded_at).toLocaleString()}
                    </p>
                  )}
                  {d.review_note && d.status === "rejected" && (
                    <p className="text-xs text-destructive mt-1">{d.review_note}</p>
                  )}
                </div>
                {(d.status === "requested" || d.status === "rejected") && (
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUpload(d, f);
                        e.target.value = "";
                      }}
                    />
                    <span className="inline-flex items-center gap-1 text-xs font-semibold bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:opacity-90">
                      {d.status === "rejected" ? "Re-upload" : "Upload"}
                    </span>
                  </label>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AccountFlexPay;

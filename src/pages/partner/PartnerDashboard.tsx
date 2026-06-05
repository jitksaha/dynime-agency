import { useState, useEffect, useCallback } from "react";
import { NavLink } from "react-router-dom";
import { usePageTitle } from "@/hooks/use-page-title";
import { useSEO } from "@/hooks/use-seo";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useSocket } from "@/hooks/useSocket";
import AccountLayout from "@/components/account/AccountLayout";
import {
  LayoutDashboard,
  DollarSign,
  Clock,
  CheckCircle2,
  MousePointerClick,
  TrendingUp,
  Percent,
  Copy,
  Check,
  Link2,
  BarChart3,
  Loader2,
  AlertCircle,
  HandCoins,
  Wallet,
  GitMerge,
  Edit2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

interface PartnerStats {
  totalEarned: number;
  pendingBalance: number;
  approvedBalance: number;
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
  referralCode: string;
  recentCommissions: Commission[];
  dailyStats: DailyStat[];
}

interface Commission {
  id: string;
  serviceName: string;
  orderAmount: number;
  commission: number;
  status: "pending" | "approved" | "paid";
  createdAt: string;
}

interface DailyStat {
  date: string;
  clicks: number;
  earnings: number;
}

// ─── Navigation Tabs ─────────────────────────────────────────────────────────

export const ReferralTabs = () => {
  const tabs = [
    { to: "/partner", label: "Dashboard", end: true },
    { to: "/partner/commissions", label: "Commissions" },
    { to: "/partner/payouts", label: "Payouts" },
  ];
  return (
    <div className="flex border-b border-border mb-6">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-all duration-200 -mb-px",
              isActive
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </div>
  );
};

// ─── Daily Stats Parser ──────────────────────────────────────────────────────

function parseDailyStats(trends: { referrals: any[]; commissions: any[] }): DailyStat[] {
  const dailyMap: Record<string, { clicks: number; earnings: number }> = {};
  
  // Initialize last 30 days
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    dailyMap[dateStr] = { clicks: 0, earnings: 0 };
  }
  
  // Populate clicks (referrals)
  if (trends?.referrals) {
    trends.referrals.forEach((r) => {
      const dateStr = new Date(r.created_at).toISOString().split("T")[0];
      if (dailyMap[dateStr]) {
        dailyMap[dateStr].clicks++;
      }
    });
  }
  
  // Populate earnings (commissions)
  if (trends?.commissions) {
    trends.commissions.forEach((c) => {
      const dateStr = new Date(c.created_at).toISOString().split("T")[0];
      if (dailyMap[dateStr]) {
        dailyMap[dateStr].earnings += Number(c.commission_amount || 0);
      }
    });
  }
  
  return Object.entries(dailyMap)
    .map(([date, val]) => ({
      date,
      clicks: val.clicks,
      earnings: Math.round(val.earnings * 100) / 100,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ─── 30-day inline SVG chart ──────────────────────────────────────────────────

const MiniLineChart = ({ data }: { data: DailyStat[] }) => {
  if (!data || data.length === 0) return null;

  const W = 600;
  const H = 120;
  const PAD = { top: 12, right: 8, bottom: 24, left: 40 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const maxClicks = Math.max(...data.map((d) => d.clicks), 1);
  const maxEarnings = Math.max(...data.map((d) => d.earnings), 1);

  const xOf = (i: number) => PAD.left + (i / (data.length - 1)) * innerW;
  const yClicks = (v: number) => PAD.top + innerH - (v / maxClicks) * innerH;
  const yEarnings = (v: number) =>
    PAD.top + innerH - (v / maxEarnings) * innerH;

  const clicksPath = data
    .map((d, i) => `${i === 0 ? "M" : "L"}${xOf(i)},${yClicks(d.clicks)}`)
    .join(" ");
  const earningsPath = data
    .map((d, i) =>
      `${i === 0 ? "M" : "L"}${xOf(i)},${yEarnings(d.earnings)}`
    )
    .join(" ");

  const clicksFill = `${clicksPath} L${xOf(data.length - 1)},${PAD.top + innerH} L${PAD.left},${PAD.top + innerH} Z`;
  const earningsFill = `${earningsPath} L${xOf(data.length - 1)},${PAD.top + innerH} L${PAD.left},${PAD.top + innerH} Z`;

  // Show every 7th label
  const labelIndices = data
    .map((_, i) => i)
    .filter((i) => i % 7 === 0 || i === data.length - 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden="true">
      <defs>
        <linearGradient id="clicks-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.01" />
        </linearGradient>
        <linearGradient id="earnings-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <line
          key={t}
          x1={PAD.left}
          x2={W - PAD.right}
          y1={PAD.top + innerH * (1 - t)}
          y2={PAD.top + innerH * (1 - t)}
          stroke="rgba(120, 120, 120, 0.1)"
          strokeWidth="1"
        />
      ))}

      {/* Fills */}
      <path d={clicksFill} fill="url(#clicks-fill)" />
      <path d={earningsFill} fill="url(#earnings-fill)" />

      {/* Lines */}
      <path
        d={clicksPath}
        fill="none"
        stroke="#8b5cf6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={earningsPath}
        fill="none"
        stroke="#06b6d4"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* X-axis labels */}
      {labelIndices.map((i) => (
        <text
          key={i}
          x={xOf(i)}
          y={H - 2}
          textAnchor="middle"
          fontSize="9"
          fill="currentColor"
          className="text-muted-foreground/60"
        >
          {new Date(data[i].date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </text>
      ))}
    </svg>
  );
};

// ─── Status badge helper ──────────────────────────────────────────────────────

const statusBadge = (status: Commission["status"]) => {
  const map: Record<Commission["status"], string> = {
    pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    approved: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    paid: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border",
        map[status]
      )}
    >
      {status}
    </span>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const PartnerDashboard = () => {
  usePageTitle("Referral Program");
  useSEO({ title: "Referral Program", noIndex: true });

  const { user } = useAuth();
  const { socket } = useSocket();
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Join Referral state
  const [joinName, setJoinName] = useState("");
  const [joining, setJoining] = useState(false);

  // Edit Referral Code state
  const [editingCode, setEditingCode] = useState(false);
  const [customCode, setCustomCode] = useState("");
  const [savingCode, setSavingCode] = useState(false);

  const handleSaveCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = customCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!code) {
      toast({ title: "Invalid Code", description: "Referral code cannot be empty.", variant: "destructive" });
      return;
    }
    if (code.length < 3 || code.length > 20) {
      toast({ title: "Invalid Code", description: "Code must be between 3 and 20 characters.", variant: "destructive" });
      return;
    }
    setSavingCode(true);
    try {
      await apiPatch("/referrals/partner/profile", { referralCode: code });
      toast({ title: "Referral Code Updated! 🎉", description: "Your custom referral link is active." });
      setEditingCode(false);
      await load();
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message || "Failed to update referral code.", variant: "destructive" });
    } finally {
      setSavingCode(false);
    }
  };

  useEffect(() => {
    if (user) {
      const name = (user.user_metadata as any)?.full_name || user.email?.split("@")[0] || "";
      setJoinName(name);
    }
  }, [user]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<any>("/referrals/partner/stats");
      
      // Map NestJS nested response structure to frontend model
      const mappedStats: PartnerStats = {
        totalEarned: Number(res.summary?.totalEarned ?? 0),
        pendingBalance: Number(res.summary?.pendingBalance ?? 0),
        approvedBalance: Number(res.summary?.approvedBalance ?? 0),
        totalClicks: Number(res.summary?.clicks ?? 0),
        totalConversions: Number(res.summary?.conversions ?? 0),
        conversionRate: Number(res.summary?.conversionRate ?? 0),
        referralCode: res.partner?.referral_code ?? "",
        recentCommissions: (res.commissions ?? []).map((c: any) => ({
          id: c.id,
          serviceName: c.service_name,
          orderAmount: Number(c.order_amount),
          commission: Number(c.commission_amount),
          status: c.status,
          createdAt: c.created_at,
        })),
        dailyStats: parseDailyStats(res.trends),
      };
      setStats(mappedStats);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load partner stats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handleReferralUpdated = (data: any) => {
      console.log("[PartnerDashboard] Real-time referral update received:", data);
      if (data?.userId === user?.id || !data?.userId) {
        load();
      }
    };

    socket.on("referral-updated", handleReferralUpdated);

    return () => {
      socket.off("referral-updated", handleReferralUpdated);
    };
  }, [socket, user, load]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinName.trim()) {
      toast({ title: "Name required", description: "Please enter your name.", variant: "destructive" });
      return;
    }
    setJoining(true);
    try {
      await apiPost("/referrals/partner/register", { name: joinName.trim() });
      toast({ title: "Welcome to the Referral Program! 🎉", description: "Your partner account has been created." });
      load();
    } catch (err: any) {
      toast({ title: "Registration failed", description: err.message || "Failed to register.", variant: "destructive" });
    } finally {
      setJoining(false);
    }
  };

  const referralLink = stats?.referralCode
    ? `${window.location.origin}/invite/${stats.referralCode}`
    : "";

  const copyLink = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast({ title: "Copied!", description: "Referral link copied to clipboard." });
      setTimeout(() => setCopied(false), 2200);
    } catch {
      toast({ title: "Error", description: "Could not copy to clipboard.", variant: "destructive" });
    }
  };

  // Onboarding Join screen
  if (!loading && error === "Partner profile not found") {
    return (
      <AccountLayout title="Referral Program" description="Earn rewards by referring clients to Dynime.">
        <div className="max-w-xl mx-auto mt-6">
          <div className="rounded-2xl border border-border bg-card/60 p-6 md:p-8 shadow-lg backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-center gap-3 mb-6">
               <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
                 <GitMerge className="w-6 h-6 text-primary" />
               </div>
               <div>
                 <h2 className="text-xl font-heading font-bold text-foreground">Join our Referral Program</h2>
                 <p className="text-xs text-muted-foreground mt-0.5">Earn commissions for every referral</p>
               </div>
            </div>

            <div className="space-y-4 text-sm text-foreground/80 mb-8 leading-relaxed">
              <p>
                Recommend Dynime to your network and earn a baseline of{" "}
                <strong className="text-primary font-semibold">10% commission</strong> on their first service purchase.
              </p>
              <ul className="space-y-2.5 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Real-time link click & signup conversion tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Monthly payouts via Wise, PayPal, Crypto, and Bank Transfer</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Multi-tier brackets to increase your rates as you refer more</span>
                </li>
              </ul>
            </div>

            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label htmlFor="join-name" className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                  Partner Name (Determines your custom link prefix)
                </label>
                <input
                  id="join-name"
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  placeholder="e.g. John Doe"
                  required
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
                />
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  This will generate a referral code like <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[10px]">{joinName.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 6) || "REF"}</code>
                </p>
              </div>

              <button
                type="submit"
                disabled={joining}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 disabled:opacity-50"
              >
                {joining ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating account…
                  </>
                ) : (
                  <>
                    Join Referral Program
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </AccountLayout>
    );
  }

  const statCards = stats
    ? [
        {
          label: "Total Earned",
          value: `$${stats.totalEarned.toFixed(2)}`,
          icon: DollarSign,
          tone: "from-emerald-500/10 to-emerald-500/5",
          iconClass: "text-emerald-500",
        },
        {
          label: "Pending Balance",
          value: `$${stats.pendingBalance.toFixed(2)}`,
          icon: Clock,
          tone: "from-amber-500/10 to-amber-500/5",
          iconClass: "text-amber-500",
        },
        {
          label: "Approved Balance",
          value: `$${stats.approvedBalance.toFixed(2)}`,
          icon: CheckCircle2,
          tone: "from-blue-500/10 to-blue-500/5",
          iconClass: "text-blue-500",
        },
        {
          label: "Total Clicks",
          value: stats.totalClicks.toLocaleString(),
          icon: MousePointerClick,
          tone: "from-purple-500/10 to-purple-500/5",
          iconClass: "text-purple-500",
        },
        {
          label: "Total Conversions",
          value: stats.totalConversions.toLocaleString(),
          icon: TrendingUp,
          tone: "from-cyan-500/10 to-cyan-500/5",
          iconClass: "text-cyan-500",
        },
        {
          label: "Conversion Rate",
          value: `${stats.conversionRate.toFixed(1)}%`,
          icon: Percent,
          tone: "from-pink-500/10 to-pink-500/5",
          iconClass: "text-pink-500",
        },
      ]
    : [];

  return (
    <AccountLayout
      title="Referral Program"
      description="Track your referrals, earnings, and conversion performance."
    >
      <ReferralTabs />

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl bg-muted/40" />
            ))}
          </div>
          <Skeleton className="h-52 rounded-2xl bg-muted/40" />
          <Skeleton className="h-64 rounded-2xl bg-muted/40" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-foreground font-semibold text-lg mb-2">
            Failed to load data
          </h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-xs">{error}</p>
          <button
            onClick={load}
            className="px-5 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium border border-primary/20 hover:bg-primary/20 transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {/* Content */}
      {!loading && !error && stats && (
        <div className="space-y-6">
          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {statCards.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className={cn(
                    "rounded-2xl border border-border bg-gradient-to-br p-5 transition-transform hover:-translate-y-0.5 duration-200",
                    s.tone
                  )}
                >
                  <div className="w-9 h-9 rounded-xl bg-background border border-border flex items-center justify-center mb-4">
                    <Icon className={cn("w-4 h-4", s.iconClass)} />
                  </div>
                  <div className="text-2xl font-bold text-foreground font-heading">
                    {s.value}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {s.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Referral Link & Commission Structure Info */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Referral link */}
            <div className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Link2 className="w-4 h-4 text-primary" />
                    </div>
                    <h2 className="font-heading font-semibold text-foreground text-base">
                      Your Referral Link
                    </h2>
                  </div>
                  {!editingCode && (
                    <button
                      onClick={() => {
                        setCustomCode(stats.referralCode);
                        setEditingCode(true);
                      }}
                      className="text-xs flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Customize Code
                    </button>
                  )}
                </div>

                {editingCode ? (
                  <form onSubmit={handleSaveCode} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono bg-muted px-2.5 py-2.5 rounded-xl border border-border select-none">
                        .../invite/
                      </span>
                      <input
                        value={customCode}
                        onChange={(e) => setCustomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                        placeholder="CUSTOMCODE"
                        required
                        maxLength={20}
                        minLength={3}
                        disabled={savingCode}
                        className="flex-1 min-w-0 bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setEditingCode(false)}
                        disabled={savingCode}
                        className="px-3 py-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingCode}
                        className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1"
                      >
                        {savingCode ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save"
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={referralLink}
                      className="flex-1 min-w-0 bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 truncate"
                      aria-label="Your referral link"
                    />
                    <button
                      onClick={copyLink}
                      id="copy-referral-link"
                      className={cn(
                        "shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
                        copied
                          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                          : "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/25"
                      )}
                    >
                      {copied ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground mt-2.5">
                  Share this link to earn commissions on every referred purchase.
                </p>
              </div>
              <p className="text-[10px] text-muted-foreground/60 mt-4">
                * Share your link on social media, blogs, or directly with clients.
              </p>
            </div>

            {/* Commission Structure Tiers */}
            <div className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                  </div>
                  <h2 className="font-heading font-semibold text-foreground text-base">
                    Commission Structure
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Earn fixed commission rewards based on the referred purchase value:
                </p>
                
                <div className="space-y-1.5">
                  {[
                    { range: "$100 – $500", earn: "$5.00" },
                    { range: "$500 – $1,000", earn: "$10.00" },
                    { range: "$1,000 – $2,000", earn: "$20.00" },
                    { range: "$2,000 – $3,000", earn: "$30.00" },
                    { range: "$3,000 – $4,000", earn: "$40.00" },
                    { range: "$4,000 – $5,000", earn: "$50.00" },
                    { range: "$5,000+", earn: "$100.00" },
                  ].map((tier, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs py-1 border-b border-border/40 last:border-0 hover:bg-muted/15 px-1.5 rounded transition-colors"
                    >
                      <span className="text-muted-foreground">{tier.range} order</span>
                      <span className="font-semibold text-emerald-500 font-mono">+{tier.earn}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground/60 mt-4">
                * Commissions apply only to your referred client's first service purchase.
              </p>
            </div>
          </div>

          {/* 30-day performance chart */}
          {stats.dailyStats && stats.dailyStats.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-cyan-500" />
                  </div>
                  <h2 className="font-heading font-semibold text-foreground text-base">
                    30-Day Performance
                  </h2>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6] inline-block" />
                    Clicks
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#06b6d4] inline-block" />
                    Earnings
                  </span>
                </div>
              </div>
              <MiniLineChart data={stats.dailyStats} />
            </div>
          )}

          {/* Recent commissions table */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-heading font-semibold text-foreground text-base">
                Recent Commissions
              </h2>
              <NavLink
                to="/partner/commissions"
                className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
              >
                View all →
              </NavLink>
            </div>

            {!stats.recentCommissions ||
            stats.recentCommissions.length === 0 ? (
              <div className="text-center py-16">
                <HandCoins className="w-10 h-10 text-muted-foreground/35 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  No commissions yet
                </p>
                <p className="text-muted-foreground/70 text-xs mt-1">
                  Share your referral link to get started
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="text-left px-5 py-3 text-muted-foreground text-xs font-medium uppercase tracking-wider">
                        Service
                      </th>
                      <th className="text-right px-5 py-3 text-muted-foreground text-xs font-medium uppercase tracking-wider">
                        Order
                      </th>
                      <th className="text-right px-5 py-3 text-muted-foreground text-xs font-medium uppercase tracking-wider">
                        Commission
                      </th>
                      <th className="text-center px-5 py-3 text-muted-foreground text-xs font-medium uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-right px-5 py-3 text-muted-foreground text-xs font-medium uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {stats.recentCommissions.slice(0, 10).map((c) => (
                      <tr
                        key={c.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-5 py-3.5 text-foreground font-medium truncate max-w-[180px]">
                          {c.serviceName}
                        </td>
                        <td className="px-5 py-3.5 text-muted-foreground text-right">
                          ${Number(c.orderAmount).toFixed(2)}
                        </td>
                        <td className="px-5 py-3.5 text-emerald-500 font-semibold text-right">
                          +${Number(c.commission).toFixed(2)}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          {statusBadge(c.status)}
                        </td>
                        <td className="px-5 py-3.5 text-muted-foreground text-right text-xs">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </AccountLayout>
  );
};

export default PartnerDashboard;

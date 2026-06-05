import { useState, useEffect, useCallback } from "react";
import { NavLink } from "react-router-dom";
import { usePageTitle } from "@/hooks/use-page-title";
import { useSEO } from "@/hooks/use-seo";
import { apiGet, apiPost } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useSocket } from "@/hooks/useSocket";
import AccountLayout from "@/components/account/AccountLayout";
import { ReferralTabs } from "./PartnerDashboard";
import {
  AlertCircle,
  CheckCircle2,
  Send,
  Loader2,
  History,
  CreditCard,
  Wallet,
  Building2,
  Coins,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import payoneerLogo from "@/assets/payoneer-logo.svg";
import redotpayLogo from "@/assets/redotpay-logo.svg";
import kastLogo from "@/assets/kast-logo.png";

// ─── Types ──────────────────────────────────────────────────────────────────

interface PartnerStats {
  approvedBalance: number;
}

interface PayoutRequest {
  id: string;
  amount: number;
  payoutMethod: string;
  details: any;
  adminNotes?: string;
  status: "pending" | "processing" | "completed" | "rejected";
  createdAt: string;
  processedAt?: string;
}

type PayoutMethod = "Bank Transfer" | "Payoneer" | "Crypto" | "Redotpay" | "Kast";

const PAYOUT_METHODS: PayoutMethod[] = [
  "Bank Transfer",
  "Payoneer",
  "Crypto",
  "Redotpay",
  "Kast",
];

const PayoutMethodIcon = ({ method, className }: { method: PayoutMethod; className?: string }) => {
  switch (method) {
    case "Bank Transfer":
      return <Building2 className={cn("text-muted-foreground shrink-0", className)} />;
    case "Payoneer":
      return <img src={payoneerLogo} alt="Payoneer" className={cn("rounded object-contain shrink-0", className)} />;
    case "Crypto":
      return <Coins className={cn("text-amber-500 shrink-0", className)} />;
    case "Redotpay":
      return <img src={redotpayLogo} alt="Redotpay" className={cn("rounded object-contain shrink-0", className)} />;
    case "Kast":
      return <img src={kastLogo} alt="Kast" className={cn("rounded object-contain shrink-0", className)} />;
    default:
      return <Wallet className={cn("text-muted-foreground shrink-0", className)} />;
  }
};

const calculateFeeAndMin = (method: PayoutMethod, balance: number) => {
  switch (method) {
    case "Bank Transfer":
      return { fee: 30, feeDisplay: "$30.00", minRequired: 80, isFree: false, note: "SWIFT Fee: $30.00" };
    case "Payoneer": {
      const fee = Math.max(5, balance * 0.01);
      return { fee, feeDisplay: `$${fee.toFixed(2)} (1% fee, min $5)`, minRequired: 55, isFree: false, note: "1% fee (Min Fee: $5.00)" };
    }
    case "Crypto":
      return { fee: 0, feeDisplay: "Calculated on approval", minRequired: 50, isFree: false, note: "Network & exchange fees calculated on approval" };
    case "Redotpay":
      return { fee: 0, feeDisplay: "Free", minRequired: 50, isFree: true, note: "Free" };
    case "Kast":
      return { fee: 0, feeDisplay: "Free", minRequired: 50, isFree: true, note: "Free (SSB Bank USA)" };
    default:
      return { fee: 0, feeDisplay: "Free", minRequired: 50, isFree: true, note: "" };
  }
};

// ─── Payout status badge ──────────────────────────────────────────────────────

type PayoutStatus = PayoutRequest["status"];

const PAYOUT_STATUS_STYLES: Record<PayoutStatus, string> = {
  pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  processing: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  completed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  rejected: "bg-red-500/10 text-red-500 border-red-500/20",
};

const PayoutStatusBadge = ({ status }: { status: PayoutStatus }) => (
  <span
    className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border",
      PAYOUT_STATUS_STYLES[status]
    )}
  >
    {status}
  </span>
);

// ─── Render payment details helper ────────────────────────────────────────────

const renderDetails = (details: any) => {
  if (!details) return "—";
  
  if (typeof details === "string") {
    try {
      const parsed = JSON.parse(details);
      return renderParsedDetails(parsed);
    } catch {
      return details;
    }
  }
  
  return renderParsedDetails(details);
};

const renderParsedDetails = (parsed: any) => {
  const info = parsed.paymentInfo || parsed;
  if (!info) return "—";
  
  if (info.accountHolderName) {
    return (
      <div className="space-y-0.5 text-[11px] text-muted-foreground font-mono leading-tight">
        <div>Holder: {info.accountHolderName}</div>
        <div>Bank: {info.bankName} ({info.bankCountry})</div>
        <div>IBAN: {info.iban}</div>
        <div>SWIFT: {info.swift}</div>
      </div>
    );
  }
  
  if (info.email) {
    return <span className="text-[11px] font-mono">Email: {info.email}</span>;
  }
  
  if (info.coin) {
    return (
      <div className="space-y-0.5 text-[11px] text-muted-foreground font-mono leading-tight">
        <div>Coin: {info.coin} ({info.network})</div>
        <div className="truncate">Addr: {info.walletAddress}</div>
      </div>
    );
  }
  
  if (info.redotpayId) {
    return <span className="text-[11px] font-mono">RedotPay ID: {info.redotpayId}</span>;
  }
  
  if (info.kastUsername) {
    return <span className="text-[11px] font-mono">Kast Username: {info.kastUsername}</span>;
  }

  if (typeof info === "object") {
    return <span className="text-[11px] font-mono truncate">{JSON.stringify(info)}</span>;
  }
  
  return <span className="text-[11px] font-mono">{String(info)}</span>;
};

// ─── Main component ───────────────────────────────────────────────────────────

const PartnerPayouts = () => {
  usePageTitle("Referral Program");
  useSEO({ title: "Referral Program - Payouts", noIndex: true });

  const { user } = useAuth();
  const { socket } = useSocket();

  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [history, setHistory] = useState<PayoutRequest[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Form state
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>("Bank Transfer");
  const [formDetails, setFormDetails] = useState<Record<string, string>>({
    bankAccountHolder: "",
    bankName: "",
    bankCountry: "",
    bankIban: "",
    bankSwift: "",
    payoneerEmail: "",
    cryptoCoin: "USDT",
    cryptoNetwork: "TRC-20",
    cryptoAddress: "",
    redotpayId: "",
    kastUsername: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const updateField = (key: string, value: string) => {
    setFormDetails((prev) => ({ ...prev, [key]: value }));
  };

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    setStatsError(null);
    try {
      const data = await apiGet<any>("/referrals/partner/stats");
      setStats({
        approvedBalance: Number(data?.summary?.approvedBalance ?? 0),
      });
    } catch (e: any) {
      if (e?.message === "Partner profile not found") {
        window.location.href = "/partner"; // Redirect to join screen
        return;
      }
      setStatsError(e?.message ?? "Failed to load balance");
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const data = await apiGet<any[]>(
        "/referrals/partner/payout-requests"
      );
      const mapped = (data ?? []).map((p: any) => {
        let adminNotes = "";
        if (p.details && typeof p.details === "object") {
          adminNotes = p.details.adminNotes || "";
        } else if (p.details && typeof p.details === "string") {
          try {
            const parsed = JSON.parse(p.details);
            adminNotes = parsed.adminNotes || "";
          } catch {}
        }

        return {
          id: p.id,
          amount: Number(p.amount),
          payoutMethod: p.payout_method,
          details: p.details,
          adminNotes,
          status: p.status,
          createdAt: p.created_at,
          processedAt: p.paid_at,
        };
      });
      setHistory(mapped);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadHistory();
  }, [loadStats, loadHistory]);

  useEffect(() => {
    const handleReferralUpdated = (data: any) => {
      console.log("[PartnerPayouts] Real-time referral update received:", data);
      if (data?.userId === user?.id || !data?.userId) {
        loadStats();
        loadHistory();
      }
    };

    socket.on("referral-updated", handleReferralUpdated);

    return () => {
      socket.off("referral-updated", handleReferralUpdated);
    };
  }, [socket, user, loadStats, loadHistory]);

  const availableBalance = stats?.approvedBalance ?? 0;
  const { fee, feeDisplay, minRequired, isFree, note } = calculateFeeAndMin(payoutMethod, availableBalance);
  const netPayoutAmount = Math.max(0, availableBalance - fee);
  const hasAdequateBalance = availableBalance >= minRequired;
  const canRequest = hasAdequateBalance && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stats || stats.approvedBalance <= 0) {
      toast({
        title: "No approved balance",
        description: "You need an approved balance to request a payout.",
        variant: "destructive",
      });
      return;
    }

    if (!hasAdequateBalance) {
      toast({
        title: "Insufficient balance",
        description: `Minimum payout of $50.00 after fees is required. You need at least $${minRequired.toFixed(2)} approved balance for this method.`,
        variant: "destructive",
      });
      return;
    }

    let info: any = {};
    if (payoutMethod === "Bank Transfer") {
      info = {
        accountHolderName: formDetails.bankAccountHolder,
        bankName: formDetails.bankName,
        bankCountry: formDetails.bankCountry,
        iban: formDetails.bankIban,
        swift: formDetails.bankSwift,
      };
    } else if (payoutMethod === "Payoneer") {
      info = {
        email: formDetails.payoneerEmail,
      };
    } else if (payoutMethod === "Crypto") {
      info = {
        coin: formDetails.cryptoCoin,
        network: formDetails.cryptoNetwork,
        walletAddress: formDetails.cryptoAddress,
      };
    } else if (payoutMethod === "Redotpay") {
      info = {
        redotpayId: formDetails.redotpayId,
      };
    } else if (payoutMethod === "Kast") {
      info = {
        kastUsername: formDetails.kastUsername,
      };
    }

    const payload = {
      paymentInfo: info,
      fee: payoutMethod === "Crypto" ? 0 : fee,
      feeDisplay,
      netAmountEstimates: payoutMethod === "Crypto" ? "Calculated on approval" : netPayoutAmount.toFixed(2),
    };

    setSubmitting(true);
    setSubmitSuccess(false);
    try {
      await apiPost("/referrals/partner/payout-request", {
        payoutMethod,
        details: payload,
      });
      toast({
        title: "Payout requested! 🎉",
        description: "Your payout request has been submitted and is under review.",
      });
      
      // Reset form fields
      setFormDetails({
        bankAccountHolder: "",
        bankName: "",
        bankCountry: "",
        bankIban: "",
        bankSwift: "",
        payoneerEmail: "",
        cryptoCoin: "USDT",
        cryptoNetwork: "TRC-20",
        cryptoAddress: "",
        redotpayId: "",
        kastUsername: "",
      });

      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 4000);
      await Promise.all([loadStats(), loadHistory()]);
    } catch (e: any) {
      toast({
        title: "Request failed",
        description: e?.message ?? "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AccountLayout
      title="Referral Program"
      description="Request a withdrawal of your approved commission balance."
    >
      <ReferralTabs />

      <div className="grid md:grid-cols-5 gap-6">
        {/* Left: balance + form */}
        <div className="md:col-span-3 space-y-5">
          {/* Available balance card */}
          <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 to-primary/5 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium">
                  Available for Withdrawal
                </p>
                {loadingStats ? (
                  <Skeleton className="h-8 w-28 mt-1" />
                ) : statsError ? (
                  <p className="text-destructive text-sm mt-1">{statsError}</p>
                ) : (
                  <p className="text-3xl font-bold font-heading text-foreground mt-0.5">
                    ${availableBalance.toFixed(2)}
                  </p>
                )}
              </div>
            </div>

            {!loadingStats && availableBalance === 0 && !statsError && (
              <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-amber-600 dark:text-amber-400 text-xs leading-relaxed">
                  You have no approved balance yet. Commissions move from
                  <strong className="font-semibold text-amber-500"> pending</strong> to
                  <strong className="font-semibold text-amber-500"> approved</strong>{" "}
                  after the referred order completes its hold period.
                </p>
              </div>
            )}
          </div>

          {/* Payout request form */}
          <div className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-primary" />
              </div>
              <h2 className="font-heading font-semibold text-foreground text-base">
                Request Payout
              </h2>
            </div>

            {/* Success banner */}
            {submitSuccess && (
              <div className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 mb-5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <p className="text-emerald-500 text-sm font-medium">
                  Payout request submitted successfully!
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Payout method */}
              <div>
                <label
                  className="block text-xs font-semibold text-muted-foreground mb-2.5 uppercase tracking-wide"
                >
                  Payout Method
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PAYOUT_METHODS.map((method) => {
                    const isFreeOption = method === "Redotpay" || method === "Kast";
                    const isSelected = payoutMethod === method;
                    return (
                      <button
                        key={method}
                        type="button"
                        id={`payout-method-${method.toLowerCase().replace(/\s+/g, "-")}`}
                        onClick={() => setPayoutMethod(method)}
                        className={cn(
                          "flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200",
                          isSelected
                            ? "bg-primary/10 border-primary/40 text-primary shadow-sm shadow-primary/5"
                            : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 hover:border-muted-foreground/30"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <PayoutMethodIcon method={method} className="w-5 h-5" />
                          <span className="truncate">
                            {method === "Kast" ? "Kast (SSB USA)" : method}
                          </span>
                        </div>
                        {isFreeOption && (
                          <span className={cn(
                            "text-[9px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded border ml-2",
                            isSelected
                              ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/30"
                              : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          )}>
                            Free
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic input fields based on payment method */}
              <div className="p-4 rounded-xl border border-border bg-secondary/15 space-y-4">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                  {payoutMethod === "Kast" ? "Kast (SSB Bank USA)" : payoutMethod} Details
                </h3>

                {payoutMethod === "Bank Transfer" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Account Holder Name</label>
                      <input
                        required
                        value={formDetails.bankAccountHolder}
                        onChange={(e) => updateField("bankAccountHolder", e.target.value)}
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Bank Name</label>
                      <input
                        required
                        value={formDetails.bankName}
                        onChange={(e) => updateField("bankName", e.target.value)}
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Bank Country</label>
                      <input
                        required
                        value={formDetails.bankCountry}
                        onChange={(e) => updateField("bankCountry", e.target.value)}
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">IBAN / Account Number</label>
                      <input
                        required
                        value={formDetails.bankIban}
                        onChange={(e) => updateField("bankIban", e.target.value)}
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">SWIFT / BIC Code</label>
                      <input
                        required
                        value={formDetails.bankSwift}
                        onChange={(e) => updateField("bankSwift", e.target.value)}
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {payoutMethod === "Payoneer" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Payoneer Email Address</label>
                    <input
                      type="email"
                      required
                      value={formDetails.payoneerEmail}
                      onChange={(e) => updateField("payoneerEmail", e.target.value)}
                      placeholder="e.g. your-email@example.com"
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none"
                    />
                  </div>
                )}

                {payoutMethod === "Crypto" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Crypto Coin</label>
                      <select
                        value={formDetails.cryptoCoin}
                        onChange={(e) => updateField("cryptoCoin", e.target.value)}
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none"
                      >
                        <option value="USDT">USDT</option>
                        <option value="USDC">USDC</option>
                        <option value="BTC">BTC</option>
                        <option value="ETH">ETH</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Network</label>
                      <select
                        value={formDetails.cryptoNetwork}
                        onChange={(e) => updateField("cryptoNetwork", e.target.value)}
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none"
                      >
                        <option value="TRC-20">TRC-20 (Tron)</option>
                        <option value="ERC-20">ERC-20 (Ethereum)</option>
                        <option value="BEP-20">BEP-20 (BSC)</option>
                        <option value="SOL">Solana</option>
                      </select>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Wallet Address</label>
                      <input
                        required
                        value={formDetails.cryptoAddress}
                        onChange={(e) => updateField("cryptoAddress", e.target.value)}
                        placeholder="e.g. Wallet address"
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                )}

                {payoutMethod === "Redotpay" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Redotpay Account (Email, Phone or ID)</label>
                    <input
                      required
                      value={formDetails.redotpayId}
                      onChange={(e) => updateField("redotpayId", e.target.value)}
                      placeholder="e.g. your-email@example.com or RedotPay ID"
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none"
                    />
                  </div>
                )}

                {payoutMethod === "Kast" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Kast Username or Account Email</label>
                    <input
                      required
                      value={formDetails.kastUsername}
                      onChange={(e) => updateField("kastUsername", e.target.value)}
                      placeholder="e.g. username"
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Payout Summary */}
              <div className="rounded-xl border border-border bg-secondary/35 p-4 space-y-2.5 text-sm">
                <h3 className="font-heading font-semibold text-xs uppercase tracking-wider text-muted-foreground">Payout Summary</h3>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available Balance:</span>
                  <span className="font-semibold text-foreground">${availableBalance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Method Payout Fee:</span>
                  <span className={cn("font-semibold", isFree ? "text-emerald-500 font-bold" : "text-foreground")}>{feeDisplay}</span>
                </div>
                <div className="border-t border-border/60 my-1 pt-2 flex justify-between font-heading font-bold text-base">
                  <span className="text-foreground">Estimated Net Payout:</span>
                  <span className={cn(hasAdequateBalance ? "text-emerald-500" : "text-destructive")}>
                    {payoutMethod === "Crypto" ? "—" : `$${netPayoutAmount.toFixed(2)}`}
                  </span>
                </div>
                {payoutMethod === "Crypto" && (
                  <p className="text-[10px] text-muted-foreground/80 leading-normal">
                    * Note: Crypto payout fees are calculated upon approval and deducted from the final sent amount.
                  </p>
                )}
              </div>

              {/* Insufficient balance message */}
              {!loadingStats && !hasAdequateBalance && (
                <div className="flex items-start gap-2.5 bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 text-xs">
                  <AlertCircle className="w-4.5 h-4.5 text-destructive mt-0.5 shrink-0" />
                  <p className="text-destructive font-medium leading-relaxed">
                    Minimum payout amount of $50.00 after fees is required. 
                    You currently have ${availableBalance.toFixed(2)} approved balance, but you need at least ${minRequired.toFixed(2)} to request a payout via {payoutMethod === "Kast" ? "Kast (SSB USA)" : payoutMethod} ({note}).
                  </p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                id="submit-payout-request"
                disabled={!canRequest || loadingStats}
                className={cn(
                  "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm",
                  canRequest && !loadingStats
                    ? "bg-primary text-primary-foreground hover:scale-[1.01] active:scale-[0.99]"
                    : "bg-muted text-muted-foreground/50 cursor-not-allowed border border-border"
                )}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Request Payout
                    {hasAdequateBalance && (
                      <span className="ml-1 opacity-80">
                        (${availableBalance.toFixed(2)})
                      </span>
                    )}
                  </>
                )}
              </button>

              {!hasAdequateBalance && !loadingStats && !submitting && (
                <p className="text-center text-muted-foreground text-xs">
                  You need an approved balance meeting the minimum threshold to request a payout.
                </p>
              )}
            </form>
          </div>
        </div>

        {/* Right: payout history */}
        <div className="md:col-span-2">
          <div className="rounded-2xl border border-border bg-card overflow-hidden h-full shadow-sm">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <History className="w-4 h-4 text-muted-foreground/60" />
              <h2 className="font-heading font-semibold text-foreground text-base">
                Payout History
              </h2>
            </div>

            {loadingHistory ? (
              <div className="p-5 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-xl bg-muted/30" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center mb-3">
                  <History className="w-6 h-6 text-muted-foreground/35" />
                </div>
                <p className="text-muted-foreground text-sm font-medium">No payout requests yet</p>
                <p className="text-muted-foreground/75 text-xs mt-1">
                  Your payout history will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {history.map((p) => (
                  <div
                    key={p.id}
                    className="px-5 py-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <PayoutMethodIcon method={p.payoutMethod as PayoutMethod} className="w-4 h-4" />
                        <span className="text-foreground/80 text-sm font-medium truncate">
                          {p.payoutMethod === "Kast" ? "Kast (SSB USA)" : p.payoutMethod}
                        </span>
                      </div>
                      <PayoutStatusBadge status={p.status} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-500 font-bold font-heading text-lg">
                        ${Number(p.amount).toFixed(2)}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {new Date(p.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    
                    <div className="mt-2.5 pt-2 border-t border-border/40 space-y-2">
                      <div>
                        <div className="text-[10px] text-muted-foreground font-semibold mb-1 uppercase tracking-wider">Payment Details:</div>
                        {renderDetails(p.details)}
                      </div>
                      
                      {/* Admin notes */}
                      {p.adminNotes && (
                        <div className="mt-2 p-2.5 rounded-xl bg-primary/5 border border-primary/10 text-xs">
                          <span className="font-semibold text-primary block mb-0.5">Admin Note:</span>
                          <p className="text-foreground/90 leading-relaxed font-sans">{p.adminNotes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AccountLayout>
  );
};

export default PartnerPayouts;

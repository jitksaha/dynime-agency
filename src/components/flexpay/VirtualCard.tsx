import { useState } from "react";
import { Eye, EyeOff, Copy, Snowflake, Sparkles, ShieldCheck, Wifi, Check, Lock, Zap, Globe, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { db } from "@/integrations/db/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import dynimeIcon from "@/assets/dynime-icon-dark.svg";

export type VirtualCardRow = {
  id: string;
  cardholder_name: string;
  card_number: string;
  last4: string;
  cvv: string;
  exp_month: number;
  exp_year: number;
  status: string;
  theme: string;
  tier: string;
};

const groupNumber = (n: string) => n.replace(/(.{4})/g, "$1 ").trim();

export const VirtualCard = ({
  card,
  available,
  used,
  currency = "USD",
  onUpdate,
  onRepay,
}: {
  card: VirtualCardRow;
  available: number;
  used: number;
  currency?: string;
  onUpdate?: () => void;
  onRepay?: () => void;
}) => {
  const [flipped, setFlipped] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);

  const frozen = card.status === "frozen";
  const total = available + used;
  const utilization = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;

  const masked = `•••• •••• •••• ${card.last4}`;
  const fmtMoney = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
  const expShort = `${String(card.exp_month).padStart(2, "0")}/${String(card.exp_year).slice(-2)}`;

  const handleReveal = async () => {
    if (!revealed) {
      await db.rpc("flexpay_log_cvv_view", { _card_id: card.id });
    }
    setRevealed((v) => !v);
  };

  const copy = async (txt: string, label: string) => {
    try {
      await navigator.clipboard.writeText(txt.replace(/\s/g, ""));
      toast.success(`${label} copied`);
    } catch {
      toast.error("Could not copy");
    }
  };

  const toggleFreeze = async () => {
    setBusy(true);
    const { error } = await db.rpc("flexpay_set_card_freeze", {
      _card_id: card.id,
      _freeze: !frozen,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(frozen ? "Card unfrozen" : "Card frozen");
    onUpdate?.();
  };

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)] gap-6 lg:gap-8 items-stretch">
      {/* LEFT — Card + caption */}
      <div className="w-full flex flex-col">
      <div
        className="relative w-full max-w-[460px] mx-auto aspect-[1.586/1] [perspective:1400px] cursor-pointer"
        onClick={() => setFlipped((v) => !v)}
        role="button"
        aria-label="Flip virtual card"
      >
        <div
          className={cn(
            "absolute inset-0 transition-transform duration-700 [transform-style:preserve-3d]",
            flipped && "[transform:rotateY(180deg)]",
          )}
        >
          {/* FRONT — minimalist white with watermark logo */}
          <div className="absolute inset-0 rounded-2xl overflow-hidden bg-white text-neutral-900 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25),0_4px_12px_-4px_rgba(0,0,0,0.1)] ring-1 ring-black/5 [backface-visibility:hidden]">
            {/* watermark logo */}
            <img
              src={dynimeIcon}
              alt=""
              aria-hidden
              className="absolute -right-6 -top-4 w-[58%] h-[120%] object-contain opacity-90 select-none pointer-events-none"
              draggable={false}
            />
            {/* flowing wave lines */}
            <svg
              className="absolute inset-0 w-full h-full opacity-[0.18] pointer-events-none"
              viewBox="0 0 460 290"
              preserveAspectRatio="none"
              aria-hidden
            >
              {Array.from({ length: 14 }).map((_, i) => (
                <path
                  key={i}
                  d={`M0 ${120 + i * 6} C 120 ${100 + i * 5}, 240 ${160 + i * 4}, 460 ${110 + i * 6}`}
                  stroke="currentColor"
                  strokeWidth="0.6"
                  fill="none"
                />
              ))}
            </svg>

            <div className="relative h-full p-3.5 sm:p-5 md:p-6 flex flex-col">
              {/* Top: brand */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
                  <img src={dynimeIcon} alt="Dynime" className="w-5 h-5 sm:w-7 sm:h-7 shrink-0" />
                  <div className="leading-tight min-w-0">
                    <div className="font-heading text-sm sm:text-lg font-bold tracking-tight">dynime</div>
                    <div className="text-[7px] sm:text-[8px] uppercase tracking-[0.12em] sm:tracking-[0.15em] text-neutral-500 -mt-0.5 whitespace-nowrap">
                      complete business os
                    </div>
                  </div>
                  <div className="mx-1.5 sm:mx-2.5 h-5 sm:h-7 w-px bg-neutral-300 shrink-0" />
                  <div className="leading-tight min-w-0">
                    <div className="font-heading text-xs sm:text-base font-semibold">FlexPay</div>
                    <div className="text-[7px] sm:text-[9px] uppercase tracking-[0.15em] sm:tracking-[0.2em] text-neutral-500 whitespace-nowrap">
                      Virtual Card
                    </div>
                  </div>
                </div>
                {frozen && (
                  <Badge variant="secondary" className="bg-neutral-900 text-white border-0 text-[9px] sm:text-[10px] shrink-0">
                    <Snowflake className="w-3 h-3 mr-1" />Frozen
                  </Badge>
                )}
              </div>

              {/* Chip + contactless */}
              <div className="mt-2 sm:mt-3 flex items-center gap-2 sm:gap-3">
                <div className="relative w-7 h-5 sm:w-10 sm:h-7 rounded-[4px] sm:rounded-[5px] bg-gradient-to-br from-neutral-300 via-neutral-200 to-neutral-400 shadow-inner overflow-hidden">
                  <div className="absolute inset-1 grid grid-cols-3 grid-rows-3 gap-[1px] sm:gap-[1.5px]">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div key={i} className="bg-neutral-400/60 rounded-[1px]" />
                    ))}
                  </div>
                </div>
                <Wifi className="w-3 h-3 sm:w-4 sm:h-4 text-neutral-700 rotate-90" />
              </div>

              {/* Number */}
              <div className="mt-1.5 sm:mt-2 font-mono text-[13px] sm:text-[20px] md:text-[22px] tracking-[0.08em] sm:tracking-[0.12em] font-semibold text-neutral-900 whitespace-nowrap">
                {revealed ? groupNumber(card.card_number) : masked}
              </div>

              {/* Bottom row */}
              <div className="mt-auto flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[7px] sm:text-[8px] uppercase tracking-[0.18em] sm:tracking-[0.2em] text-neutral-500 font-semibold">
                    Cardholder
                  </div>
                  <div className="text-[11px] sm:text-sm font-semibold uppercase tracking-wide mt-0.5 truncate">
                    {card.cardholder_name}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 text-right shrink-0">
                  <div className="leading-tight">
                    <div className="text-[7px] sm:text-[8px] uppercase tracking-[0.15em] sm:tracking-[0.18em] text-neutral-500 font-semibold">
                      Valid<br />Thru
                    </div>
                  </div>
                  <div className="font-mono text-xs sm:text-base font-semibold">{expShort}</div>
                </div>
                <div className="text-right shrink-0 hidden sm:block">
                  <div className="text-[8px] uppercase tracking-[0.18em] text-neutral-500 font-semibold">
                    Powered by
                  </div>
                  <div className="text-[10px] font-bold tracking-wide">Dynime LLC.</div>
                </div>
              </div>
            </div>
          </div>

          {/* BACK — white with magstripe + signature + CVV + perks */}
          <div className="absolute inset-0 rounded-2xl overflow-hidden bg-white text-neutral-900 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25),0_4px_12px_-4px_rgba(0,0,0,0.1)] ring-1 ring-black/5 [transform:rotateY(180deg)] [backface-visibility:hidden]">
            <div className="px-5 md:px-6 pt-4 flex items-center justify-between text-[10px]">
              <span className="text-neutral-600">
                This card is issued by <span className="font-semibold">Dynime FlexPay.</span>
              </span>
              <span className="text-neutral-600">
                Support: <span className="font-semibold">dynime.com/help</span>
              </span>
            </div>
            <div className="h-8 md:h-10 bg-neutral-900 mt-3" />

            <div className="px-5 md:px-6 mt-3 flex items-start gap-3">
              {/* signature */}
              <div className="flex-1">
                <div className="text-[7.5px] uppercase tracking-[0.18em] text-neutral-500 font-semibold">
                  Authorized Signature
                </div>
                <div className="relative mt-1 h-8 rounded-md bg-neutral-50 border border-neutral-200 overflow-hidden">
                  <div
                    className="absolute inset-0 opacity-40"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(135deg,transparent 0 6px,rgba(0,0,0,0.06) 6px 7px)",
                    }}
                  />
                  <img src={dynimeIcon} alt="" className="absolute right-1.5 top-1 w-5 h-5 opacity-80" />
                </div>
              </div>
              {/* CVV */}
              <div className="w-[88px]">
                <div className="text-[7.5px] uppercase tracking-[0.18em] text-neutral-500 font-semibold">
                  CVV
                </div>
                <div className="mt-1 h-8 rounded-md border border-neutral-300 bg-white flex items-center justify-center font-mono text-base tracking-[0.18em] font-semibold">
                  {revealed ? card.cvv : "•".repeat(card.cvv.length)}
                </div>
              </div>
            </div>

            {/* perks */}
            <div className="px-5 md:px-6 mt-3 grid grid-cols-4 gap-1.5 text-center">
              <Perk icon={<ShieldCheck className="w-3.5 h-3.5" />} title="SECURE" sub="Bank-grade" />
              <Perk icon={<Lock className="w-3.5 h-3.5" />} title="PRIVATE" sub="Your card" />
              <Perk icon={<Zap className="w-3.5 h-3.5" />} title="INSTANT" sub="Real-time" />
              <Perk icon={<Globe className="w-3.5 h-3.5" />} title="EXCLUSIVE" sub="Dynime only" />
            </div>

            <div className="px-5 md:px-6 mt-2 flex items-center gap-2 text-[8.5px] text-neutral-600">
              <img src={dynimeIcon} alt="" className="w-4 h-4 rounded-sm bg-neutral-900 p-0.5" />
              <span className="leading-snug">
                Only valid for purchasing services on <span className="font-semibold">dynime.com</span>. Not for ATM withdrawals or physical POS.
              </span>
            </div>
          </div>
        </div>
      </div>

        {/* Caption under card (left column) */}
        <p className="text-[11px] text-center text-muted-foreground mt-4 flex items-center justify-center gap-1.5 max-w-[460px] mx-auto">
          <Sparkles className="w-3 h-3" />
          Tap the card to flip · {revealed ? <span className="inline-flex items-center"><Check className="w-3 h-3 mr-0.5" /> Sensitive details revealed</span> : "CVV stays hidden until you reveal"}
        </p>
      </div>

      {/* RIGHT — Controls + Limits (premium panel, fills card height) */}
      <div className="w-full h-full flex flex-col gap-3">
        {/* Card controls */}
        <div className="flex-1 rounded-2xl border border-neutral-200/80 bg-gradient-to-br from-white to-neutral-50 px-4 py-5 sm:py-6 lg:px-5 lg:py-7 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[11px] uppercase tracking-[0.18em] text-neutral-500 font-bold">
              Card controls
            </h4>
            <span className="text-[10px] text-neutral-400 capitalize">{card.tier} tier</span>
          </div>
          <div className="grid grid-cols-2 gap-2 flex-1 content-start">
            <Button size="sm" variant="outline" onClick={() => setFlipped((v) => !v)} className="justify-start h-11 sm:h-12 bg-white px-2 sm:px-3 py-2 text-[11px] sm:text-sm">
              <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 shrink-0" /> <span className="truncate">{flipped ? "Show front" : "Flip card"}</span>
            </Button>
            <Button size="sm" variant="outline" onClick={handleReveal} className="justify-start h-11 sm:h-12 bg-white px-2 sm:px-3 py-2 text-[11px] sm:text-sm">
              {revealed ? <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 shrink-0" /> : <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 shrink-0" />}
              <span className="truncate">{revealed ? "Hide details" : "Reveal card"}</span>
            </Button>
            <Button size="sm" variant="outline" onClick={() => copy(card.card_number, "Card number")} disabled={!revealed} className="justify-start h-11 sm:h-12 bg-white px-2 sm:px-3 py-2 text-[11px] sm:text-sm">
              <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 shrink-0" /> <span className="truncate">Copy number</span>
            </Button>
            <Button size="sm" variant={frozen ? "default" : "outline"} onClick={toggleFreeze} disabled={busy} className="justify-start h-11 sm:h-12 bg-white data-[variant=default]:bg-neutral-900 px-2 sm:px-3 py-2 text-[11px] sm:text-sm">
              <Snowflake className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 shrink-0" /> <span className="truncate">{frozen ? "Unfreeze" : "Freeze"}</span>
            </Button>
          </div>
        </div>

        {/* Credit limit */}
        <div className={cn(
          "flex-1 rounded-2xl border bg-gradient-to-br from-white to-neutral-50 px-4 py-5 sm:py-6 lg:px-5 lg:py-7 shadow-sm flex flex-col transition-colors",
          utilization >= 100 ? "border-destructive/60 bg-destructive/5"
            : utilization >= 90 ? "border-amber-400/70 bg-amber-50/60"
            : "border-neutral-200/80"
        )}>
          <div className="flex items-center justify-between mb-3 gap-2">
            <h4 className="text-[11px] uppercase tracking-[0.18em] text-neutral-500 font-bold">
              Credit limit
            </h4>
            <div className="flex items-center gap-2">
              {utilization >= 100 && (
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">Limit reached</span>
              )}
              {utilization >= 90 && utilization < 100 && (
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">Almost full</span>
              )}
              <span className={cn(
                "text-[10px] font-mono",
                utilization >= 100 ? "text-destructive font-bold"
                  : utilization >= 90 ? "text-amber-700 font-bold"
                  : "text-neutral-500"
              )}>{utilization}% used</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 flex-1 min-w-0">
            <PremiumStat label="Available" value={fmtMoney(available)} accent={utilization < 90} danger={utilization >= 100} />
            <PremiumStat label="Used" value={fmtMoney(used)} />
            <PremiumStat label="Utilization" value={`${utilization}%`} danger={utilization >= 100} />
          </div>
          <div className="mt-3 h-1.5 w-full rounded-full bg-neutral-200 overflow-hidden">
            <div
              className={cn(
                "h-full transition-all",
                utilization >= 100 ? "bg-destructive"
                  : utilization >= 90 ? "bg-amber-500"
                  : "bg-gradient-to-r from-primary to-primary/70"
              )}
              style={{ width: `${utilization}%` }}
            />
          </div>
          {utilization >= 90 && (
            <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
              <p className={cn(
                "text-[11px] leading-tight flex-1 min-w-[140px]",
                utilization >= 100 ? "text-destructive font-medium" : "text-amber-800"
              )}>
                {utilization >= 100
                  ? "Limit reached — new purchases are blocked. Repay to continue."
                  : "Approaching your limit. Consider repaying soon."}
              </p>
              {onRepay && (
                <Button
                  size="sm"
                  onClick={onRepay}
                  variant={utilization >= 100 ? "default" : "outline"}
                  className={cn(
                    "h-8 text-xs",
                    utilization >= 100 && "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  )}
                >
                  Repay now
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Perk = ({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) => (
  <div className="flex flex-col items-center gap-0.5">
    <div className="text-neutral-900">{icon}</div>
    <div className="text-[8px] font-bold tracking-wider">{title}</div>
    <div className="text-[7.5px] text-neutral-500 leading-tight">{sub}</div>
  </div>
);

const Stat = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
  <div className="rounded-lg border bg-card p-2.5">
    <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className={cn("text-sm font-bold mt-0.5", accent && "text-primary")}>{value}</div>
  </div>
);

const PremiumStat = ({ label, value, accent, danger }: { label: string; value: string; accent?: boolean; danger?: boolean }) => (
  <div className={cn(
    "rounded-xl border bg-white p-2 sm:p-3 flex flex-col justify-center min-w-0",
    danger ? "border-destructive/40" : "border-neutral-200"
  )}>
    <div className="text-[8px] sm:text-[9px] uppercase tracking-[0.12em] sm:tracking-[0.15em] text-neutral-500 font-semibold truncate">{label}</div>
    <div className={cn(
      "text-[11px] sm:text-base lg:text-lg font-bold mt-0.5 sm:mt-1 tracking-tight truncate",
      danger ? "text-destructive" : accent ? "text-primary" : "text-neutral-900"
    )}>{value}</div>
  </div>
);

export default VirtualCard;

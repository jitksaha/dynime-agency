import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, Clock, ShieldQuestion, ShieldX, ShieldOff } from "lucide-react";
import { cn } from "@/lib/utils";

export type VerificationStatus =
  | "not_started" | "not_submitted" | "pending" | "in_review"
  | "verified" | "rejected" | "expired" | string;

const map: Record<string, { label: string; icon: any; cls: string }> = {
  not_started:   { label: "Not Started",   icon: ShieldOff,      cls: "bg-muted text-muted-foreground border-border" },
  not_submitted: { label: "Not Submitted", icon: ShieldOff,      cls: "bg-muted text-muted-foreground border-border" },
  pending:       { label: "Pending",       icon: Clock,          cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30" },
  in_review:     { label: "In Review",     icon: ShieldQuestion, cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30" },
  verified:      { label: "Verified",      icon: ShieldCheck,    cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
  rejected:      { label: "Rejected",      icon: ShieldX,        cls: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30" },
  expired:       { label: "Expired",       icon: ShieldAlert,    cls: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30" },
};

export const VerificationBadge = ({
  status, className, showIcon = true,
}: { status?: VerificationStatus | null; className?: string; showIcon?: boolean }) => {
  const key = (status || "not_started").toLowerCase();
  const cfg = map[key] || map.pending;
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={cn("gap-1.5 font-medium", cfg.cls, className)}>
      {showIcon && <Icon className="h-3.5 w-3.5" />}
      {cfg.label}
    </Badge>
  );
};

export default VerificationBadge;

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarClock, CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

export type BookingStatus = "pending" | "confirmed" | "cancelled";

export type BookingInfo = {
  date?: string;
  time?: string;
  timezone?: string;
  iso?: string;
  status?: BookingStatus;
  confirmed_at?: string;
  cancelled_at?: string;
  notes?: string;
};

const STATUS_META: Record<BookingStatus, { label: string; tone: string; Icon: any }> = {
  pending: { label: "Pending confirmation", tone: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30", Icon: Clock },
  confirmed: { label: "Confirmed", tone: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30", Icon: CheckCircle2 },
  cancelled: { label: "Cancelled", tone: "bg-destructive/10 text-destructive border-destructive/30", Icon: XCircle },
};

export const getBookingStatus = (b: BookingInfo | null | undefined): BookingStatus =>
  (b?.status as BookingStatus) || "pending";

interface Props {
  orderId: string;
  serviceBrief: any;
  /** When true, shows admin controls to update booking status. */
  editable?: boolean;
  onUpdated?: () => void;
  className?: string;
  compact?: boolean;
}

const BookingStatusCard = ({ orderId, serviceBrief, editable = false, onUpdated, className = "", compact = false }: Props) => {
  const booking: BookingInfo | null = serviceBrief?.booking || null;
  const [saving, setSaving] = useState(false);

  if (!booking || (!booking.date && !booking.iso)) return null;

  const status = getBookingStatus(booking);
  const meta = STATUS_META[status];
  const Icon = meta.Icon;

  let dateLabel = "—";
  let timeLabel = booking.time || "";
  try {
    if (booking.iso) {
      const d = parseISO(booking.iso);
      dateLabel = format(d, "EEE, MMM d, yyyy");
      if (!timeLabel) timeLabel = format(d, "HH:mm");
    } else if (booking.date) {
      dateLabel = format(parseISO(booking.date), "EEE, MMM d, yyyy");
    }
  } catch {
    dateLabel = booking.date || "—";
  }

  const updateStatus = async (next: BookingStatus) => {
    setSaving(true);
    try {
      const nextBrief = {
        ...(serviceBrief || {}),
        booking: {
          ...booking,
          status: next,
          ...(next === "confirmed" ? { confirmed_at: new Date().toISOString() } : {}),
          ...(next === "cancelled" ? { cancelled_at: new Date().toISOString() } : {}),
        },
      };
      const { error } = await supabase
        .from("orders")
        .update({ service_brief: nextBrief })
        .eq("id", orderId);
      if (error) throw error;
      toast.success(`Booking marked as ${next}`);
      onUpdated?.();
    } catch (err: any) {
      toast.error(err?.message || "Could not update booking");
    } finally {
      setSaving(false);
    }
  };

  if (compact) {
    return (
      <Badge variant="outline" className={`${meta.tone} ${className}`}>
        <Icon className="w-3 h-3 mr-1" /> Booking · {meta.label}
      </Badge>
    );
  }

  return (
    <div className={`rounded-xl border-2 border-primary/20 bg-primary/5 p-4 space-y-3 ${className}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-primary" />
          <h3 className="font-heading font-semibold text-sm">Consultation booking</h3>
        </div>
        <Badge variant="outline" className={meta.tone}>
          <Icon className="w-3 h-3 mr-1" /> {meta.label}
        </Badge>
      </div>
      <div className="grid sm:grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Date</p>
          <p className="font-medium">{dateLabel}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Time</p>
          <p className="font-medium">{timeLabel || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Timezone</p>
          <p className="font-medium">{booking.timezone || "—"}</p>
        </div>
      </div>
      {booking.confirmed_at && status === "confirmed" && (
        <p className="text-xs text-muted-foreground">Confirmed {format(new Date(booking.confirmed_at), "MMM d, yyyy h:mm a")}</p>
      )}
      {booking.cancelled_at && status === "cancelled" && (
        <p className="text-xs text-muted-foreground">Cancelled {format(new Date(booking.cancelled_at), "MMM d, yyyy h:mm a")}</p>
      )}
      {editable && (
        <div className="flex items-center gap-2 pt-1">
          <Select value={status} onValueChange={(v) => updateStatus(v as BookingStatus)} disabled={saving}>
            <SelectTrigger className="h-9 w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          {saving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          {status === "pending" && !saving && (
            <Button size="sm" variant="outline" onClick={() => updateStatus("confirmed")}>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Confirm
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default BookingStatusCard;

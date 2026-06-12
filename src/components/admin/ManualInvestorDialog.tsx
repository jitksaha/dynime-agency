import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/db/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, UserPlus, Copy, Check } from "lucide-react";

type Plan = {
  id: string;
  slug: string;
  name: string;
  currency: string;
  roi_percent: number | null;
  payout_frequency: string | null;
  lock_period_days: number | null;
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: () => void;
}

const ManualInvestorDialog = ({ open, onOpenChange, onCreated }: Props) => {
  const [submitting, setSubmitting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    email: "",
    full_name: "",
    phone: "",
    country: "",
    plan_id: "",
    amount: "",
    currency: "USD",
    monthly_return_percent: "",
    bonus_percent_biannual: "",
    lock_period_months: "",
    payout_frequency: "monthly",
    started_at: new Date().toISOString().slice(0, 10),
    agreement_status: "signed",
    agreement_signed_by_name: "",
    notes: "",
    send_invite: true,
  });
  const set = (k: keyof typeof form, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const plansQ = useQuery({
    queryKey: ["investment-plans-all"],
    queryFn: async () => {
      const { data, error } = await db
        .from("investment_plans" as any)
        .select("id,slug,name,currency,roi_percent,payout_frequency,lock_period_days")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data as any[]) as Plan[];
    },
  });

  // When plan changes, prefill rate/payout/currency from plan defaults
  useEffect(() => {
    const p = plansQ.data?.find((x) => x.id === form.plan_id);
    if (!p) return;
    setForm((prev) => ({
      ...prev,
      currency: p.currency || prev.currency,
      payout_frequency: p.payout_frequency || prev.payout_frequency,
      monthly_return_percent:
        prev.monthly_return_percent ||
        (p.roi_percent != null ? String(Number(p.roi_percent)) : prev.monthly_return_percent),
      lock_period_months:
        prev.lock_period_months ||
        (p.lock_period_days ? String(Math.round(p.lock_period_days / 30)) : prev.lock_period_months),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.plan_id, plansQ.data]);

  const reset = () => {
    setForm({
      email: "", full_name: "", phone: "", country: "", plan_id: "",
      amount: "", currency: "USD", monthly_return_percent: "", bonus_percent_biannual: "",
      lock_period_months: "", payout_frequency: "monthly",
      started_at: new Date().toISOString().slice(0, 10),
      agreement_status: "signed", agreement_signed_by_name: "", notes: "", send_invite: true,
    });
    setInviteLink(null);
    setCopied(false);
  };

  const submit = async () => {
    if (!form.email.trim()) { toast.error("Email required"); return; }
    const plan = plansQ.data?.find((p) => p.id === form.plan_id);
    if (!plan) { toast.error("Pick a plan"); return; }
    if (!form.amount || Number(form.amount) <= 0) { toast.error("Amount must be > 0"); return; }

    setSubmitting(true);
    try {
      const { data, error } = await db.functions.invoke(
        "admin-create-manual-investor",
        {
          body: {
            email: form.email.trim(),
            full_name: form.full_name.trim() || null,
            phone: form.phone.trim() || null,
            country: form.country.trim() || null,
            send_invite: form.send_invite,
            plan_id: plan.id,
            plan_slug: plan.slug,
            plan_name: plan.name,
            amount: Number(form.amount),
            currency: form.currency,
            monthly_return_percent: form.monthly_return_percent
              ? Number(form.monthly_return_percent)
              : null,
            bonus_percent_biannual: form.bonus_percent_biannual
              ? Number(form.bonus_percent_biannual)
              : null,
            lock_period_months: form.lock_period_months
              ? Number(form.lock_period_months)
              : null,
            payout_frequency: form.payout_frequency,
            started_at: form.started_at
              ? new Date(form.started_at).toISOString()
              : null,
            agreement_status: form.agreement_status,
            agreement_signed_by_name: form.agreement_signed_by_name.trim() || null,
            notes: form.notes.trim() || null,
          },
        }
      );
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      toast.success(
        (data as any)?.created_account
          ? "Investor account created and investment recorded"
          : "Investment added to existing investor"
      );
      onCreated?.();
      if ((data as any)?.invite_link) {
        setInviteLink((data as any).invite_link);
      } else {
        onOpenChange(false);
        reset();
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Could not create investor");
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" /> Add manual investor
          </DialogTitle>
          <DialogDescription>
            For investors onboarded through consultation and offline paperwork. We
            create the investor account, attach the investment, and optionally
            email them a magic link to access the portal.
          </DialogDescription>
        </DialogHeader>

        {inviteLink ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
              <p className="text-sm font-medium">Investor portal access link</p>
              <p className="text-xs text-muted-foreground">
                Share this with the investor so they can log into the portal. The
                link is single-use and expires per Supabase settings.
              </p>
              <div className="flex gap-2">
                <Input value={inviteLink} readOnly className="font-mono text-xs" />
                <Button type="button" variant="outline" size="sm" onClick={copyLink}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => { onOpenChange(false); reset(); }}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                Investor details
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mi-email">Email *</Label>
              <Input id="mi-email" type="email" value={form.email}
                onChange={(e) => set("email", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mi-name">Full name</Label>
              <Input id="mi-name" value={form.full_name}
                onChange={(e) => set("full_name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mi-phone">Phone</Label>
              <Input id="mi-phone" value={form.phone}
                onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mi-country">Country</Label>
              <Input id="mi-country" value={form.country}
                onChange={(e) => set("country", e.target.value)} />
            </div>

            <div className="md:col-span-2 pt-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                Investment
              </p>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Plan *</Label>
              <Select value={form.plan_id} onValueChange={(v) => set("plan_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select a plan" /></SelectTrigger>
                <SelectContent>
                  {plansQ.data?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mi-amount">Amount *</Label>
              <Input id="mi-amount" type="number" min={0} value={form.amount}
                onChange={(e) => set("amount", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={(v) => set("currency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["USD", "EUR", "GBP", "BDT", "INR"].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mi-roi">Monthly return %</Label>
              <Input id="mi-roi" type="number" step="0.01" value={form.monthly_return_percent}
                onChange={(e) => set("monthly_return_percent", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mi-bonus">Bi-annual bonus %</Label>
              <Input id="mi-bonus" type="number" step="0.01" value={form.bonus_percent_biannual}
                onChange={(e) => set("bonus_percent_biannual", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mi-lock">Lock period (months)</Label>
              <Input id="mi-lock" type="number" min={0} value={form.lock_period_months}
                onChange={(e) => set("lock_period_months", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Payout frequency</Label>
              <Select value={form.payout_frequency} onValueChange={(v) => set("payout_frequency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["monthly", "quarterly", "biannual", "yearly"].map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mi-started">Started on</Label>
              <Input id="mi-started" type="date" value={form.started_at}
                onChange={(e) => set("started_at", e.target.value)} />
            </div>

            <div className="md:col-span-2 pt-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                Agreement
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.agreement_status} onValueChange={(v) => set("agreement_status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="signed">Signed (offline)</SelectItem>
                  <SelectItem value="unsigned">Unsigned</SelectItem>
                  <SelectItem value="pending">Pending review</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mi-signed-by">Signed by name</Label>
              <Input id="mi-signed-by" value={form.agreement_signed_by_name}
                onChange={(e) => set("agreement_signed_by_name", e.target.value)} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="mi-notes">Internal notes</Label>
              <Textarea id="mi-notes" rows={3} value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Reference to paperwork, payment method, source of funds, etc." />
            </div>

            <div className="md:col-span-2 flex items-center gap-2 pt-1">
              <Checkbox
                id="mi-invite"
                checked={form.send_invite}
                onCheckedChange={(v) => set("send_invite", Boolean(v))}
              />
              <Label htmlFor="mi-invite" className="text-sm font-normal cursor-pointer">
                Generate a magic-link so the investor can claim portal access
              </Label>
            </div>

            <DialogFooter className="md:col-span-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create investor
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ManualInvestorDialog;

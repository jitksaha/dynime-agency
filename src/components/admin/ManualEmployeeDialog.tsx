import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, UserPlus, Copy, Check } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const ROLE_OPTIONS: { value: AppRole; label: string }[] = [
  { value: "manager", label: "Manager" },
  { value: "editor", label: "Content Editor" },
  { value: "support", label: "Support Staff" },
  { value: "hr", label: "HR" },
  { value: "sales", label: "Sales / Finance" },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: () => void;
}

const initialForm = {
  email: "",
  full_name: "",
  role: "support" as AppRole,
  department: "",
  job_title: "",
  start_date: "",
  phone: "",
  notes: "",
  send_invite: true,
};

const ManualEmployeeDialog = ({ open, onOpenChange, onCreated }: Props) => {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const set = <K extends keyof typeof initialForm>(k: K, v: (typeof initialForm)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const reset = () => {
    setForm(initialForm);
    setInviteLink(null);
    setCopied(false);
  };

  const submit = async () => {
    if (!form.email.trim()) return toast.error("Email is required");
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-team", {
        body: {
          action: "manual_employee",
          email: form.email.trim(),
          full_name: form.full_name.trim() || null,
          role: form.role,
          department: form.department.trim() || null,
          job_title: form.job_title.trim() || null,
          start_date: form.start_date || null,
          phone: form.phone.trim() || null,
          notes: form.notes.trim() || null,
          send_invite: form.send_invite,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      toast.success(
        (data as any)?.created_account
          ? "Employee account created and role assigned"
          : "Existing user updated with role"
      );
      onCreated?.();
      if ((data as any)?.invite_link) {
        setInviteLink((data as any).invite_link);
      } else {
        onOpenChange(false);
        reset();
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Could not create employee");
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
            <UserPlus className="h-5 w-5 text-primary" /> Add manual employee
          </DialogTitle>
          <DialogDescription>
            For staff onboarded outside the system (paperwork done offline). We
            create the account, assign the role, and optionally generate a
            magic-link they can use to claim portal access whenever they're ready.
          </DialogDescription>
        </DialogHeader>

        {inviteLink ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
              <p className="text-sm font-medium">Employee access link</p>
              <p className="text-xs text-muted-foreground">
                Share this with the employee so they can log into the admin portal.
                The link is single-use and expires per Supabase settings.
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
                Personal details
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="me-email">Email *</Label>
              <Input id="me-email" type="email" value={form.email}
                onChange={(e) => set("email", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="me-name">Full name</Label>
              <Input id="me-name" value={form.full_name}
                onChange={(e) => set("full_name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="me-phone">Phone</Label>
              <Input id="me-phone" value={form.phone}
                onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="me-start">Start date</Label>
              <Input id="me-start" type="date" value={form.start_date}
                onChange={(e) => set("start_date", e.target.value)} />
            </div>

            <div className="md:col-span-2 pt-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                Role & department
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Role *</Label>
              <Select value={form.role} onValueChange={(v) => set("role", v as AppRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="me-job">Job title</Label>
              <Input id="me-job" value={form.job_title}
                onChange={(e) => set("job_title", e.target.value)} placeholder="e.g. Senior Designer" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="me-dept">Department</Label>
              <Input id="me-dept" value={form.department}
                onChange={(e) => set("department", e.target.value)} placeholder="e.g. Operations" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="me-notes">HR notes</Label>
              <Textarea id="me-notes" rows={3} value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Reference to contract, salary band, NDA, etc." />
            </div>

            <div className="md:col-span-2 flex items-center gap-2 pt-1">
              <Checkbox
                id="me-invite"
                checked={form.send_invite}
                onCheckedChange={(v) => set("send_invite", Boolean(v))}
              />
              <Label htmlFor="me-invite" className="text-sm font-normal cursor-pointer">
                Generate a magic-link so the employee can claim portal access
              </Label>
            </div>

            <DialogFooter className="md:col-span-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create employee
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ManualEmployeeDialog;

import { useState } from "react";
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
import { toast } from "sonner";
import { Loader2, UserPlus, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

type AppRole = "super_admin" | "manager" | "editor" | "support" | "hr" | "sales" | "investor" | "employee";

const ROLE_OPTIONS: { value: AppRole; label: string }[] = [
  { value: "manager", label: "Manager" },
  { value: "editor", label: "Content Editor" },
  { value: "support", label: "Support Staff" },
  { value: "hr", label: "HR" },
  { value: "sales", label: "Sales / Finance" },
  { value: "employee", label: "Employee" },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: () => void;
}

const initialForm = {
  email: "",
  password: "",
  full_name: "",
  role: "support" as AppRole,
  department: "",
  job_title: "",
  start_date: "",
  phone: "",
  notes: "",
};

const ManualEmployeeDialog = ({ open, onOpenChange, onCreated }: Props) => {
  const { session } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const token = session?.access_token;

  const set = <K extends keyof typeof initialForm>(k: K, v: (typeof initialForm)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const reset = () => {
    setForm(initialForm);
    setShowPassword(false);
  };

  const submit = async () => {
    if (!form.email.trim()) return toast.error("Email is required");
    if (!form.password || form.password.length < 6) return toast.error("Password must be at least 6 characters");
    if (!form.full_name.trim()) return toast.error("Full name is required");

    setSubmitting(true);
    try {
      // 1. Create auth user and role in NestJS
      const userRes = await fetch("/api/v1/users/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          role: form.role,
          full_name: form.full_name.trim(),
        }),
      });

      if (!userRes.ok) {
        const err = await userRes.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create user credentials");
      }

      const createdUser = await userRes.json();

      // 2. Create the HR employee record in NestJS
      const hrmRes = await fetch("/api/v1/hrm/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: createdUser.id,
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          department: form.department.trim() || null,
          designation: form.job_title.trim() || null,
          joining_date: form.start_date || null,
          status: "active",
          metadata: { notes: form.notes.trim() || null },
        }),
      });

      if (!hrmRes.ok) {
        const err = await hrmRes.json().catch(() => ({}));
        throw new Error(err.message || "User credentials created but employee profile failed");
      }

      toast.success("Employee onboarding complete! Account and profile created.");
      onCreated?.();
      onOpenChange(false);
      reset();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not onboard employee");
    } finally {
      setSubmitting(false);
    }
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
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <UserPlus className="h-6 w-6 text-primary" /> Onboard Manual Employee
          </DialogTitle>
          <DialogDescription>
            Onboard new administrative or staff personnel manually. This creates their login credentials, assigns their console access role, and builds their public employee record.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2 mt-2">
          <div className="md:col-span-2">
            <p className="text-xs uppercase tracking-wider text-primary font-bold">
              Account Credentials
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="me-email">Email Address *</Label>
            <Input id="me-email" type="email" value={form.email}
              onChange={(e) => set("email", e.target.value)} placeholder="employee@dynime.com" />
          </div>
          <div className="space-y-1.5 relative">
            <Label htmlFor="me-password">Initial Password *</Label>
            <div className="relative">
              <Input id="me-password" type={showPassword ? "text" : "password"} value={form.password}
                onChange={(e) => set("password", e.target.value)} placeholder="Minimum 6 characters" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="md:col-span-2 pt-2 border-t border-border/40">
            <p className="text-xs uppercase tracking-wider text-primary font-bold">
              Personal & Professional Profile
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="me-name">Full Name *</Label>
            <Input id="me-name" value={form.full_name}
              onChange={(e) => set("full_name", e.target.value)} placeholder="Jane Doe" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="me-phone">Phone Number</Label>
            <Input id="me-phone" value={form.phone}
              onChange={(e) => set("phone", e.target.value)} placeholder="+123456789" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="me-start">Joining Date</Label>
            <Input id="me-start" type="date" value={form.start_date}
              onChange={(e) => set("start_date", e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Access Role *</Label>
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
            <Label htmlFor="me-job">Job Title</Label>
            <Input id="me-job" value={form.job_title}
              onChange={(e) => set("job_title", e.target.value)} placeholder="e.g. Senior HR Consultant" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="me-dept">Department</Label>
            <Input id="me-dept" value={form.department}
              onChange={(e) => set("department", e.target.value)} placeholder="e.g. Talent Acquisition" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="me-notes">HR Notes & Onboarding References</Label>
            <Textarea id="me-notes" rows={3} value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Record details of salary packages, off-line agreements, NDAs, or background checks..." />
          </div>

          <DialogFooter className="md:col-span-2 pt-4 border-t border-border/40">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={submitting} className="shadow-md shadow-primary/10">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Complete Onboarding
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManualEmployeeDialog;

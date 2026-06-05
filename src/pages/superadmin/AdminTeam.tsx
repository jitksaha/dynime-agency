import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  UserPlus, Shield, Trash2, Users, Crown, Edit2, MessageSquare, KeyRound, Search, ShoppingBag, UserCircle2, ArrowUpRight, ClipboardList, Send, Check, Eye, EyeOff, Loader2
} from "lucide-react";
import ManualEmployeeDialog from "@/components/admin/ManualEmployeeDialog";

type AppRole = "super_admin" | "manager" | "editor" | "support" | "hr" | "sales" | "investor" | "employee";

const ROLE_META: Record<AppRole, { label: string; color: string; icon: typeof Shield; description: string }> = {
  super_admin: { label: "Super Admin", color: "bg-destructive/10 text-destructive border-destructive/20", icon: Crown, description: "Full access to everything" },
  manager: { label: "Manager", color: "bg-primary/10 text-primary border-primary/20", icon: Shield, description: "Manage content, orders & team" },
  editor: { label: "Content Editor", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: Edit2, description: "Edit pages, blog, portfolio & SEO" },
  support: { label: "Support Staff", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: MessageSquare, description: "Handle chat, tickets & submissions" },
  hr: { label: "HR", color: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: Users, description: "Manage careers & job postings" },
  sales: { label: "Sales / Finance", color: "bg-violet-500/10 text-violet-600 border-violet-500/20", icon: ShoppingBag, description: "Orders, coupons, invoices & pricing" },
  investor: { label: "Investor", color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20", icon: UserCircle2, description: "Investor portal access" },
  employee: { label: "Employee", color: "bg-slate-500/10 text-slate-600 border-slate-500/20", icon: UserCircle2, description: "Employee self-service portal" },
};

const CAPABILITIES: Record<AppRole, string[]> = {
  super_admin: ["Everything"],
  manager: ["Dashboard", "Content", "Commerce", "Engagement", "Submissions"],
  editor: ["Pages", "Blog", "Portfolio", "SEO", "Header & Footer", "Brand Voice"],
  support: ["Submissions", "Live Chat", "Support Tickets", "Subscribers"],
  hr: ["Job Posts", "Team Section", "Careers Applicants"],
  sales: ["Orders", "Customer Services", "Coupons", "Service Pricing", "USA State Fees", "Payment Gateways"],
  investor: ["Investor Portal: Dashboard", "Agreements", "Statements", "Withdrawals"],
  employee: ["My Documents", "My Requests", "My Profile"],
};

interface AppUser {
  user_id: string;
  email: string;
  full_name: string | null;
  role: AppRole | null; // null => customer
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  order_count: number;
}

const AdminTeam = () => {
  const { user, userRole, session } = useAuth();
  const queryClient = useQueryClient();
  const isSuperAdmin = userRole === "super_admin";
  const token = session?.access_token;

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("editor");
  const [inviteName, setInviteName] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedUserOrders, setSelectedUserOrders] = useState<{ user: AppUser | null; open: boolean }>({ user: null, open: false });

  // Fetch every user (team + customer) directly from NestJS local backend.
  const { data: allUsers = [], isLoading } = useQuery<AppUser[]>({
    queryKey: ["all-users", token],
    queryFn: async () => {
      if (!token) return [];
      const res = await fetch("/api/v1/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      const json = await res.json();
      return json.data as AppUser[];
    },
    enabled: !!token,
  });

  const { data: userOrders = [], isLoading: isLoadingOrders } = useQuery<any[]>({
    queryKey: ["user-orders", selectedUserOrders.user?.user_id, token],
    queryFn: async () => {
      if (!selectedUserOrders.user?.user_id || !token) return [];
      const res = await fetch(`/api/v1/orders?userId=${selectedUserOrders.user.user_id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch user orders");
      const json = await res.json();
      return json.data || [];
    },
    enabled: !!selectedUserOrders.user?.user_id && !!token && selectedUserOrders.open,
  });

  const teamMembers = useMemo(() => allUsers.filter((u) => u.role), [allUsers]);
  const customers = useMemo(() => allUsers.filter((u) => !u.role), [allUsers]);

  const filteredTeamMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teamMembers;
    return teamMembers.filter(
      (m) => m.email.toLowerCase().includes(q) || (m.full_name || "").toLowerCase().includes(q)
    );
  }, [teamMembers, search]);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) => c.email.toLowerCase().includes(q) || (c.full_name || "").toLowerCase().includes(q)
    );
  }, [customers, search]);

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/users/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          password: invitePassword,
          role: inviteRole,
          full_name: inviteName.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create user");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast.success("User created successfully.");
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      setInviteOpen(false);
      setInviteEmail("");
      setInvitePassword("");
      setInviteName("");
      setInviteRole("editor");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const res = await fetch(`/api/v1/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update role");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast.success("Role updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeRoleMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/v1/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: "" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to demote user");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast.success("Demoted to customer.");
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/v1/users/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to delete user");
      }
    },
    onSuccess: () => {
      toast.success("User deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, passwordPlan }: { userId: string; passwordPlan: string }) => {
      const res = await fetch(`/api/v1/users/${userId}/reset-password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: passwordPlan }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to reset password");
      }
      return await res.json();
    },
    onSuccess: () => toast.success("Password changed successfully."),
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">User Management</h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Review every customer who registered, assign administrative staff roles, add manual accounts, or manage credentials.
            </p>
          </div>
          {isSuperAdmin && (
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" onClick={() => setManualOpen(true)} className="hover:bg-muted/80 transition-colors">
                <ClipboardList className="w-4 h-4 mr-2" /> Onboard manual employee
              </Button>
              <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogTrigger asChild>
                  <Button className="shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"><UserPlus className="w-4 h-4 mr-2" /> Add New User</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New User Account</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={(e) => { e.preventDefault(); inviteMutation.mutate(); }} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input required value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="John Doe" />
                    </div>
                    <div className="space-y-2">
                      <Label>Email Address</Label>
                      <Input type="email" required value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="user@dynime.com" />
                    </div>
                    <div className="space-y-2 relative">
                      <Label>Password</Label>
                      <div className="relative">
                        <Input type={showPassword ? "text" : "password"} required minLength={6} value={invitePassword} onChange={(e) => setInvitePassword(e.target.value)} placeholder="Minimum 6 characters" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Access Role</Label>
                      <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AppRole)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="customer">
                            <span className="flex items-center gap-2">
                              Regular Customer
                              <span className="text-xs text-muted-foreground">— General client portal access</span>
                            </span>
                          </SelectItem>
                          {(Object.keys(ROLE_META) as AppRole[]).map((r) => (
                            <SelectItem key={r} value={r}>
                              <span className="flex items-center gap-2">
                                {ROLE_META[r].label}
                                <span className="text-xs text-muted-foreground">— {ROLE_META[r].description}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {inviteRole !== "customer" && (
                      <div className="rounded-lg border border-border p-3 bg-muted/40 transition-all duration-200">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">Capabilities for {ROLE_META[inviteRole].label}:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {CAPABILITIES[inviteRole].map((cap) => (
                            <Badge key={cap} variant="secondary" className="text-[10px] bg-background">{cap}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <Button type="submit" className="w-full mt-2" disabled={inviteMutation.isPending}>
                      {inviteMutation.isPending ? "Creating account..." : "Create User Account"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        {/* Role overview cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">
          {(Object.keys(ROLE_META) as AppRole[]).map((role) => {
            const meta = ROLE_META[role];
            const count = teamMembers.filter((m) => m.role === role).length;
            return (
              <Card key={role} className="border-border/60 hover:border-border transition-all duration-200 shadow-sm">
                <CardContent className="pt-4 pb-3 px-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`p-1.5 rounded-md ${meta.color}`}>
                      <meta.icon className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-xs font-semibold text-foreground">{meta.label}</p>
                  </div>
                  <p className="text-xl font-extrabold text-foreground">{count}</p>
                </CardContent>
              </Card>
            );
          })}
          <Card className="border-border/60 hover:border-border transition-all duration-200 shadow-sm">
            <CardContent className="pt-4 pb-3 px-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-md bg-secondary text-muted-foreground">
                  <UserCircle2 className="w-3.5 h-3.5" />
                </div>
                <p className="text-xs font-semibold text-foreground">Customers</p>
              </div>
              <p className="text-xl font-extrabold text-foreground">{customers.length}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="team" className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/60 pb-1">
            <TabsList className="bg-muted/60">
              <TabsTrigger value="team" className="data-[state=active]:bg-background">
                <Users className="w-4 h-4 mr-2" /> Admins & Staff ({teamMembers.length})
              </TabsTrigger>
              <TabsTrigger value="customers" className="data-[state=active]:bg-background">
                <UserCircle2 className="w-4 h-4 mr-2" /> Registered Customers ({customers.length})
              </TabsTrigger>
            </TabsList>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by name or email…"
                className="pl-9 h-9 rounded-full bg-background border-border/80"
              />
            </div>
          </div>

          {/* ----------- TEAM TAB ----------- */}
          <TabsContent value="team" className="mt-4">
            <Card className="border-border/60">
              <CardContent className="p-0">
                {isLoading ? (
                  <p className="text-sm text-muted-foreground py-12 text-center">Loading system accounts…</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>Member Account</TableHead>
                        <TableHead>Assigned Role</TableHead>
                        <TableHead className="hidden md:table-cell">Console Access Capabilities</TableHead>
                        <TableHead className="hidden lg:table-cell">Joined Date</TableHead>
                        {isSuperAdmin && <TableHead className="w-[160px] text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTeamMembers.map((m) => {
                        const meta = ROLE_META[m.role!];
                        const isCurrentUser = m.user_id === user?.id;
                        return (
                          <TableRow key={m.user_id} className="hover:bg-muted/10 transition-colors">
                            <TableCell>
                              <div>
                                <p className="font-semibold text-sm text-foreground flex items-center gap-1.5">{m.full_name || "—"}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{m.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {isSuperAdmin && !isCurrentUser ? (
                                <Select value={m.role!} onValueChange={(v) => updateRoleMutation.mutate({ userId: m.user_id, role: v as AppRole })}>
                                  <SelectTrigger className="w-[145px] h-8 text-xs font-medium"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {(Object.keys(ROLE_META) as AppRole[]).map((r) => (
                                      <SelectItem key={r} value={r}>{ROLE_META[r].label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge variant="outline" className={`${meta.color} text-xs font-semibold`}>
                                  <meta.icon className="w-3 h-3 mr-1" />{meta.label}{isCurrentUser && " (You)"}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <div className="flex flex-wrap gap-1 max-w-[340px]">
                                {CAPABILITIES[m.role!].slice(0, 4).map((c) => (
                                  <Badge key={c} variant="secondary" className="text-[10px] px-1.5 py-0 bg-secondary/50">{c}</Badge>
                                ))}
                                {CAPABILITIES[m.role!].length > 4 && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-secondary/50">+{CAPABILITIES[m.role!].length - 4}</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                              {new Date(m.created_at).toLocaleDateString()}
                            </TableCell>
                            {isSuperAdmin && (
                              <TableCell className="text-right">
                                <div className="flex gap-1 justify-end">
                                  {!isCurrentUser && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                        title="Change Password"
                                        onClick={() => {
                                          const newPass = prompt(`Set new password for ${m.email}:`);
                                          if (newPass) {
                                            if (newPass.length < 6) {
                                              toast.error("Password must be at least 6 characters");
                                            } else {
                                              resetPasswordMutation.mutate({ userId: m.user_id, passwordPlan: newPass });
                                            }
                                          }
                                        }}
                                      >
                                        <KeyRound className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                        title="Demote to Customer"
                                        onClick={() => {
                                          if (confirm(`Remove ${m.email}'s staff credentials? They will be demoted to a regular customer.`)) {
                                            removeRoleMutation.mutate(m.user_id);
                                          }
                                        }}
                                      >
                                        <ArrowUpRight className="w-4 h-4 rotate-180" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        title="Permanently Delete Account"
                                        onClick={() => {
                                          if (confirm(`Are you absolutely sure you want to permanently delete the account for ${m.email}? This action cascades and cannot be undone.`)) {
                                            deleteUserMutation.mutate(m.user_id);
                                          }
                                        }}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                      {filteredTeamMembers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={isSuperAdmin ? 5 : 4} className="text-center text-sm text-muted-foreground py-10">
                            No team members matched the search criteria.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ----------- CUSTOMERS TAB ----------- */}
          <TabsContent value="customers" className="mt-4">
            <Card className="border-border/60">
              <CardContent className="p-0">
                {isLoading ? (
                  <p className="text-sm text-muted-foreground py-12 text-center">Loading system accounts…</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>Customer Account</TableHead>
                        <TableHead>Completed Orders</TableHead>
                        <TableHead className="hidden md:table-cell">Last Sign In</TableHead>
                        <TableHead className="hidden lg:table-cell">Joined Date</TableHead>
                        {isSuperAdmin && <TableHead className="w-[180px] text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.map((c) => (
                        <TableRow key={c.user_id} className="hover:bg-muted/10 transition-colors">
                          <TableCell>
                            <div>
                              <p className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                                {c.full_name || "—"}
                                {!c.email_confirmed_at && (
                                  <Badge variant="outline" className="text-[9px] border-amber-500/20 text-amber-600 px-1 py-0 bg-amber-500/5">
                                    Unverified
                                  </Badge>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">{c.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() => setSelectedUserOrders({ user: c, open: true })}
                              className="focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-md transition-all active:scale-95"
                              title="Click to view orders"
                            >
                              <Badge variant="secondary" className="text-xs font-semibold bg-primary/10 text-primary border border-primary/10 hover:bg-primary/20 cursor-pointer transition-colors">
                                <ShoppingBag className="w-3 h-3 mr-1" /> {c.order_count}
                              </Badge>
                            </button>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                            {c.last_sign_in_at ? new Date(c.last_sign_in_at).toLocaleDateString() : "Never signed in"}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                            {new Date(c.created_at).toLocaleDateString()}
                          </TableCell>
                          {isSuperAdmin && (
                            <TableCell className="text-right">
                              <div className="flex gap-1 justify-end">
                                <Select onValueChange={(v) => updateRoleMutation.mutate({ userId: c.user_id, role: v as AppRole })}>
                                  <SelectTrigger className="h-8 w-[120px] text-xs font-medium">
                                    <SelectValue placeholder="Promote to…" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(Object.keys(ROLE_META) as AppRole[])
                                      .filter((r) => r !== "super_admin")
                                      .map((r) => (
                                        <SelectItem key={r} value={r}>{ROLE_META[r].label}</SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  title="Change Password"
                                  onClick={() => {
                                    const newPass = prompt(`Set new password for ${c.email}:`);
                                    if (newPass) {
                                      if (newPass.length < 6) {
                                        toast.error("Password must be at least 6 characters");
                                      } else {
                                        resetPasswordMutation.mutate({ userId: c.user_id, passwordPlan: newPass });
                                      }
                                    }
                                  }}
                                  disabled={resetPasswordMutation.isPending}
                                >
                                  <KeyRound className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  title="Permanently Delete Customer"
                                  onClick={() => {
                                    if (confirm(`Are you absolutely sure you want to permanently delete customer ${c.email}? This action cascades and cannot be undone.`)) {
                                      deleteUserMutation.mutate(c.user_id);
                                    }
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                      {filteredCustomers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={isSuperAdmin ? 5 : 4} className="text-center text-sm text-muted-foreground py-10">
                            {search ? "No customers matched your search criteria." : "No registered customers found."}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <ManualEmployeeDialog
        open={manualOpen}
        onOpenChange={setManualOpen}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ["all-users"] })}
      />

      <Dialog
        open={selectedUserOrders.open}
        onOpenChange={(open) => setSelectedUserOrders((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="max-w-2xl bg-card border-border/80 shadow-2xl backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <ShoppingBag className="w-5 h-5 text-primary" />
              Orders for {selectedUserOrders.user?.full_name || selectedUserOrders.user?.email}
            </DialogTitle>
            <DialogDescription>
              Viewing history of invoices and payments for customer {selectedUserOrders.user?.email}
            </DialogDescription>
          </DialogHeader>

          {isLoadingOrders ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Retrieving orders list...</p>
            </div>
          ) : userOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground space-y-2">
              <ShoppingBag className="w-8 h-8 mx-auto text-muted-foreground/60" />
              <p className="text-sm font-medium">No orders found for this user.</p>
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-1 mt-2">
              {userOrders.map((order: any) => {
                const totalAmount = new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: order.currency || "USD",
                }).format(Number(order.total));

                const items = Array.isArray(order.items) ? order.items : [];

                return (
                  <Card key={order.id} className="border-border/60 bg-muted/20 shadow-sm overflow-hidden">
                    <CardHeader className="py-3 px-4 border-b border-border/40 bg-muted/40 flex flex-row items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-xs font-mono font-bold text-foreground">
                          {order.invoice_number}
                        </span>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold uppercase ${
                            order.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : order.status === "pending"
                              ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                              : order.status === "refunded"
                              ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                              : "bg-destructive/10 text-destructive border-destructive/20"
                          }`}
                        >
                          {order.status}
                        </Badge>
                        <span className="text-sm font-bold text-foreground">
                          {totalAmount}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3">
                      <div className="divide-y divide-border/40 text-xs">
                        {items.map((item: any, i: number) => (
                          <div key={i} className="flex justify-between py-1.5 first:pt-0 last:pb-0">
                            <span className="text-muted-foreground">
                              {item.name} <span className="text-[10px] text-muted-foreground/80 font-medium">×{item.quantity}</span>
                            </span>
                            <span className="font-semibold text-foreground">
                              {new Intl.NumberFormat("en-US", {
                                style: "currency",
                                currency: order.currency || "USD",
                              }).format(Number(item.price * item.quantity))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
};

export default AdminTeam;

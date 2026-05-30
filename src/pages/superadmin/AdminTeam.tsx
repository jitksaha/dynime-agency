import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  UserPlus, Shield, Trash2, Users, Crown, Edit2, MessageSquare, KeyRound, Search, ShoppingBag, UserCircle2, ArrowUpRight, ClipboardList, Send, Copy, Check,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import ManualEmployeeDialog from "@/components/admin/ManualEmployeeDialog";

type AppRole = Database["public"]["Enums"]["app_role"];

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

const callManageTeam = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke("manage-team", { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
};

const AdminTeam = () => {
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();
  const isSuperAdmin = userRole === "super_admin";

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("editor");
  const [inviteName, setInviteName] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [inviteLinkInfo, setInviteLinkInfo] = useState<{ email: string; link: string } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Fetch every user (team + customer) in one call.
  const { data: allUsers = [], isLoading } = useQuery<AppUser[]>({
    queryKey: ["all-users"],
    queryFn: async () => {
      const data = await callManageTeam({ action: "list_users" });
      return data.users as AppUser[];
    },
  });

  const teamMembers = useMemo(() => allUsers.filter((u) => u.role), [allUsers]);
  const customers = useMemo(() => allUsers.filter((u) => !u.role), [allUsers]);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) => c.email.toLowerCase().includes(q) || (c.full_name || "").toLowerCase().includes(q),
    );
  }, [customers, search]);

  const inviteMutation = useMutation({
    mutationFn: () =>
      callManageTeam({
        action: "invite",
        email: inviteEmail,
        password: invitePassword,
        role: inviteRole,
        full_name: inviteName,
      }),
    onSuccess: () => {
      toast.success("Team member invited.");
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
    mutationFn: ({ userId, role }: { userId: string; role: AppRole }) =>
      callManageTeam({ action: "update_role", user_id: userId, role }),
    onSuccess: () => {
      toast.success("Role updated.");
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeRoleMutation = useMutation({
    mutationFn: (userId: string) => callManageTeam({ action: "remove_role", user_id: userId }),
    onSuccess: () => {
      toast.success("Demoted to customer.");
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => callManageTeam({ action: "delete_user", user_id: userId }),
    onSuccess: () => {
      toast.success("User deleted.");
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (email: string) => callManageTeam({ action: "reset_password", email }),
    onSuccess: (data: any) => toast.success(data?.message || "Reset email sent."),
    onError: (err: Error) => toast.error(err.message),
  });

  const resendInviteMutation = useMutation({
    mutationFn: ({ userId, email }: { userId: string; email: string }) =>
      callManageTeam({ action: "resend_invite", user_id: userId, email }),
    onSuccess: (data: any) => {
      if (data?.invite_link) {
        setInviteLinkInfo({ email: data.email, link: data.invite_link });
      } else {
        toast.success("Magic link generated.");
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const copyInviteLink = async () => {
    if (!inviteLinkInfo) return;
    await navigator.clipboard.writeText(inviteLinkInfo.link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 1500);
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Users & Team</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage staff with role-based access and review every customer who has signed up.
            </p>
          </div>
          {isSuperAdmin && (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setManualOpen(true)}>
                <ClipboardList className="w-4 h-4 mr-2" /> Add manual employee
              </Button>
              <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogTrigger asChild>
                  <Button><UserPlus className="w-4 h-4 mr-2" /> Invite Member</Button>
                </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                </DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); inviteMutation.mutate(); }} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="John Doe" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" required value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="member@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input type="password" required minLength={6} value={invitePassword} onChange={(e) => setInvitePassword(e.target.value)} placeholder="Min 6 characters" />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AppRole)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(ROLE_META) as AppRole[]).filter((r) => r !== "super_admin").map((r) => (
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
                  <div className="rounded-lg border border-border p-3 bg-muted/30">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Capabilities for {ROLE_META[inviteRole].label}:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {CAPABILITIES[inviteRole].map((cap) => (
                        <Badge key={cap} variant="secondary" className="text-[10px]">{cap}</Badge>
                      ))}
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={inviteMutation.isPending}>
                    {inviteMutation.isPending ? "Creating..." : "Create & Invite"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            </div>
          )}
        </div>

        {/* Role overview cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {(Object.keys(ROLE_META) as AppRole[]).map((role) => {
            const meta = ROLE_META[role];
            const count = teamMembers.filter((m) => m.role === role).length;
            return (
              <Card key={role} className="border-border">
                <CardContent className="pt-4 pb-3 px-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`p-1.5 rounded-md ${meta.color}`}>
                      <meta.icon className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-xs font-semibold text-foreground">{meta.label}</p>
                  </div>
                  <p className="text-lg font-bold text-foreground">{count}</p>
                </CardContent>
              </Card>
            );
          })}
          <Card className="border-border">
            <CardContent className="pt-4 pb-3 px-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-md bg-secondary text-muted-foreground">
                  <UserCircle2 className="w-3.5 h-3.5" />
                </div>
                <p className="text-xs font-semibold text-foreground">Customers</p>
              </div>
              <p className="text-lg font-bold text-foreground">{customers.length}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="team" className="w-full">
          <TabsList>
            <TabsTrigger value="team">
              <Users className="w-4 h-4 mr-2" /> Team ({teamMembers.length})
            </TabsTrigger>
            <TabsTrigger value="customers">
              <UserCircle2 className="w-4 h-4 mr-2" /> Customers ({customers.length})
            </TabsTrigger>
          </TabsList>

          {/* ----------- TEAM TAB ----------- */}
          <TabsContent value="team" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5" /> Team Members
                </CardTitle>
                <CardDescription>{teamMembers.length} member{teamMembers.length !== 1 ? "s" : ""} with admin access</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Capabilities</TableHead>
                        <TableHead>Joined</TableHead>
                        {isSuperAdmin && <TableHead className="w-[120px]">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teamMembers.map((m) => {
                        const meta = ROLE_META[m.role!];
                        const isCurrentUser = m.user_id === user?.id;
                        return (
                          <TableRow key={m.user_id}>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm text-foreground">{m.full_name || "—"}</p>
                                <p className="text-xs text-muted-foreground">{m.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {isSuperAdmin && !isCurrentUser ? (
                                <Select value={m.role!} onValueChange={(v) => updateRoleMutation.mutate({ userId: m.user_id, role: v as AppRole })}>
                                  <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {(Object.keys(ROLE_META) as AppRole[]).map((r) => (
                                      <SelectItem key={r} value={r}>{ROLE_META[r].label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge variant="outline" className={`${meta.color} text-xs`}>
                                  <meta.icon className="w-3 h-3 mr-1" />{meta.label}{isCurrentUser && " (You)"}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1 max-w-[300px]">
                                {CAPABILITIES[m.role!].slice(0, 4).map((c) => (
                                  <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>
                                ))}
                                {CAPABILITIES[m.role!].length > 4 && (
                                  <Badge variant="secondary" className="text-[10px]">+{CAPABILITIES[m.role!].length - 4}</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(m.created_at).toLocaleDateString()}
                            </TableCell>
                            {isSuperAdmin && (
                              <TableCell>
                                <div className="flex gap-1">
                                  {!isCurrentUser && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        title="Resend magic-link invite"
                                        disabled={resendInviteMutation.isPending}
                                        onClick={() =>
                                          resendInviteMutation.mutate({ userId: m.user_id, email: m.email })
                                        }
                                      >
                                        <Send className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        title="Demote to customer"
                                        onClick={() => {
                                          if (confirm(`Remove ${m.email}'s admin role? They'll become a regular customer.`)) {
                                            removeRoleMutation.mutate(m.user_id);
                                          }
                                        }}
                                      >
                                        <ArrowUpRight className="w-4 h-4 rotate-180" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        title="Delete account"
                                        onClick={() => {
                                          if (confirm(`Permanently delete ${m.email}? This cannot be undone.`)) {
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
                      {teamMembers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={isSuperAdmin ? 5 : 4} className="text-center text-sm text-muted-foreground py-8">
                            No team members yet.
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
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <UserCircle2 className="w-5 h-5" /> Customers
                    </CardTitle>
                    <CardDescription>Everyone who signed up but has no admin role.</CardDescription>
                  </div>
                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search name or email…"
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Orders</TableHead>
                        <TableHead>Last sign-in</TableHead>
                        <TableHead>Joined</TableHead>
                        {isSuperAdmin && <TableHead className="w-[260px]">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.map((c) => (
                        <TableRow key={c.user_id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm text-foreground">{c.full_name || "—"}</p>
                              <p className="text-xs text-muted-foreground">{c.email}</p>
                              {!c.email_confirmed_at && (
                                <Badge variant="outline" className="mt-1 text-[10px] border-amber-500/30 text-amber-600">
                                  Unverified
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              <ShoppingBag className="w-3 h-3 mr-1" /> {c.order_count}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {c.last_sign_in_at ? new Date(c.last_sign_in_at).toLocaleDateString() : "Never"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(c.created_at).toLocaleDateString()}
                          </TableCell>
                          {isSuperAdmin && (
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                <Select onValueChange={(v) => updateRoleMutation.mutate({ userId: c.user_id, role: v as AppRole })}>
                                  <SelectTrigger className="h-8 w-[120px] text-xs">
                                    <SelectValue placeholder="Promote…" />
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
                                  size="sm"
                                  title="Send password reset email"
                                  onClick={() => resetPasswordMutation.mutate(c.email)}
                                  disabled={resetPasswordMutation.isPending}
                                >
                                  <KeyRound className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  title="Delete customer"
                                  onClick={() => {
                                    if (confirm(`Permanently delete ${c.email}? This cannot be undone.`)) {
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
                          <TableCell colSpan={isSuperAdmin ? 5 : 4} className="text-center text-sm text-muted-foreground py-8">
                            {search ? "No customers match your search." : "No customers yet."}
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
        open={!!inviteLinkInfo}
        onOpenChange={(v) => { if (!v) { setInviteLinkInfo(null); setLinkCopied(false); } }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" /> Magic-link invite
            </DialogTitle>
          </DialogHeader>
          {inviteLinkInfo && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Share this single-use link with <span className="font-medium text-foreground">{inviteLinkInfo.email}</span> so they can log into the admin portal.
              </p>
              <div className="flex gap-2">
                <Input value={inviteLinkInfo.link} readOnly className="font-mono text-xs" />
                <Button type="button" variant="outline" size="sm" onClick={copyInviteLink}>
                  {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                The link expires per your Supabase auth settings. Generate a new one any time from this menu.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
};

export default AdminTeam;

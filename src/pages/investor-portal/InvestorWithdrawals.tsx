import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/integrations/db/client";
import { useAuth } from "@/hooks/use-auth";
import InvestorPortalLayout from "@/components/investor/InvestorPortalLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Banknote, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePageTitle } from "@/hooks/use-page-title";
import { useSEO } from "@/hooks/use-seo";

const fmt = (n: number, cur = "USD") =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: cur }).format(n || 0);

const InvestorWithdrawals = () => {
  usePageTitle("Investor · Withdrawals");
  useSEO({ title: "Investor Withdrawals", noIndex: true });
  const { user } = useAuth();
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [investmentId, setInvestmentId] = useState<string>("");
  const [method, setMethod] = useState("bank_transfer");
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [swift, setSwift] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: investments } = useQuery({
    queryKey: ["withdraw-investments", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await db
        .from("investments" as any)
        .select("id, plan_name, amount, currency, status")
        .eq("investor_id", user!.id)
        .eq("status", "active");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data: withdrawals, isLoading } = useQuery({
    queryKey: ["investor-withdrawals", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await db
        .from("withdrawal_requests" as any)
        .select("*")
        .eq("investor_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    const num = Number(amount);
    if (!num || num <= 0) return toast.error("Enter a valid amount");
    setSubmitting(true);
    try {
      const { error } = await db.from("withdrawal_requests" as any).insert({
        investor_id: user.id,
        investment_id: investmentId || null,
        amount: num,
        currency: "USD",
        method,
        bank_details: { bank_name: bankName, account_name: accountName, account_number: accountNumber, swift },
        status: "pending",
        admin_notes: notes || null,
      });
      if (error) throw error;
      toast.success("Withdrawal request submitted");
      setOpen(false);
      setAmount("");
      setInvestmentId("");
      setBankName(""); setAccountName(""); setAccountNumber(""); setSwift(""); setNotes("");
      await qc.invalidateQueries({ queryKey: ["investor-withdrawals", user.id] });
    } catch (err: any) {
      toast.error(err?.message || "Could not submit request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <InvestorPortalLayout
      title="Withdrawals"
      description="Request a payout from your active investments. Our finance team typically processes within 5 business days."
      actions={
        <Button size="sm" onClick={() => setOpen((o) => !o)}>
          <Plus className="h-4 w-4 mr-1.5" /> {open ? "Close form" : "New request"}
        </Button>
      }
    >
      {open && (
        <Card className="mb-6">
          <CardContent className="p-5">
            <form onSubmit={submit} className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Investment</Label>
                <Select value={investmentId} onValueChange={setInvestmentId}>
                  <SelectTrigger><SelectValue placeholder="Select investment (optional)" /></SelectTrigger>
                  <SelectContent>
                    {(investments ?? []).map((i: any) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.plan_name} — {fmt(Number(i.amount), i.currency)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="amount">Amount (USD)</Label>
                <Input id="amount" type="number" min={1} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </div>

              <div className="space-y-1.5">
                <Label>Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                    <SelectItem value="wire">International wire</SelectItem>
                    <SelectItem value="crypto">Crypto (USDT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bank">Bank / Wallet</Label>
                <Input id="bank" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Bank name or wallet network" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="acc-name">Account holder</Label>
                <Input id="acc-name" value={accountName} onChange={(e) => setAccountName(e.target.value)} required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="acc-num">Account number / Wallet address</Label>
                <Input id="acc-num" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="swift">SWIFT / Routing (optional)</Label>
                <Input id="swift" value={swift} onChange={(e) => setSwift(e.target.value)} />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>

              <div className="md:col-span-2 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Banknote className="h-4 w-4 mr-1.5" />}
                  Submit request
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : !withdrawals?.length ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            You haven't made any withdrawal requests yet.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground border-b">
                  <tr>
                    <th className="text-left py-3 px-4">Requested</th>
                    <th className="text-right py-3 px-2">Amount</th>
                    <th className="text-left py-3 px-2">Method</th>
                    <th className="text-left py-3 px-2">Status</th>
                    <th className="text-left py-3 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {withdrawals.map((w: any) => (
                    <tr key={w.id} className="hover:bg-muted/30">
                      <td className="py-3 px-4 text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</td>
                      <td className="py-3 px-2 text-right font-medium">{fmt(Number(w.amount), w.currency)}</td>
                      <td className="py-3 px-2">{w.method.replace("_", " ")}</td>
                      <td className="py-3 px-2">
                        <Badge variant={
                          w.status === "paid" ? "default"
                          : w.status === "approved" ? "secondary"
                          : w.status === "rejected" ? "destructive"
                          : "outline"
                        }>{w.status}</Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs max-w-[260px] truncate">
                        {w.admin_notes || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </InvestorPortalLayout>
  );
};

export default InvestorWithdrawals;

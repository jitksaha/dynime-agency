import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Shield, QrCode, ArrowLeft, Loader2, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface OrderBrief {
  invoice_number: string;
  customer_name: string;
  type: string;
}

const VerifyOrderMockFlow = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"verified" | "rejected" | null>(null);
  const [orderInfo, setOrderInfo] = useState<OrderBrief | null>(null);

  useEffect(() => {
    const loadInfo = async () => {
      if (!orderId) return;
      try {
        const res = await apiGet<OrderBrief>(`/orders/public/${orderId}/verification`);
        setOrderInfo(res);
      } catch (e) {
        console.error("Failed to load mock order information", e);
        toast.error("Failed to load order info");
      } finally {
        setLoading(false);
      }
    };
    loadInfo();
  }, [orderId]);

  const handleDecision = async (decision: "verified" | "rejected") => {
    if (!orderId) return;
    setBusy(decision);
    try {
      await apiPost(`/orders/public/${orderId}/verification/mock-complete`, { decision });
      toast.success(`Simulated decision: ${decision === "verified" ? "Approved" : "Rejected"}`);
      setTimeout(() => {
        window.location.href = `${window.location.origin}/verify-order/${orderId}?done=1`;
      }, 1500);
    } catch (e) {
      console.error(e);
      toast.error("Failed to update verification status");
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#0F172A] text-slate-100 flex flex-col justify-between selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/40 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400/30">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-heading font-bold text-lg tracking-tight bg-gradient-to-r from-indigo-200 to-white bg-clip-text text-transparent">
                Didit Verification
              </span>
              <span className="text-[10px] block font-mono text-indigo-400 tracking-wider font-semibold uppercase">
                Sandbox Simulator
              </span>
            </div>
          </div>
          <Link
            to={`/verify-order/${orderId}`}
            className="text-xs font-medium text-slate-400 hover:text-white transition-colors duration-200 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-800/50"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container mx-auto px-4 py-16 flex items-center justify-center max-w-lg">
        {loading ? (
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            <p className="text-sm text-slate-400 font-medium">Initializing secure connection...</p>
          </div>
        ) : (
          <Card className="w-full border-slate-800 bg-slate-900/60 backdrop-blur-xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
            
            <CardHeader className="text-center pb-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-3 mx-auto">
                <Sparkles className="w-3.5 h-3.5" /> Dev Sandbox Mode
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight text-white">
                Scan to Verify Identity
              </CardTitle>
              {orderInfo?.invoice_number && (
                <CardDescription className="font-mono text-xs text-indigo-300 uppercase mt-1.5 tracking-wider">
                  Order Ref: {orderInfo.invoice_number}
                </CardDescription>
              )}
            </CardHeader>

            <CardContent className="space-y-6 pt-4 text-center">
              <p className="text-slate-300 text-sm leading-relaxed max-w-sm mx-auto">
                Please scan the secure QR code using your smartphone camera to launch the document verification process.
              </p>

              {/* QR Code Mock Box */}
              <div className="relative mx-auto w-52 h-52 bg-white rounded-2xl p-4 flex items-center justify-center shadow-2xl shadow-indigo-500/10 border border-indigo-500/25 group overflow-hidden">
                {busy ? (
                  <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center space-y-3 z-10 animate-fade-in">
                    {busy === "verified" ? (
                      <>
                        <CheckCircle2 className="w-14 h-14 text-emerald-400 animate-scale-up" />
                        <span className="text-sm font-semibold text-emerald-300">Approval Registered</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-14 h-14 text-rose-500 animate-scale-up" />
                        <span className="text-sm font-semibold text-rose-400">Rejection Registered</span>
                      </>
                    )}
                    <span className="text-xs text-slate-400 font-mono">Redirecting in a moment...</span>
                  </div>
                ) : null}
                
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 group-hover:opacity-100 opacity-0 transition-opacity duration-500 pointer-events-none" />
                <QrCode className="w-full h-full text-slate-900 transition-all duration-300" />
              </div>

              {/* Order Info Summary */}
              {orderInfo && (
                <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4 text-left space-y-2 max-w-sm mx-auto">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Customer Name</span>
                    <span className="font-semibold text-white">{orderInfo.customer_name}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Verification Type</span>
                    <span className="font-semibold text-indigo-400 uppercase">{orderInfo.type}</span>
                  </div>
                </div>
              )}

              {/* Sandbox Controls */}
              <div className="border-t border-slate-800/80 pt-6 space-y-3">
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  Simulator Controls
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-lg shadow-emerald-900/20 py-5 transition-transform active:scale-95 duration-200"
                    onClick={() => handleDecision("verified")}
                    disabled={!!busy}
                  >
                    {busy === "verified" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Simulate Approved"
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full bg-rose-600 hover:bg-rose-500 text-white font-medium shadow-lg shadow-rose-900/20 py-5 transition-transform active:scale-95 duration-200"
                    onClick={() => handleDecision("rejected")}
                    disabled={!!busy}
                  >
                    {busy === "rejected" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Simulate Rejected"
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>

            <CardFooter className="justify-center border-t border-slate-800/80 bg-slate-950/20 py-4">
              <span className="text-[10px] text-slate-500 font-mono">
                SECURE END-TO-END SANDBOX ENCRYPTION
              </span>
            </CardFooter>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/85 bg-slate-950/30 py-4 text-center">
        <span className="text-xs text-slate-500">
          &copy; {new Date().getFullYear()} Dynime LLC. All rights reserved.
        </span>
      </footer>
    </div>
  );
};

export default VerifyOrderMockFlow;

import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import {
  ShieldCheck, ShieldAlert, IdCard, ArrowLeft, Loader2,
  Clock, AlertCircle, RefreshCw, Home, HelpCircle, Copy, Download, ExternalLink, Check
} from "lucide-react";
import SiteLogo from "@/components/shared/SiteLogo";
import { apiGet, apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";

interface VerificationDetails {
  status: "not_started" | "pending" | "verified" | "rejected" | "in_review" | "expired";
  type: "kyc" | "kyb" | "aml";
  verification_url: string;
  customer_name: string;
  invoice_number: string;
  session_id?: string;
}

const VerifyOrder = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const isDoneRedirect = searchParams.get("done") === "1";

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [data, setData] = useState<VerificationDetails | null>(null);

  const fetchStatus = async (showToast = false) => {
    if (!orderId) return;
    try {
      if (showToast) setSyncing(true);
      const url = `/orders/public/${orderId}/verification?sync_mock=true`;
      const res = await apiGet<VerificationDetails>(url);
      setData(res);
      
      if (showToast) {
        if (res.status === "verified") {
          toast.success("Identity verified successfully!");
        } else {
          toast.info(`Status synced: ${res.status.replace("_", " ")}`);
        }
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to retrieve verification details");
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchStatus(isDoneRedirect);
  }, [orderId, isDoneRedirect]);

  // Real-time updates using Supabase Realtime + Polling fallback
  useEffect(() => {
    if (!orderId || !data) return;

    // Only listen/poll if status is not final
    const isPending = data.status === "pending" || data.status === "in_review" || data.status === "not_started";
    if (!isPending) return;

    // 1. Real-time updates via NestJS Server-Sent Events (SSE)
    const sseUrl = `/api/v1/orders/public/sse`;
    const eventSource = new EventSource(sseUrl);
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload?.data?.event === "order-updated" && payload?.data?.data?.orderId === orderId) {
          fetchStatus();
        }
      } catch (err) {
        console.error("SSE parse error", err);
      }
    };

    // 2. Polling fallback (every 3 seconds - bulletproof for local development / proxy setups)
    const interval = setInterval(() => {
      fetchStatus();
    }, 3000);

    return () => {
      eventSource.close();
      clearInterval(interval);
    };
  }, [orderId, data?.status]);

  useEffect(() => {
    document.title = data
      ? `Verify Order ${data.invoice_number || ""} · Dynime`
      : "Order Verification · Dynime";
  }, [data]);


  const handleStartVerification = async () => {
    if (!orderId) return;
    try {
      setSyncing(true);
      const res = await apiPost<{ verification_url: string }>(
        `/orders/public/${orderId}/verification/start`,
        { origin: window.location.origin }
      );
      if (res?.verification_url) {
        window.location.href = res.verification_url;
      } else {
        toast.error("Verification URL not generated. Contact support.");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to initiate verification session");
    } finally {
      setSyncing(false);
    }
  };

  const handleCopyLink = async () => {
    if (!data?.verification_url) return;
    try {
      await navigator.clipboard.writeText(data.verification_url);
      setCopied(true);
      toast.success("Verification link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById("order-verification-qr");
    if (!svg) return;
    const svgString = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const URL = window.URL || window.webkitURL || window;
    const blobURL = URL.createObjectURL(svgBlob);
    
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 300;
      canvas.height = 300;
      const context = canvas.getContext("2d");
      if (context) {
        context.fillStyle = "#FFFFFF";
        context.fillRect(0, 0, 300, 300);
        context.drawImage(image, 10, 10, 280, 280);
        const png = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = png;
        downloadLink.download = `verification-qr-${data?.session_id || orderId}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
    };
    image.src = blobURL;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#090D1A] via-[#121829] to-[#1A1F38] text-slate-100 flex flex-col justify-between selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Premium Glassmorphic Header */}
      <header className="border-b border-slate-800/60 bg-[#0B0F19]/40 backdrop-blur-md sticky top-0 z-50 transition-all duration-300">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <SiteLogo className="h-6 w-auto transition-transform duration-300 group-hover:scale-105" />
          </Link>
          <Link
            to="/"
            className="text-xs font-semibold text-slate-400 hover:text-white transition-colors duration-200 flex items-center gap-1.5 px-3.5 py-2 rounded-xl hover:bg-slate-800/40 border border-transparent hover:border-slate-800/60"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to site
          </Link>
        </div>
      </header>

      {/* Main content area */}
      <main className="flex-1 container mx-auto px-4 py-16 flex items-center justify-center max-w-lg">
        {loading ? (
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            <p className="text-sm text-slate-400 font-medium tracking-wide">Loading secure verification details...</p>
          </div>
        ) : !data || data.status === "not_started" ? (
          <Card className="w-full border-slate-800 bg-[#0F172A]/70 backdrop-blur-xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-rose-500 to-pink-600" />
            <CardHeader className="text-center pt-8">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center mb-4">
                <AlertCircle className="w-7 h-7 text-rose-500" />
              </div>
              <CardTitle className="text-xl font-bold tracking-tight text-white">Session Not Found</CardTitle>
              <CardDescription className="text-slate-400 mt-2 text-sm leading-relaxed">
                We could not find an active identity verification session for this order link.
              </CardDescription>
            </CardHeader>
            <CardFooter className="justify-center pb-8 pt-4">
              <Button asChild className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-6 py-2.5 rounded-xl transition-all duration-200">
                <Link to="/">Go to Homepage</Link>
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <Card className="w-full border-slate-800/80 bg-[#0F172A]/60 backdrop-blur-xl shadow-2xl overflow-hidden relative transition-all duration-300">
            {/* Glowing Accent Bar */}
            <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
            
            <CardHeader className="text-center pb-4 pt-8">
              <CardTitle className="text-2xl font-bold tracking-tight text-white">Identity Verification</CardTitle>
              <CardDescription className="font-mono text-xs uppercase text-indigo-400/85 mt-2 tracking-widest font-semibold">
                Order Reference: {data.invoice_number}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 px-6">
              {/* Modern Glowing Status Card */}
              <div className={`rounded-xl border p-4 flex items-start gap-3.5 transition-all duration-300 ${
                data.status === "verified"
                  ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
                  : data.status === "pending" || data.status === "in_review"
                  ? "bg-amber-500/10 border-amber-500/25 text-amber-300 animate-pulse-slow"
                  : "bg-rose-500/10 border-rose-500/25 text-rose-300"
              }`}>
                {data.status === "verified" ? (
                  <ShieldCheck className="w-8.5 h-8.5 text-emerald-400 shrink-0 filter drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]" />
                ) : data.status === "pending" || data.status === "in_review" ? (
                  <Clock className="w-8.5 h-8.5 text-amber-400 shrink-0 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]" />
                ) : (
                  <ShieldAlert className="w-8.5 h-8.5 text-rose-400 shrink-0 filter drop-shadow-[0_0_8px_rgba(251,113,133,0.3)]" />
                )}
                
                <div className="space-y-1">
                  <h4 className="font-bold text-sm tracking-wide capitalize text-white">
                    Status: {data.status.replace("_", " ")}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed font-normal">
                    {data.status === "verified" && "Your identity has been verified successfully. Your order is now ready for processing. You may safely close this browser window."}
                    {data.status === "pending" && "Identity verification required. Scan the QR code with your mobile phone or click the button below to complete document submission on this device."}
                    {data.status === "in_review" && "Your documents are currently under review by our compliance team. This normally takes a few minutes."}
                    {data.status === "rejected" && "Verification was declined. Please submit again or contact support to resolve."}
                    {data.status === "expired" && "This verification link has expired. Please contact support or request a new verification link."}
                  </p>
                </div>
              </div>

              {/* QR Code Scan Area (KYC pending options) */}
              {data.status === "pending" && data.verification_url && (
                <div className="flex flex-col items-center justify-center p-4 bg-slate-950/40 rounded-xl border border-slate-800 space-y-4">
                  <div className="bg-white p-2.5 rounded-lg">
                    <QRCodeSVG
                      id="order-verification-qr"
                      value={data.verification_url}
                      size={140}
                      bgColor="#FFFFFF"
                      fgColor="#1E293B"
                      level="Q"
                      includeMargin={false}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider text-center">
                    Scan with Mobile Camera to Start
                  </div>
                  <div className="flex gap-2 w-full justify-center">
                    <Button
                      onClick={handleCopyLink}
                      variant="outline"
                      className="h-8 text-[11px] border-slate-800 bg-slate-900/40 hover:bg-slate-800 text-slate-300 font-medium px-3 rounded-lg"
                    >
                      {copied ? <Check className="h-3 w-3 mr-1 text-emerald-500" /> : <Copy className="h-3 w-3 mr-1" />}
                      Copy Link
                    </Button>
                    <Button
                      onClick={handleDownloadQR}
                      variant="outline"
                      className="h-8 text-[11px] border-slate-800 bg-slate-900/40 hover:bg-slate-800 text-slate-300 font-medium px-3 rounded-lg"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Download QR
                    </Button>
                  </div>
                </div>
              )}

              {/* Order Info Summary Box */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verification Details</h3>
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 divide-y divide-slate-800/60 overflow-hidden text-xs font-medium">
                  <div className="flex justify-between p-3.5">
                    <span className="text-slate-400">Customer Name</span>
                    <span className="text-slate-100">{data.customer_name}</span>
                  </div>
                  <div className="flex justify-between p-3.5">
                    <span className="text-slate-400">Verification Type</span>
                    <span className="text-indigo-400 uppercase tracking-wider font-semibold">
                      {data.type === "kyc" || data.type === "aml" ? "KYC (includes AML)" : data.type}
                    </span>
                  </div>
                  {data.session_id && (
                    <div className="flex justify-between p-3.5 items-center">
                      <span className="text-slate-400">Session ID</span>
                      <span className="text-slate-300 font-mono text-[10px]">{data.session_id}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2 pb-8 px-6">
              {(data.status === "pending" || data.status === "rejected") && (
                <Button
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-6 rounded-xl shadow-lg shadow-indigo-900/30 border-0 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 text-sm"
                  onClick={handleStartVerification}
                  disabled={syncing}
                >
                  {syncing ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <IdCard className="w-5 h-5 mr-2" />}
                  {data.status === "rejected" ? "Re-submit Identity Verification" : "Verify on This Device"}
                </Button>
              )}

              {data.status === "pending" && (
                <Button
                  className="w-full border-slate-800 bg-slate-950/20 hover:bg-slate-950/40 text-slate-300 font-semibold py-6 rounded-xl border transition-all duration-200 text-xs"
                  variant="outline"
                  onClick={() => fetchStatus(true)}
                  disabled={syncing}
                >
                  {syncing ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  I completed verification (Check Status)
                </Button>
              )}

              {(data.status === "verified" || data.status === "in_review") && (
                <div className="flex flex-col items-center gap-3 w-full">
                  {data.status === "in_review" && (
                    <Button
                      className="w-full border-slate-800 bg-slate-950/20 hover:bg-slate-950/40 text-slate-300 font-semibold py-6 rounded-xl border transition-all duration-200 text-xs"
                      variant="outline"
                      onClick={() => fetchStatus(true)}
                      disabled={syncing}
                    >
                      {syncing ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                      Check Review Status
                    </Button>
                  )}
                  <Button
                    asChild
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-6 rounded-xl transition-all duration-200 text-xs"
                  >
                    <Link to="/"><Home className="w-4 h-4 mr-2" /> Go to Homepage</Link>
                  </Button>
                </div>
              )}

              {(data.status === "rejected" || data.status === "expired") && (
                <Button
                  asChild
                  className="w-full bg-rose-950/20 hover:bg-rose-950/40 border-rose-800/40 text-rose-200 font-semibold py-6 rounded-xl border transition-all duration-200 text-xs"
                >
                  <a href="mailto:support@dynime.com"><HelpCircle className="w-4 h-4 mr-2" /> Contact Support</a>
                </Button>
              )}
            </CardFooter>
          </Card>
        )}
      </main>

      {/* Styled Footer */}
      <footer className="border-t border-slate-800/60 bg-[#0B0F19]/30 py-6 text-center">
        <span className="text-xs text-slate-500 font-medium">
          &copy; {new Date().getFullYear()} Dynime Tech. All rights reserved.
        </span>
      </footer>
    </div>
  );
};

export default VerifyOrder;

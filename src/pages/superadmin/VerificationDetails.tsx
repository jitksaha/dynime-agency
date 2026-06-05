import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { apiGet, apiPost } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from "qrcode.react";
import VerificationBadge from "@/components/verification/VerificationBadge";
import {
  ArrowLeft, Copy, Download, RefreshCw, Send, Mail, MessageSquare,
  Shield, Building2, Calendar, ClipboardList, Info, History, Code, CheckCircle, Check
} from "lucide-react";
import { toast } from "sonner";

const VerificationDetails = () => {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  const { data: request, isLoading, error } = useQuery({
    queryKey: ["verification-details", id],
    queryFn: () => apiGet<any>(`/verification/admin/requests/${id}`),
    refetchInterval: 5000,
    enabled: !!id,
  });

  const handleCopyLink = async () => {
    if (!request?.verification_url) return;
    try {
      await navigator.clipboard.writeText(request.verification_url);
      setCopied(true);
      toast.success("Verification link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById("verification-qr-svg");
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
        downloadLink.download = `didit-qr-${request?.didit_session_id || id}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
    };
    image.src = blobURL;
  };

  const handleSyncSession = async () => {
    setSyncing(true);
    toast.info("Synchronizing status with Didit compliance engine...");
    try {
      const result = await apiPost<{ success: boolean; status: string }>(
        `/verification/admin/requests/${id}/sync`
      );
      if (result?.success) {
        toast.success(`Session synchronized. Status: ${result.status}`);
        qc.invalidateQueries({ queryKey: ["verification-details", id] });
      } else {
        toast.error("Status synchronization failed");
      }
    } catch (e: any) {
      toast.error(e?.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleResendEmail = async () => {
    setSendingEmail(true);
    try {
      const result = await apiPost<{ success: boolean; recipient: string }>(
        `/verification/admin/requests/${id}/email`
      );
      if (result?.success) {
        toast.success(`Verification email reminder simulated to ${result.recipient}`);
        qc.invalidateQueries({ queryKey: ["verification-details", id] });
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to trigger email simulation");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSimulateWhatsApp = () => {
    setSendingMessage(true);
    setTimeout(() => {
      toast.success(`Simulated WhatsApp notification sent with verification link to customer.`);
      setSendingMessage(false);
    }, 1000);
  };

  if (isLoading) {
    return (
      <SuperAdminLayout>
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading verification dossier...</p>
        </div>
      </SuperAdminLayout>
    );
  }

  if (error || !request) {
    return (
      <SuperAdminLayout>
        <div className="text-center py-20 space-y-4">
          <Info className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-lg font-semibold text-foreground">Dossier Retrieval Failed</h2>
          <p className="text-sm text-muted-foreground">Could not load the requested verification record.</p>
          <Button asChild variant="outline">
            <Link to="/superadmin/verifications">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to List
            </Link>
          </Button>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        {/* Back Link */}
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" className="h-9 px-3 hover:bg-muted text-muted-foreground hover:text-foreground">
            <Link to="/superadmin/verifications" className="flex items-center gap-1.5 text-xs font-semibold">
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Link>
          </Button>
        </div>

        {/* Header Title Card */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-muted/30 pb-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">Verification Dossier</h1>
              <Badge variant="outline" className="border-muted bg-muted/20 text-xs px-2.5 py-0.5">
                Session ID: {request.didit_session_id || "Unassigned"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Initiate actions, audit live status decisions, and view compliance timelines.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleSyncSession}
              disabled={syncing}
              variant="outline"
              className="h-9 text-xs font-medium hover:bg-muted border-muted/50"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncing ? "animate-spin text-primary" : "text-muted-foreground"}`} />
              Sync Status
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: General Info and QR */}
          <div className="lg:col-span-2 space-y-6">
            {/* General Info Card */}
            <Card className="border-muted/50 shadow bg-card/30 backdrop-blur-md">
              <CardHeader className="pb-3 border-b border-muted/20">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  General Information
                </CardTitle>
                <CardDescription className="text-xs">Compliance request parameters</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 pt-4 text-sm">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Customer Profile</label>
                  {request.profiles ? (
                    <div className="space-y-0.5">
                      <div className="font-semibold text-foreground flex items-center gap-1">
                        <Shield className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        {request.profiles.full_name || "Anonymous User"}
                      </div>
                      <div className="text-xs font-mono text-muted-foreground">{request.profiles.email}</div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs font-mono">—</span>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Verification Type</label>
                  <div className="flex items-center gap-1.5">
                    {request.type === "kyb" ? (
                      <Badge variant="outline" className="border-purple-500/25 bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold px-2 py-0.5 text-xs">
                        <Building2 className="h-3 w-3 mr-1" /> KYB Business
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-blue-500/25 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold px-2 py-0.5 text-xs">
                        <Shield className="h-3 w-3 mr-1" /> KYC Individual
                      </Badge>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Service Order Context</label>
                  {request.orders ? (
                    <div className="space-y-0.5">
                      <Link to={`/superadmin/orders/${request.orders.id}`} className="font-semibold text-primary hover:underline flex items-center gap-1">
                        Invoice #{request.orders.invoice_number}
                      </Link>
                      <div className="text-xs text-muted-foreground">Order Total: ${parseFloat(request.orders.total).toFixed(2)}</div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">No linked order</span>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Compliance Case ID</label>
                  <span className="text-xs font-mono select-all bg-muted px-2 py-0.5 rounded border border-muted-foreground/10 text-foreground">
                    {request.compliance_case_id || "None Assigned"}
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Created Date</label>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground/75" />
                    {new Date(request.created_at).toLocaleString()}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Last Update</label>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground/75" />
                    {new Date(request.updated_at).toLocaleString()}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Didit Status Details */}
            <Card className="border-muted/50 shadow bg-card/30 backdrop-blur-md">
              <CardHeader className="pb-3 border-b border-muted/20">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                  <Info className="h-4 w-4 text-primary" />
                  Didit Compliance Status
                </CardTitle>
                <CardDescription className="text-xs">compliance engine decisions and session URLs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4 text-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/20 p-3 rounded-lg border border-muted/40">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground block font-medium">Current Status Decision</span>
                    <VerificationBadge status={request.status} />
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground block font-medium">Compliance Engine Reason</span>
                    <span className="text-sm font-semibold font-mono text-foreground">{request.decision || "Awaiting submission"}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Workflow ID</label>
                  <span className="text-xs font-mono text-muted-foreground">{request.workflow_id || "N/A"}</span>
                </div>

                {request.verification_url && (
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Verification URL</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        readOnly
                        value={request.verification_url}
                        className="bg-muted border border-muted-foreground/20 rounded p-1.5 text-xs text-muted-foreground select-all font-mono grow"
                      />
                      <Button size="icon" variant="outline" className="h-8 w-8 hover:bg-muted" onClick={handleCopyLink}>
                        {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                      <Button size="icon" variant="outline" className="h-8 w-8 hover:bg-muted" asChild>
                        <a href={request.verification_url} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Webhook Events Logs Card */}
            <Card className="border-muted/50 shadow bg-card/30 backdrop-blur-md">
              <CardHeader className="pb-3 border-b border-muted/20">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                  <Code className="h-4 w-4 text-primary" />
                  Raw Webhook Events
                </CardTitle>
                <CardDescription className="text-xs">Logged Didit webhook payloads received for this session</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {request.events && request.events.length > 0 ? (
                  <div className="space-y-3">
                    {request.events.map((evt: any) => (
                      <details key={evt.id} className="group border border-muted/40 rounded-lg overflow-hidden bg-card/20 hover:border-muted-foreground/20 transition-colors">
                        <summary className="flex items-center justify-between p-3 cursor-pointer select-none text-xs font-semibold text-foreground/80 hover:text-foreground">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-[10px] uppercase bg-primary/10 border-primary/20 text-primary">
                              {evt.webhook_type}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground">
                              {new Date(evt.created_at).toLocaleString()}
                            </span>
                          </div>
                          <span className="text-muted-foreground group-open:rotate-180 transition-transform">▼</span>
                        </summary>
                        <div className="border-t border-muted/20 p-3 bg-muted/40 overflow-x-auto">
                          <pre className="text-[10px] font-mono text-muted-foreground select-all">
                            {JSON.stringify(evt.payload, null, 2)}
                          </pre>
                        </div>
                      </details>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    No webhooks received for this session yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: QR and Audit Timeline */}
          <div className="space-y-6">
            {/* QR Card */}
            <Card className="border-muted/50 shadow bg-card/30 backdrop-blur-md text-center">
              <CardHeader className="pb-2 border-b border-muted/20">
                <CardTitle className="text-base font-semibold text-foreground">Verification QR Code</CardTitle>
                <CardDescription className="text-xs">Scan using mobile device to complete identity verification</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center pt-6 space-y-4">
                {request.verification_url ? (
                  <>
                    <div className="bg-white p-3 rounded-xl border-4 border-muted/40 shadow-inner flex items-center justify-center">
                      <QRCodeSVG
                        id="verification-qr-svg"
                        value={request.verification_url}
                        size={180}
                        bgColor="#FFFFFF"
                        fgColor="#1E293B"
                        level="Q"
                        includeMargin={false}
                      />
                    </div>
                    <div className="w-full grid grid-cols-2 gap-2">
                      <Button onClick={handleCopyLink} variant="outline" className="h-9 text-xs border-muted/65 hover:bg-muted w-full font-medium">
                        <Copy className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                        Copy Link
                      </Button>
                      <Button onClick={handleDownloadQR} variant="outline" className="h-9 text-xs border-muted/65 hover:bg-muted w-full font-medium">
                        <Download className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                        Download
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="py-12 text-xs text-muted-foreground">QR code unavailable</div>
                )}
              </CardContent>
            </Card>

            {/* Messaging simulator */}
            <Card className="border-muted/50 shadow bg-card/30 backdrop-blur-md">
              <CardHeader className="pb-3 border-b border-muted/20">
                <CardTitle className="text-base font-semibold text-foreground">Dispatch Link</CardTitle>
                <CardDescription className="text-xs">Send verification request directly to customer</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                <Button
                  onClick={handleResendEmail}
                  disabled={sendingEmail || !request.verification_url}
                  variant="outline"
                  className="w-full justify-start h-10 text-xs border-muted/40 hover:bg-muted font-medium"
                >
                  <Mail className="h-4 w-4 mr-2 text-blue-500" />
                  {sendingEmail ? "Simulating Dispatch..." : "Resend Email Notification"}
                </Button>

                <Button
                  onClick={handleSimulateWhatsApp}
                  disabled={sendingMessage || !request.verification_url}
                  variant="outline"
                  className="w-full justify-start h-10 text-xs border-muted/40 hover:bg-muted font-medium"
                >
                  <MessageSquare className="h-4 w-4 mr-2 text-emerald-500" />
                  {sendingMessage ? "Simulating WhatsApp..." : "Send via WhatsApp"}
                </Button>
              </CardContent>
            </Card>

            {/* Audit Trail Timeline */}
            <Card className="border-muted/50 shadow bg-card/30 backdrop-blur-md">
              <CardHeader className="pb-3 border-b border-muted/20">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                  <History className="h-4 w-4 text-primary" />
                  Audit Trail
                </CardTitle>
                <CardDescription className="text-xs">Verification dossier lifecycle timeline</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {request.logs && request.logs.length > 0 ? (
                  <div className="relative border-l border-muted/80 ml-2.5 pl-4 space-y-5">
                    {request.logs.map((log: any) => {
                      let iconColor = "bg-primary/20 border-primary text-primary";
                      if (log.action === "approved" || log.action === "order_updated") {
                        iconColor = "bg-emerald-500/20 border-emerald-500 text-emerald-500";
                      } else if (log.action === "declined" || log.action === "order_flagged") {
                        iconColor = "bg-destructive/20 border-destructive text-destructive";
                      }
                      
                      return (
                        <div key={log.id} className="relative text-xs">
                          {/* Dot indicator */}
                          <div className={`absolute -left-[22.5px] top-0.5 rounded-full border-2 w-3.5 h-3.5 ${iconColor}`} />
                          <div className="space-y-0.5">
                            <span className="font-semibold text-foreground/80 block uppercase text-[10px] tracking-wider">
                              {log.action.replace(/_/g, " ")}
                            </span>
                            <p className="text-muted-foreground font-medium leading-relaxed">
                              {log.description}
                            </p>
                            <span className="text-[10px] text-muted-foreground block font-mono">
                              {new Date(log.created_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    No lifecycle logs recorded.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
};

export default VerificationDetails;

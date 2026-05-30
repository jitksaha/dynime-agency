// Generates a branded PDF investment agreement for Dynime Technologies Limited
// and stores it in the private `investor-documents` storage bucket.
//
// Body: { investment_id: string, action?: "preview" | "sign", signer_name?: string }
//   - "preview": generate (or regenerate) the unsigned agreement PDF
//   - "sign": generate a signed copy, stamp signature block, mark investment signed
//
// Auth: requires the investor's JWT (or admin). Uses service role to write storage
// and to update the investments row after verifying ownership.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
import { z } from "npm:zod@3.23.8";

const BodySchema = z.object({
  investment_id: z.string().uuid(),
  action: z.enum(["preview", "sign"]).default("preview"),
  signer_name: z.string().min(2).max(120).optional(),
});

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const BUCKET = "investor-documents";

const fmtMoney = (n: number, c = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: c, maximumFractionDigits: 2 }).format(n || 0);
const fmtDate = (d: Date) => d.toISOString().slice(0, 10);

interface BuildArgs {
  investment: any;
  investorName: string;
  investorEmail: string;
  signed: boolean;
  signerName?: string;
  signedAt?: Date;
  signedIp?: string;
}

async function buildAgreementPdf(args: BuildArgs): Promise<Uint8Array> {
  const { investment, investorName, investorEmail, signed, signerName, signedAt, signedIp } = args;

  const pdf = await PDFDocument.create();
  pdf.setTitle(`Dynime Investment Agreement – ${investment.plan_name}`);
  pdf.setAuthor("Dynime Technologies Limited");
  pdf.setSubject("Investment Agreement");
  pdf.setCreator("Dynime Investor Portal");

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const brand = rgb(0.07, 0.36, 0.82);   // deep blue
  const ink = rgb(0.10, 0.12, 0.18);
  const muted = rgb(0.40, 0.43, 0.50);
  const accent = rgb(0.95, 0.96, 0.99);

  // Embed Dynime logo (PNG served from the public site) into the brand bar.
  // Failure to fetch must NOT block PDF generation — fall back to text-only header.
  let logoImage: Awaited<ReturnType<typeof pdf.embedPng>> | null = null;
  try {
    const res = await fetch("https://dynime.com/favicon.png");
    if (res.ok) {
      const bytes = new Uint8Array(await res.arrayBuffer());
      logoImage = await pdf.embedPng(bytes);
    }
  } catch (_e) { /* ignore — header falls back to text */ }

  let page = pdf.addPage([595, 842]); // A4
  const W = 595, H = 842, M = 50;
  let y = H - M;

  const newPageIfNeeded = (need: number) => {
    if (y - need < M + 40) {
      drawFooter();
      page = pdf.addPage([595, 842]);
      y = H - M;
      drawHeader(false);
    }
  };

  const drawHeader = (first: boolean) => {
    // brand bar
    page.drawRectangle({ x: 0, y: H - 70, width: W, height: 70, color: brand });
    let textX = M;
    if (logoImage) {
      const logoH = 36;
      const logoDims = logoImage.scale(logoH / logoImage.height);
      page.drawImage(logoImage, { x: M, y: H - 53, width: logoDims.width, height: logoH });
      textX = M + logoDims.width + 12;
    }
    page.drawText("DYNIME", { x: textX, y: H - 40, size: 22, font: bold, color: rgb(1, 1, 1) });
    page.drawText("TECHNOLOGIES LIMITED", { x: textX + 95, y: H - 38, size: 11, font: font, color: rgb(1, 1, 1) });
    page.drawText("Investor Agreement", { x: W - M - 130, y: H - 40, size: 12, font: bold, color: rgb(1, 1, 1) });
    y = H - 90;
    void first;
  };

  const drawFooter = () => {
    page.drawLine({ start: { x: M, y: 50 }, end: { x: W - M, y: 50 }, thickness: 0.5, color: muted });
    page.drawText("Dynime Technologies Limited  •  investors@dynime.com  •  www.dynime.com",
      { x: M, y: 36, size: 8, font, color: muted });
    page.drawText(`Agreement #${String(investment.id).slice(0, 8).toUpperCase()}`,
      { x: W - M - 140, y: 36, size: 8, font, color: muted });
  };

  const drawHeading = (text: string) => {
    newPageIfNeeded(28);
    page.drawText(text, { x: M, y, size: 13, font: bold, color: brand });
    y -= 6;
    page.drawLine({ start: { x: M, y: y }, end: { x: M + 60, y: y }, thickness: 1.5, color: brand });
    y -= 16;
  };

  const drawParagraph = (text: string, size = 10, color = ink) => {
    const maxWidth = W - M * 2;
    const words = text.split(/\s+/);
    let line = "";
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (font.widthOfTextAtSize(test, size) > maxWidth) {
        newPageIfNeeded(size + 4);
        page.drawText(line, { x: M, y, size, font, color });
        y -= size + 4;
        line = w;
      } else {
        line = test;
      }
    }
    if (line) {
      newPageIfNeeded(size + 4);
      page.drawText(line, { x: M, y, size, font, color });
      y -= size + 6;
    }
  };

  const drawKeyValueBox = (rows: [string, string][]) => {
    const rowH = 22;
    const boxH = rows.length * rowH + 10;
    newPageIfNeeded(boxH + 10);
    page.drawRectangle({ x: M, y: y - boxH, width: W - M * 2, height: boxH, color: accent });
    let ry = y - 18;
    for (const [k, v] of rows) {
      page.drawText(k, { x: M + 12, y: ry, size: 9.5, font: bold, color: muted });
      page.drawText(v, { x: M + 180, y: ry, size: 10.5, font: bold, color: ink });
      ry -= rowH;
    }
    y -= boxH + 12;
  };

  // ---- Render ----
  drawHeader(true);

  // Title block
  page.drawText("INVESTMENT AGREEMENT", { x: M, y, size: 20, font: bold, color: ink });
  y -= 22;
  page.drawText(`Plan: ${investment.plan_name}`, { x: M, y, size: 12, font, color: muted });
  y -= 24;

  drawParagraph(
    `This Investment Agreement (the "Agreement") is made and entered into on ${fmtDate(new Date())} by and between Dynime Technologies Limited, a technology company duly organised and existing under applicable law (hereinafter the "Company"), and the undersigned investor (hereinafter the "Investor"). By signing this Agreement, the Investor agrees to be bound by the terms and conditions set forth below.`,
  );

  // Parties
  drawHeading("1. Parties & Investment Summary");
  drawKeyValueBox([
    ["Investor Name", investorName || "—"],
    ["Investor Email", investorEmail || "—"],
    ["Investment Plan", investment.plan_name],
    ["Principal Amount", fmtMoney(Number(investment.amount), investment.currency)],
    ["Currency", investment.currency || "USD"],
    ["Lock Period", `${investment.lock_period_months ?? 0} months`],
    ["Payout Frequency", investment.payout_frequency || "monthly"],
    ["Monthly Return", investment.monthly_return_percent != null ? `${investment.monthly_return_percent}%` : "Profit-share basis"],
    ["Biannual Bonus", investment.bonus_percent_biannual ? `${investment.bonus_percent_biannual}% (every 6 months)` : "—"],
  ]);

  // Terms
  drawHeading("2. Returns & Payout Schedule");
  drawParagraph("The Company shall pay the Investor monthly returns calculated on the Principal Amount at the agreed rate stated above. Where the plan provides for a biannual bonus, an additional 1% (or as specified) shall be credited every six (6) months on top of the regular monthly return. Returns are credited to the Investor's portal balance and are payable to the Investor's nominated bank account on the agreed schedule.");

  drawHeading("3. Lock-In Period & Principal Return");
  drawParagraph("The Principal Amount shall remain invested for the duration of the lock-in period. Upon successful completion of the lock-in period, the Company shall return the full Principal Amount to the Investor within thirty (30) business days, less any taxes, fees or amounts already disbursed at the Investor's instruction. Early withdrawal requests during the lock-in period may be subject to administrative review and partial penalties.");

  drawHeading("4. Profit-Share Plans");
  drawParagraph("Where the Investor selects a profit-share plan, returns shall be calculated as a percentage of net revenue generated by the relevant business unit (Web Development 30%, Marketing Services 20%, Consulting Services 10%, or as updated by the Company). Profit-share statements shall be issued each month through the Investor Portal and final settlement shall occur on the agreed payout cycle.");

  drawHeading("5. Risk Disclosure");
  drawParagraph("The Investor acknowledges that all investments carry risk, including the possible loss of capital. Past performance is not indicative of future results. The Company makes commercially reasonable efforts to deliver the agreed returns but does not guarantee profit beyond the contractually committed rates. The Investor confirms they have read and understood this risk disclosure.");

  drawHeading("6. Confidentiality");
  drawParagraph("Both parties shall maintain strict confidentiality regarding the commercial terms of this Agreement, the Company's financial information, client lists, technology stack and any non-public information disclosed during the term of this Agreement.");

  drawHeading("7. Governing Law & Dispute Resolution");
  drawParagraph("This Agreement shall be governed by and construed in accordance with the laws of the jurisdiction in which Dynime Technologies Limited is registered. Any dispute arising out of or in connection with this Agreement shall first be resolved through good-faith negotiation, and failing that, through binding arbitration.");

  drawHeading("8. Termination");
  drawParagraph("This Agreement shall remain in force until the Principal Amount has been returned and all outstanding payouts have been settled. The Company reserves the right to terminate this Agreement in case of fraud, misrepresentation, breach of confidentiality or violation of applicable law by the Investor.");

  // Signature block
  newPageIfNeeded(180);
  drawHeading("9. Signatures");

  const sigBoxY = y - 110;
  // Investor signature box
  page.drawRectangle({ x: M, y: sigBoxY, width: 230, height: 100, borderColor: muted, borderWidth: 0.8 });
  page.drawText("Investor Signature", { x: M + 8, y: sigBoxY + 86, size: 9, font: bold, color: muted });
  if (signed && signerName) {
    page.drawText(signerName, { x: M + 14, y: sigBoxY + 50, size: 18, font: italic, color: brand });
    page.drawLine({ start: { x: M + 10, y: sigBoxY + 44 }, end: { x: M + 220, y: sigBoxY + 44 }, thickness: 0.5, color: muted });
    page.drawText(`Name: ${signerName}`, { x: M + 10, y: sigBoxY + 28, size: 8.5, font, color: ink });
    page.drawText(`Date: ${fmtDate(signedAt!)}`, { x: M + 10, y: sigBoxY + 16, size: 8.5, font, color: ink });
    if (signedIp) page.drawText(`IP: ${signedIp}`, { x: M + 10, y: sigBoxY + 6, size: 8, font, color: muted });
  } else {
    page.drawText("[ Awaiting signature ]", { x: M + 14, y: sigBoxY + 50, size: 11, font: italic, color: muted });
    page.drawLine({ start: { x: M + 10, y: sigBoxY + 44 }, end: { x: M + 220, y: sigBoxY + 44 }, thickness: 0.5, color: muted });
    page.drawText("Signature", { x: M + 10, y: sigBoxY + 28, size: 8.5, font, color: muted });
  }

  // Company signature box
  const cx = M + 250;
  page.drawRectangle({ x: cx, y: sigBoxY, width: 230, height: 100, borderColor: muted, borderWidth: 0.8 });
  page.drawText("For Dynime Technologies Limited", { x: cx + 8, y: sigBoxY + 86, size: 9, font: bold, color: muted });
  page.drawText("Authorised Signatory", { x: cx + 14, y: sigBoxY + 50, size: 14, font: italic, color: brand });
  page.drawLine({ start: { x: cx + 10, y: sigBoxY + 44 }, end: { x: cx + 220, y: sigBoxY + 44 }, thickness: 0.5, color: muted });
  page.drawText("Director, Dynime Technologies Limited", { x: cx + 10, y: sigBoxY + 28, size: 8.5, font, color: ink });
  page.drawText(`Date: ${fmtDate(new Date())}`, { x: cx + 10, y: sigBoxY + 16, size: 8.5, font, color: ink });

  if (signed) {
    // green stamp
    page.drawRectangle({ x: W - M - 150, y: sigBoxY + 110, width: 150, height: 36, color: rgb(0.86, 0.96, 0.88), borderColor: rgb(0.13, 0.6, 0.32), borderWidth: 1 });
    page.drawText("DIGITALLY SIGNED", { x: W - M - 138, y: sigBoxY + 130, size: 11, font: bold, color: rgb(0.13, 0.6, 0.32) });
    page.drawText(signedAt ? signedAt.toISOString().slice(0, 19).replace("T", " ") + " UTC" : "", { x: W - M - 138, y: sigBoxY + 117, size: 7.5, font, color: rgb(0.13, 0.6, 0.32) });
  }

  drawFooter();
  return await pdf.save();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) {
      return new Response(JSON.stringify({ error: "Missing Authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { investment_id, action, signer_name } = parsed.data;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Load investment
    const { data: inv, error: invErr } = await admin
      .from("investments")
      .select("*")
      .eq("id", investment_id)
      .maybeSingle();
    if (invErr || !inv) {
      return new Response(JSON.stringify({ error: "Investment not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify ownership (or admin)
    const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: user.id });
    if (inv.investor_id !== user.id && !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Investor profile for name/email
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, email")
      .eq("id", inv.investor_id)
      .maybeSingle();

    const investorEmail = profile?.email || user.email || "";
    const investorName = signer_name || profile?.full_name || investorEmail.split("@")[0] || "Investor";

    if (action === "sign" && !signer_name) {
      return new Response(JSON.stringify({ error: "signer_name required to sign" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const signedAt = new Date();
    const signedIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      undefined;

    const pdfBytes = await buildAgreementPdf({
      investment: inv,
      investorName,
      investorEmail,
      signed: action === "sign",
      signerName: action === "sign" ? signer_name : undefined,
      signedAt,
      signedIp: signedIp ?? undefined,
    });

    const suffix = action === "sign" ? "signed" : "draft";
    const path = `${inv.investor_id}/agreements/${inv.id}-${suffix}-${Date.now()}.pdf`;

    const { error: upErr } = await admin.storage
      .from(BUCKET)
      .upload(path, pdfBytes, { contentType: "application/pdf", upsert: true });
    if (upErr) {
      return new Response(JSON.stringify({ error: `Storage upload failed: ${upErr.message}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update investment row
    const updates: Record<string, unknown> = { agreement_pdf_path: path, updated_at: new Date().toISOString() };
    if (action === "sign") {
      updates.agreement_status = "signed";
      updates.agreement_signed_at = signedAt.toISOString();
      updates.agreement_signed_by_name = signer_name;
      updates.agreement_signed_ip = signedIp ?? null;
      if (!inv.started_at) updates.started_at = signedAt.toISOString();
      if (inv.status === "pending") updates.status = "active";
    }
    const { error: updErr } = await admin.from("investments").update(updates).eq("id", inv.id);
    if (updErr) {
      return new Response(JSON.stringify({ error: `DB update failed: ${updErr.message}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Signed url for client to view/download
    const { data: signedUrl } = await admin.storage.from(BUCKET).createSignedUrl(path, 60 * 60);

    return new Response(
      JSON.stringify({
        ok: true,
        path,
        signed_url: signedUrl?.signedUrl ?? null,
        agreement_status: action === "sign" ? "signed" : inv.agreement_status,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate-investment-agreement error", e);
    return new Response(JSON.stringify({ error: (e as Error).message ?? "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

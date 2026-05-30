// Issues and (optionally) emails an HR document — offer, agreement, payslip,
// experience or relieving letter. Renders a branded PDF, stores it in the
// hr-documents bucket, inserts an hr_documents row, and emails the employee.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
import { z } from "npm:zod@3.23.8";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const BUCKET = "hr-documents";

const PayLine = z.object({ label: z.string(), type: z.enum(["fixed", "percent"]), value: z.number() });
const Extra = z.object({ label: z.string(), amount: z.number() });
const Clause = z.object({ title: z.string(), body: z.string() });

const BodySchema = z.union([
  z.object({ resend_document_id: z.string().uuid() }),
  z.object({
    employee_id: z.string().uuid(),
    kind: z.enum(["offer", "agreement", "payslip", "experience", "relieving"]),
    issue_date: z.string(),
    effective_date: z.string().nullable().optional(),
    period_month: z.string().nullable().optional(),
    body_text: z.string().nullable().optional(),
    clauses: z.array(Clause).nullable().optional(),
    validity_date: z.string().nullable().optional(),
    extra_earnings: z.array(Extra).nullable().optional(),
    extra_deductions: z.array(Extra).nullable().optional(),
    send_email: z.boolean().default(false),
  }),
]);

const fmtMoney = (n: number, c = "USD") => {
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(n || 0); }
  catch { return `${c} ${(n || 0).toFixed(2)}`; }
};
const fmtDate = (s?: string | null) => s ? new Date(s).toISOString().slice(0, 10) : "—";
const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

function computePayslip(gross: number, allowances: any[], deductions: any[], extraE: any[], extraD: any[]) {
  const earnings = [{ label: "Basic Salary", amount: round2(gross) }];
  for (const a of allowances || []) earnings.push({ label: a.label, amount: round2(a.type === "percent" ? gross * Number(a.value) / 100 : Number(a.value)) });
  for (const e of extraE || []) earnings.push({ label: e.label, amount: round2(e.amount) });
  const grossSum = round2(earnings.reduce((s, e) => s + e.amount, 0));
  const ded: { label: string; amount: number }[] = [];
  for (const d of deductions || []) ded.push({ label: d.label, amount: round2(d.type === "percent" ? grossSum * Number(d.value) / 100 : Number(d.value)) });
  for (const d of extraD || []) ded.push({ label: d.label, amount: round2(d.amount) });
  const totalDed = round2(ded.reduce((s, d) => s + d.amount, 0));
  return { earnings, deductions: ded, gross: grossSum, totalDeductions: totalDed, net: round2(grossSum - totalDed) };
}

const TITLES: Record<string, string> = {
  offer: "Letter of Offer", agreement: "Employment Agreement", payslip: "Payslip",
  experience: "Experience Letter", relieving: "Relieving Letter",
};

async function buildPdf(opts: {
  kind: string; docNumber: string; employee: any; issueDate: string; effectiveDate?: string | null;
  periodMonth?: string | null; bodyText?: string | null; clauses?: { title: string; body: string }[] | null;
  validityDate?: string | null; payslip?: any; companyName: string; companyEmail: string;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${TITLES[opts.kind]} – ${opts.employee.full_name}`);
  pdf.setAuthor(opts.companyName);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const brand = rgb(0.07, 0.36, 0.82);
  const ink = rgb(0.10, 0.12, 0.18);
  const muted = rgb(0.40, 0.43, 0.50);
  const accent = rgb(0.95, 0.96, 0.99);

  let logo: any = null;
  try { const r = await fetch("https://dynime.com/favicon.png"); if (r.ok) logo = await pdf.embedPng(new Uint8Array(await r.arrayBuffer())); } catch {}

  let page = pdf.addPage([595, 842]);
  const W = 595, H = 842, M = 50;
  let y = H - M;

  const newPageIfNeeded = (need: number) => { if (y - need < M + 40) { page = pdf.addPage([595, 842]); y = H - M; drawHeader(); } };
  const drawHeader = () => {
    page.drawRectangle({ x: 0, y: H - 70, width: W, height: 70, color: brand });
    let tx = M;
    if (logo) { const h = 36; const d = logo.scale(h / logo.height); page.drawImage(logo, { x: M, y: H - 53, width: d.width, height: h }); tx = M + d.width + 12; }
    page.drawText(opts.companyName.toUpperCase(), { x: tx, y: H - 40, size: 14, font: bold, color: rgb(1, 1, 1) });
    page.drawText(TITLES[opts.kind], { x: W - M - 150, y: H - 40, size: 11, font: bold, color: rgb(1, 1, 1) });
    page.drawText(opts.docNumber, { x: W - M - 150, y: H - 56, size: 9, font, color: rgb(1, 1, 1) });
    y = H - 90;
  };
  const drawFooter = () => {
    page.drawLine({ start: { x: M, y: 50 }, end: { x: W - M, y: 50 }, thickness: 0.5, color: muted });
    page.drawText(`${opts.companyName}  •  ${opts.companyEmail}`, { x: M, y: 36, size: 8, font, color: muted });
    page.drawText(opts.docNumber, { x: W - M - 90, y: 36, size: 8, font, color: muted });
  };
  const drawHeading = (t: string) => { newPageIfNeeded(28); page.drawText(t, { x: M, y, size: 12, font: bold, color: brand }); y -= 18; };
  const drawPara = (t: string, size = 10) => {
    const max = W - M * 2;
    const words = t.split(/\s+/);
    let line = "";
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (font.widthOfTextAtSize(test, size) > max) { newPageIfNeeded(size + 4); page.drawText(line, { x: M, y, size, font, color: ink }); y -= size + 4; line = w; }
      else line = test;
    }
    if (line) { newPageIfNeeded(size + 4); page.drawText(line, { x: M, y, size, font, color: ink }); y -= size + 6; }
  };
  const drawKV = (rows: [string, string][]) => {
    const rh = 20, bh = rows.length * rh + 10;
    newPageIfNeeded(bh + 10);
    page.drawRectangle({ x: M, y: y - bh, width: W - M * 2, height: bh, color: accent });
    let ry = y - 16;
    for (const [k, v] of rows) {
      page.drawText(k, { x: M + 12, y: ry, size: 9, font: bold, color: muted });
      page.drawText(v, { x: M + 180, y: ry, size: 10, font, color: ink });
      ry -= rh;
    }
    y -= bh + 12;
  };

  drawHeader();

  const emp = opts.employee;
  const cur = emp.currency || "USD";
  page.drawText(emp.full_name, { x: M, y, size: 16, font: bold, color: ink }); y -= 18;
  if (emp.designation) { page.drawText(emp.designation, { x: M, y, size: 10, font, color: muted }); y -= 14; }
  y -= 6;

  if (opts.kind === "offer") {
    drawPara(`Dear ${emp.full_name.split(" ")[0]},`);
    drawPara(`We are delighted to offer you the position of ${emp.designation || "—"}${emp.department ? ` in the ${emp.department} department` : ""} at ${opts.companyName}.`);
    drawKV([
      ["Designation", emp.designation || "—"],
      ["Department", emp.department || "—"],
      ["Employment type", emp.employment_type || "—"],
      ["Job type", emp.job_type || "—"],
      ["Work location", emp.work_location || "—"],
      ["Joining date", fmtDate(emp.joining_date)],
      ["Reporting to", emp.reporting_to || "—"],
      ["Gross salary", `${fmtMoney(Number(emp.gross_salary), cur)} / month`],
    ]);
    if (opts.bodyText) drawPara(opts.bodyText);
    if (opts.validityDate) drawPara(`This offer is valid until ${fmtDate(opts.validityDate)}.`);
  } else if (opts.kind === "agreement") {
    drawPara(`This Employment Agreement is entered into on ${fmtDate(opts.effectiveDate || opts.issueDate)} between ${opts.companyName} and ${emp.full_name}.`);
    drawKV([
      ["Designation", emp.designation || "—"],
      ["Joining date", fmtDate(emp.joining_date)],
      ["Employment type", emp.employment_type || "—"],
      ["Job type", emp.job_type || "—"],
      ["Work location", emp.work_location || "—"],
      ["Gross salary", `${fmtMoney(Number(emp.gross_salary), cur)} / month`],
    ]);
    if (opts.bodyText) drawPara(opts.bodyText);
    (opts.clauses || []).forEach((c, i) => {
      drawHeading(`${i + 1}. ${c.title}`);
      drawPara(c.body);
    });
  } else if (opts.kind === "experience" || opts.kind === "relieving") {
    drawPara(`This is to certify that ${emp.full_name}${emp.employee_code ? ` (${emp.employee_code})` : ""} was employed with ${opts.companyName} as ${emp.designation || "—"}${emp.department ? ` in the ${emp.department} department` : ""} from ${fmtDate(emp.joining_date)} to ${fmtDate(emp.last_working_day || opts.issueDate)}.`);
    drawPara("During their tenure, we found them to be sincere, hardworking and professional. Their conduct and performance throughout the period of service were satisfactory.");
    if (opts.kind === "relieving") drawPara(`They have been duly relieved of all their duties with effect from ${fmtDate(emp.last_working_day || opts.issueDate)}. All company dues have been settled.`);
    if (opts.bodyText) drawPara(opts.bodyText);
    drawPara("We wish them the very best in their future endeavours.");
  } else if (opts.kind === "payslip" && opts.payslip) {
    drawKV([
      ["Employee", emp.full_name],
      ["Code", emp.employee_code || "—"],
      ["Designation", emp.designation || "—"],
      ["Pay period", opts.periodMonth || fmtDate(opts.issueDate)],
      ...(emp.bank_account_number ? [["Bank A/C", String(emp.bank_account_number)] as [string, string]] : []),
    ]);
    drawHeading("Earnings");
    for (const e of opts.payslip.earnings) {
      newPageIfNeeded(14);
      page.drawText(e.label, { x: M, y, size: 10, font, color: ink });
      page.drawText(fmtMoney(e.amount, cur), { x: W - M - 100, y, size: 10, font, color: ink });
      y -= 14;
    }
    y -= 4;
    page.drawText("Gross", { x: M, y, size: 10, font: bold, color: ink });
    page.drawText(fmtMoney(opts.payslip.gross, cur), { x: W - M - 100, y, size: 10, font: bold, color: ink });
    y -= 18;
    drawHeading("Deductions");
    if (opts.payslip.deductions.length === 0) { drawPara("No deductions"); }
    for (const d of opts.payslip.deductions) {
      newPageIfNeeded(14);
      page.drawText(d.label, { x: M, y, size: 10, font, color: ink });
      page.drawText(fmtMoney(d.amount, cur), { x: W - M - 100, y, size: 10, font, color: ink });
      y -= 14;
    }
    y -= 4;
    page.drawText("Total Deductions", { x: M, y, size: 10, font: bold, color: ink });
    page.drawText(fmtMoney(opts.payslip.totalDeductions, cur), { x: W - M - 100, y, size: 10, font: bold, color: ink });
    y -= 22;
    newPageIfNeeded(50);
    page.drawRectangle({ x: M, y: y - 36, width: W - M * 2, height: 40, borderColor: ink, borderWidth: 1.5 });
    page.drawText("NET PAY", { x: M + 12, y: y - 14, size: 11, font: bold, color: muted });
    page.drawText(fmtMoney(opts.payslip.net, cur), { x: W - M - 140, y: y - 18, size: 18, font: bold, color: ink });
    y -= 50;
  }

  // Signature (non-payslip)
  if (opts.kind !== "payslip") {
    newPageIfNeeded(80);
    y -= 20;
    page.drawLine({ start: { x: M, y }, end: { x: M + 180, y }, thickness: 0.5, color: muted });
    page.drawLine({ start: { x: W - M - 180, y }, end: { x: W - M, y }, thickness: 0.5, color: muted });
    y -= 14;
    page.drawText("Authorised Signatory", { x: M, y, size: 9, font: bold, color: ink });
    page.drawText("Employee Acceptance", { x: W - M - 180, y, size: 9, font: bold, color: ink });
    y -= 12;
    page.drawText(opts.companyName, { x: M, y, size: 8, font, color: muted });
    page.drawText(emp.full_name, { x: W - M - 180, y, size: 8, font, color: muted });
  }

  drawFooter();
  return await pdf.save();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Missing Authorization" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: ud, error: ue } = await userClient.auth.getUser();
    if (ue || !ud.user) return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: ud.user.id });
    const { data: isHR } = await admin.rpc("has_role", { _user_id: ud.user.id, _role: "hr" });
    if (!isAdmin && !isHR) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Load company name/email from site settings
    const { data: settingsRows } = await admin.from("site_settings").select("key, value");
    const settings: Record<string, string> = {};
    (settingsRows || []).forEach((r: any) => {
      let v = r.value; while (typeof v === "string") { try { v = JSON.parse(v); } catch { break; } }
      settings[r.key] = typeof v === "string" ? v : JSON.stringify(v);
    });
    const companyName = settings.company_name || "Dynime Technologies Limited";
    const companyEmail = settings.contact_email || "support@dynime.com";

    // Resend branch
    if ("resend_document_id" in parsed.data) {
      const { data: doc } = await admin.from("hr_documents").select("*").eq("id", parsed.data.resend_document_id).maybeSingle();
      if (!doc) return new Response(JSON.stringify({ error: "Document not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { data: emp } = await admin.from("employees").select("*").eq("id", doc.employee_id).maybeSingle();
      if (!emp?.email) return new Response(JSON.stringify({ error: "Employee has no email" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      let pdfBytes: Uint8Array | null = null;
      if (doc.pdf_storage_path) {
        const { data: blob } = await admin.storage.from(BUCKET).download(doc.pdf_storage_path);
        if (blob) pdfBytes = new Uint8Array(await blob.arrayBuffer());
      }
      if (!pdfBytes) return new Response(JSON.stringify({ error: "PDF missing — re-issue instead" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      await sendEmail(admin, emp.email, emp.full_name, doc.kind, doc.doc_number, companyName, pdfBytes, doc.pdf_storage_path, buildEmailExtras(doc.kind, emp, doc));
      await admin.from("hr_documents").update({ status: "sent", sent_at: new Date().toISOString(), sent_to_email: emp.email }).eq("id", doc.id);
      return new Response(JSON.stringify({ ok: true, doc_number: doc.doc_number }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const p = parsed.data;
    const { data: emp } = await admin.from("employees").select("*").eq("id", p.employee_id).maybeSingle();
    if (!emp) return new Response(JSON.stringify({ error: "Employee not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let payslip: any = null;
    if (p.kind === "payslip") {
      payslip = computePayslip(Number(emp.gross_salary || 0), (emp.allowances as any) || [], (emp.deductions as any) || [], p.extra_earnings || [], p.extra_deductions || []);
    }

    // Insert row first (gets doc_number)
    const { data: inserted, error: insErr } = await admin.from("hr_documents").insert({
      employee_id: emp.id,
      kind: p.kind,
      issue_date: p.issue_date,
      effective_date: p.effective_date || null,
      period_month: p.kind === "payslip" && p.period_month ? `${p.period_month}-01` : null,
      snapshot: { employee: emp, body_text: p.body_text, clauses: p.clauses, validity_date: p.validity_date, extra_earnings: p.extra_earnings, extra_deductions: p.extra_deductions },
      computed: payslip || {},
      status: p.send_email ? "issued" : "draft",
      created_by: ud.user.id,
    } as any).select("*").single();
    if (insErr || !inserted) return new Response(JSON.stringify({ error: insErr?.message || "Insert failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const pdfBytes = await buildPdf({
      kind: p.kind, docNumber: inserted.doc_number!, employee: emp,
      issueDate: p.issue_date, effectiveDate: p.effective_date, periodMonth: p.period_month,
      bodyText: p.body_text, clauses: p.clauses, validityDate: p.validity_date,
      payslip, companyName, companyEmail,
    });

    const path = `${emp.id}/${p.kind}/${inserted.doc_number}.pdf`;
    await admin.storage.from(BUCKET).upload(path, pdfBytes, { contentType: "application/pdf", upsert: true });

    const updates: any = { pdf_storage_path: path };
    if (p.send_email) {
      if (!emp.email) return new Response(JSON.stringify({ error: "Employee has no email" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      await sendEmail(admin, emp.email, emp.full_name, p.kind, inserted.doc_number!, companyName, pdfBytes, path, buildEmailExtras(p.kind, emp, { ...inserted, snapshot: { ...(inserted as any).snapshot, validity_date: p.validity_date }, computed: payslip || {} }));
      updates.status = "sent"; updates.sent_at = new Date().toISOString(); updates.sent_to_email = emp.email;
    }
    await admin.from("hr_documents").update(updates).eq("id", inserted.id);

    return new Response(JSON.stringify({ ok: true, id: inserted.id, doc_number: inserted.doc_number, path }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("issue-hr-document error", e);
    return new Response(JSON.stringify({ error: (e as Error).message || "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

// Email senders use rich per-document templates + a 24h signed download URL
// (Lovable email infra does not support attachments).

const TEMPLATE_BY_KIND: Record<string, string> = {
  offer: "hr-offer-letter",
  agreement: "hr-employment-agreement",
  payslip: "hr-payslip",
  experience: "hr-experience-relieving",
  relieving: "hr-experience-relieving",
};

function buildEmailExtras(kind: string, emp: any, doc: any): Record<string, any> {
  const cur = emp.currency || "USD";
  const snap = (doc?.snapshot || {}) as any;
  const computed = (doc?.computed || {}) as any;
  const base: Record<string, any> = {
    designation: emp.designation || undefined,
    department: emp.department || undefined,
  };
  if (kind === "offer") {
    return {
      ...base,
      joiningDate: emp.joining_date ? fmtDate(emp.joining_date) : undefined,
      grossSalary: emp.gross_salary ? `${fmtMoney(Number(emp.gross_salary), cur)} / month` : undefined,
      validityDate: snap.validity_date ? fmtDate(snap.validity_date) : undefined,
    };
  }
  if (kind === "agreement") {
    return {
      ...base,
      effectiveDate: doc.effective_date ? fmtDate(doc.effective_date) : (doc.issue_date ? fmtDate(doc.issue_date) : undefined),
    };
  }
  if (kind === "payslip") {
    const period = doc.period_month ? new Date(doc.period_month).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : undefined;
    return {
      periodLabel: period,
      netPay: computed.net != null ? fmtMoney(Number(computed.net), cur) : undefined,
      gross: computed.gross != null ? fmtMoney(Number(computed.gross), cur) : undefined,
      totalDeductions: computed.totalDeductions != null ? fmtMoney(Number(computed.totalDeductions), cur) : undefined,
      earnings: (computed.earnings || []).map((e: any) => ({ label: e.label, amount: fmtMoney(Number(e.amount), cur) })),
      deductions: (computed.deductions || []).map((d: any) => ({ label: d.label, amount: fmtMoney(Number(d.amount), cur) })),
    };
  }
  if (kind === "experience" || kind === "relieving") {
    return {
      ...base,
      kind,
      joiningDate: emp.joining_date ? fmtDate(emp.joining_date) : undefined,
      lastWorkingDay: emp.last_working_day ? fmtDate(emp.last_working_day) : (doc.issue_date ? fmtDate(doc.issue_date) : undefined),
    };
  }
  return base;
}

async function sendEmail(
  admin: any,
  to: string,
  name: string,
  kind: string,
  docNumber: string,
  _companyName: string,
  _pdfBytes: Uint8Array,
  storagePath?: string | null,
  extra: Record<string, any> = {},
) {
  let downloadUrl: string | undefined;
  if (storagePath) {
    const { data: signed } = await admin.storage.from(BUCKET).createSignedUrl(storagePath, 60 * 60 * 24);
    downloadUrl = signed?.signedUrl;
  }
  const templateName = TEMPLATE_BY_KIND[kind] || "hr-offer-letter";
  const templateData: Record<string, any> = {
    name, docNumber, downloadUrl, kind, ...extra,
  };

  const { error } = await admin.functions.invoke("send-transactional-email", {
    body: {
      templateName,
      recipientEmail: to,
      idempotencyKey: `hr-doc-${docNumber}-${kind}`,
      templateData,
    },
  });
  if (error) console.error("send-transactional-email error", error);
}

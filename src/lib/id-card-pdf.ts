// Shared, framework-agnostic ID card PDF generator.
// Extracted from AdminIdCards.tsx so it can be reused from the HR Employees row
// "Issue ID" button (which doesn't render the visual editor). Drawing routines
// and ID allocation match AdminIdCards exactly — same vector layout, same
// id_card_assignments sequencing, so a card issued from either place is
// indistinguishable and verifies through the public /verify page.

import { db } from "@/integrations/db/client";
import { clampDigits } from "@/hooks/use-card-id";
import type { IdCardBrand } from "@/lib/id-card-brand";

export type CardSubject = {
  id: string;
  name: string;
  role: string;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  meta?: string | null;
  source: "team_section" | "team_account" | "investor" | "employee";
  joinedAt?: string | null;
  expiresAt?: string | null;
  photo?: string | null;
};

export type CardKind = "EMP" | "INV";

const shortCode = (companyName: string) => {
  const cleaned = (companyName || "").replace(/[^A-Za-z0-9 ]/g, " ").trim();
  if (!cleaned) return "ID";
  const words = cleaned.split(/\s+/);
  if (words.length >= 2) return words.map((w) => w[0]).join("").slice(0, 4).toUpperCase();
  return words[0].slice(0, 3).toUpperCase();
};

const initialsFrom = (n: string) =>
  n.trim().split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";

/** Loads an image URL/data-URL as a PNG data URL (cropped to square) for jsPDF. */
const loadPhotoDataUrl = async (src: string): Promise<string | null> => {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("photo load failed"));
      img.src = src;
    });
    const size = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - size) / 2;
    const sy = (img.naturalHeight - size) / 2;
    const cv = document.createElement("canvas");
    cv.width = cv.height = 256;
    const ctx = cv.getContext("2d")!;
    ctx.drawImage(img, sx, sy, size, size, 0, 0, 256, 256);
    return cv.toDataURL("image/png");
  } catch {
    return null;
  }
};

/** Renders a handwritten-style signature into a transparent PNG for jsPDF. */
const renderSignatureDataUrl = async (text: string): Promise<string> => {
  // Ensure the Google font is available in the document so canvas can use it.
  if (!document.getElementById("__id-card-sig-font")) {
    const link = document.createElement("link");
    link.id = "__id-card-sig-font";
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap";
    document.head.appendChild(link);
  }
  try {
    // @ts-ignore — FontFaceSet#load is widely supported
    await (document as any).fonts?.load?.("48px 'Great Vibes'");
    // @ts-ignore
    await (document as any).fonts?.ready;
  } catch {}
  const w = 640;
  const h = 200;
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const ctx = cv.getContext("2d")!;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#0f172a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "108px 'Great Vibes', 'Brush Script MT', cursive";
  ctx.fillText(text, w / 2, h / 2 + 6);
  return cv.toDataURL("image/png");
};

const hexToRgb = (c: string): [number, number, number] => {
  const v = c.replace("#", "").trim();
  const n = parseInt(v.length === 3 ? v.split("").map((x) => x + x).join("") : v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const allocateSequential = async (
  kind: CardKind,
  companyName: string,
  digits: number,
  offset: number,
) => {
  const code = shortCode(companyName);
  const initial = (kind || "X")[0].toUpperCase();
  const prefix = `${code}${initial}`;
  const d = clampDigits(digits);
  const { data } = await db
    .from("id_card_assignments")
    .select("card_id")
    .eq("kind", kind)
    .like("card_id", `${prefix}%`);
  let max = 0;
  const re = new RegExp(`^${prefix}(\\d+)$`);
  for (const row of data || []) {
    const m = String((row as any).card_id).match(re);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  const next = Math.max(max + 1 + offset, 1 + offset);
  return { candidate: `${prefix}${String(next).padStart(d, "0")}`, prefix };
};

/** Draws the footer band text, auto-shrinking the font so it always fits inside the card width. */
const drawFooterText = (
  pdf: any,
  ox: number,
  oy: number,
  W: number,
  H: number,
  footH: number,
  comp: string,
  site: string,
) => {
  pdf.setTextColor(255, 255, 255);
  const pad = 2.5;
  const maxW = W - pad * 2;
  let size = 5;
  let compW = 0;
  let siteW = 0;
  for (; size >= 3; size -= 0.25) {
    pdf.setFontSize(size);
    pdf.setFont("helvetica", "bold");
    compW = pdf.getTextWidth(comp);
    pdf.setFont("helvetica", "normal");
    siteW = pdf.getTextWidth(site);
    if (compW + siteW <= maxW) break;
  }
  const totalW = compW + siteW;
  const startX = ox + (W - totalW) / 2;
  const y = oy + H - footH + footH / 2 + 1;
  pdf.setFont("helvetica", "bold");
  pdf.text(comp, startX, y);
  pdf.setFont("helvetica", "normal");
  pdf.text(site, startX + compW, y);
};

/** Resolves an existing card id for subjectKey, or issues a new locked one. */
export const resolveOrIssueCardId = async (params: {
  kind: CardKind;
  subjectKey: string;
  brand: IdCardBrand;
  snapshot: Record<string, any>;
}): Promise<string> => {
  const { kind, subjectKey, brand, snapshot } = params;
  const { data: existing } = await db
    .from("id_card_assignments")
    .select("card_id")
    .eq("kind", kind)
    .eq("subject_key", subjectKey)
    .maybeSingle();
  if (existing?.card_id) return existing.card_id as string;

  for (let offset = 0; offset < 50; offset++) {
    const { candidate } = await allocateSequential(kind, brand.companyName, brand.idDigits, offset);
    const payload = { ...snapshot, id: candidate };
    const { error } = await db.from("id_card_assignments").insert({
      kind,
      subject_key: subjectKey,
      card_id: candidate,
      company_short: shortCode(brand.companyName),
      subject_name: snapshot.n || null,
      subject_email: snapshot.e || null,
      qr_payload: payload as any,
      locked_at: new Date().toISOString(),
    });
    if (!error) return candidate;
    if (error.code !== "23505") return candidate;
  }
  throw new Error("Could not allocate a unique card id after 50 attempts");
};

const drawCardFace = (
  pdf: any,
  QRCodeLib: any,
  ox: number,
  oy: number,
  W: number,
  H: number,
  isBack: boolean,
  subject: CardSubject,
  id: string,
  qrValue: string,
  brand: IdCardBrand,
  kind: CardKind,
  photoDataUrl: string | null,
  signatureDataUrl: string | null,
) => {
  const [pr, pg, pb] = hexToRgb(brand.primaryColor);
  const tint = (alpha: number) =>
    [
      Math.round(255 - (255 - pr) * alpha),
      Math.round(255 - (255 - pg) * alpha),
      Math.round(255 - (255 - pb) * alpha),
    ] as [number, number, number];

  const websiteHost =
    (brand.siteUrl || "")
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/.*$/, "") || "dynime.com";

  const issuedDate = new Date();
  const issued = issuedDate.toLocaleDateString(undefined, { year: "numeric", month: "short" });
  const expiresDate = subject.expiresAt ? new Date(subject.expiresAt) : null;
  const expires = expiresDate
    ? expiresDate.toLocaleDateString(undefined, { year: "numeric", month: "short" })
    : "Lifetime";
  const joined = subject.joinedAt
    ? new Date(subject.joinedAt).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })
    : issued;
  const hasExpiry = !!subject.expiresAt;
  const role = subject.role || (kind === "EMP" ? "Team Member" : "Investor");

  const [bg1, bg2, bg3] = tint(0.05);
  pdf.setFillColor(bg1, bg2, bg3);
  pdf.rect(ox, oy, W, H, "F");
  pdf.setFillColor(pr, pg, pb);
  pdf.rect(ox, oy, W, 1.1, "F");

  const footH = 5.6;

  if (!isBack) {
    pdf.setTextColor(15, 23, 42);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text(brand.companyName, ox + W / 2, oy + 4.2, { align: "center" });

    const photoR = 9.6;
    const photoCx = ox + W / 2;
    const photoCy = oy + 14 + photoR;
    pdf.setDrawColor(pr, pg, pb);
    pdf.setLineWidth(0.4);
    pdf.circle(photoCx, photoCy, photoR + 0.9, "S");
    const [d1, d2, d3] = tint(0.18);
    pdf.setFillColor(d1, d2, d3);
    pdf.circle(photoCx, photoCy, photoR, "F");
    pdf.setTextColor(pr, pg, pb);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text(initialsFrom(subject.name), photoCx, photoCy + 1.6, { align: "center" });

    pdf.setTextColor(15, 23, 42);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text(subject.name || "Your Name", ox + W / 2, photoCy + photoR + 5.4, { align: "center" });

    const roleText = role.toUpperCase();
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.5);
    const roleW = pdf.getTextWidth(roleText) + 3.6;
    const roleH = 2.6;
    const roleX = ox + (W - roleW) / 2;
    const roleY = photoCy + photoR + 7.4;
    const [t1, t2, t3] = tint(0.12);
    pdf.setFillColor(t1, t2, t3);
    pdf.roundedRect(roleX, roleY, roleW, roleH, 1.3, 1.3, "F");
    pdf.setTextColor(pr, pg, pb);
    pdf.text(roleText, ox + W / 2, roleY + 1.85, { align: "center" });

    const fieldX = ox + 5.5;
    let fy = roleY + roleH + 4.2;
    const fields: [string, string | null | undefined][] = [
      [kind === "EMP" ? "EMP NO" : "INV NO", id],
      ["Country", subject.country],
      ["Mail", subject.email],
      ["Phone", subject.phone],
    ];
    pdf.setFontSize(7);
    fields.forEach(([k, v]) => {
      pdf.setTextColor(15, 23, 42);
      pdf.setFont("helvetica", "bold");
      pdf.text(k, fieldX, fy);
      pdf.setTextColor(148, 163, 184);
      pdf.text(":", fieldX + 13.5, fy);
      pdf.setTextColor(51, 65, 85);
      pdf.setFont("helvetica", "normal");
      const value = (v || "—").toString();
      const maxW = W - 5.5 - 17 - 5;
      pdf.text(pdf.splitTextToSize(value, maxW)[0], fieldX + 15.5, fy);
      fy += 3.3;
    });

    const qr = QRCodeLib.create(qrValue, { errorCorrectionLevel: (brand.qrErrorCorrection || "Q") as any });
    const modules = qr.modules;
    const n = modules.size;
    const qrSizeMm = 16;
    const qrCx = ox + W / 2;
    const qrCy = oy + H - 16;
    const cell = qrSizeMm / n;
    const x0 = qrCx - qrSizeMm / 2;
    const y0 = qrCy - qrSizeMm / 2;
    pdf.setFillColor(255, 255, 255);
    pdf.rect(x0 - 0.6, y0 - 0.6, qrSizeMm + 1.2, qrSizeMm + 1.2, "F");
    pdf.setFillColor(15, 23, 42);
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (modules.get(r, c)) {
          pdf.rect(x0 + c * cell, y0 + r * cell, cell + 0.02, cell + 0.02, "F");
        }
      }
    }
    pdf.setFont("courier", "bold");
    pdf.setFontSize(5.5);
    pdf.setTextColor(71, 85, 105);
    pdf.text(id, ox + W / 2, qrCy + qrSizeMm / 2 + 2.2, { align: "center" });

    pdf.setFillColor(pr, pg, pb);
    pdf.rect(ox, oy + H - footH, W, footH, "F");
    drawFooterText(pdf, ox, oy, W, H, footH, brand.companyName.toUpperCase(), `  www.${websiteHost}`);
    return;
  }

  // BACK
  pdf.setTextColor(15, 23, 42);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("IMPORTANT INFORMATION", ox + W / 2, oy + 6.5, { align: "center" });
  pdf.setDrawColor(pr, pg, pb);
  pdf.setLineWidth(0.3);
  pdf.line(ox + W / 2 - 5, oy + 7.6, ox + W / 2 + 5, oy + 7.6);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.4);
  pdf.setTextColor(51, 65, 85);
  const bullets = [
    `This card is the property of ${brand.companyName}. If found, please return to the address visible on the website. Misuse or alteration is strictly prohibited.`,
    "The card holder must present this ID upon request and surrender it on the date of expiry or upon termination of association with the company.",
  ];
  let by = oy + 11.5;
  bullets.forEach((b) => {
    pdf.setFillColor(pr, pg, pb);
    pdf.circle(ox + 5, by - 0.6, 0.5, "F");
    const lines = pdf.splitTextToSize(b, W - 11);
    pdf.text(lines, ox + 6.5, by);
    by += lines.length * 2.6 + 1.6;
  });

  let dy = by + 2.5;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  if (hasExpiry) {
    pdf.setTextColor(pr, pg, pb);
    pdf.text("Joined Date", ox + 6.5, dy);
    pdf.setTextColor(148, 163, 184); pdf.text(":", ox + 22, dy);
    pdf.setTextColor(30, 41, 59); pdf.setFont("helvetica", "normal"); pdf.text(joined, ox + 24, dy);
    dy += 3.4;
    pdf.setFont("helvetica", "bold"); pdf.setTextColor(pr, pg, pb);
    pdf.text("Expire Date", ox + 6.5, dy);
    pdf.setTextColor(148, 163, 184); pdf.text(":", ox + 22, dy);
    pdf.setTextColor(30, 41, 59); pdf.setFont("helvetica", "normal"); pdf.text(expires, ox + 24, dy);
    dy += 3.4;
  } else {
    pdf.setTextColor(pr, pg, pb);
    const lbl = "Joined Date :";
    const lblW = pdf.getTextWidth(lbl);
    const valW = pdf.getTextWidth(joined);
    const startX = ox + (W - (lblW + 1.5 + valW)) / 2;
    pdf.text(lbl, startX, dy);
    pdf.setTextColor(30, 41, 59); pdf.setFont("helvetica", "normal");
    pdf.text(joined, startX + lblW + 1.5, dy);
    dy += 3.4;
  }

  dy += 2.5;
  const sigW = 30;
  const sigH = 9;
  if (signatureDataUrl) {
    pdf.addImage(signatureDataUrl, "PNG", ox + (W - sigW) / 2, dy - sigH + 2, sigW, sigH, undefined, "FAST");
  } else {
    pdf.setFont("times", "italic");
    pdf.setFontSize(13);
    pdf.setTextColor(30, 41, 59);
    const sig = (subject.name || "Authorized").split(" ").slice(0, 2).join(" ");
    pdf.text(sig, ox + W / 2, dy, { align: "center" });
  }
  dy += 1.4;
  pdf.setDrawColor(71, 85, 105); pdf.setLineWidth(0.2);
  pdf.line(ox + W / 2 - 13, dy, ox + W / 2 + 13, dy);
  dy += 2.6;
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(6.5); pdf.setTextColor(15, 23, 42);
  pdf.text("Your Sincerely", ox + W / 2, dy, { align: "center" });
  dy += 2.6;
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(6.5); pdf.setTextColor(71, 85, 105);
  pdf.text(role, ox + W / 2, dy, { align: "center", maxWidth: W - 10 });

  const blockTop = dy + 4;
  const blockBottom = oy + H - footH - 2;
  const blockCy = (blockTop + blockBottom) / 2;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(pr, pg, pb);
  pdf.text(brand.companyName.toUpperCase(), ox + W / 2, blockCy - 1, { align: "center" });
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(6); pdf.setTextColor(71, 85, 105);
  pdf.text("CONTACT", ox + W / 2, blockCy + 3, { align: "center" });
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(6.4); pdf.setTextColor(30, 41, 59);
  pdf.text(brand.supportEmail, ox + W / 2, blockCy + 5.5, { align: "center" });

  pdf.setFillColor(pr, pg, pb);
  pdf.rect(ox, oy + H - footH, W, footH, "F");
  drawFooterText(pdf, ox, oy, W, H, footH, brand.companyName.toUpperCase(), `  www.${websiteHost}`);
};

/** Generates a CR80 portrait, 2-page (front+back) vector PDF and triggers a browser download. */
export const generateIdCardPdf = async (params: {
  subject: CardSubject;
  brand: IdCardBrand;
  kind: CardKind;
}) => {
  const { subject, brand, kind } = params;
  const W = 54;
  const H = 85.6;

  const issuedDate = new Date();
  const expiresDate = subject.expiresAt ? new Date(subject.expiresAt) : null;
  const snapshot = {
    v: 1,
    k: kind,
    n: subject.name,
    r: subject.role || (kind === "EMP" ? "Team Member" : "Investor"),
    e: subject.email || undefined,
    c: subject.country || undefined,
    m: subject.meta || undefined,
    i: issuedDate.toISOString().slice(0, 10),
    x: expiresDate ? expiresDate.toISOString().slice(0, 10) : undefined,
    o: brand.companyName,
    p: subject.photo || undefined,
  };
  const subjectKey = `${subject.source}:${subject.id}`;
  const id = await resolveOrIssueCardId({ kind, subjectKey, brand, snapshot });

  const baseUrl = (brand.siteUrl || "").replace(/\/$/, "") || window.location.origin;
  const qrValue = `${baseUrl}/verify?id=${encodeURIComponent(id)}`;

  const sigName = (subject.name || "Authorized").split(" ").slice(0, 2).join(" ");
  const [{ jsPDF }, QRCode, signatureDataUrl] = await Promise.all([
    import("jspdf"),
    import("qrcode"),
    renderSignatureDataUrl(sigName),
  ]);
  const pdf = new jsPDF({ unit: "mm", format: [W, H], orientation: "portrait" });
  pdf.setFont("helvetica");
  drawCardFace(pdf, QRCode, 0, 0, W, H, false, subject, id, qrValue, brand, kind, null, signatureDataUrl);
  pdf.addPage([W, H], "portrait");
  drawCardFace(pdf, QRCode, 0, 0, W, H, true, subject, id, qrValue, brand, kind, null, signatureDataUrl);

  const slug = subject.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  pdf.save(`employee-id-${slug}-${id}.pdf`);
  return { id, qrValue };
};

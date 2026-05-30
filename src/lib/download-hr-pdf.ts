// Renders the on-screen .hr-doc node to a clean, paginated A4 PDF — same
// layout as the print stylesheet, but without the browser-generated print
// header/footer (date, URL, page count, doc title) that show up when using
// window.print().
import { ensureSignatureFontsLoaded } from "./print-with-fonts";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const MARGIN_MM = 12;

export async function downloadHRDocumentPdf(filename = "hr-document.pdf"): Promise<void> {
  const node = document.querySelector<HTMLElement>(".hr-doc");
  if (!node) throw new Error("Document preview not found");

  await ensureSignatureFontsLoaded();
  if ("fonts" in document) await (document as any).fonts.ready;

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);

  const canvas = await html2canvas(node, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
    windowWidth: node.scrollWidth,
  });

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const usableW = A4_WIDTH_MM - MARGIN_MM * 2;
  const usableH = A4_HEIGHT_MM - MARGIN_MM * 2;

  // Scale the rendered canvas to the usable width, then slice it into pages.
  const pxPerMm = canvas.width / usableW;
  const pageHeightPx = Math.floor(usableH * pxPerMm);

  let renderedPx = 0;
  let pageIndex = 0;
  while (renderedPx < canvas.height) {
    const sliceHeightPx = Math.min(pageHeightPx, canvas.height - renderedPx);
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeightPx;
    const ctx = pageCanvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    ctx.drawImage(canvas, 0, -renderedPx);
    const imgData = pageCanvas.toDataURL("image/jpeg", 0.95);
    const renderedHeightMm = sliceHeightPx / pxPerMm;
    if (pageIndex > 0) pdf.addPage();
    pdf.addImage(imgData, "JPEG", MARGIN_MM, MARGIN_MM, usableW, renderedHeightMm);
    renderedPx += sliceHeightPx;
    pageIndex += 1;
  }

  pdf.save(filename);
}

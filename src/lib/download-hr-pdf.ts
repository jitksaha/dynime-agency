import { ensureSignatureFontsLoaded } from "./print-with-fonts";

const A4_WIDTH_MM = 210;
const MARGIN_MM = 15;

export async function downloadHRDocumentPdf(filename = "hr-document.pdf"): Promise<void> {
  const node = document.querySelector<HTMLElement>(".hr-doc");
  if (!node) throw new Error("Document preview not found");

  await ensureSignatureFontsLoaded();
  if ("fonts" in document) await (document as any).fonts.ready;

  const [{ jsPDF }] = await Promise.all([
    import("jspdf"),
  ]);

  // Clone the node to clean up any interactive UI elements or styles for the PDF
  const clone = node.cloneNode(true) as HTMLElement;
  clone.style.width = "794px"; // Standard A4 width at 96 DPI
  clone.style.padding = "0";
  clone.style.margin = "0";
  clone.style.backgroundColor = "#ffffff";
  clone.style.boxShadow = "none";
  clone.style.border = "none";

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  await new Promise<void>((resolve, reject) => {
    pdf.html(clone, {
      x: MARGIN_MM,
      y: MARGIN_MM,
      width: A4_WIDTH_MM - MARGIN_MM * 2, // 180mm usable width
      windowWidth: 794,
      autoPaging: "slice",
      callback: function (doc) {
        doc.save(filename);
        resolve();
      },
      html2canvas: {
        scale: 1,
        useCORS: true,
        logging: false,
      }
    });
  });
}

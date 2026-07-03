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

  // Create a container off-screen and append it to body so the browser computes layout/styles
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "-9999px";
  container.style.width = "794px";
  document.body.appendChild(container);

  // Clone the node to clean up any interactive UI elements or styles for the PDF
  const clone = node.cloneNode(true) as HTMLElement;
  clone.style.width = "794px"; // Standard A4 width at 96 DPI
  clone.style.padding = "40px";
  clone.style.margin = "0";
  clone.style.backgroundColor = "#ffffff";
  clone.style.boxShadow = "none";
  clone.style.border = "none";
  container.appendChild(clone);

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  await new Promise<void>((resolve, reject) => {
    pdf.html(container, {
      x: 0,
      y: 0,
      width: A4_WIDTH_MM, // 210mm
      windowWidth: 794,
      autoPaging: "slice",
      callback: function (doc) {
        doc.save(filename);
        document.body.removeChild(container);
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

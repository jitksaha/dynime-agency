// Ensures custom fonts (incl. signature handwriting fonts) are fully loaded
// and decoded before triggering the browser's print/save-as-PDF dialog, so
// the signature renders correctly on every device and printer.

import { SIGNATURE_FONTS } from "@/components/admin/AgreementPreview";

const FONT_SIZES = ["16px", "24px", "32px", "48px", "64px"];

export async function ensureSignatureFontsLoaded(): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  try {
    const tasks: Promise<unknown>[] = [];
    for (const f of SIGNATURE_FONTS) {
      for (const size of FONT_SIZES) {
        // Quote the family name so multi-word names load correctly
        tasks.push(document.fonts.load(`${size} "${f.key}"`));
      }
    }
    await Promise.all(tasks);
    await document.fonts.ready;
  } catch {
    /* non-fatal — fall back to whatever's available */
  }
}

export async function printWithSignatureFonts(): Promise<void> {
  await ensureSignatureFontsLoaded();
  // Small tick so the browser commits the loaded fonts to the print snapshot
  await new Promise((r) => setTimeout(r, 80));
  window.print();
}

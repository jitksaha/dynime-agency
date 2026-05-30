// Resume/CV text extraction for PDF, DOCX/DOC, and plain-text formats.
import { extractText, getDocumentProxy } from "npm:unpdf@0.12.1";
import mammoth from "npm:mammoth@1.8.0";

export async function extractResumeText(buf: ArrayBuffer, filename: string): Promise<string> {
  const lower = filename.toLowerCase();
  try {
    if (lower.endsWith(".pdf")) {
      const pdf = await getDocumentProxy(new Uint8Array(buf));
      const { text } = await extractText(pdf, { mergePages: true });
      return Array.isArray(text) ? text.join("\n") : String(text || "");
    }
    if (lower.endsWith(".docx") || lower.endsWith(".doc")) {
      const result = await mammoth.extractRawText({ arrayBuffer: buf });
      return result.value || "";
    }
    if (lower.endsWith(".txt") || lower.endsWith(".md") || lower.endsWith(".rtf")) {
      return new TextDecoder().decode(new Uint8Array(buf));
    }
  } catch (e) {
    console.error("resume extract failed", e);
  }
  try { return new TextDecoder().decode(new Uint8Array(buf)).slice(0, 200_000); } catch { return ""; }
}

/**
 * Streaming CSV export utilities.
 *
 * Designed for large result sets (10k+ rows) without blowing up browser memory:
 *   - Pages source data in chunks (default 1000 rows).
 *   - Writes CSV incrementally — either directly to a File System Access
 *     writable stream (Chromium) or accumulates Blob parts (fallback).
 *   - Reports progress so the UI can render a loader / toast.
 */

export type CsvColumn<T> = {
  header: string;
  /** Cell value extractor. Return null/undefined for empty. */
  value: (row: T) => unknown;
};

export type CsvFetchPage<T> = (
  offset: number,
  limit: number,
) => Promise<{ rows: T[]; total?: number | null }>;

export type CsvExportOptions<T> = {
  filename: string;
  columns: CsvColumn<T>[];
  fetchPage: CsvFetchPage<T>;
  pageSize?: number;
  /** Hard cap to protect the browser. Defaults to 100,000 rows. */
  maxRows?: number;
  onProgress?: (info: { written: number; total: number | null }) => void;
  signal?: AbortSignal;
};

const csvEscape = (v: unknown): string => {
  if (v == null) return "";
  let s: string;
  if (v instanceof Date) {
    s = v.toISOString();
  } else if (typeof v === "object") {
    try { s = JSON.stringify(v); } catch { s = String(v); }
  } else {
    s = String(v);
  }
  s = s.replace(/\r?\n/g, " ").replace(/"/g, '""');
  return /[",]/.test(s) ? `"${s}"` : s;
};

const buildRow = <T,>(row: T, cols: CsvColumn<T>[]) =>
  cols.map((c) => csvEscape(c.value(row))).join(",") + "\n";

/** Detect Chromium's File System Access API for true streaming. */
const supportsFileSystemAccess = (): boolean =>
  typeof window !== "undefined" &&
  typeof (window as any).showSaveFilePicker === "function";

const triggerBlobDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Allow the browser to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/**
 * Stream-export a Supabase (or any paginated) result set to a CSV file.
 * Returns the number of rows written.
 */
export async function streamCsvExport<T>(opts: CsvExportOptions<T>): Promise<number> {
  const {
    filename,
    columns,
    fetchPage,
    pageSize = 1000,
    maxRows = 100_000,
    onProgress,
    signal,
  } = opts;

  const headerLine = columns.map((c) => csvEscape(c.header)).join(",") + "\n";
  // BOM keeps Excel happy with UTF-8.
  const bom = "\ufeff";

  // Try the File System Access API for true streaming (Chromium).
  let writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  let blobParts: BlobPart[] | null = null;
  const encoder = new TextEncoder();

  if (supportsFileSystemAccess()) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: "CSV", accept: { "text/csv": [".csv"] } }],
      });
      const stream: WritableStream = await handle.createWritable();
      writer = stream.getWriter();
    } catch (err: any) {
      // User cancelled the picker — abort cleanly.
      if (err?.name === "AbortError") return 0;
      // Any other failure: fall back to in-memory blob assembly.
      writer = null;
    }
  }
  if (!writer) blobParts = [];

  const writeChunk = async (text: string) => {
    if (writer) {
      await writer.write(encoder.encode(text));
    } else if (blobParts) {
      blobParts.push(text);
    }
  };

  let written = 0;
  let total: number | null = null;

  try {
    await writeChunk(bom + headerLine);

    let offset = 0;
    while (true) {
      if (signal?.aborted) throw new Error("Export cancelled");
      const remaining = maxRows - written;
      if (remaining <= 0) break;
      const limit = Math.min(pageSize, remaining);

      const { rows, total: pageTotal } = await fetchPage(offset, limit);
      if (pageTotal != null && total == null) total = pageTotal;

      if (!rows || rows.length === 0) break;

      // Build the chunk as a single string — much cheaper than many small writes.
      let chunk = "";
      for (const row of rows) chunk += buildRow(row, columns);
      await writeChunk(chunk);

      written += rows.length;
      offset += rows.length;
      onProgress?.({ written, total });

      if (rows.length < limit) break; // last page
      // Yield to the event loop so the UI stays responsive.
      await new Promise((r) => setTimeout(r, 0));
    }
  } finally {
    if (writer) {
      try { await writer.close(); } catch { /* noop */ }
    } else if (blobParts) {
      const blob = new Blob(blobParts, { type: "text/csv;charset=utf-8;" });
      triggerBlobDownload(blob, filename);
    }
  }

  return written;
}

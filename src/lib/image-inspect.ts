/**
 * Lightweight client-side image inspector for logo uploads.
 * Returns intrinsic dimensions and a list of human-readable warnings
 * if the image looks too small, oddly shaped, or over-compressed.
 */

export type InspectResult = {
  width: number;
  height: number;
  aspectRatio: number; // width / height, 0 if unknown
  isVector: boolean;
  format: string; // "PNG" | "JPEG" | "WEBP" | "SVG" | "Image"
  sizeBytes: number;
  bytesPerPixel: number; // 0 for vector / unknown
  warnings: string[];
  ok: boolean; // true when there are no warnings
};

const MIME_TO_LABEL: Record<string, string> = {
  "image/png": "PNG",
  "image/jpeg": "JPEG",
  "image/jpg": "JPEG",
  "image/webp": "WebP",
  "image/svg+xml": "SVG",
};

const formatRatio = (w: number, h: number) => {
  if (!w || !h) return "—";
  const r = w / h;
  return `${r.toFixed(2)}:1`;
};

const measureRaster = (file: File): Promise<{ width: number; height: number }> =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || 0;
      const h = img.naturalHeight || 0;
      URL.revokeObjectURL(url);
      resolve({ width: w, height: h });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 0, height: 0 });
    };
    img.src = url;
  });

const measureSvg = async (file: File): Promise<{ width: number; height: number }> => {
  try {
    const text = await file.text();
    const doc = new DOMParser().parseFromString(text, "image/svg+xml");
    const svg = doc.querySelector("svg");
    if (!svg) return { width: 0, height: 0 };
    const parseLen = (v: string | null) => {
      if (!v) return 0;
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : 0;
    };
    let w = parseLen(svg.getAttribute("width"));
    let h = parseLen(svg.getAttribute("height"));
    if ((!w || !h) && svg.getAttribute("viewBox")) {
      const parts = svg.getAttribute("viewBox")!.trim().split(/[\s,]+/).map(Number);
      if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
        w = w || parts[2];
        h = h || parts[3];
      }
    }
    return { width: Math.round(w), height: Math.round(h) };
  } catch {
    return { width: 0, height: 0 };
  }
};

export const inspectImage = async (file: File): Promise<InspectResult> => {
  const isVector = file.type === "image/svg+xml";
  const format = MIME_TO_LABEL[file.type] || "Image";
  const { width, height } = isVector ? await measureSvg(file) : await measureRaster(file);
  const sizeBytes = file.size;
  const aspectRatio = width && height ? width / height : 0;
  const pixels = width * height;
  const bytesPerPixel = !isVector && pixels > 0 ? sizeBytes / pixels : 0;

  const warnings: string[] = [];

  if (!isVector) {
    if (!width || !height) {
      warnings.push("Could not read image dimensions — the file may be corrupted.");
    } else {
      if (width < 200 || height < 60) {
        warnings.push(
          `Logo is only ${width}×${height}px — it may look blurry on retina screens. Recommended: at least 400×120.`
        );
      } else if (pixels < 200 * 60) {
        warnings.push("Image area is very small; consider exporting a larger source.");
      }

      if (aspectRatio && (aspectRatio < 1 || aspectRatio > 8)) {
        warnings.push(
          `Unusual aspect ratio (${formatRatio(width, height)}) — the logo may appear stretched in header/footer slots.`
        );
      }

      if (file.type === "image/jpeg" && bytesPerPixel > 0 && bytesPerPixel < 0.05) {
        warnings.push("Image looks heavily compressed and may appear blurry. Re-export at higher quality.");
      }

      if (width > 4000) {
        warnings.push(
          "Very large image — it will be downscaled. Consider exporting at ~800–1200px wide for faster loads."
        );
      }
    }
  }

  return {
    width,
    height,
    aspectRatio,
    isVector,
    format,
    sizeBytes,
    bytesPerPixel,
    warnings,
    ok: warnings.length === 0,
  };
};

export const formatBytes = (bytes: number): string => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const formatAspect = formatRatio;

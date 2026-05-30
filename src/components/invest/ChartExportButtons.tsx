import { useEffect, useState, type RefObject } from "react";
import { Download, Loader2, FileImage, FileText, Check, Zap } from "lucide-react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

type Props = {
  targetRef: RefObject<HTMLElement>;
  filename: string;
  label?: string;
};

type PixelRatio = 2 | 3;
type PdfScaling = "exact" | "a4-portrait" | "a4-landscape";

const A4_MM = { w: 210, h: 297 };

// Shared preferences across every chart on the page.
const PREF_KEY = "invest:chartExportPrefs:v1";
type Prefs = {
  pngRatio: PixelRatio;
  pdfRatio: PixelRatio;
  pdfScaling: PdfScaling;
  lastFormat: "png" | "pdf";
};
const DEFAULT_PREFS: Prefs = {
  pngRatio: 2,
  pdfRatio: 2,
  pdfScaling: "exact",
  lastFormat: "png",
};

const readPrefs = (): Prefs => {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(PREF_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    return {
      pngRatio: parsed.pngRatio === 3 ? 3 : 2,
      pdfRatio: parsed.pdfRatio === 3 ? 3 : 2,
      pdfScaling: ["exact", "a4-portrait", "a4-landscape"].includes(parsed.pdfScaling)
        ? parsed.pdfScaling
        : "exact",
      lastFormat: parsed.lastFormat === "pdf" ? "pdf" : "png",
    };
  } catch {
    return DEFAULT_PREFS;
  }
};

const writePrefs = (prefs: Prefs) => {
  try {
    window.localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
};

const scalingLabel = (s: PdfScaling) =>
  s === "exact" ? "Exact size" : s === "a4-portrait" ? "A4 portrait" : "A4 landscape";

const captureNode = async (node: HTMLElement, pixelRatio: PixelRatio) => {
  const cs = getComputedStyle(document.documentElement);
  const bg = `hsl(${cs.getPropertyValue("--background").trim() || "0 0% 100%"})`;
  return toPng(node, {
    cacheBust: true,
    pixelRatio,
    backgroundColor: bg,
    style: { padding: "16px" },
  });
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("image load"));
    img.src = src;
  });

const ChartExportButtons = ({ targetRef, filename, label = "Download" }: Props) => {
  const [busy, setBusy] = useState<null | "png" | "pdf">(null);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

  // Hydrate from storage on mount and refresh whenever the menu re-opens
  // (so other charts' selections are picked up too).
  useEffect(() => {
    setPrefs(readPrefs());
  }, []);

  const updatePrefs = (patch: Partial<Prefs>) => {
    setPrefs((cur) => {
      const next = { ...cur, ...patch };
      writePrefs(next);
      return next;
    });
  };

  const download = (href: string, name: string) => {
    const a = document.createElement("a");
    a.href = href;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const exportPng = async (pixelRatio: PixelRatio) => {
    if (!targetRef.current) return;
    try {
      setBusy("png");
      const dataUrl = await captureNode(targetRef.current, pixelRatio);
      download(dataUrl, `${filename}@${pixelRatio}x.png`);
      updatePrefs({ pngRatio: pixelRatio, lastFormat: "png" });
    } catch {
      toast.error("Couldn't export PNG. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const exportPdf = async (pixelRatio: PixelRatio, scaling: PdfScaling) => {
    if (!targetRef.current) return;
    try {
      setBusy("pdf");
      const dataUrl = await captureNode(targetRef.current, pixelRatio);
      const img = await loadImage(dataUrl);

      const pxToMm = (px: number) => (px * 25.4) / 96 / pixelRatio;
      const imgWmm = pxToMm(img.naturalWidth);
      const imgHmm = pxToMm(img.naturalHeight);

      let pageW: number;
      let pageH: number;
      let orientation: "portrait" | "landscape";
      let drawW: number;
      let drawH: number;
      let offsetX = 0;
      let offsetY = 0;

      if (scaling === "exact") {
        pageW = imgWmm;
        pageH = imgHmm;
        orientation = pageW >= pageH ? "landscape" : "portrait";
        drawW = pageW;
        drawH = pageH;
      } else {
        orientation = scaling === "a4-landscape" ? "landscape" : "portrait";
        pageW = orientation === "landscape" ? A4_MM.h : A4_MM.w;
        pageH = orientation === "landscape" ? A4_MM.w : A4_MM.h;
        const margin = 10;
        const maxW = pageW - margin * 2;
        const maxH = pageH - margin * 2;
        const ratio = Math.min(maxW / imgWmm, maxH / imgHmm);
        drawW = imgWmm * ratio;
        drawH = imgHmm * ratio;
        offsetX = (pageW - drawW) / 2;
        offsetY = (pageH - drawH) / 2;
      }

      const pdf = new jsPDF({
        orientation,
        unit: "mm",
        format: scaling === "exact" ? [pageW, pageH] : "a4",
        compress: true,
      });
      pdf.addImage(dataUrl, "PNG", offsetX, offsetY, drawW, drawH, undefined, "FAST");
      pdf.save(`${filename}@${pixelRatio}x-${scaling}.pdf`);
      updatePrefs({ pdfRatio: pixelRatio, pdfScaling: scaling, lastFormat: "pdf" });
    } catch {
      toast.error("Couldn't export PDF. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const runQuick = () => {
    if (prefs.lastFormat === "pdf") exportPdf(prefs.pdfRatio, prefs.pdfScaling);
    else exportPng(prefs.pngRatio);
  };

  const quickSummary =
    prefs.lastFormat === "pdf"
      ? `PDF · ${prefs.pdfRatio}x · ${scalingLabel(prefs.pdfScaling)}`
      : `PNG · ${prefs.pngRatio}x`;

  const Tick = ({ on }: { on: boolean }) => (
    <Check className={`ml-auto h-3.5 w-3.5 ${on ? "opacity-100 text-primary" : "opacity-0"}`} />
  );

  return (
    <DropdownMenu onOpenChange={(open) => open && setPrefs(readPrefs())}>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="h-8" disabled={busy !== null}>
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5 mr-1" />
          )}
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuItem onClick={runQuick} disabled={busy !== null} className="gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <div className="flex flex-col">
            <span>Quick download</span>
            <span className="text-[11px] text-muted-foreground">{quickSummary}</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-xs text-muted-foreground">PNG image</DropdownMenuLabel>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger disabled={busy !== null}>
            <FileImage className="h-4 w-4 mr-2" /> Download PNG
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => exportPng(2)}>
              Standard · 2x
              <Tick on={prefs.pngRatio === 2} />
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportPng(3)}>
              High · 3x
              <Tick on={prefs.pngRatio === 3} />
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">PDF document</DropdownMenuLabel>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger disabled={busy !== null}>
            <FileText className="h-4 w-4 mr-2" /> Download PDF
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-60">
            <DropdownMenuLabel className="text-xs text-muted-foreground">2x quality</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => exportPdf(2, "exact")}>
              Exact size
              <Tick on={prefs.pdfRatio === 2 && prefs.pdfScaling === "exact"} />
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportPdf(2, "a4-portrait")}>
              Fit to A4 · portrait
              <Tick on={prefs.pdfRatio === 2 && prefs.pdfScaling === "a4-portrait"} />
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportPdf(2, "a4-landscape")}>
              Fit to A4 · landscape
              <Tick on={prefs.pdfRatio === 2 && prefs.pdfScaling === "a4-landscape"} />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">3x quality</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => exportPdf(3, "exact")}>
              Exact size
              <Tick on={prefs.pdfRatio === 3 && prefs.pdfScaling === "exact"} />
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportPdf(3, "a4-portrait")}>
              Fit to A4 · portrait
              <Tick on={prefs.pdfRatio === 3 && prefs.pdfScaling === "a4-portrait"} />
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportPdf(3, "a4-landscape")}>
              Fit to A4 · landscape
              <Tick on={prefs.pdfRatio === 3 && prefs.pdfScaling === "a4-landscape"} />
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ChartExportButtons;

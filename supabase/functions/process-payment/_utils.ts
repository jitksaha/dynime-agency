import type { MilestoneStage, GlobalUrls } from "./_types.ts";

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function normalizeMilestoneStages(total: number, stages: MilestoneStage[]): MilestoneStage[] {
  const cleaned = (Array.isArray(stages) ? stages : [])
    .map((stage, index) => ({
      label: typeof stage.label === "string" && stage.label.trim() ? stage.label.trim() : `Stage ${index + 1}`,
      percent: Number(stage.percent),
    }))
    .filter((stage) => Number.isFinite(stage.percent) && stage.percent > 0);

  let allocated = 0;
  return cleaned.map((stage, index) => {
    const isLast = index === cleaned.length - 1;
    const amount = isLast
      ? roundMoney(total - allocated)
      : roundMoney((total * stage.percent) / 100);
    allocated = roundMoney(allocated + amount);
    return { ...stage, amount };
  });
}

export function pickUrl(...candidates: (string | undefined | null)[]): string {
  for (const c of candidates) {
    if (typeof c === "string" && c.trim().length > 0) return c.trim();
  }
  return "";
}

export function deriveDefaultUrls(req: Request): GlobalUrls {
  const origin = req.headers.get("origin") || req.headers.get("referer") || "";
  let base = "";
  try {
    if (origin) base = new URL(origin).origin;
  } catch {
    base = "";
  }
  return {
    success_url: base ? `${base}/checkout?payment=success` : "",
    fail_url: base ? `${base}/checkout?payment=failed` : "",
    cancel_url: base ? `${base}/checkout?payment=cancelled` : "",
  };
}

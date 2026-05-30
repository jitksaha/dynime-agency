export type TenureFeeTier = { tenure: number; fee_percent: number };

export const DEFAULT_TENURE_TIERS: TenureFeeTier[] = [
  { tenure: 3, fee_percent: 0 },
  { tenure: 6, fee_percent: 0 },
  { tenure: 9, fee_percent: 1 },
  { tenure: 12, fee_percent: 2 },
  { tenure: 18, fee_percent: 2 },
  { tenure: 24, fee_percent: 3 },
  { tenure: 36, fee_percent: 5 },
];

export const getFeePercentForTenure = (
  tenure: number,
  tiers: TenureFeeTier[] | null | undefined,
  fallback = 0,
): number => {
  const list = (tiers && tiers.length ? tiers : DEFAULT_TENURE_TIERS);
  const exact = list.find((t) => Number(t.tenure) === Number(tenure));
  if (exact) return Math.max(0, Number(exact.fee_percent) || 0);
  const sorted = [...list].sort((a, b) => a.tenure - b.tenure);
  let chosen = sorted[0]?.fee_percent ?? fallback;
  for (const t of sorted) if (t.tenure <= tenure) chosen = Number(t.fee_percent) || 0;
  return Math.max(0, chosen);
};

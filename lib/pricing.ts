export const PRICING_AGE_THRESHOLDS = {
  markdown45: 45,
  markdown60: 60,
  markdown90: 90,
} as const;

export function calcBreakEvenPrice(params: { purchaseCost: number; fees: number }) {
  return params.purchaseCost + params.fees;
}

export function calcTargetPrice(params: {
  purchaseCost: number;
  fees: number;
  targetMarginPct: number;
}) {
  const breakEven = calcBreakEvenPrice({
    purchaseCost: params.purchaseCost,
    fees: params.fees,
  });
  return breakEven * (1 + params.targetMarginPct / 100);
}

export function getSuggestedMarkdownPct(ageDays: number) {
  if (ageDays >= PRICING_AGE_THRESHOLDS.markdown90) return 18;
  if (ageDays >= PRICING_AGE_THRESHOLDS.markdown60) return 10;
  if (ageDays >= PRICING_AGE_THRESHOLDS.markdown45) return 5;
  return 0;
}

export function calcRecommendedMarkdownPrice(params: {
  ageDays: number;
  baseTargetPrice: number;
}) {
  const markdownPct = getSuggestedMarkdownPct(params.ageDays);
  const price = params.baseTargetPrice * (1 - markdownPct / 100);
  return { markdownPct, price };
}

export function getInventoryAgeDays(dateLike: string | Date) {
  const purchasedAt = typeof dateLike === "string" ? new Date(dateLike) : dateLike;
  const msInDay = 1000 * 60 * 60 * 24;
  return Math.max(0, Math.floor((Date.now() - purchasedAt.getTime()) / msInDay));
}

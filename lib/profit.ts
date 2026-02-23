export function calcProfit(params: {
  itemsTotal: number;
  shippingCharged: number;
  purchaseTotal: number;
  platformFees: number;
  shippingCost: number;
  otherCosts: number;
  refundAmount?: number;
  returnShippingCost?: number;
}) {
  const refundAmount = params.refundAmount ?? 0;
  const returnShippingCost = params.returnShippingCost ?? 0;

  const revenue = params.itemsTotal + params.shippingCharged;
  const costs =
    params.purchaseTotal +
    params.platformFees +
    params.shippingCost +
    params.otherCosts +
    refundAmount +
    returnShippingCost;
  return { revenue, costs, profit: revenue - costs };
}

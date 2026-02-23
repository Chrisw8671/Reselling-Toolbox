export function calcProfit(params: {
  itemsTotal: number;
  shippingCharged: number;
  purchaseTotal: number;
  platformFees: number;
  shippingCost: number;
  otherCosts: number;
}) {
  const revenue = params.itemsTotal + params.shippingCharged;
  const costs =
    params.purchaseTotal +
    params.platformFees +
    params.shippingCost +
    params.otherCosts;
  return { revenue, costs, profit: revenue - costs };
}
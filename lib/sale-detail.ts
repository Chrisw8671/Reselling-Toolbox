export type SaleDetailInput = {
  shippingCharged: number | string | { toString(): string };
  platformFees: number | string | { toString(): string };
  shippingCost: number | string | { toString(): string };
  otherCosts: number | string | { toString(): string };
  returnCases: Array<{
    id: string;
    stockUnitId: string;
    reason: string;
    openedAt: Date;
    closedAt: Date | null;
    refundAmount: number | string | { toString(): string };
    returnShippingCost: number | string | { toString(): string };
    restockable: boolean;
  }>;
  lines: Array<{
    salePrice: number | string | { toString(): string };
    stockUnit: {
      id: string;
      sku: string;
      titleOverride: string | null;
      purchaseCost: number | string | { toString(): string };
      location: { code: string } | null;
    };
  }>;
};

export type ReturnManagerCase = {
  id: string;
  stockUnitId: string;
  reason: string;
  openedAt: string;
  closedAt: string | null;
  refundAmount: number;
  returnShippingCost: number;
  restockable: boolean;
};

export type ReturnManagerLine = {
  stockUnit: {
    id: string;
    sku: string;
    titleOverride: string | null;
  };
};

export type SaleLineSummary = {
  sku: string;
  title: string;
  loc: string;
  buy: number;
  sell: number;
  itemProfit: number;
};

export function buildSaleDetailView(sale: SaleDetailInput) {
  const returnCases: ReturnManagerCase[] = sale.returnCases.map((rc) => ({
    id: rc.id,
    stockUnitId: rc.stockUnitId,
    reason: rc.reason,
    openedAt: rc.openedAt.toISOString(),
    closedAt: rc.closedAt ? rc.closedAt.toISOString() : null,
    refundAmount: Number(rc.refundAmount),
    returnShippingCost: Number(rc.returnShippingCost),
    restockable: rc.restockable,
  }));

  const returnManagerLines: ReturnManagerLine[] = sale.lines.map((line) => ({
    stockUnit: {
      id: line.stockUnit.id,
      sku: line.stockUnit.sku,
      titleOverride: line.stockUnit.titleOverride,
    },
  }));

  const lines: SaleLineSummary[] = sale.lines.map((line) => {
    const buy = Number(line.stockUnit.purchaseCost);
    const sell = Number(line.salePrice);
    return {
      sku: line.stockUnit.sku,
      title: line.stockUnit.titleOverride ?? "—",
      loc: line.stockUnit.location?.code ?? "—",
      buy,
      sell,
      itemProfit: sell - buy,
    };
  });

  const itemsTotal = lines.reduce((sum, line) => sum + line.sell, 0);
  const purchaseTotal = lines.reduce((sum, line) => sum + line.buy, 0);

  const shippingCharged = Number(sale.shippingCharged);
  const platformFees = Number(sale.platformFees);
  const shippingCost = Number(sale.shippingCost);
  const otherCosts = Number(sale.otherCosts);
  const refundAmount = returnCases.reduce((sum, item) => sum + item.refundAmount, 0);
  const returnShippingCost = returnCases.reduce(
    (sum, item) => sum + item.returnShippingCost,
    0,
  );

  const revenue = itemsTotal + shippingCharged;
  const costs =
    purchaseTotal +
    platformFees +
    shippingCost +
    otherCosts +
    refundAmount +
    returnShippingCost;

  return {
    returnCases,
    returnManagerLines,
    lines,
    itemsTotal,
    purchaseTotal,
    shippingCharged,
    platformFees,
    shippingCost,
    otherCosts,
    refundAmount,
    returnShippingCost,
    revenue,
    profit: revenue - costs,
  };
}

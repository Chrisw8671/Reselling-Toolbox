import { prisma } from "@/lib/prisma";

export default async function MobileReportPage() {
  const [sales, stockCount, listedCount] = await Promise.all([
    prisma.sale.findMany({
      where: { archived: false },
      select: {
        shippingCharged: true,
        platformFees: true,
        shippingCost: true,
        otherCosts: true,
        lines: { select: { salePrice: true, stockUnit: { select: { purchaseCost: true } } } },
      },
    }),
    prisma.stockUnit.count({ where: { archived: false } }),
    prisma.stockUnit.count({ where: { archived: false, status: "LISTED" } }),
  ]);

  const totalProfit = sales.reduce((sum, s) => {
    const revenue = s.lines.reduce((inner, line) => inner + Number(line.salePrice), 0) + Number(s.shippingCharged);
    const costs =
      s.lines.reduce((inner, line) => inner + Number(line.stockUnit.purchaseCost), 0) +
      Number(s.platformFees) +
      Number(s.shippingCost) +
      Number(s.otherCosts);
    return sum + (revenue - costs);
  }, 0);

  return (
    <div className="container" style={{ maxWidth: 560, paddingBottom: 24 }}>
      <div className="toolbar">
        <div>
          <h1 style={{ fontSize: 24, margin: 0 }}>Report</h1>
          <div className="muted" style={{ marginTop: 4 }}>Compact metrics for fast decision making.</div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <div className="tableWrap" style={{ padding: 14 }}>
          <div className="muted" style={{ fontSize: 12 }}>Lifetime profit</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>£{totalProfit.toFixed(2)}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="tableWrap" style={{ padding: 14 }}>
            <div className="muted" style={{ fontSize: 12 }}>Inventory units</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{stockCount}</div>
          </div>
          <div className="tableWrap" style={{ padding: 14 }}>
            <div className="muted" style={{ fontSize: 12 }}>Currently listed</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{listedCount}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

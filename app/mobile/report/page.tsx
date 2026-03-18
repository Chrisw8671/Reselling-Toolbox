import { prisma } from "@/lib/prisma";

export default async function MobileReportPage() {
  const [sales, stockCount, listedCount, soldCount] = await Promise.all([
    prisma.sale.findMany({
      where: { archived: false },
      select: {
        shippingCharged: true,
        platformFees: true,
        shippingCost: true,
        otherCosts: true,
        lines: {
          select: { salePrice: true, stockUnit: { select: { purchaseCost: true } } },
        },
      },
    }),
    prisma.stockUnit.count({ where: { archived: false } }),
    prisma.stockUnit.count({ where: { archived: false, status: "LISTED" } }),
    prisma.stockUnit.count({ where: { archived: false, status: "SOLD" } }),
  ]);

  const totalRevenue = sales.reduce((sum, s) => {
    return sum + s.lines.reduce((r, l) => r + Number(l.salePrice), 0) + Number(s.shippingCharged);
  }, 0);

  const totalCosts = sales.reduce((sum, s) => {
    return (
      sum +
      s.lines.reduce((r, l) => r + Number(l.stockUnit.purchaseCost), 0) +
      Number(s.platformFees) +
      Number(s.shippingCost) +
      Number(s.otherCosts)
    );
  }, 0);

  const totalProfit = totalRevenue - totalCosts;

  return (
    <div className="mobilePg">
      <div style={{ paddingTop: 10, paddingBottom: 16 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, letterSpacing: "-0.5px" }}>
          Report
        </h1>
        <div style={{ marginTop: 4, fontSize: 13, color: "var(--muted)" }}>
          Lifetime metrics across all sales
        </div>
      </div>

      <div className="statGrid">
        {/* Profit — full width, prominent */}
        <div className="statTile wide">
          <div className="statLabel">Lifetime profit</div>
          <div
            style={{
              fontSize: 38,
              fontWeight: 900,
              letterSpacing: "-1px",
              color: totalProfit >= 0 ? "var(--success)" : "var(--danger)",
              marginTop: 2,
            }}
          >
            £{totalProfit.toFixed(2)}
          </div>
        </div>

        <div className="statTile wide">
          <div className="statLabel">Revenue</div>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.5px", marginTop: 2 }}>
            £{totalRevenue.toFixed(2)}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
            costs £{totalCosts.toFixed(2)}
          </div>
        </div>

        <div className="statTile">
          <div className="statLabel">Total inventory</div>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.5px", marginTop: 2 }}>
            {stockCount}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>units</div>
        </div>

        <div className="statTile">
          <div className="statLabel">Currently listed</div>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.5px", marginTop: 2 }}>
            {listedCount}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>active</div>
        </div>

        <div className="statTile">
          <div className="statLabel">Total sales</div>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.5px", marginTop: 2 }}>
            {sales.length}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>orders</div>
        </div>

        <div className="statTile">
          <div className="statLabel">Units sold</div>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.5px", marginTop: 2 }}>
            {soldCount}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>items</div>
        </div>
      </div>
    </div>
  );
}

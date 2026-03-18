import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function MobileHomePage() {
  const [stockCount, openSalesCount, listedCount, salesForProfit] = await Promise.all([
    prisma.stockUnit.count({ where: { archived: false, status: { in: ["IN_STOCK", "LISTED"] } } }),
    prisma.sale.count({ where: { archived: false, fulfillmentStatus: { not: "DELIVERED" } } }),
    prisma.stockUnit.count({ where: { archived: false, status: "LISTED" } }),
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
  ]);

  const totalProfit = salesForProfit.reduce((sum, s) => {
    const rev = s.lines.reduce((r, l) => r + Number(l.salePrice), 0) + Number(s.shippingCharged);
    const cost =
      s.lines.reduce((r, l) => r + Number(l.stockUnit.purchaseCost), 0) +
      Number(s.platformFees) +
      Number(s.shippingCost) +
      Number(s.otherCosts);
    return sum + (rev - cost);
  }, 0);

  return (
    <div className="mobilePg">
      <div style={{ paddingTop: 10, paddingBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Reselling Toolbox
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 900, margin: "2px 0 0", letterSpacing: "-0.5px" }}>
          Dashboard
        </h1>
      </div>

      {/* Stats */}
      <div className="statGrid">
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

        <div className="statTile">
          <div className="statLabel">Active stock</div>
          <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.5px", marginTop: 2 }}>
            {stockCount}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
            {listedCount} listed
          </div>
        </div>

        <div className="statTile">
          <div className="statLabel">Open orders</div>
          <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.5px", marginTop: 2 }}>
            {openSalesCount}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
            {openSalesCount === 0 ? "all caught up" : "need action"}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          color: "var(--muted)",
          marginBottom: 8,
        }}
      >
        Quick actions
      </div>
      <div className="actionGrid">
        <Link href="/mobile/inventory/new" className="actionTile">
          <span className="actionIcon">📦</span>
          Add item
        </Link>
        <Link href="/mobile/sales/new" className="actionTile">
          <span className="actionIcon">🧾</span>
          New sale
        </Link>
        <Link href="/mobile/inventory" className="actionTile">
          <span className="actionIcon">🔍</span>
          Browse stock
        </Link>
        <Link href="/mobile/report" className="actionTile">
          <span className="actionIcon">📊</span>
          View report
        </Link>
      </div>
    </div>
  );
}

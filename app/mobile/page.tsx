import { cx, ui } from "@/lib/ui";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function MobileHomePage() {
  const [stockCount, openSalesCount, listedCount, salesForProfit] = await Promise.all([
    prisma.stockUnit.count({
      where: { archived: false, status: { in: ["IN_STOCK", "LISTED"] } },
    }),
    prisma.sale.count({
      where: { archived: false, fulfillmentStatus: { not: "DELIVERED" } },
    }),
    prisma.stockUnit.count({ where: { archived: false, status: "LISTED" } }),
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
  ]);

  const totalProfit = salesForProfit.reduce((sum, s) => {
    const rev =
      s.lines.reduce((r, l) => r + Number(l.salePrice), 0) + Number(s.shippingCharged);
    const cost =
      s.lines.reduce((r, l) => r + Number(l.stockUnit.purchaseCost), 0) +
      Number(s.platformFees) +
      Number(s.shippingCost) +
      Number(s.otherCosts);
    return sum + (rev - cost);
  }, 0);

  return (
    <div className={ui.mobilePage}>
      <div className="pt-2.5 pb-4">
        <div className="text-app-muted text-xs font-bold tracking-[0.5px] uppercase">
          Reselling Toolbox
        </div>
        <h1 className="mt-0.5 text-[30px] font-black tracking-[-0.5px]">Dashboard</h1>
      </div>

      {/* Stats */}
      <div className={ui.statGrid}>
        <div className={cx(ui.statTile, ui.statTileWide)}>
          <div className={ui.statLabel}>Lifetime profit</div>
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

        <div className={ui.statTile}>
          <div className={ui.statLabel}>Active stock</div>
          <div className="mt-0.5 text-[30px] font-black tracking-[-0.5px]">
            {stockCount}
          </div>
          <div className="text-app-muted mt-[3px] text-xs">{listedCount} listed</div>
        </div>

        <div className={ui.statTile}>
          <div className={ui.statLabel}>Open orders</div>
          <div className="mt-0.5 text-[30px] font-black tracking-[-0.5px]">
            {openSalesCount}
          </div>
          <div className="text-app-muted mt-[3px] text-xs">
            {openSalesCount === 0 ? "all caught up" : "need action"}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="text-app-muted mb-2 text-[11px] font-extrabold tracking-[0.5px] uppercase">
        Quick actions
      </div>
      <div className={ui.actionGrid}>
        <Link href="/mobile/inventory/new" className={ui.actionTile}>
          <span className={ui.actionIcon}>📦</span>
          Add item
        </Link>
        <Link href="/mobile/sales/new" className={ui.actionTile}>
          <span className={ui.actionIcon}>🧾</span>
          New sale
        </Link>
        <Link href="/mobile/inventory" className={ui.actionTile}>
          <span className={ui.actionIcon}>🔍</span>
          Browse stock
        </Link>
        <Link href="/mobile/report" className={ui.actionTile}>
          <span className={ui.actionIcon}>📊</span>
          View report
        </Link>
      </div>
    </div>
  );
}

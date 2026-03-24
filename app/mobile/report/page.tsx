import { cx, ui } from "@/lib/ui";
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
    return (
      sum +
      s.lines.reduce((r, l) => r + Number(l.salePrice), 0) +
      Number(s.shippingCharged)
    );
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
    <div className={ui.mobilePage}>
      <div className="pt-2.5 pb-4">
        <h1 className={ui.mobilePageTitle}>Report</h1>
        <div className={ui.mobilePageSubtitle}>Lifetime metrics across all sales</div>
      </div>

      <div className={ui.statGrid}>
        {/* Profit — full width, prominent */}
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

        <div className={cx(ui.statTile, ui.statTileWide)}>
          <div className={ui.statLabel}>Revenue</div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 900,
              letterSpacing: "-0.5px",
              marginTop: 2,
            }}
          >
            £{totalRevenue.toFixed(2)}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
            costs £{totalCosts.toFixed(2)}
          </div>
        </div>

        <div className={ui.statTile}>
          <div className={ui.statLabel}>Total inventory</div>
          <div className="mt-0.5 text-[28px] font-black tracking-[-0.5px]">
            {stockCount}
          </div>
          <div className="text-app-muted mt-[3px] text-xs">units</div>
        </div>

        <div className={ui.statTile}>
          <div className={ui.statLabel}>Currently listed</div>
          <div className="mt-0.5 text-[28px] font-black tracking-[-0.5px]">
            {listedCount}
          </div>
          <div className="text-app-muted mt-[3px] text-xs">active</div>
        </div>

        <div className={ui.statTile}>
          <div className={ui.statLabel}>Total sales</div>
          <div className="mt-0.5 text-[28px] font-black tracking-[-0.5px]">
            {sales.length}
          </div>
          <div className="text-app-muted mt-[3px] text-xs">orders</div>
        </div>

        <div className={ui.statTile}>
          <div className={ui.statLabel}>Units sold</div>
          <div className="mt-0.5 text-[28px] font-black tracking-[-0.5px]">
            {soldCount}
          </div>
          <div className="text-app-muted mt-[3px] text-xs">items</div>
        </div>
      </div>
    </div>
  );
}

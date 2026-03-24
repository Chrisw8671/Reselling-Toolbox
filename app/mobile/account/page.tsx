import { cx, ui } from "@/lib/ui";
import { prisma } from "@/lib/prisma";

export default async function MobileAccountPage() {
  const [salesCount, stockCount, lastSale] = await Promise.all([
    prisma.sale.count({ where: { archived: false } }),
    prisma.stockUnit.count({ where: { archived: false } }),
    prisma.sale.findFirst({
      where: { archived: false },
      orderBy: { saleDate: "desc" },
      select: { saleDate: true, platform: true, orderRef: true },
    }),
  ]);

  return (
    <div className={ui.mobilePage}>
      <div className="pt-2.5 pb-4">
        <h1 className={ui.mobilePageTitle}>Account</h1>
        <div className={ui.mobilePageSubtitle}>Operational snapshot</div>
      </div>

      <div className={ui.statGrid}>
        <div className={ui.statTile}>
          <div className={ui.statLabel}>Sales records</div>
          <div className="mt-0.5 text-[30px] font-black tracking-[-0.5px]">
            {salesCount}
          </div>
        </div>
        <div className={ui.statTile}>
          <div className={ui.statLabel}>Inventory records</div>
          <div className="mt-0.5 text-[30px] font-black tracking-[-0.5px]">
            {stockCount}
          </div>
        </div>
        <div className={cx(ui.statTile, ui.statTileWide)}>
          <div className={ui.statLabel}>Latest sale</div>
          {lastSale ? (
            <>
              <div className="mt-1 text-base font-extrabold">
                {lastSale.platform || "Unknown"}
              </div>
              <div className="text-app-muted mt-[3px] text-[13px]">
                {new Date(lastSale.saleDate).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
                {lastSale.orderRef ? ` · ${lastSale.orderRef}` : ""}
              </div>
            </>
          ) : (
            <div className="text-app-muted mt-1 font-bold">No sales yet</div>
          )}
        </div>
      </div>
    </div>
  );
}

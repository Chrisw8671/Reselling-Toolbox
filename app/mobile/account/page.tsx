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
    <div className="mobilePg">
      <div style={{ paddingTop: 10, paddingBottom: 16 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, letterSpacing: "-0.5px" }}>
          Account
        </h1>
        <div style={{ marginTop: 4, fontSize: 13, color: "var(--muted)" }}>
          Operational snapshot
        </div>
      </div>

      <div className="statGrid">
        <div className="statTile">
          <div className="statLabel">Sales records</div>
          <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.5px", marginTop: 2 }}>
            {salesCount}
          </div>
        </div>
        <div className="statTile">
          <div className="statLabel">Inventory records</div>
          <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.5px", marginTop: 2 }}>
            {stockCount}
          </div>
        </div>
        <div className="statTile wide">
          <div className="statLabel">Latest sale</div>
          {lastSale ? (
            <>
              <div style={{ fontWeight: 800, fontSize: 16, marginTop: 4 }}>
                {lastSale.platform || "Unknown"}
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 3 }}>
                {new Date(lastSale.saleDate).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
                {lastSale.orderRef ? ` · ${lastSale.orderRef}` : ""}
              </div>
            </>
          ) : (
            <div style={{ fontWeight: 700, marginTop: 4, color: "var(--muted)" }}>
              No sales yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

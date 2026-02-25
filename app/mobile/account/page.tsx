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
    <div className="container" style={{ maxWidth: 560, paddingBottom: 24 }}>
      <div className="toolbar">
        <div>
          <h1 style={{ fontSize: 24, margin: 0 }}>Account</h1>
          <div className="muted" style={{ marginTop: 4 }}>Operational snapshot tied to your data.</div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <div className="tableWrap" style={{ padding: 14 }}>
          <div className="muted" style={{ fontSize: 12 }}>Total sales records</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{salesCount}</div>
        </div>
        <div className="tableWrap" style={{ padding: 14 }}>
          <div className="muted" style={{ fontSize: 12 }}>Total inventory records</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{stockCount}</div>
        </div>
        <div className="tableWrap" style={{ padding: 14 }}>
          <div className="muted" style={{ fontSize: 12 }}>Latest sale</div>
          <div style={{ fontWeight: 700, marginTop: 2 }}>
            {lastSale
              ? `${lastSale.platform || "Unknown"} • ${new Date(lastSale.saleDate).toLocaleDateString()}`
              : "No sales yet"}
          </div>
          {lastSale?.orderRef ? (
            <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>Order {lastSale.orderRef}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

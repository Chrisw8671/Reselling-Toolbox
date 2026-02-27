import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function MobileSalesPage() {
  const sales = await prisma.sale.findMany({
    where: { archived: false },
    orderBy: { saleDate: "desc" },
    take: 20,
    select: {
      id: true,
      platform: true,
      saleDate: true,
      orderRef: true,
      fulfillmentStatus: true,
      lines: { select: { salePrice: true } },
    },
  });

  return (
    <div className="container" style={{ maxWidth: 560, paddingBottom: 24 }}>
      <div className="toolbar">
        <div>
          <h1 style={{ fontSize: 24, margin: 0 }}>Sales</h1>
          <div className="muted" style={{ marginTop: 4 }}>Recent orders and fulfillment status.</div>
        </div>
        <Link href="/sales/new" className="btn">+ New</Link>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {sales.map((sale) => {
          const total = sale.lines.reduce((sum, line) => sum + Number(line.salePrice), 0);
          return (
            <Link
              href={`/sales/${sale.id}`}
              key={sale.id}
              className="tableWrap"
              style={{ padding: 12, textDecoration: "none" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontWeight: 700 }}>{sale.platform || "Unknown platform"}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {new Date(sale.saleDate).toLocaleDateString()}
                </div>
              </div>
              <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>
                {sale.orderRef ? `Order ${sale.orderRef}` : "No order reference"}
              </div>
              <div style={{ marginTop: 6, fontSize: 14 }}>
                £{total.toFixed(2)} • {sale.fulfillmentStatus}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
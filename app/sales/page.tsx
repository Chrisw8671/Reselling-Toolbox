import Link from "next/link";
import { prisma } from "@/lib/prisma";
import SalesTable from "@/components/SalesTable";

export default async function SalesPage() {
  const sales = await prisma.sale.findMany({
    where: { archivedAt: null },
    orderBy: { saleDate: "desc" },
    take: 200,
    select: {
      id: true,
      platform: true,
      saleDate: true,
      orderRef: true,
      shippingCharged: true,
      platformFees: true,
      shippingCost: true,
      otherCosts: true,
      lines: {
        select: {
          salePrice: true,
          stockUnit: { select: { purchaseCost: true } },
        },
      },
    },
  });

  const rows = sales.map((s) => {
    const itemCount = s.lines.length;

    const itemsTotal = s.lines.reduce((sum, l) => sum + Number(l.salePrice), 0);
    const purchaseTotal = s.lines.reduce(
      (sum, l) => sum + Number(l.stockUnit.purchaseCost),
      0
    );

    const shippingCharged = Number(s.shippingCharged);
    const platformFees = Number(s.platformFees);
    const shippingCost = Number(s.shippingCost);
    const otherCosts = Number(s.otherCosts);

    const revenue = itemsTotal + shippingCharged;
    const costs = purchaseTotal + platformFees + shippingCost + otherCosts;
    const profit = revenue - costs;

    return {
      id: s.id,
      platform: s.platform,
      saleDate: s.saleDate.toISOString(),
      orderRef: s.orderRef ?? "",
      itemCount,
      revenue,
      costs,
      profit,
    };
  });

  const totalProfit = rows.reduce((sum, r) => sum + r.profit, 0);

  return (
    <div className="container">
      <div className="toolbar">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Sales</h1>
          <div className="muted" style={{ marginTop: 4 }}>
            {rows.length} sale(s) • Total profit shown: £{totalProfit.toFixed(2)}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <Link className="btn" href="/sales/new">
            + Create Sale
          </Link>
        </div>
      </div>

      <SalesTable rows={rows} />

      <div className="muted" style={{ marginTop: 12 }}>
        Profit: (item prices + shipping charged) − (purchase costs + fees +
        shipping cost + other costs).
      </div>
    </div>
  );
}
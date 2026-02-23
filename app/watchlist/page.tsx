import Link from "next/link";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export default async function WatchlistPage() {
  async function toggleActive(formData: FormData) {
    "use server";

    const id = String(formData.get("watchId") ?? "").trim();
    const next = String(formData.get("next") ?? "").trim() === "1";
    if (!id) return;

    await prisma.productWatch.update({ where: { id }, data: { active: next } });
    revalidatePath("/watchlist");
    revalidatePath("/reports");
  }

  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const watches = await prisma.productWatch.findMany({
    orderBy: [{ active: "desc" }, { priority: "asc" }, { createdAt: "desc" }],
    include: {
      product: {
        select: {
          id: true,
          title: true,
          brand: true,
          stockUnits: {
            where: { archived: false },
            select: {
              status: true,
              saleLine: {
                select: {
                  salePrice: true,
                  sale: { select: { saleDate: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  const rows = watches.map((watch) => {
    const saleLines = watch.product.stockUnits
      .flatMap((u) => (u.saleLine ? [u.saleLine] : []))
      .sort((a, b) => +new Date(b.sale.saleDate) - +new Date(a.sale.saleDate));

    const soldLast30 = saleLines.filter((l) => new Date(l.sale.saleDate) >= since30).length;
    const avgSalePrice =
      saleLines.length === 0
        ? 0
        : saleLines.reduce((sum, l) => sum + Number(l.salePrice), 0) / saleLines.length;
    const lastSoldAt = saleLines[0]?.sale.saleDate ?? null;

    const activeStock = watch.product.stockUnits.filter(
      (u) => u.status === "IN_STOCK" || u.status === "LISTED",
    ).length;

    return {
      ...watch,
      soldLast30,
      avgSalePrice,
      lastSoldAt,
      activeStock,
      zeroStockSignal: watch.active && activeStock === 0,
    };
  });

  return (
    <div className="container">
      <div className="toolbar">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Watchlist</h1>
          <div className="muted" style={{ marginTop: 4 }}>
            Products you want to replenish quickly when good buy opportunities appear.
          </div>
        </div>

        <Link className="btn" href="/reports">
          Back to reports
        </Link>
      </div>

      <div className="tableWrap" style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Target buy</th>
              <th>Recent sell data</th>
              <th>Stock signal</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  No watched products yet. Add from the Top movers section in reports.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const prefill = new URLSearchParams({
                  title: row.product.title,
                  brand: row.product.brand ?? "",
                  targetBuy: row.targetBuyPrice ? String(Number(row.targetBuyPrice)) : "",
                  productId: row.product.id,
                }).toString();

                return (
                  <tr key={row.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>
                        {row.product.brand ? `${row.product.brand} ` : ""}
                        {row.product.title}
                      </div>
                      {row.notes && <div className="muted">{row.notes}</div>}
                    </td>
                    <td>
                      {row.targetBuyPrice ? `£${Number(row.targetBuyPrice).toFixed(2)}` : "—"}
                    </td>
                    <td>
                      <div>{row.soldLast30} sold in 30d</div>
                      <div className="muted">Avg sale £{row.avgSalePrice.toFixed(2)}</div>
                      <div className="muted">
                        Last sold: {row.lastSoldAt ? new Date(row.lastSoldAt).toLocaleDateString() : "—"}
                      </div>
                    </td>
                    <td>
                      {row.zeroStockSignal ? (
                        <span style={{ color: "#b91c1c", fontWeight: 600 }}>
                          Needs restock (0 active stock)
                        </span>
                      ) : (
                        <span className="muted">{row.activeStock} active in stock/listed</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <Link className="btn" href={`/inventory/new?${prefill}`}>
                          New inventory (prefill)
                        </Link>
                        <form action={toggleActive}>
                          <input type="hidden" name="watchId" value={row.id} />
                          <input
                            type="hidden"
                            name="next"
                            value={row.active ? "0" : "1"}
                          />
                          <button className="btn" type="submit">
                            {row.active ? "Pause" : "Activate"}
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

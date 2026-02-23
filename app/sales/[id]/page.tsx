import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import SaleArchiveButton from "@/components/SaleArchiveButton";
import ReturnManager from "@/components/ReturnManager";

type Props = { params: Promise<{ id: string }> };

export default async function SaleDetailPage({ params }: Props) {
  const { id } = await params;

  const sale = await prisma.sale.findUnique({
    where: { id },
    select: {
      id: true,
      platform: true,
      saleDate: true,
      orderRef: true,
      shippingCharged: true,
      platformFees: true,
      shippingCost: true,
      otherCosts: true,
      notes: true,
      archivedAt: true, // ✅ added
      returnCases: {
        select: {
          id: true,
          stockUnitId: true,
          reason: true,
          openedAt: true,
          closedAt: true,
          refundAmount: true,
          returnShippingCost: true,
          restockable: true,
        },
        orderBy: { openedAt: "desc" },
      },
      lines: {
        select: {
          salePrice: true,
          stockUnit: {
            select: {
              id: true,
              sku: true,
              titleOverride: true,
              purchaseCost: true,
              location: { select: { code: true } },
            },
          },
        },
      },
    },
  });

  if (!sale) return notFound();

  const lines = sale.lines.map((l) => {
    const buy = Number(l.stockUnit.purchaseCost);
    const sell = Number(l.salePrice);
    return {
      sku: l.stockUnit.sku,
      title: l.stockUnit.titleOverride ?? "—",
      loc: l.stockUnit.location?.code ?? "—",
      buy,
      sell,
      itemProfit: sell - buy,
    };
  });

  const itemsTotal = lines.reduce((s, x) => s + x.sell, 0);
  const purchaseTotal = lines.reduce((s, x) => s + x.buy, 0);

  const shippingCharged = Number(sale.shippingCharged);
  const platformFees = Number(sale.platformFees);
  const shippingCost = Number(sale.shippingCost);
  const otherCosts = Number(sale.otherCosts);
  const refundAmount = sale.returnCases.reduce((s, r) => s + Number(r.refundAmount), 0);
  const returnShippingCost = sale.returnCases.reduce(
    (s, r) => s + Number(r.returnShippingCost),
    0,
  );

  const revenue = itemsTotal + shippingCharged;
  const costs =
    purchaseTotal +
    platformFees +
    shippingCost +
    otherCosts +
    refundAmount +
    returnShippingCost;
  const profit = revenue - costs;

  return (
    <div className="container">
      <div className="toolbar">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Sale</h1>
          <div className="muted" style={{ marginTop: 4 }}>
            {sale.platform} • {sale.saleDate.toLocaleDateString()} •{" "}
            {sale.orderRef ?? "—"}
            {sale.archivedAt ? " • Archived" : ""}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          {/* ✅ new Archive/Unarchive button */}
          <SaleArchiveButton saleId={sale.id} archived={!!sale.archivedAt} />

          <Link className="btn" href="/sales">
            ← Sales
          </Link>
        </div>
      </div>

      {/* Summary */}
      <ReturnManager
        saleId={sale.id}
        lines={sale.lines}
        existingCases={sale.returnCases}
      />

      <div className="tableWrap" style={{ padding: 16, marginBottom: 16 }}>
        <div
          style={{
            display: "grid",
            gap: 10,
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          }}
        >
          <div>
            <b>Items:</b> {lines.length}
          </div>
          <div>
            <b>Revenue:</b> £{revenue.toFixed(2)}
          </div>
          <div>
            <b>Profit:</b>{" "}
            <span className={`badge ${profit >= 0 ? "profitPos" : "profitNeg"}`}>
              £{profit.toFixed(2)}
            </span>
          </div>

          <div>
            <b>Items total:</b> £{itemsTotal.toFixed(2)}
          </div>
          <div>
            <b>Shipping charged:</b> £{shippingCharged.toFixed(2)}
          </div>
          <div>
            <b>Purchase total:</b> £{purchaseTotal.toFixed(2)}
          </div>

          <div>
            <b>Platform fees:</b> £{platformFees.toFixed(2)}
          </div>
          <div>
            <b>Shipping cost:</b> £{shippingCost.toFixed(2)}
          </div>
          <div>
            <b>Other costs:</b> £{otherCosts.toFixed(2)}
          </div>
          <div>
            <b>Refunds:</b> £{refundAmount.toFixed(2)}
          </div>
          <div>
            <b>Return shipping:</b> £{returnShippingCost.toFixed(2)}
          </div>
        </div>

        {sale.notes && (
          <div style={{ marginTop: 12 }} className="muted">
            {sale.notes}
          </div>
        )}
      </div>

      {/* Line items */}
      <div className="tableWrap">
        <table className="table">
          <thead className="thead">
            <tr>
              <th className="th" style={{ width: 160 }}>
                SKU
              </th>
              <th className="th">Title</th>
              <th className="th" style={{ width: 110 }}>
                Loc
              </th>
              <th className="th" style={{ width: 130 }}>
                Buy
              </th>
              <th className="th" style={{ width: 130 }}>
                Sell
              </th>
              <th className="th" style={{ width: 140 }}>
                Item Profit
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr className="tr" key={l.sku}>
                <td className="td">{l.sku}</td>
                <td className="td titleCell">{l.title}</td>
                <td className="td">{l.loc}</td>
                <td className="td">£{l.buy.toFixed(2)}</td>
                <td className="td">£{l.sell.toFixed(2)}</td>
                <td className="td">
                  <span
                    className={`badge ${l.itemProfit >= 0 ? "profitPos" : "profitNeg"}`}
                  >
                    £{l.itemProfit.toFixed(2)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="muted" style={{ marginTop: 12 }}>
        Note: “Item Profit” is sell − buy. The overall profit also includes
        fees/shipping/other costs.
      </div>
    </div>
  );
}

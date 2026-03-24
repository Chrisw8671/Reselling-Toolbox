import { badgeClass, cx, ui } from "@/lib/ui";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import SaleArchiveButton from "@/components/SaleArchiveButton";
import ReturnManager from "@/components/ReturnManager";
import SaleFulfillmentEditor from "@/components/SaleFulfillmentEditor";
import { FULFILLMENT_LABEL, FulfillmentStatus } from "@/lib/fulfillment";
import { buildSaleDetailView } from "@/lib/sale-detail";

type Props = { params: Promise<{ id: string }> };

function toDatetimeLocal(date: Date | null): string {
  if (!date) return "";
  const tzOffset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - tzOffset * 60_000);
  return local.toISOString().slice(0, 16);
}

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
      archivedAt: true,
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
      fulfillmentStatus: true,
      trackingNumber: true,
      carrier: true,
      shippedAt: true,
      deliveredAt: true,
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

  const returnCases = sale.returnCases.map((rc) => ({
    id: rc.id,
    stockUnitId: rc.stockUnitId,
    reason: rc.reason,
    openedAt: rc.openedAt.toISOString(),
    closedAt: rc.closedAt ? rc.closedAt.toISOString() : null,
    refundAmount: Number(rc.refundAmount),
    returnShippingCost: Number(rc.returnShippingCost),
    restockable: rc.restockable,
  }));

  const returnManagerLines = sale.lines.map((line) => ({
    stockUnit: {
      id: line.stockUnit.id,
      sku: line.stockUnit.sku,
      titleOverride: line.stockUnit.titleOverride,
    },
  }));

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
    <div className={ui.page}>
      <div className={ui.toolbar}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Sale</h1>
          <div className={ui.muted} style={{ marginTop: 4 }}>
            {sale.platform} • {sale.saleDate.toLocaleDateString()} •{" "}
            {sale.orderRef ?? "—"} •{" "}
            {FULFILLMENT_LABEL[sale.fulfillmentStatus as FulfillmentStatus]}
            {sale.archivedAt ? " • Archived" : ""}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <SaleArchiveButton saleId={sale.id} archived={!!sale.archivedAt} />

          <Link className={ui.button} href="/sales">
            ← Sales
          </Link>
        </div>
      </div>

      <ReturnManager
        saleId={sale.id}
        lines={returnManagerLines}
        existingCases={returnCases}
      />

      <SaleFulfillmentEditor
        saleId={sale.id}
        fulfillmentStatus={sale.fulfillmentStatus as FulfillmentStatus}
        trackingNumber={sale.trackingNumber ?? ""}
        carrier={sale.carrier ?? ""}
        shippedAt={toDatetimeLocal(sale.shippedAt)}
        deliveredAt={toDatetimeLocal(sale.deliveredAt)}
      />

      <div className={ui.tableWrap} style={{ padding: 16, marginBottom: 16 }}>
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
            <span className={badgeClass(profit >= 0 ? "profitPos" : "profitNeg")}>
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
          <div style={{ marginTop: 12 }} className={ui.muted}>
            {sale.notes}
          </div>
        )}
      </div>

      <div className={ui.tableWrap}>
        <table className={ui.table}>
          <thead className={ui.thead}>
            <tr>
              <th className={ui.th} style={{ width: 160 }}>
                SKU
              </th>
              <th className={ui.th}>Title</th>
              <th className={ui.th} style={{ width: 110 }}>
                Loc
              </th>
              <th className={ui.th} style={{ width: 130 }}>
                Buy
              </th>
              <th className={ui.th} style={{ width: 130 }}>
                Sell
              </th>
              <th className={ui.th} style={{ width: 140 }}>
                Item Profit
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr className={ui.tr} key={l.sku}>
                <td className={ui.td}>{l.sku}</td>
                <td className={cx(ui.td, ui.titleCell)}>{l.title}</td>
                <td className={ui.td}>{l.loc}</td>
                <td className={ui.td}>£{l.buy.toFixed(2)}</td>
                <td className={ui.td}>£{l.sell.toFixed(2)}</td>
                <td className={ui.td}>
                  <span
                    className={badgeClass(l.itemProfit >= 0 ? "profitPos" : "profitNeg")}
                  >
                    £{l.itemProfit.toFixed(2)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={ui.muted} style={{ marginTop: 12 }}>
        Note: “Item Profit” is sell − buy. The overall profit also includes
        fees/shipping/other costs.
      </div>
    </div>
  );
}

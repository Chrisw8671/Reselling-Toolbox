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
      title: l.stockUnit.titleOverride ?? "\u2014",
      loc: l.stockUnit.location?.code ?? "\u2014",
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
    purchaseTotal + platformFees + shippingCost + otherCosts + refundAmount + returnShippingCost;
  const profit = revenue - costs;

  return (
    <div className="mobilePg">
      {/* Header */}
      <div style={{ paddingTop: 10, paddingBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <Link
            href="/mobile/sales"
            style={{ fontSize: 26, textDecoration: "none", color: "var(--text)", lineHeight: 1, flexShrink: 0 }}
          >
            &#x2039;
          </Link>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0, letterSpacing: "-0.3px" }}>
            {sale.platform || "Sale"}
          </h1>
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)", paddingLeft: 36 }}>
          {sale.saleDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          {sale.orderRef ? ` \u00b7 ${sale.orderRef}` : ""}
          {" \u00b7 "}
          {FULFILLMENT_LABEL[sale.fulfillmentStatus as FulfillmentStatus]}
          {sale.archivedAt ? " \u00b7 Archived" : ""}
        </div>
        <div style={{ paddingLeft: 36, marginTop: 8 }}>
          <SaleArchiveButton saleId={sale.id} archived={!!sale.archivedAt} />
        </div>
      </div>

      {/* Financial summary */}
      <div className="mobileCard">
        <div className="mobileCardTitle">Summary</div>

        {/* Profit + Revenue */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
            paddingBottom: 14,
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.4px" }}>
              Profit
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 900,
                letterSpacing: "-0.5px",
                color: profit >= 0 ? "var(--success)" : "var(--danger)",
              }}
            >
              £{profit.toFixed(2)}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.4px" }}>
              Revenue
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.3px" }}>
              £{revenue.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Detail grid: 2 cols */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
          {[
            ["Items", lines.length],
            ["Items total", `\u00a3${itemsTotal.toFixed(2)}`],
            ["Shipping charged", `\u00a3${shippingCharged.toFixed(2)}`],
            ["Purchase total", `\u00a3${purchaseTotal.toFixed(2)}`],
            ["Platform fees", `\u00a3${platformFees.toFixed(2)}`],
            ["Shipping cost", `\u00a3${shippingCost.toFixed(2)}`],
            ["Other costs", `\u00a3${otherCosts.toFixed(2)}`],
            ["Refunds", `\u00a3${refundAmount.toFixed(2)}`],
            ["Return shipping", `\u00a3${returnShippingCost.toFixed(2)}`],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>{label}</div>
              <div style={{ fontWeight: 700, marginTop: 1 }}>{value}</div>
            </div>
          ))}
        </div>

        {sale.notes && (
          <div style={{ marginTop: 12, fontSize: 13, color: "var(--muted)", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
            {sale.notes}
          </div>
        )}
      </div>

      {/* Fulfillment editor */}
      <SaleFulfillmentEditor
        saleId={sale.id}
        fulfillmentStatus={sale.fulfillmentStatus as FulfillmentStatus}
        trackingNumber={sale.trackingNumber ?? ""}
        carrier={sale.carrier ?? ""}
        shippedAt={toDatetimeLocal(sale.shippedAt)}
        deliveredAt={toDatetimeLocal(sale.deliveredAt)}
      />

      {/* Items as cards */}
      <div style={{ marginBottom: 14 }}>
        <div className="sectionLabel" style={{ marginBottom: 8 }}>
          Items ({lines.length})
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {lines.map((l) => (
            <div
              key={l.sku}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 12,
                background: "var(--panel)",
                padding: "11px 13px",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 14 }}>{l.title}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
                {l.sku}
                {l.loc !== "\u2014" ? ` \u00b7 ${l.loc}` : ""}
              </div>
              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ fontSize: 13, color: "var(--muted)" }}>
                  Buy £{l.buy.toFixed(2)} &rarr; Sell £{l.sell.toFixed(2)}
                </div>
                <span
                  className={`badge ${l.itemProfit >= 0 ? "profitPos" : "profitNeg"}`}
                  style={{ fontSize: 12 }}
                >
                  £{l.itemProfit.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
          Item profit = sell &minus; buy. Overall profit includes all fees and costs.
        </div>
      </div>

      {/* Returns */}
      <ReturnManager
        saleId={sale.id}
        lines={returnManagerLines}
        existingCases={returnCases}
      />
    </div>
  );
}

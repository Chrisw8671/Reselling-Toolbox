import { ui } from "@/lib/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import MobileInventoryItemEditor from "@/components/MobileInventoryItemEditor";

type Props = {
  params: Promise<{ sku: string }>;
};

export default async function MobileInventoryDetailPage({ params }: Props) {
  const { sku } = await params;
  const decodedSku = decodeURIComponent(sku);

  const item = await prisma.stockUnit.findUnique({
    where: { sku: decodedSku },
    select: {
      id: true,
      sku: true,
      titleOverride: true,
      status: true,
      condition: true,
      brand: true,
      size: true,
      purchasedFrom: true,
      purchaseRef: true,
      purchaseUrl: true,
      purchaseCost: true,
      extraCost: true,
      purchasedAt: true,
      targetMarginPct: true,
      recommendedPrice: true,
      lastPricingEvalAt: true,
      location: { select: { code: true } },
      notes: true,
      archived: true,
      createdAt: true,
      listings: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          platform: true,
          listingId: true,
          url: true,
          askPrice: true,
          status: true,
          listedAt: true,
          endedAt: true,
        },
      },
      saleLine: {
        select: {
          sale: {
            select: {
              id: true,
              saleDate: true,
              fulfillmentStatus: true,
              shippedAt: true,
              deliveredAt: true,
            },
          },
        },
      },
    },
  });

  if (!item) return notFound();

  const itemPlain = {
    sku: item.sku,
    stockUnitId: item.id,
    titleOverride: item.titleOverride ?? "",
    status: item.status,
    condition: item.condition ?? "",
    brand: item.brand ?? "",
    size: item.size ?? "",
    purchasedFrom: item.purchasedFrom ?? "",
    purchaseRef: item.purchaseRef ?? "",
    purchaseUrl: item.purchaseUrl ?? "",
    purchaseCost: Number(item.purchaseCost),
    extraCost: Number(item.extraCost),
    purchasedAt: item.purchasedAt.toISOString().slice(0, 10),
    locationCode: item.location?.code ?? "",
    notes: item.notes ?? "",
    archived: item.archived,
    targetMarginPct: item.targetMarginPct !== null ? Number(item.targetMarginPct) : "",
    recommendedPrice: item.recommendedPrice !== null ? Number(item.recommendedPrice) : "",
    lastPricingEvalAt: item.lastPricingEvalAt
      ? item.lastPricingEvalAt.toISOString().slice(0, 10)
      : "",
    createdAt: item.createdAt.toISOString().slice(0, 16).replace("T", " "),
    saleId: item.saleLine?.sale.id ?? "",
    saleDate: item.saleLine?.sale.saleDate.toISOString().slice(0, 10) ?? "",
    fulfillmentStatus: item.saleLine?.sale.fulfillmentStatus ?? "",
    shippedAt: item.saleLine?.sale.shippedAt?.toISOString().slice(0, 10) ?? "",
    deliveredAt: item.saleLine?.sale.deliveredAt?.toISOString().slice(0, 10) ?? "",
    listings: item.listings.map((l) => ({
      id: l.id,
      platform: l.platform,
      listingId: l.listingId,
      url: l.url ?? "",
      askPrice: Number(l.askPrice),
      status: l.status,
      listedAt: l.listedAt.toISOString().slice(0, 10),
      endedAt: l.endedAt ? l.endedAt.toISOString().slice(0, 10) : "",
    })),
  };

  return (
    <div className={ui.mobilePage}>
      {/* Header */}
      <div
        style={{
          paddingTop: 10,
          paddingBottom: 14,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Link
          href="/mobile/inventory"
          style={{
            fontSize: 26,
            textDecoration: "none",
            color: "var(--text)",
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          ‹
        </Link>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>
            {itemPlain.sku}
          </div>
          <h1
            style={{
              fontSize: 18,
              fontWeight: 800,
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {itemPlain.titleOverride || itemPlain.sku}
          </h1>
        </div>
      </div>

      <MobileInventoryItemEditor item={itemPlain} />
    </div>
  );
}

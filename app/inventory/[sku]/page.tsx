import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import InventoryItemEditor from "@/components/InventoryItemEditor";

type Props = {
  params: Promise<{ sku: string }>;
};

export default async function InventoryDetailPage({ params }: Props) {
  const { sku } = await params;
  const decodedSku = decodeURIComponent(sku);

  const item = await prisma.stockUnit.findUnique({
    where: { sku: decodedSku },
    select: {
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
      location: { select: { code: true } },
      notes: true,
      archived: true,
      createdAt: true,
    },
  });

  if (!item) return notFound();

  // Convert to plain JSON-safe values for client component
  const itemPlain = {
    sku: item.sku,
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
    createdAt: item.createdAt.toISOString().slice(0, 16).replace("T", " "),
  };

  return (
    <div className="container">
      <div className="toolbar">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
            Inventory Item
          </h1>
          <div className="muted" style={{ marginTop: 4 }}>
            SKU: {itemPlain.sku}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <Link className="btn" href="/inventory">
            ← Inventory
          </Link>
        </div>
      </div>

      <InventoryItemEditor item={itemPlain} />
    </div>
  );
}
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function MobileInventoryPage() {
  const items = await prisma.stockUnit.findMany({
    where: { archived: false },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      sku: true,
      titleOverride: true,
      status: true,
      purchaseCost: true,
      recommendedPrice: true,
      location: { select: { code: true } },
    },
  });

  return (
    <div className="container" style={{ maxWidth: 560, paddingBottom: 24 }}>
      <div className="toolbar">
        <div>
          <h1 style={{ fontSize: 24, margin: 0 }}>Inventory</h1>
          <div className="muted" style={{ marginTop: 4 }}>Latest 20 items for quick review.</div>
        </div>
        <Link href="/inventory/new" className="btn">+ Add</Link>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {items.map((item) => (
          <Link
            href={`/inventory/${item.sku}`}
            key={item.sku}
            className="tableWrap"
            style={{ padding: 12, textDecoration: "none" }}
          >
            <div style={{ fontWeight: 700 }}>{item.titleOverride || item.sku}</div>
            <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>
              SKU {item.sku} • {item.status} • {item.location?.code || "No location"}
            </div>
            <div style={{ marginTop: 6, fontSize: 14 }}>
              Cost £{Number(item.purchaseCost).toFixed(2)}
              {item.recommendedPrice ? ` • List £${Number(item.recommendedPrice).toFixed(2)}` : ""}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ArchivedSalesTable from "@/components/ArchivedSalesTable";

type Props = {
  searchParams?: Promise<{
    q?: string;
    platform?: string;
  }>;
};

export default async function ArchivedSalesPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim();
  const platform = (sp.platform ?? "").trim();

  const where: any = { archivedAt: { not: null } }; // ✅ ONLY archived

  if (platform) where.platform = platform;

  if (q) {
    where.OR = [
      { id: { contains: q, mode: "insensitive" } },
      { orderRef: { contains: q, mode: "insensitive" } },
      { platform: { contains: q, mode: "insensitive" } },
    ];
  }

  const sales = await prisma.sale.findMany({
    where,
    orderBy: { archivedAt: "desc" },
    take: 500,
    select: {
      id: true,
      platform: true,
      saleDate: true,
      orderRef: true,
      archivedAt: true,
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
      archivedAt: s.archivedAt ? s.archivedAt.toISOString() : null,
      itemCount,
      revenue,
      costs,
      profit,
    };
  });

  const platforms = await prisma.sale.findMany({
    where: { archivedAt: { not: null } }, // ✅ ONLY archived platforms
    distinct: ["platform"],
    select: { platform: true },
    orderBy: { platform: "asc" },
  });

  const totalProfit = rows.reduce((sum, r) => sum + r.profit, 0);

  return (
    <div className="container">
      <div className="toolbar">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
            Archived Sales
          </h1>
          <div className="muted" style={{ marginTop: 4 }}>
            {rows.length} sale(s) • Profit shown: £{totalProfit.toFixed(2)}
            {q ? ` • Filtered by “${q}”` : ""}
            {platform ? ` • Platform: ${platform}` : ""}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <Link className="btn" href="/sales">
            ← Sales
          </Link>
        </div>
      </div>

      {/* Filters card */}
      <div className="tableWrap" style={{ padding: 16, marginBottom: 16 }}>
        <form
          action="/sales/archive"
          method="get"
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "end",
          }}
        >
          <label style={{ flex: "1 1 320px" }}>
            Search (Order ref, platform, id)
            <input
              name="q"
              defaultValue={q}
              placeholder='e.g. "Vinted" or "ORD123"'
              style={{ width: "100%" }}
            />
          </label>

          <label style={{ width: 220 }}>
            Platform
            <select
              name="platform"
              defaultValue={platform}
              style={{ width: "100%" }}
            >
              <option value="">All</option>
              {platforms.map((p) => (
                <option key={p.platform} value={p.platform}>
                  {p.platform}
                </option>
              ))}
            </select>
          </label>

          <button className="btn" type="submit">
            Apply
          </button>

          {(q || platform) && (
            <Link className="btn" href="/sales/archive">
              Clear
            </Link>
          )}
        </form>
      </div>

      <ArchivedSalesTable rows={rows} />

      <div className="muted" style={{ marginTop: 12 }}>
        Profit: (item prices + shipping charged) − (purchase costs + fees +
        shipping cost + other costs).
      </div>
    </div>
  );
}
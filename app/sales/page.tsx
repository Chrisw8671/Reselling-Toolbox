import Link from "next/link";
import { prisma } from "@/lib/prisma";
import SalesTable from "@/components/SalesTable";

type Props = {
  searchParams?: Promise<{
    q?: string;
    platform?: string;
    this_month?: string;
  }>;
};

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export default async function SalesPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim();
  const platform = (sp.platform ?? "").trim();
  const thisMonth = (sp.this_month ?? "") === "1";

  const where: any = {
    archived: false, // ✅ only unarchived
  };

  if (platform) where.platform = platform;

  if (thisMonth) {
    where.saleDate = { gte: startOfMonth(new Date()) };
  }

  if (q) {
    where.OR = [
      { id: { contains: q, mode: "insensitive" } },
      { orderRef: { contains: q, mode: "insensitive" } },
      { platform: { contains: q, mode: "insensitive" } },
    ];
  }

  const sales = await prisma.sale.findMany({
    where,
    orderBy: { saleDate: "desc" },
    take: 300,
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

  // dropdown options (only from unarchived sales)
  const platforms = await prisma.sale.findMany({
    where: { archived: false },
    distinct: ["platform"],
    select: { platform: true },
    orderBy: { platform: "asc" },
  });

  // Build hrefs like Inventory does
  const qsBase = new URLSearchParams();
  if (q) qsBase.set("q", q);
  if (platform) qsBase.set("platform", platform);

  const thisMonthOnHref = `/sales?${new URLSearchParams({
    ...Object.fromEntries(qsBase),
    this_month: "1",
  }).toString()}`;

  const thisMonthOffHref = qsBase.toString()
    ? `/sales?${qsBase.toString()}`
    : "/sales";

  return (
    <div className="container">
      <div className="toolbar">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Sales</h1>
          <div className="muted" style={{ marginTop: 4 }}>
            {rows.length} sale(s) • Total profit shown: £{totalProfit.toFixed(2)}
            {(q || platform || thisMonth) && (
              <>
                {" "}
                • Filtered
                {q ? ` by “${q}”` : ""}
                {platform ? ` • Platform: ${platform}` : ""}
                {thisMonth ? ` • This month only` : ""}
              </>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="btn" href={thisMonth ? thisMonthOffHref : thisMonthOnHref}>
            {thisMonth ? "✓ This month only" : "This month only"}
          </Link>

          <Link className="btn" href="/sales/new">
            + Create Sale
          </Link>

        </div>
      </div>

      {/* Filters (same style as Inventory) */}
      <div className="tableWrap" style={{ padding: 16, marginBottom: 16 }}>
        <form
          action="/sales"
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
              placeholder='e.g. "Vinted", "ORD123", or sale id'
              style={{ width: "100%" }}
            />
          </label>

          <label style={{ width: 220 }}>
            Platform
            <select name="platform" defaultValue={platform} style={{ width: "100%" }}>
              <option value="">All</option>
              {platforms.map((p) => (
                <option key={p.platform} value={p.platform}>
                  {p.platform}
                </option>
              ))}
            </select>
          </label>

          {thisMonth && <input type="hidden" name="this_month" value="1" />}

          <button className="btn" type="submit">
            Apply
          </button>

          {(q || platform || thisMonth) && (
            <Link className="btn" href="/sales">
              Clear
            </Link>
          )}
        </form>
      </div>

      <SalesTable rows={rows} />

      <div className="muted" style={{ marginTop: 12 }}>
        Profit: (item prices + shipping charged) − (purchase costs + fees + shipping
        cost + other costs).
      </div>
    </div>
  );
}
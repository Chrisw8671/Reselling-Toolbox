import { prisma } from "@/lib/prisma";
import ReportsCharts from "@/components/ReportsCharts";
import { formatStatus } from "@/lib/status";

function monthKey(d: Date) {
  // "2026-02"
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function lastNMonths(n: number) {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(monthKey(d));
  }
  return out;
}

export default async function ReportsPage() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [sales, salesThisMonth, stockUnits, listings] = await Promise.all([
    prisma.sale.findMany({
      orderBy: { saleDate: "asc" },
      select: {
        platform: true,
        saleDate: true,
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
    }),
    prisma.sale.findMany({
      where: { saleDate: { gte: startOfMonth } },
      select: {
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
    }),
    prisma.stockUnit.findMany({
      where: { archived: false },
      select: {
        status: true,
        purchaseCost: true,
        purchasedAt: true,
      },
    }),
    prisma.listing.findMany({
      select: {
        platform: true,
        stockUnit: {
          select: {
            id: true,
            status: true,
            purchaseCost: true,
          },
        },
      },
    }),
  ]);

  // ----- KPI helpers -----
  function profitForSale(s: (typeof sales)[number]) {
    const itemsTotal = s.lines.reduce((sum, l) => sum + Number(l.salePrice), 0);
    const purchaseTotal = s.lines.reduce(
      (sum, l) => sum + Number(l.stockUnit.purchaseCost),
      0,
    );

    const revenue = itemsTotal + Number(s.shippingCharged);
    const costs =
      purchaseTotal +
      Number(s.platformFees) +
      Number(s.shippingCost) +
      Number(s.otherCosts);

    return revenue - costs;
  }

  const totalProfit = sales.reduce((sum, s) => sum + profitForSale(s), 0);
  const monthProfit = salesThisMonth.reduce((sum, s) => {
    const itemsTotal = s.lines.reduce((a, l) => a + Number(l.salePrice), 0);
    const purchaseTotal = s.lines.reduce(
      (a, l) => a + Number(l.stockUnit.purchaseCost),
      0,
    );
    const revenue = itemsTotal + Number(s.shippingCharged);
    const costs =
      purchaseTotal +
      Number(s.platformFees) +
      Number(s.shippingCost) +
      Number(s.otherCosts);
    return sum + (revenue - costs);
  }, 0);

  const inventoryValue = stockUnits
    .filter((x) => x.status !== "SOLD")
    .reduce((sum, x) => sum + Number(x.purchaseCost), 0);

  const totalItems = stockUnits.length;
  const soldItems = stockUnits.filter((x) => x.status === "SOLD").length;
  const sellThrough = totalItems === 0 ? 0 : (soldItems / totalItems) * 100;

  const deadStock = stockUnits.filter((x) => {
    const days = (Date.now() - new Date(x.purchasedAt).getTime()) / (1000 * 60 * 60 * 24);
    return x.status !== "SOLD" && days > 90;
  }).length;

  // ----- Chart data -----

  // A) Monthly profit (last 12 months)
  const months = lastNMonths(12);
  const profitByMonth = new Map<string, number>(months.map((m) => [m, 0]));

  for (const s of sales) {
    const key = monthKey(new Date(s.saleDate));
    if (!profitByMonth.has(key)) continue; // outside last 12 months
    profitByMonth.set(key, (profitByMonth.get(key) ?? 0) + profitForSale(s));
  }

  const monthlyProfit = months.map((m) => ({
    month: m.slice(5), // show "02" instead of "2026-02"
    profit: Number((profitByMonth.get(m) ?? 0).toFixed(2)),
  }));

  // B) Profit by platform
  const platformMap = new Map<string, number>();
  for (const s of sales) {
    const p = s.platform || "Unknown";
    platformMap.set(p, (platformMap.get(p) ?? 0) + profitForSale(s));
  }
  const profitByPlatform = Array.from(platformMap.entries())
    .map(([platform, profit]) => ({ platform, profit: Number(profit.toFixed(2)) }))
    .sort((a, b) => b.profit - a.profit);

  // C) Platform-level listing slices (sell-through + inventory cost)
  const platformSlices = new Map<
    string,
    { listedUnits: number; soldUnits: number; inventoryCost: number }
  >();
  const dedupe = new Set<string>();

  for (const listing of listings) {
    const dedupeKey = `${listing.platform}::${listing.stockUnit.id}`;
    if (dedupe.has(dedupeKey)) continue;
    dedupe.add(dedupeKey);

    const row = platformSlices.get(listing.platform) ?? {
      listedUnits: 0,
      soldUnits: 0,
      inventoryCost: 0,
    };

    row.listedUnits += 1;
    if (listing.stockUnit.status === "SOLD") row.soldUnits += 1;
    row.inventoryCost += Number(listing.stockUnit.purchaseCost);

    platformSlices.set(listing.platform, row);
  }

  const platformSellThroughSlices = Array.from(platformSlices.entries())
    .map(([platform, data]) => ({
      platform,
      listedUnits: data.listedUnits,
      soldUnits: data.soldUnits,
      sellThroughPct:
        data.listedUnits === 0
          ? 0
          : Number(((data.soldUnits / data.listedUnits) * 100).toFixed(1)),
      inventoryCost: Number(data.inventoryCost.toFixed(2)),
    }))
    .sort((a, b) => b.listedUnits - a.listedUnits);

  // D) Inventory status pie
  const statusMap = new Map<string, number>();
  for (const u of stockUnits) {
    statusMap.set(u.status, (statusMap.get(u.status) ?? 0) + 1);
  }
  const inventoryStatus = Array.from(statusMap.entries()).map(([name, value]) => ({
    name: formatStatus(name),
    value,
  }));

  // E) Aging buckets (unsold only)
  const buckets = [
    { bucket: "0-30", count: 0 },
    { bucket: "31-60", count: 0 },
    { bucket: "61-90", count: 0 },
    { bucket: "91-180", count: 0 },
    { bucket: "180+", count: 0 },
  ];

  for (const u of stockUnits) {
    if (u.status === "SOLD") continue;
    const days = (Date.now() - new Date(u.purchasedAt).getTime()) / (1000 * 60 * 60 * 24);

    if (days <= 30) buckets[0].count++;
    else if (days <= 60) buckets[1].count++;
    else if (days <= 90) buckets[2].count++;
    else if (days <= 180) buckets[3].count++;
    else buckets[4].count++;
  }

  return (
    <div className="container">
      <div className="toolbar">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Reports</h1>
          <div className="muted" style={{ marginTop: 4 }}>
            Overview + charts for performance and stock health
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          marginBottom: 16,
        }}
      >
        <div className="tableWrap" style={{ padding: 16 }}>
          <div className="muted">Total Profit</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>£{totalProfit.toFixed(2)}</div>
        </div>

        <div className="tableWrap" style={{ padding: 16 }}>
          <div className="muted">Profit This Month</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>£{monthProfit.toFixed(2)}</div>
        </div>

        <div className="tableWrap" style={{ padding: 16 }}>
          <div className="muted">Inventory Value (Cost)</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>
            £{inventoryValue.toFixed(2)}
          </div>
        </div>

        <div className="tableWrap" style={{ padding: 16 }}>
          <div className="muted">Sell-Through</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{sellThrough.toFixed(1)}%</div>
        </div>

        <div className="tableWrap" style={{ padding: 16 }}>
          <div className="muted">Dead Stock (90+ days)</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{deadStock}</div>
        </div>
      </div>

      {/* Charts */}
      <ReportsCharts
        monthlyProfit={monthlyProfit}
        profitByPlatform={profitByPlatform}
        inventoryStatus={inventoryStatus}
        agingBuckets={buckets}
      />

      <div className="tableWrap" style={{ padding: 16, marginTop: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>
          Platform sell-through and inventory slices
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Platform</th>
                <th>Listed Units</th>
                <th>Sold Units</th>
                <th>Sell-through %</th>
                <th>Inventory Cost Slice</th>
              </tr>
            </thead>
            <tbody>
              {platformSellThroughSlices.map((row) => (
                <tr key={row.platform}>
                  <td>{row.platform}</td>
                  <td>{row.listedUnits}</td>
                  <td>{row.soldUnits}</td>
                  <td>{row.sellThroughPct.toFixed(1)}%</td>
                  <td>£{row.inventoryCost.toFixed(2)}</td>
                </tr>
              ))}
              {platformSellThroughSlices.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    No platform listing data yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

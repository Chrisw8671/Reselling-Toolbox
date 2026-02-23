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

  const [sales, salesThisMonth, stockUnits] = await Promise.all([
    prisma.sale.findMany({
      orderBy: { saleDate: "asc" },
      select: {
        platform: true,
        saleDate: true,
        shippingCharged: true,
        platformFees: true,
        shippingCost: true,
        otherCosts: true,
        returnCases: {
          select: {
            refundAmount: true,
            returnShippingCost: true,
          },
        },
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
        returnCases: {
          select: {
            refundAmount: true,
            returnShippingCost: true,
          },
        },
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
      Number(s.otherCosts) +
      s.returnCases.reduce((sum, r) => sum + Number(r.refundAmount), 0) +
      s.returnCases.reduce((sum, r) => sum + Number(r.returnShippingCost), 0);

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
      Number(s.otherCosts) +
      s.returnCases.reduce((a, r) => a + Number(r.refundAmount), 0) +
      s.returnCases.reduce((a, r) => a + Number(r.returnShippingCost), 0);
    return sum + (revenue - costs);
  }, 0);

  const totalReturnCases = sales.reduce((sum, s) => sum + s.returnCases.length, 0);
  const returnRate = sales.length === 0 ? 0 : (totalReturnCases / sales.length) * 100;
  const totalReturnCost = sales.reduce(
    (sum, s) =>
      sum +
      s.returnCases.reduce(
        (inner, rc) => inner + Number(rc.refundAmount) + Number(rc.returnShippingCost),
        0,
      ),
    0,
  );

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

  const platformSalesMap = new Map<string, number>();
  const returnSalesPlatformMap = new Map<string, number>();
  const returnCostPlatformMap = new Map<string, number>();
  for (const s of sales) {
    const p = s.platform || "Unknown";
    platformSalesMap.set(p, (platformSalesMap.get(p) ?? 0) + 1);
    if (s.returnCases.length > 0) {
      returnSalesPlatformMap.set(p, (returnSalesPlatformMap.get(p) ?? 0) + 1);
    }
    const returnCostForSale = s.returnCases.reduce(
      (sum, rc) => sum + Number(rc.refundAmount) + Number(rc.returnShippingCost),
      0,
    );
    returnCostPlatformMap.set(p, (returnCostPlatformMap.get(p) ?? 0) + returnCostForSale);
  }
  const marginImpactByPlatform = Array.from(platformSalesMap.entries())
    .map(([platform, saleCount]) => {
      const returnedSalesCount = returnSalesPlatformMap.get(platform) ?? 0;
      const returnCost = returnCostPlatformMap.get(platform) ?? 0;
      const platformProfit = platformMap.get(platform) ?? 0;
      const returnRatePct = saleCount === 0 ? 0 : (returnedSalesCount / saleCount) * 100;
      const marginImpactPct =
        platformProfit === 0 ? 0 : (returnCost / Math.abs(platformProfit)) * 100;
      return {
        platform,
        returnRatePct: Number(returnRatePct.toFixed(1)),
        returnCost: Number(returnCost.toFixed(2)),
        marginImpactPct: Number(marginImpactPct.toFixed(1)),
      };
    })
    .sort((a, b) => b.returnCost - a.returnCost);

  // C) Inventory status pie
  const statusMap = new Map<string, number>();
  for (const u of stockUnits) {
    statusMap.set(u.status, (statusMap.get(u.status) ?? 0) + 1);
  }
  const inventoryStatus = Array.from(statusMap.entries()).map(([name, value]) => ({
    name: formatStatus(name),
    value,
  }));

  // D) Aging buckets (unsold only)
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

        <div className="tableWrap" style={{ padding: 16 }}>
          <div className="muted">Return Rate (per sale)</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{returnRate.toFixed(1)}%</div>
        </div>

        <div className="tableWrap" style={{ padding: 16 }}>
          <div className="muted">Total Return Cost</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>
            £{totalReturnCost.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="tableWrap" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
          Margin impact by platform
        </div>
        <table className="table">
          <thead className="thead">
            <tr>
              <th className="th">Platform</th>
              <th className="th">Return Rate</th>
              <th className="th">Return Cost</th>
              <th className="th">Margin Impact</th>
            </tr>
          </thead>
          <tbody>
            {marginImpactByPlatform.map((r) => (
              <tr className="tr" key={r.platform}>
                <td className="td">{r.platform}</td>
                <td className="td">{r.returnRatePct.toFixed(1)}%</td>
                <td className="td">£{r.returnCost.toFixed(2)}</td>
                <td className="td">{r.marginImpactPct.toFixed(1)}%</td>
              </tr>
            ))}
            {marginImpactByPlatform.length === 0 && (
              <tr className="tr">
                <td className="td" colSpan={4}>
                  No platform data yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Charts */}
      <ReportsCharts
        monthlyProfit={monthlyProfit}
        profitByPlatform={profitByPlatform}
        inventoryStatus={inventoryStatus}
        agingBuckets={buckets}
      />
    </div>
  );
}

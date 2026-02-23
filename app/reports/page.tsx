import Link from "next/link";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import ReportsCharts from "@/components/ReportsCharts";
import { formatStatus } from "@/lib/status";

function monthKey(d: Date) {
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
  async function addToWatchlist(formData: FormData) {
    "use server";

    const productId = String(formData.get("productId") ?? "").trim();
    if (!productId) return;

    await prisma.productWatch.upsert({
      where: { productId },
      create: { productId, active: true },
      update: { active: true },
    });

    revalidatePath("/reports");
    revalidatePath("/watchlist");
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const since30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const since60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const since90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const [sales, salesThisMonth, stockUnits, saleLines90d, listings] = await Promise.all([
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
    prisma.saleLine.findMany({
      where: {
        sale: { saleDate: { gte: since90 }, archived: false },
        stockUnit: { productId: { not: null } },
      },
      select: {
        salePrice: true,
        sale: { select: { saleDate: true } },
        stockUnit: {
          select: {
            productId: true,
            purchaseCost: true,
            purchasedAt: true,
            product: {
              select: {
                title: true,
                brand: true,
                watch: { select: { id: true, active: true } },
              },
            },
          },
        },
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

  const months = lastNMonths(12);
  const profitByMonth = new Map<string, number>(months.map((m) => [m, 0]));

  for (const s of sales) {
    const key = monthKey(new Date(s.saleDate));
    if (!profitByMonth.has(key)) continue;
    profitByMonth.set(key, (profitByMonth.get(key) ?? 0) + profitForSale(s));
  }

  const monthlyProfit = months.map((m) => ({
    month: m.slice(5),
    profit: Number((profitByMonth.get(m) ?? 0).toFixed(2)),
  }));

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

  const statusMap = new Map<string, number>();
  for (const u of stockUnits) {
    statusMap.set(u.status, (statusMap.get(u.status) ?? 0) + 1);
  }
  const inventoryStatus = Array.from(statusMap.entries()).map(([name, value]) => ({
    name: formatStatus(name),
    value,
  }));

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

  type Mover = {
    productId: string;
    product: string;
    units30: number;
    units60: number;
    units90: number;
    avgDaysToSell: number;
    grossMarginPct: number;
    watched: boolean;
  };

  const moverMap = new Map<string, Mover & { totalRevenue: number; totalCost: number }>();

  for (const line of saleLines90d) {
    const productId = line.stockUnit.productId;
    const productTitle = line.stockUnit.product?.title;
    if (!productId || !productTitle) continue;

    const saleDate = new Date(line.sale.saleDate);
    const daysToSell =
      (saleDate.getTime() - new Date(line.stockUnit.purchasedAt).getTime()) /
      (1000 * 60 * 60 * 24);

    const existing = moverMap.get(productId) ?? {
      productId,
      product: line.stockUnit.product?.brand
        ? `${line.stockUnit.product.brand} ${productTitle}`
        : productTitle,
      units30: 0,
      units60: 0,
      units90: 0,
      avgDaysToSell: 0,
      grossMarginPct: 0,
      totalRevenue: 0,
      totalCost: 0,
      watched: Boolean(line.stockUnit.product?.watch?.active),
    };

    if (saleDate >= since30) existing.units30 += 1;
    if (saleDate >= since60) existing.units60 += 1;
    if (saleDate >= since90) existing.units90 += 1;

    existing.avgDaysToSell += Math.max(0, daysToSell);
    existing.totalRevenue += Number(line.salePrice);
    existing.totalCost += Number(line.stockUnit.purchaseCost);

    moverMap.set(productId, existing);
  }

  const topMovers = Array.from(moverMap.values())
    .map((m) => {
      const avgDaysToSell = m.units90 === 0 ? 0 : m.avgDaysToSell / m.units90;
      const grossMarginPct =
        m.totalRevenue === 0
          ? 0
          : ((m.totalRevenue - m.totalCost) / m.totalRevenue) * 100;

      return {
        productId: m.productId,
        product: m.product,
        units30: m.units30,
        units60: m.units60,
        units90: m.units90,
        avgDaysToSell,
        grossMarginPct,
        watched: m.watched,
      };
    })
    .sort(
      (a, b) => b.units30 - a.units30 || b.units60 - a.units60 || b.units90 - a.units90,
    )
    .slice(0, 12);

  return (
    <div className="container">
      <div className="toolbar">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Reports</h1>
          <div className="muted" style={{ marginTop: 4 }}>
            Overview + charts for performance and stock health
          </div>
        </div>

        <Link className="btn" href="/watchlist">
          Watchlist
        </Link>
      </div>

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

      <div className="tableWrap" style={{ marginBottom: 16, overflowX: "auto" }}>
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid #eee",
            fontWeight: 700,
          }}
        >
          Top movers (rolling 30 / 60 / 90 days)
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Units sold (30d)</th>
              <th>Velocity (60d / 90d)</th>
              <th>Avg days-to-sell</th>
              <th>Gross margin</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {topMovers.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">
                  No sales with linked products in the last 90 days.
                </td>
              </tr>
            ) : (
              topMovers.map((m) => (
                <tr key={m.productId}>
                  <td>{m.product}</td>
                  <td>{m.units30}</td>
                  <td>
                    {m.units60} / {m.units90}
                  </td>
                  <td>{m.avgDaysToSell.toFixed(1)} days</td>
                  <td>{m.grossMarginPct.toFixed(1)}%</td>
                  <td>
                    {m.watched ? (
                      <span className="muted">Watching</span>
                    ) : (
                      <form action={addToWatchlist}>
                        <input type="hidden" name="productId" value={m.productId} />
                        <button className="btn" type="submit">
                          Add to watchlist
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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

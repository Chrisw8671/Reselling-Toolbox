import Link from "next/link";
import { prisma } from "@/lib/prisma";

// Helpers
function startOfWeek(d: Date) {
  // Monday as start of week
  const date = new Date(d);
  const day = date.getDay(); // 0=Sun,1=Mon...
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function money(n: number) {
  return `£${n.toFixed(2)}`;
}

export default async function HomePage() {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  // --- Fetch dashboard data ---
  const [
    totalStock,
    addedThisWeek,
    inStockCount,
    listedCount,
    soldCount,
    salesThisMonth,
  ] = await Promise.all([
    prisma.stockUnit.count({ where: { archived: false } }),
    prisma.stockUnit.count({
      where: { archived: false, createdAt: { gte: weekStart } },
    }),
    prisma.stockUnit.count({ where: { archived: false, status: "IN_STOCK" } }),
    prisma.stockUnit.count({ where: { archived: false, status: "LISTED" } }),
    prisma.stockUnit.count({ where: { archived: false, status: "SOLD" } }),
    prisma.sale.findMany({
      where: { archived: false, saleDate: { gte: monthStart } },
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
  ]);

  // Profit this month
  const profitThisMonth = salesThisMonth.reduce((sum, s) => {
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

  // Simple “stock health” indicators
  const totalActive = inStockCount + listedCount + soldCount; // sold still active if not archived
  const sellThrough = totalActive === 0 ? 0 : (soldCount / totalActive) * 100;

  // Placeholder name until auth is added
  const userName = "User";

  return (
    <div className="container">
      {/* Header */}
      <div className="toolbar">
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>
            Welcome, {userName}
          </h1>
          <div className="muted" style={{ marginTop: 6 }}>
            Quick overview of your reselling activity.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="btn" href="/inventory/new">
            + Add inventory
          </Link>
          <Link className="btn" href="/sales/new">
            + Create sale
          </Link>
          <Link className="btn" href="/reports">
            View reports
          </Link>
        </div>
      </div>

      {/* KPI Tiles (Business Central vibe) */}
      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          marginBottom: 16,
        }}
      >
        <div className="tableWrap" style={{ padding: 16 }}>
          <div className="muted">Inventory items (active)</div>
          <div style={{ fontSize: 26, fontWeight: 900 }}>{totalStock}</div>
          <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
            Not archived
          </div>
        </div>

        <div className="tableWrap" style={{ padding: 16 }}>
          <div className="muted">Items added this week</div>
          <div style={{ fontSize: 26, fontWeight: 900 }}>{addedThisWeek}</div>
          <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
            Since {weekStart.toISOString().slice(0, 10)}
          </div>
        </div>

        <div className="tableWrap" style={{ padding: 16 }}>
          <div className="muted">Profit this month</div>
          <div style={{ fontSize: 26, fontWeight: 900 }}>{money(profitThisMonth)}</div>
          <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
            Excludes archived sales
          </div>
        </div>

        <div className="tableWrap" style={{ padding: 16 }}>
          <div className="muted">Sell-through (active)</div>
          <div style={{ fontSize: 26, fontWeight: 900 }}>{sellThrough.toFixed(1)}%</div>
          <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
            Sold / (In Stock + Listed + Sold)
          </div>
        </div>
      </div>

      {/* Status Tiles Row (like BC "Ongoing Sales") */}
      <div className="tableWrap" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 10 }}>
          Inventory status
        </div>

        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <Link
            href="/inventory?in_stock=1"
            className="tableWrap"
            style={{ padding: 16, textDecoration: "none" }}
          >
            <div className="muted">In stock</div>
            <div style={{ fontSize: 30, fontWeight: 900 }}>{inStockCount}</div>
            <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
              Ready to list / sell
            </div>
          </Link>

          <Link
            href="/inventory?status=LISTED"
            className="tableWrap"
            style={{ padding: 16, textDecoration: "none" }}
          >
            <div className="muted">Listed</div>
            <div style={{ fontSize: 30, fontWeight: 900 }}>{listedCount}</div>
            <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
              Currently for sale
            </div>
          </Link>

          <Link
            href="/inventory?status=SOLD"
            className="tableWrap"
            style={{ padding: 16, textDecoration: "none" }}
          >
            <div className="muted">Sold (not archived)</div>
            <div style={{ fontSize: 30, fontWeight: 900 }}>{soldCount}</div>
            <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
              Consider archiving periodically
            </div>
          </Link>

          <Link
            href="/settings"
            className="tableWrap"
            style={{ padding: 16, textDecoration: "none" }}
          >
            <div className="muted">Quick access</div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>Settings</div>
            <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
              Locations, archives, etc.
            </div>
          </Link>
        </div>
      </div>

      {/* Quick Links / Actions */}
      <div className="tableWrap" style={{ padding: 16 }}>
        <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 10 }}>
          Quick actions
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="btn" href="/inventory">
            View inventory
          </Link>
          <Link className="btn" href="/sales">
            View sales
          </Link>
          <Link className="btn" href="/inventory/archive">
            Archived items
          </Link>
          <Link className="btn" href="/sales/archive">
            Archived sales
          </Link>
          <Link className="btn" href="/locations">
            Manage locations
          </Link>
        </div>

        <div className="muted" style={{ marginTop: 12 }}>
          Tip: This dashboard is a great place to surface “dead stock”, “items not listed
          after X days”, and “platform profit split”.
        </div>
      </div>
    </div>
  );
}

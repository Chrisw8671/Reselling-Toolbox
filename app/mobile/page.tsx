import Link from "next/link";
import { prisma } from "@/lib/prisma";

const quickLinks = [
  { href: "/mobile/inventory", label: "Inventory", emoji: "📦" },
  { href: "/mobile/sales", label: "Sales", emoji: "🧾" },
  { href: "/mobile/report", label: "Report", emoji: "📈" },
  { href: "/mobile/wishlist", label: "Wishlist", emoji: "⭐" },
  { href: "/mobile/settings", label: "Settings", emoji: "⚙️" },
  { href: "/mobile/account", label: "Account", emoji: "👤" },
];

export default async function MobileHomePage() {
  const [stockCount, openSalesCount, watchCount] = await Promise.all([
    prisma.stockUnit.count({ where: { archived: false, status: { in: ["IN_STOCK", "LISTED"] } } }),
    prisma.sale.count({ where: { archived: false, fulfillmentStatus: { not: "DELIVERED" } } }),
    prisma.productWatch.count({ where: { active: true } }),
  ]);

  return (
    <div className="container" style={{ maxWidth: 560, paddingBottom: 24 }}>
      <div className="toolbar" style={{ alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>Mobile Hub</h1>
          <div className="muted" style={{ marginTop: 6 }}>
            Fast, thumb-friendly shortcuts for daily reselling tasks.
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
        <div className="tableWrap" style={{ padding: 12 }}>
          <div className="muted" style={{ fontSize: 12 }}>Active stock</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{stockCount}</div>
        </div>
        <div className="tableWrap" style={{ padding: 12 }}>
          <div className="muted" style={{ fontSize: 12 }}>Open sales</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{openSalesCount}</div>
        </div>
        <div className="tableWrap" style={{ padding: 12 }}>
          <div className="muted" style={{ fontSize: 12 }}>Wishlist</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{watchCount}</div>
        </div>
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="tableWrap"
            style={{
              padding: 14,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            <span>
              <span style={{ marginRight: 8 }}>{link.emoji}</span>
              {link.label}
            </span>
            <span className="muted">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

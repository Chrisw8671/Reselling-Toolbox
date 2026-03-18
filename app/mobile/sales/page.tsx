import Link from "next/link";
import { prisma } from "@/lib/prisma";

type Props = {
  searchParams?: Promise<{ status?: string }>;
};

const FULFILLMENT_COLORS: Record<string, string> = {
  PENDING: "#f59e0b",
  LABEL_PRINTED: "#3b82f6",
  PACKED: "#8b5cf6",
  SHIPPED: "#2563eb",
  DELIVERED: "#16a34a",
  CANCELLED: "#dc2626",
};

const FULFILLMENT_LABELS: Record<string, string> = {
  PENDING: "Pending",
  LABEL_PRINTED: "Label Printed",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

function fulfillmentColor(status: string) {
  return FULFILLMENT_COLORS[status] ?? "var(--muted)";
}

function fulfillmentLabel(status: string) {
  return FULFILLMENT_LABELS[status] ?? status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function MobileSalesPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const statusFilter = (sp.status ?? "").trim();

  const where: Record<string, unknown> = { archived: false };
  if (statusFilter) where.fulfillmentStatus = statusFilter;

  const [sales, statusCounts] = await Promise.all([
    prisma.sale.findMany({
      where,
      orderBy: { saleDate: "desc" },
      take: 100,
      select: {
        id: true,
        platform: true,
        saleDate: true,
        orderRef: true,
        fulfillmentStatus: true,
        lines: { select: { salePrice: true } },
      },
    }),
    prisma.sale.groupBy({
      by: ["fulfillmentStatus"],
      where: { archived: false },
      _count: { fulfillmentStatus: true },
      orderBy: { fulfillmentStatus: "asc" },
    }),
  ]);

  const countMap: Record<string, number> = {};
  for (const c of statusCounts) countMap[c.fulfillmentStatus] = c._count.fulfillmentStatus;
  const totalCount = Object.values(countMap).reduce((s, n) => s + n, 0);

  return (
    <div className="mobilePg">
      <div style={{ paddingTop: 10, paddingBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, letterSpacing: "-0.5px" }}>
            Sales
          </h1>
          <Link
            href="/mobile/sales/new"
            className="btn"
            style={{ height: 36, fontSize: 13, padding: "0 14px", width: "auto", minHeight: 0 }}
          >
            + New
          </Link>
        </div>
        <div style={{ marginTop: 4, fontSize: 13, color: "var(--muted)" }}>
          {sales.length} sale{sales.length !== 1 ? "s" : ""}
          {statusFilter ? ` · ${fulfillmentLabel(statusFilter)}` : ""}
        </div>
      </div>

      {/* Status filter chips */}
      {statusCounts.length > 1 && (
        <div className="chipRow">
          <Link
            href="/mobile/sales"
            className={`chip${!statusFilter ? " chipActive" : ""}`}
          >
            All ({totalCount})
          </Link>
          {statusCounts.map((sc) => (
            <Link
              key={sc.fulfillmentStatus}
              href={`/mobile/sales?status=${sc.fulfillmentStatus}`}
              className={`chip${statusFilter === sc.fulfillmentStatus ? " chipActive" : ""}`}
            >
              {fulfillmentLabel(sc.fulfillmentStatus)} ({sc._count.fulfillmentStatus})
            </Link>
          ))}
        </div>
      )}

      {/* Sale cards */}
      <div style={{ display: "grid", gap: 8, paddingBottom: 8 }}>
        {sales.map((sale) => {
          const total = sale.lines.reduce((sum, l) => sum + Number(l.salePrice), 0);
          const color = fulfillmentColor(sale.fulfillmentStatus);
          const label = fulfillmentLabel(sale.fulfillmentStatus);

          return (
            <Link key={sale.id} href={`/mobile/sales/${sale.id}`} className="mobileSaleCard">
              {/* Platform + status pill */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div style={{ fontWeight: 800, fontSize: 15 }}>
                  {sale.platform || "Unknown"}
                </div>
                <span
                  className="statusPill"
                  style={{
                    background: `color-mix(in srgb, ${color} 14%, var(--panel-2))`,
                    color,
                    border: `1px solid color-mix(in srgb, ${color} 28%, var(--border))`,
                  }}
                >
                  {label}
                </span>
              </div>

              {/* Date + ref + total */}
              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>
                    {new Date(sale.saleDate).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    {sale.orderRef ? ` · ${sale.orderRef}` : ""}
                  </div>
                  <div style={{ marginTop: 2, fontSize: 12, color: "var(--muted)" }}>
                    {sale.lines.length} item{sale.lines.length !== 1 ? "s" : ""}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    letterSpacing: "-0.5px",
                  }}
                >
                  £{total.toFixed(2)}
                </div>
              </div>
            </Link>
          );
        })}

        {sales.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 16px", color: "var(--muted)" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🧾</div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>No sales found</div>
            <div style={{ marginTop: 6, fontSize: 13 }}>
              Record your first sale to get started
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

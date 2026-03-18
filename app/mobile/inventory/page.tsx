import Link from "next/link";
import { prisma } from "@/lib/prisma";

type Props = {
  searchParams?: Promise<{ q?: string; status?: string }>;
};

const STATUS_COLORS: Record<string, string> = {
  IN_STOCK: "#16a34a",
  LISTED: "#2563eb",
  SOLD: "#9333ea",
  RETURNED: "#f59e0b",
  WRITTEN_OFF: "#dc2626",
};

const STATUS_LABELS: Record<string, string> = {
  IN_STOCK: "In Stock",
  LISTED: "Listed",
  SOLD: "Sold",
  RETURNED: "Returned",
  WRITTEN_OFF: "Written Off",
};

const ALL_STATUSES = ["IN_STOCK", "LISTED", "SOLD", "RETURNED", "WRITTEN_OFF"];

export default async function MobileInventoryPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim();
  const statusFilter = (sp.status ?? "").trim();

  const where: Record<string, unknown> = { archived: false };

  if (statusFilter && ALL_STATUSES.includes(statusFilter)) {
    where.status = statusFilter;
  }

  if (q) {
    where.OR = [
      { sku: { contains: q, mode: "insensitive" } },
      { titleOverride: { contains: q, mode: "insensitive" } },
      { brand: { contains: q, mode: "insensitive" } },
    ];
  }

  const [items, counts] = await Promise.all([
    prisma.stockUnit.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        sku: true,
        titleOverride: true,
        brand: true,
        status: true,
        purchaseCost: true,
        recommendedPrice: true,
        location: { select: { code: true } },
      },
    }),
    prisma.stockUnit.groupBy({
      by: ["status"],
      where: { archived: false },
      _count: { status: true },
    }),
  ]);

  const countMap: Record<string, number> = {};
  for (const c of counts) countMap[c.status] = c._count.status;
  const totalCount = Object.values(countMap).reduce((s, n) => s + n, 0);

  function chipHref(s: string) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (s) params.set("status", s);
    const qs = params.toString();
    return `/mobile/inventory${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="mobilePg">
      <div style={{ paddingTop: 10, paddingBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, letterSpacing: "-0.5px" }}>
            Inventory
          </h1>
          <Link
            href="/mobile/inventory/new"
            className="btn"
            style={{ height: 36, fontSize: 13, padding: "0 14px", width: "auto", minHeight: 0 }}
          >
            + Add
          </Link>
        </div>
        <div style={{ marginTop: 4, fontSize: 13, color: "var(--muted)" }}>
          {items.length} item{items.length !== 1 ? "s" : ""}
          {q ? ` matching "${q}"` : ""}
          {statusFilter ? ` · ${STATUS_LABELS[statusFilter] ?? statusFilter}` : ""}
        </div>
      </div>

      {/* Search */}
      <form action="/mobile/inventory" method="get" className="mobileSearchBar">
        {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
        <input
          name="q"
          defaultValue={q}
          placeholder="Search title, SKU, brand…"
          autoComplete="off"
        />
        <button type="submit">Search</button>
        {q && (
          <a href={`/mobile/inventory${statusFilter ? `?status=${statusFilter}` : ""}`}>✕</a>
        )}
      </form>

      {/* Status filter chips */}
      <div className="chipRow">
        <Link href={chipHref("")} className={`chip${!statusFilter ? " chipActive" : ""}`}>
          All ({totalCount})
        </Link>
        {ALL_STATUSES.filter((s) => countMap[s] > 0).map((s) => (
          <Link
            key={s}
            href={chipHref(s)}
            className={`chip${statusFilter === s ? " chipActive" : ""}`}
          >
            {STATUS_LABELS[s]} ({countMap[s]})
          </Link>
        ))}
      </div>

      {/* Item cards */}
      <div style={{ display: "grid", gap: 8, paddingBottom: 8 }}>
        {items.map((item) => {
          const color = STATUS_COLORS[item.status] ?? "var(--border)";
          const label = STATUS_LABELS[item.status] ?? item.status;
          const listPrice = item.recommendedPrice ? Number(item.recommendedPrice) : null;
          return (
            <Link key={item.sku} href={`/mobile/inventory/${item.sku}`} className="mobileItemCard">
              {/* Colored left accent stripe */}
              <div className="mobileItemAccent" style={{ background: color }} />

              <div className="mobileItemBody">
                {/* Row 1: title + status pill */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                      lineHeight: 1.3,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                    }}
                  >
                    {item.titleOverride || item.sku}
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

                {/* Row 2: SKU · location · brand */}
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 12,
                    color: "var(--muted)",
                    display: "flex",
                    gap: 6,
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                  }}
                >
                  <span>{item.sku}</span>
                  {item.location?.code && <span>· {item.location.code}</span>}
                  {item.brand && <span>· {item.brand}</span>}
                </div>

                {/* Row 3: cost + list price */}
                <div style={{ marginTop: 5, fontSize: 13, display: "flex", gap: 14 }}>
                  <span>
                    Cost <strong>£{Number(item.purchaseCost).toFixed(2)}</strong>
                  </span>
                  {listPrice !== null && (
                    <span style={{ color: "var(--muted)" }}>
                      List <strong style={{ color: "var(--text)" }}>£{listPrice.toFixed(2)}</strong>
                    </span>
                  )}
                </div>
              </div>

              <div className="mobileItemChevron">›</div>
            </Link>
          );
        })}

        {items.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "40px 16px",
              color: "var(--muted)",
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 10 }}>📦</div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>No items found</div>
            <div style={{ marginTop: 6, fontSize: 13 }}>
              {q ? `Try a different search term` : `Add your first item to get started`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

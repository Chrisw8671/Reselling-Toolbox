import { chipClass, ui } from "@/lib/ui";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Prisma, StockStatus } from "@prisma/client";

type Props = {
  searchParams?: Promise<{ q?: string; status?: string; showSold?: string }>;
};

const STATUS_COLORS: Record<string, string> = {
  IN_STOCK: "#16a34a",
  LISTED: "#2563eb",
  SOLD: "#9333ea",
  RETURNED: "#f59e0b",
  WRITTEN_OFF: "#dc2626",
};

const STATUS_LABELS: Record<StockStatus, string> = {
  IN_STOCK: "In Stock",
  LISTED: "Listed",
  SOLD: "Sold",
  RETURNED: "Returned",
  WRITTEN_OFF: "Written Off",
};

const ALL_STATUSES: StockStatus[] = ["IN_STOCK", "LISTED", "SOLD", "RETURNED", "WRITTEN_OFF"];

export default async function MobileInventoryPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim();
  const statusParam = (sp.status ?? "").trim();
  const statusFilter = ALL_STATUSES.includes(statusParam as StockStatus)
    ? (statusParam as StockStatus)
    : undefined;
  const showSold = sp.showSold === "1";

  const where: Prisma.StockUnitWhereInput = { archived: false };

  if (statusFilter) {
    where.status = statusFilter;
  } else if (!showSold) {
    where.NOT = [{ status: StockStatus.SOLD }];
  }

  if (q) {
    where.OR = [
      { sku: { contains: q, mode: "insensitive" } },
      { titleOverride: { contains: q, mode: "insensitive" } },
      { brand: { contains: q, mode: "insensitive" } },
    ];
  }

  const countWhere: Prisma.StockUnitWhereInput = showSold
    ? { archived: false }
    : { archived: false, NOT: [{ status: StockStatus.SOLD }] };

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
      where: countWhere,
      _count: { _all: true },
    }),
  ]);

  const countMap: Record<string, number> = {};
  for (const c of counts) countMap[c.status] = c._count._all;
  const totalCount = Object.values(countMap).reduce((s, n) => s + n, 0);

  function inventoryHref(next: { q?: string; status?: StockStatus; showSold?: boolean }) {
    const params = new URLSearchParams();
    if (next.q) params.set("q", next.q);
    if (next.status) params.set("status", next.status);
    if (next.showSold) params.set("showSold", "1");
    const qs = params.toString();
    return `/mobile/inventory${qs ? `?${qs}` : ""}`;
  }

  function chipHref(status: StockStatus | "") {
    return inventoryHref({
      q,
      status: status || undefined,
      showSold: showSold || status === "SOLD",
    });
  }

  return (
    <div className={ui.mobilePage}>
      <div style={{ paddingTop: 10, paddingBottom: 14 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h1
            style={{ fontSize: 28, fontWeight: 900, margin: 0, letterSpacing: "-0.5px" }}
          >
            Inventory
          </h1>
          <Link href="/mobile/inventory/new" className={ui.buttonCompact}>
            + Add
          </Link>
        </div>
        <div style={{ marginTop: 4, fontSize: 13, color: "var(--muted)" }}>
          {items.length} item{items.length !== 1 ? "s" : ""}
          {q ? ` matching "${q}"` : ""}
          {statusFilter ? ` · ${STATUS_LABELS[statusFilter] ?? statusFilter}` : ""}
          {!showSold && !statusFilter ? " · excluding sold" : ""}
        </div>
      </div>

      <form action="/mobile/inventory" method="get" className={ui.mobileSearchBar}>
        {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
        {showSold && <input type="hidden" name="showSold" value="1" />}
        <input
          className={ui.mobileSearchInput}
          name="q"
          defaultValue={q}
          placeholder="Search title, SKU, brand..."
          autoComplete="off"
        />
        <button className={ui.mobileSearchButton} type="submit">
          Search
        </button>
        {q && (
          <a
            className={ui.mobileSearchButton}
            href={inventoryHref({ status: statusFilter, showSold })}
          >
            ×
          </a>
        )}
      </form>

      <form action="/mobile/inventory" method="get" style={{ marginBottom: 10 }}>
        {q && <input type="hidden" name="q" value={q} />}
        {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: "var(--muted)",
            }}
          >
            <input type="checkbox" name="showSold" value="1" defaultChecked={showSold} />
            Show sold stock
          </label>
          <button type="submit" className={ui.mobileSearchButton}>
            Apply
          </button>
        </div>
      </form>

      <div className={ui.chipRow}>
        <Link href={chipHref("")} className={chipClass(!statusFilter)}>
          All ({totalCount})
        </Link>
        {ALL_STATUSES.filter(
          (status) =>
            countMap[status] > 0 && (showSold || status !== "SOLD" || statusFilter === "SOLD"),
        ).map((status) => (
          <Link key={status} href={chipHref(status)} className={chipClass(statusFilter === status)}>
            {STATUS_LABELS[status]} ({countMap[status]})
          </Link>
        ))}
      </div>

      <div style={{ display: "grid", gap: 8, paddingBottom: 8 }}>
        {items.map((item) => {
          const color = STATUS_COLORS[item.status] ?? "var(--border)";
          const label = STATUS_LABELS[item.status] ?? item.status;
          const listPrice = item.recommendedPrice ? Number(item.recommendedPrice) : null;

          return (
            <Link
              key={item.sku}
              href={`/mobile/inventory/${item.sku}`}
              className={ui.mobileItemCard}
            >
              <div className={ui.mobileItemAccent} style={{ background: color }} />

              <div className={ui.mobileItemBody}>
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
                    className={ui.statusPill}
                    style={{
                      background: `color-mix(in srgb, ${color} 14%, var(--panel-2))`,
                      color,
                      border: `1px solid color-mix(in srgb, ${color} 28%, var(--border))`,
                    }}
                  >
                    {label}
                  </span>
                </div>

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

              <div className={ui.mobileItemChevron}>›</div>
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
              {q ? "Try a different search term" : "Add your first item to get started"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

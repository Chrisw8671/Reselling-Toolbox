import { ui } from "@/lib/ui";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

type Props = {
  searchParams?: Promise<{
    q?: string;
  }>;
};

export default async function MobileInventoryArchivePage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim();

  const where: any = { archived: true };

  if (q) {
    where.OR = [
      { sku: { contains: q, mode: "insensitive" } },
      { titleOverride: { contains: q, mode: "insensitive" } },
      { location: { is: { code: { contains: q, mode: "insensitive" } } } },
    ];
  }

  const items = await prisma.stockUnit.findMany({
    where,
    orderBy: { archivedAt: "desc" },
    take: 500,
    select: {
      id: true,
      sku: true,
      titleOverride: true,
      createdAt: true,
      archivedAt: true,
      location: { select: { code: true } },
      purchaseCost: true,
      recommendedPrice: true,
    },
  });

  const itemsPlain = items.map((it) => ({
    id: it.id,
    sku: it.sku,
    titleOverride: it.titleOverride,
    createdAt: it.createdAt.toISOString(),
    archivedAt: it.archivedAt ? it.archivedAt.toISOString() : null,
    location: it.location ? { code: it.location.code } : null,
    purchaseCost: Number(it.purchaseCost),
    recommendedPrice: it.recommendedPrice ? Number(it.recommendedPrice) : null,
  }));

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
            Archived Items
          </h1>
          <Link href="/mobile/inventory" className={ui.buttonCompact}>
            ← Back
          </Link>
        </div>
        <div style={{ marginTop: 4, fontSize: 13, color: "var(--muted)" }}>
          {itemsPlain.length} archived item{itemsPlain.length !== 1 ? "s" : ""}
          {q ? ` matching "${q}"` : ""}
        </div>
      </div>

      <form action="/mobile/inventory/archive" method="get" className={ui.mobileSearchBar}>
        <input
          className={ui.mobileSearchInput}
          name="q"
          defaultValue={q}
          placeholder="Search SKU, title, location..."
          autoComplete="off"
        />
        <button className={ui.mobileSearchButton} type="submit">
          Search
        </button>
        {q && (
          <a
            className={ui.mobileSearchButton}
            href="/mobile/inventory/archive"
          >
            ×
          </a>
        )}
      </form>

      <div style={{ display: "grid", gap: 8, paddingBottom: 8 }}>
        {itemsPlain.map((item) => {
          const listPrice = item.recommendedPrice;
          const archivedDate = item.archivedAt ? new Date(item.archivedAt) : null;
          const formattedDate = archivedDate
            ? archivedDate.toLocaleDateString("en-GB", {
                month: "short",
                day: "numeric",
              })
            : "";

          return (
            <div
              key={item.id}
              style={{
                borderRadius: 14,
                border: "1px solid var(--border)",
                background: "var(--panel)",
                padding: 14,
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 8,
                  marginBottom: 8,
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
                {formattedDate && (
                  <span
                    style={{
                      fontSize: 12,
                      padding: "4px 8px",
                      background: "var(--panel-2)",
                      borderRadius: 6,
                      color: "var(--muted)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formattedDate}
                  </span>
                )}
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: "var(--muted)",
                  display: "flex",
                  gap: 6,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                  marginBottom: 8,
                }}
              >
                <span>{item.sku}</span>
                {item.location?.code && <span>· {item.location.code}</span>}
              </div>

              <div style={{ marginBottom: 10, fontSize: 13, display: "flex", gap: 14 }}>
                <span>
                  Cost <strong>£{item.purchaseCost.toFixed(2)}</strong>
                </span>
                {listPrice !== null && (
                  <span style={{ color: "var(--muted)" }}>
                    List <strong style={{ color: "var(--text)" }}>£{listPrice.toFixed(2)}</strong>
                  </span>
                )}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <Link
                  href={`/inventory/${item.sku}/restore`}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--accent)",
                    background: "var(--accent-soft)",
                    color: "var(--accent)",
                    textAlign: "center",
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Restore
                </Link>
                <button
                  formAction={`/inventory/${item.sku}/delete`}
                  formMethod="POST"
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--danger)",
                    background: "var(--panel-2)",
                    color: "var(--danger)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}

        {itemsPlain.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "40px 16px",
              color: "var(--muted)",
              fontSize: 14,
            }}
          >
            No archived items found
            {q ? ` matching "${q}"` : ""}
          </div>
        )}
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: "var(--muted)" }}>
        Archived items can be restored or permanently deleted.
      </div>
    </div>
  );
}

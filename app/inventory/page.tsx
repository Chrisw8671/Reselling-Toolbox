import Link from "next/link";
import { prisma } from "@/lib/prisma";
import InventoryTable from "@/components/InventoryTable";
import { formatStatus } from "@/lib/status";

type Props = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    in_stock?: string;
    age_min?: string;
  }>;
};

export default async function InventoryPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim();
  const statusParam = (sp.status ?? "").trim();
  const inStock = (sp.in_stock ?? "") === "1";
  const ageMin = Number(sp.age_min ?? "");
  const hasAgeFilter = Number.isFinite(ageMin) && ageMin > 0;

  const status = inStock ? "IN_STOCK" : statusParam;

  const where: any = { archived: false };

  if (status) where.status = status;
  if (hasAgeFilter) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - ageMin);
    where.createdAt = { lte: cutoff };
  }

  if (q) {
    where.OR = [
      { sku: { contains: q, mode: "insensitive" } },
      { titleOverride: { contains: q, mode: "insensitive" } },
      { condition: { contains: q, mode: "insensitive" } },

      // ✅ new searchable fields
      { purchasedFrom: { contains: q, mode: "insensitive" } },
      { purchaseRef: { contains: q, mode: "insensitive" } },
      { brand: { contains: q, mode: "insensitive" } },
      { size: { contains: q, mode: "insensitive" } },

      { location: { is: { code: { contains: q, mode: "insensitive" } } } },
    ];
  }

  const items = await prisma.stockUnit.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 300,
    select: {
      sku: true,
      titleOverride: true,
      status: true,
      purchaseCost: true,
      extraCost: true,
      condition: true,
      purchasedAt: true,
      purchasedFrom: true,
      purchaseRef: true,
      purchaseUrl: true,
      brand: true,
      size: true,
      createdAt: true,
      updatedAt: true,
      location: { select: { code: true } },
    },
  });

  // Convert to plain objects for Client Component
  const itemsPlain = items.map((it) => ({
    sku: it.sku,
    titleOverride: it.titleOverride,
    status: it.status,
    purchaseCost: Number(it.purchaseCost),
    extraCost: Number(it.extraCost ?? 0),
    condition: it.condition ?? "",
    purchasedAt: it.purchasedAt ? it.purchasedAt.toISOString() : null,
    purchasedFrom: it.purchasedFrom ?? "",
    purchaseRef: it.purchaseRef ?? "",
    purchaseUrl: it.purchaseUrl ?? "",
    brand: it.brand ?? "",
    size: it.size ?? "",
    createdAt: it.createdAt.toISOString(),
    updatedAt: it.updatedAt.toISOString(),
    location: it.location ? { code: it.location.code } : null,
  }));

  const statuses = ["", "IN_STOCK", "LISTED", "SOLD", "RETURNED", "WRITTEN_OFF"];

  const qsBase = new URLSearchParams();
  if (q) qsBase.set("q", q);
  if (statusParam && !inStock) qsBase.set("status", statusParam);
  if (hasAgeFilter) qsBase.set("age_min", String(ageMin));

  const inStockOnHref = `/inventory?${new URLSearchParams({
    ...Object.fromEntries(qsBase),
    in_stock: "1",
  }).toString()}`;

  const inStockOffHref = qsBase.toString()
    ? `/inventory?${qsBase.toString()}`
    : "/inventory";

  return (
    <div className="container">
      <div className="toolbar">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Inventory</h1>
          <div className="muted" style={{ marginTop: 4 }}>
            {itemsPlain.length} item(s)
            {(q || status) && (
              <>
                {" "}
                • Filtered
                {q ? ` by “${q}”` : ""}
                {status ? ` • Status: ${formatStatus(status)}` : ""}
                {hasAgeFilter ? ` • Age: ${ageMin}+ days` : ""}
              </>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <Link className="btn" href={inStock ? inStockOffHref : inStockOnHref}>
            {inStock ? "✓ In Stock only" : "In Stock only"}
          </Link>

          <Link className="btn" href="/inventory/new">
            + Add
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="tableWrap" style={{ padding: 16, marginBottom: 16 }}>
        <form
          action="/inventory"
          method="get"
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "end",
          }}
        >
          <label style={{ flex: "1 1 320px" }}>
            Search (SKU, title, location, purchase info)
            <input
              name="q"
              defaultValue={q}
              placeholder='e.g. 2602-00041 or "Nike" or "BOX-01" or "Vinted"'
              style={{ width: "100%" }}
            />
          </label>

          <label style={{ width: 220 }}>
            Age (days min)
            <input
              name="age_min"
              type="number"
              min={1}
              step={1}
              defaultValue={hasAgeFilter ? String(ageMin) : ""}
              placeholder="e.g. 90"
              style={{ width: "100%" }}
            />
          </label>

          <label style={{ width: 220 }}>
            Status
            <select
              name="status"
              defaultValue={statusParam}
              style={{ width: "100%" }}
              disabled={inStock}
              title={
                inStock ? "Turn off In Stock only to change status filter" : undefined
              }
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s ? formatStatus(s) : "All"}
                </option>
              ))}
            </select>
          </label>

          {inStock && <input type="hidden" name="in_stock" value="1" />}

          <button className="btn" type="submit">
            Apply
          </button>

          {(q || statusParam || inStock || hasAgeFilter) && (
            <Link className="btn" href="/inventory">
              Clear
            </Link>
          )}
        </form>
      </div>

      {/* Bulk-select table */}
      <InventoryTable
        items={itemsPlain}
        quickAction={hasAgeFilter && ageMin >= 90 ? "MARKDOWN_15" : null}
      />
    </div>
  );
}

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
    age_max?: string;
  }>;
};

export default async function InventoryPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim();
  const statusParam = (sp.status ?? "").trim();
  const inStock = (sp.in_stock ?? "") === "1";
  const ageMinDays = Number.parseInt((sp.age_min ?? "").trim(), 10);
  const ageMaxDays = Number.parseInt((sp.age_max ?? "").trim(), 10);

  const status = inStock ? "IN_STOCK" : statusParam;

  const where: any = { archived: false };

  if (status) where.status = status;

  const now = Date.now();
  const hasAgeMin = Number.isFinite(ageMinDays) && ageMinDays >= 0;
  const hasAgeMax = Number.isFinite(ageMaxDays) && ageMaxDays >= 0;

  if (hasAgeMin || hasAgeMax) {
    where.createdAt = {};

    if (hasAgeMin) {
      where.createdAt.lte = new Date(now - ageMinDays * 24 * 60 * 60 * 1000);
    }

    if (hasAgeMax) {
      where.createdAt.gte = new Date(now - ageMaxDays * 24 * 60 * 60 * 1000);
    }
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
    location: it.location ? { code: it.location.code } : null,
  }));

  const statuses = ["", "IN_STOCK", "LISTED", "SOLD", "RETURNED", "WRITTEN_OFF"];

  const qsBase = new URLSearchParams();
  if (q) qsBase.set("q", q);
  if (statusParam && !inStock) qsBase.set("status", statusParam);
  if (hasAgeMin) qsBase.set("age_min", String(ageMinDays));
  if (hasAgeMax) qsBase.set("age_max", String(ageMaxDays));

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
              </>
            )}
            {(hasAgeMin || hasAgeMax) && (
              <>
                {" "}
                • Age
                {hasAgeMin ? ` ≥ ${ageMinDays}d` : ""}
                {hasAgeMin && hasAgeMax ? " and" : ""}
                {hasAgeMax ? ` ≤ ${ageMaxDays}d` : ""}
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

          <label style={{ width: 160 }}>
            Min age (days)
            <input
              name="age_min"
              type="number"
              min={0}
              step={1}
              defaultValue={Number.isFinite(ageMinDays) ? ageMinDays : ""}
              placeholder="e.g. 30"
              style={{ width: "100%" }}
            />
          </label>

          <label style={{ width: 160 }}>
            Max age (days)
            <input
              name="age_max"
              type="number"
              min={0}
              step={1}
              defaultValue={Number.isFinite(ageMaxDays) ? ageMaxDays : ""}
              placeholder="e.g. 90"
              style={{ width: "100%" }}
            />
          </label>

          {inStock && <input type="hidden" name="in_stock" value="1" />}

          <button className="btn" type="submit">
            Apply
          </button>

          {(q || statusParam || inStock || hasAgeMin || hasAgeMax) && (
            <Link className="btn" href="/inventory">
              Clear
            </Link>
          )}
        </form>
      </div>

      {/* Bulk-select table */}
      <InventoryTable items={itemsPlain} />
    </div>
  );
}

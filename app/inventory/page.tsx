import Link from "next/link";
import { prisma } from "@/lib/prisma";
import InventoryTable from "@/components/InventoryTable";
import { formatStatus } from "@/lib/status";

type Props = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    in_stock?: string;
    platform?: string;
    listed_on_any?: string;
    listed_on_count_min?: string;
  }>;
};

export default async function InventoryPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim();
  const statusParam = (sp.status ?? "").trim();
  const inStock = (sp.in_stock ?? "") === "1";
  const platform = (sp.platform ?? "").trim();
  const listedOnAny = (sp.listed_on_any ?? "") === "1";
  const listedOnCountMin = Number(sp.listed_on_count_min ?? "");

  const status = inStock ? "IN_STOCK" : statusParam;

  const where: any = { archived: false };

  if (status) where.status = status;

  if (
    platform ||
    listedOnAny ||
    (Number.isFinite(listedOnCountMin) && listedOnCountMin > 0)
  ) {
    where.listings = {
      some: platform
        ? {
            platform: { equals: platform, mode: "insensitive" },
          }
        : {},
    };
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
      listings: {
        select: { platform: true },
      },
    },
  });

  const filteredByCount =
    Number.isFinite(listedOnCountMin) && listedOnCountMin > 0
      ? items.filter((it) => it.listings.length >= listedOnCountMin)
      : items;

  // Convert to plain objects for Client Component
  const itemsPlain = filteredByCount.map((it) => ({
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

  const platformOptionsRaw = await prisma.listing.findMany({
    distinct: ["platform"],
    select: { platform: true },
    orderBy: { platform: "asc" },
  });
  const platformOptions = platformOptionsRaw.map((x) => x.platform);

  const statuses = ["", "IN_STOCK", "LISTED", "SOLD", "RETURNED", "WRITTEN_OFF"];

  const qsBase = new URLSearchParams();
  if (q) qsBase.set("q", q);
  if (statusParam && !inStock) qsBase.set("status", statusParam);
  if (platform) qsBase.set("platform", platform);
  if (listedOnAny) qsBase.set("listed_on_any", "1");
  if (Number.isFinite(listedOnCountMin) && listedOnCountMin > 0) {
    qsBase.set("listed_on_count_min", String(listedOnCountMin));
  }

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

          <label style={{ width: 220 }}>
            Platform
            <select name="platform" defaultValue={platform} style={{ width: "100%" }}>
              <option value="">Any</option>
              {platformOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>

          <label style={{ width: 180 }}>
            Listed on any
            <select
              name="listed_on_any"
              defaultValue={listedOnAny ? "1" : "0"}
              style={{ width: "100%" }}
            >
              <option value="0">No filter</option>
              <option value="1">Yes</option>
            </select>
          </label>

          <label style={{ width: 220 }}>
            Min listing count
            <input
              type="number"
              min={0}
              name="listed_on_count_min"
              defaultValue={
                Number.isFinite(listedOnCountMin) && listedOnCountMin > 0
                  ? listedOnCountMin
                  : ""
              }
              placeholder="e.g. 2"
              style={{ width: "100%" }}
            />
          </label>

          {inStock && <input type="hidden" name="in_stock" value="1" />}

          <button className="btn" type="submit">
            Apply
          </button>

          {(q ||
            statusParam ||
            inStock ||
            platform ||
            listedOnAny ||
            listedOnCountMin) && (
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

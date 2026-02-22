import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ArchiveTable from "@/components/ArchiveTable";

type Props = {
  searchParams?: Promise<{
    q?: string;
  }>;
};

export default async function InventoryArchivePage({ searchParams }: Props) {
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
    },
  });

  const itemsPlain = items.map((it) => ({
    id: it.id,
    sku: it.sku,
    titleOverride: it.titleOverride,
    createdAt: it.createdAt.toISOString(),
    archivedAt: it.archivedAt ? it.archivedAt.toISOString() : null,
    location: it.location ? { code: it.location.code } : null,
  }));

  return (
    <div className="container">
      <div className="toolbar">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Archived Items</h1>
          <div className="muted" style={{ marginTop: 4 }}>
            {itemsPlain.length} archived item(s)
            {q ? ` • Filtered by “${q}”` : ""}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <Link className="btn" href="/inventory">
            ← Inventory
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="tableWrap" style={{ padding: 16, marginBottom: 16 }}>
        <form
          action="/inventory/archive"
          method="get"
          style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}
        >
          <label style={{ flex: "1 1 320px" }}>
            Search (SKU, title, location)
            <input
              name="q"
              defaultValue={q}
              placeholder='e.g. "2602-00041" or "Nike" or "BOX-01"'
              style={{ width: "100%" }}
            />
          </label>

          <button className="btn" type="submit">
            Apply
          </button>

          {q && (
            <Link className="btn" href="/inventory/archive">
              Clear
            </Link>
          )}
        </form>
      </div>

      <ArchiveTable items={itemsPlain} />
    </div>
  );
}

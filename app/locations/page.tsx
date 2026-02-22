import Link from "next/link";
import { prisma } from "@/lib/prisma";
import LocationsTable from "@/components/LocationsTable";

export default async function LocationsPage() {
  const locations = await prisma.location.findMany({
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      type: true,
      notes: true,
      createdAt: true,
      _count: { select: { stockUnits: true } },
    },
  });

  const rows = locations.map((l) => ({
    id: l.id,
    code: l.code,
    type: l.type,
    notes: l.notes ?? "",
    createdAt: l.createdAt.toISOString(),
    inUse: l._count.stockUnits,
  }));

  return (
    <div className="container">
      <div className="toolbar">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Locations</h1>
          <div className="muted" style={{ marginTop: 4 }}>
            {rows.length} location(s)
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <Link className="btn" href="/inventory">
            ← Inventory
          </Link>
        </div>
      </div>

      <LocationsTable rows={rows} />

      <div className="muted" style={{ marginTop: 12 }}>
        Tip: Locations are used in the “Bay/Box code” dropdown on new/edit item pages.
      </div>
    </div>
  );
}

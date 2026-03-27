import { prisma } from "@/lib/prisma";
import MobileLocationsClient from "./client";

type Location = {
  id: string;
  code: string;
  type: string;
  notes: string;
  createdAt: string;
  inUse: number;
};

export default async function MobileLocationsPage() {
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

  const rows: Location[] = locations.map((l) => ({
    id: l.id,
    code: l.code,
    type: l.type,
    notes: l.notes ?? "",
    createdAt: l.createdAt.toISOString(),
    inUse: l._count.stockUnits,
  }));

  return <MobileLocationsClient locations={rows} />;
}

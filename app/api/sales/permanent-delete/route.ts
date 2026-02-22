import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];

    if (ids.length === 0) {
      return NextResponse.json({ error: "No ids provided" }, { status: 400 });
    }

    // Only delete archived sales (archivedAt != null)
    // Also delete related lines first to avoid FK constraint issues.
    const result = await prisma.$transaction(async (tx) => {
      // Find which of the supplied ids are actually archived (and exist)
      const archivedSales = await tx.sale.findMany({
        where: { id: { in: ids }, archivedAt: { not: null } },
        select: { id: true },
      });

      const archivedIds = archivedSales.map((s) => s.id);

      if (archivedIds.length === 0) {
        return { deleted: 0 };
      }

      // If your relation model name differs, rename saleLine below.
      // Example assumes SaleLine table is prisma.saleLine with saleId FK.
      await tx.saleLine.deleteMany({
        where: { saleId: { in: archivedIds } },
      });

      const deletedSales = await tx.sale.deleteMany({
        where: { id: { in: archivedIds }, archivedAt: { not: null } },
      });

      return { deleted: deletedSales.count };
    });

    return NextResponse.json({ ok: true, deleted: result.deleted });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Delete failed" }, { status: 500 });
  }
}

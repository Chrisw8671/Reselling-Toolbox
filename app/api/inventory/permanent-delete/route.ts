import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { ids?: string[] };
    const ids: string[] = Array.isArray(body.ids) ? body.ids : [];

    if (ids.length === 0) {
      return NextResponse.json({ ok: false, error: "No ids provided" }, { status: 400 });
    }

    // PROVE what the DB thinks these records are
    const found = await prisma.stockUnit.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        sku: true,
        archived: true,
        archivedAt: true,
        saleLine: { select: { id: true } },
      },
    });

    // Which are eligible under your rules?
    const deletableIds = found
      .filter((x) => x.archived === true && x.saleLine === null)
      .map((x) => x.id);

    const del = await prisma.stockUnit.deleteMany({
      where: { id: { in: deletableIds } },
    });

    // What blocked deletion?
    const blocked = found
      .filter((x) => !(x.archived === true && x.saleLine === null))
      .map((x) => ({
        id: x.id,
        sku: x.sku,
        archived: x.archived,
        hasSaleLine: x.saleLine !== null,
      }));

    return NextResponse.json({
      ok: true,
      requested: ids.length,
      found: found.length,
      eligibleToDelete: deletableIds.length,
      deleted: del.count,
      blocked,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Delete failed" },
      { status: 500 }
    );
  }
}
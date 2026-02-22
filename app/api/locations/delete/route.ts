import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body?.id ?? "").trim();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    // Safety: prevent delete if used
    const inUse = await prisma.stockUnit.count({ where: { locationId: id } });
    if (inUse > 0) {
      return NextResponse.json(
        { error: "Location is in use and cannot be deleted." },
        { status: 400 },
      );
    }

    await prisma.location.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Delete failed" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];

    if (ids.length === 0) {
      return NextResponse.json({ error: "No ids provided" }, { status: 400 });
    }

    const result = await prisma.sale.updateMany({
      where: { id: { in: ids }, archived: true },
      data: { archived: false, archivedAt: null },
    });

    return NextResponse.json({ ok: true, updated: result.count });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Restore failed" }, { status: 500 });
  }
}

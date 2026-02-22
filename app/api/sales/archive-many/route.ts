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
      where: { id: { in: ids }, archived: false },
      data: { archived: true, archivedAt: new Date() },
    });

    return NextResponse.json({ ok: true, updated: result.count });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Archive failed" },
      { status: 500 }
    );
  }
}
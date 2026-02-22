import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // ignore bad JSON
  }

  const archived = !!body.archived;

  try {
    const sale = await prisma.sale.update({
      where: { id },
      data: {
        archivedAt: archived ? new Date() : null,
      },
      select: { id: true, archivedAt: true },
    });

    return NextResponse.json({ ok: true, sale });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to update sale" },
      { status: 400 },
    );
  }
}
